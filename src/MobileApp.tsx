import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import {
  apiLogin, apiMe, apiLogout,
  apiGetMyAssignments, apiToggleItem, apiSubmitAssignment,
  type User, type AssignmentDetail, type ItemResponse, type ChecklistItem,
} from "./api";
import { addToOfflineQueue, getOfflineQueue, isOnline } from "./pwa";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type MobilePage =
  | "login" | "dashboard" | "execute" | "done";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  assigned: "Новое", in_progress: "В работе", completed: "Завершено",
};
const statusBg: Record<string, string> = {
  assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
};
const categoryEmoji: Record<string, string> = {
  HR: "👥", ИТ: "💻", Финансы: "📊", Прочее: "📋",
};

// ─── OFFLINE BADGE ────────────────────────────────────────────────────────────

function OfflineBanner() {
  const [online, setOnline] = useState(isOnline());
  const [queue, setQueue] = useState(getOfflineQueue().length);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setQueue(getOfflineQueue().length); };
    const handleOffline = () => setOnline(false);
    const handleSync = () => setQueue(getOfflineQueue().length);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('cf:queue-synced', handleSync);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('cf:queue-synced', handleSync);
    };
  }, []);

  if (online && queue === 0) return null;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-xs font-medium ${online ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
      <Icon name={online ? "CloudUpload" : "WifiOff"} size={13} />
      {online
        ? `Синхронизируем ${queue} ответ(а)…`
        : "Оффлайн — ответы сохранены локально"}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function MobileLogin({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      const user = await apiLogin(email.trim().toLowerCase(), password);
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Logo zone */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
          <Icon name="CheckSquare" size={30} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-1.5">CheckFlow</h1>
        <p className="text-slate-400 text-sm">Корпоративные чек-листы</p>
      </div>

      {/* Form */}
      <div className="px-5 pb-10">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-slate-800 border border-slate-700 text-white text-base placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-slate-800 border border-slate-700 text-white text-base placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm px-1">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full h-14 rounded-2xl bg-blue-500 text-white font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Входим…
              </span>
            ) : "Войти"}
          </button>
        </form>

        {/* Demo hint */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
          <p className="text-slate-400 text-xs mb-2 font-medium uppercase tracking-wide">Тестовые аккаунты</p>
          <div className="space-y-1">
            {[
              { email: "kozlova@corp.ru", name: "Мария Козлова" },
              { email: "petrov@corp.ru", name: "Дмитрий Петров" },
              { email: "smirnov@corp.ru", name: "Андрей Смирнов" },
            ].map((u) => (
              <button
                key={u.email}
                onClick={() => { setEmail(u.email); setPassword("password123"); setError(""); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-sm text-white">{u.name}</span>
                <span className="text-xs text-slate-500">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function MobileDashboard({
  user,
  assignments,
  loading,
  onSelect,
  onLogout,
  onRefresh,
}: {
  user: User;
  assignments: AssignmentDetail[];
  loading: boolean;
  onSelect: (a: AssignmentDetail) => void;
  onLogout: () => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const filtered = assignments.filter((a) => {
    if (filter === "active") return a.status !== "completed";
    if (filter === "done") return a.status === "completed";
    return true;
  });

  const overdue = assignments.filter(
    (a) => a.status !== "completed" && a.assigned_at < new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
  );

  const active = assignments.filter((a) => a.status !== "completed");
  const done = assignments.filter((a) => a.status === "completed");

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-safe pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-slate-400 text-sm">Привет,</p>
            <h1 className="text-xl font-bold text-white">{user.name.split(" ")[0]} 👋</h1>
          </div>
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center active:scale-95 transition"
          >
            <Icon name="LogOut" size={17} className="text-slate-400" />
          </button>
        </div>
      </div>

      <OfflineBanner />

      {/* Stats strip */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Всего", val: assignments.length, icon: "ClipboardList", color: "text-slate-300" },
            { label: "В работе", val: active.length, icon: "Clock", color: "text-amber-400" },
            { label: "Готово", val: done.length, icon: "CheckCircle2", color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-2xl p-3.5 text-center">
              <Icon name={s.icon} fallback="Circle" size={18} className={`${s.color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-white">{s.val}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="mx-5 mb-4 flex items-center gap-3 bg-red-500/15 border border-red-500/30 rounded-2xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <Icon name="AlertTriangle" size={16} className="text-red-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-red-400">Просроченных: {overdue.length}</div>
            <div className="text-xs text-red-400/70">Выполните как можно скорее</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-5 mb-4">
        <div className="flex bg-slate-800 rounded-2xl p-1 gap-1">
          {(["all", "active", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 h-9 rounded-xl text-sm font-medium transition-all ${filter === f ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30" : "text-slate-400"}`}
            >
              {{ all: "Все", active: "Активные", done: "Готовые" }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Icon name="CheckSquare" size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">
              {filter === "done" ? "Завершённых нет" : "Нет активных заданий"}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {filter === "done" ? "Завершайте чек-листы и они появятся здесь" : "Вы всё выполнили! 🎉"}
            </p>
          </div>
        ) : (
          filtered.map((a) => (
            <TaskCard key={a.assignment_id} assignment={a} onTap={() => onSelect(a)} />
          ))
        )}

        {/* Pull to refresh hint */}
        <button onClick={onRefresh} className="w-full flex items-center justify-center gap-2 py-3 text-slate-600 text-sm">
          <Icon name="RefreshCw" size={13} />Обновить список
        </button>
      </div>
    </div>
  );
}

function TaskCard({ assignment: a, onTap }: { assignment: AssignmentDetail; onTap: () => void }) {
  const progress = a.progress || 0;
  const isOverdue = a.status !== "completed" && a.assigned_at < new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const emoji = categoryEmoji[a.category] || "📋";

  return (
    <button
      onClick={onTap}
      className={`w-full text-left bg-slate-800 rounded-2xl p-4 active:scale-[0.98] transition-all ${isOverdue ? "border border-red-500/40" : "border border-slate-700/50"}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-700/60 flex items-center justify-center text-xl shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-white text-sm leading-snug">{a.title}</h3>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${isOverdue ? "bg-red-500/15 text-red-400 border border-red-500/30" : statusBg[a.status]}`}>
              {isOverdue ? "Просрочено" : statusLabel[a.status]}
            </span>
          </div>

          {a.description && (
            <p className="text-slate-500 text-xs mb-2 line-clamp-1">{a.description}</p>
          )}

          {a.status !== "completed" ? (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{a.items.filter(i => i.done).length} из {a.items.length} пунктов</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <Icon name="CheckCircle2" size={13} />
              <span>Завершено {a.completed_at}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── STEP RENDERER ────────────────────────────────────────────────────────────

function StepRenderer({
  item,
  response,
  onChange,
}: {
  item: ChecklistItem;
  response: ItemResponse | undefined;
  onChange: (r: ItemResponse) => void;
}) {
  const val = response?.value ?? null;
  const emit = (v: ItemResponse["value"]) => onChange({ item_id: item.id, item_type: item.item_type, value: v });

  return (
    <div className="flex-1 flex flex-col">
      {/* Question */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white leading-snug">{item.text}</h2>
        {item.unit && (
          <span className="inline-block mt-2 px-2.5 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg">{item.unit}</span>
        )}
        {item.is_required && (
          <span className="inline-block mt-2 ml-2 text-red-400 text-xs">* обязательный</span>
        )}
      </div>

      {/* BOOLEAN */}
      {item.item_type === "boolean" && (
        <div className="flex gap-3">
          <button
            onClick={() => emit(true)}
            className={`flex-1 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 font-semibold text-base ${val === true ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-slate-800 text-slate-300 border border-slate-700"}`}
          >
            <Icon name="Check" size={24} />
            Да
          </button>
          <button
            onClick={() => emit(false)}
            className={`flex-1 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 font-semibold text-base ${val === false ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-slate-800 text-slate-300 border border-slate-700"}`}
          >
            <Icon name="X" size={24} />
            Нет
          </button>
        </div>
      )}

      {/* NUMERIC */}
      {item.item_type === "numeric" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-800 rounded-2xl p-3 border border-slate-700">
            <button
              onClick={() => emit(val !== null ? Number(val) - 1 : (item.min_value ?? 0) - 1)}
              className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-white text-xl active:scale-90 transition shrink-0"
            >−</button>
            <input
              type="number"
              inputMode="decimal"
              value={val !== null && val !== undefined ? String(val) : ""}
              onChange={(e) => emit(e.target.value === "" ? null : Number(e.target.value))}
              placeholder={item.min_value !== null && item.max_value !== null ? `${item.min_value}–${item.max_value}` : "0"}
              className="flex-1 h-12 text-center text-2xl font-bold text-white bg-transparent focus:outline-none placeholder:text-slate-600"
            />
            <button
              onClick={() => emit(val !== null ? Number(val) + 1 : (item.min_value ?? 0) + 1)}
              className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-white text-xl active:scale-90 transition shrink-0"
            >+</button>
          </div>

          {/* Range hint */}
          {(item.min_value !== null || item.max_value !== null) && (
            <div className="flex justify-between text-xs text-slate-500 px-1">
              {item.min_value !== null && <span>Минимум: {item.min_value}{item.unit ? ` ${item.unit}` : ""}</span>}
              {item.max_value !== null && <span>Максимум: {item.max_value}{item.unit ? ` ${item.unit}` : ""}</span>}
            </div>
          )}

          {/* Validation inline */}
          {val !== null && val !== "" && item.min_value !== null && Number(val) < item.min_value && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={14} />
              Значение меньше минимального ({item.min_value}{item.unit ? ` ${item.unit}` : ""})
            </div>
          )}
          {val !== null && val !== "" && item.max_value !== null && Number(val) > item.max_value && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={14} />
              Значение больше максимального ({item.max_value}{item.unit ? ` ${item.unit}` : ""})
            </div>
          )}
        </div>
      )}

      {/* SINGLE CHOICE */}
      {item.item_type === "single_choice" && (
        <div className="space-y-2.5">
          {(item.options || []).map((opt) => (
            <button
              key={opt.value}
              onClick={() => emit(opt.value)}
              className={`w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left transition-all active:scale-[0.98] ${val === opt.value ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-slate-800 text-slate-200 border border-slate-700"}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${val === opt.value ? "border-white" : "border-slate-500"}`}>
                {val === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="font-medium">{opt.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* MULTIPLE CHOICE */}
      {item.item_type === "multiple_choice" && (
        <div className="space-y-2.5">
          {(item.options || []).map((opt) => {
            const selected = Array.isArray(val) && (val as string[]).includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => {
                  const cur: string[] = Array.isArray(val) ? [...(val as string[])] : [];
                  emit(selected ? cur.filter((v) => v !== opt.value) : [...cur, opt.value]);
                }}
                className={`w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left transition-all active:scale-[0.98] ${selected ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-slate-800 text-slate-200 border border-slate-700"}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "border-white bg-white/20" : "border-slate-500"}`}>
                  {selected && <Icon name="Check" size={12} className="text-white" />}
                </div>
                <span className="font-medium">{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EXECUTE ─────────────────────────────────────────────────────────────────

function MobileExecute({
  assignment,
  onDone,
  onBack,
}: {
  assignment: AssignmentDetail;
  onDone: (title: string) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<ItemResponse[]>(() =>
    assignment.items.map((it) => ({
      item_id: it.id,
      item_type: it.item_type,
      value: it.item_type === "boolean" ? (it.done ?? null) : (
        assignment.responses?.find((r) => r.item_id === it.id)?.value ?? null
      ),
    }))
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = assignment.items;
  const currentItem = items[step];
  const currentResp = responses.find((r) => r.item_id === currentItem?.id);
  const isLast = step === items.length - 1;
  const isCompleted = assignment.status === "completed";

  const updateResp = useCallback((resp: ItemResponse) => {
    setResponses((prev) => {
      const idx = prev.findIndex((r) => r.item_id === resp.item_id);
      if (idx >= 0) { const n = [...prev]; n[idx] = resp; return n; }
      return [...prev, resp];
    });
    setErrors([]);
    // sync boolean toggle silently
    if (resp.item_type === "boolean" && !isCompleted) {
      apiToggleItem(assignment.assignment_id, resp.item_id, Boolean(resp.value)).catch(() => {});
    }
  }, [assignment, isCompleted]);

  const canContinue = (() => {
    if (!currentItem) return false;
    if (!currentItem.is_required) return true;
    const v = currentResp?.value;
    if (currentItem.item_type === "boolean") return v !== null;
    return v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  })();

  const hasNumericError = (() => {
    if (!currentItem || currentItem.item_type !== "numeric") return false;
    const v = currentResp?.value;
    if (v === null || v === "") return false;
    const num = Number(v);
    if (currentItem.min_value !== null && num < currentItem.min_value) return true;
    if (currentItem.max_value !== null && num > currentItem.max_value) return true;
    return false;
  })();

  const handleNext = () => {
    if (hasNumericError) return;
    if (isLast) { setShowConfirm(true); return; }
    setStep((s) => s + 1);
    containerRef.current?.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setShowConfirm(false);
    setErrors([]);
    try {
      if (!isOnline()) {
        // Сохраняем офлайн
        addToOfflineQueue({ assignment_id: assignment.assignment_id, responses });
        onDone(assignment.title);
        return;
      }
      const result = await apiSubmitAssignment(assignment.assignment_id, responses);
      if ("errors" in result) {
        setErrors(result.errors);
        setSubmitting(false);
        // Переходим к первому пункту с ошибкой
        const errText = result.errors[0] || "";
        const errIdx = items.findIndex((it) => errText.includes(it.text));
        if (errIdx >= 0) setStep(errIdx);
      } else {
        onDone(assignment.title);
      }
    } catch {
      // Офлайн fallback
      addToOfflineQueue({ assignment_id: assignment.assignment_id, responses });
      onDone(assignment.title);
    }
  };

  const answeredCount = responses.filter((r) => {
    if (r.item_type === "boolean") return r.value !== null;
    return r.value !== null && r.value !== "" && !(Array.isArray(r.value) && (r.value as string[]).length === 0);
  }).length;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-safe pt-4 pb-3 flex items-center gap-3 bg-[#0f172a] sticky top-0 z-10 border-b border-slate-800">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition shrink-0">
          <Icon name="ChevronLeft" size={20} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs truncate">{assignment.title}</p>
          <p className="text-white text-xs font-semibold">Пункт {step + 1} из {items.length}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-blue-400 text-sm font-bold">{answeredCount}/{items.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
          style={{ width: `${((step + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="px-4 py-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {items.map((_, i) => {
          const r = responses.find((rr) => rr.item_id === items[i].id);
          const answered = r && r.value !== null && r.value !== "" && !(Array.isArray(r.value) && (r.value as string[]).length === 0);
          return (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`shrink-0 transition-all ${i === step ? "w-5 h-2 rounded-full bg-blue-500" : answered ? "w-2 h-2 rounded-full bg-emerald-500" : "w-2 h-2 rounded-full bg-slate-700"}`}
            />
          );
        })}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mx-4 mb-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-1">
            <Icon name="AlertCircle" size={14} />Исправьте ошибки
          </div>
          {errors.map((e, i) => <p key={i} className="text-red-400/80 text-xs">{e}</p>)}
        </div>
      )}

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 pt-4 pb-4 flex flex-col">
        {currentItem && (
          <StepRenderer
            item={currentItem}
            response={currentResp}
            onChange={updateResp}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="px-4 pb-safe pb-6 pt-3 bg-[#0f172a] border-t border-slate-800 flex gap-3">
        <button
          onClick={() => { setStep((s) => Math.max(0, s - 1)); containerRef.current?.scrollTo(0, 0); }}
          disabled={step === 0}
          className="h-14 px-5 rounded-2xl bg-slate-800 text-white font-semibold disabled:opacity-40 active:scale-95 transition flex items-center gap-2"
        >
          <Icon name="ChevronLeft" size={18} />
          Назад
        </button>

        <button
          onClick={handleNext}
          disabled={(!canContinue && currentItem?.is_required) || hasNumericError}
          className={`flex-1 h-14 rounded-2xl font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 ${isLast ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-blue-500 shadow-lg shadow-blue-500/20"}`}
        >
          {isLast ? (
            <>
              <Icon name="CheckCircle" size={18} />
              Завершить
            </>
          ) : (
            <>
              Далее
              <Icon name="ChevronRight" size={18} />
            </>
          )}
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="w-full bg-slate-900 rounded-t-3xl p-6 pb-safe pb-8 animate-slide-up">
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 mx-auto">
              <Icon name="CheckCircle2" size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Завершить чек-лист?</h2>
            <p className="text-slate-400 text-sm text-center mb-6">
              Все ответы будут отправлены. Это действие нельзя отменить.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-semibold text-base active:scale-95 transition shadow-lg shadow-emerald-500/30"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Отправляем…
                  </span>
                ) : "Да, отправить"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full h-12 rounded-2xl text-slate-400 font-medium active:scale-95 transition"
              >
                Вернуться к ответам
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DONE SCREEN ─────────────────────────────────────────────────────────────

function MobileDone({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-scale-in">
        <Icon name="CheckCircle2" size={48} className="text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-3">Отлично!</h1>
      <p className="text-slate-400 text-base mb-2">
        Чек-лист успешно завершён
      </p>
      <p className="text-slate-500 text-sm mb-10 leading-relaxed max-w-xs">
        «{title}»
      </p>

      {!isOnline() && (
        <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-2xl px-4 py-3 mb-6 text-amber-400 text-sm">
          <Icon name="WifiOff" size={15} />
          Ответы сохранены. Отправим автоматически при восстановлении сети.
        </div>
      )}

      <button
        onClick={onBack}
        className="w-full max-w-xs h-14 rounded-2xl bg-blue-500 text-white font-semibold text-base active:scale-95 transition shadow-lg shadow-blue-500/30"
      >
        К списку задач
      </button>
    </div>
  );
}

// ─── MOBILE APP ───────────────────────────────────────────────────────────────

export default function MobileApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState<MobilePage>("dashboard");
  const [assignments, setAssignments] = useState<AssignmentDetail[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetail | null>(null);
  const [doneTitle, setDoneTitle] = useState("");

  // Проверка сессии
  useEffect(() => {
    apiMe().then((u) => { if (u) setUser(u); }).finally(() => setAuthChecked(false));
    // маленькая задержка чтобы PWA не мигал
    const t = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(t);
  }, []);

  const loadTasks = useCallback(() => {
    if (!user) return;
    setLoadingTasks(true);
    apiGetMyAssignments().then(setAssignments).finally(() => setLoadingTasks(false));
  }, [user]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleLogin = (u: User) => { setUser(u); setPage("dashboard"); };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setPage("dashboard");
    setAssignments([]);
  };

  const handleSelect = (a: AssignmentDetail) => {
    if (a.status === "completed") return;
    setSelectedAssignment(a);
    setPage("execute");
  };

  const handleDone = (title: string) => {
    setDoneTitle(title);
    setPage("done");
    loadTasks(); // refresh in background
  };

  const handleBackToDashboard = () => {
    setPage("dashboard");
    setSelectedAssignment(null);
    loadTasks();
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center">
            <Icon name="CheckSquare" size={22} className="text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return <MobileLogin onLogin={handleLogin} />;

  if (page === "execute" && selectedAssignment) {
    return (
      <MobileExecute
        assignment={selectedAssignment}
        onDone={handleDone}
        onBack={() => setPage("dashboard")}
      />
    );
  }

  if (page === "done") {
    return <MobileDone title={doneTitle} onBack={handleBackToDashboard} />;
  }

  return (
    <MobileDashboard
      user={user}
      assignments={assignments}
      loading={loadingTasks}
      onSelect={handleSelect}
      onLogout={handleLogout}
      onRefresh={loadTasks}
    />
  );
}
