// Hotline Miami synthwave palette — locked 2026-06-09
export const Colors = {
  bg: {
    primary: '#160a2b',      // Deep purple void
    secondary: '#10071f',    // Darker void (tab bar, overlays)
    card: '#1a0d35',         // Card surface
    elevated: '#22103d',     // Elevated surface
  },
  accent: {
    primary: '#ff2e88',      // Hot magenta
    teal: '#19e0c8',         // Teal
    acid: '#f6e05e',         // Acid yellow
    purp: '#7b2ff7',         // Purple
    dim: '#c71d69',          // Darker magenta for states
    glow: 'rgba(255,46,136,0.12)',
    glowStrong: 'rgba(255,46,136,0.28)',
  },
  text: {
    primary: '#fdeaf4',      // Ink — warm off-white
    secondary: '#a98ec9',    // Dim — muted purple
    muted: '#6b5280',        // Deep muted purple
    inverse: '#160a2b',      // Dark text on light backgrounds
  },
  status: {
    success: '#19e0c8',      // Teal
    warning: '#f6e05e',      // Acid yellow
    error: '#ff2e88',        // Magenta
    info: '#7b2ff7',         // Purple
  },
  border: '#2d1555',         // Subtle purple border
  overlay: 'rgba(22, 10, 43, 0.88)',
} as const;
