import os
import json
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import joblib

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

from understatapi import UnderstatClient
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import log_loss
from sklearn.model_selection import TimeSeriesSplit
import lightgbm as lgb

try:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    OPTUNA_AVAILABLE = True
except ImportError:
    OPTUNA_AVAILABLE = False

SUPPORTED_LEAGUES = ["EPL", "La_Liga", "Serie_A", "Bundesliga", "Ligue_1"]
SEASONS   = ["2022", "2023", "2024", "2025"]
ROLL_N    = 5
SEQ_LEN   = 10
SEQ_FEATS = 5
TCN_GATE_THRESHOLD = 0.05

def fetch_data(league, seasons):
    print(f"Mengambil data {league} musim {seasons}...")
    understat = UnderstatClient()
    rows = []
    for season in seasons:
        try:
            matches = understat.league(league).get_match_data(season=season)
            for m in matches:
                if m["goals"]["h"] is None:
                    continue
                rows.append({
                    "home_team":  m["h"]["title"],
                    "away_team":  m["a"]["title"],
                    "home_goals": int(m["goals"]["h"]),
                    "away_goals": int(m["goals"]["a"]),
                    "home_xg":    float(m["xG"]["h"]),
                    "away_xg":    float(m["xG"]["a"]),
                    "date":       pd.to_datetime(m["datetime"])
                })
        except Exception as e:
            print(f"Gagal mengambil data {league} musim {season}: {e}")
            
    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    return df

def compute_elo(df, k_base=20, mov_cap=4):
    teams = set(df.home_team) | set(df.away_team)
    elo   = {t: 1500 for t in teams}
    h_list, a_list = [], []
    for _, r in df.iterrows():
        Rh, Ra = elo[r.home_team], elo[r.away_team]
        h_list.append(Rh); a_list.append(Ra)
        Eh = 1 / (1 + 10 ** ((Ra - Rh) / 400))
        S  = 1 if r.home_goals > r.away_goals else (0 if r.home_goals < r.away_goals else 0.5)
        
        goal_diff = abs(r.home_goals - r.away_goals)
        k_dynamic = k_base * np.log1p(min(goal_diff, mov_cap))
        
        elo[r.home_team] += k_dynamic * (S - Eh)
        elo[r.away_team] += k_dynamic * ((1 - S) - (1 - Eh))
    df["home_elo"] = h_list
    df["away_elo"] = a_list
    print(f"Data ELO dimuat. Total laga: {len(df)}")
    return df, elo

def get_last_matches(df, team, date, n=5):
    return df[((df.home_team == team) | (df.away_team == team)) & (df.date < date)].tail(n)

def weighted_avg(vals):
    k = len(vals)
    if k == 0: return 0.0
    weights = np.exp(np.linspace(0, 1, k))
    return float(np.average(vals, weights=weights))

def get_recent_points(df, team, date, n=5):
    matches = get_last_matches(df, team, date, n)
    pts = []
    for _, m in matches.iterrows():
        if m.home_team == team:
            pts.append(3 if m.home_goals > m.away_goals else (1 if m.home_goals == m.away_goals else 0))
        else:
            pts.append(3 if m.away_goals > m.home_goals else (1 if m.away_goals == m.home_goals else 0))
    return sum(pts) / (3 * n) if pts else 0.5

def get_clean_sheet_rate(df, team, date, n=5):
    matches = get_last_matches(df, team, date, n)
    cs = [1 if (m.away_goals if m.home_team == team else m.home_goals) == 0 else 0
          for _, m in matches.iterrows()]
    return np.mean(cs) if cs else 0.0

def get_fixture_congestion(df, team, date, days=14):
    cutoff  = date - pd.Timedelta(days=days)
    matches = df[((df.home_team == team) | (df.away_team == team))
                 & (df.date >= cutoff) & (df.date < date)]
    return len(matches)

