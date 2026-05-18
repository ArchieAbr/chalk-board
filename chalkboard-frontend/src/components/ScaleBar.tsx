import { PX_PER_CM, SCALE_BAR_THICKNESS_PX, WALL_HEIGHT_CM, WALL_WIDTH_CM } from "../constants";
import type { ViewTransform } from "../types";

interface ScaleBarProps {
  orientation: "vertical" | "horizontal";
  view: ViewTransform;
  viewportSize: number;
}

const MAJOR_TICK_CM = 100;
const MINOR_TICK_CM = 20;

function buildTicks(wallExtentCm: number) {
  const major: number[] = [];
  const minor: number[] = [];
  for (let cm = 0; cm <= wallExtentCm; cm += MINOR_TICK_CM) {
    if (cm % MAJOR_TICK_CM === 0) major.push(cm);
    else minor.push(cm);
  }
  if (major[major.length - 1] !== wallExtentCm) major.push(wallExtentCm);
  return { major, minor };
}

function formatLabel(cm: number): string {
  if (cm === 0) return "0";
  const m = cm / 100;
  return Number.isInteger(m) ? `${m} m` : `${m.toFixed(1)} m`;
}

export function ScaleBar({ orientation, view, viewportSize }: ScaleBarProps) {
  const vertical = orientation === "vertical";
  const wallExtentCm = vertical ? WALL_HEIGHT_CM : WALL_WIDTH_CM;
  const viewOffset = vertical ? view.y : view.x;
  const { major, minor } = buildTicks(wallExtentCm);

  const project = (cm: number): number => {
    const wallPx = cm * PX_PER_CM;
    return viewOffset + wallPx * view.scale;
  };

  const tickStyle = (cm: number, length: number): React.CSSProperties => {
    const pos = project(cm);
    if (vertical) {
      return {
        position: "absolute",
        top: pos,
        right: 0,
        width: length,
        height: 1,
        background: "#475569",
      };
    }
    return {
      position: "absolute",
      left: pos,
      bottom: 0,
      width: 1,
      height: length,
      background: "#475569",
    };
  };

  const visible = (pos: number) => pos >= -10 && pos <= viewportSize + 10;

  return (
    <div
      className="relative bg-slate-100 border-slate-300 select-none"
      style={
        vertical
          ? {
              width: SCALE_BAR_THICKNESS_PX,
              height: viewportSize,
              borderRight: "1px solid #cbd5e1",
            }
          : {
              width: viewportSize,
              height: SCALE_BAR_THICKNESS_PX,
              borderBottom: "1px solid #cbd5e1",
            }
      }
    >
      {minor
        .filter((cm) => visible(project(cm)))
        .map((cm) => (
          <div key={`min-${cm}`} style={tickStyle(cm, 6)} />
        ))}

      {major
        .filter((cm) => visible(project(cm)))
        .map((cm) => {
          const pos = project(cm);
          const labelCm = vertical ? wallExtentCm - cm : cm;
          return (
            <div key={`maj-${cm}`}>
              <div style={tickStyle(cm, 12)} />
              <div
                className="absolute text-[10px] font-medium text-slate-600 pointer-events-none"
                style={
                  vertical
                    ? {
                        top: pos - 6,
                        right: 16,
                        textAlign: "right",
                      }
                    : {
                        left: pos + 2,
                        bottom: 14,
                      }
                }
              >
                {formatLabel(labelCm)}
              </div>
            </div>
          );
        })}
    </div>
  );
}
