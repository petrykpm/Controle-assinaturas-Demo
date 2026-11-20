import { SubscriptionStatus } from '@/data/mock';

const statusConfig: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-success/10 text-success border-success/20' },
  expiring: { label: 'Expirando', className: 'bg-warning/10 text-warning border-warning/20' },
  cancelled: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  trial: { label: 'Trial', className: 'bg-primary/10 text-primary border-primary/20' },
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