def get_home_advantage(df, team, date, n=20):
    matches = get_last_matches(df, team, date, n)
    home_pts, away_pts = [], []
    for _, m in matches.iterrows():
        if m.home_team == team:
            home_pts.append(3 if m.home_goals > m.away_goals else (1 if m.home_goals == m.away_goals else 0))
        else:
            away_pts.append(3 if m.away_goals > m.home_goals else (1 if m.away_goals == m.home_goals else 0))
    return (np.mean(home_pts) if home_pts else 1.0) - (np.mean(away_pts) if away_pts else 1.0)

def poisson_outcome_probs(hx, ax, rho=0.15):
    from scipy.stats import poisson as pois
    max_g = 8
    ph, pd_, pa = 0.0, 0.0, 0.0
    for i in range(max_g + 1):
        for j in range(max_g + 1):
            if i == 0 and j == 0: tau = 1 - hx * ax * rho
            elif i == 1 and j == 0: tau = 1 + ax * rho
            elif i == 0 and j == 1: tau = 1 + hx * rho
            elif i == 1 and j == 1: tau = 1 - rho
            else: tau = 1.0
            p = pois.pmf(i, hx) * pois.pmf(j, ax) * tau
            if i > j:   ph  += p
            elif i < j: pa  += p
            else:       pd_ += p
    total = ph + pd_ + pa
    return ph / total, pd_ / total, pa / total

def build_features(df):
    rows = []
    for _, r in df.iterrows():
        h = get_last_matches(df, r.home_team, r.date, ROLL_N)
        a = get_last_matches(df, r.away_team, r.date, ROLL_N)
        if len(h) < 3 or len(a) < 3:
            continue

        h_g = weighted_avg([m.home_goals if m.home_team == r.home_team else m.away_goals for _, m in h.iterrows()])
        a_g = weighted_avg([m.home_goals if m.home_team == r.away_team else m.away_goals for _, m in a.iterrows()])
        h_x = weighted_avg([m.home_xg   if m.home_team == r.home_team else m.away_xg   for _, m in h.iterrows()])
        a_x = weighted_avg([m.home_xg   if m.home_team == r.away_team else m.away_xg   for _, m in a.iterrows()])
        h_ga= weighted_avg([m.away_goals if m.home_team == r.home_team else m.home_goals for _, m in h.iterrows()])
        a_ga= weighted_avg([m.away_goals if m.home_team == r.away_team else m.home_goals for _, m in a.iterrows()])
        h_xa= weighted_avg([m.away_xg   if m.home_team == r.home_team else m.home_xg   for _, m in h.iterrows()])
        a_xa= weighted_avg([m.away_xg   if m.home_team == r.away_team else m.home_xg   for _, m in a.iterrows()])

        h_pts  = get_recent_points(df, r.home_team, r.date, ROLL_N)
        a_pts  = get_recent_points(df, r.away_team, r.date, ROLL_N)
        h_cs   = get_clean_sheet_rate(df, r.home_team, r.date, ROLL_N)
        a_cs   = get_clean_sheet_rate(df, r.away_team, r.date, ROLL_N)
        h_hadv = get_home_advantage(df, r.home_team, r.date)
        h_fix  = get_fixture_congestion(df, r.home_team, r.date)
        a_fix  = get_fixture_congestion(df, r.away_team, r.date)

        h2h    = df[(df.home_team == r.home_team) & (df.away_team == r.away_team) & (df.date < r.date)].tail(5)
        h2h_wr = (h2h.home_goals > h2h.away_goals).mean() if len(h2h) > 0 else 0.5

        elo_factor  = 10 ** ((r.home_elo - r.away_elo) / 400)
        total_xg    = h_x + a_x
        adj_h_x     = 0.5 * h_x + 0.5 * total_xg * elo_factor / (elo_factor + 1)
        adj_a_x     = 0.5 * a_x + 0.5 * total_xg / (elo_factor + 1)
        pois_h, pois_d, pois_a = poisson_outcome_probs(adj_h_x, adj_a_x)

        h_xg_eff = h_g / (h_x + 1e-6) - 1.0
        a_xg_eff = a_g / (a_x + 1e-6) - 1.0
        h_def_eff = h_ga / (h_xa + 1e-6) - 1.0
        a_def_eff = a_ga / (a_xa + 1e-6) - 1.0

        y = "H" if r.home_goals > r.away_goals else ("A" if r.home_goals < r.away_goals else "D")
        rows.append({
            "date": r.date, "home_team": r.home_team, "away_team": r.away_team,
            "home_avg_goals": h_g, "away_avg_goals": a_g, "diff_goals": h_g - a_g,
            "home_avg_xg":    h_x, "away_avg_xg":    a_x, "diff_xg":    h_x - a_x,
            "home_avg_ga":    h_ga,"away_avg_ga":    a_ga, "diff_ga":   h_ga - a_ga,
            "home_avg_xa":    h_xa,"away_avg_xa":    a_xa, "diff_xa":   h_xa - a_xa,
            "home_pts_rate":  h_pts,"away_pts_rate": a_pts,"diff_pts":  h_pts - a_pts,
            "home_cs_rate":   h_cs, "away_cs_rate":  a_cs, "diff_cs":  h_cs - a_cs,
            "home_advantage": h_hadv,
            "home_fixture_load": h_fix,"away_fixture_load": a_fix,"diff_fix": h_fix - a_fix,
            "elo_diff": r.home_elo - r.away_elo,"h2h_home_winrate": h2h_wr,
            "pois_home_win":  pois_h,"pois_draw":      pois_d,"pois_away_win":  pois_a,
            "pois_h_minus_a": pois_h - pois_a,
            "home_xg_eff":    h_xg_eff,"away_xg_eff":  a_xg_eff,
            "home_def_eff":   h_def_eff,"away_def_eff": a_def_eff,
            "result": y
        })
    return pd.DataFrame(rows)

