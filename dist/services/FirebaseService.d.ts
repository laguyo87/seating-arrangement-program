/**
 * Firebase 서비스
 * Firebase 초기화 및 기본 기능 제공
 */
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
/**
 * Firebase 서비스 클래스
 */
export declare class FirebaseService {
    private static instance;
    private app;
    private firestore;
    private auth;
    private isInitialized;
    private constructor();
    /**
     * FirebaseService 인스턴스 가져오기 (싱글톤)
     */
    static getInstance(): FirebaseService;
    /**
     * Firebase 초기화
     */
    initialize(): boolean;
    /**
     * Firestore 인스턴스 가져오기
     */
    getFirestore(): Firestore | null;
    /**
     * Auth 인스턴스 가져오기
     */
    getAuth(): Auth | null;
    /**
     * Firebase 초기화 여부 확인
     */
    getIsInitialized(): boolean;
}
//# sourceMappingURL=FirebaseService.d.ts.map