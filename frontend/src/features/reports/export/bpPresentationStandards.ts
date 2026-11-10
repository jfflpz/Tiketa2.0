/**
 * Official Business Process Presentation Standards Design Tokens
 * Source: BP Presentation Standards (11062026.pptx)
 * 
 * Invariants:
 * 1. Aspect Ratio: 16:9 widescreen (13.333" x 7.500" via LAYOUT_WIDE)
 * 2. Sole Font: 'Helvetica Neue' (minimum font size 14pt)
 * 3. Primary Text Color: Dark Charcoal / Gray20 #333333 (RGB 51,51,51) — default black prohibited
 * 4. Strict 10-Color Sequence for graphs (especially clustered bar charts & pie charts)
 * 5. Official 4-color status taxonomy (Done, Ongoing, To Be Started, On Hold/Cancelled)
 * 6. Graph Dimensions: 11.50" width x 3.88" height with mandatory graph border (#333333)
 * 7. Matched Text Width: Commentary width matches graph width (11.50")
 * 8. Table Alignment: Numbers right-aligned, text left-aligned, vertical middle
 */

export const BP_COLORS = {
  // Primary Text & Accents
  TEXT: '#333333',         // Dark Charcoal / Gray20 (Do NOT use default black)
  HEADER_GRAY: '#757575',  // Slide 9 standard table header gray
  HEADER_DARK: '#4B4B4B',  // Slide 4/10/11 alternative header fill
  BORDER: '#333333',       // Slide 6: Mandatory graph border
  GRID: '#E8E8E8',         // Subtle grid lines

  // Official 10-Color Sequence for Graphs & Charts (Follow in strict order)
  SEQUENCE: [
    '#246FF0', // 1. Vibrant Blue
    '#FF3F3D', // 2. Vivid Red-Orange
    '#76BA1B', // 3. Bright Lime Green
    '#872EC4', // 4. Royal Purple
    '#FFC300', // 5. Sunny Yellow
    '#20B2AA', // 6. Deep Teal / Cyan
    '#E6007A', // 7. Hot Pink / Magenta
    '#008000', // 8. Forest Green
    '#D9531E', // 9. Burnt Orange
    '#A9A9D0', // 10. Muted Lavender
  ],

  // Official Status Reporting Colors (Slide 10)
  STATUS: {
    DONE: '#76BA1B',             // Bright Lime Green
    ONGOING: '#FFC300',          // Sunny Yellow
    ONGOING_CONTRAST: '#246FF0', // Vibrant Blue (Slide 10 note: only substitute if yellow cannot be read)
    TO_BE_STARTED: '#246FF0',    // Vibrant Blue
    ON_HOLD: '#FF3F3D',          // Vivid Red-Orange
    CANCELLED: '#FF3F3D',        // Vivid Red-Orange
  },
} as const;

export const BP_TYPOGRAPHY = {
  FONT_FAMILY: "'Helvetica Neue', Arial, sans-serif",
  FONT_FACE_PPTX: 'Helvetica Neue',
  MIN_FONT_SIZE: 14,
  TITLE_FONT_SIZE: 36,
  PERIOD_FONT_SIZE: 22,
  BODY_FONT_SIZE: 18,
  TABLE_HEADER_FONT_SIZE: 14,
  TABLE_BODY_FONT_SIZE: 14,
} as const;

export const BP_SLIDE_GEOMETRY = {
  slideWidth: 13.333,
  slideHeight: 7.5,
  titleX: 0.92,
  titleY: 0.32,
  titleW: 11.50,
  titleH: 0.55,
  periodY: 0.94,
  periodH: 0.42,
  chartX: 0.92,
  chartY: 1.63,
  chartW: 11.50,
  chartH: 3.88,   // Slide 6 exact standard dimension
  explX: 0.92,
  explY: 5.75,
  explW: 11.50,   // Matched width to graph
  explH: 1.30,
} as const;
