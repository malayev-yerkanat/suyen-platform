'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { useMotionEnabled } from '@/components/useMotionEnabled';
import { motionTokens } from '@/lib/motion-tokens';

/** A button that only moves when pressed: a tiny scale down, never a lift on hover. */
export function MotionButton({ className, disabled, ...props }: ComponentPropsWithoutRef<'button'>) {
  const enabled = useMotionEnabled();
  const interactive = enabled && !disabled;
  return (
    <motion.button
      {...props as HTMLMotionProps<'button'>}
      disabled={disabled}
      className={['motion-button', className].filter(Boolean).join(' ')}
      whileTap={interactive ? { scale: motionTokens.scale.press } : undefined}
      animate={interactive ? undefined : { y: 0, scale: 1 }}
      transition={interactive
        ? { duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }
        : { duration: motionTokens.duration.none }}
    />
  );
}
