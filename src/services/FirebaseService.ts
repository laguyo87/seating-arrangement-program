/**
 * Firebase 서비스
 * Firebase 초기화 및 기본 기능 제공
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from '../config/firebase.config.js';
import { logger } from '../utils/logger.js';

/**
 * Firebase 서비스 클래스
 */
export class FirebaseService {
  private static instance: FirebaseService | null = null;
  private app: FirebaseApp | null = null;
  private firestore: Firestore | null = null;
  private auth: Auth | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    // 싱글톤 패턴
  }

  /**
   * FirebaseService 인스턴스 가져오기 (싱글톤)
   */
  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Firebase 초기화
   */
  public initialize(): boolean {
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
    } catch (error) {
      logger.error('Firebase 초기화 실패:', error);
      return false;
    }
  }

  /**
   * Firestore 인스턴스 가져오기
   */
  public getFirestore(): Firestore | null {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.firestore;
  }

  /**
   * Auth 인스턴스 가져오기
   */
  public getAuth(): Auth | null {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.auth;
  }

  /**
   * Firebase 초기화 여부 확인
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}





