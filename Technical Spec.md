# System Design & Technical Specification: Bouldering Route Setter App

## 1. Product Overview & Target Audience  
This application is a web-based sandbox designed for climbing enthusiasts and home-wall owners to practise route setting, visualise boulder problems, and experiment with movement geometry. 

The application provides a clean, minimalist Graphical User Interface (GUI) featuring a virtual 2D climbing wall. Users can select real-world hold assets from a library, drag and drop them onto a rigid T-nut grid, and trigger an automated pathfinding engine that calculates and draws the simplest "beta" (sequence of moves) from start to finish.

---

## 2. Minimum Viable Product (MVP) Scope  
To establish a functional proof-of-concept, the initial system features are strictly bounded. Advanced physical modeling and commercial gym features are deferred to future iterations.

### Included in MVP:  
*   **Static Wall Interface:** A flat, vertical 2D wall canvas standardised to 4.5 metres in height and 3 metres in width.  
*   **Real Hold Assets:** A library populated with 2D image assets (PNG/WebP with transparent backgrounds) representing physical climbing holds.  
*   **Grid Placement:** A rigid snap-to-grid placement system mapped to physical T-nut spacings.  
*   **Line-Draw Beta Visualisation:** A pathfinding algorithm that outputs the optimal move sequence rendered strictly as a connected vector line overlay.  
*   **Route Persistence:** Basic CRUD operations to name, grade, save, and reload designed routes.

# System Design & Technical Specification: Bouldering Route Setter App

## 1. Product Overview & Target Audience
This web application is a sandbox for climbing enthusiasts and home-wall owners to practise route setting, visualise boulder problems, and experiment with movement geometry.

Users interact with a clean 2D GUI featuring a virtual climbing wall, select hold assets from a library, snap them to a T-nut grid, and trigger an automated pathfinding engine that draws the simplest "beta" (sequence of moves).

---

## 2. Minimum Viable Product (MVP) Scope

### Included in MVP
- Static Wall Interface: 4.5 m (height) × 3 m (width) flat 2D canvas.
- Real Hold Assets: 2D image assets (PNG/WebP) with transparency.
- Grid Placement: Rigid snap-to-grid mapped to physical T-nut spacings.
- Line-Draw Beta Visualisation: Pathfinding algorithm outputs an ordered vector line overlay.
- Route Persistence: Basic CRUD to name, grade, save, and reload routes.

### Excluded from MVP (Future)
- 3D wall topographies, adjustable wall angles, and volumes.
- User accounts, social sharing, and commercial gym features.
- Advanced biomechanical ML simulations.

---

## 3. System Architecture & Technology Stack

The system is a decoupled client-server architecture: frontend handles interactive canvas; backend performs pathfinding and persistence.

- Frontend: React or Vue + Konva.js/PixiJS for canvas interactions.
- Backend: Python (FastAPI/Flask) for pathfinding and APIs.
- Database: PostgreSQL for route and asset persistence.

---

### Recommended Folder Structure
```
chalk-board/
├── .gitignore <-- The hybrid file we just created
├── README.md
├── chalk-board-frontend/ <-- React/Vue canvas code
│ ├── package.json
│ └── src/
└── chalk-board-backend/ <-- Python API & Graph Search
    ├── main.py
    ├── requirements.txt
    └── .venv/
```
---

## 4. User Interface (GUI) Design

- Main Canvas: 2D workspace with a faint background grid mapping T-nut points (20 cm spacing).
- Hold Palette: Sidebar with hold images filterable by grip type and colour.
- Properties Panel: Contextual pop-over to rotate (0–359°), set start/finish, or delete holds.
- Action Bar: Global actions: Calculate Beta, Save Route, Clear Wall, Assign Grade.

---

## 5. Technical Implementation Details

### Handling 2D Hold Assets on Canvas

- Asset Pre-loading: Preload sidebar assets into browser memory to avoid drag delays.
- Pixel-Perfect Hit Detection: Use per-pixel alpha to ignore transparent regions for selection and rotation.

