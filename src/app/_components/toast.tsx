"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { addToast, removeToast, type Toast } from "./toast-queue";

// Lång nog att hinna läsa en kort mening. Tiden står still medan muspekaren
// eller fokus är på bekräftelsen, och den går alltid att stänga själv.
const TOAST_DURATION_MS = 6000;

const ToastContext = createContext<(message: string) => void>(() => {});

// Visar en kort bekräftelse på att något lyckades. Fel visas inte här, utan
// vid fältet eller formuläret, eftersom de måste ligga kvar tills de rättats.
export function useToast() {
  return useContext(ToastContext);
}

// Ligger i root-layouten så att bekräftelsen överlever att komponenten som
// visade den försvinner och att sidan uppdateras vid polling.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => addToast(current, { id, message }));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => removeToast(current, id));
  }, []);

  return (
    <ToastContext value={showToast}>
      {children}
      {/* Live-regionen finns från sidladdningen, annars annonseras inte det
          som läggs in. aria-atomic="false" gör att bara den nya bekräftelsen
          läses upp, inte de som redan visas. Varje bekräftelse har ett eget
          id, så samma text två gånger annonseras två gånger. Fokus flyttas
          aldrig hit. */}
      <div
        role="status"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPaused = isHovered || isFocused;

  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isPaused, onDismiss, toast.id]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-inverse-surface py-1 pr-1 pl-4 text-on-inverse-surface shadow-lg motion-safe:animate-toast-in"
    >
      <CheckCircleIcon />
      <p className="flex-1 py-2">{toast.message}</p>
      <button
        type="button"
        aria-label="Stäng meddelandet"
        onClick={() => onDismiss(toast.id)}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full hover:bg-on-inverse-surface/10 focus-visible:outline-on-inverse-surface"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
