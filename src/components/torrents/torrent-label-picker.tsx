import { useId, useRef, useState } from "react"
import { ChevronDown, Plus, Tag, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

export function TorrentLabelPicker({
  labels,
  onChange,
  availableLabels,
  disabled = false,
  loading = false,
  loadFailed = false
}: {
  labels: string[]
  onChange: (labels: string[]) => void
  availableLabels: string[]
  disabled?: boolean
  loading?: boolean
  loadFailed?: boolean
}) {
  const { t } = useI18n()
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const value = draft.trim()
  const existing = Array.from(new Set(availableLabels))
  const options = existing
    .filter(
      (label) =>
        !labels.includes(label) &&
        label.toLowerCase().includes(value.toLowerCase())
    )
    .map((label) => ({ label, create: false }))
  if (value && !existing.includes(value) && !labels.includes(value))
    options.push({ label: value, create: true })
  const addLabel = (label: string) => {
    const trimmed = label.trim()
    if (disabled || !trimmed || labels.includes(trimmed)) return
    onChange([...labels, trimmed])
    setDraft("")
    setActiveIndex(-1)
    input.current?.focus()
  }

  return (
    <div
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="flex flex-wrap gap-2 rounded-2xl border border-muted/30 bg-muted/20 p-3">
        {labels.map((label) => (
          <span
            key={label}
            className="flex min-w-0 items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary"
          >
            <Tag className="size-3 shrink-0" />
            <span className="break-all">{label}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={t("common.remove_label", { label })}
              onClick={() => onChange(labels.filter((item) => item !== label))}
              className="rounded p-1 hover:bg-primary/15 disabled:opacity-50"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <div className="flex min-w-0 basis-full items-center gap-1">
          <Input
            ref={input}
            role="combobox"
            aria-label={t("common.choose_or_create_label")}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={open && !disabled}
            aria-controls={open && !disabled ? listId : undefined}
            aria-activedescendant={
              open && activeIndex >= 0 && activeIndex < options.length
                ? `${listId}-${activeIndex}`
                : undefined
            }
            value={draft}
            disabled={disabled}
            placeholder={t("common.choose_or_create_label")}
            className="min-w-0 flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
            onFocus={() => {
              setOpen(true)
              setActiveIndex(-1)
            }}
            onChange={(event) => {
              setDraft(event.target.value)
              setActiveIndex(-1)
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault()
                setOpen(true)
                setActiveIndex((previous) =>
                  options.length
                    ? event.key === "ArrowDown"
                      ? (previous + 1) % options.length
                      : previous <= 0
                        ? options.length - 1
                        : previous - 1
                    : -1
                )
              } else if (event.key === "Enter") {
                event.preventDefault()
                if (open && activeIndex >= 0 && options[activeIndex])
                  addLabel(options[activeIndex].label)
                else if (value) addLabel(value)
              } else if (event.key === "Escape" && open) {
                event.preventDefault()
                event.stopPropagation()
                setOpen(false)
              } else if (event.key === "Backspace" && !draft && labels.length) {
                onChange(labels.slice(0, -1))
              }
            }}
          />
          <button
            type="button"
            disabled={disabled}
            aria-label={t("common.show_existing_labels")}
            aria-expanded={open && !disabled}
            aria-controls={listId}
            onClick={() => {
              setOpen((previous) => !previous)
              setActiveIndex(-1)
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            disabled={disabled || !value || labels.includes(value)}
            aria-label={t("common.add_label")}
            onClick={() => addLabel(value)}
            className="rounded-lg p-2 text-primary hover:bg-primary/10 disabled:opacity-30"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      {open && !disabled && (
        <div className="rounded-xl border bg-popover p-1 text-popover-foreground shadow-sm">
          {loading && (
            <p
              role="status"
              className="px-3 py-2 text-xs text-muted-foreground"
            >
              {t("common.loading_labels")}
            </p>
          )}
          {loadFailed && (
            <p
              role="status"
              className="px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            >
              {t("common.load_labels_failed")}
            </p>
          )}
          <div
            id={listId}
            role="listbox"
            aria-label={t("common.available_labels")}
            className="max-h-48 overflow-y-auto"
          >
            {options.map((option, index) => (
              <button
                key={option.label}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addLabel(option.label)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent",
                  activeIndex === index && "bg-accent"
                )}
              >
                {option.create ? (
                  <Plus className="size-4 shrink-0" />
                ) : (
                  <Tag className="size-4 shrink-0" />
                )}
                <span className="break-all">
                  {option.create
                    ? t("common.create_label", { label: option.label })
                    : option.label}
                </span>
              </button>
            ))}
          </div>
          {!loading && !loadFailed && options.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {t("common.no_more_labels")}
            </p>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t("common.label_picker_hint")}
      </p>
    </div>
  )
}
