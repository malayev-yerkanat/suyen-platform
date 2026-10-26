'use client';

import { useEffect, type ReactNode } from 'react';
import { useAnimate } from 'motion/react';
import { useMotionEnabled } from '@/components/useMotionEnabled';
import { motionTokens } from '@/lib/motion-tokens';

/** Enhance already-visible server content; never gate content on hydration. */
export function MotionScene({ children, className }: { children: ReactNode; className?: string }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const enabled = useMotionEnabled();

  useEffect(() => {
    if (!enabled || !scope.current) return;
    const items = Array.from(scope.current.querySelectorAll<HTMLElement>('[data-motion="item"]'))
      .filter((item) => item.closest('.motion-scene') === scope.current
        && !item.parentElement?.closest('[data-motion="item"]')
        && !item.contains(document.activeElement));
    const animations = items.map((item, index) => {
      const originalStyle = item.getAttribute('style');
      const controls = animate(item, {
        opacity: [motionTokens.opacity.enter, motionTokens.opacity.visible],
        y: [motionTokens.distance.sm, 0],
      }, {
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.smooth,
        delay: Math.min(index, motionTokens.maxIndex) * motionTokens.stagger,
      });
      return { item, controls, originalStyle };
    });
    return () => {
      animations.forEach(({ item, controls, originalStyle }) => {
        controls.stop();
        if (originalStyle === null) item.removeAttribute('style');
        else item.setAttribute('style', originalStyle);
      });
    };
  }, [animate, enabled, scope]);

  return <div ref={scope} className={['motion-scene', className].filter(Boolean).join(' ')} style={{ display: 'contents' }}>{children}</div>;
}
