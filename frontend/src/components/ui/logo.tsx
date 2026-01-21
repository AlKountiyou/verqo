import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
}

export function Logo({ className, variant = 'full', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 },
    xxl: { width: 128, height: 128 },
    xxxl: { width: 256, height: 256 },
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
    xxl: 'text-5xl',
    xxxl: 'text-6xl',
  };

  const dimensions = sizeClasses[size];

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Image
          src="/verqo_logo.png"
          alt="Verqo"
          width={dimensions.width}
          height={dimensions.height}
          priority
          unoptimized
          className="rounded-lg"
        />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-center', className)}>
        <span className={cn(
          'font-display font-bold text-verqo-navy-dark',
          textSizeClasses[size]
        )}>
          Verqo
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <Image
        src="/verqo_logo.png"
        alt="Verqo"
        width={dimensions.width}
        height={dimensions.height}
        priority
        unoptimized
        className="rounded-lg"
      />
      <span className={cn(
        'font-display font-bold text-verqo-navy-dark',
        textSizeClasses[size]
      )}>
        Verqo
      </span>
    </div>
  );
}

