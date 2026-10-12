'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

type DepthPanelProps = {
  children: React.ReactNode;
  id?: string;
  className?: string;
  depth?: number;
};

export function DepthPanel({
  children,
  id,
  className = '',
  depth = 120,
}: DepthPanelProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const z = useTransform(scrollYProgress, [0, 0.5, 1], [0, -depth, 0]);

  return (
    <motion.section
      id={id}
      ref={ref}
      style={{ translateZ: z }}
      className={'layer-panel relative ' + className}
    >
      {children}
    </motion.section>
  );
}
