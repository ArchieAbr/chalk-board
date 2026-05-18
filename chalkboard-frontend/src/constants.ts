export const WALL_WIDTH_CM = 300;
export const WALL_HEIGHT_CM = 450;
export const TNUT_SPACING_CM = 20;

export const PX_PER_CM = 2;
export const GRID_SIZE = TNUT_SPACING_CM * PX_PER_CM;
export const WALL_WIDTH_PX = WALL_WIDTH_CM * PX_PER_CM;
export const WALL_HEIGHT_PX = WALL_HEIGHT_CM * PX_PER_CM;

export const GRID_COLS = Math.floor(WALL_WIDTH_CM / TNUT_SPACING_CM);
export const GRID_ROWS = Math.floor(WALL_HEIGHT_CM / TNUT_SPACING_CM);

export const HOLD_DISPLAY_MAX_PX = 56;

export const GRADES: readonly string[] = [
  "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10",
];

export const PLACEHOLDER_AUTHOR_ID = "00000000-0000-0000-0000-000000000001";
