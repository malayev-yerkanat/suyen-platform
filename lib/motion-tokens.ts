/**
 * Shared motion vocabulary; values are seconds and CSS pixels. One easing curve and a
 * few durations: feedback is short, entrances a little longer, and nothing bounces.
 */
export const motionTokens = {
  duration: { none: 0, fast: 0.18, normal: 0.35, slow: 0.6 },
  easing: { smooth: [0.22, 1, 0.36, 1] as const },
  distance: { sm: 8 },
  scale: { press: 0.98 },
  opacity: { enter: 0.72, visible: 1 },
  stagger: 0.06,
  maxIndex: 4,
} as const;
