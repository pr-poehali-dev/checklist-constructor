import Icon from "@/components/ui/icon";
import type { ChecklistItem, ItemResponse, ItemType } from "@/api";

interface Props {
  item: ChecklistItem;
  response: ItemResponse | undefined;
  onChange: (resp: ItemResponse) => void;
  disabled?: boolean;
  error?: string;
}

export default function ItemRenderer({ item, response, onChange, disabled, error }: Props) {
  const value = response?.value ?? null;

  const emit = (val: ItemResponse["value"]) =>
    onChange({ item_id: item.id, item_type: item.item_type, value: val });

  return (
    <div className={`border-b border-border last:border-0 px-5 py-4 ${disabled ? "" : ""}`}>
      <div className="flex items-start gap-3">
        <TypeIcon type={item.item_type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-foreground">{item.text}</span>
            {item.is_required && <span className="text-destructive text-xs">*</span>}
            {item.unit && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.unit}</span>}
          </div>

          {/* BOOLEAN TOGGLE */}
          {item.item_type === "boolean" && (
            <button
              onClick={() => !disabled && emit(!value)}
              className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-accent" : "bg-border"} ${disabled ? "opacity-60 cursor-default" : "cursor-pointer"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
            </button>
          )}

          {/* NUMERIC INPUT */}
          {item.item_type === "numeric" && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={value !== null && value !== undefined ? String(value) : ""}
                onChange={(e) => emit(e.target.value === "" ? null : Number(e.target.value))}
                disabled={disabled}
                placeholder={item.min_value !== null && item.max_value !== null
                  ? `${item.min_value} — ${item.max_value}`
                  : "Введите число"
                }
                className="w-36 px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition disabled:opacity-60"
              />
              {(item.min_value !== null || item.max_value !== null) && (
                <span className="text-xs text-muted-foreground">
                  {item.min_value !== null && `от ${item.min_value}`}
                  {item.min_value !== null && item.max_value !== null && " "}
                  {item.max_value !== null && `до ${item.max_value}`}
                  {item.unit ? ` ${item.unit}` : ""}
                </span>
              )}
            </div>
          )}

          {/* SINGLE CHOICE */}
          {item.item_type === "single_choice" && (
            <div className="space-y-2">
              {(item.options || []).map((opt) => (
                <label key={opt.value} className={`flex items-center gap-3 cursor-pointer group ${disabled ? "opacity-60 cursor-default" : ""}`}>
                  <div
                    onClick={() => !disabled && emit(opt.value)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${value === opt.value ? "border-accent bg-accent" : "border-border group-hover:border-accent/50"}`}
                  >
                    {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-foreground">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {/* MULTIPLE CHOICE */}
          {item.item_type === "multiple_choice" && (
            <div className="space-y-2">
              {(item.options || []).map((opt) => {
                const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
                return (
                  <label key={opt.value} className={`flex items-center gap-3 cursor-pointer group ${disabled ? "opacity-60 cursor-default" : ""}`}>
                    <div
                      onClick={() => {
                        if (disabled) return;
                        const current: string[] = Array.isArray(value) ? [...(value as string[])] : [];
                        const next = selected ? current.filter((v) => v !== opt.value) : [...current, opt.value];
                        emit(next);
                      }}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "border-accent bg-accent" : "border-border group-hover:border-accent/50"}`}
                    >
                      {selected && <Icon name="Check" size={10} className="text-white" />}
                    </div>
                    <span className="text-sm text-foreground">{opt.text}</span>
                  </label>
                );
              })}
            </div>
          )}

          {error && <p className="text-destructive text-xs mt-1.5">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: ItemType }) {
  const map: Record<ItemType, { icon: string; color: string }> = {
    boolean: { icon: "ToggleLeft", color: "text-accent" },
    numeric: { icon: "Hash", color: "text-blue-500" },
    single_choice: { icon: "CircleDot", color: "text-purple-500" },
    multiple_choice: { icon: "CheckSquare", color: "text-green-600" },
  };
  const { icon, color } = map[type] || map.boolean;
  return (
    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
      <Icon name={icon} fallback="Circle" size={14} className={color} />
    </div>
  );
}
