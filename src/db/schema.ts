/**
 * Database schema — CREATE TABLE statements for both SQLite and PostgreSQL/Supabase.
 * Called once at server startup via createSchema().
 */
import { execRaw, isPostgres } from './index.js';

const POSTGRES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS roles (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    slug                   TEXT UNIQUE NOT NULL,
    plan                   TEXT DEFAULT 'free',
    max_projects           INTEGER DEFAULT 1,
    max_members            INTEGER DEFAULT 5,
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    trial_ends_at          TIMESTAMPTZ,
    created_at             TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    username            TEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    role_id             TEXT REFERENCES roles(id),
    full_name           TEXT,
    email               TEXT,
    email_verified      BOOLEAN DEFAULT FALSE,
    email_verify_token  TEXT,
    reset_token         TEXT,
    reset_token_expires TIMESTAMPTZ,
    invited_by          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role_id     TEXT,
    token       TEXT NOT NULL,
    invited_by  TEXT,
    project_id  TEXT,
    accepted_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    creator_id  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS project_members (
    id         TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS columns (
    id         TEXT PRIMARY KEY,
    tenant_id  TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    "order"    INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS epics (
    id             TEXT PRIMARY KEY,
    tenant_id      TEXT,
    project_id     TEXT,
    title          TEXT NOT NULL,
    business_value TEXT,
    description    TEXT,
    status         TEXT DEFAULT 'Backlog',
    priority       TEXT DEFAULT 'P3',
    owner_id       TEXT,
    creator_id     TEXT,
    start_date     TEXT,
    end_date       TEXT,
    progress       REAL DEFAULT 0,
    closed_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS features (
    id                   TEXT PRIMARY KEY,
    tenant_id            TEXT,
    epic_id              TEXT,
    title                TEXT NOT NULL,
    benefit_hypothesis   TEXT,
    acceptance_criteria  TEXT,
    rough_estimate       TEXT,
    status               TEXT DEFAULT 'Draft',
    tags                 TEXT,
    assignee_id          TEXT,
    creator_id           TEXT,
    closed_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS sprints (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT,
    project_id      TEXT,
    name            TEXT NOT NULL,
    goal            TEXT,
    start_date      TEXT,
    end_date        TEXT,
    status          TEXT DEFAULT 'Pianificato',
    target_capacity INTEGER DEFAULT 0,
    actual_velocity REAL,
    assignee_id     TEXT,
    creator_id      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT,
    feature_id          TEXT,
    sprint_id           TEXT,
    title               TEXT NOT NULL,
    statement           TEXT,
    description         TEXT,
    acceptance_criteria TEXT,
    story_points        INTEGER DEFAULT 0,
    status              TEXT DEFAULT 'To Do',
    priority            TEXT DEFAULT 'P3',
    assignee_id         TEXT,
    reporter_id         TEXT,
    column_id           TEXT,
    type                TEXT DEFAULT 'story',
    epic_id             TEXT,
    parent_id           TEXT,
    definition_of_done  TEXT,
    blocker             TEXT,
    creator_id          TEXT,
    closed_at           TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    tenant_id  TEXT,
    task_id    TEXT,
    user_id    TEXT,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id         TEXT PRIMARY KEY,
    tenant_id  TEXT,
    task_id    TEXT,
    name       TEXT NOT NULL,
    url        TEXT NOT NULL,
    type       TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    entity_type TEXT NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS custom_field_values (
    id                   TEXT PRIMARY KEY,
    entity_id            TEXT NOT NULL,
    field_definition_id  TEXT,
    value                TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    entity_type TEXT,
    entity_id   TEXT,
    user_id     TEXT,
    action      TEXT,
    changes     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS ai_configurations (
    id                TEXT PRIMARY KEY,
    tenant_id         TEXT UNIQUE,
    provider          TEXT DEFAULT 'gemini',
    model             TEXT,
    api_key_encrypted TEXT,
    system_prompt     TEXT,
    temperature       REAL DEFAULT 0.7,
    tone              TEXT DEFAULT 'professional',
    auto_actions      TEXT DEFAULT '[]',
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at        TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS test_suites (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id              TEXT PRIMARY KEY,
    suite_id        TEXT,
    title           TEXT NOT NULL,
    steps           TEXT,
    expected_result TEXT,
    status          TEXT DEFAULT 'pending',
    last_run        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );

  INSERT INTO roles (id, name) VALUES
    ('superadmin', 'Super Administrator'),
    ('admin',      'Administrator'),
    ('dev',        'Developer'),
    ('qa',         'QA Engineer')
  ON CONFLICT (id) DO NOTHING;
`;

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS roles (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    slug                   TEXT UNIQUE NOT NULL,
    plan                   TEXT DEFAULT 'free',
    max_projects           INTEGER DEFAULT 1,
    max_members            INTEGER DEFAULT 5,
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    trial_ends_at          TEXT,
    created_at             TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    username            TEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    role_id             TEXT REFERENCES roles(id),
    full_name           TEXT,
    email               TEXT,
    email_verified      INTEGER DEFAULT 0,
    email_verify_token  TEXT,
    reset_token         TEXT,
    reset_token_expires TEXT,
    invited_by          TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role_id     TEXT,
    token       TEXT NOT NULL,
    invited_by  TEXT,
    project_id  TEXT,
    accepted_at TEXT,
    expires_at  TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    creator_id  TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS project_members (
    id         TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(project_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS columns (
    id         TEXT PRIMARY KEY,
    tenant_id  TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    "order"    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS epics (
    id             TEXT PRIMARY KEY,
    tenant_id      TEXT,
    project_id     TEXT,
    title          TEXT NOT NULL,
    business_value TEXT,
    description    TEXT,
    status         TEXT DEFAULT 'Backlog',
    priority       TEXT DEFAULT 'P3',
    owner_id       TEXT,
    creator_id     TEXT,
    start_date     TEXT,
    end_date       TEXT,
    progress       REAL DEFAULT 0,
    closed_at      TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS features (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT,
    epic_id             TEXT,
    title               TEXT NOT NULL,
    benefit_hypothesis  TEXT,
    acceptance_criteria TEXT,
    rough_estimate      TEXT,
    status              TEXT DEFAULT 'Draft',
    tags                TEXT,
    assignee_id         TEXT,
    creator_id          TEXT,
    closed_at           TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sprints (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT,
    project_id      TEXT,
    name            TEXT NOT NULL,
    goal            TEXT,
    start_date      TEXT,
    end_date        TEXT,
    status          TEXT DEFAULT 'Pianificato',
    target_capacity INTEGER DEFAULT 0,
    actual_velocity REAL,
    assignee_id     TEXT,
    creator_id      TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT,
    feature_id          TEXT,
    sprint_id           TEXT,
    title               TEXT NOT NULL,
    statement           TEXT,
    description         TEXT,
    acceptance_criteria TEXT,
    story_points        INTEGER DEFAULT 0,
    status              TEXT DEFAULT 'To Do',
    priority            TEXT DEFAULT 'P3',
    assignee_id         TEXT,
    reporter_id         TEXT,
    column_id           TEXT,
    type                TEXT DEFAULT 'story',
    epic_id             TEXT,
    parent_id           TEXT,
    definition_of_done  TEXT,
    blocker             TEXT,
    creator_id          TEXT,
    closed_at           TEXT,
    updated_at          TEXT DEFAULT (datetime('now')),
    created_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    tenant_id  TEXT,
    task_id    TEXT,
    user_id    TEXT,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id         TEXT PRIMARY KEY,
    tenant_id  TEXT,
    task_id    TEXT,
    name       TEXT NOT NULL,
    url        TEXT NOT NULL,
    type       TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    entity_type TEXT NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_field_values (
    id                  TEXT PRIMARY KEY,
    entity_id           TEXT NOT NULL,
    field_definition_id TEXT,
    value               TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    entity_type TEXT,
    entity_id   TEXT,
    user_id     TEXT,
    action      TEXT,
    changes     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_configurations (
    id                TEXT PRIMARY KEY,
    tenant_id         TEXT UNIQUE,
    provider          TEXT DEFAULT 'gemini',
    model             TEXT,
    api_key_encrypted TEXT,
    system_prompt     TEXT,
    temperature       REAL DEFAULT 0.7,
    tone              TEXT DEFAULT 'professional',
    auto_actions      TEXT DEFAULT '[]',
    updated_at        TEXT DEFAULT (datetime('now')),
    created_at        TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_suites (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id              TEXT PRIMARY KEY,
    suite_id        TEXT,
    title           TEXT NOT NULL,
    steps           TEXT,
    expected_result TEXT,
    status          TEXT DEFAULT 'pending',
    last_run        TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO roles (id, name) VALUES
    ('superadmin', 'Super Administrator'),
    ('admin',      'Administrator'),
    ('dev',        'Developer'),
    ('qa',         'QA Engineer');
`;

export async function createSchema(): Promise<void> {
  console.log(`📋 Running schema migrations (${isPostgres ? 'PostgreSQL/Supabase' : 'SQLite'})…`);
  await execRaw(isPostgres ? POSTGRES_SCHEMA : SQLITE_SCHEMA);
  console.log('✅ Schema ready.');
}
