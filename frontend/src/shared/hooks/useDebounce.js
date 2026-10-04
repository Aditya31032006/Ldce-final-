import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * Debounces a fast-changing value (e.g. search input) by the given delay in milliseconds.
 * 
 * @param {any} value Value to debounce
 * @param {number} delay Delay in milliseconds (default: 300ms)
 * @returns {any} Debounced value
 */
export default function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
