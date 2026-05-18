import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActionBar } from "./components/ActionBar";
import { HoldPalette } from "./components/HoldPalette";
import { PlacementProperties } from "./components/PlacementProperties";
import { WallCanvas } from "./components/WallCanvas";
import { PLACEHOLDER_AUTHOR_ID } from "./constants";
import { initialState, reducer } from "./state";
import type {
  BetaCalculateResponse,
  HoldAsset,
  RouteCreatePayload,
} from "./types";

type HoldsStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; holds: HoldAsset[] };

function useHoldImages(holds: HoldAsset[]): Map<string, HTMLImageElement> {
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [, force] = useState(0);

  useEffect(() => {
    holds.forEach((h) => {
      if (cacheRef.current.has(h.asset_id)) return;
      const img = new Image();
      img.onload = () => {
        cacheRef.current.set(h.asset_id, img);
        force((n) => n + 1);
      };
      img.src = h.image_url;
    });
  }, [holds]);

  return cacheRef.current;
}

function App() {
  const [holdsStatus, setHoldsStatus] = useState<HoldsStatus>({ kind: "loading" });
  const [state, dispatch] = useReducer(reducer, initialState);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/holds", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HoldAsset[]>;
      })
      .then((holds) => setHoldsStatus({ kind: "ready", holds }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setHoldsStatus({ kind: "error", message });
      });
    return () => controller.abort();
  }, []);

  const holds = holdsStatus.kind === "ready" ? holdsStatus.holds : [];
  const imagesById = useHoldImages(holds);

  const holdsById = useMemo(() => {
    const map = new Map<string, HoldAsset>();
    holds.forEach((h) => map.set(h.asset_id, h));
    return map;
  }, [holds]);

  const selectedPlacement = useMemo(
    () =>
      state.selectedPlacementId
        ? state.placements.find((p) => p.placement_id === state.selectedPlacementId)
        : undefined,
    [state.placements, state.selectedPlacementId],
  );

  const hasStart = state.placements.some((p) => p.is_start);
  const hasFinish = state.placements.some((p) => p.is_finish);

  const handleDropHold = useCallback(
    (asset_id: string, grid_x: number, grid_y: number) => {
      dispatch({ type: "place", asset_id, grid_x, grid_y });
    },
    [],
  );

  const handleCalculateBeta = useCallback(async () => {
    setCalculating(true);
    try {
      const res = await fetch("/api/beta/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holds: state.placements.map(({ placement_id: _id, ...rest }) => rest),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BetaCalculateResponse;
      dispatch({ type: "setBeta", pathway: data.pathway });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSaveMessage(`Beta failed: ${message}`);
      window.setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setCalculating(false);
    }
  }, [state.placements]);

  const handleSaveRoute = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload: RouteCreatePayload = {
        name: state.routeName.trim(),
        author_id: PLACEHOLDER_AUTHOR_ID,
        grade: state.routeGrade,
        holds: state.placements.map(({ placement_id: _id, ...rest }) => rest),
      };
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { route_id: string };
      setSaveMessage(`Saved as ${data.route_id.slice(0, 8)}…`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSaveMessage(`Save failed: ${message}`);
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 5000);
    }
  }, [state.placements, state.routeName, state.routeGrade]);

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="px-6 py-3 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">ChalkBoard</h1>
          <span className="text-xs text-slate-500">
            Virtual route-setting sandbox · 4.5 m × 3 m wall · 20 cm T-nut grid
          </span>
        </div>
      </header>

      {holdsStatus.kind === "loading" && (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Loading holds…
        </div>
      )}

      {holdsStatus.kind === "error" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">Failed to load holds.</p>
            <p className="mt-1">{holdsStatus.message}</p>
            <p className="mt-2 text-red-700">
              Is the backend running at <code>http://localhost:8000</code>?
            </p>
          </div>
        </div>
      )}

      {holdsStatus.kind === "ready" && (
        <>
          <div className="flex flex-1 overflow-hidden">
            <HoldPalette
              holds={holdsStatus.holds}
              filterGripType={state.filterGripType}
              filterBaseColour={state.filterBaseColour}
              onFilterGripType={(grip_type) =>
                dispatch({ type: "setFilterGripType", grip_type })
              }
              onFilterBaseColour={(base_colour) =>
                dispatch({ type: "setFilterBaseColour", base_colour })
              }
            />

            <div className="flex-1 overflow-auto flex items-start justify-center p-6">
              <WallCanvas
                placements={state.placements}
                selectedPlacementId={state.selectedPlacementId}
                beta={state.beta}
                holdsById={holdsById}
                imagesById={imagesById}
                onDropHold={handleDropHold}
                onSelectPlacement={(placement_id) =>
                  dispatch({ type: "select", placement_id })
                }
              />
            </div>

            {selectedPlacement && (
              <PlacementProperties
                placement={selectedPlacement}
                hold={holdsById.get(selectedPlacement.asset_id)}
                onRotate={(placement_id, rotation) =>
                  dispatch({ type: "rotate", placement_id, rotation })
                }
                onMarkStart={(placement_id) =>
                  dispatch({ type: "markStart", placement_id })
                }
                onMarkFinish={(placement_id) =>
                  dispatch({ type: "markFinish", placement_id })
                }
                onDelete={(placement_id) =>
                  dispatch({ type: "delete", placement_id })
                }
                onClose={() =>
                  dispatch({ type: "select", placement_id: null })
                }
              />
            )}
          </div>

          <ActionBar
            routeName={state.routeName}
            routeGrade={state.routeGrade}
            placementCount={state.placements.length}
            hasStart={hasStart}
            hasFinish={hasFinish}
            saving={saving}
            calculating={calculating}
            saveMessage={saveMessage}
            onRouteNameChange={(name) =>
              dispatch({ type: "setRouteName", name })
            }
            onRouteGradeChange={(grade) =>
              dispatch({ type: "setRouteGrade", grade })
            }
            onCalculateBeta={handleCalculateBeta}
            onSaveRoute={handleSaveRoute}
            onClearWall={() => dispatch({ type: "clear" })}
          />
        </>
      )}
    </div>
  );
}

export default App;
