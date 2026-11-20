import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
}

export function MetricCard({ title, value, change, icon, accent = 'primary' }: MetricCardProps) {
  const accentClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 animate-fade-in hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(change)}% vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${accentClasses[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
