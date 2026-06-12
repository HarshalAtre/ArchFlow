import { SetStateAction, useCallback, useEffect, useRef, useState } from "react";

type HistoryState<T> = {
  future: T[];
  past: T[];
  present: T;
};

type Transaction<T> = {
  changed: boolean;
  start: T;
};

const historyLimit = 60;

export function useUndoRedo<T>(initialState: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    future: [],
    past: [],
    present: initialState,
  });
  const historyRef = useRef(history);
  const transactionRef = useRef<Transaction<T> | null>(null);

  const updateHistory = useCallback((updater: (current: HistoryState<T>) => HistoryState<T>) => {
    setHistory((current) => {
      const next = updater(current);
      historyRef.current = next;
      return next;
    });
  }, []);

  const setState = useCallback(
    (action: SetStateAction<T>) => {
      updateHistory((current) => {
        const nextPresent = resolveStateAction(action, current.present);

        if (Object.is(nextPresent, current.present)) {
          return current;
        }

        if (transactionRef.current) {
          transactionRef.current.changed = true;
          return {
            ...current,
            present: nextPresent,
          };
        }

        return {
          future: [],
          past: appendWithinLimit(current.past, current.present),
          present: nextPresent,
        };
      });
    },
    [updateHistory],
  );

  const resetState = useCallback(
    (nextState: T) => {
      transactionRef.current = null;
      updateHistory(() => ({
        future: [],
        past: [],
        present: nextState,
      }));
    },
    [updateHistory],
  );

  const beginTransaction = useCallback(() => {
    if (!transactionRef.current) {
      transactionRef.current = {
        changed: false,
        start: historyRef.current.present,
      };
    }
  }, []);

  const commitTransaction = useCallback(() => {
    const transaction = transactionRef.current;
    transactionRef.current = null;

    if (!transaction?.changed) {
      return;
    }

    updateHistory((current) => ({
      future: [],
      past: appendWithinLimit(current.past, transaction.start),
      present: current.present,
    }));
  }, [updateHistory]);

  const undo = useCallback(() => {
    transactionRef.current = null;
    updateHistory((current) => {
      const previous = current.past.at(-1);

      if (previous === undefined) {
        return current;
      }

      return {
        future: [current.present, ...current.future].slice(0, historyLimit),
        past: current.past.slice(0, -1),
        present: previous,
      };
    });
  }, [updateHistory]);

  const redo = useCallback(() => {
    transactionRef.current = null;
    updateHistory((current) => {
      const next = current.future.at(0);

      if (next === undefined) {
        return current;
      }

      return {
        future: current.future.slice(1),
        past: appendWithinLimit(current.past, current.present),
        present: next,
      };
    });
  }, [updateHistory]);

  return {
    beginTransaction,
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    commitTransaction,
    redo,
    resetState,
    setState,
    state: history.present,
    undo,
  };
}

export function useUndoRedoShortcuts(undo: () => void, redo: () => void) {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") {
        return;
      }

      if (isEditableHistoryTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [redo, undo]);
}

function appendWithinLimit<T>(values: T[], value: T): T[] {
  return [...values, value].slice(-historyLimit);
}

function resolveStateAction<T>(action: SetStateAction<T>, current: T): T {
  return typeof action === "function"
    ? (action as (currentState: T) => T)(current)
    : action;
}

export function isEditableHistoryTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
