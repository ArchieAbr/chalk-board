import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActionBar } from "./components/ActionBar";
import { HoldPalette } from "./components/HoldPalette";
import { PlacementProperties } from "./components/PlacementProperties";
import { ScaleBar } from "./components/ScaleBar";
import { WallCanvas } from "./components/WallCanvas";
import { ZoomControls } from "./components/ZoomControls";
import {
  GRID_COLS,
  GRID_ROWS,
  MAX_ZOOM,
  MIN_ZOOM,
  PLACEHOLDER_AUTHOR_ID,
  SCALE_BAR_THICKNESS_PX,
  WALL_HEIGHT_PX,
  WALL_WIDTH_PX,
  ZOOM_STEP,
} from "./constants";
import { historyReducer, initialHistorizedState } from "./state";
import type {
  BetaCalculateResponse,
  HoldAsset,
  RouteCreatePayload,
  ViewTransform,
} from "./types";

type HoldsStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; holds: HoldAsset[] };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function fitToViewport(viewportW: number, viewportH: number): ViewTransform {
  if (viewportW <= 0 || viewportH <= 0) return { scale: 1, x: 0, y: 0 };
  const padding = 0.06;
  const availW = viewportW * (1 - padding * 2);
  const availH = viewportH * (1 - padding * 2);
  const scale = Math.min(availW / WALL_WIDTH_PX, availH / WALL_HEIGHT_PX);
  return {
    scale,
    x: (viewportW - WALL_WIDTH_PX * scale) / 2,
    y: (viewportH - WALL_HEIGHT_PX * scale) / 2,
  };
}

