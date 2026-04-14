import { useEffect, useRef, useState, useCallback } from 'react';
import { getConfig } from '../api/bitbucket';

export default function useAutoRefresh(callback) {
  const [enabled, setEnabled] = useState(true);
  const [interval, setIntervalMin] = useState(3);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  // Load config
  useEffect(() => {
    getConfig().then((cfg) => {
      setEnabled(cfg.autoRefresh !== undefined ? cfg.autoRefresh : true);
      setIntervalMin(cfg.refreshInterval || 3);
    }).catch(() => {});
  }, []);

  // Set up auto-refresh timer
  useEffect(() => {
    if (!enabled || interval < 1) {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      setCountdown(0);
      return;
    }

    const ms = interval * 60 * 1000;
    setCountdown(interval * 60);

    // Countdown ticker
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? interval * 60 : c - 1));
    }, 1000);

    // Refresh ticker
    timerRef.current = setInterval(() => {
      callbackRef.current?.();
    }, ms);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [enabled, interval]);

  const toggle = useCallback(() => setEnabled((e) => !e), []);

  return { enabled, interval, countdown, toggle };
}
