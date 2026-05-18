# ChalkBoard

A web-based sandbox for climbing enthusiasts and home-wall owners to practise route setting, visualise boulder problems, and experiment with movement geometry. See [Technical Spec.md](Technical%20Spec.md) for the full design.

## Layout

- [chalkboard-frontend/](chalkboard-frontend/) — React + canvas UI (not yet scaffolded).
- [chalkboard-backend/](chalkboard-backend/) — FastAPI service: hold catalogue, route persistence, beta pathfinding.

## Backend quick start

```bash
cd chalkboard-backend
python -m venv .venv
source .venv/Scripts/activate
pip install fastapi uvicorn pydantic
python main.py
```

Swagger UI: <http://localhost:8000/docs>
