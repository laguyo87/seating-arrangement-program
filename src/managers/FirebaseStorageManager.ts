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
  Unsubscribe,
  runTransaction,
  increment
} from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
  /** 인증 상태가 한 번이라도 확정되었는지 (복원 완료 여부) */
  private authStateResolved: boolean = false;
  /** 인증 상태 확정 시 호출할 콜백들 */
  private authStateListeners: Array<(authenticated: boolean) => void> = [];
  private snapshotUnsubscribes: Map<string, Unsubscribe> = new Map();

  constructor(dependencies: FirebaseStorageManagerDependencies) {
    this.deps = dependencies;
    this.firebaseService = FirebaseService.getInstance();
    
    // Firebase 초기화
    if (this.firebaseService.initialize()) {
      this.setupAuthListener();
    } else {
      // Firebase를 쓸 수 없는 환경. 인증 상태는 '비로그인'으로 확정된 것으로 본다.
      this.markAuthStateResolved();
    }
  }

  /**
   * 인증 상태 리스너 설정
   */
  private setupAuthListener(): void {
    const auth = this.firebaseService.getAuth();
    if (!auth) {
      this.markAuthStateResolved();
      return;
    }

    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      
      if (user) {
        logger.info('Firebase 인증 완료:', user.email);
      } else {
        logger.info('Firebase 로그아웃됨');
      }

      this.markAuthStateResolved();
    });
  }

  /**
   * 인증 상태가 확정되었음을 구독자에게 알린다.
   *
   * 인증 복원(IndexedDB에서 세션을 되살리는 과정)은 걸리는 시간이 일정하지 않다.
   * 고정 시간 타이머로 기다리면, 복원이 늦은 기기에서는 로그인 상태를 놓쳐
   * 클라우드 데이터를 불러오지 못한 채 빈 로컬 데이터로 시작하게 된다.
   * 그 상태에서 저장이 일어나면 클라우드의 기존 데이터가 지워진다.
   */
  private markAuthStateResolved(): void {
    this.authStateResolved = true;
    const listeners = [...this.authStateListeners];
    listeners.forEach((listener) => {
      try {
        listener(this.isAuthenticated);
      } catch (error) {
        logger.error('인증 상태 리스너 실행 중 오류:', error);
      }
    });
  }

  /**
   * 인증 상태가 확정될 때 호출될 콜백을 등록한다.
   * 이미 확정된 뒤에 등록하면 즉시 한 번 호출된다.
   * 이후 로그인/로그아웃이 일어날 때마다 다시 호출된다.
   */
  public onAuthStateResolved(listener: (authenticated: boolean) => void): void {
    this.authStateListeners.push(listener);
    if (this.authStateResolved) {
      try {
        listener(this.isAuthenticated);
      } catch (error) {
        logger.error('인증 상태 리스너 실행 중 오류:', error);
      }
    }
  }

  /**
   * Google 로그인 (팝업 방식, 실패 시 리다이렉트 방식으로 자동 전환)
   */
  public async signInWithGoogle(): Promise<boolean> {
    try {
      const auth = this.firebaseService.getAuth();
      if (!auth) {
        this.deps.outputModule.showError('Firebase가 초기화되지 않았습니다.');
        logger.error('Firebase Auth가 초기화되지 않음');
        return false;
      }

      // GoogleAuthProvider 설정
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account' // 계정 선택 화면 표시
      });
      provider.addScope('profile');
      provider.addScope('email');

      logger.info('Google 로그인 팝업 시도 시작');
      
      try {
        // 먼저 팝업 방식 시도
        const result = await signInWithPopup(auth, provider);
        
        this.currentUser = result.user;
        this.isAuthenticated = true;
        
        logger.info('Google 로그인 성공 (팝업):', { 
          email: result.user.email, 
          displayName: result.user.displayName,
          uid: result.user.uid
        });
        
        this.deps.outputModule.showInfo('Google 로그인이 완료되었습니다.');
        return true;
      } catch (popupError: any) {
        logger.warn('팝업 로그인 실패, 리다이렉트 방식으로 전환:', popupError);
        
        // 팝업이 차단된 경우 리다이렉트 방식으로 자동 전환
        if (popupError?.code === 'auth/popup-blocked' || 
            popupError?.code === 'auth/popup-closed-by-user' ||
            popupError?.code === 'auth/cancelled-popup-request') {
          
          logger.info('리다이렉트 방식으로 Google 로그인 시도');
          this.deps.outputModule.showInfo('팝업이 차단되어 리다이렉트 방식으로 로그인합니다...');
          
          // 리다이렉트 방식으로 로그인
          await signInWithRedirect(auth, provider);
          
          // 리다이렉트는 페이지가 이동하므로 여기서는 true 반환
          // 실제 로그인 결과는 getRedirectResult에서 확인
          return true;
        } else {
          // 다른 에러는 그대로 throw
          throw popupError;
        }
      }
    } catch (error: any) {
      logger.error('Google 로그인 실패:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      
      let errorMessage = '로그인에 실패했습니다.';
      
      // Firebase Auth 에러 코드에 따른 구체적인 메시지
      if (error?.code === 'auth/popup-blocked') {
        errorMessage = '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용하거나, 페이지를 새로고침하여 다시 시도해주세요.';
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errorMessage = '로그인 창이 닫혔습니다. 다시 시도해주세요.';
      } else if (error?.code === 'auth/cancelled-popup-request') {
        errorMessage = '로그인 요청이 취소되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (error?.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        const firebaseConsoleUrl = `https://console.firebase.google.com/project/seating-arrangement-back-7ffa1/authentication/settings`;
        
        // 콘솔에 상세 안내 출력
        console.error('🚨 도메인 미승인 에러 발생!');
        console.error(`현재 도메인: ${currentDomain}`);
        console.error('해결 방법:');
        console.error(`1. Firebase Console 접속: ${firebaseConsoleUrl}`);
        console.error('2. "Authorized domains" 탭 클릭');
        console.error(`3. "Add domain" 클릭 후 "${currentDomain}" 추가`);
        console.error('4. 저장 후 페이지 새로고침');
        
        errorMessage = `현재 도메인(${currentDomain})이 승인되지 않았습니다.\n\n해결 방법:\n1. Firebase Console 접속: ${firebaseConsoleUrl}\n2. "Authorized domains" 탭 클릭\n3. "Add domain" 클릭 후 "${currentDomain}" 추가\n4. 저장 후 페이지 새로고침\n\n(브라우저 콘솔에 더 자세한 안내가 출력되었습니다.)`;
      } else if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google 로그인이 활성화되지 않았습니다. Firebase Console → Authentication → Sign-in method에서 Google을 활성화해주세요.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (error?.code === 'auth/internal-error') {
        errorMessage = '내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error?.message) {
        errorMessage = `로그인 오류: ${error.message}`;
        // 콘솔에 상세 에러 출력
        console.error('Google 로그인 상세 에러:', error);
      } else {
        errorMessage = `로그인 오류가 발생했습니다. (코드: ${error?.code || 'unknown'})`;
        console.error('Google 로그인 알 수 없는 에러:', error);
      }
      
      this.deps.outputModule.showError(errorMessage);
      return false;
    }
  }

  /**
   * 리다이렉트 로그인 결과 확인 (페이지 로드 시 호출)
   */
  public async checkRedirectResult(): Promise<boolean> {
    try {
      const auth = this.firebaseService.getAuth();
      if (!auth) {
        return false;
      }

      const result = await getRedirectResult(auth);
      if (result) {
        this.currentUser = result.user;
        this.isAuthenticated = true;
        
        logger.info('Google 로그인 성공 (리다이렉트):', { 
          email: result.user.email, 
          displayName: result.user.displayName,
          uid: result.user.uid
        });
        
        this.deps.outputModule.showInfo('Google 로그인이 완료되었습니다.');
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.error('리다이렉트 로그인 결과 확인 실패:', error);
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

      logger.info('이메일/비밀번호 로그인 시도:', { email });
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      this.currentUser = result.user;
      this.isAuthenticated = true;
      
      logger.info('이메일/비밀번호 로그인 성공:', { 
        email: result.user.email, 
        displayName: result.user.displayName 
      });
      
      this.deps.outputModule.showInfo('로그인이 완료되었습니다.');
      return true;
    } catch (error: any) {
      logger.error('이메일/비밀번호 로그인 실패:', error);
      
      let errorMessage = '로그인에 실패했습니다.';
      
      // Firebase Auth 에러 코드에 따른 구체적인 메시지
      if (error?.code === 'auth/user-not-found') {
        errorMessage = '등록되지 않은 이메일입니다.';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = '비밀번호가 올바르지 않습니다.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = '올바른 이메일 형식이 아닙니다.';
      } else if (error?.code === 'auth/invalid-credential') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error?.code === 'auth/user-disabled') {
        errorMessage = '이 계정은 비활성화되었습니다.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = '이메일/비밀번호 로그인이 활성화되지 않았습니다. Firebase Console에서 활성화해주세요.';
      } else if (error?.message) {
        errorMessage = `로그인 오류: ${error.message}`;
      }
      
      // outputModule에 에러 표시는 하지 않음 (LoginPageModule에서 처리)
      // this.deps.outputModule.showError(errorMessage);
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
   * 반별 확정된 자리 이력 저장
   */
  public async saveSeatHistory(classId: string, history: Array<{
    id: string;
    date: string;
    layout: Array<{seatId: number, studentName: string, gender: 'M' | 'F'}>;
    pairInfo?: Array<{student1: string, student2: string}>;
    timestamp: number;
    layoutType?: string;
    singleMode?: string;
    pairMode?: string;
    partitionCount?: number;
    groupSize?: string;
    classId?: string;
  }>): Promise<boolean> {
    if (!this.isAuthenticated) {
      // 로그인되어 있지 않으면 클라우드 저장을 수행하지 않았음을 그대로 알린다.
      // 호출부는 로그인 여부를 먼저 확인하고 이 메서드를 호출한다.
      return false;
    }

    try {
      const userId = this.getUserId();
      if (!userId) return false;

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return false;

      // Firebase는 undefined 값을 허용하지 않으므로 undefined 필드 제거
      const cleanedHistory = history.map(item => {
        const cleaned: any = {
          id: item.id,
          date: item.date,
          layout: item.layout,
          timestamp: item.timestamp
        };
        
        // undefined가 아닌 필드만 추가
        if (item.pairInfo !== undefined) {
          cleaned.pairInfo = item.pairInfo;
        }
        if (item.layoutType !== undefined) {
          cleaned.layoutType = item.layoutType;
        }
        if (item.singleMode !== undefined) {
          cleaned.singleMode = item.singleMode;
        }
        if (item.pairMode !== undefined) {
          cleaned.pairMode = item.pairMode;
        }
        if (item.partitionCount !== undefined) {
          cleaned.partitionCount = item.partitionCount;
        }
        if (item.groupSize !== undefined) {
          cleaned.groupSize = item.groupSize;
        }
        if (item.classId !== undefined) {
          cleaned.classId = item.classId;
        }
        
        return cleaned;
      });

      const historyDocRef = doc(firestore, 'users', userId, 'classes', classId, 'seatHistory', 'history');
      const saveData = {
        history: cleanedHistory,
        lastUpdated: Timestamp.now()
      };
      
      logger.info('Firebase에 확정된 자리 이력 저장 시작:', { 
        userId, 
        classId, 
        historyCount: history.length
      });
      
      await setDoc(historyDocRef, saveData);
      
      logger.info('✅ Firebase에 확정된 자리 이력 저장 완료:', { 
        userId, 
        classId, 
        historyCount: history.length,
        path: `users/${userId}/classes/${classId}/seatHistory/history`
      });
      
      return true;
    } catch (error) {
      logger.error('❌ 확정된 자리 이력 저장 실패:', error);
      // 실패를 성공으로 보고하면 호출부가 사용자에게 저장 완료를 알리게 되고,
      // 교사는 클라우드에 남지 않은 이력을 저장된 것으로 믿게 된다.
      return false;
    }
  }

  /**
   * 반별 확정된 자리 이력 불러오기
   */
  public async loadSeatHistory(classId: string): Promise<Array<{
    id: string;
    date: string;
    layout: Array<{seatId: number, studentName: string, gender: 'M' | 'F'}>;
    pairInfo?: Array<{student1: string, student2: string}>;
    timestamp: number;
    layoutType?: string;
    singleMode?: string;
    pairMode?: string;
    partitionCount?: number;
    groupSize?: string;
    classId?: string;
  }> | null> {
    if (!this.isAuthenticated) {
      return null;
    }

    try {
      const userId = this.getUserId();
      if (!userId) return null;

      const firestore = this.firebaseService.getFirestore();
      if (!firestore) return null;

      const historyDocRef = doc(firestore, 'users', userId, 'classes', classId, 'seatHistory', 'history');
      const historyDocSnap = await getDoc(historyDocRef);

      if (historyDocSnap.exists()) {
        const data = historyDocSnap.data();
        return data.history || [];
      }

      return null;
    } catch (error) {
      logger.error('확정된 자리 이력 불러오기 실패:', error);
      return null;
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

  /**
   * 방문자 수 증가 (트랜잭션 사용)
   */
  public async incrementVisitorCount(): Promise<number | null> {
    try {
      const firestore = this.firebaseService.getFirestore();
      if (!firestore) {
        logger.warn('Firestore가 초기화되지 않았습니다.');
        return null;
      }

      const statsDocRef = doc(firestore, 'globalStats', 'visitorCount');
      
      // 트랜잭션을 사용하여 원자적으로 증가
      const newCount = await runTransaction(firestore, async (transaction) => {
        const statsDoc = await transaction.get(statsDocRef);
        
        let currentCount = 0;
        if (statsDoc.exists()) {
          currentCount = statsDoc.data().count || 0;
        }
        
        const newCount = currentCount + 1;
        transaction.set(statsDocRef, {
          count: newCount,
          lastUpdated: Timestamp.now()
        }, { merge: true });
        
        return newCount;
      });

      logger.info('✅ 방문자 수 증가 완료:', { count: newCount });
      return newCount;
    } catch (error) {
      logger.error('❌ 방문자 수 증가 실패:', error);
      return null;
    }
  }

  /**
   * 현재 방문자 수 가져오기
   */
  public async getVisitorCount(): Promise<number> {
    try {
      const firestore = this.firebaseService.getFirestore();
      if (!firestore) {
        logger.warn('Firestore가 초기화되지 않았습니다.');
        return 0;
      }

      const statsDocRef = doc(firestore, 'globalStats', 'visitorCount');
      const statsDoc = await getDoc(statsDocRef);
      
      if (statsDoc.exists()) {
        const count = statsDoc.data().count || 0;
        return count;
      }
      
      return 0;
    } catch (error) {
      logger.error('방문자 수 가져오기 실패:', error);
      return 0;
    }
  }

  /**
   * 방문자 수 실시간 리스너 설정
   */
  public setupVisitorCountListener(
    onUpdate: (count: number) => void,
    onError?: (error: Error) => void
  ): Unsubscribe | null {
    try {
      const firestore = this.firebaseService.getFirestore();
      if (!firestore) {
        logger.warn('Firestore가 초기화되지 않았습니다.');
        return null;
      }

      const statsDocRef = doc(firestore, 'globalStats', 'visitorCount');
      
      logger.info('방문자 수 실시간 리스너 설정');
      
      const unsubscribe = onSnapshot(
        statsDocRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const count = docSnapshot.data().count || 0;
            logger.info('🔄 방문자 수 실시간 업데이트:', { count });
            onUpdate(count);
          } else {
            logger.info('방문자 수 문서가 존재하지 않음');
            onUpdate(0);
          }
        },
        (error) => {
          logger.error('❌ 방문자 수 리스너 오류:', error);
          if (onError) {
            onError(error);
          }
        }
      );

      this.snapshotUnsubscribes.set('visitorCount', unsubscribe);
      return unsubscribe;
    } catch (error) {
      logger.error('방문자 수 리스너 설정 실패:', error);
      return null;
    }
  }

  /**
   * FirebaseService 인스턴스 가져오기 (외부 접근용)
   */
  public getFirebaseService(): FirebaseService {
    return this.firebaseService;
  }
}




