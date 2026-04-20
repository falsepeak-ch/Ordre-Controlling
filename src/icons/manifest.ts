/**
 * Subset of the Bootsy Duotone set vendored into this project.
 * Add a name here, run `npm run icons:build`, and reference it as <Icon name="..." />.
 */
export const ICON_NAMES = [
  // Sidebar / navigation
  'grid-fill',
  'receipt-fill',
  'building-fill',
  'shield-fill-check',
  'file-earmark-text-fill',
  'bar-chart-fill',
  'gear-fill',
  'house-fill',

  // Actions
  'plus',
  'search',
  'funnel-fill',
  'download-fill',
  'upload-fill',
  'pencil-fill',
  'trash-fill',
  'clipboard-fill',
  'three-dots-vertical',
  'x',
  'check',
  'arrow-right',
  'arrow-left',
  'chevron-right',
  'chevron-down',

  // Contact
  'envelope-fill',
  'telephone-fill',
  'geo-alt-fill',

  // Status
  'check-circle-fill',
  'x-circle-fill',
  'clock-fill',
  'bell-fill',

  // Theme
  'moon-fill',
  'sun-fill',

  // User
  'person-circle-fill',
  'box-arrow-right-fill',

  // Categories
  'film-fill',
  'truck-fill',
  'scissors-fill',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
