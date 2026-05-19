"""Beta pathfinding engine — Section 8 of Technical Spec.md.

Builds a directed graph over the active placements (edge iff distance is
within the reach envelope) and runs shortest-path search with a 3-term cost:

    cost = w1 * distance_cm
         + w2 * hold_quality_penalty
         + w3 * leverage_penalty

Weights are tuning knobs; the values here are first-pass defaults. The
leverage term uses the dot product between the *source* hold's facing
direction (derived from rotation, where 0° points "up" / toward the floor
in climbing terms) and the unit move vector, mapped to [0, 1] so aligned
pulls cost ~0 and opposing pulls cost ~1.
"""

from __future__ import annotations

import math
from collections.abc import Mapping

import networkx as nx

from models import HoldAsset
from schemas import BetaPathwayNode, RouteHoldPlacement

REACH_CM: float = 150.0
TNUT_CM: float = 20.0
W_DISTANCE: float = 1.0
W_QUALITY: float = 20.0
W_LEVERAGE: float = 30.0


class BetaError(Exception):
    """No valid beta pathway can be calculated for the given placements."""


def _facing_vector(rotation_deg: int) -> tuple[float, float]:
    """Hold facing direction as a unit vector. 0° points up (-y in canvas)."""
    rad = math.radians(rotation_deg)
    return (math.sin(rad), -math.cos(rad))


def _edge_cost(
    src: RouteHoldPlacement,
    dst: RouteHoldPlacement,
    holds_meta: Mapping[str, HoldAsset],
) -> float:
    dx_cm = (dst.grid_x - src.grid_x) * TNUT_CM
    dy_cm = (dst.grid_y - src.grid_y) * TNUT_CM
    distance = math.hypot(dx_cm, dy_cm)
    if distance == 0:
        return 0.0
    quality_penalty = holds_meta[src.asset_id].difficulty_modifier
    move_x = dx_cm / distance
    move_y = dy_cm / distance
    facing_x, facing_y = _facing_vector(src.rotation)
    dot = move_x * facing_x + move_y * facing_y
    leverage_penalty = (1.0 - dot) / 2.0
    return (
        W_DISTANCE * distance
        + W_QUALITY * quality_penalty
        + W_LEVERAGE * leverage_penalty
    )


def calculate(
    placements: list[RouteHoldPlacement],
    holds_meta: Mapping[str, HoldAsset],
) -> list[BetaPathwayNode]:
    """Return the cheapest pathway from any start hold to any finish hold.

    Raises BetaError if no start is marked, no finish is marked, or no path
    exists within the reach envelope.
    """
    starts = [i for i, p in enumerate(placements) if p.is_start]
    finishes = [i for i, p in enumerate(placements) if p.is_finish]
    if not starts:
        raise BetaError("No start hold marked")
    if not finishes:
        raise BetaError("No finish hold marked")

    g: nx.DiGraph = nx.DiGraph()
    for idx in range(len(placements)):
        g.add_node(idx)
    for i, a in enumerate(placements):
        for j, b in enumerate(placements):
            if i == j:
                continue
            dx_cm = (b.grid_x - a.grid_x) * TNUT_CM
            dy_cm = (b.grid_y - a.grid_y) * TNUT_CM
            if math.hypot(dx_cm, dy_cm) > REACH_CM:
                continue
            g.add_edge(i, j, cost=_edge_cost(a, b, holds_meta))

    best_path: list[int] | None = None
    best_cost: float = math.inf
    for s in starts:
        for f in finishes:
            try:
                path = nx.shortest_path(g, source=s, target=f, weight="cost")
                cost = nx.shortest_path_length(g, source=s, target=f, weight="cost")
            except nx.NetworkXNoPath:
                continue
            if cost < best_cost:
                best_cost = cost
                best_path = list(path)

    if best_path is None:
        raise BetaError("No path from start to finish within the reach envelope")

    return [
        BetaPathwayNode(grid_x=placements[idx].grid_x, grid_y=placements[idx].grid_y)
        for idx in best_path
    ]
