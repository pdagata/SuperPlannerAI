import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createSchema } from "./src/db/schema.js";
import { query, queryOne, execute, isPostgres } from "./src/db/index.js";
import { stripe, PLANS, PlanId } from "./src/lib/stripe.js";
import { sendInviteEmail, sendVerifyEmail, sendPasswordResetEmail, sendWelcomeEmail } from "./src/lib/email.js";
import { callAI, AVAILABLE_MODELS, DEFAULT_SYSTEM_PROMPT } from "./src/lib/ai.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const JWT_SECRET         = process.env.JWT_SECRET || "CHANGE_ME_IN_PROD_32chars_minimum!";
const JWT_EXPIRES_IN     = "8h";
const REFRESH_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS      = 10;
const uid = () => uuidv4();
const now = () => new Date().toISOString();

// ── Auth helpers ──────────────────────────────────────────────────────────────
const signAccess  = (p: object) => jwt.sign(p, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
const signRefresh = (p: object) => jwt.sign(p, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
const verifyTok   = (t: string)  => jwt.verify(t, JWT_SECRET) as any;

interface AuthReq extends Request { authUser?: any; }

function requireAuth(req: AuthReq, res: Response, next: NextFunction) {
  const h = req.headers['authorization'];
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try { req.authUser = verifyTok(h.split(' ')[1]); next(); }
  catch { res.status(401).json({ error: 'Token expired or invalid' }); }
}

function requireRole(...roles: string[]) {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    if (!roles.includes(req.authUser?.role_id)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// ── Tenant helpers ────────────────────────────────────────────────────────────
async function getTenant(tenantId: string) {
  return queryOne('SELECT * FROM tenants WHERE id = ?', [tenantId]);
}

async function checkPlanLimit(tenantId: string, resource: 'projects' | 'members') {
  const tenant = await getTenant(tenantId);
  if (!tenant) return false;
  const plan = PLANS[tenant.plan as PlanId];
  if (!plan) return false;
  if (resource === 'projects') {
    if (plan.max_projects === -1) return true;
    const count = await queryOne('SELECT COUNT(*) as c FROM projects WHERE tenant_id = ?', [tenantId]);
    return (count?.c || 0) < plan.max_projects;
  }
  if (resource === 'members') {
    if (plan.max_members === -1) return true;
    const count = await queryOne('SELECT COUNT(*) as c FROM users WHERE tenant_id = ?', [tenantId]);
    return (count?.c || 0) < plan.max_members;
  }
  return false;
}

async function getVisibleProjectIds(userId: string, roleId: string, tenantId: string): Promise<string[] | null> {
  if (roleId === 'superadmin') return null;
  const rows = await query('SELECT project_id FROM project_members WHERE user_id = ?', [userId]);
  return rows.map(r => r.project_id);
}

async function logAudit(tenantId: string, entityType: string, entityId: string, userId: string, action: string, changes: any) {
  await execute('INSERT INTO audit_logs (id, tenant_id, entity_type, entity_id, user_id, action, changes) VALUES (?,?,?,?,?,?,?)',
    [uid(), tenantId, entityType, entityId, userId, action, JSON.stringify(changes)]);
}

// ── Seed default columns per tenant ───────────────────────────────────────────
async function seedTenantColumns(tenantId: string) {
  const existing = await query('SELECT id FROM columns WHERE tenant_id = ?', [tenantId]);
  if (existing.length === 0) {
    for (const [id, title, order] of [['todo','To Do',0],['in-progress','In Progress',1],['review','Review',2],['done','Done',3]]) {
      await execute('INSERT INTO columns (id, tenant_id, title, "order") VALUES (?,?,?,?)', [`${tenantId}-${id}`, tenantId, title, order]);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
  await createSchema();

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  app.use(express.json());
  // Raw body for Stripe webhooks
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

  // ── PUBLIC ROUTES ───────────────────────────────────────────────────────────

  // Self-service registration
  app.post("/api/register", async (req, res) => {
    try {
      const { workspaceName, workspaceSlug, fullName, email, password } = req.body;
      if (!workspaceName || !email || !password || !fullName) return res.status(400).json({ error: 'All fields required' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

      // Check slug uniqueness
      const slug = (workspaceSlug || workspaceName).toLowerCase().replace(/[^a-z0-9]/g, '-');
      const existing = await queryOne('SELECT id FROM tenants WHERE slug = ?', [slug]);
      if (existing) return res.status(400).json({ error: 'Workspace slug already taken' });

      const tenantId = uid();
      const userId   = uid();
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      await execute('INSERT INTO tenants (id, name, slug, plan, max_projects, max_members, trial_ends_at) VALUES (?,?,?,?,?,?,?)',
        [tenantId, workspaceName, slug, 'free', 1, 5, trialEnd]);

      const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      const verifyToken = uid();
      await execute('INSERT INTO users (id, tenant_id, username, password_hash, role_id, full_name, email, email_verify_token) VALUES (?,?,?,?,?,?,?,?)',
        [userId, tenantId, email.split('@')[0], hash, 'superadmin', fullName, email, verifyToken]);

      await seedTenantColumns(tenantId);

      // Send welcome + verify email (non-blocking)
      sendVerifyEmail(email, verifyToken).catch(console.error);
      sendWelcomeEmail(email, fullName, workspaceName).catch(console.error);

      const payload = { id: userId, tenant_id: tenantId, role_id: 'superadmin', role_name: 'Super Administrator' };
      res.status(201).json({ accessToken: signAccess(payload), refreshToken: signRefresh({ id: userId }), tenantSlug: slug });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Login
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password, tenantSlug } = req.body;
      let user: any;

      if (tenantSlug) {
        const tenant = await queryOne('SELECT id FROM tenants WHERE slug = ?', [tenantSlug]);
        if (!tenant) return res.status(401).json({ error: 'Workspace not found' });
        user = await queryOne(
          'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE (u.username = ? OR u.email = ?) AND u.tenant_id = ?',
          [username, username, tenant.id]
        );
      } else {
        user = await queryOne(
          'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE (u.username = ? OR u.email = ?) LIMIT 1',
          [username, username]
        );
      }

      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const payload = { id: user.id, tenant_id: user.tenant_id, role_id: user.role_id, role_name: user.role_name, username: user.username };
      const accessToken  = signAccess(payload);
      const refreshToken = signRefresh({ id: user.id });

      const tokenHash = bcrypt.hashSync(refreshToken, 5);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await execute('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)', [uid(), user.id, tokenHash, expiresAt]);

      const { password_hash: _, email_verify_token: __, reset_token: ___, ...safeUser } = user;
      res.json({ user: safeUser, accessToken, refreshToken });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Refresh token
  app.post("/api/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
      const decoded = verifyTok(refreshToken);
      const stored = await query("SELECT * FROM refresh_tokens WHERE user_id = ? AND expires_at > ?", [decoded.id, now()]);
      const valid = stored.find(t => bcrypt.compareSync(refreshToken, t.token_hash));
      if (!valid) return res.status(401).json({ error: 'Invalid refresh token' });
      const user = await queryOne('SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [decoded.id]);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const payload = { id: user.id, tenant_id: user.tenant_id, role_id: user.role_id, role_name: user.role_name, username: user.username };
      res.json({ accessToken: signAccess(payload) });
    } catch { res.status(401).json({ error: 'Refresh token expired' }); }
  });

  // Verify email
  app.get("/api/verify-email", async (req, res) => {
    const { token } = req.query as any;
    await execute('UPDATE users SET email_verified = TRUE, email_verify_token = NULL WHERE email_verify_token = ?', [token]);
    res.redirect('/?verified=1');
  });

  // Password reset request
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
      if (user) {
        const token   = uid();
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await execute('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);
        await sendPasswordResetEmail(email, token);
      }
      res.json({ success: true }); // always 200 to prevent email enumeration
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Password reset
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });
      const user = await queryOne('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, now()]);
      if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
      const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
      await execute('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Accept invitation
  app.post("/api/accept-invite", async (req, res) => {
    try {
      const { token, fullName, password } = req.body;
      const invite = await queryOne('SELECT * FROM invitations WHERE token = ? AND accepted_at IS NULL AND expires_at > ?', [token, now()]);
      if (!invite) return res.status(400).json({ error: 'Invalid or expired invitation' });

      const userId = uid();
      const hash   = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      const username = invite.email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 4);

      await execute('INSERT INTO users (id, tenant_id, username, password_hash, role_id, full_name, email, email_verified, invited_by) VALUES (?,?,?,?,?,?,?,TRUE,?)',
        [userId, invite.tenant_id, username, hash, invite.role_id, fullName, invite.email, invite.invited_by]);

      if (invite.project_id) {
        await execute('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role) VALUES (?,?,?,?)', [uid(), invite.project_id, userId, 'member']);
      }
      await execute('UPDATE invitations SET accepted_at = ? WHERE id = ?', [now(), invite.id]);

      const tenant = await getTenant(invite.tenant_id);
      const payload = { id: userId, tenant_id: invite.tenant_id, role_id: invite.role_id, role_name: invite.role_id, username };
      res.json({ accessToken: signAccess(payload), refreshToken: signRefresh({ id: userId }), tenantSlug: tenant?.slug });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── STRIPE WEBHOOKS (before auth middleware) ───────────────────────────────

  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch { return res.status(400).json({ error: 'Webhook signature failed' }); }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data.object;
      const customerId = sub.customer;
      const priceId    = sub.items.data[0]?.price?.id;
      const plan = Object.values(PLANS).find(p => p.priceId === priceId);
      if (plan) {
        await execute('UPDATE tenants SET plan = ?, stripe_subscription_id = ?, max_projects = ?, max_members = ? WHERE stripe_customer_id = ?',
          [plan.id, sub.id, plan.max_projects, plan.max_members, customerId]);
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await execute("UPDATE tenants SET plan = 'free', stripe_subscription_id = NULL, max_projects = 1, max_members = 5 WHERE stripe_customer_id = ?", [sub.customer]);
    }
    res.json({ received: true });
  });

  // ── ALL ROUTES BELOW REQUIRE AUTH ──────────────────────────────────────────
  app.use('/api', requireAuth);

  app.post("/api/logout", async (req: AuthReq, res) => {
    await execute('DELETE FROM refresh_tokens WHERE user_id = ?', [req.authUser.id]);
    res.json({ success: true });
  });

  // ── BILLING ────────────────────────────────────────────────────────────────

  app.get("/api/billing/plans", (req, res) => res.json(PLANS));

  app.get("/api/billing/current", async (req: AuthReq, res) => {
    const tenant = await getTenant(req.authUser.tenant_id);
    res.json(tenant);
  });

  app.post("/api/billing/checkout", async (req: AuthReq, res) => {
    try {
      const { planId } = req.body;
      const plan = PLANS[planId as PlanId];
      if (!plan || !plan.priceId) return res.status(400).json({ error: 'Invalid plan' });

      const tenant = await getTenant(req.authUser.tenant_id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      let customerId = tenant.stripe_customer_id;
      if (!customerId) {
        const user = await queryOne('SELECT email, full_name FROM users WHERE id = ?', [req.authUser.id]);
        const customer = await stripe.customers.create({ email: user?.email, name: user?.full_name, metadata: { tenant_id: tenant.id } });
        customerId = customer.id;
        await execute('UPDATE tenants SET stripe_customer_id = ? WHERE id = ?', [customerId, tenant.id]);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: plan.priceId, quantity: 1 }],
        success_url: `${process.env.APP_URL}/billing?success=1`,
        cancel_url:  `${process.env.APP_URL}/billing?cancelled=1`,
      });
      res.json({ url: session.url });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/billing/portal", async (req: AuthReq, res) => {
    try {
      const tenant = await getTenant(req.authUser.tenant_id);
      if (!tenant?.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer' });
      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripe_customer_id,
        return_url: `${process.env.APP_URL}/billing`,
      });
      res.json({ url: session.url });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── TENANT INFO ────────────────────────────────────────────────────────────

  app.get("/api/tenant", async (req: AuthReq, res) => {
    const tenant = await getTenant(req.authUser.tenant_id);
    res.json(tenant);
  });

  // ── INVITATIONS ────────────────────────────────────────────────────────────

  app.post("/api/invitations", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    try {
      const { email, role_id, project_id } = req.body;
      const tenantId = req.authUser.tenant_id;

      if (!(await checkPlanLimit(tenantId, 'members'))) {
        return res.status(403).json({ error: 'Member limit reached. Upgrade your plan.' });
      }

      const existing = await queryOne('SELECT id FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
      if (existing) return res.status(400).json({ error: 'User already in workspace' });

      const inviteToken = uid();
      const expiresAt   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await execute('INSERT INTO invitations (id, tenant_id, email, role_id, token, invited_by, project_id, expires_at) VALUES (?,?,?,?,?,?,?,?)',
        [uid(), tenantId, email, role_id || 'dev', inviteToken, req.authUser.id, project_id || null, expiresAt]);

      const inviter = await queryOne('SELECT full_name FROM users WHERE id = ?', [req.authUser.id]);
      const tenant  = await getTenant(tenantId);
      await sendInviteEmail(email, inviter?.full_name || 'A teammate', tenant?.name || 'your workspace', inviteToken);

      res.status(201).json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/invitations", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    const invitations = await query('SELECT * FROM invitations WHERE tenant_id = ? ORDER BY created_at DESC', [req.authUser.tenant_id]);
    res.json(invitations);
  });

  // ── AI CONFIGURATION ───────────────────────────────────────────────────────

  app.get("/api/ai-config", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    const config = await queryOne('SELECT * FROM ai_configurations WHERE tenant_id = ?', [req.authUser.tenant_id]);
    // Never return the actual API key
    if (config) { config.api_key_encrypted = config.api_key_encrypted ? '***configured***' : null; }
    res.json(config || { provider: 'gemini', model: 'gemini-2.0-flash', tone: 'professional', system_prompt: DEFAULT_SYSTEM_PROMPT, auto_actions: '[]' });
  });

  app.put("/api/ai-config", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    try {
      const { provider, model, api_key, system_prompt, temperature, tone, auto_actions } = req.body;
      const tenantId = req.authUser.tenant_id;
      const existing = await queryOne('SELECT id FROM ai_configurations WHERE tenant_id = ?', [tenantId]);

      // Only update api_key if a new one is provided (not the mask)
      const keyToStore = api_key && api_key !== '***configured***' ? api_key : null;

      if (existing) {
        const updates: any = { provider, model, temperature, tone, system_prompt, auto_actions: JSON.stringify(auto_actions || []) };
        if (keyToStore) updates.api_key_encrypted = keyToStore;
        const keys = Object.keys(updates);
        await execute(`UPDATE ai_configurations SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = ? WHERE tenant_id = ?`,
          [...Object.values(updates), now(), tenantId]);
      } else {
        await execute('INSERT INTO ai_configurations (id, tenant_id, provider, model, api_key_encrypted, system_prompt, temperature, tone, auto_actions) VALUES (?,?,?,?,?,?,?,?,?)',
          [uid(), tenantId, provider, model, keyToStore, system_prompt, temperature || 0.7, tone || 'professional', JSON.stringify(auto_actions || [])]);
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/ai-config/models", (req, res) => res.json(AVAILABLE_MODELS));

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req: AuthReq, res) => {
    try {
      const { messages, taskContext } = req.body;
      const tenantId = req.authUser.tenant_id;
      const configRow = await queryOne('SELECT * FROM ai_configurations WHERE tenant_id = ?', [tenantId]);

      const config = {
        provider: configRow?.provider || 'gemini',
        model: configRow?.model,
        apiKey: configRow?.api_key_encrypted,
        systemPrompt: configRow?.system_prompt,
        temperature: configRow?.temperature,
        tone: configRow?.tone,
      };

      const reply = await callAI(config, messages, taskContext);
      res.json({ reply });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── PROJECTS ───────────────────────────────────────────────────────────────

  app.get("/api/projects", async (req: AuthReq, res) => {
    const { id: userId, role_id, tenant_id } = req.authUser;
    if (role_id === 'superadmin') return res.json(await query('SELECT * FROM projects WHERE tenant_id = ? ORDER BY created_at DESC', [tenant_id]));
    res.json(await query('SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id = p.id WHERE pm.user_id = ? AND p.tenant_id = ? ORDER BY p.created_at DESC', [userId, tenant_id]));
  });

  app.post("/api/projects", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    try {
      const tenantId = req.authUser.tenant_id;
      if (!(await checkPlanLimit(tenantId, 'projects'))) {
        return res.status(403).json({ error: 'Project limit reached. Upgrade your plan.' });
      }
      const { id, name, description, admin_ids } = req.body;
      const projectId = id || uid();
      await execute('INSERT INTO projects (id, tenant_id, name, description, creator_id) VALUES (?,?,?,?,?)', [projectId, tenantId, name, description||null, req.authUser.id]);
      await execute('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role) VALUES (?,?,?,?)', [uid(), projectId, req.authUser.id, 'superadmin']);
      if (Array.isArray(admin_ids)) {
        for (const aId of admin_ids) await execute('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role) VALUES (?,?,?,?)', [uid(), projectId, aId, 'admin']);
      }
      res.status(201).json({ success: true, id: projectId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/projects/:id", requireRole('superadmin'), async (req: AuthReq, res) => {
    await execute('DELETE FROM project_members WHERE project_id = ?', [req.params.id]);
    await execute('DELETE FROM projects WHERE id = ? AND tenant_id = ?', [req.params.id, req.authUser.tenant_id]);
    res.json({ success: true });
  });

  // ── PROJECT MEMBERS ────────────────────────────────────────────────────────

  app.get("/api/projects/:id/members", async (req: AuthReq, res) => {
    res.json(await query('SELECT pm.*, u.username, u.full_name, u.email, u.role_id, r.name as role_name FROM project_members pm JOIN users u ON pm.user_id = u.id JOIN roles r ON u.role_id = r.id WHERE pm.project_id = ?', [req.params.id]));
  });

  app.post("/api/projects/:id/members", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    try {
      const { user_id, role } = req.body;
      await execute('INSERT OR REPLACE INTO project_members (id, project_id, user_id, role) VALUES (?,?,?,?)', [uid(), req.params.id, user_id, role||'member']);
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/projects/:projectId/members/:userId", requireRole('superadmin','admin'), async (req, res) => {
    await execute('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.projectId, req.params.userId]);
    res.json({ success: true });
  });

  // ── USERS ──────────────────────────────────────────────────────────────────

  app.get("/api/users", async (req: AuthReq, res) => {
    const { id: userId, role_id, tenant_id } = req.authUser;
    const { project_id } = req.query as any;

    if (role_id === 'superadmin') {
      if (project_id && project_id !== 'all') {
        return res.json(await query('SELECT u.id, u.username, u.full_name, u.role_id, u.email, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id JOIN project_members pm ON pm.user_id = u.id WHERE pm.project_id = ? AND u.tenant_id = ?', [project_id, tenant_id]));
      }
      return res.json(await query('SELECT u.id, u.username, u.full_name, u.role_id, u.email, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.tenant_id = ?', [tenant_id]));
    }

    const projectIds = await getVisibleProjectIds(userId, role_id, tenant_id) ?? [];
    if (projectIds.length === 0) return res.json([]);
    const ph = projectIds.map(() => '?').join(',');
    res.json(await query(`SELECT DISTINCT u.id, u.username, u.full_name, u.role_id, u.email, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id JOIN project_members pm ON pm.user_id = u.id WHERE pm.project_id IN (${ph}) AND u.tenant_id = ?`, [...projectIds, tenant_id]));
  });

  app.post("/api/users", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    try {
      const { id, username, password, role_id, full_name, email, project_id } = req.body;
      const tenantId = req.authUser.tenant_id;
      if (req.authUser.role_id === 'admin' && ['superadmin','admin'].includes(role_id)) return res.status(403).json({ error: 'Admins cannot create admin-level users' });
      if (!(await checkPlanLimit(tenantId, 'members'))) return res.status(403).json({ error: 'Member limit reached. Upgrade your plan.' });
      const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      const userId = id || uid();
      await execute('INSERT INTO users (id, tenant_id, username, password_hash, role_id, full_name, email) VALUES (?,?,?,?,?,?,?)', [userId, tenantId, username, hash, role_id, full_name||null, email||null]);
      if (project_id) await execute('INSERT OR IGNORE INTO project_members (id, project_id, user_id, role) VALUES (?,?,?,?)', [uid(), project_id, userId, 'member']);
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/users/:id", requireRole('superadmin'), async (req: AuthReq, res) => {
    await execute('DELETE FROM project_members WHERE user_id = ?', [req.params.id]);
    await execute('DELETE FROM refresh_tokens WHERE user_id = ?', [req.params.id]);
    await execute('DELETE FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, req.authUser.tenant_id]);
    res.json({ success: true });
  });

  app.post("/api/users/:id/change-password", async (req: AuthReq, res) => {
    try {
      const { id } = req.params;
      if (req.authUser.id !== id && req.authUser.role_id !== 'superadmin') return res.status(403).json({ error: 'Cannot change another user\'s password' });
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });
      const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (req.authUser.role_id !== 'superadmin' && !bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Current password incorrect' });
      await execute('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, BCRYPT_ROUNDS), id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── COLUMNS ────────────────────────────────────────────────────────────────

  app.get("/api/columns", async (req: AuthReq, res) => {
    res.json(await query(`SELECT * FROM columns WHERE tenant_id = ? ORDER BY "order" ASC`, [req.authUser.tenant_id]));
  });

  // ── TASKS ──────────────────────────────────────────────────────────────────

  app.get("/api/tasks", async (req: AuthReq, res) => {
    const { id: userId, role_id, tenant_id } = req.authUser;
    const projectIds = await getVisibleProjectIds(userId, role_id, tenant_id);
    if (!projectIds) return res.json(await query('SELECT * FROM tasks WHERE tenant_id = ?', [tenant_id]));
    if (projectIds.length === 0) return res.json([]);
    const ph = projectIds.map(() => '?').join(',');
    res.json(await query(`SELECT DISTINCT t.* FROM tasks t LEFT JOIN epics e ON t.epic_id = e.id WHERE t.tenant_id = ? AND (e.project_id IN (${ph}) OR t.assignee_id = ?)`, [tenant_id, ...projectIds, userId]));
  });

  app.post("/api/tasks", async (req: AuthReq, res) => {
    try {
      const { id, feature_id, sprint_id, title, statement, description, acceptance_criteria, story_points, status, priority, assignee_id, reporter_id, column_id, type, epic_id, parent_id, definition_of_done, blocker } = req.body;
      const taskId = id || uid();
      await execute('INSERT INTO tasks (id, tenant_id, feature_id, sprint_id, title, statement, description, acceptance_criteria, story_points, status, priority, assignee_id, reporter_id, column_id, type, epic_id, parent_id, definition_of_done, blocker, creator_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [taskId, req.authUser.tenant_id, feature_id||null, sprint_id||null, title, statement||null, description||null, acceptance_criteria||null, story_points||0, status, priority||'P3', assignee_id||null, reporter_id||null, column_id||null, type||'story', epic_id||null, parent_id||null, definition_of_done||null, blocker||null, req.authUser.id]);
      await logAudit(req.authUser.tenant_id, 'task', taskId, req.authUser.id, 'CREATE', req.body);
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/tasks/:id", async (req: AuthReq, res) => {
    try {
      const updates: any = { ...req.body };
      delete updates.user_id;
      if (updates.status === 'Done' || updates.column_id === `${req.authUser.tenant_id}-done`) updates.closed_at = now();
      updates.updated_at = now();
      const keys = Object.keys(updates);
      await execute(`UPDATE tasks SET ${keys.map(k => `"${k}" = ?`).join(', ')} WHERE id = ? AND tenant_id = ?`, [...Object.values(updates), req.params.id, req.authUser.tenant_id]);
      await logAudit(req.authUser.tenant_id, 'task', req.params.id, req.authUser.id, 'UPDATE', updates);

      // Auto-close feature/epic
      const task = await queryOne('SELECT epic_id, feature_id FROM tasks WHERE id = ?', [req.params.id]);
      if (task?.feature_id) {
        const total  = (await queryOne('SELECT COUNT(*) as c FROM tasks WHERE feature_id = ?', [task.feature_id]))?.c || 0;
        const closed = (await queryOne('SELECT COUNT(*) as c FROM tasks WHERE feature_id = ? AND closed_at IS NOT NULL', [task.feature_id]))?.c || 0;
        if (total > 0 && total === closed) {
          await execute("UPDATE features SET status = 'Verified', closed_at = ? WHERE id = ?", [now(), task.feature_id]);
          const feat = await queryOne('SELECT epic_id FROM features WHERE id = ?', [task.feature_id]);
          if (feat?.epic_id) {
            const tf = (await queryOne('SELECT COUNT(*) as c FROM features WHERE epic_id = ?', [feat.epic_id]))?.c || 0;
            const cf = (await queryOne("SELECT COUNT(*) as c FROM features WHERE epic_id = ? AND status = 'Verified'", [feat.epic_id]))?.c || 0;
            if (tf > 0 && tf === cf) await execute("UPDATE epics SET status = 'Completata', closed_at = ? WHERE id = ?", [now(), feat.epic_id]);
          }
        }
      }
      if (task?.epic_id) {
        const total = (await queryOne('SELECT COUNT(*) as c FROM tasks WHERE epic_id = ?', [task.epic_id]))?.c || 0;
        const done  = (await queryOne("SELECT COUNT(*) as c FROM tasks WHERE epic_id = ? AND status = 'Done'", [task.epic_id]))?.c || 0;
        await execute('UPDATE epics SET progress = ? WHERE id = ?', [total > 0 ? (done/total)*100 : 0, task.epic_id]);
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/tasks/:id", async (req: AuthReq, res) => {
    await execute('DELETE FROM tasks WHERE id = ? AND tenant_id = ?', [req.params.id, req.authUser.tenant_id]);
    res.json({ success: true });
  });

  // ── EPICS / FEATURES / SPRINTS (pattern riutilizzato) ─────────────────────

  const tenantFilter = (roleId: string, userId: string) => roleId === 'superadmin' ? '' : '';

  app.get("/api/epics", async (req: AuthReq, res) => {
    const { id: userId, role_id, tenant_id } = req.authUser;
    const projectIds = await getVisibleProjectIds(userId, role_id, tenant_id);
    if (!projectIds) return res.json(await query('SELECT * FROM epics WHERE tenant_id = ?', [tenant_id]));
    if (projectIds.length === 0) return res.json([]);
    const ph = projectIds.map(() => '?').join(',');
    res.json(await query(`SELECT * FROM epics WHERE tenant_id = ? AND (project_id IN (${ph}) OR project_id IS NULL)`, [tenant_id, ...projectIds]));
  });

  app.post("/api/epics", async (req: AuthReq, res) => {
    try {
      const { id, project_id, title, business_value, description, status, priority, owner_id, start_date, end_date } = req.body;
      const epicId = id || uid();
      await execute('INSERT INTO epics (id, tenant_id, project_id, title, business_value, description, status, priority, owner_id, creator_id, start_date, end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [epicId, req.authUser.tenant_id, project_id||null, title, business_value||null, description||null, status||'Backlog', priority||'P3', owner_id||null, req.authUser.id, start_date||null, end_date||null]);
      await logAudit(req.authUser.tenant_id, 'epic', epicId, req.authUser.id, 'CREATE', req.body);
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/epics/:id", async (req: AuthReq, res) => {
    await execute('DELETE FROM epics WHERE id = ? AND tenant_id = ?', [req.params.id, req.authUser.tenant_id]);
    res.json({ success: true });
  });

  app.get("/api/features", async (req: AuthReq, res) => {
    const { id: userId, role_id, tenant_id } = req.authUser;
    const projectIds = await getVisibleProjectIds(userId, role_id, tenant_id);
    if (!projectIds) return res.json(await query('SELECT * FROM features WHERE tenant_id = ?', [tenant_id]));
    if (projectIds.length === 0) return res.json([]);
    const ph = projectIds.map(() => '?').join(',');
    res.json(await query(`SELECT f.* FROM features f JOIN epics e ON f.epic_id = e.id WHERE f.tenant_id = ? AND e.project_id IN (${ph})`, [tenant_id, ...projectIds]));
  });

  app.post("/api/features", async (req: AuthReq, res) => {
    try {
      const { id, epic_id, title, benefit_hypothesis, acceptance_criteria, rough_estimate, status, tags, assignee_id } = req.body;
      const featId = id || uid();
      await execute('INSERT INTO features (id, tenant_id, epic_id, title, benefit_hypothesis, acceptance_criteria, rough_estimate, status, tags, assignee_id, creator_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [featId, req.authUser.tenant_id, epic_id, title, benefit_hypothesis||null, acceptance_criteria||null, rough_estimate||null, status||'Draft', tags||null, assignee_id||null, req.authUser.id]);
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/features/:id", async (req: AuthReq, res) => {
    await execute('DELETE FROM features WHERE id = ? AND tenant_id = ?', [req.params.id, req.authUser.tenant_id]);
    res.json({ success: true });
  });

  app.get("/api/sprints", async (req: AuthReq, res) => {
    const { id: userId, role_id, tenant_id } = req.authUser;
    const projectIds = await getVisibleProjectIds(userId, role_id, tenant_id);
    if (!projectIds) return res.json(await query('SELECT * FROM sprints WHERE tenant_id = ?', [tenant_id]));
    if (projectIds.length === 0) return res.json([]);
    const ph = projectIds.map(() => '?').join(',');
    res.json(await query(`SELECT * FROM sprints WHERE tenant_id = ? AND (project_id IN (${ph}) OR project_id IS NULL)`, [tenant_id, ...projectIds]));
  });

  app.post("/api/sprints", async (req: AuthReq, res) => {
    try {
      const { id, project_id, name, goal, start_date, end_date, status, target_capacity, assignee_id } = req.body;
      const sprintId = id || uid();
      await execute('INSERT INTO sprints (id, tenant_id, project_id, name, goal, start_date, end_date, status, target_capacity, assignee_id, creator_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [sprintId, req.authUser.tenant_id, project_id||null, name, goal||null, start_date||null, end_date||null, status||'Pianificato', target_capacity||0, assignee_id||null, req.authUser.id]);
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/sprints/:id", async (req: AuthReq, res) => {
    await execute('DELETE FROM sprints WHERE id = ? AND tenant_id = ?', [req.params.id, req.authUser.tenant_id]);
    res.json({ success: true });
  });

  // ── COMMENTS / ATTACHMENTS / CUSTOM FIELDS / AUDIT / TESTING ──────────────

  app.get("/api/tasks/:id/comments", async (req, res) => res.json(await query('SELECT c.*, u.full_name as user_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at ASC', [req.params.id])));
  app.post("/api/comments", async (req: AuthReq, res) => {
    const { id, task_id, content } = req.body;
    await execute('INSERT INTO comments (id, tenant_id, task_id, user_id, content) VALUES (?,?,?,?,?)', [id||uid(), req.authUser.tenant_id, task_id, req.authUser.id, content]);
    res.status(201).json({ success: true });
  });
  app.get("/api/tasks/:id/attachments", async (req, res) => res.json(await query('SELECT * FROM attachments WHERE task_id = ?', [req.params.id])));
  app.post("/api/attachments", async (req: AuthReq, res) => {
    const { id, task_id, name, url, type } = req.body;
    await execute('INSERT INTO attachments (id, tenant_id, task_id, name, url, type) VALUES (?,?,?,?,?,?)', [id||uid(), req.authUser.tenant_id, task_id, name, url, type]);
    res.status(201).json({ success: true });
  });

  app.get("/api/custom-fields/definitions", async (req: AuthReq, res) => res.json(await query('SELECT * FROM custom_field_definitions WHERE tenant_id = ?', [req.authUser.tenant_id])));
  app.post("/api/custom-fields/definitions", requireRole('superadmin','admin'), async (req: AuthReq, res) => {
    const { id, entity_type, name, type } = req.body;
    await execute('INSERT INTO custom_field_definitions (id, tenant_id, entity_type, name, type) VALUES (?,?,?,?,?)', [id||uid(), req.authUser.tenant_id, entity_type, name, type]);
    res.status(201).json({ success: true });
  });
  app.delete("/api/custom-fields/definitions/:id", requireRole('superadmin','admin'), async (req, res) => {
    await execute('DELETE FROM custom_field_values WHERE field_definition_id = ?', [req.params.id]);
    await execute('DELETE FROM custom_field_definitions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });
  app.get("/api/custom-fields/values/:entityId", async (req, res) => res.json(await query('SELECT v.*, d.name, d.type, d.entity_type FROM custom_field_values v JOIN custom_field_definitions d ON v.field_definition_id = d.id WHERE v.entity_id = ?', [req.params.entityId])));
  app.post("/api/custom-fields/values", async (req, res) => {
    const { entity_id, field_definition_id, value } = req.body;
    const existing = await queryOne('SELECT id FROM custom_field_values WHERE entity_id = ? AND field_definition_id = ?', [entity_id, field_definition_id]);
    if (existing) await execute('UPDATE custom_field_values SET value = ? WHERE id = ?', [value, existing.id]);
    else await execute('INSERT INTO custom_field_values (id, entity_id, field_definition_id, value) VALUES (?,?,?,?)', [uid(), entity_id, field_definition_id, value]);
    res.json({ success: true });
  });

  app.get("/api/audit-logs/:entityType/:entityId", async (req: AuthReq, res) =>
    res.json(await query('SELECT a.*, u.full_name as user_name FROM audit_logs a JOIN users u ON a.user_id = u.id WHERE a.entity_type = ? AND a.entity_id = ? AND a.tenant_id = ? ORDER BY a.created_at DESC', [req.params.entityType, req.params.entityId, req.authUser.tenant_id]))
  );

  app.get("/api/test-suites", async (req: AuthReq, res) => res.json(await query('SELECT * FROM test_suites WHERE tenant_id = ?', [req.authUser.tenant_id])));
  app.post("/api/test-suites", async (req: AuthReq, res) => {
    const { id, name, description } = req.body;
    await execute('INSERT INTO test_suites (id, tenant_id, name, description) VALUES (?,?,?,?)', [id||uid(), req.authUser.tenant_id, name, description]);
    res.status(201).json({ success: true });
  });
  app.get("/api/test-cases/:suiteId", async (req, res) => res.json(await query('SELECT * FROM test_cases WHERE suite_id = ?', [req.params.suiteId])));
  app.post("/api/test-cases", async (req, res) => {
    const { id, suite_id, title, steps, expected_result } = req.body;
    await execute('INSERT INTO test_cases (id, suite_id, title, steps, expected_result) VALUES (?,?,?,?,?)', [id||uid(), suite_id, title, steps, expected_result]);
    res.status(201).json({ success: true });
  });
  app.patch("/api/test-cases/:id", async (req, res) => {
    await execute('UPDATE test_cases SET status = ?, last_run = ? WHERE id = ?', [req.body.status, now(), req.params.id]);
    res.json({ success: true });
  });

  // ── VITE / STATIC ──────────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 AgileFlow AI running on http://localhost:${PORT}`);
    console.log(`📦 Database: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
  });
}

startServer().catch(console.error);
