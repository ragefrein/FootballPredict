Football Predictor API

Smart Football Analytics & Match Prediction Engine

REST API berbasis Django + Machine Learning untuk analisis sepak bola modern: dari data pertandingan, statistik pemain, hingga prediksi hasil laga berbasis model AI.
Live Features

Dirancang untuk developer, data scientist, dan football enthusiast:

    Fixtures (Upcoming, Live, Results)

    Standings (computed, bukan dari API langsung)

    ML Match Prediction (ensemble model)

    Player & Team Analytics

    Shot Map & Match Detail

    Head-to-Head Analysis

    Auto Team Logo Integration

    AI Prediction Engine

AI Prediction Engine

Menggunakan pendekatan hybrid:

    LightGBM -> tabular performance

    TCN (Temporal Convolutional Network) -> sequence modeling

    Poisson Model -> probabilistic goal estimation

    Ensemble Blending -> hasil lebih stabil & akurat

Model dilatih multi-musim + feature engineering (ELO, xG, form, dll)
API Base URL

/api/v1/
Endpoint Highlights
Fixtures

GET /api/v1/{league}/fixtures/upcoming/
GET /api/v1/{league}/fixtures/live/
GET /api/v1/{league}/fixtures/results/
Match Detail

GET /api/v1/matches/{match_id}/
GET /api/v1/matches/{match_id}/shots/
Standings

GET /api/v1/{league}/standings/

Dibangun dari hasil pertandingan (bukan endpoint Understat langsung)
Teams

GET /api/v1/{league}/teams/{team}/stats/
GET /api/v1/{league}/teams/{team}/players/
Players

GET /api/v1/{league}/players/
GET /api/v1/players/{player_id}/

Filter:

    ?sort=xg&order=desc

    ?team=Arsenal

    ?position=F

Head-to-Head

GET /api/v1/{league}/h2h/?team_a=Arsenal&team_b=Chelsea
Prediction

GET /api/v1/{league}/predict/?home=Arsenal&away=Chelsea

Contoh response:
json

{
    "home_win": 0.52,
    "draw": 0.25,
    "away_win": 0.23
}

Response Format

Semua response konsisten:
json

{
    "success": true,
    "data": {}
}

Error:
json

{
    "success": false,
    "error": "message"
}

Supported Leagues
League	Code
English Premier League	EPL
La Liga	La_Liga
Serie A	Serie_A
Bundesliga	Bundesliga
Ligue 1	Ligue_1
Time Handling

    Data asli: UTC

    Otomatis dikonversi ke WIB (Asia/Jakarta)

Tech Stack
Layer	Technology
Backend	Django REST Framework
Data Source	Understat API
ML Model	LightGBM + TCN
Processing	Pandas, NumPy
Deep Learning	PyTorch
Optimization	Optuna (optional)
Installation
bash

git clone https://github.com/ragefrein/FootballPredict.git
cd FootballPredict
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

Environment Variables
env

SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
UNDERSTAT_API_KEY=your-api-key
REDIS_URL=redis://localhost:6379

Docker Deployment
bash

docker build -t football-predictor .
docker run -p 8000:8000 football-predictor

License

MIT
Contributors

    ragefrein

Repository

https://github.com/ragefrein/FootballPredict
