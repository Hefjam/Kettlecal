// Placeholder theme — swap accent/bg tokens once mockup direction is confirmed.
// Current: Iron Minimalist (deep navy + burnt orange)

export const Colors = {
  bg: {
    primary: '#060814',      // Ultra deep dark midnight
    secondary: '#0D0F22',    // Sleek secondary dark slate
    card: '#141832',         // Card slate blue
    elevated: '#1D2244',     // Elevated card slate blue
  },
  accent: {
    primary: '#FF5E3A',      // Vibrant Coral-Orange
    dim: '#E04E2B',          // Darker coral for transitions/states
    glow: 'rgba(255, 94, 58, 0.12)', // Subtle highlight glow
    glowStrong: 'rgba(255, 94, 58, 0.28)', // Stronger glow for active elements
  },
  text: {
    primary: '#F5F6FA',      // High contrast bright off-white
    secondary: '#A2A7C3',    // Readable secondary slate gray
    muted: '#6E7395',        // Enhanced contrast for small captions (passes AA)
    inverse: '#060814',      // Contrast text on light accents
  },
  status: {
    success: '#10B981',      // Emerald Green
    warning: '#F59E0B',      // Amber Gold
    error: '#EF4444',        // Rose Red
    info: '#3B82F6',         // Royal Blue
  },
  border: '#222851',         // Premium thin border slate
  overlay: 'rgba(6, 8, 20, 0.88)',
} as const;

