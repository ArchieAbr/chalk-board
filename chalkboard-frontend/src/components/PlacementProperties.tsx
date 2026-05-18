import type { HoldAsset, Placement } from "../types";

interface PlacementPropertiesProps {
  placement: Placement;
  hold: HoldAsset | undefined;
  onRotate: (placement_id: string, rotation: number) => void;
  onMarkStart: (placement_id: string) => void;
  onMarkFinish: (placement_id: string) => void;
  onDelete: (placement_id: string) => void;
  onClose: () => void;
}

export function PlacementProperties({
  placement,
  hold,
  onRotate,
  onMarkStart,
  onMarkFinish,
  onDelete,
  onClose,
}: PlacementPropertiesProps) {
  return (
    <div className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Selected hold</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-lg leading-none"
          aria-label="Close properties panel"
        >
          ×
        </button>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto">
        {hold && (
          <div>
            <div className="flex h-20 items-center justify-center bg-slate-50 rounded">
              <img
                src={hold.image_url}
                alt={hold.display_name}
                className="max-h-16 max-w-full object-contain"
              />
            </div>
            <p className="mt-2 text-sm font-medium">{hold.display_name}</p>
            <p className="text-xs text-slate-500">
              {hold.asset_id} · {hold.grip_type}
            </p>
            <p className="text-xs text-slate-500">
              Grid ({placement.grid_x}, {placement.grid_y}) · Difficulty{" "}
              {hold.difficulty_modifier.toFixed(1)}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Rotation: {placement.rotation}°
          </label>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={placement.rotation}
            onChange={(e) =>
              onRotate(placement.placement_id, Number(e.target.value))
            }
            className="w-full"
          />
          <div className="flex gap-1 mt-1">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => onRotate(placement.placement_id, deg)}
                className="flex-1 text-xs py-1 border border-slate-300 rounded hover:bg-slate-50"
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onMarkStart(placement.placement_id)}
            className={`w-full text-sm py-2 rounded border ${
              placement.is_start
                ? "bg-green-100 border-green-500 text-green-800"
                : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            {placement.is_start ? "✓ Start" : "Mark as Start"}
          </button>
          <button
            type="button"
            onClick={() => onMarkFinish(placement.placement_id)}
            className={`w-full text-sm py-2 rounded border ${
              placement.is_finish
                ? "bg-red-100 border-red-500 text-red-800"
                : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            {placement.is_finish ? "✓ Finish" : "Mark as Finish"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onDelete(placement.placement_id)}
          className="w-full text-sm py-2 rounded border border-red-300 text-red-700 hover:bg-red-50"
        >
          Delete hold
        </button>
      </div>
    </div>
  );
}
