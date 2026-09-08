import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';

let dispatch = null;

/** Drop-in replacement for window.alert() that renders a shadcn dialog instead. */
export function appAlert(message, opts = {}) {
  return new Promise((resolve) => {
    if (!dispatch) {
      // eslint-disable-next-line no-alert
      window.alert(message);
      resolve();
      return;
    }
    dispatch({
      kind: 'alert',
      message,
      title: opts.title || 'Notice',
      okText: opts.okText || 'OK',
      resolve,
    });
  });
}

/** Drop-in replacement for window.confirm() that renders a shadcn dialog instead. Resolves to true/false. */
export function appConfirm(message, opts = {}) {
  return new Promise((resolve) => {
    if (!dispatch) {
      // eslint-disable-next-line no-alert
      resolve(window.confirm(message));
      return;
    }
    dispatch({
      kind: 'confirm',
      message,
      title: opts.title || 'Please confirm',
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      destructive: Boolean(opts.destructive),
      resolve,
    });
  });
}

/** Drop-in replacement for window.prompt() that renders a shadcn dialog instead. Resolves to the entered string, or null if cancelled. */
export function appPrompt(message, opts = {}) {
  return new Promise((resolve) => {
    if (!dispatch) {
      // eslint-disable-next-line no-alert
      resolve(window.prompt(message, opts.defaultValue || ''));
      return;
    }
    dispatch({
      kind: 'prompt',
      message,
      title: opts.title || 'Please provide details',
      confirmText: opts.confirmText || 'Submit',
      cancelText: opts.cancelText || 'Cancel',
      placeholder: opts.placeholder || '',
      defaultValue: opts.defaultValue || '',
      required: opts.required !== false,
      resolve,
    });
  });
}

/** Mount once near the app root. Renders whichever alert/confirm/prompt is currently active. */
export function DialogHost() {
  const [state, setState] = useState(null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    dispatch = (next) => {
      setPromptValue(next?.defaultValue || '');
      setState(next);
    };
    return () => {
      dispatch = null;
    };
  }, []);

  const close = useCallback(
    (result) => {
      state?.resolve?.(result);
      setState(null);
    },
    [state],
  );

  if (!state) return null;
  const isConfirm = state.kind === 'confirm';
  const isPrompt = state.kind === 'prompt';

  return (
    <AlertDialog open onOpenChange={(open) => !open && close(isConfirm ? false : isPrompt ? null : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{state.message}</AlertDialogDescription>
        </AlertDialogHeader>
        {isPrompt && (
          <Input
            autoFocus
            placeholder={state.placeholder}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (!state.required || promptValue.trim())) close(promptValue);
            }}
          />
        )}
        <AlertDialogFooter>
          {(isConfirm || isPrompt) && (
            <AlertDialogCancel onClick={() => close(isPrompt ? null : false)}>{state.cancelText}</AlertDialogCancel>
          )}
          <AlertDialogAction
            disabled={isPrompt && state.required && !promptValue.trim()}
            className={state.destructive ? 'bg-destructive text-destructive-foreground hover:opacity-90' : undefined}
            onClick={() => close(isConfirm ? true : isPrompt ? promptValue : undefined)}
          >
            {isConfirm ? state.confirmText : isPrompt ? state.confirmText : state.okText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
