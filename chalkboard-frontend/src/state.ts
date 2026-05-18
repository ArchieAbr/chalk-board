import type { BetaPathwayNode, GripType, Placement } from "./types";

export interface AppState {
  placements: Placement[];
  selectedPlacementId: string | null;
  beta: BetaPathwayNode[] | null;
  routeName: string;
  routeGrade: string;
  filterGripType: GripType | null;
  filterBaseColour: string | null;
}

export const initialState: AppState = {
  placements: [],
  selectedPlacementId: null,
  beta: null,
  routeName: "",
  routeGrade: "V0",
  filterGripType: null,
  filterBaseColour: null,
};

export type Action =
  | { type: "place"; asset_id: string; grid_x: number; grid_y: number }
  | { type: "move"; placement_id: string; grid_x: number; grid_y: number }
  | { type: "select"; placement_id: string | null }
  | { type: "rotate"; placement_id: string; rotation: number }
  | { type: "markStart"; placement_id: string }
  | { type: "markFinish"; placement_id: string }
  | { type: "delete"; placement_id: string }
  | { type: "clear" }
  | { type: "setBeta"; pathway: BetaPathwayNode[] | null }
  | { type: "setRouteName"; name: string }
  | { type: "setRouteGrade"; grade: string }
  | { type: "setFilterGripType"; grip_type: GripType | null }
  | { type: "setFilterBaseColour"; base_colour: string | null };

function newPlacementId(): string {
  return crypto.randomUUID();
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "place": {
      const placement: Placement = {
        placement_id: newPlacementId(),
        asset_id: action.asset_id,
        grid_x: action.grid_x,
        grid_y: action.grid_y,
        rotation: 0,
        is_start: false,
        is_finish: false,
      };
      return {
        ...state,
        placements: [...state.placements, placement],
        selectedPlacementId: placement.placement_id,
        beta: null,
      };
    }
    case "move":
      return {
        ...state,
        beta: null,
        placements: state.placements.map((p) =>
          p.placement_id === action.placement_id
            ? { ...p, grid_x: action.grid_x, grid_y: action.grid_y }
            : p,
        ),
      };
    case "select":
      return { ...state, selectedPlacementId: action.placement_id };
    case "rotate":
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.placement_id === action.placement_id
            ? { ...p, rotation: action.rotation }
            : p,
        ),
      };
    case "markStart":
      return {
        ...state,
        beta: null,
        placements: state.placements.map((p) => ({
          ...p,
          is_start: p.placement_id === action.placement_id,
        })),
      };
    case "markFinish":
      return {
        ...state,
        beta: null,
        placements: state.placements.map((p) => ({
          ...p,
          is_finish: p.placement_id === action.placement_id,
        })),
      };
    case "delete":
      return {
        ...state,
        beta: null,
        selectedPlacementId:
          state.selectedPlacementId === action.placement_id
            ? null
            : state.selectedPlacementId,
        placements: state.placements.filter(
          (p) => p.placement_id !== action.placement_id,
        ),
      };
    case "clear":
      return { ...state, placements: [], selectedPlacementId: null, beta: null };
    case "setBeta":
      return { ...state, beta: action.pathway };
    case "setRouteName":
      return { ...state, routeName: action.name };
    case "setRouteGrade":
      return { ...state, routeGrade: action.grade };
    case "setFilterGripType":
      return { ...state, filterGripType: action.grip_type };
    case "setFilterBaseColour":
      return { ...state, filterBaseColour: action.base_colour };
  }
}

// --- History wrapper -------------------------------------------------------

type Coalesce = {
  type: "rotate" | "move";
  placement_id: string;
  time: number;
};

export interface HistorizedState {
  past: AppState[];
  present: AppState;
  future: AppState[];
  coalesce: Coalesce | null;
}

export type HistoryAction = Action | { type: "undo" } | { type: "redo" };

export const initialHistorizedState: HistorizedState = {
  past: [],
  present: initialState,
  future: [],
  coalesce: null,
};

const HISTORY_LIMIT = 100;
const COALESCE_WINDOW_MS = 500;

const HISTORIZED_TYPES = new Set<Action["type"]>([
  "place",
  "move",
  "rotate",
  "markStart",
  "markFinish",
  "delete",
  "clear",
]);

export function historyReducer(
  state: HistorizedState,
  action: HistoryAction,
): HistorizedState {
  if (action.type === "undo") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
      coalesce: null,
    };
  }
  if (action.type === "redo") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
      coalesce: null,
    };
  }

  const newPresent = reducer(state.present, action);
  if (newPresent === state.present) return state;

  if (!HISTORIZED_TYPES.has(action.type)) {
    return { ...state, present: newPresent };
  }

  const now = Date.now();
  const shouldCoalesce =
    (action.type === "rotate" || action.type === "move") &&
    state.coalesce !== null &&
    state.coalesce.type === action.type &&
    state.coalesce.placement_id === action.placement_id &&
    now - state.coalesce.time < COALESCE_WINDOW_MS;

  if (shouldCoalesce) {
    return {
      ...state,
      present: newPresent,
      coalesce: { type: action.type, placement_id: action.placement_id, time: now },
    };
  }

  const past = [...state.past, state.present];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(-HISTORY_LIMIT) : past,
    present: newPresent,
    future: [],
    coalesce:
      action.type === "rotate" || action.type === "move"
        ? { type: action.type, placement_id: action.placement_id, time: now }
        : null,
  };
}
