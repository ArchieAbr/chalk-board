interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onActualSize: () => void;
}

export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
  onActualSize,
}: ZoomControlsProps) {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-md border border-slate-300 bg-white/95 shadow-sm backdrop-blur px-1 py-1">
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom out"
        className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 text-slate-700"
      >
        −
      </button>
      <span className="text-xs font-medium text-slate-700 tabular-nums w-12 text-center">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom in"
        className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 text-slate-700"
      >
        +
      </button>
      <span className="w-px h-5 bg-slate-200 mx-1" />
      <button
        type="button"
        onClick={onFit}
        title="Fit wall to viewport"
        className="px-2 h-7 text-xs rounded hover:bg-slate-100 text-slate-700"
      >
        Fit
      </button>
      <button
        type="button"
        onClick={onActualSize}
        title="Reset to 100%"
        className="px-2 h-7 text-xs rounded hover:bg-slate-100 text-slate-700"
      >
        1:1
      </button>
    </div>
  );
}
