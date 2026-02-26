import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-01-27.acacia',
});

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    max_projects: 1,
    max_members: 5,
    ai_requests_per_month: 50,
    features: ['1 project', '5 members', '50 AI requests/mo', 'Kanban board', 'Basic reporting'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro',
    max_projects: 10,
    max_members: 25,
    ai_requests_per_month: 500,
    features: ['10 projects', '25 members', '500 AI requests/mo', 'All AI providers', 'Custom fields', 'Priority support'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    max_projects: -1, // unlimited
    max_members: -1,
    ai_requests_per_month: -1,
    features: ['Unlimited projects', 'Unlimited members', 'Unlimited AI', 'Custom AI prompts', 'SSO', 'SLA support', 'Audit logs export'],
  },
} as const;

export type PlanId = keyof typeof PLANS;
