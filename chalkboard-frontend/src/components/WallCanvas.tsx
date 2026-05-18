import { useMemo, useRef } from "react";
import type { DragEvent } from "react";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Stage,
} from "react-konva";
import {
  GRID_COLS,
  GRID_ROWS,
  GRID_SIZE,
  HOLD_DISPLAY_MAX_PX,
  WALL_HEIGHT_PX,
  WALL_WIDTH_PX,
} from "../constants";
import type { BetaPathwayNode, HoldAsset, Placement } from "../types";

interface WallCanvasProps {
  placements: Placement[];
  selectedPlacementId: string | null;
  beta: BetaPathwayNode[] | null;
  holdsById: Map<string, HoldAsset>;
  imagesById: Map<string, HTMLImageElement>;
  onDropHold: (asset_id: string, grid_x: number, grid_y: number) => void;
  onSelectPlacement: (placement_id: string | null) => void;
}

function fitDimensions(source: {
  width_px: number;
  height_px: number;
}): { width: number; height: number } {
  const scale = Math.min(
    HOLD_DISPLAY_MAX_PX / source.width_px,
    HOLD_DISPLAY_MAX_PX / source.height_px,
  );
  return {
    width: source.width_px * scale,
    height: source.height_px * scale,
  };
}

export function WallCanvas({
  placements,
  selectedPlacementId,
  beta,
  holdsById,
  imagesById,
  onDropHold,
  onSelectPlacement,
}: WallCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const gridLines = useMemo(() => {
    const lines: Array<{
      key: string;
      points: [number, number, number, number];
    }> = [];
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

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData("text/plain");
    if (!assetId) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const grid_x = Math.round(x / GRID_SIZE);
    const grid_y = Math.round(y / GRID_SIZE);
    if (grid_x < 0 || grid_x > GRID_COLS) return;
    if (grid_y < 0 || grid_y > GRID_ROWS) return;
    onDropHold(assetId, grid_x, grid_y);
  };

  const betaPoints = useMemo(() => {
    if (!beta || beta.length < 2) return null;
    return beta.flatMap((n) => [n.grid_x * GRID_SIZE, n.grid_y * GRID_SIZE]);
  }, [beta]);

  return (
    <div
      ref={wrapperRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative inline-block bg-stone-100 shadow-inner"
      style={{ width: WALL_WIDTH_PX, height: WALL_HEIGHT_PX }}
    >
      <Stage
        width={WALL_WIDTH_PX}
        height={WALL_HEIGHT_PX}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            onSelectPlacement(null);
          }
        }}
      >
        <Layer listening={false}>
          {gridLines.map((line) => (
            <Line
              key={line.key}
              points={line.points}
              stroke="#cbd5e1"
              strokeWidth={0.5}
            />
          ))}
        </Layer>

        <Layer>
          {placements.map((p) => {
            const hold = holdsById.get(p.asset_id);
            const img = imagesById.get(p.asset_id);
            if (!hold) return null;
            const { width, height } = fitDimensions(hold.dimensions);
            const cx = p.grid_x * GRID_SIZE;
            const cy = p.grid_y * GRID_SIZE;
            const ringRadius = Math.max(width, height) / 2 + 4;
            const selected = p.placement_id === selectedPlacementId;
            return (
              <Group key={p.placement_id}>
                {p.is_start && (
                  <Circle
                    x={cx}
                    y={cy}
                    radius={ringRadius}
                    stroke="#16a34a"
                    strokeWidth={3}
                    listening={false}
                  />
                )}
                {p.is_finish && (
                  <Circle
                    x={cx}
                    y={cy}
                    radius={ringRadius + (p.is_start ? 4 : 0)}
                    stroke="#dc2626"
                    strokeWidth={3}
                    listening={false}
                  />
                )}
                {img ? (
                  <KonvaImage
                    image={img}
                    x={cx}
                    y={cy}
                    width={width}
                    height={height}
                    offsetX={width / 2}
                    offsetY={height / 2}
                    rotation={p.rotation}
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      onSelectPlacement(p.placement_id);
                    }}
                  />
                ) : (
                  <Circle
                    x={cx}
                    y={cy}
                    radius={width / 2}
                    fill="#94a3b8"
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      onSelectPlacement(p.placement_id);
                    }}
                  />
                )}
                {selected && (
                  <Circle
                    x={cx}
                    y={cy}
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
            {beta.map((node, idx) => (
              <Circle
                key={`beta-${idx}`}
                x={node.grid_x * GRID_SIZE}
                y={node.grid_y * GRID_SIZE}
                radius={5}
                fill="#f59e0b"
              />
            ))}
          </Layer>
        )}
      </Stage>
    </div>
  );
}
