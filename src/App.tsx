import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ItemRenderer from "@/components/ItemRenderer";
import ItemBuilder from "@/components/ItemBuilder";
import ScheduleBuilder from "@/components/ScheduleBuilder";
import MobileApp from "./MobileApp";

// Определяем мобильное устройство
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
}
import {
  apiLogin, apiMe, apiLogout,
  apiGetUsers, apiCreateUser, apiUpdateUserJobTitle,
  apiGetChecklists, apiGetChecklist, apiCreateChecklist,
  apiAddSchedule, apiRemoveSchedule, apiAddRoleAssignment, apiRemoveRoleAssignment,
  apiGetMyAssignments, apiToggleItem, apiSubmitAssignment, apiGetStats,
  type User, type ChecklistSummary, type ChecklistDetail,
  type AssignmentDetail, type StatsData, type ChecklistItemInput, type ItemResponse,
} from "./api";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Page =
  | "home" | "checklists" | "create" | "stats"
  | "users" | "profile" | "checklist-view" | "checklist-execute";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  assigned: "Назначен", in_progress: "В работе", completed: "Завершён",
};
const statusColor: Record<string, string> = {
  assigned: "bg-warning/15 text-warning border border-warning/30",
  in_progress: "bg-accent/10 text-accent border border-accent/30",
  completed: "bg-success/15 text-success border border-success/30",
};
const categoryColor: Record<string, string> = {
  HR: "bg-purple-100 text-purple-700 border border-purple-200",
  ИТ: "bg-blue-100 text-blue-700 border border-blue-200",
  Финансы: "bg-green-100 text-green-700 border border-green-200",
  Прочее: "bg-gray-100 text-gray-600 border border-gray-200",
};

// ─── UI ATOMS ────────────────────────────────────────────────────────────────

