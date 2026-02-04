// API mode configuration for testing
// Switch between mock and real API

export type ApiMode = 'mock' | 'real';

// Default to mock unless explicitly set to real
let currentMode: ApiMode = 'mock';

export function getApiMode(): ApiMode {
  return currentMode;
}

export function setApiMode(mode: ApiMode): void {
  currentMode = mode;
  console.log(`[API] Mode switched to: ${mode}`);
}

export function toggleApiMode(): ApiMode {
  currentMode = currentMode === 'mock' ? 'real' : 'mock';
  console.log(`[API] Mode toggled to: ${currentMode}`);
  return currentMode;
}
