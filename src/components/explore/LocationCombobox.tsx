"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./Explore.module.css";

export type LocationOption = {
  value: string;
  label: string;
  badge?: string;
  meta?: string;
};

type LocationComboboxProps = {
  label: string;
  value: string;
  options: LocationOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  loading?: boolean;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function LocationCombobox({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled = false,
  loading = false,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = normalize(search);
    if (!term) return options;
    return options.filter((option) =>
      normalize([option.label, option.badge, option.meta].filter(Boolean).join(" ")).includes(term),
    );
  }, [options, search]);

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function choose(option: LocationOption) {
    onChange(option.value);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className={styles.comboField}>
      <span className={styles.comboLabel}>{label}</span>
      <div className={styles.comboRoot} ref={rootRef}>
        <button
          type="button"
          className={styles.comboTrigger}
          data-open={open}
          disabled={disabled}
          onClick={() => !disabled && setOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={styles.comboSelection}>
            {selected?.badge && (
              <b className={styles.comboBadge}>
                {selected.badge.startsWith("http") ? <img src={selected.badge} alt="" /> : selected.badge}
              </b>
            )}
            <span>{loading ? "Carregando..." : selected?.label || placeholder}</span>
          </span>
          <span className={styles.comboChevron} aria-hidden="true" />
        </button>

        {open && (
          <div className={styles.comboMenu}>
            <div className={styles.comboSearch}>
              <Icon name="search" />
              <input
                ref={inputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </div>

            <div className={styles.comboList} role="listbox">
              {filtered.length === 0 ? (
                <div className={styles.comboEmpty}>Nenhum local encontrado.</div>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value || "__all__"}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={styles.comboOption}
                    data-selected={option.value === value}
                    onClick={() => choose(option)}
                  >
                    <span className={styles.comboOptionMain}>
                      {option.badge && (
                        <b className={styles.comboBadge}>
                          {option.badge.startsWith("http") ? <img src={option.badge} alt="" /> : option.badge}
                        </b>
                      )}
                      <span>{option.label}</span>
                    </span>
                    {option.meta && <small>{option.meta}</small>}
                    {option.value === value && <Icon name="check" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
