import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Schedule, ScheduleInput } from "@/api";

interface Props {
  schedules: Schedule[];
  checklistId: number;
  onAdd: (s: ScheduleInput) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function empty(): ScheduleInput {
  return { schedule_type: "recurring", frequency: "weekly", days_of_week: [1, 2, 3, 4, 5], time_of_day: "09:00" };
}

export default function ScheduleBuilder({ schedules, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ScheduleInput>(empty());
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    try { await onAdd(form); setShowForm(false); setForm(empty()); }
    finally { setSaving(false); }
  };

  const activeSchedules = schedules.filter((s) => s.is_active);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Расписание</h3>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-accent hover:text-accent/80 font-medium flex items-center gap-1 transition-colors">
          <Icon name="Plus" size={13} />Добавить
        </button>
      </div>

      {activeSchedules.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">Расписание не настроено</p>
      )}

      {/* Существующие расписания */}
      <div className="space-y-2 mb-3">
        {activeSchedules.map((s) => (
          <div key={s.id} className="flex items-start justify-between bg-muted/40 rounded-lg px-3 py-2.5">
            <div>
              <div className="flex items-center gap-2">
                <Icon name={s.schedule_type === "recurring" ? "RefreshCw" : "Calendar"} size={13} className="text-accent" />
                <span className="text-xs font-medium text-foreground">
                  {s.schedule_type === "recurring" ? formatRecurring(s) : `Однократно: ${s.execution_date}`}
                </span>
              </div>
              {s.time_of_day && <div className="text-xs text-muted-foreground mt-0.5 ml-5">в {s.time_of_day}</div>}
            </div>
            <button onClick={() => onRemove(s.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
              <Icon name="Trash2" size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Форма нового расписания */}
      {showForm && (
        <div className="border border-accent/30 rounded-lg p-4 bg-accent/3 space-y-3 animate-scale-in">
          {/* Тип */}
          <div className="flex gap-2">
            {(["recurring", "one_time"] as const).map((t) => (
              <button key={t} onClick={() => setForm({ ...form, schedule_type: t })}
                className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${form.schedule_type === t ? "bg-accent text-white border-accent" : "border-border text-foreground hover:border-accent/40"}`}>
                {t === "recurring" ? "Повторяющееся" : "Однократное"}
              </button>
            ))}
          </div>

          {form.schedule_type === "recurring" && (
            <>
              {/* Частота */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Частота</label>
                <div className="flex gap-2">
                  {(["daily", "weekly", "monthly"] as const).map((f) => (
                    <button key={f} onClick={() => setForm({ ...form, frequency: f })}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${form.frequency === f ? "bg-accent/10 text-accent border-accent/40" : "border-border text-foreground hover:border-muted-foreground/40"}`}>
                      {{ daily: "Ежедневно", weekly: "Еженедельно", monthly: "Ежемесячно" }[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Дни недели */}
              {form.frequency === "weekly" && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Дни недели</label>
                  <div className="flex gap-1">
                    {DAYS.map((day, idx) => {
                      const dayNum = idx + 1;
                      const sel = (form.days_of_week || []).includes(dayNum);
                      return (
                        <button key={day} onClick={() => {
                          const cur = form.days_of_week || [];
                          setForm({ ...form, days_of_week: sel ? cur.filter((d) => d !== dayNum) : [...cur, dayNum] });
                        }}
                          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${sel ? "bg-accent text-white" : "border border-border text-foreground hover:border-accent/40"}`}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* День месяца */}
              {form.frequency === "monthly" && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Число месяца</label>
                  <input type="number" min={1} max={31} value={form.day_of_month ?? ""}
                    onChange={(e) => setForm({ ...form, day_of_month: Number(e.target.value) })}
                    className="w-20 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40" />
                </div>
              )}

              {/* Время */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Время запуска</label>
                <input type="time" value={form.time_of_day ?? ""}
                  onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}
                  className="px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40" />
              </div>
            </>
          )}

          {form.schedule_type === "one_time" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Дата и время</label>
              <input type="datetime-local" value={form.execution_date ?? ""}
                onChange={(e) => setForm({ ...form, execution_date: e.target.value })}
                className="px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40" />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} disabled={saving}
              className="bg-accent text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-accent/90 disabled:opacity-60 transition-colors">
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors">
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRecurring(s: Schedule): string {
  const freqMap: Record<string, string> = { daily: "Ежедневно", weekly: "Еженедельно", monthly: "Ежемесячно" };
  if (!s.frequency) return "Повторяется";
  let label = freqMap[s.frequency] || s.frequency;
  if (s.frequency === "weekly" && s.days_of_week?.length) {
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    label += ": " + s.days_of_week.map((d) => dayNames[d - 1]).join(", ");
  }
  if (s.frequency === "monthly" && s.day_of_month) {
    label += ` (${s.day_of_month}-е число)`;
  }
  return label;
}
