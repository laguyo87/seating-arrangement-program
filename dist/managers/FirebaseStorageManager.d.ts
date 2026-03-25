/**
 * Firebase Storage Manager
 * Firebase Firestore를 사용한 데이터 저장/불러오기
 */
import { Unsubscribe } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { FirebaseService } from '../services/FirebaseService.js';
import { OutputModule } from '../modules/OutputModule.js';
import { ClassInfo } from './ClassManager.js';
import { ClassLayoutData } from './ClassManager.js';
/**
 * FirebaseStorageManager 의존성 인터페이스
 */
export interface FirebaseStorageManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
}
/**
 * Firebase Storage Manager 클래스
 */
export declare class FirebaseStorageManager {
    private deps;
    private firebaseService;
    private currentUser;
    private isAuthenticated;
    private snapshotUnsubscribes;
    constructor(dependencies: FirebaseStorageManagerDependencies);
    /**
     * 인증 상태 리스너 설정
     */
    private setupAuthListener;
    /**
     * Google 로그인 (팝업 방식, 실패 시 리다이렉트 방식으로 자동 전환)
     */
    signInWithGoogle(): Promise<boolean>;
    /**
     * 리다이렉트 로그인 결과 확인 (페이지 로드 시 호출)
     */
    checkRedirectResult(): Promise<boolean>;
    /**
     * 이메일/비밀번호 회원가입
     */
    signUpWithEmailAndPassword(email: string, password: string, displayName?: string): Promise<boolean>;
    /**
     * 이메일/비밀번호 로그인
     */
    signInWithEmailAndPassword(email: string, password: string): Promise<boolean>;
    /**
     * 로그아웃
     */
    signOut(): Promise<void>;
    /**
     * 현재 로그인 상태 확인
     */
    getIsAuthenticated(): boolean;
    /**
     * 현재 사용자 정보 가져오기
     */
    getCurrentUser(): User | null;
    /**
     * 사용자 ID 가져오기
     */
    private getUserId;
    /**
     * 반 목록 저장
     */
    saveClassList(classList: ClassInfo[]): Promise<boolean>;
    /**
     * 반 목록 불러오기
     */
    loadClassList(): Promise<ClassInfo[]>;
    /**
     * 반별 자리 배치도 저장
     */
    saveClassLayout(classId: string, layout: ClassLayoutData): Promise<boolean>;
    /**
     * 반별 자리 배치도 불러오기
     */
    loadClassLayout(classId: string): Promise<ClassLayoutData | null>;
    /**
     * 반 삭제
     */
    deleteClass(classId: string): Promise<boolean>;
    /**
     * 반별 확정된 자리 이력 저장
     */
    saveSeatHistory(classId: string, history: Array<{
        id: string;
        date: string;
        layout: Array<{
            seatId: number;
            studentName: string;
            gender: 'M' | 'F';
        }>;
        pairInfo?: Array<{
            student1: string;
            student2: string;
        }>;
        timestamp: number;
        layoutType?: string;
        singleMode?: string;
        pairMode?: string;
        partitionCount?: number;
        groupSize?: string;
        classId?: string;
    }>): Promise<boolean>;
    /**
     * 반별 확정된 자리 이력 불러오기
     */
    loadSeatHistory(classId: string): Promise<Array<{
        id: string;
        date: string;
        layout: Array<{
            seatId: number;
            studentName: string;
            gender: 'M' | 'F';
        }>;
        pairInfo?: Array<{
            student1: string;
            student2: string;
        }>;
        timestamp: number;
        layoutType?: string;
        singleMode?: string;
        pairMode?: string;
        partitionCount?: number;
        groupSize?: string;
        classId?: string;
    }> | null>;
    /**
     * 모든 데이터 동기화 (localStorage → Firebase)
     */
    syncAllData(localData: {
        classList?: ClassInfo[];
        classLayouts?: Map<string, ClassLayoutData>;
    }): Promise<boolean>;
    /**
     * 실시간 리스너 설정 (반 목록)
     */
    setupRealtimeListener(onUpdate: (classList: ClassInfo[]) => void, onError?: (error: Error) => void): Unsubscribe | null;
    /**
     * 실시간 리스너 해제
     */
    unsubscribeRealtimeListener(key: string): void;
    /**
     * 모든 실시간 리스너 해제
     */
    unsubscribeAllRealtimeListeners(): void;
    /**
     * 방문자 수 증가 (트랜잭션 사용)
     */
    incrementVisitorCount(): Promise<number | null>;
    /**
     * 현재 방문자 수 가져오기
     */
    getVisitorCount(): Promise<number>;
    /**
     * 방문자 수 실시간 리스너 설정
     */
    setupVisitorCountListener(onUpdate: (count: number) => void, onError?: (error: Error) => void): Unsubscribe | null;
    /**
     * FirebaseService 인스턴스 가져오기 (외부 접근용)
     */
    getFirebaseService(): FirebaseService;
}
//# sourceMappingURL=FirebaseStorageManager.d.ts.map