function zoomAround(
  view: ViewTransform,
  factor: number,
  cx: number,
  cy: number,
): ViewTransform {
  const worldX = (cx - view.x) / view.scale;
  const worldY = (cy - view.y) / view.scale;
  const next = clamp(view.scale * factor, MIN_ZOOM, MAX_ZOOM);
  return { scale: next, x: cx - worldX * next, y: cy - worldY * next };
}

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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function App() {
  const [holdsStatus, setHoldsStatus] = useState<HoldsStatus>({ kind: "loading" });
  const [history, dispatch] = useReducer(historyReducer, initialHistorizedState);
  const state = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [view, setView] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const viewInitialised = useRef(false);
  const [canvasAreaEl, setCanvasAreaEl] = useState<HTMLDivElement | null>(null);

  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!canvasAreaEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.max(0, Math.floor(width));
        const h = Math.max(0, Math.floor(height));
        setViewport((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
        const canvasW = Math.max(0, w - SCALE_BAR_THICKNESS_PX);
        const canvasH = Math.max(0, h - SCALE_BAR_THICKNESS_PX);
        if (!viewInitialised.current && canvasW > 0 && canvasH > 0) {
          setView(fitToViewport(canvasW, canvasH));
          viewInitialised.current = true;
        }
      }
    });
    ro.observe(canvasAreaEl);
    return () => ro.disconnect();
  }, [canvasAreaEl]);

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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: "redo" });
        else dispatch({ type: "undo" });
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
        return;
      }

      const s = stateRef.current;
      const selectedId = s.selectedPlacementId;
      const selected = selectedId
        ? s.placements.find((p) => p.placement_id === selectedId)
        : undefined;

      if (e.key === "Escape") {
        if (selectedId) {
          e.preventDefault();
          dispatch({ type: "select", placement_id: null });
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        dispatch({ type: "delete", placement_id: selectedId });
        return;
      }
      if (
        selected &&
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown")
      ) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        const nx = clamp(selected.grid_x + dx, 0, GRID_COLS);
        const ny = clamp(selected.grid_y + dy, 0, GRID_ROWS);
        if (nx !== selected.grid_x || ny !== selected.grid_y) {
          dispatch({
            type: "move",
            placement_id: selected.placement_id,
            grid_x: nx,
            grid_y: ny,
          });
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleDropHold = useCallback(
    (asset_id: string, grid_x: number, grid_y: number) => {
      dispatch({ type: "place", asset_id, grid_x, grid_y });
    },
    [],
  );

  const handleMovePlacement = useCallback(
    (placement_id: string, grid_x: number, grid_y: number) => {
      dispatch({ type: "move", placement_id, grid_x, grid_y });
    },
    [],
  );

  const handleZoomIn = useCallback(() => {
    const cw = Math.max(0, viewport.w - SCALE_BAR_THICKNESS_PX);
    const ch = Math.max(0, viewport.h - SCALE_BAR_THICKNESS_PX);
    setView((v) => zoomAround(v, ZOOM_STEP, cw / 2, ch / 2));
  }, [viewport.w, viewport.h]);

  const handleZoomOut = useCallback(() => {
    const cw = Math.max(0, viewport.w - SCALE_BAR_THICKNESS_PX);
    const ch = Math.max(0, viewport.h - SCALE_BAR_THICKNESS_PX);
    setView((v) => zoomAround(v, 1 / ZOOM_STEP, cw / 2, ch / 2));
  }, [viewport.w, viewport.h]);

  const handleFit = useCallback(() => {
    const cw = Math.max(0, viewport.w - SCALE_BAR_THICKNESS_PX);
    const ch = Math.max(0, viewport.h - SCALE_BAR_THICKNESS_PX);
    setView(fitToViewport(cw, ch));
  }, [viewport.w, viewport.h]);

  const handleActualSize = useCallback(() => {
    const cw = Math.max(0, viewport.w - SCALE_BAR_THICKNESS_PX);
    const ch = Math.max(0, viewport.h - SCALE_BAR_THICKNESS_PX);
    setView((v) => zoomAround(v, 1 / v.scale, cw / 2, ch / 2));
  }, [viewport.w, viewport.h]);

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

  const canvasViewportW = Math.max(0, viewport.w - SCALE_BAR_THICKNESS_PX);
  const canvasViewportH = Math.max(0, viewport.h - SCALE_BAR_THICKNESS_PX);

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
              onPaletteDragStart={(asset_id) => setDraggingAssetId(asset_id)}
              onPaletteDragEnd={() => setDraggingAssetId(null)}
            />

            <div ref={setCanvasAreaEl} className="relative flex-1 overflow-hidden">
              <div className="absolute inset-0 flex flex-col">
                <div
                  className="flex"
                  style={{ height: SCALE_BAR_THICKNESS_PX }}
                >
                  <div
                    className="bg-slate-100 border-b border-r border-slate-300"
                    style={{
                      width: SCALE_BAR_THICKNESS_PX,
                      height: SCALE_BAR_THICKNESS_PX,
                    }}
                  />
                  <ScaleBar
                    orientation="horizontal"
                    view={view}
                    viewportSize={canvasViewportW}
                  />
                </div>
                <div className="flex flex-1">
                  <ScaleBar
                    orientation="vertical"
                    view={view}
                    viewportSize={canvasViewportH}
                  />
                  <WallCanvas
                    width={canvasViewportW}
                    height={canvasViewportH}
                    view={view}
                    placements={state.placements}
                    selectedPlacementId={state.selectedPlacementId}
                    beta={state.beta}
                    holdsById={holdsById}
                    imagesById={imagesById}
                    draggingAssetId={draggingAssetId}
                    onViewChange={setView}
                    onDropHold={handleDropHold}
                    onMovePlacement={handleMovePlacement}
                    onSelectPlacement={(placement_id) =>
                      dispatch({ type: "select", placement_id })
                    }
                  />
                </div>
              </div>

              <ZoomControls
                scale={view.scale}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFit={handleFit}
                onActualSize={handleActualSize}
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
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => dispatch({ type: "undo" })}
            onRedo={() => dispatch({ type: "redo" })}
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
