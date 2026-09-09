import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClassManager } from './ClassManager';
import type { ClassManagerDependencies, ClassInfo } from './ClassManager';
import { StorageManager } from './StorageManager';
import type { OutputModule } from '../modules/OutputModule';
import type { Seat } from '../models/Seat';
import type { Student } from '../models/Student';

type StorageMode = 'ok' | 'unavailable';

function installLocalStorage(mode: StorageMode, seed: Record<string, string> = {}) {
    const store = new Map<string, string>(Object.entries(seed));
    (globalThis as any).localStorage = {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => {
            if (mode === 'unavailable') throw new DOMException('storage disabled');
            store.set(k, v);
        },
        removeItem: (k: string) => { store.delete(k); },
    };
    return store;
}

function createManager(opts: {
    storage?: StorageMode;
    seed?: Record<string, string>;
    seats?: Seat[];
    students?: Student[];
} = {}) {
    const store = installLocalStorage(opts.storage ?? 'ok', opts.seed);
    const messages: Array<{ kind: string; text: string }> = [];
    const outputModule = {
        showError: (t: string) => messages.push({ kind: 'error', text: t }),
        showInfo: (t: string) => messages.push({ kind: 'info', text: t }),
        showWarning: (t: string) => messages.push({ kind: 'warning', text: t }),
        showSuccess: (t: string) => messages.push({ kind: 'success', text: t }),
    } as unknown as OutputModule;

    const storageManager = new StorageManager({
        outputModule,
        isDevelopmentMode: () => false,
    });

    const seats = opts.seats ?? ([{ id: 1, x: 0, y: 0 }] as unknown as Seat[]);
    const students = opts.students ?? ([{ id: 1, name: '학생1', gender: 'M' }] as unknown as Student[]);

    const deps: ClassManagerDependencies = {
        storageManager,
        outputModule,
        getCurrentSeats: () => seats,
        getCurrentStudents: () => students,
        setSeats: () => {},
        setStudents: () => {},
        renderLayout: () => {},
    };

    return { manager: new ClassManager(deps), messages, store, seats, students };
}

const EXISTING_CLASSES: ClassInfo[] = [
    { id: 'class_1', name: '3학년 1반', createdAt: '2026-01-01', lastModified: '2026-01-01' },
    { id: 'class_2', name: '3학년 2반', createdAt: '2026-01-02', lastModified: '2026-01-02' },
];

describe('ClassManager - 반 목록 읽기 실패 처리', () => {
    let original: unknown;
    beforeEach(() => { original = (globalThis as any).localStorage; });
    afterEach(() => { (globalThis as any).localStorage = original; });

    it('저장소를 읽을 수 없으면 반을 추가하지 않는다', () => {
        // 읽기 실패를 '반이 하나도 없음'으로 오인하면
        // 새 반 하나짜리 목록이 기존 목록 전체를 덮어쓴다.
        const { manager, messages } = createManager({ storage: 'unavailable' });

        return manager.addClass('3학년 3반').then((id) => {
            expect(id).toBeNull();
            expect(messages.some(m => m.kind === 'error')).toBe(true);
        });
    });

    it('반이 하나도 없는 정상 상태에서는 반을 추가한다', async () => {
        const { manager } = createManager({ storage: 'ok' });

        const id = await manager.addClass('3학년 1반');

        expect(id).not.toBeNull();
        expect(manager.getClassList().map(c => c.name)).toEqual(['3학년 1반']);
    });

    it('기존 반이 있으면 목록에 덧붙이고 기존 반을 지우지 않는다', async () => {
        const { manager } = createManager({
            seed: { classList: JSON.stringify(EXISTING_CLASSES) },
        });

        await manager.addClass('3학년 3반');

        expect(manager.getClassList().map(c => c.name))
            .toEqual(['3학년 1반', '3학년 2반', '3학년 3반']);
    });

    it('저장된 목록이 손상되어 있으면 반을 추가하지 않는다', async () => {
        const { manager } = createManager({ seed: { classList: '{망가진 JSON' } });

        expect(await manager.addClass('3학년 3반')).toBeNull();
    });
});

