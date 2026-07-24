import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduceMotionEnabled = false;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function ensureInitialized() {
  if (initialized) {
    return;
  }

  initialized = true;

  void AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      if (reduceMotionEnabled !== enabled) {
        reduceMotionEnabled = enabled;
        emit();
      }
    })
    .catch(() => {
      // Keep the conservative default of false when the platform call fails.
    });

  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    reduceMotionEnabled = enabled;
    emit();
  });
}

function subscribe(onStoreChange: () => void) {
  ensureInitialized();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot() {
  ensureInitialized();
  return reduceMotionEnabled;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
