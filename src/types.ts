export type Priority = 'P1' | 'P2' | 'P3';
export type TaskType = 'task' | 'story' | 'bug' | 'issue';
export type RoughEstimate = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role_id: string;
  role_name?: string;
  email?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  admin_ids?: string[]; // New field for assigned admin users
  created_at?: string;
}

export interface Task {
  id: string;
  feature_id: string;
  sprint_id?: string;
  title: string;
  statement?: string; // "Come [ruolo], voglio [azione], affinché [valore]"
  description: string; // Technical Description
  acceptance_criteria?: string; // Micro
  status: string;
  priority: Priority;
  story_points: number; // Fibonacci
  assignee_id?: string;
  reporter_id?: string;
  column_id: string;
  type: TaskType;
  epic_id?: string;
  parent_id?: string;
  creator_id?: string;
  definition_of_done?: string;
  blocker?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  user_id?: string; // For audit logging in requests
}

export interface Epic {
  id: string;
  project_id?: string;
  title: string;
  business_value?: string;
  description: string; // Rich Text
  status: 'Backlog' | 'In Approvazione' | 'In Corso' | 'Completata' | 'Archiviata';
  priority: Priority;
  owner_id?: string;
  creator_id?: string;
  start_date?: string;
  end_date?: string;
  progress?: number;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
}

export interface Feature {
  id: string;
  epic_id: string;
  title: string;
  benefit_hypothesis?: string;
  acceptance_criteria?: string; // Macro
  rough_estimate?: RoughEstimate;
  status: 'Draft' | 'Ready for Dev' | 'In Progress' | 'Verified';
  tags?: string;
  assignee_id?: string;
  creator_id?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
}

export interface Sprint {
  id: string;
  project_id?: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'Pianificato' | 'Attivo' | 'Chiuso';
  target_capacity?: number;
  actual_velocity?: number;
  assignee_id?: string;
  creator_id?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
}

export interface AuditLog {
  id: string;
  entity_type: 'epic' | 'feature' | 'sprint' | 'task';
  entity_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  changes: string; // JSON string
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  name: string;
  url: string;
  type: string;
  created_at: string;
}

export interface CustomFieldDefinition {
  id: string;
  entity_type: 'epic' | 'feature' | 'sprint' | 'task' | 'bug' | 'issue';
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  entity_id: string;
  field_definition_id: string;
  value: string;
  name?: string;
  type?: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

export interface TestCase {
  id: string;
  suite_id: string;
  title: string;
  preconditions?: string;
  steps: string;
  expected_result: string;
  actual_result?: string;
  test_data?: string;
  severity?: 'blocking' | 'high' | 'medium' | 'low';
  status: 'pending' | 'passed' | 'failed';
  last_run?: string;
  automation_script?: string;
  linked_task_id?: string;
}
