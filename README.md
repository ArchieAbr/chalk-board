# ChalkBoard

A web-based sandbox for climbing enthusiasts and home-wall owners to practise route setting, visualise boulder problems, and experiment with movement geometry. See [Technical Spec.md](Technical%20Spec.md) for the full design.

## Project layout

- [chalkboard-backend/](chalkboard-backend/) — FastAPI service: hold catalogue, route persistence (stub), beta pathfinding (stub).
- [chalkboard-frontend/](chalkboard-frontend/) — React + TypeScript + Vite + Konva canvas UI.

The hold catalogue lives at [chalkboard-backend/data/holds.json](chalkboard-backend/data/holds.json) and the PNG assets it points at are served from [chalkboard-frontend/public/assets/holds/](chalkboard-frontend/public/assets/holds/).

## Prerequisites

- Python 3.11+
- Node.js 20+

## Run

Open two terminals.

### Backend (FastAPI, port 8000)

```bash
cd chalkboard-backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python main.py
```

Swagger UI: <http://localhost:8000/docs>

### Frontend (Vite, port 5173)

```bash
cd chalkboard-frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api/*` to the backend at `:8000`, so both servers must be running.

## Using the UI

1. Drag a hold from the left palette onto the wall — it snaps to the nearest T-nut.
2. Click a placed hold to open the properties panel: rotate (0–359°), mark as start (green ring) or finish (red ring), or delete it.
3. With a start and finish marked, click **Calculate Beta** — the canvas draws the suggested move sequence as a dashed line.
4. Name the route, pick a grade, then **Save Route**. **Clear Wall** resets everything.

## Status

MVP scaffold. Beta pathfinding and route persistence are currently stubs returning mock data; SQLAlchemy models and the NetworkX cost-function land next.
