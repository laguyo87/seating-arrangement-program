/**
 * 로그인 페이지 모듈
 * Firebase 로그인 UI 및 로직 담당
 */
import { FirebaseStorageManager } from '../managers/FirebaseStorageManager.js';
import { OutputModule } from './OutputModule.js';
/**
 * LoginPageModule 의존성 인터페이스
 */
export interface LoginPageModuleDependencies {
    firebaseStorageManager: FirebaseStorageManager;
    outputModule: OutputModule;
    onLoginSuccess?: () => void;
    onClose?: () => void;
    onShowSignUp?: () => void;
}
/**
 * 로그인 페이지 모듈 클래스
 */
export declare class LoginPageModule {
    private deps;
    private loginPageContainer;
    private isVisible;
    constructor(dependencies: LoginPageModuleDependencies);
    /**
     * 로그인 페이지 표시
     */
    show(): void;
    /**
     * 로그인 페이지 숨기기
     */
    hide(): void;
    /**
     * 로그인 페이지 생성
     */
    private createLoginPage;
    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners;
    /**
     * Google 로그인 처리
     */
    private handleGoogleLogin;
    /**
     * 이메일/비밀번호 로그인 처리
     */
    private handleEmailLogin;
    /**
     * 로그인 페이지 표시 여부 확인
     */
    getIsVisible(): boolean;
}
//# sourceMappingURL=LoginPageModule.d.ts.map