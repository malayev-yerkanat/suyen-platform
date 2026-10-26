'use client';

import { useSyncExternalStore } from 'react';
import { motionConfig } from '@/lib/motion-config';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  preference.addEventListener('change', onChange);
  return () => preference.removeEventListener('change', onChange);
}

const serverSnapshot = () => false;

/** Match hydration first, then observe live OS preference changes. */
export function useMotionEnabled() {
  return useSyncExternalStore(subscribe, motionConfig.shouldAnimate, serverSnapshot);
}
