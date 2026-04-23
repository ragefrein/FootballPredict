
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps

from django.core.cache import cache
from django.conf import settings
from understatapi import UnderstatClient
import pytz
from datetime import datetime

UTC = pytz.utc
WIB = pytz.timezone("Asia/Jakarta")

def to_wib(dt_str: str):
    try:
        dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")

        dt_utc = UTC.localize(dt)  
        dt_wib = dt_utc.astimezone(WIB)

        return dt_wib.strftime("%Y-%m-%d %H:%M")

    except Exception as e:
        print("ERROR:", dt_str, e)
        return dt_str

logger = logging.getLogger(__name__)

TIMEOUT = getattr(settings, "UNDERSTAT_CACHE_TIMEOUT", 300)




def _cache(key: str, timeout: int = TIMEOUT):
    """Decorator: cache the return value of a function."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            cached = cache.get(key.format(*args, **kwargs))
            if cached is not None:
                return cached
            result = fn(*args, **kwargs)
            cache.set(key.format(*args, **kwargs), result, timeout)
            return result
        return wrapper
    return decorator


def _utc_now():
    return datetime.now(timezone.utc)


def _parse_dt(raw: str):
    """Parse Understat datetime string to UTC-aware datetime."""
    try:
        dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _match_status(m: dict) -> str:
    """
    Understat has no live flag. We infer status from datetime + goals.
    'finished'  — goals present
    'upcoming'  — goals absent, kickoff in future
    'live'      — goals absent, kickoff ≤ now ≤ kickoff + 115 min
    """
    if m.get("goals") and m["goals"].get("h") is not None:
        return "finished"
    dt = _parse_dt(m.get("datetime", ""))
    if dt is None:
        return "unknown"
    now = _utc_now()
    if dt > now:
        return "upcoming"
    if now <= dt + timedelta(minutes=115):
        return "live"
    return "finished"  


def _format_match(m: dict, league: str = "") -> dict:
    status = _match_status(m)
    goals_h = m["goals"].get("h") if m.get("goals") else None
    goals_a = m["goals"].get("a") if m.get("goals") else None
    xg_h = m["xG"].get("h") if m.get("xG") else None
    xg_a = m["xG"].get("a") if m.get("xG") else None

    return {
        "match_id":     m.get("id"),
        "league":       league,
        "datetime": m.get("datetime"),
        "datetime_wib": to_wib(m.get("datetime")),
        "status":       status,
        "home": {
            "team_id": m["h"].get("id"),
            "title":   m["h"].get("title"),
            "short":   m["h"].get("short_title"),
            "goals":   int(goals_h) if goals_h is not None else None,
            "xg":      float(xg_h)  if xg_h  is not None else None,
        },
        "away": {
            "team_id": m["a"].get("id"),
            "title":   m["a"].get("title"),
            "short":   m["a"].get("short_title"),
            "goals":   int(goals_a) if goals_a is not None else None,
            "xg":      float(xg_a)  if xg_a  is not None else None,
        },
        "forecast": {
            "home_win": float(m["forecast"].get("w", 0)) if m.get("forecast") else None,
            "draw":     float(m["forecast"].get("d", 0)) if m.get("forecast") else None,
            "away_win": float(m["forecast"].get("l", 0)) if m.get("forecast") else None,
        } if m.get("forecast") else None,
    }


def get_league_matches(league: str, season: str) -> list[dict]:
    """All matches for a league-season (cached 5 min)."""
    cache_key = f"matches:{league}:{season}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    with UnderstatClient() as client:
        raw = client.league(league).get_match_data(season=season)

    result = [_format_match(m, league) for m in raw]
    cache.set(cache_key, result, TIMEOUT)
    return result


def get_upcoming_this_week(league: str, season: str) -> list[dict]:
    """Fixtures in the next 7 days."""
    now  = _utc_now()
    end  = now + timedelta(days=7)
    all_matches = get_league_matches(league, season)
    return [
        m for m in all_matches
        if m["status"] == "upcoming"
        and m["datetime"]
        and now <= datetime.strptime(m["datetime"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc) <= end
    ]


def get_live_matches(league: str, season: str) -> list[dict]:
    """
    Matches currently 'in play' (inferred — Understat has no live API).
    Cache is intentionally short (60s) so callers poll frequently.
    """
    cache_key = f"live:{league}:{season}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    with UnderstatClient() as client:
        raw = client.league(league).get_match_data(season=season)

    result = [_format_match(m, league) for m in raw if _match_status(m) == "live"]
    cache.set(cache_key, result, 60) 
    return result


def get_recent_results(league: str, season: str, n: int = 10) -> list[dict]:
    """Last n finished matches."""
    all_matches = get_league_matches(league, season)
    finished = [m for m in all_matches if m["status"] == "finished"]
    return finished[-n:]


def get_match_detail(match_id: str) -> dict:
    """Full match detail: shot data, player stats, roster."""
    cache_key = f"match_detail:{match_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    with UnderstatClient() as client:
        match   = client.match(match_id)
        shots   = match.get_shot_data()
        rosters = match.get_roster_data()

    def _fmt_shots(side_shots):
        return [
            {
                "minute":   s.get("minute"),
                "player":   s.get("player"),
                "xg":       float(s.get("xG", 0)),
                "result":   s.get("result"),
                "situation":s.get("situation"),
                "shot_type":s.get("shotType"),
                "x": float(s.get("X", 0)),
                "y": float(s.get("Y", 0)),
            }
            for s in side_shots
        ]

    def _fmt_roster(side_roster):
        return [
            {
                "player_id": p.get("player_id"),
                "name":      p.get("player"),
                "position":  p.get("position"),
                "goals":     int(p.get("goals", 0)),
                "assists":   int(p.get("assists", 0)),
                "xg":        float(p.get("xG", 0)),
                "xa":        float(p.get("xA", 0)),
                "shots":     int(p.get("shots", 0)),
                "key_passes":int(p.get("key_passes", 0)),
                "yellow":    int(p.get("yellow", 0)),
                "red":       int(p.get("red", 0)),
                "time":      int(p.get("time", 0)),
            }
            for p in side_roster.values()
        ]

    result = {
        "match_id": match_id,
        "shots": {
            "home": _fmt_shots(shots.get("h", [])),
            "away": _fmt_shots(shots.get("a", [])),
        },
        "rosters": {
            "home": _fmt_roster(rosters.get("h", {})),
            "away": _fmt_roster(rosters.get("a", {})),
        },
    }
    cache.set(cache_key, result, TIMEOUT)
    return result




def get_standings(league: str, season: str) -> list[dict]:
    """
    League table derived from match results.
    Understat doesn't expose a standings endpoint directly —
    we compute it from all finished matches.
    """
    cache_key = f"standings:{league}:{season}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    all_matches = get_league_matches(league, season)
    finished    = [m for m in all_matches if m["status"] == "finished"]

    table: dict[str, dict] = {}

    def _ensure(title, tid):
        if title not in table:
            table[title] = {
                "team_id": tid,
                "team":    title,
                "played":  0, "won": 0, "drawn": 0, "lost": 0,
                "gf": 0, "ga": 0, "gd": 0,
                "xg_for": 0.0, "xg_against": 0.0,
                "points": 0,
            }

    for m in finished:
        hg = m["home"]["goals"]
        ag = m["away"]["goals"]
        ht = m["home"]["title"]
        at = m["away"]["title"]
        hid = m["home"]["team_id"]
        aid = m["away"]["team_id"]
        hxg = m["home"]["xg"] or 0.0
        axg = m["away"]["xg"] or 0.0

        if hg is None or ag is None:
            continue

        _ensure(ht, hid)
        _ensure(at, aid)

        table[ht]["played"] += 1
        table[at]["played"] += 1
        table[ht]["gf"] += hg; table[ht]["ga"] += ag
        table[at]["gf"] += ag; table[at]["ga"] += hg
        table[ht]["xg_for"]     += hxg; table[ht]["xg_against"] += axg
        table[at]["xg_for"]     += axg; table[at]["xg_against"] += hxg

        if hg > ag:
            table[ht]["won"]   += 1; table[ht]["points"] += 3
            table[at]["lost"]  += 1
        elif hg < ag:
            table[at]["won"]   += 1; table[at]["points"] += 3
            table[ht]["lost"]  += 1
        else:
            table[ht]["drawn"] += 1; table[ht]["points"] += 1
            table[at]["drawn"] += 1; table[at]["points"] += 1

    for row in table.values():
        row["gd"]          = row["gf"] - row["ga"]
        row["xg_for"]      = round(row["xg_for"], 2)
        row["xg_against"]  = round(row["xg_against"], 2)
        row["xg_diff"]     = round(row["xg_for"] - row["xg_against"], 2)

    sorted_table = sorted(
        table.values(),
        key=lambda r: (-r["points"], -r["gd"], -r["gf"])
    )
    for pos, row in enumerate(sorted_table, 1):
        row["position"] = pos

    cache.set(cache_key, sorted_table, TIMEOUT)
    return sorted_table


def get_team_stats(league: str, season: str, team_title: str) -> dict:
    """Full season stats for one team."""
    cache_key = f"team_stats:{league}:{season}:{team_title}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    all_matches = get_league_matches(league, season)
    team_matches = [
        m for m in all_matches
        if m["home"]["title"] == team_title or m["away"]["title"] == team_title
    ]
    finished = [m for m in team_matches if m["status"] == "finished"]

    stats = {
        "team": team_title,
        "league": league,
        "season": season,
        "played": 0, "won": 0, "drawn": 0, "lost": 0,
        "goals_for": 0, "goals_against": 0,
        "xg_for": 0.0, "xg_against": 0.0,
        "clean_sheets": 0,
        "home": {"played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0, "points": 0},
        "away": {"played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0, "points": 0},
        "form": [],       
        "matches": [],
    }

    for m in finished:
        is_home = m["home"]["title"] == team_title
        venue   = "home" if is_home else "away"
        gf      = m["home"]["goals"] if is_home else m["away"]["goals"]
        ga      = m["away"]["goals"] if is_home else m["home"]["goals"]
        xgf     = m["home"]["xg"] or 0.0 if is_home else m["away"]["xg"] or 0.0
        xga     = m["away"]["xg"] or 0.0 if is_home else m["home"]["xg"] or 0.0
        opp     = m["away"]["title"] if is_home else m["home"]["title"]

        if gf > ga:  res, pts = "W", 3
        elif gf < ga: res, pts = "L", 0
        else:         res, pts = "D", 1

        stats["played"]          += 1
        stats["goals_for"]       += gf
        stats["goals_against"]   += ga
        stats["xg_for"]          += xgf
        stats["xg_against"]      += xga
        if res == "W": stats["won"]   += 1
        elif res == "D": stats["drawn"] += 1
        else: stats["lost"] += 1
        if ga == 0: stats["clean_sheets"] += 1

        stats[venue]["played"] += 1
        stats[venue]["gf"]     += gf
        stats[venue]["ga"]     += ga
        stats[venue]["points"] += pts
        if res == "W":   stats[venue]["won"]   += 1
        elif res == "D": stats[venue]["drawn"] += 1
        else:            stats[venue]["lost"]  += 1

        stats["matches"].append({
            "match_id":     m["match_id"],
            "datetime": m["datetime"],
            "opponent":     opp,
            "venue":        venue,
            "score":        f"{gf}–{ga}",
            "xg":           f"{xgf:.2f}–{xga:.2f}",
            "result":       res,
        })

    stats["form"]         = [m["result"] for m in stats["matches"][-5:]]
    stats["xg_for"]       = round(stats["xg_for"], 2)
    stats["xg_against"]   = round(stats["xg_against"], 2)
    stats["xg_diff"]      = round(stats["xg_for"] - stats["xg_against"], 2)
    stats["points"]       = stats["won"] * 3 + stats["drawn"]
    stats["goals_diff"]   = stats["goals_for"] - stats["goals_against"]

    cache.set(cache_key, stats, TIMEOUT)
    return stats


def get_league_players(league: str, season: str) -> list[dict]:
    """All player stats for a league-season."""
    cache_key = f"players:{league}:{season}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    with UnderstatClient() as client:
        raw = client.league(league).get_player_data(season=season)

    result = [
        {
            "player_id":  p.get("id"),
            "name":       p.get("player_name"),
            "team":       p.get("team_title"),
            "games":      int(p.get("games", 0)),
            "time":       int(p.get("time", 0)),
            "goals":      int(p.get("goals", 0)),
            "assists":    int(p.get("assists", 0)),
            "shots":      int(p.get("shots", 0)),
            "key_passes": int(p.get("key_passes", 0)),
            "xg":         round(float(p.get("xG", 0)), 2),
            "xa":         round(float(p.get("xA", 0)), 2),
            "xg_per90":   round(float(p.get("xG_per90", 0)), 3) if p.get("xG_per90") else None,
            "xa_per90":   round(float(p.get("xA_per90", 0)), 3) if p.get("xA_per90") else None,
            "xg_chain":   round(float(p.get("xGChain", 0)), 2),
            "xg_buildup": round(float(p.get("xGBuildup", 0)), 2),
            "position":   p.get("position"),
            "yellow":     int(p.get("yellow", 0)),
            "red":        int(p.get("red", 0)),
            "npg":        int(p.get("npg", 0)),     
            "npxg":       round(float(p.get("npxG", 0)), 2),
        }
        for p in raw
    ]
    cache.set(cache_key, result, TIMEOUT)
    return result


def get_player_detail(player_id: str) -> dict:
    """Individual player career + recent match stats."""
    cache_key = f"player:{player_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    with UnderstatClient() as client:
        player  = client.player(player_id)
        matches = player.get_match_data()
        shots   = player.get_shot_data()
        grouped = player.get_grouped_stats()

    result = {
        "player_id": player_id,
        "grouped_stats": grouped,
        "recent_matches": [
            {
                "match_id": m.get("id"),
                "date":     m.get("date"),
                "home":     m.get("h_team"),
                "away":     m.get("a_team"),
                "goals":    int(m.get("goals", 0)),
                "assists":  int(m.get("assists", 0)),
                "xg":       round(float(m.get("xG", 0)), 2),
                "xa":       round(float(m.get("xA", 0)), 2),
                "shots":    int(m.get("shots", 0)),
                "time":     int(m.get("time", 0)),
                "position": m.get("position"),
                "result":   m.get("result"),
            }
            for m in matches[-20:]
        ],
        "total_shots": len(shots),
        "shots_on_target": sum(1 for s in shots if s.get("result") in ("Goal", "SavedShot")),
    }
    cache.set(cache_key, result, TIMEOUT)
    return result



def get_team_players(league: str, season: str, team_title: str) -> list[dict]:
    """All players who played for a team this season."""
    all_players = get_league_players(league, season)
    return [p for p in all_players if p["team"] == team_title]

def get_match_shots(match_id: str) -> dict:
    """Shot coordinates for pitch visualization."""
    detail = get_match_detail(match_id)
    return {"match_id": match_id, "shots": detail["shots"]}




def get_h2h(league: str, season: str, team_a: str, team_b: str, last_n: int = 10) -> dict:
    """Head-to-head record between two teams across all loaded matches."""
    all_matches = get_league_matches(league, season)
    h2h = [
        m for m in all_matches
        if m["status"] == "finished"
        and {m["home"]["title"], m["away"]["title"]} == {team_a, team_b}
    ][-last_n:]

    def _count(matches, winner):
        return sum(
            1 for m in matches
            if (m["home"]["goals"] > m["away"]["goals"] and m["home"]["title"] == winner)
            or (m["away"]["goals"] > m["home"]["goals"] and m["away"]["title"] == winner)
        )

    return {
        "team_a":    team_a,
        "team_b":    team_b,
        "total":     len(h2h),
        "team_a_wins": _count(h2h, team_a),
        "team_b_wins": _count(h2h, team_b),
        "draws":     sum(1 for m in h2h if m["home"]["goals"] == m["away"]["goals"]),
        "matches":   h2h,
    }