### Snap-to-Grid Logic

Holds snap to the nearest T-nut coordinate on release:

```javascript
const GRID_SIZE = 50; // pixels per T-nut

function snapToGrid(droppedX, droppedY) {
    return {
        x: Math.round(droppedX / GRID_SIZE) * GRID_SIZE,
        y: Math.round(droppedY / GRID_SIZE) * GRID_SIZE
    };
}
```

### Line-Draw Beta Visualisation

When beta is calculated, frontend overlays a vector layer connecting the visual centres of sequential holds. Direction can be shown with dashed animations or arrows.

## 6. Database Schema (Relational Data Model)

Tables:

- users
    - user_id UUID PRIMARY KEY DEFAULT gen_random_uuid()
    - username VARCHAR(50) UNIQUE NOT NULL
    - email VARCHAR(100) UNIQUE NOT NULL

- hold_assets
    - asset_id UUID PRIMARY KEY
    - image_url VARCHAR(255) NOT NULL
    - grip_type VARCHAR(30) NOT NULL -- ENUM: Jug, Crimp, Sloper, Pinch, Foot
    - base_colour VARCHAR(20) NOT NULL

- routes
    - route_id UUID PRIMARY KEY
    - author_id UUID REFERENCES users(user_id)
    - name VARCHAR(100) NOT NULL
    - grade VARCHAR(10) NOT NULL
    - created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

- route_holds
    - placement_id UUID PRIMARY KEY
    - route_id UUID REFERENCES routes(route_id) ON DELETE CASCADE
    - asset_id UUID REFERENCES hold_assets(asset_id)
    - grid_x INTEGER NOT NULL
    - grid_y INTEGER NOT NULL
    - rotation INTEGER NOT NULL CHECK (rotation BETWEEN 0 AND 359)
    - is_start BOOLEAN DEFAULT FALSE
    - is_finish BOOLEAN DEFAULT FALSE

## 7. Core API Endpoints (RESTful Design)

### GET /api/holds
Returns the catalogue of available hold assets. Optional query filters: grip_type, base_colour.

Response (200):

```json
[
    {
        "asset_id": "8f4b23c1-4211-4b1a-9fa3-e291b8a91c01",
        "image_url": "https://cdn.assets.local/holds/jug_large_red.webp",
        "grip_type": "Jug",
        "base_colour": "Red"
    }
]
```

### POST /api/routes
Persist a new route.

Request:

```json
{
    "name": "Project Alpha",
    "author_id": "a3b2c1d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "grade": "V3",
    "holds": [
        {
            "asset_id": "8f4b23c1-4211-4b1a-9fa3-e291b8a91c01",
            "grid_x": 4,
            "grid_y": 2,
            "rotation": 90,
            "is_start": true,
            "is_finish": false
        }
    ]
}
```

### POST /api/beta/calculate
Calculates the simplest movement pathway given the transient hold array from the UI.

Response (200):

```json
{
    "pathway": [
        { "grid_x": 4, "grid_y": 2 },
        { "grid_x": 5, "grid_y": 6 },
        { "grid_x": 3, "grid_y": 12 }
    ]
}
```

## 8. The "Beta" Pathfinding Engine

The MVP uses deterministic heuristics and graph search. The backend models the route as a directed graph (NetworkX).

Phase 1 (MVP): Directed Graph Search & Heuristics

1. Nodes: Every active hold placement is a vertex.
2. Edge Construction: An edge between A and B exists if distance <= reach envelope (e.g., 1.5 m).
3. Edge Cost = (Distance * w_1) + (HoldQualityPenalty * w_2) + (DirectionalLeveragePenalty * w_3)

- Distance (w_1): Longer dynamic moves increase cost.
- Hold Quality (w_2): Jugs have zero penalty; crimps/slopers have higher penalties.
- Directional Leverage (w_3): Penalty based on dot product between hold orientation and move vector.

Phase 2 (Future): Kinematic Reinforcement Learning

Future work may replace heuristics with RL agents (DQN/PPO) and physics-based climber models.
