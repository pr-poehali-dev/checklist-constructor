import { useState } from "react";
import Icon from "@/components/ui/icon";

// ─── TYPES ─────────────────────────────────────────────────────────────────

type Role = "creator" | "executor";
type Page =
  | "login"
  | "home"
  | "checklists"
  | "create"
  | "stats"
  | "users"
  | "profile"
  | "checklist-view"
  | "checklist-execute";

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatar: string;
}

interface ChecklistItem {
  id: number;
  text: string;
  done: boolean;
}

interface Assignment {
  userId: number;
  status: "assigned" | "in_progress" | "completed";
  progress: number;
  completedAt?: string;
  items: ChecklistItem[];
}

interface Checklist {
  id: number;
  title: string;
  description: string;
  createdBy: number;
  createdAt: string;
  category: string;
  items: ChecklistItem[];
  assignments: Assignment[];
}

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

const USERS: User[] = [
  { id: 1, name: "Алексей Воронов", email: "voronov@corp.ru", role: "creator", department: "Управление", avatar: "АВ" },
  { id: 2, name: "Мария Козлова", email: "kozlova@corp.ru", role: "executor", department: "HR", avatar: "МК" },
  { id: 3, name: "Дмитрий Петров", email: "petrov@corp.ru", role: "executor", department: "Продажи", avatar: "ДП" },
  { id: 4, name: "Светлана Иванова", email: "ivanova@corp.ru", role: "executor", department: "Финансы", avatar: "СИ" },
  { id: 5, name: "Андрей Смирнов", email: "smirnov@corp.ru", role: "executor", department: "ИТ", avatar: "АС" },
];

