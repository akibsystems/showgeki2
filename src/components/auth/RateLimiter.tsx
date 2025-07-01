'use client';

import { useEffect, useState } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 60 * 60 * 1000, // 1 hour
};

interface RateLimitState {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil: number | null;
}

export function useRateLimit(key: string, config: Partial<RateLimitConfig> = {}) {
  const { maxAttempts, windowMs, blockDurationMs } = { ...DEFAULT_CONFIG, ...config };
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(maxAttempts);
  const [resetTime, setResetTime] = useState<Date | null>(null);

  const storageKey = `ratelimit_${key}`;

  useEffect(() => {
    checkRateLimit();
  }, []);

  const checkRateLimit = () => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;

    const state: RateLimitState = JSON.parse(stored);
    const now = Date.now();

    // Check if blocked
    if (state.blockedUntil && now < state.blockedUntil) {
      setIsBlocked(true);
      setResetTime(new Date(state.blockedUntil));
      return;
    }

    // Check if window expired
    if (now - state.firstAttemptTime > windowMs) {
      localStorage.removeItem(storageKey);
      return;
    }

    setRemainingAttempts(maxAttempts - state.attempts);
  };

  const recordAttempt = (): boolean => {
    const stored = localStorage.getItem(storageKey);
    const now = Date.now();
    
    let state: RateLimitState = stored 
      ? JSON.parse(stored)
      : { attempts: 0, firstAttemptTime: now, blockedUntil: null };

    // Check if already blocked
    if (state.blockedUntil && now < state.blockedUntil) {
      setIsBlocked(true);
      setResetTime(new Date(state.blockedUntil));
      return false;
    }

    // Reset if window expired
    if (now - state.firstAttemptTime > windowMs) {
      state = { attempts: 0, firstAttemptTime: now, blockedUntil: null };
    }

    state.attempts++;

    // Block if too many attempts
    if (state.attempts >= maxAttempts) {
      state.blockedUntil = now + blockDurationMs;
      setIsBlocked(true);
      setResetTime(new Date(state.blockedUntil));
    }

    setRemainingAttempts(maxAttempts - state.attempts);
    localStorage.setItem(storageKey, JSON.stringify(state));

    return state.attempts < maxAttempts;
  };

  const reset = () => {
    localStorage.removeItem(storageKey);
    setIsBlocked(false);
    setRemainingAttempts(maxAttempts);
    setResetTime(null);
  };

  return {
    isBlocked,
    remainingAttempts,
    resetTime,
    recordAttempt,
    reset,
  };
}