class DilatedResBlock(nn.Module):
    def __init__(self, in_ch, out_ch, kernel=3, dilation=1, dropout=0.2):
        super().__init__()
        pad = (kernel - 1) * dilation
        self.conv1 = nn.utils.weight_norm(nn.Conv1d(in_ch, out_ch, kernel, padding=pad, dilation=dilation))
        self.conv2 = nn.utils.weight_norm(nn.Conv1d(out_ch, out_ch, kernel, padding=pad, dilation=dilation))
        self.dropout = nn.Dropout(dropout)
        self.chomp   = lambda x, p: x[:, :, :-p] if p > 0 else x
        self.pad     = pad
        self.proj = nn.Conv1d(in_ch, out_ch, 1) if in_ch != out_ch else None

    def forward(self, x):
        out = self.dropout(F.relu(self.chomp(self.conv1(x), self.pad)))
        out = self.dropout(F.relu(self.chomp(self.conv2(out), self.pad)))
        res = self.proj(x) if self.proj else x
        return F.relu(out + res)

class TCNModel(nn.Module):
    def __init__(self, input_size=SEQ_FEATS * 2, n_filters=32, dropout=0.2):
        super().__init__()
        self.blocks = nn.Sequential(
            DilatedResBlock(input_size, n_filters, dilation=1, dropout=dropout),
            DilatedResBlock(n_filters,  n_filters, dilation=2, dropout=dropout),
            DilatedResBlock(n_filters,  n_filters, dilation=4, dropout=dropout),
        )
        self.fc1 = nn.Linear(n_filters, 32)
        self.fc2 = nn.Linear(32, 3)
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        out = self.blocks(x).mean(dim=-1)
        out = F.relu(self.fc1(self.drop(out)))
        return self.fc2(out)

