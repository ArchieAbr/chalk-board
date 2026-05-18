import { GRADES } from "../constants";

interface ActionBarProps {
  routeName: string;
  routeGrade: string;
  placementCount: number;
  hasStart: boolean;
  hasFinish: boolean;
  saving: boolean;
  calculating: boolean;
  saveMessage: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRouteNameChange: (name: string) => void;
  onRouteGradeChange: (grade: string) => void;
  onCalculateBeta: () => void;
  onSaveRoute: () => void;
  onClearWall: () => void;
}

export function ActionBar({
  routeName,
  routeGrade,
  placementCount,
  hasStart,
  hasFinish,
  saving,
  calculating,
  saveMessage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRouteNameChange,
  onRouteGradeChange,
  onCalculateBeta,
  onSaveRoute,
  onClearWall,
}: ActionBarProps) {
  const canCalculate = hasStart && hasFinish && placementCount >= 2 && !calculating;
  const canSave = placementCount > 0 && routeName.trim().length > 0 && !saving;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="route-name" className="text-xs text-slate-600">
            Name
          </label>
          <input
            id="route-name"
            type="text"
            value={routeName}
            onChange={(e) => onRouteNameChange(e.target.value)}
            placeholder="Project Alpha"
            className="rounded border border-slate-300 px-2 py-1 text-sm w-44"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="route-grade" className="text-xs text-slate-600">
            Grade
          </label>
          <select
            id="route-grade"
            value={routeGrade}
            onChange={(e) => onRouteGradeChange(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="text-sm px-2 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="text-sm px-2 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↷ Redo
          </button>
        </div>

        <div className="flex-1 text-xs text-slate-500 px-2">
          {placementCount} hold{placementCount === 1 ? "" : "s"}
          {!hasStart && " · no start"}
          {!hasFinish && " · no finish"}
          {saveMessage && (
            <span className="ml-3 text-emerald-700">{saveMessage}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearWall}
            disabled={placementCount === 0}
            className="text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear Wall
          </button>
          <button
            type="button"
            onClick={onSaveRoute}
            disabled={!canSave}
            className="text-sm px-3 py-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              !routeName.trim()
                ? "Give your route a name"
                : placementCount === 0
                  ? "Place at least one hold"
                  : ""
            }
          >
            {saving ? "Saving…" : "Save Route"}
          </button>
          <button
            type="button"
            onClick={onCalculateBeta}
            disabled={!canCalculate}
            className="text-sm px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              !hasStart
                ? "Mark a start hold"
                : !hasFinish
                  ? "Mark a finish hold"
                  : ""
            }
          >
            {calculating ? "Calculating…" : "Calculate Beta"}
          </button>
        </div>
      </div>
    </footer>
  );
}
