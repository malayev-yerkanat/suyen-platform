function prefersReduced() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isLowEnd() {
  return typeof navigator !== 'undefined'
    && navigator.hardwareConcurrency > 0
    && navigator.hardwareConcurrency <= 4;
}

export const motionConfig = {
  prefersReduced,
  isLowEnd,
  shouldAnimate({ essential = false }: { essential?: boolean } = {}) {
    return typeof window !== 'undefined' && !prefersReduced() && (essential || !isLowEnd());
  },
};
