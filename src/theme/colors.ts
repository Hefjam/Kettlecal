// Placeholder theme — swap accent/bg tokens once mockup direction is confirmed.
// Current: Iron Minimalist (deep navy + burnt orange)

export const Colors = {
  bg: {
    primary: '#0A0E27',
    secondary: '#141832',
    card: '#1C2240',
    elevated: '#232B4A',
  },
  accent: {
    primary: '#FF4500',
    dim: '#CC3600',
    glow: 'rgba(255, 69, 0, 0.25)',
  },
  text: {
    primary: '#E8E8E8',
    secondary: '#9BA3C0',
    muted: '#5A6180',
    inverse: '#0A0E27',
  },
  status: {
    success: '#39D98A',
    warning: '#FFB830',
    error: '#FF4D4D',
    info: '#4D9FFF',
  },
  border: '#232B4A',
  overlay: 'rgba(10, 14, 39, 0.85)',
} as const;
