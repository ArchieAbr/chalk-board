import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, WheelEvent as ReactWheelEvent } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from "react-konva";
import {
  GRID_COLS,
  GRID_ROWS,
  GRID_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  PX_PER_CM,
  WALL_HEIGHT_CM,
  WALL_HEIGHT_PX,
  WALL_WIDTH_PX,
  ZOOM_STEP,
} from "../constants";
import type {
  BetaPathwayNode,
  HoldAsset,
  Placement,
  ViewTransform,
} from "../types";

interface WallCanvasProps {
  width: number;
  height: number;
  view: ViewTransform;
  placements: Placement[];
  selectedPlacementId: string | null;
  beta: BetaPathwayNode[] | null;
  holdsById: Map<string, HoldAsset>;
  imagesById: Map<string, HTMLImageElement>;
  draggingAssetId: string | null;
  onViewChange: (next: ViewTransform) => void;
  onDropHold: (asset_id: string, grid_x: number, grid_y: number) => void;
  onMovePlacement: (placement_id: string, grid_x: number, grid_y: number) => void;
  onSelectPlacement: (placement_id: string | null) => void;
}

interface SnapTarget {
  grid_x: number;
  grid_y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function WallCanvas({
  width,
  height,
  view,
  placements,
  selectedPlacementId,
  beta,
  holdsById,
  imagesById,
  draggingAssetId,
  onViewChange,
  onDropHold,
  onMovePlacement,
  onSelectPlacement,
}: WallCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ gx: number; gy: number; cmX: number; cmYFromFloor: number } | null>(null);
  const [paletteSnap, setPaletteSnap] = useState<SnapTarget | null>(null);
  const [moveSnap, setMoveSnap] = useState<{ snap: SnapTarget; placement_id: string } | null>(null);
  const [draggingPlacementId, setDraggingPlacementId] = useState<string | null>(null);

  useEffect(() => {
    if (draggingAssetId === null) setPaletteSnap(null);
  }, [draggingAssetId]);

  const gridLines = useMemo(() => {
    const lines: Array<{ key: string; points: [number, number, number, number] }> = [];
    for (let col = 0; col <= GRID_COLS; col++) {
      const x = col * GRID_SIZE;
      lines.push({ key: `v${col}`, points: [x, 0, x, WALL_HEIGHT_PX] });
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      const y = row * GRID_SIZE;
      lines.push({ key: `h${row}`, points: [0, y, WALL_WIDTH_PX, y] });
    }
    return lines;
  }, []);

  const screenToSnap = (screenX: number, screenY: number): SnapTarget | null => {
    const wx = (screenX - view.x) / view.scale;
    const wy = (screenY - view.y) / view.scale;
    const grid_x = Math.round(wx / GRID_SIZE);
    const grid_y = Math.round(wy / GRID_SIZE);
    if (grid_x < 0 || grid_x > GRID_COLS) return null;
    if (grid_y < 0 || grid_y > GRID_ROWS) return null;
    return { grid_x, grid_y };
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const snap = screenToSnap(e.clientX - rect.left, e.clientY - rect.top);
    setPaletteSnap(snap);
  };

