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
    const handler = () => setValuesState(getUserValues());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { values, setValues: setUserValues, clearValues: clearUserValues };
}