const INIT_CHECKLISTS: Checklist[] = [
  {
    id: 1,
    title: "Адаптация нового сотрудника",
    description: "Обязательный чек-лист для прохождения всеми новыми сотрудниками в первую неделю работы",
    createdBy: 1,
    createdAt: "2026-05-10",
    category: "HR",
    items: [
      { id: 1, text: "Пройти инструктаж по охране труда", done: false },
      { id: 2, text: "Подписать договор о неразглашении (NDA)", done: false },
      { id: 3, text: "Получить корпоративный пропуск", done: false },
      { id: 4, text: "Настроить рабочую почту и доступы к системам", done: false },
      { id: 5, text: "Познакомиться с командой и пройти вводный инструктаж", done: false },
      { id: 6, text: "Изучить регламент внутренних коммуникаций", done: false },
    ],
    assignments: [
      { userId: 2, status: "completed", progress: 100, completedAt: "2026-05-18", items: [{ id: 1, text: "Пройти инструктаж по охране труда", done: true }, { id: 2, text: "Подписать договор о неразглашении (NDA)", done: true }, { id: 3, text: "Получить корпоративный пропуск", done: true }, { id: 4, text: "Настроить рабочую почту и доступы к системам", done: true }, { id: 5, text: "Познакомиться с командой и пройти вводный инструктаж", done: true }, { id: 6, text: "Изучить регламент внутренних коммуникаций", done: true }] },
      { userId: 3, status: "in_progress", progress: 50, items: [{ id: 1, text: "Пройти инструктаж по охране труда", done: true }, { id: 2, text: "Подписать договор о неразглашении (NDA)", done: true }, { id: 3, text: "Получить корпоративный пропуск", done: true }, { id: 4, text: "Настроить рабочую почту и доступы к системам", done: false }, { id: 5, text: "Познакомиться с командой и пройти вводный инструктаж", done: false }, { id: 6, text: "Изучить регламент внутренних коммуникаций", done: false }] },
    ],
  },
  {
    id: 2,
    title: "Квартальная проверка безопасности ИТ",
    description: "Плановый аудит информационной безопасности рабочих мест",
    createdBy: 1,
    createdAt: "2026-05-15",
    category: "ИТ",
    items: [
      { id: 1, text: "Проверить актуальность паролей (смена каждые 90 дней)", done: false },
      { id: 2, text: "Убедиться в наличии обновлений антивируса", done: false },
      { id: 3, text: "Проверить шифрование жёсткого диска", done: false },
      { id: 4, text: "Провести резервное копирование рабочих файлов", done: false },
      { id: 5, text: "Отчитаться перед руководством отдела ИТ", done: false },
    ],
    assignments: [
      { userId: 5, status: "in_progress", progress: 40, items: [{ id: 1, text: "Проверить актуальность паролей (смена каждые 90 дней)", done: true }, { id: 2, text: "Убедиться в наличии обновлений антивируса", done: true }, { id: 3, text: "Проверить шифрование жёсткого диска", done: false }, { id: 4, text: "Провести резервное копирование рабочих файлов", done: false }, { id: 5, text: "Отчитаться перед руководством отдела ИТ", done: false }] },
      { userId: 4, status: "assigned", progress: 0, items: [{ id: 1, text: "Проверить актуальность паролей (смена каждые 90 дней)", done: false }, { id: 2, text: "Убедиться в наличии обновлений антивируса", done: false }, { id: 3, text: "Проверить шифрование жёсткого диска", done: false }, { id: 4, text: "Провести резервное копирование рабочих файлов", done: false }, { id: 5, text: "Отчитаться перед руководством отдела ИТ", done: false }] },
    ],
  },
  {
    id: 3,
    title: "Ежемесячная сверка финансовых документов",
    description: "Обязательная процедура для финансового отдела по итогам каждого месяца",
    createdBy: 1,
    createdAt: "2026-05-20",
    category: "Финансы",
    items: [
      { id: 1, text: "Сверить приходные ордера с банковскими выписками", done: false },
      { id: 2, text: "Проверить наличие всех подписей на документах", done: false },
      { id: 3, text: "Сформировать отчёт о дебиторской задолженности", done: false },
      { id: 4, text: "Загрузить данные в учётную систему", done: false },
    ],
    assignments: [
      { userId: 4, status: "assigned", progress: 0, items: [{ id: 1, text: "Сверить приходные ордера с банковскими выписками", done: false }, { id: 2, text: "Проверить наличие всех подписей на документах", done: false }, { id: 3, text: "Сформировать отчёт о дебиторской задолженности", done: false }, { id: 4, text: "Загрузить данные в учётную систему", done: false }] },
    ],
  },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────

const getUserById = (id: number) => USERS.find((u) => u.id === id);
const statusLabel: Record<string, string> = {
  assigned: "Назначен",
  in_progress: "В работе",
  completed: "Завершён",
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

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
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
      <div
        className="h-full progress-bar rounded-full transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`bg-card border rounded-lg p-5 stat-card animate-fade-in ${accent ? "border-accent/30" : "border-border"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-md bg-accent/10 flex items-center justify-center">
          <Icon name={icon} fallback="Circle" size={18} className="text-accent" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
      <div className="text-sm font-medium text-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── SIDEBAR ────────────────────────────────────────────────────────────────

function Sidebar({ page, setPage, currentUser }: { page: Page; setPage: (p: Page) => void; currentUser: User }) {
  const isCreator = currentUser.role === "creator";
  const creatorNav = [
    { id: "home", icon: "LayoutDashboard", label: "Главная" },
    { id: "checklists", icon: "ClipboardList", label: "Мои чек-листы" },
    { id: "create", icon: "PlusSquare", label: "Создать чек-лист" },
    { id: "stats", icon: "BarChart2", label: "Статистика" },
    { id: "users", icon: "Users", label: "Пользователи" },
  ];
  const executorNav = [
    { id: "home", icon: "LayoutDashboard", label: "Главная" },
    { id: "checklists", icon: "ClipboardList", label: "Мои задания" },
  ];
  const nav = isCreator ? creatorNav : executorNav;

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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
              }`}
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
            page === "profile" ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
          }`}
        >
          <Avatar initials={currentUser.avatar} size="sm" />
          <div className="flex-1 text-left min-w-0">
            <div className="text-white text-xs font-medium truncate">{currentUser.name.split(" ")[0]}</div>
            <div className="text-sidebar-foreground text-xs truncate">{isCreator ? "Создатель" : "Исполнитель"}</div>
          </div>
          <Icon name="Settings" size={14} className="text-sidebar-foreground shrink-0" />
        </button>
      </div>
    </aside>
  );
}

