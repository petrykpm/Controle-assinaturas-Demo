import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useSubscriptions, useCategories, useUserSettings, useExchangeRate, convertCurrency, formatCurrency, useMonthlyPaymentTotals } from '@/hooks/useSupabase';
import { BarChart3, TrendingUp, Calendar, Tag, Loader2 } from 'lucide-react';
import { SubscriptionIcon } from '@/components/SubscriptionIcon';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CustomTooltip = ({ active, payload, label, fmt }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-success' },
  expiring: { label: 'Expirando', color: 'bg-warning' },
  trial: { label: 'Trial', color: 'bg-primary' },
  cancelled: { label: 'Cancelado', color: 'bg-destructive' },
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function AnalyticsPage() {
  const { data: subs = [], isLoading } = useSubscriptions();
  const { data: categories = [] } = useCategories();
  const { data: settings } = useUserSettings();
  const currency = settings?.currency || 'BRL';
  const { data: rate = 1 } = useExchangeRate(currency);
  const fmt = (value: number) => formatCurrency(convertCurrency(value, rate), currency);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('12');
  const { data: monthlyTotals = {} } = useMonthlyPaymentTotals();

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return subs;
    return subs.filter(s => s.status === filterStatus);
  }, [subs, filterStatus]);

  const stats = useMemo(() => {
    const active = filtered.filter(s => s.status !== 'cancelled');

    const totalMonthly = active.reduce((a, s) => {
      return a + (s.billing_type === 'annual' ? s.value / 12 : s.value);
    }, 0);

    const totalAnnual = active.reduce((a, s) => {
      return a + (s.billing_type === 'annual' ? s.value : s.value * 12);
    }, 0);

    const categoryData = categories.map(cat => ({
      name: cat.name,
      value: active.filter(s => s.category === cat.name).reduce((a, b) => a + b.value, 0),
      color: cat.color,
    })).filter(c => c.value > 0);

    const rankingData = [...active]
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map(s => ({ name: s.name, value: s.value }));

    const byCategory = categories.map(cat => {
      const catSubs = active.filter(s => s.category === cat.name);
      const total = catSubs.reduce((a, b) => a + (b.billing_type === 'annual' ? b.value / 12 : b.value), 0);
      return { name: cat.name, total, count: catSubs.length };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    const maxCategoryTotal = byCategory[0]?.total || 1;

    const byStatus: Record<string, number> = { active: 0, expiring: 0, trial: 0, cancelled: 0 };
    subs.forEach(s => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });

    const upcomingRenewals = [...subs]
      .filter(s => s.status !== 'cancelled')
      .map(s => ({ ...s, daysUntil: Math.ceil((new Date(s.renewal_date).getTime() - Date.now()) / 86400000) }))
      .filter(s => s.daysUntil <= 30 && s.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    const ticketMedio = active.length > 0 ? totalMonthly / active.length : 0;

    // Monthly timeline — mix real payments (past) with projections (future)
    const months = parseInt(timeRange);
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthlyData = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - Math.floor(months / 2) + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      const isPast = key < currentYearMonth;
      const isCurrent = key === currentYearMonth;

      // Use real payment data for past months, projection for future
      const realTotal = monthlyTotals[key] || 0;
      const projTotal = active.reduce((a, s) => a + (s.billing_type === 'annual' ? s.value / 12 : s.value), 0);

      return {
        month: label,
        key,
        real: (isPast || isCurrent) && realTotal > 0 ? realTotal : null,
        projecao: !isPast || realTotal === 0 ? projTotal : null,
      };
    });

    // Top categories for line chart
    const topCats = categoryData.slice(0, 4);

    return {
      totalMonthly, totalAnnual, ticketMedio, categoryData, rankingData,
      byCategory, maxCategoryTotal, byStatus, upcomingRenewals,
      activeCount: active.length, monthlyData, topCats,
    };
  }, [filtered, categories, subs, timeRange]);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Análises & Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-1">Distribuição, ranking e visão financeira</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 bg-surface-2 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="expiring">Expirando</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Gasto Mensal</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(stats.totalMonthly)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeCount} assinaturas ativas</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Projeção Anual</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(stats.totalAnnual)}</p>
            <p className="text-xs text-muted-foreground mt-1">Estimativa para 12 meses</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(stats.ticketMedio)}</p>
            <p className="text-xs text-muted-foreground mt-1">Por assinatura/mês</p>
          </div>
        </div>

        {/* Monthly Timeline */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Evolução Mensal de Gastos</h3>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-surface-2 border-border h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="24">24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {stats.monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,4%,16%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215,15%,55%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215,15%,55%)' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={80} />
                <Tooltip content={<CustomTooltip fmt={fmt} />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                <Line type="monotone" dataKey="real" name="Pago" stroke="hsl(142,71%,45%)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                <Line type="monotone" dataKey="projecao" name="Projeção" stroke="hsl(217,91%,60%)" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="5 3" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-20">Adicione assinaturas para ver a evolução mensal</p>
          )}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Verde = pagamentos reais registrados · Azul tracejado = projeção baseada nas assinaturas ativas
          </p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Distribuição por Categoria</h3>
            {stats.categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                      {stats.categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip fmt={fmt} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {stats.categoryData.map(c => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-muted-foreground truncate">{c.name}</span>
                      <span className="ml-auto text-foreground font-medium tabular-nums">{fmt(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-20">Adicione assinaturas para ver os gráficos</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Ranking de Serviços</h3>
            {stats.rankingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.rankingData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,4%,16%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215,15%,55%)' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: 'hsl(215,15%,55%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip fmt={fmt} />} />
                  <Bar dataKey="value" fill="hsl(217,91%,60%)" radius={[0, 4, 4, 0]} name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-20">Nenhum dado</p>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Gasto por Categoria (mensal)</h3>
            </div>
            {stats.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-3">
                {stats.byCategory.map(cat => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-foreground font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{cat.count} assin.</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{fmt(cat.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(cat.total / stats.maxCategoryTotal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Distribuição por Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const cfg = statusLabels[status];
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
                      <span className="text-xs text-muted-foreground flex-1">{cfg.label}</span>
                      <span className="text-xs font-semibold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Próximas Renovações (30 dias)</h3>
              {stats.upcomingRenewals.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma renovação nos próximos 30 dias</p>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingRenewals.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SubscriptionIcon url={s.url} name={s.name} />
                        <div>
                          <p className="text-xs font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.daysUntil === 0 ? 'Hoje' : `Em ${s.daysUntil} dias`}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-foreground tabular-nums">{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
