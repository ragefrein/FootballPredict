

import logging
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from . import understat_service as svc
from .team_logos import get_logo, get_logos_for_league

from .ml_service import predictor_instance

logger   = logging.getLogger(__name__)
SUPPORTED = settings.SUPPORTED_LEAGUES
SEASONS   = settings.CURRENT_SEASONS



def ok(data, **meta):
    payload = {"success": True, "data": data}
    payload.update(meta)
    return Response(payload)


def err(msg: str, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "data": None, "error": msg}, status=code)


def _validate_league(league: str):
    for lg in SUPPORTED:
        if lg.upper() == league.upper():
            return lg
    return None


def _get_season(league: str, query_season) -> str:
    return query_season or SEASONS.get(league, "2024")



def _enrich_match(match: dict, league: str) -> dict:
    for side in ("home", "away"):
        if side in match and isinstance(match[side], dict):
            name = match[side].get("title", "")
            match[side]["logo"] = get_logo(name, league)
    return match

def _enrich_matches(matches: list, league: str) -> list:
    return [_enrich_match(m, league) for m in matches]




@api_view(["GET"])
def api_root(request):
    base = request.build_absolute_uri("/api/v1/")
    return ok({
        "version": "2.0.0",
        "supported_leagues": SUPPORTED,
        "endpoints": {
            "fixtures_this_week": f"{base}{{league}}/fixtures/upcoming/",
            "live_matches":       f"{base}{{league}}/fixtures/live/",
            "recent_results":     f"{base}{{league}}/fixtures/results/",
            "match_detail":       f"{base}matches/{{match_id}}/",
            "match_shots":        f"{base}matches/{{match_id}}/shots/",
            "standings":          f"{base}{{league}}/standings/",
            "team_logos":         f"{base}{{league}}/logos/",
            "team_stats":         f"{base}{{league}}/teams/{{team}}/stats/",
            "team_players":       f"{base}{{league}}/teams/{{team}}/players/",
            "all_players":        f"{base}{{league}}/players/",
            "player_detail":      f"{base}players/{{player_id}}/",
            "h2h":                f"{base}{{league}}/h2h/?team_a=X&team_b=Y",
        },
        "notes": {
            "logos": "Every team object includes a 'logo' field (URL). Source: Sofascore CDN.",
            "live":  "Understat has no real-time feed. /live/ infers status from kickoff time.",
        },
    })



@api_view(["GET"])
def team_logos_endpoint(request, league: str):
    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'. Choices: {SUPPORTED}")

    logos = get_logos_for_league(norm)
    data  = [{"team": name, "logo": url} for name, url in logos.items()]
    return ok(data, count=len(data), league=norm)