// ─── LOGIN PAGE ──────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("voronov@corp.ru");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const user = USERS.find((u) => u.email === email);
    if (user) {
      onLogin(user);
    } else {
      setError("Пользователь не найден. Выберите один из тестовых аккаунтов.");
    }
  };

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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Пароль</label>
              <input
                type="password"
                defaultValue="••••••••"
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-accent text-white py-2.5 rounded-md font-medium text-sm hover:bg-accent/90 active:scale-[0.99] transition-all mt-2"
            >
              Войти в систему
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium mb-2">Тестовые аккаунты:</p>
            <div className="space-y-1">
              {USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setEmail(u.email); setError(""); }}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <span className="text-foreground font-medium">{u.name}</span>
                  <span className="text-muted-foreground">{u.role === "creator" ? "Создатель" : "Исполнитель"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ───────────────────────────────────────────────────────────────

function HomePage({ currentUser, checklists, setPage, setViewId }: { currentUser: User; checklists: Checklist[]; setPage: (p: Page) => void; setViewId: (id: number) => void }) {
  const isCreator = currentUser.role === "creator";

  if (isCreator) {
    const allAssignments = checklists.flatMap((c) => c.assignments);
    const completed = allAssignments.filter((a) => a.status === "completed").length;
    const inProgress = allAssignments.filter((a) => a.status === "in_progress").length;
    const overallProgress = allAssignments.length > 0
      ? Math.round(allAssignments.reduce((s, a) => s + a.progress, 0) / allAssignments.length)
      : 0;

    const recentActivity = checklists
      .flatMap((c) => c.assignments.map((a) => ({ checklist: c, assignment: a })))
      .filter((x) => x.assignment.status !== "assigned")
      .slice(0, 5);

    return (
      <div className="p-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Добро пожаловать, {currentUser.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground text-sm mt-1">Обзор системы чек-листов · {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon="ClipboardList" label="Чек-листов создано" value={checklists.length} />
          <StatCard icon="Users" label="Всего назначений" value={allAssignments.length} />
          <StatCard icon="CheckCircle" label="Завершено" value={completed} accent />
          <StatCard icon="TrendingUp" label="Средний прогресс" value={`${overallProgress}%`} sub={`${inProgress} в работе`} />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-card border border-border rounded-lg">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Последняя активность</h2>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">Активности пока нет</div>
              ) : (
                recentActivity.map(({ checklist, assignment }, i) => {
                  const user = getUserById(assignment.userId);
                  return (
                    <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/40 transition-colors">
                      <Avatar initials={user?.avatar || "??"} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{checklist.title}</div>
                        <div className="text-xs text-muted-foreground">{user?.name}</div>
                      </div>
                      <Badge label={statusLabel[assignment.status]} color={statusColor[assignment.status]} />
                      <div className="w-20">
                        <ProgressBar value={assignment.progress} />
                        <div className="text-xs text-muted-foreground text-right mt-1">{assignment.progress}%</div>
                      </div>
                    </div>
                  );
                })
              )}
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
                { icon: "BarChart2", label: "Статистика и отчёты", page: "stats" as Page },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setPage(item.page)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-sm font-medium text-foreground group"
                >
                  <div className="w-7 h-7 rounded bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition">
                    <Icon name={item.icon} fallback="Circle" size={14} className="text-accent" />
                  </div>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Последние чек-листы</div>
              <div className="space-y-2">
                {checklists.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setViewId(c.id); setPage("checklist-view"); }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <div className="text-xs font-medium text-foreground truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.assignments.length} назначений</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // EXECUTOR HOME
  const myAssignments = checklists.flatMap((c) =>
    c.assignments
      .filter((a) => a.userId === currentUser.id)
      .map((a) => ({ checklist: c, assignment: a }))
  );
  const pending = myAssignments.filter((x) => x.assignment.status !== "completed");
  const done = myAssignments.filter((x) => x.assignment.status === "completed");

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Мои задания</h1>
        <p className="text-muted-foreground text-sm mt-1">{currentUser.name} · {currentUser.department}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon="ClipboardList" label="Всего заданий" value={myAssignments.length} />
        <StatCard icon="Clock" label="В работе / ожидают" value={pending.length} />
        <StatCard icon="CheckCircle" label="Завершено" value={done.length} accent />
      </div>

      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Активные задания</h2>
          <div className="space-y-3">
            {pending.map(({ checklist, assignment }, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-5 hover-lift cursor-pointer"
                onClick={() => { setViewId(checklist.id); setPage("checklist-execute"); }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge label={checklist.category} color={categoryColor[checklist.category] || categoryColor["Прочее"]} />
                      <Badge label={statusLabel[assignment.status]} color={statusColor[assignment.status]} />
                    </div>
                    <h3 className="font-semibold text-foreground">{checklist.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{checklist.description}</p>
                  </div>
                  <Icon name="ChevronRight" size={18} className="text-muted-foreground shrink-0 ml-4 mt-1" />
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={assignment.progress} />
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">{assignment.progress}%</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {assignment.items.filter((it) => it.done).length} из {assignment.items.length} пунктов выполнено
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
            {done.map(({ checklist, assignment }, i) => (
              <div key={i} className="bg-card border border-border rounded-lg px-5 py-3.5 flex items-center gap-4 opacity-70">
                <Icon name="CheckCircle2" size={18} className="text-success" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{checklist.title}</div>
                  <div className="text-xs text-muted-foreground">Завершено {assignment.completedAt}</div>
                </div>
                <Badge label="100%" color="bg-success/15 text-success border border-success/30" />
              </div>
            ))}
          </div>
        </div>
      )}

      {myAssignments.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Icon name="ClipboardList" size={40} className="text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Заданий пока нет</h3>
          <p className="text-sm text-muted-foreground">Когда руководитель назначит вам чек-лист, он появится здесь</p>
        </div>
      )}
    </div>
  );
}

// ─── CHECKLISTS PAGE ─────────────────────────────────────────────────────────

function ChecklistsPage({ currentUser, checklists, setPage, setViewId }: { currentUser: User; checklists: Checklist[]; setPage: (p: Page) => void; setViewId: (id: number) => void }) {
  const isCreator = currentUser.role === "creator";
  const [search, setSearch] = useState("");

  const items = isCreator
    ? checklists.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : checklists
        .filter((c) => c.assignments.some((a) => a.userId === currentUser.id))
        .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isCreator ? "Все чек-листы" : "Мои задания"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{items.length} {isCreator ? "чек-листов" : "заданий"}</p>
        </div>
        {isCreator && (
          <button
            onClick={() => setPage("create")}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Icon name="Plus" size={16} />
            Новый чек-лист
          </button>
        )}
      </div>

      <div className="mb-5 relative">
        <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className="w-full max-w-sm pl-9 pr-4 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
        />
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Icon name="Search" size={36} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const myAssignment = c.assignments.find((a) => a.userId === currentUser.id);
            const totalAssigned = c.assignments.length;
            const completedCount = c.assignments.filter((a) => a.status === "completed").length;
            const avgProgress = totalAssigned > 0
              ? Math.round(c.assignments.reduce((s, a) => s + a.progress, 0) / totalAssigned)
              : 0;

            return (
              <div
                key={c.id}
                className="bg-card border border-border rounded-lg p-5 hover-lift cursor-pointer"
                onClick={() => { setViewId(c.id); setPage(isCreator ? "checklist-view" : "checklist-execute"); }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="ClipboardList" size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge label={c.category} color={categoryColor[c.category] || categoryColor["Прочее"]} />
                      {myAssignment && (
                        <Badge label={statusLabel[myAssignment.status]} color={statusColor[myAssignment.status]} />
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>
                    <div className="flex items-center gap-6 mt-3 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Icon name="List" size={12} />
                        {c.items.length} пунктов
                      </span>
                      {isCreator ? (
                        <>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Icon name="Users" size={12} />
                            {totalAssigned} исполнителей
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Icon name="CheckCircle" size={12} />
                            {completedCount} завершили
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Icon name="Calendar" size={12} />
                            {c.createdAt}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {myAssignment?.items.filter((it) => it.done).length} из {c.items.length} выполнено
                        </span>
                      )}
                    </div>
                  </div>
                  {isCreator && (
                    <div className="text-right shrink-0 w-24">
                      <div className="text-lg font-bold text-foreground">{avgProgress}%</div>
                      <div className="text-xs text-muted-foreground mb-1.5">прогресс</div>
                      <ProgressBar value={avgProgress} />
                    </div>
                  )}
                  {!isCreator && myAssignment && (
                    <div className="text-right shrink-0 w-24">
                      <div className="text-lg font-bold text-foreground">{myAssignment.progress}%</div>
                      <div className="text-xs text-muted-foreground mb-1.5">выполнено</div>
                      <ProgressBar value={myAssignment.progress} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CREATE PAGE ─────────────────────────────────────────────────────────────

function CreatePage({ currentUser, onSave }: { currentUser: User; onSave: (c: Checklist) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Прочее");
  const [items, setItems] = useState<string[]>(["", ""]);
  const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);

  const executors = USERS.filter((u) => u.role === "executor");

  const addItem = () => setItems([...items, ""]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, val: string) => {
    const copy = [...items];
    copy[i] = val;
    setItems(copy);
  };

  const toggleUser = (id: number) => {
    setAssignedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const checklistItems: ChecklistItem[] = items
      .filter((t) => t.trim())
      .map((text, i) => ({ id: i + 1, text, done: false }));
    const newChecklist: Checklist = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString().split("T")[0],
      category,
      items: checklistItems,
      assignments: assignedUsers.map((userId) => ({
        userId,
        status: "assigned",
        progress: 0,
        items: checklistItems.map((item) => ({ ...item, done: false })),
      })),
    };
    onSave(newChecklist);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setTitle("");
    setDescription("");
    setItems(["", ""]);
    setAssignedUsers([]);
  };

  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Новый чек-лист</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Заполните форму и назначьте исполнителей</p>
      </div>

      {saved && (
        <div className="mb-5 flex items-center gap-2.5 bg-success/10 border border-success/30 text-success rounded-md px-4 py-3 text-sm font-medium animate-scale-in">
          <Icon name="CheckCircle" size={16} />
          Чек-лист создан и назначен исполнителям
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Основная информация</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Название *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Ежеквартальный аудит безопасности"
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Краткое описание назначения чек-листа..."
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              >
                {["HR", "ИТ", "Финансы", "Прочее"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Пункты чек-листа</h2>
            <button onClick={addItem} className="text-xs text-accent hover:text-accent/80 font-medium flex items-center gap-1 transition-colors">
              <Icon name="Plus" size={13} />
              Добавить пункт
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-sm border border-border flex items-center justify-center shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>
                </div>
                <input
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder={`Пункт ${i + 1}...`}
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                />
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Icon name="X" size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Назначить исполнителей</h2>
          <div className="space-y-2">
            {executors.map((u) => {
              const selected = assignedUsers.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border transition-all text-left ${
                    selected ? "border-accent/60 bg-accent/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-accent border-accent" : "border-border"}`}>
                    {selected && <Icon name="Check" size={11} className="text-white" />}
                  </div>
                  <Avatar initials={u.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.department}</div>
                  </div>
                  {selected && <Icon name="CheckCircle2" size={16} className="text-accent" />}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim() || items.filter((t) => t.trim()).length === 0}
          className="w-full bg-accent text-white py-3 rounded-md font-medium text-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
        >
          Создать и назначить
        </button>
      </div>
    </div>
  );
}

// ─── STATS PAGE ──────────────────────────────────────────────────────────────

function StatsPage({ checklists }: { checklists: Checklist[] }) {
  const allAssignments = checklists.flatMap((c) =>
    c.assignments.map((a) => ({ checklist: c, assignment: a }))
  );
  const completedCount = allAssignments.filter((x) => x.assignment.status === "completed").length;
  const inProgressCount = allAssignments.filter((x) => x.assignment.status === "in_progress").length;
  const assignedCount = allAssignments.filter((x) => x.assignment.status === "assigned").length;

  const userStats = USERS.filter((u) => u.role === "executor").map((u) => {
    const userAssignments = allAssignments.filter((x) => x.assignment.userId === u.id);
    const avg = userAssignments.length > 0
      ? Math.round(userAssignments.reduce((s, x) => s + x.assignment.progress, 0) / userAssignments.length)
      : 0;
    return { user: u, total: userAssignments.length, completed: userAssignments.filter((x) => x.assignment.status === "completed").length, avg };
  });

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Статистика и аналитика</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Сводные данные по всем чек-листам и исполнителям</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon="ClipboardList" label="Чек-листов" value={checklists.length} sub="всего создано" />
        <StatCard icon="Send" label="Назначений" value={allAssignments.length} sub="всего" />
        <StatCard icon="Clock" label="В работе" value={inProgressCount} />
        <StatCard icon="CheckCircle" label="Завершено" value={completedCount} accent />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5">Статус назначений</h2>
          <div className="space-y-4">
            {[
              { label: "Завершено", count: completedCount, color: "bg-success", pct: allAssignments.length ? Math.round(completedCount / allAssignments.length * 100) : 0 },
              { label: "В работе", count: inProgressCount, color: "bg-accent", pct: allAssignments.length ? Math.round(inProgressCount / allAssignments.length * 100) : 0 },
              { label: "Ожидает", count: assignedCount, color: "bg-warning", pct: allAssignments.length ? Math.round(assignedCount / allAssignments.length * 100) : 0 },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{s.label}</span>
                  <span className="text-muted-foreground">{s.count} ({s.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5">Прогресс по чек-листам</h2>
          <div className="space-y-4">
            {checklists.map((c) => {
              const avg = c.assignments.length > 0
                ? Math.round(c.assignments.reduce((s, a) => s + a.progress, 0) / c.assignments.length)
                : 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground truncate max-w-[200px]">{c.title}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{avg}%</span>
                  </div>
                  <ProgressBar value={avg} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Статистика по сотрудникам</h2>
          <button className="flex items-center gap-2 text-xs font-medium text-accent border border-accent/30 px-3 py-1.5 rounded-md hover:bg-accent/5 transition-colors">
            <Icon name="Download" size={13} />
            Экспорт Excel
          </button>
        </div>
        <div className="divide-y divide-border">
          {userStats.map(({ user, total, completed, avg }) => (
            <div key={user.id} className="px-6 py-4 flex items-center gap-5">
              <Avatar initials={user.avatar} />
              <div className="w-44">
                <div className="text-sm font-medium text-foreground">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.department}</div>
              </div>
              <div className="flex gap-8 text-sm flex-1">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Назначений</div>
                  <div className="font-semibold text-foreground">{total}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Завершено</div>
                  <div className="font-semibold text-success">{completed}</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1.5">Средний прогресс</div>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={avg} />
                    <span className="text-xs font-medium text-foreground w-10 text-right">{avg}%</span>
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

// ─── USERS PAGE ──────────────────────────────────────────────────────────────

function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("");
  const executors = USERS.filter((u) => u.role === "executor");

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Управление пользователями</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{executors.length} сотрудников в системе</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Icon name="UserPlus" size={16} />
          Добавить сотрудника
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-accent/30 rounded-lg p-6 mb-6 animate-scale-in">
          <h2 className="text-sm font-semibold text-foreground mb-4">Новый сотрудник</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Имя</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition" placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Email</label>
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition" placeholder="ivan@corp.ru" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Отдел</label>
              <input value={newDept} onChange={(e) => setNewDept(e.target.value)} className="w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition" placeholder="Отдел..." />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 transition">Сохранить</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md text-sm font-medium border border-border text-foreground hover:bg-muted transition">Отмена</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 border-b border-border grid grid-cols-[1fr_160px_180px_100px_80px] text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Сотрудник</span>
          <span>Отдел</span>
          <span>Email</span>
          <span>Назначений</span>
          <span>Статус</span>
        </div>
        <div className="divide-y divide-border">
          {executors.map((u) => (
            <div key={u.id} className="px-6 py-4 grid grid-cols-[1fr_160px_180px_100px_80px] items-center hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar initials={u.avatar} size="sm" />
                <span className="text-sm font-medium text-foreground">{u.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{u.department}</span>
              <span className="text-sm text-muted-foreground truncate">{u.email}</span>
              <span className="text-sm font-medium text-foreground">
                {INIT_CHECKLISTS.flatMap((c) => c.assignments).filter((a) => a.userId === u.id).length}
              </span>
              <Badge label="Активен" color="bg-success/15 text-success border border-success/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ────────────────────────────────────────────────────────────

function ProfilePage({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const isCreator = currentUser.role === "creator";

  return (
    <div className="p-8 animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Профиль</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Персональные данные и настройки</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-5">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
            {currentUser.avatar}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{currentUser.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                label={isCreator ? "Создатель" : "Исполнитель"}
                color={isCreator ? "bg-primary/10 text-primary border border-primary/20" : "bg-accent/10 text-accent border border-accent/20"}
              />
              <span className="text-sm text-muted-foreground">{currentUser.department}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Email", value: currentUser.email, icon: "Mail" },
            { label: "Отдел", value: currentUser.department, icon: "Building2" },
            { label: "Роль", value: isCreator ? "Администратор / Создатель" : "Исполнитель", icon: "Shield" },
            { label: "ID пользователя", value: `#${currentUser.id.toString().padStart(4, "0")}`, icon: "Hash" },
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

      <div className="bg-card border border-border rounded-lg p-6 mb-5">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Уведомления</h2>
        <div className="space-y-3">
          {[
            { label: "Новые назначения", desc: "Уведомлять при назначении нового чек-листа" },
            { label: "Напоминания", desc: "Напоминать о незавершённых заданиях" },
            { label: "Отчёты о завершении", desc: isCreator ? "Получать отчёт когда исполнитель завершает чек-лист" : "Подтверждение при завершении" },
          ].map((n, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="text-sm font-medium text-foreground">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <div className="w-10 h-5 rounded-full bg-accent relative cursor-pointer shrink-0">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onLogout}
        className="flex items-center gap-2 text-sm font-medium text-destructive border border-destructive/30 px-4 py-2.5 rounded-md hover:bg-destructive/5 transition-colors"
      >
        <Icon name="LogOut" size={15} />
        Выйти из системы
      </button>
    </div>
  );
}

// ─── CHECKLIST VIEW (Creator) ─────────────────────────────────────────────────

function ChecklistView({ checklist }: { checklist: Checklist }) {
  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <div className="mb-6">
        <Badge label={checklist.category} color={categoryColor[checklist.category] || categoryColor["Прочее"]} />
        <h1 className="text-2xl font-bold text-foreground mt-2">{checklist.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{checklist.description}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><Icon name="Calendar" size={12} />Создан {checklist.createdAt}</span>
          <span className="flex items-center gap-1.5"><Icon name="List" size={12} />{checklist.items.length} пунктов</span>
          <span className="flex items-center gap-1.5"><Icon name="Users" size={12} />{checklist.assignments.length} исполнителей</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Пункты чек-листа</h2>
        <div className="space-y-0 divide-y divide-border">
          {checklist.items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <span className="font-mono text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
              <span className="text-sm text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Прогресс по исполнителям</h2>
        </div>
        <div className="divide-y divide-border">
          {checklist.assignments.map((assignment, i) => {
            const user = getUserById(assignment.userId);
            return (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <Avatar initials={user?.avatar || "??"} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{user?.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge label={statusLabel[assignment.status]} color={statusColor[assignment.status]} />
                      <span className="text-sm font-bold text-foreground">{assignment.progress}%</span>
                    </div>
                  </div>
                  <ProgressBar value={assignment.progress} />
                  <div className="text-xs text-muted-foreground mt-1">
                    {assignment.items.filter((it) => it.done).length} из {assignment.items.length} пунктов
                    {assignment.completedAt && ` · завершено ${assignment.completedAt}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CHECKLIST EXECUTE (Executor) ────────────────────────────────────────────

function ChecklistExecute({ checklist, currentUser, onComplete }: { checklist: Checklist; currentUser: User; onComplete: (checklistId: number, items: ChecklistItem[]) => void }) {
  const originalAssignment = checklist.assignments.find((a) => a.userId === currentUser.id);
  const [items, setItems] = useState<ChecklistItem[]>(
    originalAssignment?.items || checklist.items.map((i) => ({ ...i, done: false }))
  );
  const [completed, setCompleted] = useState(originalAssignment?.status === "completed");

  const toggle = (id: number) => {
    if (completed) return;
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  };

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const handleComplete = () => {
    if (doneCount === items.length) {
      setCompleted(true);
      onComplete(checklist.id, items);
    }
  };

  return (
    <div className="p-8 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <Badge label={checklist.category} color={categoryColor[checklist.category] || categoryColor["Прочее"]} />
        <h1 className="text-2xl font-bold text-foreground mt-2">{checklist.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{checklist.description}</p>
      </div>

      {completed && (
        <div className="flex items-center gap-3 bg-success/10 border border-success/30 text-success rounded-lg px-5 py-4 mb-6 animate-scale-in">
          <Icon name="CheckCircle2" size={22} />
          <div>
            <div className="font-semibold">Чек-лист завершён!</div>
            <div className="text-sm opacity-80">Все пункты выполнены. Результат отправлен создателю.</div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-foreground">{doneCount} из {items.length} выполнено</div>
          <div className="text-sm font-bold text-foreground">{progress}%</div>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="bg-card border border-border rounded-lg divide-y divide-border mb-5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${completed ? "cursor-default" : "hover:bg-muted/40"}`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${item.done ? "bg-accent border-accent" : "border-border"}`}>
              {item.done && <Icon name="Check" size={11} className="text-white" />}
            </div>
            <span className={`text-sm flex-1 text-left ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>

      {!completed && (
        <button
          onClick={handleComplete}
          disabled={doneCount < items.length}
          className="w-full bg-accent text-white py-3 rounded-md font-medium text-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
        >
          {doneCount < items.length
            ? `Выполните все пункты (осталось ${items.length - doneCount})`
            : "Завершить чек-лист"}
        </button>
      )}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [checklists, setChecklists] = useState<Checklist[]>(INIT_CHECKLISTS);
  const [viewId, setViewId] = useState<number | null>(null);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setPage("home");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage("login" as Page);
  };

  const handleSaveChecklist = (c: Checklist) => {
    setChecklists((prev) => [c, ...prev]);
  };

  const handleComplete = (checklistId: number, items: ChecklistItem[]) => {
    setChecklists((prev) =>
      prev.map((c) =>
        c.id !== checklistId ? c : {
          ...c,
          assignments: c.assignments.map((a) =>
            a.userId !== currentUser?.id ? a : {
              ...a,
              status: "completed" as const,
              progress: 100,
              completedAt: new Date().toISOString().split("T")[0],
              items,
            }
          ),
        }
      )
    );
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const viewChecklist = checklists.find((c) => c.id === viewId);

  const renderPage = () => {
    switch (page) {
      case "home":
        return <HomePage currentUser={currentUser} checklists={checklists} setPage={setPage} setViewId={setViewId} />;
      case "checklists":
        return <ChecklistsPage currentUser={currentUser} checklists={checklists} setPage={setPage} setViewId={setViewId} />;
      case "create":
        return <CreatePage currentUser={currentUser} onSave={handleSaveChecklist} />;
      case "stats":
        return <StatsPage checklists={checklists} />;
      case "users":
        return <UsersPage />;
      case "profile":
        return <ProfilePage currentUser={currentUser} onLogout={handleLogout} />;
      case "checklist-view":
        return viewChecklist ? <ChecklistView checklist={viewChecklist} /> : null;
      case "checklist-execute":
        return viewChecklist ? <ChecklistExecute checklist={viewChecklist} currentUser={currentUser} onComplete={handleComplete} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar page={page} setPage={setPage} currentUser={currentUser} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}