function AvatarBadge({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" }[size];
  return (
    <div className={`${s} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold tracking-wide shrink-0`}>
      {initials}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className="h-full progress-bar rounded-full transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`bg-card border rounded-lg p-5 stat-card animate-fade-in ${accent ? "border-accent/30" : "border-border"}`}>
      <div className="w-9 h-9 rounded-md bg-accent/10 flex items-center justify-center mb-3">
        <Icon name={icon} fallback="Circle" size={18} className="text-accent" />
      </div>
      <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
      <div className="text-sm font-medium text-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

function Sidebar({ page, setPage, currentUser }: { page: Page; setPage: (p: Page) => void; currentUser: User }) {
  const isCreator = currentUser.role === "creator";
  const nav = isCreator
    ? [
        { id: "home", icon: "LayoutDashboard", label: "Главная" },
        { id: "checklists", icon: "ClipboardList", label: "Мои чек-листы" },
        { id: "create", icon: "PlusSquare", label: "Создать чек-лист" },
        { id: "stats", icon: "BarChart2", label: "Статистика" },
        { id: "users", icon: "Users", label: "Пользователи" },
      ]
    : [
        { id: "home", icon: "LayoutDashboard", label: "Главная" },
        { id: "checklists", icon: "ClipboardList", label: "Мои задания" },
      ];

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col sidebar-nav border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
            <Icon name="CheckSquare" size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">CheckFlow</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id as Page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"}`}
            >
              <Icon name={item.icon} fallback="Circle" size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={() => setPage("profile")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${page === "profile" ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"}`}
        >
          <AvatarBadge initials={currentUser.avatar} size="sm" />
          <div className="flex-1 text-left min-w-0">
            <div className="text-white text-xs font-medium truncate">{currentUser.name.split(" ")[0]}</div>
            <div className="text-sidebar-foreground text-xs">{isCreator ? "Создатель" : "Исполнитель"}</div>
          </div>
          <Icon name="Settings" size={14} className="text-sidebar-foreground shrink-0" />
        </button>
      </div>
    </aside>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("voronov@corp.ru");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await apiLogin(email.trim().toLowerCase(), password);
      onLogin(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const demoUsers = [
    { email: "voronov@corp.ru", name: "Алексей Воронов", role: "Создатель" },
    { email: "kozlova@corp.ru", name: "Мария Козлова", role: "Исполнитель" },
    { email: "petrov@corp.ru", name: "Дмитрий Петров", role: "Исполнитель" },
    { email: "ivanova@corp.ru", name: "Светлана Иванова", role: "Исполнитель" },
    { email: "smirnov@corp.ru", name: "Андрей Смирнов", role: "Исполнитель" },
  ];

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <Icon name="CheckSquare" size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CheckFlow</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Корпоративные чек-листы</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-xl p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Вход в систему</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Пароль</label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
            <button
              onClick={handleLogin} disabled={loading}
              className="w-full bg-accent text-white py-2.5 rounded-md font-medium text-sm hover:bg-accent/90 disabled:opacity-60 transition-all mt-2"
            >
              {loading ? "Входим..." : "Войти в систему"}
            </button>
          </div>
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium mb-2">Тестовые аккаунты (пароль: password123):</p>
            <div className="space-y-1">
              {demoUsers.map((u) => (
                <button key={u.email} onClick={() => { setEmail(u.email); setPassword("password123"); setError(""); }}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded hover:bg-muted transition-colors flex items-center justify-between">
                  <span className="text-foreground font-medium">{u.name}</span>
                  <span className="text-muted-foreground">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME (Creator) ───────────────────────────────────────────────────────────

function HomeCreator({ currentUser, setPage, setViewId }: { currentUser: User; setPage: (p: Page) => void; setViewId: (id: number) => void }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGetStats(), apiGetChecklists()]).then(([s, c]) => {
      setStats(s); setChecklists(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Добро пожаловать, {currentUser.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon="ClipboardList" label="Чек-листов создано" value={stats?.total_checklists ?? 0} />
        <StatCard icon="Users" label="Всего назначений" value={stats?.total_assignments ?? 0} />
        <StatCard icon="CheckCircle" label="Завершено" value={stats?.completed ?? 0} accent />
        <StatCard icon="TrendingUp" label="Средний прогресс" value={`${stats?.avg_progress ?? 0}%`} sub={`${stats?.in_progress ?? 0} в работе`} />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-card border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Последние чек-листы</h2>
          </div>
          <div className="divide-y divide-border">
            {checklists.length === 0 && <div className="px-5 py-8 text-center text-muted-foreground text-sm">Чек-листов пока нет</div>}
            {checklists.slice(0, 5).map((c) => (
              <div key={c.id} onClick={() => { setViewId(c.id); setPage("checklist-view"); }}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.assignment_count} исполнителей · {c.completed_count} завершили</div>
                </div>
                <div className="w-24">
                  <ProgressBar value={c.avg_progress} />
                  <div className="text-xs text-muted-foreground text-right mt-1">{c.avg_progress}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Быстрые действия</h2>
          </div>
          <div className="p-4 space-y-2">
            {[
              { icon: "Plus", label: "Новый чек-лист", page: "create" as Page },
              { icon: "UserPlus", label: "Управление командой", page: "users" as Page },
              { icon: "BarChart2", label: "Статистика", page: "stats" as Page },
            ].map((item) => (
              <button key={item.label} onClick={() => setPage(item.page)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-sm font-medium text-foreground group">
                <div className="w-7 h-7 rounded bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition">
                  <Icon name={item.icon} fallback="Circle" size={14} className="text-accent" />
                </div>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME (Executor) ──────────────────────────────────────────────────────────

function HomeExecutor({ currentUser, setPage, setViewId }: { currentUser: User; setPage: (p: Page) => void; setViewId: (id: number) => void }) {
  const [assignments, setAssignments] = useState<AssignmentDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetMyAssignments().then(setAssignments).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const pending = assignments.filter((a) => a.status !== "completed");
  const done = assignments.filter((a) => a.status === "completed");

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Мои задания</h1>
        <p className="text-muted-foreground text-sm mt-1">{currentUser.name} · {currentUser.department}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon="ClipboardList" label="Всего заданий" value={assignments.length} />
        <StatCard icon="Clock" label="В работе / ожидают" value={pending.length} />
        <StatCard icon="CheckCircle" label="Завершено" value={done.length} accent />
      </div>
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Активные задания</h2>
          <div className="space-y-3">
            {pending.map((a) => (
              <div key={a.assignment_id} onClick={() => { setViewId(a.checklist_id); setPage("checklist-execute"); }}
                className="bg-card border border-border rounded-lg p-5 hover-lift cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge label={a.category} color={categoryColor[a.category] || categoryColor["Прочее"]} />
                      <Badge label={statusLabel[a.status]} color={statusColor[a.status]} />
                    </div>
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{a.description}</p>
                  </div>
                  <Icon name="ChevronRight" size={18} className="text-muted-foreground shrink-0 ml-4 mt-1" />
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={a.progress} />
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">{a.progress}%</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {a.items.filter((i) => i.done).length} из {a.items.length} пунктов выполнено
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Завершённые</h2>
          <div className="space-y-2">
            {done.map((a) => (
              <div key={a.assignment_id} className="bg-card border border-border rounded-lg px-5 py-3.5 flex items-center gap-4 opacity-70">
                <Icon name="CheckCircle2" size={18} className="text-success" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">Завершено {a.completed_at}</div>
                </div>
                <Badge label="100%" color="bg-success/15 text-success border border-success/30" />
              </div>
            ))}
          </div>
        </div>
      )}
      {assignments.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Icon name="ClipboardList" size={40} className="text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Заданий пока нет</h3>
          <p className="text-sm text-muted-foreground">Когда руководитель назначит вам чек-лист, он появится здесь</p>
        </div>
      )}
    </div>
  );
}

// ─── CHECKLISTS PAGE ──────────────────────────────────────────────────────────

function ChecklistsPage({ currentUser, setPage, setViewId }: { currentUser: User; setPage: (p: Page) => void; setViewId: (id: number) => void }) {
  const isCreator = currentUser.role === "creator";
  const [items, setItems] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiGetChecklists().then(setItems).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isCreator ? "Все чек-листы" : "Мои задания"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{filtered.length} записей</p>
        </div>
        {isCreator && (
          <button onClick={() => setPage("create")} className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors">
            <Icon name="Plus" size={16} />Новый чек-лист
          </button>
        )}
      </div>
      <div className="mb-5 relative">
        <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию..."
          className="w-full max-w-sm pl-9 pr-4 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition" />
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Icon name="Search" size={36} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} onClick={() => { setViewId(c.id); setPage(isCreator ? "checklist-view" : "checklist-execute"); }}
              className="bg-card border border-border rounded-lg p-5 hover-lift cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="ClipboardList" size={18} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge label={c.category} color={categoryColor[c.category] || categoryColor["Прочее"]} />
                  </div>
                  <h3 className="font-semibold text-foreground">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>
                  <div className="flex items-center gap-5 mt-3 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Icon name="List" size={12} />{c.items_count} пунктов</span>
                    {isCreator && <>
                      <span className="flex items-center gap-1.5"><Icon name="Users" size={12} />{c.assignment_count} исполнителей</span>
                      <span className="flex items-center gap-1.5"><Icon name="CheckCircle" size={12} />{c.completed_count} завершили</span>
                    </>}
                    <span className="flex items-center gap-1.5"><Icon name="Calendar" size={12} />{c.created_at}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 w-24">
                  <div className="text-lg font-bold text-foreground">{c.avg_progress}%</div>
                  <div className="text-xs text-muted-foreground mb-1.5">прогресс</div>
                  <ProgressBar value={c.avg_progress} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CREATE PAGE ──────────────────────────────────────────────────────────────

function CreatePage({ currentUser, onCreated }: { currentUser: User; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Прочее");
  const [items, setItems] = useState<ChecklistItemInput[]>([
    { text: "", item_type: "boolean", is_required: false },
  ]);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGetUsers().then((u) => setAllUsers(u.filter((x) => x.role === "executor")));
  }, []);

  const toggleUser = (id: number) =>
    setAssignedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!title.trim()) return;
    const validItems = items.filter((it) => it.text.trim());
    if (validItems.length === 0) return;
    setLoading(true);
    try {
      await apiCreateChecklist({
        title: title.trim(), description: description.trim(), category,
        items: validItems,
        assigned_user_ids: assignedIds,
      });
      setSaved(true);
      setTitle(""); setDescription("");
      setItems([{ text: "", item_type: "boolean", is_required: false }]);
      setAssignedIds([]);
      setTimeout(() => { setSaved(false); onCreated(); }, 1500);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Новый чек-лист</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Заполните форму и назначьте исполнителей</p>
      </div>
      {saved && (
        <div className="mb-5 flex items-center gap-2.5 bg-success/10 border border-success/30 text-success rounded-md px-4 py-3 text-sm font-medium animate-scale-in">
          <Icon name="CheckCircle" size={16} />Чек-лист создан и назначен исполнителям
        </div>
      )}
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Основная информация</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Название *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Ежеквартальный аудит безопасности"
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Описание</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Краткое описание..." className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Категория</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition">
                {["HR", "ИТ", "Финансы", "Прочее"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Пункты чек-листа</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Icon name="AlertCircle" size={11} className="text-destructive" /> — обязательный</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Выберите тип каждого пункта: Да/Нет, Число, Один вариант, Несколько вариантов</p>
          <ItemBuilder items={items} onChange={setItems} />
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Назначить исполнителей</h2>
          <div className="space-y-2">
            {allUsers.map((u) => {
              const selected = assignedIds.includes(u.id);
              return (
                <button key={u.id} onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border transition-all text-left ${selected ? "border-accent/60 bg-accent/5" : "border-border hover:border-muted-foreground/30"}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-accent border-accent" : "border-border"}`}>
                    {selected && <Icon name="Check" size={11} className="text-white" />}
                  </div>
                  <AvatarBadge initials={u.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.department}{u.job_title ? ` · ${u.job_title}` : ""}</div>
                  </div>
                  {selected && <Icon name="CheckCircle2" size={16} className="text-accent" />}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={handleSave}
          disabled={!title.trim() || loading || items.filter((it) => it.text.trim()).length === 0}
          className="w-full bg-accent text-white py-3 rounded-md font-medium text-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]">
          {loading ? "Создаём..." : "Создать и назначить"}
        </button>
      </div>
    </div>
  );
}

// ─── STATS PAGE ───────────────────────────────────────────────────────────────

function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGetStats().then(setStats).finally(() => setLoading(false)); }, []);

  if (loading) return <Spinner />;
  if (!stats) return null;

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Статистика и аналитика</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Сводные данные по всем чек-листам и исполнителям</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon="ClipboardList" label="Чек-листов" value={stats.total_checklists} sub="всего создано" />
        <StatCard icon="Send" label="Назначений" value={stats.total_assignments} sub="всего" />
        <StatCard icon="Clock" label="В работе" value={stats.in_progress} />
        <StatCard icon="CheckCircle" label="Завершено" value={stats.completed} accent />
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5">Статус назначений</h2>
          <div className="space-y-4">
            {[
              { label: "Завершено", count: stats.completed, color: "bg-success" },
              { label: "В работе", count: stats.in_progress, color: "bg-accent" },
              { label: "Ожидает", count: stats.assigned, color: "bg-warning" },
            ].map((s) => {
              const pct = stats.total_assignments ? Math.round(s.count / stats.total_assignments * 100) : 0;
              return (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5">Прогресс по чек-листам</h2>
          <div className="space-y-4">
            {stats.checklists_stats.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground truncate max-w-[200px]">{c.title}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">{c.avg_progress}%</span>
                </div>
                <ProgressBar value={c.avg_progress} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Статистика по сотрудникам</h2>
          <button className="flex items-center gap-2 text-xs font-medium text-accent border border-accent/30 px-3 py-1.5 rounded-md hover:bg-accent/5 transition-colors">
            <Icon name="Download" size={13} />Экспорт Excel
          </button>
        </div>
        <div className="divide-y divide-border">
          {stats.users_stats.map((u) => (
            <div key={u.id} className="px-6 py-4 flex items-center gap-5">
              <AvatarBadge initials={u.avatar} />
              <div className="w-44">
                <div className="text-sm font-medium text-foreground">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.department}</div>
              </div>
              <div className="flex gap-8 text-sm flex-1">
                <div><div className="text-xs text-muted-foreground mb-0.5">Назначений</div><div className="font-semibold text-foreground">{u.total}</div></div>
                <div><div className="text-xs text-muted-foreground mb-0.5">Завершено</div><div className="font-semibold text-success">{u.completed}</div></div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1.5">Средний прогресс</div>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={u.avg_progress} />
                    <span className="text-xs font-medium text-foreground w-10 text-right">{u.avg_progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newPassword, setNewPassword] = useState("password123");
  const [saving, setSaving] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<number | null>(null);
  const [editJobValue, setEditJobValue] = useState("");

  const reload = () => {
    setLoading(true);
    apiGetUsers().then((u) => setUsers(u.filter((x) => x.role === "executor"))).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setSaving(true);
    try {
      await apiCreateUser({ name: newName.trim(), email: newEmail.trim(), password: newPassword, department: newDept, job_title: newJobTitle });
      setNewName(""); setNewEmail(""); setNewDept(""); setNewJobTitle(""); setNewPassword("password123");
      setShowForm(false);
      reload();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  };

  const handleSaveJobTitle = async (userId: number) => {
    await apiUpdateUserJobTitle(userId, editJobValue);
    setEditingJobTitle(null);
    reload();
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Управление пользователями</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{users.length} сотрудников в системе</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors">
          <Icon name="UserPlus" size={16} />Добавить сотрудника
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-accent/30 rounded-lg p-6 mb-6 animate-scale-in">
          <h2 className="text-sm font-semibold text-foreground mb-4">Новый сотрудник</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Имя *", val: newName, set: setNewName, ph: "Иван Иванов" },
              { label: "Email *", val: newEmail, set: setNewEmail, ph: "ivan@corp.ru" },
              { label: "Пароль", val: newPassword, set: setNewPassword, ph: "password123" },
              { label: "Отдел", val: newDept, set: setNewDept, ph: "HR, ИТ…" },
              { label: "Должность", val: newJobTitle, set: setNewJobTitle, ph: "Стажёр, Инженер…" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">{f.label}</label>
                <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                  className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Если указать должность — сотруднику автоматически назначатся все чек-листы, связанные с этой должностью.
          </p>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !newName.trim() || !newEmail.trim()}
              className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 disabled:opacity-60 transition">
              {saving ? "Создаём..." : "Создать"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md text-sm font-medium border border-border text-foreground hover:bg-muted transition">Отмена</button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-3 border-b border-border grid grid-cols-[1fr_130px_170px_150px_80px] text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Сотрудник</span><span>Отдел</span><span>Email</span><span>Должность</span><span>Статус</span>
          </div>
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="px-6 py-3.5 grid grid-cols-[1fr_130px_170px_150px_80px] items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <AvatarBadge initials={u.avatar} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.created_at}</div>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{u.department || "—"}</span>
                <span className="text-sm text-muted-foreground truncate">{u.email}</span>
                <div>
                  {editingJobTitle === u.id ? (
                    <div className="flex items-center gap-1">
                      <input value={editJobValue} onChange={(e) => setEditJobValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveJobTitle(u.id)}
                        autoFocus
                        className="w-24 px-2 py-1 rounded border border-accent/40 bg-background text-xs text-foreground focus:outline-none" />
                      <button onClick={() => handleSaveJobTitle(u.id)} className="text-accent hover:text-accent/80 p-1"><Icon name="Check" size={13} /></button>
                      <button onClick={() => setEditingJobTitle(null)} className="text-muted-foreground hover:text-foreground p-1"><Icon name="X" size={13} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingJobTitle(u.id); setEditJobValue(u.job_title || ""); }}
                      className="flex items-center gap-1.5 text-sm text-foreground hover:text-accent transition-colors group">
                      <span>{u.job_title || <span className="text-muted-foreground italic">не указана</span>}</span>
                      <Icon name="Pencil" size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
                <Badge label="Активен" color="bg-success/15 text-success border border-success/30" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────

function ProfilePage({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const isCreator = currentUser.role === "creator";
  const handleLogout = async () => { await apiLogout(); onLogout(); };

  return (
    <div className="p-8 animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Профиль</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Персональные данные и настройки</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-6 mb-5">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">{currentUser.avatar}</div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{currentUser.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge label={isCreator ? "Создатель" : "Исполнитель"} color={isCreator ? "bg-primary/10 text-primary border border-primary/20" : "bg-accent/10 text-accent border border-accent/20"} />
              <span className="text-sm text-muted-foreground">{currentUser.department}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Email", value: currentUser.email, icon: "Mail" },
            { label: "Отдел", value: currentUser.department, icon: "Building2" },
            { label: "Роль", value: isCreator ? "Администратор / Создатель" : "Исполнитель", icon: "Shield" },
            { label: "ID пользователя", value: `#${String(currentUser.id).padStart(4, "0")}`, icon: "Hash" },
          ].map((f) => (
            <div key={f.label} className="bg-muted/40 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon name={f.icon} fallback="Circle" size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{f.label}</span>
              </div>
              <div className="text-sm font-medium text-foreground">{f.value}</div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-destructive border border-destructive/30 px-4 py-2.5 rounded-md hover:bg-destructive/5 transition-colors">
        <Icon name="LogOut" size={15} />Выйти из системы
      </button>
    </div>
  );
}

// ─── CHECKLIST VIEW (Creator) ─────────────────────────────────────────────────

function ChecklistView({ checklistId }: { checklistId: number }) {
  const [cl, setCl] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    apiGetChecklist(checklistId).then(setCl).finally(() => setLoading(false));
  }, [checklistId]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <Spinner />;
  if (!cl) return null;

  const handleAddRole = async () => {
    if (!newRole.trim()) return;
    setSavingRole(true);
    try { await apiAddRoleAssignment(cl.id, newRole.trim()); setNewRole(""); reload(); }
    finally { setSavingRole(false); }
  };

  const TYPE_LABELS: Record<string, string> = {
    boolean: "Да/Нет", numeric: "Число", single_choice: "Один вариант", multiple_choice: "Несколько"
  };

  return (
    <div className="p-8 animate-fade-in max-w-4xl">
      <div className="mb-6">
        <Badge label={cl.category} color={categoryColor[cl.category] || categoryColor["Прочее"]} />
        <h1 className="text-2xl font-bold text-foreground mt-2">{cl.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{cl.description}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><Icon name="Calendar" size={12} />Создан {cl.created_at}</span>
          <span className="flex items-center gap-1.5"><Icon name="List" size={12} />{cl.items.length} пунктов</span>
          <span className="flex items-center gap-1.5"><Icon name="Users" size={12} />{cl.assignments.length} исполнителей</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          {/* Пункты */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Пункты чек-листа</h2>
            <div className="divide-y divide-border">
              {cl.items.map((item, i) => (
                <div key={item.id} className="flex items-start gap-3 py-2.5">
                  <span className="font-mono text-xs text-muted-foreground w-5 shrink-0 mt-0.5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{item.text}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[item.item_type] || item.item_type}</span>
                      {item.unit && <span className="text-xs bg-muted px-1.5 rounded text-muted-foreground">{item.unit}</span>}
                      {item.min_value !== null && item.max_value !== null && (
                        <span className="text-xs text-muted-foreground">{item.min_value}–{item.max_value}</span>
                      )}
                      {item.is_required && <span className="text-xs text-destructive">обязательный</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Прогресс */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Прогресс по исполнителям</h2>
            </div>
            <div className="divide-y divide-border">
              {cl.assignments.length === 0 && (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">Исполнители не назначены</div>
              )}
              {cl.assignments.map((a) => (
                <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                  <AvatarBadge initials={a.user_avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{a.user_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge label={statusLabel[a.status] || a.status} color={statusColor[a.status] || ""} />
                        <span className="text-sm font-bold text-foreground">{a.progress}%</span>
                      </div>
                    </div>
                    <ProgressBar value={a.progress} />
                    <div className="text-xs text-muted-foreground mt-1">
                      {a.items.filter((it) => it.done).length} из {a.items.length} пунктов
                      {a.completed_at && ` · завершено ${a.completed_at}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Правая колонка: расписание + должности */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-lg p-5">
            <ScheduleBuilder
              schedules={cl.schedules}
              checklistId={cl.id}
              onAdd={async (s) => { await apiAddSchedule(cl.id, s); reload(); }}
              onRemove={async (id) => { await apiRemoveSchedule(cl.id, id); reload(); }}
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">По должности</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Чек-лист автоматически назначается всем сотрудникам с указанной должностью</p>
            {cl.role_assignments.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {cl.role_assignments.map((r) => (
                  <div key={r.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Icon name="Briefcase" size={13} className="text-accent" />
                      <span className="text-xs font-medium text-foreground">{r.job_title}</span>
                    </div>
                    <button onClick={async () => { await apiRemoveRoleAssignment(cl.id, r.id); reload(); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Icon name="Trash2" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input value={newRole} onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
                placeholder="Должность…"
                className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent transition" />
              <button onClick={handleAddRole} disabled={savingRole || !newRole.trim()}
                className="bg-accent text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-accent/90 disabled:opacity-60 transition">
                {savingRole ? "…" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CHECKLIST EXECUTE (Executor) ────────────────────────────────────────────

function ChecklistExecute({ checklistId }: { checklistId: number }) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [responses, setResponses] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    apiGetMyAssignments().then((list) => {
      const found = list.find((a) => a.checklist_id === checklistId);
      if (found) {
        setAssignment(found);
        // Восстанавливаем прошлые ответы если есть
        if (found.responses && found.responses.length > 0) {
          setResponses(found.responses);
        } else {
          // Инициализируем дефолтными значениями
          setResponses(found.items.map((it) => ({
            item_id: it.id,
            item_type: it.item_type,
            value: it.item_type === "boolean" ? it.done : null,
          })));
        }
      }
    }).finally(() => setLoading(false));
  }, [checklistId]);

  const handleChange = useCallback((resp: ItemResponse) => {
    setResponses((prev) => {
      const idx = prev.findIndex((r) => r.item_id === resp.item_id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = resp;
        return next;
      }
      return [...prev, resp];
    });
    setErrors([]);

    // Для boolean пунктов — синхронно обновляем toggle в БД
    if (resp.item_type === "boolean" && assignment && assignment.status !== "completed") {
      apiToggleItem(assignment.assignment_id, resp.item_id, Boolean(resp.value))
        .then((res) => setAssignment((prev) => prev ? { ...prev, progress: res.progress, status: res.status } : prev))
        .catch(() => {});
    }
  }, [assignment]);

  const handleSubmit = async () => {
    if (!assignment) return;
    setSubmitting(true);
    setErrors([]);
    try {
      const result = await apiSubmitAssignment(assignment.assignment_id, responses);
      if ("errors" in result) {
        setErrors(result.errors);
      } else {
        setAssignment((prev) => prev ? { ...prev, status: "completed", progress: 100 } : prev);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!assignment) return (
    <div className="p-8 text-center text-muted-foreground">
      <Icon name="AlertCircle" size={36} className="mx-auto mb-3" />
      <p>Задание не найдено</p>
    </div>
  );

  const isCompleted = assignment.status === "completed";
  const getResp = (itemId: number) => responses.find((r) => r.item_id === itemId);

  // Прогресс: отвечено / всего
  const answeredCount = assignment.items.filter((it) => {
    const r = getResp(it.id);
    if (!r) return false;
    if (it.item_type === "boolean") return true;
    return r.value !== null && r.value !== "" && !(Array.isArray(r.value) && r.value.length === 0);
  }).length;
  const totalItems = assignment.items.length;
  const progress = totalItems > 0 ? Math.round(answeredCount / totalItems * 100) : 0;

  // Можно ли отправить: все обязательные заполнены
  const canSubmit = assignment.items.every((it) => {
    if (!it.is_required) return true;
    const r = getResp(it.id);
    if (!r) return false;
    if (it.item_type === "boolean") return true;
    return r.value !== null && r.value !== "" && !(Array.isArray(r.value) && r.value.length === 0);
  });

  return (
    <div className="p-8 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <Badge label={assignment.category} color={categoryColor[assignment.category] || categoryColor["Прочее"]} />
        <h1 className="text-2xl font-bold text-foreground mt-2">{assignment.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{assignment.description}</p>
      </div>

      {isCompleted && (
        <div className="flex items-center gap-3 bg-success/10 border border-success/30 text-success rounded-lg px-5 py-4 mb-6 animate-scale-in">
          <Icon name="CheckCircle2" size={22} />
          <div>
            <div className="font-semibold">Чек-лист завершён!</div>
            <div className="text-sm opacity-80">Ответы сохранены и отправлены создателю.</div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-5 py-4 mb-5">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
            <Icon name="AlertCircle" size={15} />Исправьте ошибки:
          </div>
          <ul className="space-y-1">
            {errors.map((e, i) => <li key={i} className="text-xs text-destructive">{e}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-foreground">{answeredCount} из {totalItems} заполнено</div>
          <div className="text-sm font-bold text-foreground">{progress}%</div>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="bg-card border border-border rounded-lg mb-5">
        {assignment.items.map((item) => (
          <ItemRenderer
            key={item.id}
            item={item}
            response={getResp(item.id)}
            onChange={handleChange}
            disabled={isCompleted}
          />
        ))}
      </div>

      {!isCompleted && (
        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          className="w-full bg-accent text-white py-3 rounded-md font-medium text-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]">
          {submitting ? "Сохраняем..." : !canSubmit
            ? "Заполните все обязательные поля (*)"
            : "Завершить и отправить отчёт"}
        </button>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [isMobile] = useState(() => isMobileDevice());

  // Мобильные устройства и исполнители → мобильный интерфейс
  if (isMobile) return <MobileApp />;

  return <DesktopApp />;
}

function DesktopApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [viewId, setViewId] = useState<number | null>(null);

  // Проверяем сохранённую сессию
  useEffect(() => {
    apiMe().then((user) => {
      if (user) setCurrentUser(user);
    }).finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = (user: User) => { setCurrentUser(user); setPage("home"); };
  const handleLogout = () => { setCurrentUser(null); setPage("home"); };
  const handleCreated = () => setPage("checklists");

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) return <LoginPage onLogin={handleLogin} />;

  const renderPage = () => {
    switch (page) {
      case "home":
        return currentUser.role === "creator"
          ? <HomeCreator currentUser={currentUser} setPage={setPage} setViewId={setViewId} />
          : <HomeExecutor currentUser={currentUser} setPage={setPage} setViewId={setViewId} />;
      case "checklists":
        return <ChecklistsPage currentUser={currentUser} setPage={setPage} setViewId={setViewId} />;
      case "create":
        return <CreatePage currentUser={currentUser} onCreated={handleCreated} />;
      case "stats":
        return <StatsPage />;
      case "users":
        return <UsersPage />;
      case "profile":
        return <ProfilePage currentUser={currentUser} onLogout={handleLogout} />;
      case "checklist-view":
        return viewId ? <ChecklistView checklistId={viewId} /> : null;
      case "checklist-execute":
        return viewId ? <ChecklistExecute checklistId={viewId} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar page={page} setPage={setPage} currentUser={currentUser} />
      <main className="flex-1 overflow-y-auto">{renderPage()}</main>
    </div>
  );
}