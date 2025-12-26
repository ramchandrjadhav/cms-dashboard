import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className
}: StatsCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground-secondary">{title}</CardTitle>
        {icon && (
          <div className="text-foreground-tertiary">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {change && (
          <p className={cn(
            'text-xs mt-1',
            changeType === 'positive' && 'text-success',
            changeType === 'negative' && 'text-error',
            changeType === 'neutral' && 'text-muted-foreground'
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}