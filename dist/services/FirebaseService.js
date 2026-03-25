/**
 * Firebase 서비스
 * Firebase 초기화 및 기본 기능 제공
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from '../config/firebase.config.js';
import { logger } from '../utils/logger.js';
/**
 * Firebase 서비스 클래스
 */
export class FirebaseService {
    constructor() {
        this.app = null;
        this.firestore = null;
        this.auth = null;
        this.isInitialized = false;
        // 싱글톤 패턴
    }
    /**
     * FirebaseService 인스턴스 가져오기 (싱글톤)
     */
    static getInstance() {
        if (!FirebaseService.instance) {
            FirebaseService.instance = new FirebaseService();
        }
        return FirebaseService.instance;
    }
    /**
     * Firebase 초기화
     */
    initialize() {
        if (this.isInitialized) {
            return true;
        }
        // 설정 확인
        if (!isFirebaseConfigValid()) {
            logger.warn('Firebase 설정이 올바르지 않습니다. firebase.config.ts 파일을 확인하세요.');
            return false;
        }
        try {
            // Firebase 앱 초기화
            this.app = initializeApp(firebaseConfig);
            // Firestore 초기화
            this.firestore = getFirestore(this.app);
            // Auth 초기화
            this.auth = getAuth(this.app);
            this.isInitialized = true;
            logger.info('Firebase가 성공적으로 초기화되었습니다.');
            return true;
        }
        catch (error) {
            logger.error('Firebase 초기화 실패:', error);
            return false;
        }
    }
    /**
     * Firestore 인스턴스 가져오기
     */
    getFirestore() {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.firestore;
    }
    /**
     * Auth 인스턴스 가져오기
     */
    getAuth() {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.auth;
    }
    /**
     * Firebase 초기화 여부 확인
     */
    getIsInitialized() {
        return this.isInitialized;
    }
}
FirebaseService.instance = null;
//# sourceMappingURL=FirebaseService.js.map