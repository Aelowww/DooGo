"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check, MapPin, X } from "@phosphor-icons/react";
import { cx } from "./ui";
import styles from "./city-select.module.css";

/**
 * Dropdown that picks several cities. The first one picked is treated as the patient's city.
 * Selected cities show as removable tags in the closed field.
 */
export function CityMultiSelect({ value, onChange, options, max, placeholder = "Select cities" }: {
  value: string[];
  onChange: (cities: string[]) => void;
  options: readonly string[];
  max: number;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const full = value.length >= max;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(city: string) {
    if (value.includes(city)) onChange(value.filter((item) => item !== city));
    else if (!full) onChange([...value, city]);
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        role="button"
        tabIndex={0}
        className={cx(styles.field, open && styles.fieldOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {value.length === 0
          ? <span className={styles.placeholder}>{placeholder}</span>
          : (
            <span className={styles.tags}>
              {value.map((city, index) => (
                <span key={city} className={cx(styles.tag, index === 0 && styles.tagPrimary)}>
                  {index === 0 && <MapPin size={12} weight="fill" />}
                  {city}
                  <button
                    type="button"
                    aria-label={`Remove ${city}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(city);
                    }}
                  >
                    <X size={11} weight="bold" />
                  </button>
                </span>
              ))}
            </span>
          )}
        <CaretDown className={cx(styles.chevron, open && styles.chevronOpen)} size={18} weight="bold" aria-hidden="true" />
      </div>

      {open && (
        <div className={styles.panel}>
          <p className={styles.panelHint}>{full ? `You've picked the maximum of ${max} cities.` : `Pick up to ${max}. The first is the patient's city.`}</p>
          <ul id={listId} role="listbox" aria-multiselectable="true" className={styles.list}>
            {options.map((city) => {
              const index = value.indexOf(city);
              const selected = index >= 0;
              const disabled = !selected && full;
              return (
                <li key={city} role="option" aria-selected={selected} aria-disabled={disabled}>
                  <button type="button" className={cx(styles.option, selected && styles.optionOn)} disabled={disabled} onClick={() => toggle(city)}>
                    <span className={styles.box}>{selected && <Check size={12} weight="bold" />}</span>
                    {city}
                    {index === 0 && <small>Patient&apos;s city</small>}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className={styles.done} onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}
