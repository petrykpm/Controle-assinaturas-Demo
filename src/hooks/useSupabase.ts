import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────
export type SubscriptionStatus = 'active' | 'expiring' | 'cancelled' | 'trial';
export type BillingType = 'monthly' | 'annual' | 'usage';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category: string;
  value: number;
  billing_type: BillingType;
  renewal_date: string | null;
  status: SubscriptionStatus;
  responsible: string;
  notes: string;
  url: string;
  risk_level: RiskLevel | null;
  acquisition_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  company_name: string;
  currency: string;
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type SubscriptionUpdate = Partial<SubscriptionInsert>;

// ─── Default categories (fallback) ──────────────────
export const DEFAULT_CATEGORIES = ['SaaS', 'AI', 'API', 'Cloud', 'License'];

// ─── Format ──────────────────────────────────────────
export const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

// ─── Exchange Rates ───────────────────────────────────
// Rates are fetched from a free public API (no key required)
// Values are always stored in BRL; display is converted on the fly
export function useExchangeRate(targetCurrency: string) {
  return useQuery({
    queryKey: ['exchange_rate', targetCurrency],
    queryFn: async () => {
      if (targetCurrency === 'BRL') return 1;
      const res = await fetch(`https://open.er-api.com/v6/latest/BRL`);
      if (!res.ok) throw new Error('Falha ao buscar cotação');
      const data = await res.json();
      return (data.rates?.[targetCurrency] as number) ?? 1;
    },
    staleTime: 10 * 60 * 1000, // cache 10 min
    enabled: targetCurrency !== 'BRL',
  });
}

export function convertCurrency(valueInBRL: number, rate: number) {
  return valueInBRL * rate;
}

// ─── Subscriptions ───────────────────────────────────
export function useSubscriptions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('name');
      if (error) {
        console.error('Erro ao carregar assinaturas:', error);
        throw error;
      }
      return data as Subscription[];
    },
    enabled: !!user,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (sub: SubscriptionInsert) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({ ...sub, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
    onError: (err) => {
      console.error('Erro ao criar assinatura:', err);
      toast.error('Erro ao criar assinatura. Verifique os dados.');
    },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
    onError: (err) => {
      console.error('Erro ao atualizar assinatura:', err);
      toast.error('Erro ao atualizar assinatura.');
    },
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
    onError: (err) => {
      console.error('Erro ao deletar assinatura:', err);
      toast.error('Erro ao remover assinatura.');
    },
  });
}

// ─── Categories ──────────────────────────────────────
export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) {
        console.error('Erro ao carregar categorias:', error);
        return [] as Category[];
      }
      return (data || []) as Category[];
    },
    enabled: !!user,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('categories')
        .insert({ name, color: color || 'hsl(217, 91%, 60%)', user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err) => {
      console.error('Erro ao criar categoria:', err);
      toast.error('Erro ao adicionar categoria. Verifique a conexão com o Supabase.');
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err) => {
      console.error('Erro ao deletar categoria:', err);
      toast.error('Erro ao remover categoria.');
    },
  });
}

// ─── User Settings ───────────────────────────────────
export function useUserSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .single();
      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return { id: '', user_id: user?.id || '', company_name: '', currency: 'BRL' } as UserSettings;
      }
      return (data as UserSettings) || null;
    },
    enabled: !!user,
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (settings: { company_name?: string; currency?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Try UPDATE first (record almost certainly exists from seed)
      const { data: updated, error: updateError } = await supabase
        .from('user_settings')
        .update(settings)
        .eq('user_id', user.id)
        .select()
        .single();

      if (!updateError && updated) return updated as UserSettings;

      // Fallback: INSERT if record doesn't exist yet
      const { data: inserted, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: user.id, ...settings })
        .select()
        .single();

      if (insertError) throw insertError;
      return inserted as UserSettings;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_settings'] }),
    onError: (err) => {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações.');
    },
  });
}


// ─── Payments ─────────────────────────────────────────
export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  paid_at: string;
  notes: string;
  created_at: string;
  subscription?: Subscription;
}

export type PaymentInsert = {
  subscription_id: string;
  amount: number;
  paid_at: string;
  notes?: string;
};

export function usePayments(month?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['payments', user?.id, month],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*, subscription:subscriptions(name, category)')
        .order('paid_at', { ascending: false });

      if (month) {
        const start = `${month}-01`;
        const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0)
          .toISOString().split('T')[0];
        query = query.gte('paid_at', start).lte('paid_at', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user,
  });
}

export function useMonthlyPaymentTotals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['payments_monthly', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('paid_at, amount')
        .order('paid_at', { ascending: true });
      if (error) throw error;

      // Group by year-month
      const map: Record<string, number> = {};
      (data || []).forEach(p => {
        const key = p.paid_at.slice(0, 7); // "2026-06"
        map[key] = (map[key] || 0) + Number(p.amount);
      });
      return map;
    },
    enabled: !!user,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...payment, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['payments_monthly'] });
    },
    onError: (err) => {
      console.error('Erro ao registrar pagamento:', err);
      toast.error('Erro ao registrar pagamento.');
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['payments_monthly'] });
    },
  });
}