describe('ClassManager - 저장 결과를 정직하게 알린다', () => {
    let original: unknown;
    beforeEach(() => { original = (globalThis as any).localStorage; });
    afterEach(() => { (globalThis as any).localStorage = original; });

    it('저장에 성공하면 true를 반환한다', async () => {
        const { manager } = createManager();
        const id = await manager.addClass('3학년 1반');
        manager.selectClass(id);

        expect(await manager.saveCurrentLayout({ silent: true })).toBe(true);
    });

    it('반이 선택되지 않았으면 실패를 알린다', async () => {
        const { manager, messages } = createManager();

        expect(await manager.saveCurrentLayout({ silent: true })).toBe(false);
        expect(messages.some(m => m.kind === 'error')).toBe(true);
    });

    it('저장할 배치가 없으면 실패를 알린다', async () => {
        const { manager, messages } = createManager({ seats: [], students: [] });
        const id = await manager.addClass('3학년 1반');
        manager.selectClass(id);
        messages.length = 0;

        expect(await manager.saveCurrentLayout({ silent: true })).toBe(false);
        expect(messages.some(m => m.kind === 'error')).toBe(true);
    });

    it('silent 옵션을 주면 자체 안내 메시지를 띄우지 않는다', async () => {
        const { manager, messages } = createManager();
        const id = await manager.addClass('3학년 1반');
        manager.selectClass(id);
        messages.length = 0;

        await manager.saveCurrentLayout({ silent: true });

        expect(messages).toHaveLength(0);
    });

    it('silent가 아니면 저장 완료를 알린다', async () => {
        const { manager, messages } = createManager();
        const id = await manager.addClass('3학년 1반');
        manager.selectClass(id);
        messages.length = 0;

        await manager.saveCurrentLayout();

        expect(messages.some(m => m.kind === 'info')).toBe(true);
    });
});

describe('ClassManager - 저장 데이터 스냅샷', () => {
    let original: unknown;
    beforeEach(() => { original = (globalThis as any).localStorage; });
    afterEach(() => { (globalThis as any).localStorage = original; });

    it('저장 시점의 상태를 복사해 저장한다 (저장 중 변경에 영향받지 않음)', async () => {
        const seats = [{ id: 1, x: 0, y: 0, studentName: '민준' }] as unknown as Seat[];
        const { manager, store } = createManager({ seats });
        const id = await manager.addClass('3학년 1반');
        manager.selectClass(id);

        const saving = manager.saveCurrentLayout({ silent: true });
        // 저장이 진행되는 동안 화면에서 자리를 바꾼 상황
        (seats[0] as any).studentName = '서연';
        await saving;

        const saved = JSON.parse(store.get(`classLayout_${id}`)!);
        expect(saved.seats[0].studentName).toBe('민준');
    });
});

describe('ClassManager - 반 삭제 순서', () => {
    let original: unknown;
    beforeEach(() => { original = (globalThis as any).localStorage; });
    afterEach(() => { (globalThis as any).localStorage = original; });

    it('목록 저장에 실패하면 배치도 데이터를 지우지 않는다', async () => {
        const { manager, store } = createManager({
            seed: {
                classList: JSON.stringify(EXISTING_CLASSES),
                classLayout_class_1: JSON.stringify({ seats: [], students: [], timestamp: '', className: '3학년 1반' }),
            },
        });

        // 목록 저장이 실패하도록 저장소를 막는다
        installLocalStorage('unavailable', Object.fromEntries(store));

        const ok = await manager.deleteClass('class_1');

        expect(ok).toBe(false);
        // 배치도가 남아 있어야 한다 — 목록에는 반이 그대로 있으므로
        expect((globalThis as any).localStorage.getItem('classLayout_class_1')).not.toBeNull();
    });

    it('정상적으로 삭제하면 목록과 배치도가 함께 정리된다', async () => {
        const { manager } = createManager({
            seed: {
                classList: JSON.stringify(EXISTING_CLASSES),
                classLayout_class_1: JSON.stringify({ seats: [], students: [], timestamp: '', className: '3학년 1반' }),
            },
        });

        const ok = await manager.deleteClass('class_1');

        expect(ok).toBe(true);
        expect(manager.getClassList().map(c => c.id)).toEqual(['class_2']);
        expect((globalThis as any).localStorage.getItem('classLayout_class_1')).toBeNull();
    });
});
