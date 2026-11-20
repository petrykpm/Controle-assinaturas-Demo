import { useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { useSubscriptions, useUserSettings, useExchangeRate, convertCurrency, formatCurrency } from '@/hooks/useSupabase';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { SubscriptionIcon } from '@/components/SubscriptionIcon';

const riskConfig = {
  critical: { label: 'Crítico', icon: ShieldAlert, className: 'text-destructive bg-destructive/10 border-destructive/20' },
  high: { label: 'Alto', icon: AlertTriangle, className: 'text-warning bg-warning/10 border-warning/20' },
  medium: { label: 'Médio', icon: Clock, className: 'text-primary bg-primary/10 border-primary/20' },
  low: { label: 'Baixo', icon: CheckCircle2, className: 'text-success bg-success/10 border-success/20' },
};

export default function RenewalsPage() {
  const { data: subs = [], isLoading } = useSubscriptions();
  const { data: settings } = useUserSettings();
  const currency = settings?.currency || 'BRL';
  const { data: rate = 1 } = useExchangeRate(currency);
  const fmt = (value: number) => formatCurrency(convertCurrency(value, rate), currency);

  const renewalList = useMemo(() => {
    const now = Date.now();
    return [...subs]
      .filter(s => s.status !== 'cancelled')
      .map(s => {
        const daysUntil = Math.ceil((new Date(s.renewal_date).getTime() - now) / 86400000);
        const risk = daysUntil <= 3 ? 'critical' : daysUntil <= 7 ? 'high' : daysUntil <= 30 ? 'medium' : 'low';
        return { ...s, daysUntil, risk } as typeof s & { daysUntil: number; risk: keyof typeof riskConfig };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [subs]);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Renovações & Alertas</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe prazos e gerencie riscos</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['critical', 'high', 'medium', 'low'] as const).map(risk => {
            const count = renewalList.filter(r => r.risk === risk).length;
            const cfg = riskConfig[risk];
            const Icon = cfg.icon;
            return (
              <div key={risk} className={`rounded-lg border p-4 ${cfg.className}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{cfg.label}</span>
                </div>
                <p className="text-2xl font-semibold mt-2">{count}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Risco</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Serviço</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Renovação</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tempo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {renewalList.map(item => {
                const cfg = riskConfig[item.risk];
                const Icon = cfg.icon;
                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <SubscriptionIcon url={item.url} name={item.name} />
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tabular-nums">{fmt(item.value)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(item.renewal_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${item.daysUntil <= 7 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {item.daysUntil > 0 ? `${item.daysUntil} dias` : 'Vencido'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  </tr>
                );
              })}
              {renewalList.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Nenhuma renovação pendente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
