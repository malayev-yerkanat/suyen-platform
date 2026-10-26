/** Shared motion vocabulary; values are seconds and CSS pixels. */
export const motionTokens = {
  duration: { none: 0, instant: 0.08, fast: 0.18, normal: 0.35, slow: 0.6 },
  easing: { smooth: [0.22, 1, 0.36, 1] as const },
  distance: { xs: 2, sm: 8, md: 16 },
  scale: { hover: 1.01, press: 0.98, pop: 1.02 },
  opacity: { enter: 0.72, visible: 1 },
  stagger: 0.06,
  maxIndex: 4,
} as const;

export const springs = {
  snappy: { type: 'spring', stiffness: 300, damping: 30 },
  gentle: { type: 'spring', stiffness: 120, damping: 20 },
} as const;
