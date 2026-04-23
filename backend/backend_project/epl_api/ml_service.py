import os
import joblib
import torch
import json
import pandas as pd
import numpy as np
from scipy.stats import poisson
from collections import Counter

from .train_pipeline import (
    TCNModel, build_sequence, get_last_matches, weighted_avg, 
    get_recent_points, get_clean_sheet_rate, get_home_advantage, 
    get_fixture_congestion, poisson_outcome_probs, ROLL_N, SEQ_FEATS
)

def alignment_score(p_ml, p_pois):
    p_ml   = np.clip(p_ml,   1e-9, 1)
    p_pois = np.clip(p_pois, 1e-9, 1)
    return float(np.sum(p_ml * np.log(p_ml / p_pois)))

def blend_ml_poisson(p_ml, p_pois, kl_div, kl_threshold=0.05):
    alpha   = max(0.5, 1.0 - kl_div / kl_threshold)
    alpha   = min(alpha, 1.0)
    blended = alpha * np.array(p_ml) + (1 - alpha) * np.array(p_pois)
    return blended / blended.sum(), alpha

def dixon_coles_adj(i, j, hx, ax, rho=0.15):
    if i == 0 and j == 0: return 1 - hx * ax * rho
    if i == 1 and j == 0: return 1 + ax * rho
    if i == 0 and j == 1: return 1 + hx * rho
    if i == 1 and j == 1: return 1 - rho
    return 1.0

def build_score_matrix(hx, ax, max_goals=8, rho=0.15):
    N   = max_goals + 1
    mat = np.zeros((N, N))
    for i in range(N):
        for j in range(N):
            mat[i, j] = poisson.pmf(i, hx) * poisson.pmf(j, ax) * dixon_coles_adj(i, j, hx, ax, rho)
    return mat / mat.sum()

def run_monte_carlo(hx, ax, n_sims=10000, rho=0.15):
    mat  = build_score_matrix(hx, ax, rho=rho)
    flat = mat.flatten()
    idx  = np.random.choice(len(flat), size=n_sims, p=flat)
    N    = mat.shape[0]
    h_sc, a_sc = idx // N, idx % N
    scores = list(zip(h_sc.tolist(), a_sc.tolist()))
    return scores, Counter(scores), int((h_sc > a_sc).sum()), int((h_sc == a_sc).sum()), int((h_sc < a_sc).sum()), mat

