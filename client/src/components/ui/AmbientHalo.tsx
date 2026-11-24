import React from 'react';

export interface AmbientHaloProps {
  /**
   * Financial health status:
   * - 'positive' or true: Soft emerald glow (healthy cashflow / under budget / savings)
   * - 'negative' or false: Soft rose glow (negative cashflow / over budget / high debt)
   * - 'neutral': Subtle indigo / violet glow
   */
  status?: 'positive' | 'negative' | 'neutral' | boolean;
  intensity?: 'subtle' | 'normal' | 'vibrant';
  position?: 'top' | 'center' | 'top-right' | 'full';
  className?: string;
  children?: React.ReactNode;
}

export function AmbientHalo({
  status = 'neutral',
  intensity = 'normal',
  position = 'top',
  className = '',
  children,
}: AmbientHaloProps) {
  const isPositive = status === 'positive' || status === true;
  const isNegative = status === 'negative' || status === false;

  const glowColors = isPositive
    ? {
        primary: 'rgba(16, 185, 129, 0.12)',
        secondary: 'rgba(16, 185, 129, 0.04)',
        border: 'rgba(16, 185, 129, 0.15)',
      }
    : isNegative
    ? {
        primary: 'rgba(244, 63, 94, 0.13)',
        secondary: 'rgba(244, 63, 94, 0.04)',
        border: 'rgba(244, 63, 94, 0.18)',
      }
    : {
        primary: 'rgba(99, 102, 241, 0.10)',
        secondary: 'rgba(99, 102, 241, 0.03)',
        border: 'rgba(99, 102, 241, 0.12)',
      };

  const positionStyles = {
    top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-3/4 h-48',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5',
    'top-right': 'top-0 right-0 translate-x-1/4 -translate-y-1/4 w-72 h-72',
    full: 'inset-0 w-full h-full',
  }[position];

  const opacityMultiplier = {
    subtle: 'opacity-60',
    normal: 'opacity-100',
    vibrant: 'opacity-130',
  }[intensity];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Dynamic Radial Ambient Halo */}
      <div
        className={`absolute pointer-events-none rounded-full blur-3xl transition-all duration-700 ease-out ${positionStyles} ${opacityMultiplier}`}
        style={{
          background: `radial-gradient(circle, ${glowColors.primary} 0%, ${glowColors.secondary} 55%, transparent 75%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

export default AmbientHalo;
