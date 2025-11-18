/**
 * Vitest 테스트 설정 파일
 * 전역 테스트 환경 설정 및 모킹
 */
import { vi } from 'vitest';

// DOM 환경 모킹
global.HTMLDivElement = class HTMLDivElement extends HTMLElement {} as any;
global.HTMLInputElement = class HTMLInputElement extends HTMLElement {} as any;
global.HTMLButtonElement = class HTMLButtonElement extends HTMLElement {} as any;
global.HTMLSelectElement = class HTMLSelectElement extends HTMLElement {} as any;

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Clipboard API 모킹
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined)
  },
  writable: true
});

