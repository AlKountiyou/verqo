import React from 'react';
import { Badge } from './badge';
import { CheckCircle, XCircle, Clock, Play, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PENDING' | 'WARNING';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  IDLE: {
    variant: 'idle' as const,
    label: 'En attente',
    icon: Clock,
    color: 'text-verqo-gray-medium',
  },
  RUNNING: {
    variant: 'running' as const,
    label: 'En cours',
    icon: Play,
    color: 'text-blue-500',
  },
  SUCCESS: {
    variant: 'completed' as const,
    label: 'Réussi',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  FAILED: {
    variant: 'failed' as const,
    label: 'Échec',
    icon: XCircle,
    color: 'text-verqo-red',
  },
  PENDING: {
    variant: 'warning' as const,
    label: 'En attente',
    icon: Clock,
    color: 'text-orange-500',
  },
  WARNING: {
    variant: 'warning' as const,
    label: 'Attention',
    icon: AlertCircle,
    color: 'text-orange-500',
  },
};

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showIcon = true, 
  className 
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(iconSizeClasses[size], config.color)} />
      )}
      {config.label}
    </Badge>
  );
}

// Test flow specific status component
export function TestFlowStatus({ 
  status, 
  size = 'md', 
  className 
}: Omit<StatusIndicatorProps, 'status'> & { 
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED' 
}) {
  return (
    <StatusIndicator 
      status={status} 
      size={size} 
      className={className}
    />
  );
}

// Project status component
export function ProjectStatus({ 
  status, 
  size = 'md', 
  className 
}: Omit<StatusIndicatorProps, 'status'> & { 
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' 
}) {
  const projectStatusConfig = {
    ACTIVE: {
      variant: 'success' as const,
      label: 'Actif',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    PAUSED: {
      variant: 'warning' as const,
      label: 'En pause',
      icon: Clock,
      color: 'text-orange-500',
    },
    COMPLETED: {
      variant: 'completed' as const,
      label: 'Terminé',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    ARCHIVED: {
      variant: 'idle' as const,
      label: 'Archivé',
      icon: AlertCircle,
      color: 'text-verqo-gray-medium',
    },
  };

  const config = projectStatusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn(iconSizeClasses[size], config.color)} />
      {config.label}
    </Badge>
  );
}
