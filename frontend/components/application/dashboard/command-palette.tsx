"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { Calendar, CornerDownLeft, Home, Search, Settings2 } from "lucide-react";
import { Kbd } from "@/components/base/kbd/kbd";
import { cx } from "@/utils/cx";

type CommandGroup = "Pages" | "Actions";

interface CommandItem {
  id: string;
  label: string;
  group: CommandGroup;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  keywords?: string[];
  onSelect: () => void;
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  onNavigate,
  onOpenSettings,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Section hash without the leading `#`. */
  onNavigate: (section: string) => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<CommandItem[]>(
    () => [
      {
        id: "home",
        label: "Home",
        group: "Pages",
        icon: Home,
        keywords: ["dashboard", "overview", "agenda"],
        onSelect: () => onNavigate("home"),
      },
      {
        id: "calendar",
        label: "Calendar",
        group: "Pages",
        icon: Calendar,
        keywords: ["month", "events", "schedule"],
        onSelect: () => onNavigate("calendar"),
      },
      {
        id: "settings",
        label: "Settings",
        group: "Actions",
        icon: Settings2,
        keywords: ["profile", "account", "preferences"],
        onSelect: onOpenSettings,
      },
    ],
    [onNavigate, onOpenSettings],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      [item.label, ...(item.keywords ?? [])].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      ),
    );
  }, [items, normalizedQuery]);

  const groups = useMemo(() => {
    const grouped = new Map<CommandGroup, CommandItem[]>();
    for (const item of filtered) {
      grouped.set(item.group, [...(grouped.get(item.group) ?? []), item]);
    }
    return [...grouped.entries()];
  }, [filtered]);

  const activeItem = filtered[activeIndex];

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [isOpen, onOpenChange]);

  function select(index: number) {
    const item = filtered[index];
    if (!item) return;
    onOpenChange(false);
    item.onSelect();
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length > 0) setActiveIndex((index) => (index + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
    }
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={({ isEntering, isExiting }) =>
        cx(
          "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-text-primary/30 px-4 pt-[12vh] pb-6 backdrop-blur-sm",
          isEntering && "animate-in fade-in duration-150",
          isExiting && "animate-out fade-out duration-100",
        )
      }
    >
      <Modal
        className={({ isEntering, isExiting }) =>
          cx(
            "w-full max-w-lg outline-none",
            isEntering && "animate-in zoom-in-95 slide-in-from-top-2 duration-150",
            isExiting && "animate-out zoom-out-95 slide-out-to-top-2 duration-100",
          )
        }
      >
        <Dialog
          aria-label="Search pages and actions"
          className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-xl outline-none"
        >
          <div className="flex items-center gap-2 border-b border-separator-border px-3">
            <Search className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-list"
              aria-activedescendant={activeItem ? `command-palette-${activeItem.id}` : undefined}
              aria-autocomplete="list"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search pages and actions…"
              className="h-12 min-w-0 flex-1 bg-transparent text-body-medium text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <Kbd>Esc</Kbd>
          </div>

          <div
            ref={listRef}
            id="command-palette-list"
            role="listbox"
            aria-label="Search results"
            className="max-h-80 overflow-y-auto p-2"
          >
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-body-regular text-text-tertiary">
                No results for “{query.trim()}”
              </p>
            ) : (
              groups.map(([group, groupItems]) => (
                <div key={group} role="group" aria-label={group}>
                  <p className="px-2 pt-2 pb-1 text-caption-1-semibold text-text-tertiary">
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const index = filtered.indexOf(item);
                    const isActive = index === activeIndex;
                    return (
                      <div
                        key={item.id}
                        id={`command-palette-${item.id}`}
                        role="option"
                        aria-selected={isActive}
                        tabIndex={-1}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => select(index)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            select(index);
                          }
                        }}
                        className={cx(
                          "flex cursor-pointer items-center gap-2 rounded-xl p-2 transition-colors",
                          isActive ? "bg-background-secondary-hover" : "bg-transparent",
                        )}
                      >
                        <span
                          className={cx(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg",
                            isActive
                              ? "bg-background-tertiary-hover text-foreground-icon-primary"
                              : "bg-background-tertiary-default text-foreground-icon-secondary",
                          )}
                          aria-hidden
                        >
                          <item.icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">
                          {item.label}
                        </span>
                        {isActive && (
                          <Kbd className="px-1.5">
                            <CornerDownLeft className="size-3.5" aria-hidden />
                          </Kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-separator-border px-3 py-2">
            <span className="flex items-center gap-1 text-caption-1-regular text-text-tertiary">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1 text-caption-1-regular text-text-tertiary">
              <Kbd className="px-1.5">
                <CornerDownLeft className="size-3.5" aria-hidden />
              </Kbd>
              Open
            </span>
            <span className="ms-auto flex items-center gap-1 text-caption-1-regular text-text-tertiary">
              <Kbd>Esc</Kbd>
              Close
            </span>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
