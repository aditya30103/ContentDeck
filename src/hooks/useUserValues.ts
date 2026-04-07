import { useState, useEffect } from 'react';
import type { UserValues } from '../types/scoring';

const KEY = 'contentdeck_values';

export function getUserValues(): UserValues | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserValues) : null;
  } catch {
    return null;
  }
}

export function setUserValues(values: UserValues): void {
  localStorage.setItem(KEY, JSON.stringify(values));
}

export function clearUserValues(): void {
  localStorage.removeItem(KEY);
}

export function useUserValues() {
  const [values, setValuesState] = useState<UserValues | null>(getUserValues);

  useEffect(() => {
    // 'storage' only fires for cross-tab changes; same-tab writes go through
    // the wrapper functions below which call setValuesState directly.
    const handler = () => setValuesState(getUserValues());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  function updateValues(v: UserValues) {
    setUserValues(v);
    setValuesState(v);
  }

  function clearAll() {
    clearUserValues();
    setValuesState(null);
  }

  return { values, setValues: updateValues, clearValues: clearAll };
}