@api_view(["GET"])
def upcoming_fixtures(request, league: str):
    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'. Choices: {SUPPORTED}")
    season = _get_season(norm, request.query_params.get("season"))
    try:
        data = svc.get_upcoming_this_week(norm, season)
    except Exception as e:
        logger.exception("upcoming_fixtures error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)
    return ok(_enrich_matches(data, norm), count=len(data), league=norm, season=season)


@api_view(["GET"])
def live_matches(request, league: str):
    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'.")
    season = _get_season(norm, request.query_params.get("season"))
    try:
        data = svc.get_live_matches(norm, season)
    except Exception as e:
        logger.exception("live_matches error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)
    return ok(
        _enrich_matches(data, norm),
        count=len(data), league=norm, season=season,
        notice="Understat updates ~5-10 min after FT. Not a true live feed.",
    )


@api_view(["GET"])
def recent_results(request, league: str):
    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'.")
    season = _get_season(norm, request.query_params.get("season"))
    n = int(request.query_params.get("n", 10))
    try:
        data = svc.get_recent_results(norm, season, n)
    except Exception as e:
        logger.exception("recent_results error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)
    return ok(_enrich_matches(data, norm), count=len(data), league=norm, season=season)


@api_view(["GET"])
def match_detail(request, match_id: str):
    try:
        data = svc.get_match_detail(match_id)
    except Exception as e:
        logger.exception("match_detail error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)
    return ok(data)


@api_view(["GET"])
def match_shots(request, match_id: str):
    try:
        data = svc.get_match_shots(match_id)
    except Exception as e:
        logger.exception("match_shots error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)
    return ok(data)




@api_view(["GET"])
def standings(request, league: str):

    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'.")
    season = _get_season(norm, request.query_params.get("season"))
    try:
        data = svc.get_standings(norm, season)
    except Exception as e:
        logger.exception("standings error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)

    for row in data:
        row["logo"] = get_logo(row["team"], norm)

    return ok(data, count=len(data), league=norm, season=season)



@api_view(["GET"])
def team_stats(request, league: str, team: str):

    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'.")
    season = _get_season(norm, request.query_params.get("season"))
    try:
        data = svc.get_team_stats(norm, season, team)
    except AssertionError:
        return err(f"Team '{team}' not found in {norm} {season}.", status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("team_stats error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)

    data["logo"] = get_logo(team, norm)
    for match in data.get("matches", []):
        match["opponent_logo"] = get_logo(match.get("opponent", ""), norm)

    return ok(data)


@api_view(["GET"])
def team_players(request, league: str, team: str):

    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'.")
    season = _get_season(norm, request.query_params.get("season"))
    try:
        data = svc.get_team_players(norm, season, team)
    except Exception as e:
        logger.exception("team_players error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)

    return ok(data, count=len(data), team=team, team_logo=get_logo(team, norm))



@api_view(["GET"])
def all_players(request, league: str):

    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'.")
    season   = _get_season(norm, request.query_params.get("season"))
    sort_by  = request.query_params.get("sort", "xg")
    order    = request.query_params.get("order", "desc")
    team_flt = request.query_params.get("team")
    pos_flt  = request.query_params.get("position")

    try:
        data = svc.get_league_players(norm, season)
    except Exception as e:
        logger.exception("all_players error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)

    if team_flt:
        data = [p for p in data if p["team"] == team_flt]
    if pos_flt:
        data = [p for p in data if p.get("position", "").upper().startswith(pos_flt.upper())]

    valid_sorts = {"xg", "xa", "goals", "assists", "shots", "games", "xg_per90", "xa_per90", "npxg"}
    if sort_by in valid_sorts:
        data = sorted(data, key=lambda p: (p.get(sort_by) or 0), reverse=(order == "desc"))

    for player in data:
        player["team_logo"] = get_logo(player.get("team", ""), norm)

    return ok(data, count=len(data), league=norm, season=season)


@api_view(["GET"])
def player_detail(request, player_id: str):
    try:
        data = svc.get_player_detail(player_id)
    except Exception as e:
        logger.exception("player_detail error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)

    for match in data.get("recent_matches", []):
        match["home_logo"] = get_logo(match.get("home", ""))
        match["away_logo"] = get_logo(match.get("away", ""))

    return ok(data)



@api_view(["GET"])
def h2h(request, league: str):

    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'.")
    team_a = request.query_params.get("team_a")
    team_b = request.query_params.get("team_b")
    if not team_a or not team_b:
        return err("Both 'team_a' and 'team_b' query params are required.")
    season = _get_season(norm, request.query_params.get("season"))
    n      = int(request.query_params.get("n", 10))

    try:
        data = svc.get_h2h(norm, season, team_a, team_b, n)
    except Exception as e:
        logger.exception("h2h error")
        return err(str(e), status.HTTP_502_BAD_GATEWAY)

    data["team_a_logo"] = get_logo(team_a, norm)
    data["team_b_logo"] = get_logo(team_b, norm)
    data["matches"]     = _enrich_matches(data.get("matches", []), norm)

    return ok(data, league=norm, season=season)



@api_view(["GET"])
def predict_match_api(request, league: str):
    norm = _validate_league(league)
    if not norm:
        return err(f"Unsupported league '{league}'. Choices: {SUPPORTED}")
    
    home = request.query_params.get("home")
    away = request.query_params.get("away")
    
    if not home or not away:
         return err("Parameter 'home' dan 'away' wajib diisi.")
         
    try:
        prediction_data = predictor_instance.predict(norm, home, away)
        
        prediction_data["home_logo"] = get_logo(home, norm)
        prediction_data["away_logo"] = get_logo(away, norm)
        
        return ok(prediction_data, source="ML+Poisson Blended Engine v4")
        
    except ValueError as e:
        return err(str(e), status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Prediction engine error")
        return err(f"Terjadi kesalahan pada sistem prediksi: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR)