"""
team_logos.py
─────────────
Static mapping: Understat team name → logo URL.

Logo source: api.sofascore.com/api/v1/team/{id}/image
Sofascore menyediakan logo PNG berkualitas tinggi secara publik.
Fallback: ui-avatars.com (generate inisial tim jika logo tidak ditemukan).

Cara update:
  Buka https://www.sofascore.com/tournament/football/england/premier-league/17
  Inspect Network → cari request ke /api/v1/team/{id}/image
  Tambahkan mapping baru di bawah.
"""

_SOFA_BASE = "https://api.sofascore.com/api/v1/team/{id}/image"

def _sofa(team_id: int) -> str:
    return _SOFA_BASE.format(id=team_id)

def _fallback(name: str) -> str:
    initials = "".join(w[0] for w in name.split()[:2]).upper()
    return (
        f"https://ui-avatars.com/api/?name={initials}"
        f"&background=1a1a2e&color=ffffff&size=128&bold=true&rounded=true"
    )


# ── Premier League (EPL) ──────────────────────────────────────
EPL_LOGOS: dict[str, str] = {
    "Arsenal":              _sofa(42),
    "Aston Villa":          _sofa(40),
    "Bournemouth":          _sofa(60),
    "Brentford":            _sofa(50),
    "Brighton":             _sofa(30),
    "Chelsea":              _sofa(38),
    "Crystal Palace":       _sofa(7),
    "Everton":              _sofa(48),
    "Fulham":               _sofa(43),
    "Ipswich":              _sofa(32),
    "Leicester":            _sofa(31),
    "Liverpool":            _sofa(44),
    "Manchester City":      _sofa(17),
    "Manchester United":    _sofa(35),
    "Newcastle United":     _sofa(39),
    "Nottingham Forest":    _sofa(14),
    "Southampton":          _sofa(45),
    "Tottenham":            _sofa(33),
    "West Ham":             _sofa(37),
    "Wolverhampton Wanderers":        _sofa(3),
    "Sunderland":           _sofa(41),
    "Burnley":              _sofa(6),
    "Luton":                _sofa(1082),
    "Sheffield United":     _sofa(16),
    "Leeds":                _sofa(34),
    "Watford":              _sofa(57),
    "Norwich":              _sofa(20),

}

# ── La Liga ───────────────────────────────────────────────────
LA_LIGA_LOGOS: dict[str, str] = {
    "Real Madrid":          _sofa(2829),
    "Barcelona":            _sofa(2817),
    "Atletico Madrid":      _sofa(2836),
    "Athletic Club":        _sofa(2825),
    "Real Sociedad":        _sofa(2858),
    "Villarreal":           _sofa(2833),
    "Real Betis":           _sofa(2860),
    "Valencia":             _sofa(2828),
    "Getafe":               _sofa(2859),
    "Osasuna":              _sofa(2850),
    "Girona":               _sofa(2831),
    "Las Palmas":           _sofa(6535),
    "Rayo Vallecano":       _sofa(2855),
    "Alaves":               _sofa(2856),
    "Celta Vigo":           _sofa(2820),
    "Cadiz":                _sofa(2843),
    "Sevilla":              _sofa(2833),
    "Mallorca":             _sofa(2826),
    "Espanyol":             _sofa(2818),
    "Leganes":              _sofa(6453),
    "Valladolid":           _sofa(2853),
}

# ── Bundesliga ───────────────────────────────────────────────
BUNDESLIGA_LOGOS: dict[str, str] = {
    "Bayern Munich":        _sofa(2672),
    "Borussia Dortmund":    _sofa(2673),
    "Bayer Leverkusen":     _sofa(2681),
    "RB Leipzig":           _sofa(23826),
    "Eintracht Frankfurt":  _sofa(2671),
    "Stuttgart":            _sofa(2664),
    "Freiburg":             _sofa(2674),
    "Hoffenheim":           _sofa(2678),
    "Werder Bremen":        _sofa(2666),
    "Heidenheim":           _sofa(10189),
    "Mainz":                _sofa(2677),
    "Augsburg":             _sofa(2675),
    "Borussia Monchengladbach": _sofa(2669),
    "Union Berlin":         _sofa(11283),
    "Bochum":               _sofa(2668),
    "Wolfsburg":            _sofa(2679),
    "Holstein Kiel":        _sofa(2838),
    "St. Pauli":            _sofa(2665),
}

