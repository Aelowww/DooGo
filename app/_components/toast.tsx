"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Heartbeat, Warning, X } from "@phosphor-icons/react";
import styles from "./toast.module.css";

type Toast = { id: number; tone: "success" | "error"; title: string; body?: string };
type ShowToast = (title: string, options?: { body?: string; tone?: Toast["tone"] }) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Floating confirmation card, e.g. after saving settings. `useToast()("Saved")`. */
export function useToast() {
  return useContext(ToastContext);
}

const visibleMs = 3600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  const dismiss = useCallback(() => {
    clearTimers();
    setLeaving(true);
    timers.current.push(window.setTimeout(() => setToast(null), 220));
  }, []);

  const show = useCallback<ShowToast>((title, options = {}) => {
    clearTimers();
    setLeaving(false);
    setToast({ id: Date.now(), tone: options.tone ?? "success", title, body: options.body });
    timers.current.push(window.setTimeout(dismiss, visibleMs));
  }, [dismiss]);

  useEffect(() => clearTimers, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} aria-live="polite" role="status">
        {toast && (
          <div key={toast.id} className={`${styles.toast} ${toast.tone === "error" ? styles.error : ""} ${leaving ? styles.leaving : ""}`}>
            <span className={styles.icon} aria-hidden="true">
              {toast.tone === "error" ? <Warning size={18} weight="fill" /> : <Heartbeat size={18} weight="bold" />}
            </span>
            <span className={styles.text}>
              <strong>{toast.title}</strong>
              {toast.body && <small>{toast.body}</small>}
            </span>
            <button type="button" className={styles.close} onClick={dismiss} aria-label="Dismiss">
              <X size={14} weight="bold" />
            </button>
            <i className={styles.timer} style={{ animationDuration: `${visibleMs}ms` }} aria-hidden="true" />
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
