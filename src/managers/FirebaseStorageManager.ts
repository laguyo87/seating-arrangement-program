/**
 * Firebase Storage Manager
 * Firebase Firestore를 사용한 데이터 저장/불러오기
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { FirebaseService } from '../services/FirebaseService.js';
import { OutputModule } from '../modules/OutputModule.js';
import { logger } from '../utils/logger.js';
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
export class FirebaseStorageManager {
  private deps: FirebaseStorageManagerDependencies;
  private firebaseService: FirebaseService;
  private currentUser: User | null = null;
  private isAuthenticated: boolean = false;
  private snapshotUnsubscribes: Map<string, Unsubscribe> = new Map();

  constructor(dependencies: FirebaseStorageManagerDependencies) {
    this.deps = dependencies;
    this.firebaseService = FirebaseService.getInstance();
    
    // Firebase 초기화
    if (this.firebaseService.initialize()) {
      this.setupAuthListener();
    }
  }

  /**
   * 인증 상태 리스너 설정
   */
  private setupAuthListener(): void {
    const auth = this.firebaseService.getAuth();
    if (!auth) return;

    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      
      if (user) {
        logger.info('Firebase 인증 완료:', user.email);
      } else {
        logger.info('Firebase 로그아웃됨');
      }
    });
  }

  /**
   * Google 로그인
   */
  public async signInWithGoogle(): Promise<boolean> {
    try {
      const auth = this.firebaseService.getAuth();
      if (!auth) {
        this.deps.outputModule.showError('Firebase가 초기화되지 않았습니다.');
        return false;
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      this.currentUser = result.user;
      this.isAuthenticated = true;
      
      this.deps.outputModule.showInfo('Google 로그인이 완료되었습니다.');
      return true;
    } catch (error) {
      logger.error('Google 로그인 실패:', error);
      this.deps.outputModule.showError('로그인에 실패했습니다. 다시 시도해주세요.');
      return false;
    }
  }

  /**
   * 이메일/비밀번호 회원가입
   */
  public async signUpWithEmailAndPassword(email: string, password: string, displayName?: string): Promise<boolean> {
    try {
      const auth = this.firebaseService.getAuth();
      if (!auth) {
        this.deps.outputModule.showError('Firebase가 초기화되지 않았습니다.');
        return false;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // 사용자 이름 설정
      if (displayName && result.user) {
        try {
          await updateProfile(result.user, {
            displayName: displayName
          });
        } catch (profileError) {
          logger.warn('사용자 이름 설정 실패:', profileError);
          // 이름 설정 실패해도 회원가입은 성공으로 처리
        }
      }
      
      this.currentUser = result.user;
      this.isAuthenticated = true;
      
      this.deps.outputModule.showInfo('회원가입이 완료되었습니다.');
      return true;
    } catch (error: any) {
      logger.error('회원가입 실패:', error);
      
      let errorMessage = '회원가입에 실패했습니다.';
      if (error?.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = '올바른 이메일 형식이 아닙니다.';
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }
      
      this.deps.outputModule.showError(errorMessage);
      return false;
    }
  }

  /**
   * 이메일/비밀번호 로그인
   */
  public async signInWithEmailAndPassword(email: string, password: string): Promise<boolean> {
    try {
      const auth = this.firebaseService.getAuth();
      if (!auth) {
        this.deps.outputModule.showError('Firebase가 초기화되지 않았습니다.');
        return false;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      
      this.currentUser = result.user;
      this.isAuthenticated = true;
      
      this.deps.outputModule.showInfo('로그인이 완료되었습니다.');
      return true;
    } catch (error: any) {
      logger.error('로그인 실패:', error);
      
      let errorMessage = '로그인에 실패했습니다.';
      if (error?.code === 'auth/user-not-found') {
        errorMessage = '등록되지 않은 이메일입니다.';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = '비밀번호가 올바르지 않습니다.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = '올바른 이메일 형식이 아닙니다.';
      }
      
      this.deps.outputModule.showError(errorMessage);
      return false;
    }
  }

  /**
   * 로그아웃
   */
  public async signOut(): Promise<void> {
    try {
      // 모든 실시간 리스너 해제
      this.unsubscribeAllRealtimeListeners();
      
      const auth = this.firebaseService.getAuth();
      if (!auth) return;

      await signOut(auth);
      this.currentUser = null;
      this.isAuthenticated = false;
      
      this.deps.outputModule.showInfo('로그아웃되었습니다.');
    } catch (error) {
      logger.error('로그아웃 실패:', error);
    }
  }

  /**
   * 현재 로그인 상태 확인
   */
  public getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * 사용자 ID 가져오기
   */
  private getUserId(): string | null {
    return this.currentUser?.uid || null;
  }

  /**
   * 반 목록 저장
   */
  public async saveClassList(classList: ClassInfo[]): Promise<boolean> {
    if (!this.isAuthenticated) {
      this.deps.outputModule.showError('로그인이 필요합니다.');
      return false;
    }

    try {
      const userId = this.getUserId();
      if (!userId) return false;

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return false;

      const userDocRef = doc(firestore, 'users', userId);
      const saveData = {
        classList: classList,
        lastUpdated: Timestamp.now()
      };
      
      logger.info('Firebase에 반 목록 저장 시작:', { userId, classCount: classList.length });
      await setDoc(userDocRef, saveData, { merge: true });
      
      logger.info('✅ Firebase에 반 목록 저장 완료:', { userId, classCount: classList.length });
      this.deps.outputModule.showInfo(`Firebase에 반 목록 ${classList.length}개 저장 완료`);
      
      return true;
    } catch (error) {
      logger.error('❌ 반 목록 저장 실패:', error);
      this.deps.outputModule.showError('반 목록 저장에 실패했습니다.');
      return false;
    }
  }

  /**
   * 반 목록 불러오기
   */
  public async loadClassList(): Promise<ClassInfo[]> {
    if (!this.isAuthenticated) {
      return [];
    }

    try {
      const userId = this.getUserId();
      if (!userId) return [];

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return [];

      const userDocRef = doc(firestore, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return (data.classList as ClassInfo[]) || [];
      }

      return [];
    } catch (error) {
      logger.error('반 목록 불러오기 실패:', error);
      return [];
    }
  }

  /**
   * 반별 자리 배치도 저장
   */
  public async saveClassLayout(classId: string, layout: ClassLayoutData): Promise<boolean> {
    if (!this.isAuthenticated) {
      this.deps.outputModule.showError('로그인이 필요합니다.');
      return false;
    }

    try {
      const userId = this.getUserId();
      if (!userId) return false;

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return false;

      const layoutDocRef = doc(firestore, 'users', userId, 'classes', classId);
      const saveData = {
        ...layout,
        lastUpdated: Timestamp.now()
      };
      
      logger.info('Firebase에 자리 배치도 저장 시작:', { 
        userId, 
        classId, 
        className: layout.className,
        seatsCount: layout.seats.length,
        studentsCount: layout.students.length
      });
      
      await setDoc(layoutDocRef, saveData);
      
      logger.info('✅ Firebase에 자리 배치도 저장 완료:', { 
        userId, 
        classId, 
        className: layout.className,
        path: `users/${userId}/classes/${classId}`
      });
      
      this.deps.outputModule.showInfo(`Firebase에 "${layout.className}" 자리 배치도 저장 완료`);
      
      return true;
    } catch (error) {
      logger.error('❌ 자리 배치도 저장 실패:', error);
      this.deps.outputModule.showError('자리 배치도 저장에 실패했습니다.');
      return false;
    }
  }

  /**
   * 반별 자리 배치도 불러오기
   */
  public async loadClassLayout(classId: string): Promise<ClassLayoutData | null> {
    if (!this.isAuthenticated) {
      return null;
    }

    try {
      const userId = this.getUserId();
      if (!userId) return null;

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return null;

      const layoutDocRef = doc(firestore, 'users', userId, 'classes', classId);
      const layoutDocSnap = await getDoc(layoutDocRef);

      if (layoutDocSnap.exists()) {
        const data = layoutDocSnap.data();
        return {
          seats: data.seats || [],
          students: data.students || [],
          timestamp: data.timestamp || new Date().toISOString(),
          className: data.className || ''
        } as ClassLayoutData;
      }

      return null;
    } catch (error) {
      logger.error('자리 배치도 불러오기 실패:', error);
      return null;
    }
  }

  /**
   * 반 삭제
   */
  public async deleteClass(classId: string): Promise<boolean> {
    if (!this.isAuthenticated) {
      return false;
    }

    try {
      const userId = this.getUserId();
      if (!userId) return false;

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return false;

      const layoutDocRef = doc(firestore, 'users', userId, 'classes', classId);
      await deleteDoc(layoutDocRef);

      return true;
    } catch (error) {
      logger.error('반 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 모든 데이터 동기화 (localStorage → Firebase)
   */
  public async syncAllData(localData: {
    classList?: ClassInfo[];
    classLayouts?: Map<string, ClassLayoutData>;
  }): Promise<boolean> {
    if (!this.isAuthenticated) {
      return false;
    }

    try {
      logger.info('Firebase 데이터 동기화 시작');
      
      // 반 목록 동기화
      if (localData.classList) {
        await this.saveClassList(localData.classList);
      }

      // 반별 자리 배치도 동기화
      if (localData.classLayouts) {
        for (const [classId, layout] of localData.classLayouts.entries()) {
          await this.saveClassLayout(classId, layout);
        }
      }

      logger.info('✅ Firebase 데이터 동기화 완료');
      return true;
    } catch (error) {
      logger.error('❌ 데이터 동기화 실패:', error);
      return false;
    }
  }

  /**
   * 실시간 리스너 설정 (반 목록)
   */
  public setupRealtimeListener(
    onUpdate: (classList: ClassInfo[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe | null {
    if (!this.isAuthenticated) {
      return null;
    }

    try {
      const userId = this.getUserId();
      if (!userId) return null;

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return null;

      const userDocRef = doc(firestore, 'users', userId);
      
      logger.info('Firebase 실시간 리스너 설정:', { userId });
      
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const classList = (data.classList as ClassInfo[]) || [];
            logger.info('🔄 Firebase 실시간 업데이트 감지:', { classCount: classList.length });
            onUpdate(classList);
          } else {
            logger.info('Firebase 문서가 존재하지 않음');
            onUpdate([]);
          }
        },
        (error) => {
          logger.error('❌ Firebase 실시간 리스너 오류:', error);
          if (onError) {
            onError(error);
          }
        }
      );

      this.snapshotUnsubscribes.set('classList', unsubscribe);
      return unsubscribe;
    } catch (error) {
      logger.error('실시간 리스너 설정 실패:', error);
      return null;
    }
  }

  /**
   * 실시간 리스너 해제
   */
  public unsubscribeRealtimeListener(key: string): void {
    const unsubscribe = this.snapshotUnsubscribes.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.snapshotUnsubscribes.delete(key);
      logger.info('Firebase 실시간 리스너 해제:', { key });
    }
  }

  /**
   * 모든 실시간 리스너 해제
   */
  public unsubscribeAllRealtimeListeners(): void {
    this.snapshotUnsubscribes.forEach((unsubscribe, key) => {
      unsubscribe();
      logger.info('Firebase 실시간 리스너 해제:', { key });
    });
    this.snapshotUnsubscribes.clear();
  }
}



