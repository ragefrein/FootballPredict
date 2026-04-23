"""
URL patterns for EPL Predictor API v1
All routes live under /api/v1/
"""
from django.urls import path
from . import views

app_name = "epl_api"

urlpatterns = [
    # ── Root / discovery ────────────────────────────────────────
    path("", views.api_root, name="api_root"),

    # ── Fixtures ────────────────────────────────────────────────
    # GET /api/v1/EPL/fixtures/upcoming/        
    # GET /api/v1/EPL/fixtures/live/           
    # GET /api/v1/EPL/fixtures/results/        
    path("<str:league>/fixtures/upcoming/", views.upcoming_fixtures, name="upcoming_fixtures"),
    path("<str:league>/fixtures/live/",     views.live_matches,      name="live_matches"),
    path("<str:league>/fixtures/results/",  views.recent_results,    name="recent_results"),


    # GET /api/v1/matches/12345/               
    # GET /api/v1/matches/12345/shots/        
    path("matches/<str:match_id>/",        views.match_detail, name="match_detail"),
    path("matches/<str:match_id>/shots/",  views.match_shots,  name="match_shots"),

    # ── Standings ────────────────────────────────────────────────
    # GET /api/v1/EPL/standings/
    path("<str:league>/standings/", views.standings, name="standings"),

    # ── Teams ────────────────────────────────────────────────────
    # GET /api/v1/EPL/teams/Arsenal/stats/
    # GET /api/v1/EPL/teams/Arsenal/players/
    path("<str:league>/teams/<str:team>/stats/",   views.team_stats,   name="team_stats"),
    path("<str:league>/teams/<str:team>/players/", views.team_players, name="team_players"),

    # ── Players ─────────────────────────────────────────────────
    # GET /api/v1/EPL/players/             
    # GET /api/v1/players/882/              
    path("<str:league>/players/",   views.all_players,   name="all_players"),
    path("players/<str:player_id>/", views.player_detail, name="player_detail"),

    # ── Head-to-head ─────────────────────────────────────────────
    # GET /api/v1/EPL/h2h/?team_a=Arsenal&team_b=Chelsea
    path("<str:league>/h2h/", views.h2h, name="h2h"),

    # ── Prediction Engine ─────────────────────────────────────────
    # GET /api/v1/EPL/predict/?home=Burnley&away=Manchester%20City
    path("<str:league>/predict/", views.predict_match_api, name="predict_match_api"),
]