  const handleDragLeave = () => {
    setPaletteSnap(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPaletteSnap(null);
    const assetId = e.dataTransfer.getData("text/plain");
    if (!assetId) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const snap = screenToSnap(e.clientX - rect.left, e.clientY - rect.top);
    if (!snap) return;
    onDropHold(assetId, snap.grid_x, snap.grid_y);
  };

  const handleWheel = (e: KonvaEventObject<globalThis.WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldX = (pointer.x - view.x) / view.scale;
    const worldY = (pointer.y - view.y) / view.scale;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const next = clamp(
      direction > 0 ? view.scale * ZOOM_STEP : view.scale / ZOOM_STEP,
      MIN_ZOOM,
      MAX_ZOOM,
    );
    onViewChange({
      scale: next,
      x: pointer.x - worldX * next,
      y: pointer.y - worldY * next,
    });
  };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectPlacement(null);
    }
  };

  const handleStageDragMove = (e: KonvaEventObject<globalThis.DragEvent>) => {
    if (e.target !== e.target.getStage()) return;
    onViewChange({ scale: view.scale, x: e.target.x(), y: e.target.y() });
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      setHover(null);
      return;
    }
    const wx = (pointer.x - view.x) / view.scale;
    const wy = (pointer.y - view.y) / view.scale;
    if (wx < 0 || wx > WALL_WIDTH_PX || wy < 0 || wy > WALL_HEIGHT_PX) {
      setHover(null);
      return;
    }
    const cmY = wy / PX_PER_CM;
    setHover({
      gx: Math.round(wx / GRID_SIZE),
      gy: Math.round(wy / GRID_SIZE),
      cmX: wx / PX_PER_CM,
      cmYFromFloor: WALL_HEIGHT_CM - cmY,
    });
  };

  const betaPoints = useMemo(() => {
    if (!beta || beta.length < 2) return null;
    return beta.flatMap((n) => [n.grid_x * GRID_SIZE, n.grid_y * GRID_SIZE]);
  }, [beta]);

  const previewPaletteHold = paletteSnap && draggingAssetId
    ? holdsById.get(draggingAssetId)
    : null;
  const previewPaletteImg = previewPaletteHold
    ? imagesById.get(previewPaletteHold.asset_id)
    : null;

  const previewMovePlacement = moveSnap
    ? placements.find((p) => p.placement_id === moveSnap.placement_id)
    : null;
  const previewMoveHold = previewMovePlacement
    ? holdsById.get(previewMovePlacement.asset_id)
    : null;
  const previewMoveImg = previewMoveHold
    ? imagesById.get(previewMoveHold.asset_id)
    : null;

  return (
    <div
      ref={wrapperRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onWheel={(e: ReactWheelEvent<HTMLDivElement>) => e.preventDefault()}
      className="relative overflow-hidden bg-slate-200"
      style={{ width, height }}
    >
      <Stage
        width={width}
        height={height}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        draggable
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onDragMove={handleStageDragMove}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={WALL_WIDTH_PX}
            height={WALL_HEIGHT_PX}
            fill="#fafaf9"
            stroke="#64748b"
            strokeWidth={1.5}
          />
          {gridLines.map((line) => (
            <Line
              key={line.key}
              points={line.points}
              stroke="#cbd5e1"
              strokeWidth={0.4}
            />
          ))}
        </Layer>

        <Layer listening={false}>
          {previewPaletteHold && previewPaletteImg && paletteSnap && (() => {
            const w = previewPaletteHold.width_cm * PX_PER_CM;
            const h = previewPaletteHold.height_cm * PX_PER_CM;
            const cx = paletteSnap.grid_x * GRID_SIZE;
            const cy = paletteSnap.grid_y * GRID_SIZE;
            return (
              <Group opacity={0.5}>
                <Circle x={cx} y={cy} radius={4} fill="#2563eb" />
                <KonvaImage
                  image={previewPaletteImg}
                  x={cx}
                  y={cy}
                  width={w}
                  height={h}
                  offsetX={w / 2}
                  offsetY={h / 2}
                />
              </Group>
            );
          })()}
          {previewMoveHold && previewMoveImg && moveSnap && previewMovePlacement && (() => {
            const w = previewMoveHold.width_cm * PX_PER_CM;
            const h = previewMoveHold.height_cm * PX_PER_CM;
            const cx = moveSnap.snap.grid_x * GRID_SIZE;
            const cy = moveSnap.snap.grid_y * GRID_SIZE;
            return (
              <Group opacity={0.4}>
                <Circle x={cx} y={cy} radius={4} fill="#2563eb" />
                <KonvaImage
                  image={previewMoveImg}
                  x={cx}
                  y={cy}
                  width={w}
                  height={h}
                  offsetX={w / 2}
                  offsetY={h / 2}
                  rotation={previewMovePlacement.rotation}
                />
              </Group>
            );
          })()}
        </Layer>

        <Layer>
          {placements.map((p) => {
            const hold = holdsById.get(p.asset_id);
            const img = imagesById.get(p.asset_id);
            if (!hold) return null;
            const w = hold.width_cm * PX_PER_CM;
            const h = hold.height_cm * PX_PER_CM;
            const cx = p.grid_x * GRID_SIZE;
            const cy = p.grid_y * GRID_SIZE;
            const ringRadius = Math.max(w, h) / 2 + 4;
            const selected = p.placement_id === selectedPlacementId;
            const isDragging = p.placement_id === draggingPlacementId;
            return (
              <Group
                key={p.placement_id}
                x={cx}
                y={cy}
                draggable
                opacity={isDragging ? 0.55 : 1}
                onMouseDown={(ev) => {
                  ev.cancelBubble = true;
                  onSelectPlacement(p.placement_id);
                }}
                onDragStart={(ev) => {
                  ev.cancelBubble = true;
                  setDraggingPlacementId(p.placement_id);
                  setMoveSnap({
                    snap: { grid_x: p.grid_x, grid_y: p.grid_y },
                    placement_id: p.placement_id,
                  });
                }}
                onDragMove={(ev) => {
                  const node = ev.target;
                  const nx = node.x();
                  const ny = node.y();
                  const grid_x = clamp(Math.round(nx / GRID_SIZE), 0, GRID_COLS);
                  const grid_y = clamp(Math.round(ny / GRID_SIZE), 0, GRID_ROWS);
                  setMoveSnap({
                    snap: { grid_x, grid_y },
                    placement_id: p.placement_id,
                  });
                }}
                onDragEnd={(ev) => {
                  const node = ev.target;
                  const grid_x = clamp(Math.round(node.x() / GRID_SIZE), 0, GRID_COLS);
                  const grid_y = clamp(Math.round(node.y() / GRID_SIZE), 0, GRID_ROWS);
                  node.position({ x: grid_x * GRID_SIZE, y: grid_y * GRID_SIZE });
                  setDraggingPlacementId(null);
                  setMoveSnap(null);
                  if (grid_x !== p.grid_x || grid_y !== p.grid_y) {
                    onMovePlacement(p.placement_id, grid_x, grid_y);
                  }
                }}
              >
                {p.is_start && (
                  <Circle
                    x={0}
                    y={0}
                    radius={ringRadius}
                    stroke="#16a34a"
                    strokeWidth={3}
                    listening={false}
                  />
                )}
                {p.is_finish && (
                  <Circle
                    x={0}
                    y={0}
                    radius={ringRadius + (p.is_start ? 4 : 0)}
                    stroke="#dc2626"
                    strokeWidth={3}
                    listening={false}
                  />
                )}
                {img ? (
                  <KonvaImage
                    image={img}
                    x={0}
                    y={0}
                    width={w}
                    height={h}
                    offsetX={w / 2}
                    offsetY={h / 2}
                    rotation={p.rotation}
                  />
                ) : (
                  <Circle x={0} y={0} radius={w / 2} fill="#94a3b8" />
                )}
                {selected && (
                  <Circle
                    x={0}
                    y={0}
                    radius={ringRadius + 6}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dash={[6, 4]}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Layer>

        {betaPoints && beta && (
          <Layer listening={false}>
            <Line
              points={betaPoints}
              stroke="#f59e0b"
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
              dash={[10, 6]}
            />
            {beta.map((node, idx) => {
              const x = node.grid_x * GRID_SIZE;
              const y = node.grid_y * GRID_SIZE;
              return (
                <Group key={`beta-${idx}`}>
                  <Circle x={x} y={y} radius={11} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                  <Text
                    x={x - 11}
                    y={y - 7}
                    width={22}
                    align="center"
                    text={String(idx + 1)}
                    fontSize={12}
                    fontStyle="bold"
                    fill="#ffffff"
                  />
                </Group>
              );
            })}
          </Layer>
        )}
      </Stage>

      {placements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-slate-500 text-sm bg-white/70 px-4 py-2 rounded-md border border-slate-300 backdrop-blur">
            Drag a hold from the left palette onto the wall to begin.
          </div>
        </div>
      )}

      {hover && (
        <div className="pointer-events-none absolute bottom-2 left-2 text-[11px] font-mono text-slate-600 bg-white/90 border border-slate-300 px-2 py-1 rounded shadow-sm">
          Grid ({hover.gx}, {hover.gy}) · {hover.cmX.toFixed(0)} cm wide, {hover.cmYFromFloor.toFixed(0)} cm high
        </div>
      )}
    </div>
  );
}