# ── Serie A ───────────────────────────────────────────────────
SERIE_A_LOGOS: dict[str, str] = {
    "Inter":       _sofa(2697),
    "AC Milan":                _sofa(2692),
    "Juventus":             _sofa(2687),
    "Napoli":               _sofa(2714),
    "Roma":                 _sofa(2702),
    "Lazio":                _sofa(2699),
    "Atalanta":             _sofa(2686),
    "Fiorentina":           _sofa(2693),
    "Bologna":              _sofa(2685),
    "Torino":               _sofa(2696),
    "Monza":                _sofa(15971),
    "Genoa":                _sofa(2713),
    "Cagliari":             _sofa(2719),
    "Lecce":                _sofa(2689),
    "Udinese":              _sofa(2695),
    "Como":                 _sofa(2704),
    "Empoli":               _sofa(2704),
    "Verona":               _sofa(2701),
    "Venezia":              _sofa(2708),
    "Parma Calcio 1913":                _sofa(2761),
    "Sassuolo":             _sofa(2793),
    "Cremonese":            _sofa(2761),
    "Pisa":                 _sofa(2737),
}

# ── Ligue 1 ───────────────────────────────────────────────────
LIGUE_1_LOGOS: dict[str, str] = {
    "Paris Saint-Germain":  _sofa(1644),
    "Marseille":            _sofa(1641),
    "Lyon":                 _sofa(1643),
    "Monaco":               _sofa(1636),
    "Lille":                _sofa(1645),
    "Nice":                 _sofa(1646),
    "Lens":                 _sofa(1640),
    "Rennes":               _sofa(1648),
    "Strasbourg":           _sofa(1647),
    "Montpellier":          _sofa(1649),
    "Reims":                _sofa(1650),
    "Nantes":               _sofa(1651),
    "Brest":                _sofa(1652),
    "Toulouse":             _sofa(1653),
    "Le Havre":             _sofa(2978),
    "Auxerre":              _sofa(1655),
    "Angers":               _sofa(1657),
    "Saint-Etienne":        _sofa(1638),
}

# ── RFPL (Russian Premier League) ─────────────────────────────
RFPL_LOGOS: dict[str, str] = {
    "Zenit":                _sofa(2672),
    "CSKA Moscow":          _sofa(2562),
    "Spartak Moscow":       _sofa(2560),
    "Lokomotiv Moscow":     _sofa(2559),
    "Dynamo Moscow":        _sofa(2558),
    "Krasnodar":            _sofa(6192),
}


_LEAGUE_MAP: dict[str, dict[str, str]] = {
    "EPL":        EPL_LOGOS,
    "La_liga":    LA_LIGA_LOGOS,
    "Bundesliga": BUNDESLIGA_LOGOS,
    "Serie_A":    SERIE_A_LOGOS,
    "Ligue_1":    LIGUE_1_LOGOS,
    "RFPL":       RFPL_LOGOS,
}


def get_logo(team_name: str, league: str = "") -> str:
    league_map = _LEAGUE_MAP.get(league, {})
    if team_name in league_map:
        return league_map[team_name]

    # Try all leagues (useful when league param is unknown)
    for mapping in _LEAGUE_MAP.values():
        if team_name in mapping:
            return mapping[team_name]

    return _fallback(team_name)


def get_logos_for_league(league: str) -> dict[str, str]:
    """Return the full {team_name: logo_url} dict for a league."""
    return dict(_LEAGUE_MAP.get(league, {}))


def enrich_team(team_dict: dict, league: str = "") -> dict:
    name = team_dict.get("title") or team_dict.get("team", "")
    team_dict["logo"] = get_logo(name, league)
    return team_dict