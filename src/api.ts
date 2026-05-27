import func2url from "../backend/func2url.json";

const URLS = func2url as Record<string, string>;

function getToken(): string | null {
  return localStorage.getItem("cf_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "X-Auth-Token": token } : {}),
  };
}

async function request<T>(fn: string, options: RequestInit = {}): Promise<T> {
  const url = URLS[fn];
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data as T;
}

// AUTH
export async function apiLogin(email: string, password: string) {
  const data = await request<{ token: string; user: User }>("auth", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("cf_token", data.token);
  return data.user;
}

export async function apiMe(): Promise<User | null> {
  try {
    const data = await request<{ user: User }>("auth", { method: "GET" });
    return data.user;
  } catch {
    return null;
  }
}

export async function apiLogout() {
  await request("auth", {
    method: "POST",
    body: JSON.stringify({ action: "logout" }),
  });
  localStorage.removeItem("cf_token");
}

// USERS
export async function apiGetUsers(): Promise<User[]> {
  const data = await request<{ users: User[] }>("users");
  return data.users;
}

// CHECKLISTS
export async function apiGetChecklists(): Promise<ChecklistSummary[]> {
  const data = await request<{ checklists: ChecklistSummary[] }>("checklists");
  return data.checklists;
}

export async function apiGetChecklist(id: number): Promise<ChecklistDetail> {
  const url = URLS["checklists"] + `?id=${id}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data.checklist;
}

export async function apiCreateChecklist(payload: {
  title: string;
  description: string;
  category: string;
  items: string[];
  assigned_user_ids: number[];
}) {
  return request<{ id: number }>("checklists", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ASSIGNMENTS
export async function apiGetMyAssignments(): Promise<AssignmentDetail[]> {
  const data = await request<{ assignments: AssignmentDetail[] }>("assignments");
  return data.assignments;
}

export async function apiToggleItem(assignment_id: number, item_id: number, done: boolean) {
  return request<{ progress: number; status: string }>("assignments", {
    method: "POST",
    body: JSON.stringify({ action: "toggle", assignment_id, item_id, done }),
  });
}

export async function apiComplete(assignment_id: number) {
  return request<{ ok: boolean }>("assignments", {
    method: "POST",
    body: JSON.stringify({ action: "complete", assignment_id }),
  });
}

// STATS
export async function apiGetStats(): Promise<StatsData> {
  return request<StatsData>("stats");
}

// TYPES
export interface User {
  id: number;
  name: string;
  email: string;
  role: "creator" | "executor";
  department: string;
  avatar: string;
}

export interface ChecklistSummary {
  id: number;
  title: string;
  description: string;
  category: string;
  created_at: string;
  assignment_count: number;
  completed_count: number;
  avg_progress: number;
  items_count: number;
}

export interface ChecklistDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  created_at: string;
  created_by: number;
  items: { id: number; text: string; position: number }[];
  assignments: AssignmentInChecklist[];
}

export interface AssignmentInChecklist {
  id: number;
  user_id: number;
  status: string;
  progress: number;
  assigned_at: string;
  completed_at: string | null;
  user_name: string;
  user_avatar: string;
  user_department: string;
  items: { id: number; text: string; done: boolean }[];
}

export interface AssignmentDetail {
  assignment_id: number;
  checklist_id: number;
  status: string;
  progress: number;
  assigned_at: string;
  completed_at: string | null;
  title: string;
  description: string;
  category: string;
  items: { id: number; text: string; done: boolean }[];
}

export interface StatsData {
  total_checklists: number;
  total_assignments: number;
  completed: number;
  in_progress: number;
  assigned: number;
  avg_progress: number;
  checklists_stats: { id: number; title: string; category: string; assignments: number; completed: number; avg_progress: number }[];
  users_stats: { id: number; name: string; avatar: string; department: string; total: number; completed: number; avg_progress: number }[];
}