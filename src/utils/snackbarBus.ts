// Simple global snackbar event bus to broadcast notifications from anywhere
export type SnackbarType = 'success' | 'error';

export interface SnackbarEvent {
  message: string;
  type: SnackbarType;
}

type Listener = (event: SnackbarEvent) => void;

const listeners = new Set<Listener>();

export function subscribeSnackbar(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showGlobalSnackbar(message: string, type: SnackbarType = 'success') {
  const evt: SnackbarEvent = { message, type };
  listeners.forEach((l) => {
    try {
      l(evt);
    } catch (e) {
      // ignore listener errors to avoid breaking bus
      console.warn('Snackbar listener error:', e);
    }
  });
}

type CrudAction = 'create' | 'update' | 'delete' | 'add' | 'remove';

export function notifySuccess(action: CrudAction, entity: string) {
  const past = action === 'add' ? 'added' : action === 'remove' ? 'removed' : action + 'd';
  showGlobalSnackbar(`${entity} ${past} successfully`, 'success');
}

export function notifyError(action: CrudAction, entity: string, error?: unknown) {
  const msg = `Failed to ${action} ${entity}` + (error && (error as any).message ? `: ${(error as any).message}` : '');
  showGlobalSnackbar(msg, 'error');
}