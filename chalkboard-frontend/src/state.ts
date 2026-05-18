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
