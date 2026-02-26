import { useState, useEffect } from 'react';
import { CreditCard, Zap, Crown, Building2, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../auth';
import { User } from '../types';

interface BillingProps { currentUser: User; }

const PLAN_ICONS: Record<string, any> = { free: Zap, pro: Crown, enterprise: Building2 };
const PLAN_COLORS: Record<string, string> = {
  free: 'border-gray-200 bg-white',
  pro: 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-400',
  enterprise: 'border-purple-400 bg-purple-50',
};

export default function Billing({ currentUser }: BillingProps) {
  const [plans, setPlans]       = useState<any>({});
  const [tenant, setTenant]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState('');

  useEffect(() => {
    (async () => {
      const [plansRes, tenantRes] = await Promise.all([apiFetch('/api/billing/plans'), apiFetch('/api/billing/current')]);
      setPlans(await plansRes.json());
      setTenant(await tenantRes.json());
      setLoading(false);
    })();
  }, []);

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const res  = await apiFetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ planId }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error(e); }
    finally { setCheckoutLoading(''); }
  };

  const handlePortal = async () => {
    const res  = await apiFetch('/api/billing/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  const currentPlan = tenant?.plan || 'free';
  const trialEnd    = tenant?.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Billing & Plans</h2>
        <p className="text-gray-500 text-sm">Manage your subscription and billing details.</p>
      </div>

      {/* Trial banner */}
      {trialEnd && trialDaysLeft > 0 && currentPlan === 'free' && (
        <div className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-amber-900">Free trial — {trialDaysLeft} days remaining</p>
            <p className="text-sm text-amber-700">Upgrade to Pro or Enterprise to keep all features after your trial ends.</p>
          </div>
        </div>
      )}

      {/* Current plan */}
      <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current Plan</p>
            <h3 className="text-2xl font-bold text-gray-900 capitalize">{currentPlan}</h3>
          </div>
          {tenant?.stripe_customer_id && (
            <button onClick={handlePortal}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">
              <ExternalLink size={16}/> Manage Billing
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            { label: 'Projects', used: tenant?.used_projects || 0, max: plans[currentPlan]?.max_projects },
            { label: 'Members',  used: tenant?.used_members  || 0, max: plans[currentPlan]?.max_members },
            { label: 'AI Requests/mo', used: 0, max: plans[currentPlan]?.ai_requests_per_month },
          ].map(({ label, used, max }) => (
            <div key={label} className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="font-bold text-gray-900">{max === -1 ? 'Unlimited' : `${used} / ${max}`}</p>
              {max !== -1 && max > 0 && (
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full">
                  <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (used/max)*100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(plans).map((plan: any) => {
          const Icon      = PLAN_ICONS[plan.id] || Zap;
          const isCurrent = currentPlan === plan.id;
          return (
            <motion.div key={plan.id} layout className={`rounded-3xl border-2 p-6 relative ${PLAN_COLORS[plan.id] || 'border-gray-200 bg-white'}`}>
              {plan.id === 'pro' && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              )}
              <Icon size={28} className={`mb-4 ${plan.id === 'pro' ? 'text-indigo-600' : plan.id === 'enterprise' ? 'text-purple-600' : 'text-gray-500'}`} />
              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>

              <ul className="mt-4 space-y-2 mb-6">
                {plan.features.map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={14} className="text-emerald-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold text-center">Current Plan</div>
              ) : plan.price === 0 ? null : (
                <button onClick={() => handleUpgrade(plan.id)} disabled={!!checkoutLoading}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.id === 'pro' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-purple-600 text-white hover:bg-purple-700'} disabled:opacity-50 flex items-center justify-center gap-2`}>
                  {checkoutLoading === plan.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><CreditCard size={16}/> Upgrade to {plan.name}</>}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
