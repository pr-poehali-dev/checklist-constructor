import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { ChecklistItemInput, ItemType } from "@/api";

interface Props {
  items: ChecklistItemInput[];
  onChange: (items: ChecklistItemInput[]) => void;
}

const TYPE_LABELS: Record<ItemType, string> = {
  boolean: "Да / Нет",
  numeric: "Число",
  single_choice: "Один вариант",
  multiple_choice: "Несколько вариантов",
};

const TYPE_ICONS: Record<ItemType, string> = {
  boolean: "ToggleLeft",
  numeric: "Hash",
  single_choice: "CircleDot",
  multiple_choice: "CheckSquare",
};

function emptyItem(): ChecklistItemInput {
  return { text: "", item_type: "boolean", options: [], is_required: false };
}

export default function ItemBuilder({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const update = (i: number, patch: Partial<ChecklistItemInput>) => {
    const next = items.map((it, idx) => idx === i ? { ...it, ...patch } : it);
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, emptyItem()]);
    setExpanded(items.length);
  };

  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
    setExpanded(null);
  };

  const addOption = (i: number) => {
    const cur = items[i].options || [];
    update(i, { options: [...cur, { text: "", value: String(cur.length) }] });
  };

  const updateOption = (itemIdx: number, optIdx: number, text: string) => {
    const opts = [...(items[itemIdx].options || [])];
    opts[optIdx] = { ...opts[optIdx], text, value: String(optIdx) };
    update(itemIdx, { options: opts });
  };

  const removeOption = (itemIdx: number, optIdx: number) => {
    const opts = (items[itemIdx].options || []).filter((_, idx) => idx !== optIdx);
    update(itemIdx, { options: opts });
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className={`border rounded-lg transition-colors ${expanded === i ? "border-accent/40 bg-accent/3" : "border-border bg-card"}`}>
          {/* Заголовок пункта */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="w-5 h-5 rounded-sm border border-border flex items-center justify-center shrink-0">
              <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>
            </div>
            <input
              value={item.text}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder={`Пункт ${i + 1}...`}
              className="flex-1 px-2 py-1 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1 shrink-0">
              {/* Тип */}
              <select
                value={item.item_type}
                onChange={(e) => update(i, { item_type: e.target.value as ItemType })}
                className="text-xs border border-border rounded px-1.5 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
              >
                {(Object.keys(TYPE_LABELS) as ItemType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
              {/* Обязателен */}
              <button
                title={item.is_required ? "Обязательный" : "Необязательный"}
                onClick={() => update(i, { is_required: !item.is_required })}
                className={`p-1.5 rounded transition-colors ${item.is_required ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name="AlertCircle" size={14} />
              </button>
              {/* Настройки */}
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name={expanded === i ? "ChevronUp" : "Settings2"} size={14} />
              </button>
              {/* Удалить */}
              {items.length > 1 && (
                <button onClick={() => remove(i)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <Icon name="X" size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Расширенные настройки */}
          {expanded === i && (
            <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
              {/* Numeric: min/max/unit */}
              {item.item_type === "numeric" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Минимум</label>
                    <input
                      type="number"
                      value={item.min_value ?? ""}
                      onChange={(e) => update(i, { min_value: e.target.value !== "" ? Number(e.target.value) : null })}
                      className="w-24 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Максимум</label>
                    <input
                      type="number"
                      value={item.max_value ?? ""}
                      onChange={(e) => update(i, { max_value: e.target.value !== "" ? Number(e.target.value) : null })}
                      className="w-24 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Единица измерения</label>
                    <input
                      value={item.unit ?? ""}
                      onChange={(e) => update(i, { unit: e.target.value })}
                      placeholder="°C, шт., кг…"
                      className="w-28 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                    />
                  </div>
                </div>
              )}

              {/* Single/Multiple: варианты */}
              {(item.item_type === "single_choice" || item.item_type === "multiple_choice") && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">Варианты ответа</label>
                  <div className="space-y-1.5">
                    {(item.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Icon name={item.item_type === "single_choice" ? "CircleDot" : "CheckSquare"} size={12} className="text-muted-foreground shrink-0" />
                        <input
                          value={opt.text}
                          onChange={(e) => updateOption(i, oi, e.target.value)}
                          placeholder={`Вариант ${oi + 1}`}
                          className="flex-1 px-2 py-1 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                        />
                        <button onClick={() => removeOption(i, oi)} className="text-muted-foreground hover:text-destructive p-1">
                          <Icon name="X" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addOption(i)} className="mt-2 text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
                    <Icon name="Plus" size={12} />Добавить вариант
                  </button>
                </div>
              )}

              {/* Подпись типа */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name={TYPE_ICONS[item.item_type]} fallback="Circle" size={12} />
                <span>{TYPE_LABELS[item.item_type]}</span>
                {item.is_required && <span className="text-destructive ml-1">· Обязательный</span>}
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={addItem} className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors">
        <Icon name="Plus" size={14} />Добавить пункт
      </button>
    </div>
  );
}
