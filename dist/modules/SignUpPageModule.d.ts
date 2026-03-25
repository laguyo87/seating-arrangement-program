/**
 * 회원가입 페이지 모듈
 * Firebase 이메일/비밀번호 회원가입 UI 및 로직 담당
 */
import { FirebaseStorageManager } from '../managers/FirebaseStorageManager.js';
import { OutputModule } from './OutputModule.js';
/**
 * SignUpPageModule 의존성 인터페이스
 */
export interface SignUpPageModuleDependencies {
    firebaseStorageManager: FirebaseStorageManager;
    outputModule: OutputModule;
    onSignUpSuccess?: () => void;
    onClose?: () => void;
    onBackToLogin?: () => void;
}
/**
 * 회원가입 페이지 모듈 클래스
 */
export declare class SignUpPageModule {
    private deps;
    private signUpPageContainer;
    private isVisible;
    constructor(dependencies: SignUpPageModuleDependencies);
    /**
     * 회원가입 페이지 표시
     */
    show(): void;
    /**
     * 회원가입 페이지 숨기기
     */
    hide(): void;
    /**
     * 회원가입 페이지 생성
     */
    private createSignUpPage;
    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners;
    /**
     * 비밀번호 일치 검증
     */
    private validatePasswordMatch;
    /**
     * 회원가입 처리
     */
    private handleSignUp;
    /**
     * 회원가입 페이지 표시 여부 확인
     */
    getIsVisible(): boolean;
}
//# sourceMappingURL=SignUpPageModule.d.ts.map