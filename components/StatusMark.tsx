'use client';

import { useEffect } from 'react';
import { useAnimate } from 'motion/react';
import { useMotionEnabled } from '@/components/useMotionEnabled';
import { motionTokens } from '@/lib/motion-tokens';

/** A decorative state cue. Surrounding text supplies the accessible message. */
export function StatusMark({ variant = 'success' }: { variant?: 'success' | 'cancelled' }) {
  const [scope, animate] = useAnimate<SVGSVGElement>();
  const enabled = useMotionEnabled();
  useEffect(() => {
    if (!enabled || !scope.current) return;
    const path = scope.current.querySelector('path');
    if (!path) return;
    const originalStyle = path.getAttribute('style');
    const controls = animate(path, { pathLength: [0, 1] }, {
      duration: motionTokens.duration.slow,
      ease: motionTokens.easing.smooth,
    });
    return () => {
      controls.stop();
      if (originalStyle === null) path.removeAttribute('style');
      else path.setAttribute('style', originalStyle);
      path.removeAttribute('stroke-dasharray');
      path.removeAttribute('stroke-dashoffset');
    };
  }, [animate, enabled, scope, variant]);
  return (
    <svg ref={scope} className={`status-mark status-mark--${variant}`} width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d={variant === 'success' ? 'M14 24l7 7 13-14' : 'M16 24h16'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
