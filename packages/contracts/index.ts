export type Role = string;
export type Permission = "read" | "write" | "review" | "manage";
export type ActionStatus =
  "PENDING" | "IN_PROGRESS" | "PENDING_VERIFICATION" | "CLOSED";
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: unknown;
  requestId: string;
}
export interface Site {
  id: string;
  name: string;
  role: Role;
  role_name: string;
  permissions: Permission[];
  organization_id: string;
  organization_name: string;
}
export interface User {
  id: string;
  name: string;
  role: Role;
  role_name: string;
  permissions: Permission[];
}
export interface Committee {
  id: string;
  site_id: string;
  name: string;
  valid_from: string;
  valid_until: string | null;
}
export interface Inspection {
  id: string;
  title: string;
  area: string;
  inspected_on: string;
  status: string;
  version: number;
}
export interface Action {
  id: string;
  title: string;
  owner_id: string;
  due_on: string;
  priority: string;
  status: ActionStatus;
  version: number;
}
export interface Finding {
  id: string;
  description: string;
  actions: Action[];
  actions_total:number;
}
export interface InspectionDetail extends Inspection {
  findings: Finding[];
  findingsPage:Page<Finding>;
  stats:{actions:number;closed:number};
}
export interface Evidence {
  id: string;
  note: string;
  author_id: string;
  created_at: string;
}
export interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  location: string;
  agenda: string;
  committee_id: string | null;
  committee_name?: string;
  version: number;
}
export interface Minute {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "IN_REVIEW";
  version: number;
}
export interface Revision {
  version: number;
  content: string;
  title: string | null;
  status: string | null;
  actor_id: string;
  actor_name?: string;
  created_at: string;
}
export interface Agreement {
  id: string;
  title: string;
  owner_id: string;
  due_on: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  version: number;
}
export interface History {
  id: string;
  event: string;
  details: Record<string, unknown>;
  actor_name: string;
  created_at: string;
}
export interface MeetingWorkspace {
  meeting: Meeting;
  minute: Minute | null;
  agreements: Agreement[];
  agreementsPage: Page<Agreement>;
  history: History[];
  historyPage: Page<History>;
}
export interface Commitment {
  id: string;
  source: "INSPECTION" | "MEETING";
  source_id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  site_id: string;
  due_on: string;
  status: string;
  closed: boolean;
  overdue: boolean;
  version: number;
}
export interface CommitmentSummary {
  total: number;
  pending: number;
  overdue: number;
  upcoming: number;
  closed: number;
  asOf: string;
  timezone: string;
}
