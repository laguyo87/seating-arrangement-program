import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from './StorageManager';
import type { StorageManagerDependencies } from './StorageManager';
import type { OutputModule } from '../modules/OutputModule';

/**
 * 동작을 바꿀 수 있는 localStorage 대역
 * mode:
 *  - 'ok'          정상 동작
 *  - 'unavailable' 저장소 비활성 (setItem이 항상 예외 — Safari 프라이빗 모드 등)
 *  - 'readThrows'  쓰기는 되지만 읽기가 예외
 */
function installLocalStorage(mode: 'ok' | 'unavailable' | 'readThrows' = 'ok') {
    const store = new Map<string, string>();
    const fake = {
        getItem(key: string): string | null {
            if (mode === 'readThrows' && key !== '__localStorage_test__') {
                throw new DOMException('read blocked');
            }
            return store.has(key) ? store.get(key)! : null;
        },
        setItem(key: string, value: string): void {
            if (mode === 'unavailable') throw new DOMException('storage disabled');
            store.set(key, value);
        },
        removeItem(key: string): void {
            store.delete(key);
        },
    };
    (globalThis as any).localStorage = fake;
    return store;
}

function createStorageManager() {
    const messages: string[] = [];
    const outputModule = {
        showError: (m: string) => { messages.push(m); },
    } as unknown as OutputModule;

    const deps: StorageManagerDependencies = {
        outputModule,
        isDevelopmentMode: () => false,
    };
    return { manager: new StorageManager(deps), messages };
}

describe('StorageManager.readItem', () => {
    let originalLocalStorage: unknown;

    beforeEach(() => {
        originalLocalStorage = (globalThis as any).localStorage;
    });

    afterEach(() => {
        (globalThis as any).localStorage = originalLocalStorage;
        vi.restoreAllMocks();
    });

    it('키가 없으면 읽기는 성공이고 값은 null이다', () => {
        installLocalStorage('ok');
        const { manager } = createStorageManager();

        expect(manager.readItem('없는키')).toEqual({ ok: true, value: null });
    });

    it('저장된 값을 읽으면 ok:true와 값을 함께 반환한다', () => {
        installLocalStorage('ok');
        const { manager } = createStorageManager();
        manager.safeSetItem('키', '값');

        expect(manager.readItem('키')).toEqual({ ok: true, value: '값' });
    });

    it('저장소를 사용할 수 없으면 ok:false로 실패를 알린다', () => {
        installLocalStorage('unavailable');
        const { manager } = createStorageManager();

        expect(manager.readItem('키')).toEqual({ ok: false, value: null });
    });

    it('읽기가 예외를 던지면 ok:false로 실패를 알린다', () => {
        installLocalStorage('readThrows');
        const { manager } = createStorageManager();

        expect(manager.readItem('키')).toEqual({ ok: false, value: null });
    });

    it('"키 없음"과 "저장소 실패"를 구분한다 (safeGetItem은 둘 다 null)', () => {
        // 이 구분이 없으면 읽기 실패를 '데이터 없음'으로 오인해
        // 빈 값을 클라우드에 덮어쓰고 기존 데이터를 파괴하게 된다.
        installLocalStorage('ok');
        const { manager: okManager } = createStorageManager();

        installLocalStorage('unavailable');
        const { manager: brokenManager } = createStorageManager();

        // 두 상황 모두 safeGetItem은 null을 반환한다
        expect(okManager.safeGetItem('없는키')).toBeNull();
        expect(brokenManager.safeGetItem('없는키')).toBeNull();

        // readItem은 두 상황을 구분한다
        installLocalStorage('ok');
        expect(okManager.readItem('없는키').ok).toBe(true);

        installLocalStorage('unavailable');
        expect(brokenManager.readItem('없는키').ok).toBe(false);
    });

    it('safeGetItem은 readItem의 값을 그대로 돌려준다', () => {
        installLocalStorage('ok');
        const { manager } = createStorageManager();
        manager.safeSetItem('키', '값');

        expect(manager.safeGetItem('키')).toBe('값');
        expect(manager.safeGetItem('없는키')).toBeNull();
    });
});

describe('StorageManager.safeSetItem', () => {
    let originalLocalStorage: unknown;

    beforeEach(() => {
        originalLocalStorage = (globalThis as any).localStorage;
    });

    afterEach(() => {
        (globalThis as any).localStorage = originalLocalStorage;
    });

    it('저장에 실패하면 false를 반환하고 사용자에게 알린다', () => {
        installLocalStorage('unavailable');
        const { manager, messages } = createStorageManager();

        expect(manager.safeSetItem('키', '값')).toBe(false);
        expect(messages.length).toBeGreaterThan(0);
    });

    it('저장에 성공하면 true를 반환한다', () => {
        installLocalStorage('ok');
        const { manager } = createStorageManager();

        expect(manager.safeSetItem('키', '값')).toBe(true);
    });
});
