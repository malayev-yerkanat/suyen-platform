'use client';

import { type ComponentPropsWithoutRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { useMotionEnabled } from '@/components/useMotionEnabled';
import { motionTokens, springs } from '@/lib/motion-tokens';

export function MotionButton({ className, disabled, ...props }: ComponentPropsWithoutRef<'button'>) {
  const enabled = useMotionEnabled();
  const interactive = enabled && !disabled;
  return (
    <motion.button
      {...props as HTMLMotionProps<'button'>}
      disabled={disabled}
      className={['motion-button', className].filter(Boolean).join(' ')}
      whileHover={interactive ? { y: -motionTokens.distance.xs, scale: motionTokens.scale.hover } : undefined}
      whileTap={interactive ? { scale: motionTokens.scale.press } : undefined}
      animate={interactive ? undefined : { y: 0, scale: 1 }}
      transition={interactive ? springs.snappy : { duration: motionTokens.duration.none }}
    />
  );
}