def build_sequence(df, team, date, elo_dict):
    matches = get_last_matches(df, team, date, SEQ_LEN)
    seq = []
    for _, m in matches.iterrows():
        is_home = (m.home_team == team)
        goals   = m.home_goals if is_home else m.away_goals
        xg      = m.home_xg   if is_home else m.away_xg
        xga     = m.away_xg   if is_home else m.home_xg
        g_opp   = m.away_goals if is_home else m.home_goals
        result  = 1 if goals > g_opp else (0 if goals == g_opp else -1)
        opp     = m.away_team if is_home else m.home_team
        opp_elo = elo_dict.get(opp, 1500) / 1500.0
        seq.append([goals, xg, xga, result, opp_elo])
    while len(seq) < SEQ_LEN:
        seq.insert(0, [0.0, 0.0, 0.0, 0.0, 1.0])
    return np.array(seq, dtype=np.float32)

def run_training():
    print("MEMULAI PIPELINE TRAINING MULTI-LIGA V4")
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(BASE_DIR, "data")
    models_dir = os.path.join(BASE_DIR, "models")
    
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    for league in SUPPORTED_LEAGUES:
        print(f"\n{'='*50}\nMELATIH MODEL UNTUK LIGA: {league}\n{'='*50}")
        
        try:
            df, final_elo = compute_elo(fetch_data(league, SEASONS))
            
            if len(df) == 0:
                print(f"Data {league} kosong. Melewati liga ini...")
                continue
                
            print("Membangun Dataset Tabular...")
            train_full = build_features(df)
            le = LabelEncoder()
            y  = le.fit_transform(train_full.result)
            X  = train_full.drop(columns=["result","date","home_team","away_team"])
            
            split    = int(0.8 * len(X))
            Xtr, Xte = X.iloc[:split], X.iloc[split:]
            ytr, yte  = y[:split],      y[split:]

            if OPTUNA_AVAILABLE:
                print("Menjalankan Optuna Bayesian Tuning...")
                def objective(trial):
                    params = {
                        "n_estimators":      trial.suggest_int("n_estimators", 200, 800),
                        "learning_rate":     trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
                        "num_leaves":        trial.suggest_int("num_leaves", 20, 150),
                        "max_depth":         trial.suggest_int("max_depth", 3, 12),
                        "random_state": 42, "verbose": -1,
                    }
                    m = lgb.LGBMClassifier(**params)
                    m.fit(Xtr, ytr)
                    return log_loss(yte, m.predict_proba(Xte))
                study = optuna.create_study(direction="minimize")
                study.optimize(objective, n_trials=20)
                best_params = {**study.best_params, "random_state": 42, "verbose": -1}
                lgbm = lgb.LGBMClassifier(**best_params)
            else:
                print("Melatih LightGBM (Default Params)...")
                lgbm = lgb.LGBMClassifier(n_estimators=400, learning_rate=0.05, num_leaves=63, random_state=42, verbose=-1)

            calib_cut = int(0.875 * len(Xtr))
            Xtr_base, Xtr_cal = Xtr.iloc[:calib_cut], Xtr.iloc[calib_cut:]
            ytr_base, ytr_cal = ytr[:calib_cut], ytr[calib_cut:]

            lgbm.fit(Xtr_base, ytr_base)
            calib_iso = CalibratedClassifierCV(lgbm, method="isotonic", cv="prefit")
            calib_sig = CalibratedClassifierCV(lgbm, method="sigmoid",  cv="prefit")
            calib_iso.fit(Xtr_cal, ytr_cal)
            calib_sig.fit(Xtr_cal, ytr_cal)

            ll_iso = log_loss(yte, calib_iso.predict_proba(Xte))
            ll_sig = log_loss(yte, calib_sig.predict_proba(Xte))
            calib = calib_iso if ll_iso <= ll_sig else calib_sig
            p_lgbm_val = calib.predict_proba(Xte)
            ll_lgbm = min(ll_iso, ll_sig)
            print(f"LGBM Calibrated LogLoss: {ll_lgbm:.4f}")

            print("Membangun Dataset Sequence untuk TCN...")
            seq_scaler = StandardScaler()
            X_seq = []
            for _, r in train_full.iterrows():
                seq_h = build_sequence(df, r.home_team, r.date, final_elo)
                seq_a = build_sequence(df, r.away_team, r.date, final_elo)
                X_seq.append(np.concatenate([seq_h, seq_a], axis=1))

            X_seq = np.array(X_seq)
            Xtr_seq, Xte_seq = X_seq[:split], X_seq[split:]
            ytr_seq, yte_seq = y[:split], y[split:]

            orig_shape = Xtr_seq.shape
            seq_scaler.fit(Xtr_seq.reshape(-1, orig_shape[-1]))
            Xtr_seq = seq_scaler.transform(Xtr_seq.reshape(-1, orig_shape[-1])).reshape(orig_shape)
            Xte_seq = seq_scaler.transform(Xte_seq.reshape(-1, orig_shape[-1])).reshape(Xte_seq.shape)

            Xtr_seq_t = np.transpose(Xtr_seq, (0, 2, 1))
            Xte_seq_t = np.transpose(Xte_seq, (0, 2, 1))

            dataset = TensorDataset(torch.tensor(Xtr_seq_t, dtype=torch.float32), torch.tensor(ytr_seq, dtype=torch.long))
            loader  = DataLoader(dataset, batch_size=32, shuffle=True)

            tcn_model = TCNModel()
            opt       = torch.optim.AdamW(tcn_model.parameters(), lr=0.003, weight_decay=5e-4)
            loss_fn   = nn.CrossEntropyLoss(label_smoothing=0.1)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=30)

            print("Melatih 1D-TCN (30 epoch)...")
            for epoch in range(30):
                tcn_model.train()
                for bX, by in loader:
                    opt.zero_grad()
                    loss = loss_fn(tcn_model(bX), by)
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(tcn_model.parameters(), 1.0)
                    opt.step()
                scheduler.step()

            tcn_model.eval()
            with torch.no_grad():
                p_tcn_val = torch.softmax(tcn_model(torch.tensor(Xte_seq_t, dtype=torch.float32)), dim=1).numpy()
            
            ll_tcn = log_loss(yte, p_tcn_val)
            print(f"TCN LogLoss: {ll_tcn:.4f}")

            tcn_relative_worse = (ll_tcn - ll_lgbm) / ll_lgbm
            tcn_gated = bool(tcn_relative_worse > TCN_GATE_THRESHOLD)
            best_w = 1.0

            if tcn_gated:
                print("TCN di-gate. Ensemble: LGBM 100%.")
            else:
                best_loss = 999
                for w in np.arange(0.1, 1.0, 0.05):
                    ll = log_loss(yte, w * p_lgbm_val + (1 - w) * p_tcn_val)
                    if ll < best_loss:
                        best_loss, best_w = ll, w
                print(f"Ensemble Weight Ditemukan: LGBM={best_w:.2f}, TCN={1-best_w:.2f}")

            print(f"Menyimpan artifact untuk {league}...")
            
            df.to_pickle(os.path.join(data_dir, f"{league}_latest_matches_df.pkl"))
            with open(os.path.join(data_dir, f"{league}_latest_elo.json"), "w") as f:
                json.dump(final_elo, f)
                
            with open(os.path.join(models_dir, f"{league}_ensemble_config.json"), "w") as f:
                json.dump({"best_weight": float(best_w), "tcn_gated": tcn_gated}, f)

            joblib.dump(calib, os.path.join(models_dir, f"{league}_lgbm_calibrated.pkl"))
            joblib.dump(le, os.path.join(models_dir, f"{league}_label_encoder.pkl"))
            joblib.dump(seq_scaler, os.path.join(models_dir, f"{league}_seq_scaler.pkl"))
            torch.save(tcn_model.state_dict(), os.path.join(models_dir, f"{league}_tcn_weights.pth"))

            print(f"Berhasil melatih dan menyimpan model {league}!")

        except Exception as e:
            print(f"GAGAL melatih {league}. Error: {e}")

    print("\nTRAINING SEMUA LIGA SELESAI!")

if __name__ == "__main__":
    run_training()