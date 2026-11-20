export type SubscriptionStatus = 'active' | 'expiring' | 'cancelled' | 'trial';
export type BillingType = 'monthly' | 'annual' | 'usage';
export type Category = 'SaaS' | 'AI' | 'API' | 'Cloud' | 'License';

export interface Subscription {
  id: string;
  name: string;
  category: Category;
  value: number;
  billingType: BillingType;
  renewalDate: string;
  status: SubscriptionStatus;
  responsible: string;
  notes: string;
  logo?: string;
}

export const subscriptions: Subscription[] = [
  { id: '1', name: 'OpenAI API', category: 'AI', value: 2450, billingType: 'monthly', renewalDate: '2026-04-15', status: 'active', responsible: 'Tech Lead', notes: 'GPT-4 usage', },
  { id: '2', name: 'AWS', category: 'Cloud', value: 8900, billingType: 'monthly', renewalDate: '2026-04-01', status: 'active', responsible: 'DevOps', notes: 'EC2 + S3 + RDS', },
  { id: '3', name: 'Vercel', category: 'Cloud', value: 400, billingType: 'monthly', renewalDate: '2026-05-10', status: 'active', responsible: 'Frontend Lead', notes: 'Pro plan', },
  { id: '4', name: 'Figma', category: 'SaaS', value: 720, billingType: 'annual', renewalDate: '2026-06-01', status: 'active', responsible: 'Design Lead', notes: 'Organization plan', },
  { id: '5', name: 'Slack', category: 'SaaS', value: 1200, billingType: 'monthly', renewalDate: '2026-04-20', status: 'active', responsible: 'Operations', notes: 'Business+ plan', },
  { id: '6', name: 'GitHub', category: 'SaaS', value: 840, billingType: 'monthly', renewalDate: '2026-04-25', status: 'active', responsible: 'Tech Lead', notes: 'Enterprise', },
  { id: '7', name: 'Anthropic API', category: 'AI', value: 1800, billingType: 'usage', renewalDate: '2026-04-30', status: 'active', responsible: 'Tech Lead', notes: 'Claude usage', },
  { id: '8', name: 'Stripe', category: 'API', value: 350, billingType: 'usage', renewalDate: '2026-05-15', status: 'active', responsible: 'Finance', notes: 'Payment processing fees', },
  { id: '9', name: 'Datadog', category: 'SaaS', value: 2100, billingType: 'monthly', renewalDate: '2026-04-12', status: 'expiring', responsible: 'DevOps', notes: 'Monitoring', },
  { id: '10', name: 'Notion', category: 'SaaS', value: 480, billingType: 'monthly', renewalDate: '2026-05-05', status: 'active', responsible: 'Operations', notes: 'Team plan', },
  { id: '11', name: 'Adobe CC', category: 'License', value: 3600, billingType: 'annual', renewalDate: '2026-07-15', status: 'active', responsible: 'Design Lead', notes: 'All apps', },
  { id: '12', name: 'Jira', category: 'SaaS', value: 600, billingType: 'monthly', renewalDate: '2026-04-18', status: 'active', responsible: 'PM Lead', notes: 'Premium', },
  { id: '13', name: 'Google Cloud', category: 'Cloud', value: 3200, billingType: 'monthly', renewalDate: '2026-04-08', status: 'active', responsible: 'DevOps', notes: 'BigQuery + GKE', },
  { id: '14', name: 'Twilio', category: 'API', value: 520, billingType: 'usage', renewalDate: '2026-05-20', status: 'trial', responsible: 'Backend Lead', notes: 'SMS & Voice', },
  { id: '15', name: 'HubSpot', category: 'SaaS', value: 1500, billingType: 'monthly', renewalDate: '2026-04-22', status: 'cancelled', responsible: 'Marketing', notes: 'CRM Pro - migrating to Salesforce', },
];

export const monthlyData = [
  { month: 'Nov', total: 24200, saas: 8100, ai: 3800, cloud: 9500, api: 1200, license: 1600 },
  { month: 'Dez', total: 25800, saas: 8400, ai: 4100, cloud: 10000, api: 1300, license: 2000 },
  { month: 'Jan', total: 26100, saas: 8600, ai: 4250, cloud: 10200, api: 1050, license: 2000 },
  { month: 'Fev', total: 27300, saas: 8800, ai: 4400, cloud: 10500, api: 1200, license: 2400 },
  { month: 'Mar', total: 28100, saas: 9100, ai: 4600, cloud: 10800, api: 1200, license: 2400 },
  { month: 'Abr', total: 28660, saas: 9340, ai: 4250, cloud: 12500, api: 870, license: 1700 },
];

export const categoryData = [
  { name: 'SaaS', value: 9340, color: 'hsl(217, 91%, 60%)' },
  { name: 'AI', value: 4250, color: 'hsl(280, 65%, 60%)' },
  { name: 'Cloud', value: 12500, color: 'hsl(142, 71%, 45%)' },
  { name: 'API', value: 870, color: 'hsl(38, 92%, 50%)' },
  { name: 'Licenças', value: 1700, color: 'hsl(0, 72%, 51%)' },
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
