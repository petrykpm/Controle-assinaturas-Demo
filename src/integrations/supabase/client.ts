import { subscriptions as mockSubscriptions, categoryData } from '@/data/mock';

const SESSION_KEY = 'subcontrol-demo-session-v1';
const TABLE_KEYS: Record<string, string> = {
  subscriptions: 'subcontrol-demo-subscriptions-v1',
  categories: 'subcontrol-demo-categories-v1',
  user_settings: 'subcontrol-demo-settings-v1',
  payments: 'subcontrol-demo-payments-v1',
};
const DEMO_EMAIL = 'demo@subcontrol.com';
const DEMO_PASSWORD = 'demo123';
type Row = Record<string, any>;
const listeners = new Set<(event: string, session: any) => void>();

function datePlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
function write(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }
const SERVICE_URLS: Record<string, string> = {
  'OpenAI API': 'https://openai.com', AWS: 'https://aws.amazon.com', Vercel: 'https://vercel.com',
  Figma: 'https://figma.com', Slack: 'https://slack.com', GitHub: 'https://github.com',
  'Anthropic API': 'https://anthropic.com', Stripe: 'https://stripe.com', Datadog: 'https://datadoghq.com',
  Notion: 'https://notion.so', 'Adobe CC': 'https://adobe.com', Jira: 'https://atlassian.com/software/jira',
  'Google Cloud': 'https://cloud.google.com', Twilio: 'https://twilio.com', HubSpot: 'https://hubspot.com',
};

function seed() {
  if (!localStorage.getItem(TABLE_KEYS.subscriptions)) {
    write(TABLE_KEYS.subscriptions, mockSubscriptions.map((s, i) => ({
      id: s.id, user_id: 'demo-user', name: s.name, category: s.category, value: s.value,
      billing_type: s.billingType, renewal_date: datePlus((i * 3 + 2) % 32),
      status: s.status, responsible: s.responsible, notes: s.notes, url: SERVICE_URLS[s.name] ?? '',
      risk_level: i === 8 ? 'medium' : 'low', acquisition_date: datePlus(-90 - i * 4),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })));
  }
  if (!localStorage.getItem(TABLE_KEYS.categories)) {
    write(TABLE_KEYS.categories, categoryData.map((c, i) => ({
      id: String(i + 1), user_id: 'demo-user', name: c.name === 'Licenças' ? 'License' : c.name,
      color: c.color, created_at: new Date().toISOString(),
    })));
  }
  if (!localStorage.getItem(TABLE_KEYS.user_settings)) {
    write(TABLE_KEYS.user_settings, [{ id: 'demo-settings', user_id: 'demo-user', company_name: 'Acme Tecnologia', currency: 'BRL' }]);
  }
  if (!localStorage.getItem(TABLE_KEYS.payments)) {
    write(TABLE_KEYS.payments, Array.from({ length: 18 }, (_, i) => ({
      id: String(i + 1), user_id: 'demo-user', subscription_id: String((i % 12) + 1),
      amount: [2450, 8900, 400, 720, 1200, 840, 1800, 350, 2100, 480, 3600, 600][i % 12],
      paid_at: datePlus(-((i % 6) * 30 + 2)), notes: 'Pagamento fictício para demonstração',
      created_at: new Date().toISOString(),
    })));
  }
}
function tableRows(table: string): Row[] {
  seed();
  return read<Row[]>(TABLE_KEYS[table], []);
}
function session() { return read<any>(SESSION_KEY, null); }
function emit(event: string, value: any) { listeners.forEach(fn => fn(event, value)); }

class LocalQuery {
  table: string;
  action = 'select';
  payload: any;
  filters: Array<{ field: string; op: string; value: any }> = [];
  orderBy: { field: string; ascending: boolean } | null = null;
  singleResult = false;
  columns = '*';
  constructor(table: string) { this.table = table; }
  select(columns = '*') { this.columns = columns; return this; }
  insert(payload: any) { this.action = 'insert'; this.payload = payload; return this; }
  update(payload: any) { this.action = 'update'; this.payload = payload; return this; }
  delete() { this.action = 'delete'; return this; }
  eq(field: string, value: any) { this.filters.push({ field, op: 'eq', value }); return this; }
  gte(field: string, value: any) { this.filters.push({ field, op: 'gte', value }); return this; }
  lte(field: string, value: any) { this.filters.push({ field, op: 'lte', value }); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.orderBy = { field, ascending: options?.ascending !== false }; return this; }
  single() { this.singleResult = true; return this; }
  matches(row: Row) {
    return this.filters.every(f => f.op === 'eq' ? row[f.field] === f.value : f.op === 'gte' ? String(row[f.field] ?? '') >= String(f.value) : String(row[f.field] ?? '') <= String(f.value));
  }
  async run(): Promise<any> {
    let rows = tableRows(this.table);
    const key = TABLE_KEYS[this.table];
    if (this.action === 'insert') {
      const values = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((item: Row) => ({
        id: item.id ?? String(Date.now() + Math.random()), created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), ...item,
      }));
      write(key, [...rows, ...values]);
      rows = values;
    } else if (this.action === 'update') {
      let changed: Row[] = [];
      rows = rows.map(row => {
        if (!this.matches(row)) return row;
        const next = { ...row, ...this.payload, updated_at: new Date().toISOString() };
        changed.push(next);
        return next;
      });
      write(key, rows);
      rows = changed;
    } else if (this.action === 'delete') {
      const removed = rows.filter(row => this.matches(row));
      write(key, rows.filter(row => !this.matches(row)));
      rows = removed;
    } else {
      rows = rows.filter(row => this.matches(row));
    }
    if (this.orderBy) {
      const { field, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * (ascending ? 1 : -1));
    }
    if (this.table === 'payments' && this.columns.includes('subscription:subscriptions')) {
      const subs = tableRows('subscriptions');
      rows = rows.map(p => {
        const sub = subs.find(s => s.id === p.subscription_id);
        return { ...p, subscription: sub ? { name: sub.name, category: sub.category } : undefined };
      });
    }
    if (this.singleResult) {
      if (!rows.length) return { data: null, error: { message: 'Registro não encontrado' } };
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }
}

export const supabase: any = {
  from: (table: string) => new LocalQuery(table),
  auth: {
    onAuthStateChange(callback: (event: string, session: any) => void) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    async getSession() { return { data: { session: session() }, error: null }; },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }
      const user = { id: 'demo-user', email: DEMO_EMAIL };
      const next = { access_token: 'demo-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'demo-refresh', user };
      write(SESSION_KEY, next);
      emit('SIGNED_IN', next);
      return { data: { user, session: next }, error: null };
    },
    async signOut() { localStorage.removeItem(SESSION_KEY); emit('SIGNED_OUT', null); return { error: null }; },
    async getUser() { return { data: { user: session()?.user ?? null }, error: null }; },
    async updateUser() { return { data: { user: session()?.user ?? null }, error: { message: 'A senha não pode ser alterada no modo de demonstração.' } }; },
  },
};
