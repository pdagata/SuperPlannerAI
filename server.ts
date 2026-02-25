import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("agileflow.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_id TEXT,
    full_name TEXT,
    email TEXT,
    FOREIGN KEY(role_id) REFERENCES roles(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS epics (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT NOT NULL,
    business_value TEXT,
    description TEXT,
    status TEXT DEFAULT 'Backlog',
    priority TEXT DEFAULT 'P3',
    owner_id TEXT,
    creator_id TEXT,
    start_date DATETIME,
    end_date DATETIME,
    progress REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    epic_id TEXT NOT NULL,
    title TEXT NOT NULL,
    benefit_hypothesis TEXT,
    acceptance_criteria TEXT,
    rough_estimate TEXT,
    status TEXT DEFAULT 'Draft',
    tags TEXT,
    assignee_id TEXT,
    creator_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY(epic_id) REFERENCES epics(id),
    FOREIGN KEY(assignee_id) REFERENCES users(id),
    FOREIGN KEY(creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT,
    start_date DATETIME,
    end_date DATETIME,
    status TEXT DEFAULT 'Pianificato',
    target_capacity INTEGER DEFAULT 0,
    actual_velocity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    assignee_id TEXT,
    creator_id TEXT,
    FOREIGN KEY(assignee_id) REFERENCES users(id),
    FOREIGN KEY(creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    feature_id TEXT,
    sprint_id TEXT,
    title TEXT NOT NULL,
    statement TEXT,
    description TEXT,
    acceptance_criteria TEXT,
    story_points INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    priority TEXT DEFAULT 'P3',
    assignee_id TEXT,
    reporter_id TEXT,
    creator_id TEXT,
    column_id TEXT,
    type TEXT DEFAULT 'story', -- 'story', 'bug', 'issue'
    epic_id TEXT,
    parent_id TEXT,
    definition_of_done TEXT,
    blocker TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY(column_id) REFERENCES columns(id),
    FOREIGN KEY(assignee_id) REFERENCES users(id),
    FOREIGN KEY(reporter_id) REFERENCES users(id),
    FOREIGN KEY(creator_id) REFERENCES users(id),
    FOREIGN KEY(epic_id) REFERENCES epics(id),
    FOREIGN KEY(feature_id) REFERENCES features(id),
    FOREIGN KEY(sprint_id) REFERENCES sprints(id),
    FOREIGN KEY(parent_id) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    changes TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'epic', 'feature', 'sprint', 'task', 'bug', 'issue'
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'string', 'number', 'date', 'boolean'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS custom_field_values (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    field_definition_id TEXT NOT NULL,
    value TEXT,
    FOREIGN KEY(field_definition_id) REFERENCES custom_field_definitions(id)
  );

  CREATE TABLE IF NOT EXISTS test_suites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    suite_id TEXT,
    title TEXT NOT NULL,
    steps TEXT,
    expected_result TEXT,
    status TEXT DEFAULT 'pending',
    last_run DATETIME,
    FOREIGN KEY(suite_id) REFERENCES test_suites(id)
  );
`);

// Migration: Add missing columns to existing tables
const tables = {
  users: [
    { name: 'email', type: 'TEXT' }
  ],
  epics: [
    { name: 'project_id', type: 'TEXT' },
    { name: 'business_value', type: 'TEXT' },
    { name: 'priority', type: 'TEXT DEFAULT "P3"' },
    { name: 'owner_id', type: 'TEXT' },
    { name: 'creator_id', type: 'TEXT' },
    { name: 'start_date', type: 'DATETIME' },
    { name: 'end_date', type: 'DATETIME' },
    { name: 'progress', type: 'REAL DEFAULT 0' },
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'closed_at', type: 'DATETIME' }
  ],
  features: [
    { name: 'benefit_hypothesis', type: 'TEXT' },
    { name: 'acceptance_criteria', type: 'TEXT' },
    { name: 'rough_estimate', type: 'TEXT' },
    { name: 'tags', type: 'TEXT' },
    { name: 'assignee_id', type: 'TEXT' },
    { name: 'creator_id', type: 'TEXT' },
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'closed_at', type: 'DATETIME' }
  ],
  sprints: [
    { name: 'goal', type: 'TEXT' },
    { name: 'start_date', type: 'DATETIME' },
    { name: 'end_date', type: 'DATETIME' },
    { name: 'target_capacity', type: 'INTEGER DEFAULT 0' },
    { name: 'actual_velocity', type: 'INTEGER DEFAULT 0' },
    { name: 'assignee_id', type: 'TEXT' },
    { name: 'creator_id', type: 'TEXT' },
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'closed_at', type: 'DATETIME' }
  ],
  tasks: [
    { name: 'statement', type: 'TEXT' },
    { name: 'acceptance_criteria', type: 'TEXT' },
    { name: 'story_points', type: 'INTEGER DEFAULT 0' },
    { name: 'priority', type: 'TEXT DEFAULT "P3"' },
    { name: 'assignee_id', type: 'TEXT' },
    { name: 'reporter_id', type: 'TEXT' },
    { name: 'creator_id', type: 'TEXT' },
    { name: 'type', type: 'TEXT DEFAULT "story"' },
    { name: 'epic_id', type: 'TEXT' },
    { name: 'sprint_id', type: 'TEXT' },
    { name: 'parent_id', type: 'TEXT' },
    { name: 'definition_of_done', type: 'TEXT' },
    { name: 'blocker', type: 'TEXT' },
    { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'closed_at', type: 'DATETIME' }
  ]
};

for (const [table, columns] of Object.entries(tables)) {
  try {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const existingColumns = info.map(c => c.name);
    
    for (const col of columns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Migrating: Adding ${col.name} to ${table}`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`).run();
      }
    }
  } catch (e) {
    console.error(`Migration failed for table ${table}:`, e);
  }
}

// Seed initial roles and admin user
const roleCount = db.prepare("SELECT COUNT(*) as count FROM roles").get() as { count: number };
if (roleCount.count === 0) {
  const insertRole = db.prepare("INSERT INTO roles (id, name) VALUES (?, ?)");
  insertRole.run("superadmin", "Super Administrator");
  insertRole.run("admin", "Administrator");
  insertRole.run("dev", "Developer");
  insertRole.run("qa", "QA Engineer");

  const insertUser = db.prepare("INSERT INTO users (id, username, password, role_id, full_name, email) VALUES (?, ?, ?, ?, ?, ?)");
  insertUser.run("u1", "admin", "admin123", "superadmin", "System Admin", "admin@agileflow.ai");
  insertUser.run("u2", "dev1", "dev123", "dev", "John Developer", "john@agileflow.ai");
  insertUser.run("u3", "qa1", "qa123", "qa", "Sarah Tester", "sarah@agileflow.ai");
}

// Seed initial columns if empty
const columnCount = db.prepare("SELECT COUNT(*) as count FROM columns").get() as { count: number };
if (columnCount.count === 0) {
  const insert = db.prepare("INSERT INTO columns (id, title, \"order\") VALUES (?, ?, ?)");
  insert.run("todo", "To Do", 0);
  insert.run("in-progress", "In Progress", 1);
  insert.run("review", "Review", 2);
  insert.run("done", "Done", 3);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE username = ?").get(username) as any;
    
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token: "mock-jwt-token" });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Projects API
  app.get("/api/projects", (req, res) => {
    res.json(db.prepare("SELECT * FROM projects").all());
  });

  app.post("/api/projects", (req, res) => {
    const { id, name, description, creator_id } = req.body;
    db.prepare("INSERT INTO projects (id, name, description, creator_id) VALUES (?, ?, ?, ?)")
      .run(id, name, description, creator_id);
    res.status(201).json({ success: true });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // API Routes
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, full_name, role_id, email FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { id, username, password, role_id, full_name, email } = req.body;
    db.prepare("INSERT INTO users (id, username, password, role_id, full_name, email) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, username, password, role_id, full_name, email);
    res.status(201).json({ success: true });
  });

  app.get("/api/columns", (req, res) => {
    const columns = db.prepare("SELECT * FROM columns ORDER BY \"order\" ASC").all();
    res.json(columns);
  });

  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
  });

  const logAudit = (entity_type: string, entity_id: string, user_id: string, action: string, changes: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    db.prepare("INSERT INTO audit_logs (id, entity_type, entity_id, user_id, action, changes) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, entity_type, entity_id, user_id, action, JSON.stringify(changes));
  };

  app.post("/api/tasks", (req, res) => {
    const { id, feature_id, sprint_id, title, statement, description, acceptance_criteria, story_points, status, priority, assignee_id, reporter_id, column_id, type, epic_id, parent_id, definition_of_done, blocker, creator_id, user_id } = req.body;
    const insert = db.prepare(`
      INSERT INTO tasks (id, feature_id, sprint_id, title, statement, description, acceptance_criteria, story_points, status, priority, assignee_id, reporter_id, column_id, type, epic_id, parent_id, definition_of_done, blocker, creator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      id, 
      feature_id || null, 
      sprint_id || null, 
      title, 
      statement || null, 
      description || null, 
      acceptance_criteria || null, 
      story_points || 0, 
      status, 
      priority || 'P3', 
      assignee_id || null, 
      reporter_id || null, 
      column_id || null, 
      type || 'story', 
      epic_id || null, 
      parent_id || null, 
      definition_of_done || null, 
      blocker || null, 
      creator_id || null
    );
    
    if (user_id) {
      logAudit('task', id, user_id, 'CREATE', req.body);
    }
    
    res.status(201).json({ success: true });
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const { user_id, ...updates } = req.body;
    
    // Auto-set closed_at if status is 'Done'
    if (updates.status === 'Done' || updates.column_id === 'done') {
      updates.closed_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const keys = Object.keys(updates);
    const setClause = keys.map(k => `"${k}" = ?`).join(", ");
    const values = Object.values(updates);
    
    const update = db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`);
    update.run(...values, id);

    if (user_id) {
      logAudit('task', id, user_id, 'UPDATE', updates);
    }

    // Automation: Check if all features in an epic are closed
    const task = db.prepare("SELECT epic_id, feature_id FROM tasks WHERE id = ?").get(id) as any;
    if (task && task.feature_id) {
      const feature = db.prepare("SELECT epic_id FROM features WHERE id = ?").get(task.feature_id) as any;
      if (feature) {
        const totalTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE feature_id = ?").get(task.feature_id) as any;
        const closedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE feature_id = ? AND closed_at IS NOT NULL").get(task.feature_id) as any;
        
        if (totalTasks.count > 0 && totalTasks.count === closedTasks.count) {
          db.prepare("UPDATE features SET status = 'Verified', closed_at = ? WHERE id = ?").run(new Date().toISOString(), task.feature_id);
          
          // Check Epic
          if (feature.epic_id) {
            const totalFeatures = db.prepare("SELECT COUNT(*) as count FROM features WHERE epic_id = ?").get(feature.epic_id) as any;
            const closedFeatures = db.prepare("SELECT COUNT(*) as count FROM features WHERE epic_id = ? AND status = 'Verified'").get(feature.epic_id) as any;
            if (totalFeatures.count > 0 && totalFeatures.count === closedFeatures.count) {
              db.prepare("UPDATE epics SET status = 'Completata', closed_at = ? WHERE id = ?").run(new Date().toISOString(), feature.epic_id);
            }
          }
        }
      }
    }

    // Recalculate Epic Progress
    if (task && task.epic_id) {
      const totalStories = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE epic_id = ?").get(task.epic_id) as any;
      const doneStories = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE epic_id = ? AND status = 'Done'").get(task.epic_id) as any;
      const progress = totalStories.count > 0 ? (doneStories.count / totalStories.count) * 100 : 0;
      db.prepare("UPDATE epics SET progress = ? WHERE id = ?").run(progress, task.epic_id);
    }

    res.json({ success: true });
  });

  app.get("/api/tasks/:id/comments", (req, res) => {
    const { id } = req.params;
    const comments = db.prepare(`
      SELECT c.*, u.full_name as user_name 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.task_id = ? 
      ORDER BY c.created_at ASC
    `).all(id);
    res.json(comments);
  });

  app.post("/api/comments", (req, res) => {
    const { id, task_id, user_id, content } = req.body;
    db.prepare("INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)").run(id, task_id, user_id, content);
    res.status(201).json({ success: true });
  });

  app.get("/api/tasks/:id/attachments", (req, res) => {
    const { id } = req.params;
    const attachments = db.prepare("SELECT * FROM attachments WHERE task_id = ?").all(id);
    res.json(attachments);
  });

  app.post("/api/attachments", (req, res) => {
    const { id, task_id, name, url, type } = req.body;
    db.prepare("INSERT INTO attachments (id, task_id, name, url, type) VALUES (?, ?, ?, ?, ?)").run(id, task_id, name, url, type);
    res.status(201).json({ success: true });
  });

  // Custom Fields API
  app.get("/api/custom-fields/definitions", (req, res) => {
    res.json(db.prepare("SELECT * FROM custom_field_definitions").all());
  });

  app.post("/api/custom-fields/definitions", (req, res) => {
    const { id, entity_type, name, type } = req.body;
    db.prepare("INSERT INTO custom_field_definitions (id, entity_type, name, type) VALUES (?, ?, ?, ?)").run(id, entity_type, name, type);
    res.status(201).json({ success: true });
  });

  app.delete("/api/custom-fields/definitions/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM custom_field_values WHERE field_definition_id = ?").run(id);
    db.prepare("DELETE FROM custom_field_definitions WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/custom-fields/values/:entityId", (req, res) => {
    const { entityId } = req.params;
    const values = db.prepare(`
      SELECT v.*, d.name, d.type, d.entity_type
      FROM custom_field_values v
      JOIN custom_field_definitions d ON v.field_definition_id = d.id
      WHERE v.entity_id = ?
    `).all(entityId);
    res.json(values);
  });

  app.post("/api/custom-fields/values", (req, res) => {
    const { entity_id, field_definition_id, value } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    
    // Upsert logic
    const existing = db.prepare("SELECT id FROM custom_field_values WHERE entity_id = ? AND field_definition_id = ?").get(entity_id, field_definition_id) as any;
    if (existing) {
      db.prepare("UPDATE custom_field_values SET value = ? WHERE id = ?").run(value, existing.id);
    } else {
      db.prepare("INSERT INTO custom_field_values (id, entity_id, field_definition_id, value) VALUES (?, ?, ?, ?)").run(id, entity_id, field_definition_id, value);
    }
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Epics, Features, Sprints Routes
  app.get("/api/epics", (req, res) => {
    res.json(db.prepare("SELECT * FROM epics").all());
  });
  app.post("/api/epics", (req, res) => {
    const { id, project_id, title, business_value, description, status, priority, owner_id, creator_id, start_date, end_date, user_id } = req.body;
    db.prepare("INSERT INTO epics (id, project_id, title, business_value, description, status, priority, owner_id, creator_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        id, 
        project_id || null, 
        title, 
        business_value || null, 
        description || null, 
        status || 'Backlog', 
        priority || 'P3', 
        owner_id || null, 
        creator_id || null, 
        start_date || null, 
        end_date || null
      );
    
    if (user_id) {
      logAudit('epic', id, user_id, 'CREATE', req.body);
    }
    res.status(201).json({ success: true });
  });

  app.delete("/api/epics/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM epics WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/features", (req, res) => {
    res.json(db.prepare("SELECT * FROM features").all());
  });
  app.post("/api/features", (req, res) => {
    const { id, epic_id, title, benefit_hypothesis, acceptance_criteria, rough_estimate, status, tags, assignee_id, creator_id, user_id } = req.body;
    db.prepare("INSERT INTO features (id, epic_id, title, benefit_hypothesis, acceptance_criteria, rough_estimate, status, tags, assignee_id, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        id, 
        epic_id, 
        title, 
        benefit_hypothesis || null, 
        acceptance_criteria || null, 
        rough_estimate || null, 
        status || 'Draft', 
        tags || null, 
        assignee_id || null, 
        creator_id || null
      );
    
    if (user_id) {
      logAudit('feature', id, user_id, 'CREATE', req.body);
    }
    res.status(201).json({ success: true });
  });

  app.delete("/api/features/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM features WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/sprints", (req, res) => {
    res.json(db.prepare("SELECT * FROM sprints").all());
  });
  app.post("/api/sprints", (req, res) => {
    const { id, name, goal, start_date, end_date, status, target_capacity, assignee_id, creator_id, user_id } = req.body;
    db.prepare("INSERT INTO sprints (id, name, goal, start_date, end_date, status, target_capacity, assignee_id, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        id, 
        name, 
        goal || null, 
        start_date || null, 
        end_date || null, 
        status || 'Pianificato', 
        target_capacity || 0, 
        assignee_id || null, 
        creator_id || null
      );
    
    if (user_id) {
      logAudit('sprint', id, user_id, 'CREATE', req.body);
    }
    res.status(201).json({ success: true });
  });

  app.delete("/api/sprints/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM sprints WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/audit-logs/:entityType/:entityId", (req, res) => {
    const { entityType, entityId } = req.params;
    const logs = db.prepare(`
      SELECT a.*, u.full_name as user_name 
      FROM audit_logs a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.entity_type = ? AND a.entity_id = ? 
      ORDER BY a.created_at DESC
    `).all(entityType, entityId);
    res.json(logs);
  });

  // Testing Routes
  app.get("/api/test-suites", (req, res) => {
    const suites = db.prepare("SELECT * FROM test_suites").all();
    res.json(suites);
  });

  app.post("/api/test-suites", (req, res) => {
    const { id, name, description } = req.body;
    db.prepare("INSERT INTO test_suites (id, name, description) VALUES (?, ?, ?)").run(id, name, description);
    res.status(201).json({ success: true });
  });

  app.get("/api/test-cases/:suiteId", (req, res) => {
    const { suiteId } = req.params;
    const cases = db.prepare("SELECT * FROM test_cases WHERE suite_id = ?").all();
    res.json(cases);
  });

  app.post("/api/test-cases", (req, res) => {
    const { id, suite_id, title, steps, expected_result } = req.body;
    db.prepare("INSERT INTO test_cases (id, suite_id, title, steps, expected_result) VALUES (?, ?, ?, ?, ?)").run(id, suite_id, title, steps, expected_result);
    res.status(201).json({ success: true });
  });

  app.patch("/api/test-cases/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE test_cases SET status = ?, last_run = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
