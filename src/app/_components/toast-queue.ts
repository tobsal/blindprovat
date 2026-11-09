// Kön av bekräftelser (toasts). Ren logik, så att den går att testa utan DOM.

export type Toast = { id: number; message: string };

// Fler samtidiga bekräftelser skymmer sidan utan att tillföra något, så de
// äldsta försvinner först.
export const MAX_TOASTS = 3;

export function addToast(toasts: readonly Toast[], toast: Toast): Toast[] {
  return [...toasts, toast].slice(-MAX_TOASTS);
}

export function removeToast(toasts: readonly Toast[], id: number): Toast[] {
  return toasts.filter((toast) => toast.id !== id);
}
