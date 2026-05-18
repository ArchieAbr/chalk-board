import { useMemo } from "react";
import type { GripType, HoldAsset } from "../types";

interface HoldPaletteProps {
  holds: HoldAsset[];
  filterGripType: GripType | null;
  filterBaseColour: string | null;
  onFilterGripType: (grip_type: GripType | null) => void;
  onFilterBaseColour: (base_colour: string | null) => void;
  onPaletteDragStart: (asset_id: string) => void;
  onPaletteDragEnd: () => void;
}

const GRIP_TYPES: readonly GripType[] = [
  "Jug",
  "Crimp",
  "Sloper",
  "Pinch",
  "Foot",
];

export function HoldPalette({
  holds,
  filterGripType,
  filterBaseColour,
  onFilterGripType,
  onFilterBaseColour,
  onPaletteDragStart,
  onPaletteDragEnd,
}: HoldPaletteProps) {
  const colours = useMemo(() => {
    const set = new Set(holds.map((h) => h.base_colour));
    return Array.from(set).sort();
  }, [holds]);

  const visible = useMemo(
    () =>
      holds.filter((h) => {
        if (filterGripType && h.grip_type !== filterGripType) return false;
        if (filterBaseColour && h.base_colour !== filterBaseColour) return false;
        return true;
      }),
    [holds, filterGripType, filterBaseColour],
  );

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Grip type
          </label>
          <select
            value={filterGripType ?? ""}
            onChange={(e) =>
              onFilterGripType(
                e.target.value === "" ? null : (e.target.value as GripType),
              )
            }
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {GRIP_TYPES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Colour
          </label>
          <select
            value={filterBaseColour ?? ""}
            onChange={(e) =>
              onFilterBaseColour(e.target.value === "" ? null : e.target.value)
            }
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {colours.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {visible.length === 0 && (
          <p className="text-sm text-slate-500 px-1">No holds match.</p>
        )}
        <ul className="grid grid-cols-2 gap-2">
          {visible.map((hold) => (
            <li key={hold.asset_id}>
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", hold.asset_id);
                  e.dataTransfer.effectAllowed = "copy";
                  onPaletteDragStart(hold.asset_id);
                }}
                onDragEnd={() => onPaletteDragEnd()}
                className="cursor-grab active:cursor-grabbing rounded border border-slate-200 bg-slate-50 p-2 hover:border-slate-400 hover:bg-white transition"
                title={`${hold.display_name} (drag to wall)`}
              >
                <div className="flex h-16 items-center justify-center">
                  <img
                    src={hold.image_url}
                    alt={hold.display_name}
                    draggable={false}
                    className="max-h-14 max-w-full object-contain pointer-events-none"
                  />
                </div>
                <p className="mt-1 text-[10px] leading-tight text-slate-600 truncate">
                  {hold.asset_id}
                </p>
                <p className="text-[10px] leading-tight text-slate-500 truncate">
                  {hold.grip_type} · {hold.base_colour}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
