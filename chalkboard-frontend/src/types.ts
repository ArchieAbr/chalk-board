// Shapes mirror chalkboard-backend/schemas.py. Keep in sync until we generate
// these from the FastAPI OpenAPI schema.

export type GripType = "Jug" | "Crimp" | "Sloper" | "Pinch" | "Foot";

export interface HoldAsset {
  asset_id: string;
  display_name: string;
  image_url: string;
  grip_type: GripType;
  base_colour: string;
  difficulty_modifier: number;
  width_cm: number;
  height_cm: number;
}

export interface Placement {
  placement_id: string;
  asset_id: string;
  grid_x: number;
  grid_y: number;
  rotation: number;
  is_start: boolean;
  is_finish: boolean;
}

export interface BetaPathwayNode {
  grid_x: number;
  grid_y: number;
}

export interface BetaCalculateResponse {
  pathway: BetaPathwayNode[];
}

export interface RouteCreatePayload {
  name: string;
  author_id: string;
  grade: string;
  holds: Array<Omit<Placement, "placement_id">>;
}

export interface ViewTransform {
  scale: number;
  x: number;
  y: number;
}
