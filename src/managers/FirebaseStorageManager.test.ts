import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseStorageManager } from './FirebaseStorageManager';

/**
 * 인증 상태 확정 알림 테스트
 *
 * 앱 시작 시 클라우드 데이터를 불러올지 결정하는 신호가 인증 상태다.
 * 이것을 고정 시간 타이머로 기다리면, 인증 복원이 그보다 느린 기기에서
 * 로그인 상태를 놓치고 빈 로컬 데이터로 시작하게 되고,
 * 그 상태에서 저장이 일어나면 클라우드의 기존 데이터가 지워진다.
 */

/** onAuthStateChanged 콜백을 테스트에서 직접 발화시키기 위한 저장소 */
let authCallback: ((user: unknown) => void) | null = null;
let initializeResult = true;
let authInstance: unknown = {};

vi.mock('firebase/auth', () => ({
    onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
        authCallback = cb;
        return () => {};
    },
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: vi.fn(),
    GoogleAuthProvider: class { setCustomParameters() {} addScope() {} },
    signOut: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(), doc: vi.fn(), setDoc: vi.fn(), getDoc: vi.fn(),
    getDocs: vi.fn(), deleteDoc: vi.fn(), query: vi.fn(), where: vi.fn(),
    Timestamp: { now: () => ({}) }, onSnapshot: vi.fn(),
    runTransaction: vi.fn(), increment: vi.fn(),
}));

vi.mock('../services/FirebaseService.js', () => ({
    FirebaseService: {
        getInstance: () => ({
            initialize: () => initializeResult,
            getAuth: () => authInstance,
            getFirestore: () => ({}),
        }),
    },
}));

function createManager() {
    return new FirebaseStorageManager({
        outputModule: {
            showError: () => {}, showInfo: () => {},
            showWarning: () => {}, showSuccess: () => {},
        } as any,
        isDevelopmentMode: () => false,
    });
}

describe('FirebaseStorageManager - 인증 상태 확정 알림', () => {
    beforeEach(() => {
        authCallback = null;
        initializeResult = true;
        authInstance = {};
    });

    it('인증 복원이 늦게 끝나도 구독자에게 통보한다', () => {
        const manager = createManager();
        const calls: boolean[] = [];
        manager.onAuthStateResolved((authed) => calls.push(authed));

        // 아직 Firebase가 인증 상태를 알려주지 않은 시점
        expect(calls).toEqual([]);

        // 한참 뒤에 인증이 복원됨
        authCallback!({ uid: 'u1', email: 'teacher@example.com' });

        expect(calls).toEqual([true]);
        expect(manager.getIsAuthenticated()).toBe(true);
    });

    it('이미 확정된 뒤에 구독하면 즉시 호출된다', () => {
        const manager = createManager();
        authCallback!({ uid: 'u1', email: 'teacher@example.com' });

        const calls: boolean[] = [];
        manager.onAuthStateResolved((authed) => calls.push(authed));

        expect(calls).toEqual([true]);
    });

    it('로그아웃 상태도 확정으로 통보한다', () => {
        const manager = createManager();
        const calls: boolean[] = [];
        manager.onAuthStateResolved((authed) => calls.push(authed));

        authCallback!(null);

        expect(calls).toEqual([false]);
        expect(manager.getIsAuthenticated()).toBe(false);
    });

    it('로그인/로그아웃이 바뀔 때마다 다시 통보한다', () => {
        const manager = createManager();
        const calls: boolean[] = [];
        manager.onAuthStateResolved((authed) => calls.push(authed));

        authCallback!(null);
        authCallback!({ uid: 'u1', email: 'teacher@example.com' });
        authCallback!(null);

        expect(calls).toEqual([false, true, false]);
    });

    it('Firebase 초기화에 실패하면 비로그인으로 확정 통보한다', () => {
        // 통보가 없으면 화면이 영원히 초기 상태에 머문다
        initializeResult = false;
        const manager = createManager();

        const calls: boolean[] = [];
        manager.onAuthStateResolved((authed) => calls.push(authed));

        expect(calls).toEqual([false]);
    });

    it('Auth 객체를 얻지 못해도 확정 통보한다', () => {
        authInstance = null;
        const manager = createManager();

        const calls: boolean[] = [];
        manager.onAuthStateResolved((authed) => calls.push(authed));

        expect(calls).toEqual([false]);
    });

    it('한 구독자가 예외를 던져도 다른 구독자는 호출된다', () => {
        const manager = createManager();
        const calls: string[] = [];
        manager.onAuthStateResolved(() => { calls.push('첫번째'); throw new Error('구독자 오류'); });
        manager.onAuthStateResolved(() => { calls.push('두번째'); });

        authCallback!({ uid: 'u1' });

        expect(calls).toEqual(['첫번째', '두번째']);
    });
});

describe('FirebaseStorageManager - 저장 실패 보고', () => {
    beforeEach(() => {
        authCallback = null;
        initializeResult = true;
        authInstance = {};
    });

    it('로그인하지 않은 상태에서는 이력 저장 성공을 보고하지 않는다', async () => {
        const manager = createManager();
        authCallback!(null);

        // 저장을 수행하지 않았으므로 true(성공)를 반환해서는 안 된다
        await expect(manager.saveSeatHistory('class_1', [])).resolves.toBe(false);
    });
});