class MatchPredictor:
    def __init__(self):
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.artifacts = {} 

    def load_league(self, league: str):
        if league in self.artifacts:
            return self.artifacts[league]
        path_df = os.path.join(self.BASE_DIR, "data", f"{league}_latest_matches_df.pkl")
        path_elo = os.path.join(self.BASE_DIR, "data", f"{league}_latest_elo.json")
        path_calib = os.path.join(self.BASE_DIR, "models", f"{league}_lgbm_calibrated.pkl")
        path_le = os.path.join(self.BASE_DIR, "models", f"{league}_label_encoder.pkl")
        path_scaler = os.path.join(self.BASE_DIR, "models", f"{league}_seq_scaler.pkl")
        path_tcn = os.path.join(self.BASE_DIR, "models", f"{league}_tcn_weights.pth")
        path_config = os.path.join(self.BASE_DIR, "models", f"{league}_ensemble_config.json")

        if not os.path.exists(path_df):
            raise ValueError(f"Model untuk liga '{league}' belum di-training. Silakan jalankan train_pipeline.py.")
        league_data = {}
        league_data['df'] = pd.read_pickle(path_df)
        with open(path_elo, "r") as f:
            league_data['elo'] = json.load(f)
            
        league_data['calib'] = joblib.load(path_calib)
        league_data['le'] = joblib.load(path_le)
        league_data['seq_scaler'] = joblib.load(path_scaler)
        
        tcn = TCNModel()
        tcn.load_state_dict(torch.load(path_tcn, weights_only=True))
        tcn.eval()
        league_data['tcn'] = tcn

        try:
            with open(path_config, "r") as f:
                config = json.load(f)
                league_data['weight'] = config.get("best_weight", 0.5)
                league_data['gated'] = config.get("tcn_gated", False)
        except FileNotFoundError:
            league_data['weight'] = 0.5
            league_data['gated'] = False

        self.artifacts[league] = league_data
        return league_data

    def predict(self, league: str, home_team: str, away_team: str):

        art = self.load_league(league)
        df = art['df']
        final_elo = art['elo']
        le = art['le']

        if home_team not in final_elo or away_team not in final_elo:
            raise ValueError(f"Tim '{home_team}' atau '{away_team}' tidak ditemukan dalam database ELO liga {league}.")

        future = df.date.max() + pd.Timedelta(days=1)
        hp = get_last_matches(df, home_team, future, ROLL_N)
        ap = get_last_matches(df, away_team, future, ROLL_N)

        h_g = weighted_avg([m.home_goals if m.home_team == home_team else m.away_goals for _, m in hp.iterrows()])
        a_g = weighted_avg([m.home_goals if m.home_team == away_team else m.away_goals for _, m in ap.iterrows()])
        h_x = weighted_avg([m.home_xg   if m.home_team == home_team else m.away_xg   for _, m in hp.iterrows()])
        a_x = weighted_avg([m.home_xg   if m.home_team == away_team else m.away_xg   for _, m in ap.iterrows()])
        h_ga= weighted_avg([m.away_goals if m.home_team == home_team else m.home_goals for _, m in hp.iterrows()])
        a_ga= weighted_avg([m.away_goals if m.home_team == away_team else m.home_goals for _, m in ap.iterrows()])
        h_xa= weighted_avg([m.away_xg   if m.home_team == home_team else m.home_xg   for _, m in hp.iterrows()])
        a_xa= weighted_avg([m.away_xg   if m.home_team == away_team else m.home_xg   for _, m in ap.iterrows()])

        h_elo = final_elo.get(home_team, 1500)
        a_elo = final_elo.get(away_team, 1500)
        ef = 10 ** ((h_elo - a_elo) / 400)
        total_xg = h_x + a_x
        adj_h_xg = 0.5 * h_x + 0.5 * total_xg * ef / (ef + 1)
        adj_a_xg = 0.5 * a_x + 0.5 * total_xg / (ef + 1)

        h_pts  = get_recent_points(df, home_team, future, ROLL_N)
        a_pts  = get_recent_points(df, away_team, future, ROLL_N)
        h_cs   = get_clean_sheet_rate(df, home_team, future, ROLL_N)
        a_cs   = get_clean_sheet_rate(df, away_team, future, ROLL_N)
        h_hadv = get_home_advantage(df, home_team, future)
        h_fix  = get_fixture_congestion(df, home_team, future)
        a_fix  = get_fixture_congestion(df, away_team, future)
        h2h    = df[(df.home_team == home_team) & (df.away_team == away_team)].tail(5)
        h2h_wr = (h2h.home_goals > h2h.away_goals).mean() if len(h2h) > 0 else 0.5

        pois_h, pois_d, pois_a = poisson_outcome_probs(adj_h_xg, adj_a_xg)
        h_xg_eff  = h_g / (h_x + 1e-6) - 1.0
        a_xg_eff  = a_g / (a_x + 1e-6) - 1.0
        h_def_eff = h_ga / (h_xa + 1e-6) - 1.0
        a_def_eff = a_ga / (a_xa + 1e-6) - 1.0

        Xp = pd.DataFrame([{
            "home_avg_goals": h_g, "away_avg_goals": a_g, "diff_goals": h_g - a_g,
            "home_avg_xg":    h_x, "away_avg_xg":    a_x, "diff_xg":    h_x - a_x,
            "home_avg_ga":    h_ga,"away_avg_ga":    a_ga, "diff_ga":   h_ga - a_ga,
            "home_avg_xa":    h_xa,"away_avg_xa":    a_xa, "diff_xa":   h_xa - a_xa,
            "home_pts_rate":  h_pts,"away_pts_rate": a_pts,"diff_pts":  h_pts - a_pts,
            "home_cs_rate":   h_cs, "away_cs_rate":  a_cs, "diff_cs":  h_cs - a_cs,
            "home_advantage": h_hadv,
            "home_fixture_load": h_fix,"away_fixture_load": a_fix,"diff_fix": h_fix - a_fix,
            "elo_diff": h_elo - a_elo,"h2h_home_winrate": h2h_wr,
            "pois_home_win": pois_h,"pois_draw": pois_d,"pois_away_win": pois_a,
            "pois_h_minus_a": pois_h - pois_a,
            "home_xg_eff": h_xg_eff,"away_xg_eff": a_xg_eff,
            "home_def_eff": h_def_eff,"away_def_eff": a_def_eff,
        }])
        
        p_lgbm_raw = art['calib'].predict_proba(Xp)[0]
        
        if not art['gated']:
            seq_h = build_sequence(df, home_team, future, final_elo)
            seq_a = build_sequence(df, away_team, future, final_elo)
            seq   = np.concatenate([seq_h, seq_a], axis=1)
            seq_n = art['seq_scaler'].transform(seq.reshape(-1, seq.shape[-1])).reshape(1, seq_h.shape[0], -1)
            seq_n_t = np.transpose(seq_n, (0, 2, 1))
            
            with torch.no_grad():
                p_tcn_raw = torch.softmax(
                    art['tcn'](torch.tensor(seq_n_t, dtype=torch.float32)), dim=1
                )[0].numpy()
            p_ensemble = art['weight'] * p_lgbm_raw + (1 - art['weight']) * p_tcn_raw
        else:
            p_ensemble = p_lgbm_raw

        p_ensemble /= p_ensemble.sum()

        cls_order = list(le.classes_)
        pois_ordered = np.array([
            pois_h if cls_order[i] == "H" else (pois_d if cls_order[i] == "D" else pois_a)
            for i in range(3)
        ])

        kl = alignment_score(p_ensemble, pois_ordered)
        p_final, alpha_ml = blend_ml_poisson(p_ensemble, pois_ordered, kl)
        
        N_SIMS = 10000
        scores, counts, hw, dr, aw, mat = run_monte_carlo(adj_h_xg, adj_a_xg, n_sims=N_SIMS)

        top_scores = sorted(counts.items(), key=lambda x: -x[1])[:5]
        top_scores_formatted = [{"score": f"{h}-{a}", "probability": round((cnt/N_SIMS)*100, 2)} for (h,a), cnt in top_scores]

        return {
            "matchup": f"{home_team} vs {away_team}",
            "probabilities": {
                "home_win": round(dict(zip(le.classes_, p_final)).get("H", 0) * 100, 2),
                "draw":     round(dict(zip(le.classes_, p_final)).get("D", 0) * 100, 2),
                "away_win": round(dict(zip(le.classes_, p_final)).get("A", 0) * 100, 2),
            },
            "metrics": {
                "home_elo": round(h_elo, 1),
                "away_elo": round(a_elo, 1),
                "adjusted_home_xg": round(adj_h_xg, 2),
                "adjusted_away_xg": round(adj_a_xg, 2),
                "kl_divergence": round(kl, 4),
                "ml_blend_alpha": round(alpha_ml, 2)
            },
            "monte_carlo_simulations": N_SIMS,
            "most_likely_scores": top_scores_formatted
        }

predictor_instance = MatchPredictor()