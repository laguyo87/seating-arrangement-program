/**
 * 로그인 페이지 모듈
 * Firebase 로그인 UI 및 로직 담당
 */

import { FirebaseStorageManager } from '../managers/FirebaseStorageManager.js';
import { OutputModule } from './OutputModule.js';
import { logger } from '../utils/logger.js';

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
export class LoginPageModule {
    private deps: LoginPageModuleDependencies;
    private loginPageContainer: HTMLDivElement | null = null;
    private isVisible: boolean = false;

    constructor(dependencies: LoginPageModuleDependencies) {
        this.deps = dependencies;
    }

    /**
     * 로그인 페이지 표시
     */
    public show(): void {
        if (this.isVisible) {
            return;
        }

        this.createLoginPage();
        this.isVisible = true;
    }

    /**
     * 로그인 페이지 숨기기
     */
    public hide(): void {
        if (!this.isVisible || !this.loginPageContainer) {
            return;
        }

        this.loginPageContainer.remove();
        this.loginPageContainer = null;
        this.isVisible = false;

        if (this.deps.onClose) {
            this.deps.onClose();
        }
    }

    /**
     * 로그인 페이지 생성
     */
    private createLoginPage(): void {
        // 기존 로그인 페이지가 있으면 제거
        const existing = document.getElementById('login-page-container');
        if (existing) {
            existing.remove();
        }

        // 로그인 페이지 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'login-page-container';
        container.className = 'login-page-container';

        // 로그인 페이지 내용
        container.innerHTML = `
            <div class="login-page-content">
                <div class="login-page-header">
                    <h2>로그인</h2>
                    <button id="login-page-close-btn" class="login-page-close-btn" aria-label="닫기">×</button>
                </div>
                <div class="login-page-body">
                    <div class="login-page-description">
                        <p>로그인하여 클라우드에 데이터를 동기화할 수 있습니다.</p>
                        <ul class="login-page-features">
                            <li>📱 여러 기기에서 동일한 데이터 사용</li>
                            <li>☁️ 클라우드에 자동 백업</li>
                            <li>🔄 실시간 동기화</li>
                        </ul>
                    </div>
                    <form id="login-form" class="login-form">
                        <div class="login-form-group">
                            <label for="login-email" class="login-form-label">이메일</label>
                            <input 
                                type="email" 
                                id="login-email" 
                                class="login-form-input" 
                                placeholder="example@email.com"
                                required
                                autocomplete="email"
                            />
                            <span class="login-form-error" id="login-email-error"></span>
                        </div>
                        <div class="login-form-group">
                            <label for="login-password" class="login-form-label">비밀번호</label>
                            <input 
                                type="password" 
                                id="login-password" 
                                class="login-form-input" 
                                placeholder="비밀번호"
                                required
                                autocomplete="current-password"
                            />
                            <span class="login-form-error" id="login-password-error"></span>
                        </div>
                        <div class="login-page-actions">
                            <button type="submit" id="login-submit-btn" class="login-submit-btn">
                                이메일로 로그인
                            </button>
                        </div>
                    </form>
                    <div class="login-page-divider">
                        <span>또는</span>
                    </div>
                    <div class="login-page-actions">
                        <button id="login-page-google-btn" class="login-page-google-btn">
                            <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                            </svg>
                            Google로 로그인
                        </button>
                        <button id="login-page-signup-btn" class="login-page-signup-btn">
                            회원가입
                        </button>
                        <button id="login-page-cancel-btn" class="login-page-cancel-btn">
                            취소
                        </button>
                    </div>
                    <div id="login-page-status" class="login-page-status" style="display: none;"></div>
                </div>
            </div>
        `;

        // DOM에 추가
        document.body.appendChild(container);
        this.loginPageContainer = container;

        // 이벤트 리스너 설정
        this.setupEventListeners();

        // 애니메이션 효과
        requestAnimationFrame(() => {
            container.classList.add('login-page-visible');
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        if (!this.loginPageContainer) return;

        // 닫기 버튼
        const closeBtn = this.loginPageContainer.querySelector('#login-page-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // 취소 버튼
        const cancelBtn = this.loginPageContainer.querySelector('#login-page-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Google 로그인 버튼
        const googleBtn = this.loginPageContainer.querySelector('#login-page-google-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => {
                this.handleGoogleLogin();
            });
        }

        // 회원가입 버튼
        const signUpBtn = this.loginPageContainer.querySelector('#login-page-signup-btn');
        if (signUpBtn) {
            signUpBtn.addEventListener('click', () => {
                this.hide();
                if (this.deps.onShowSignUp) {
                    this.deps.onShowSignUp();
                }
            });
        }

        // 이메일/비밀번호 로그인 폼
        const form = this.loginPageContainer.querySelector('#login-form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEmailLogin();
            });
        }

        // 배경 클릭 시 닫기
        this.loginPageContainer.addEventListener('click', (e) => {
            if (e.target === this.loginPageContainer) {
                this.hide();
            }
        });

        // ESC 키로 닫기
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Google 로그인 처리
     */
    private async handleGoogleLogin(): Promise<void> {
        const googleBtn = this.loginPageContainer?.querySelector('#login-page-google-btn') as HTMLButtonElement;
        const statusDiv = this.loginPageContainer?.querySelector('#login-page-status') as HTMLDivElement;

        if (!googleBtn || !statusDiv) return;

        // 버튼 비활성화
        googleBtn.disabled = true;
        googleBtn.textContent = '로그인 중...';
        statusDiv.style.display = 'none';

        try {
            const success = await this.deps.firebaseStorageManager.signInWithGoogle();
            
            if (success) {
                // 로그인 성공
                statusDiv.textContent = '로그인 성공!';
                statusDiv.className = 'login-page-status login-page-status-success';
                statusDiv.style.display = 'block';

                // 잠시 후 페이지 닫기
                setTimeout(() => {
                    this.hide();
                    if (this.deps.onLoginSuccess) {
                        this.deps.onLoginSuccess();
                    }
                }, 1000);
            } else {
                // 로그인 실패 - FirebaseStorageManager에서 이미 에러 메시지를 표시했으므로
                // 여기서는 간단한 메시지만 표시
                statusDiv.textContent = '로그인에 실패했습니다. 아래 에러 메시지를 확인해주세요.';
                statusDiv.className = 'login-page-status login-page-status-error';
                statusDiv.style.display = 'block';
                
                googleBtn.disabled = false;
                googleBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Google로 로그인
                `;
            }
        } catch (error) {
            logger.error('로그인 처리 중 오류:', error);
            statusDiv.textContent = '오류가 발생했습니다. 다시 시도해주세요.';
            statusDiv.className = 'login-page-status login-page-status-error';
            statusDiv.style.display = 'block';
            
            googleBtn.disabled = false;
            googleBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Google로 로그인
            `;
        }
    }

    /**
     * 이메일/비밀번호 로그인 처리
     */
    private async handleEmailLogin(): Promise<void> {
        const emailInput = this.loginPageContainer?.querySelector('#login-email') as HTMLInputElement;
        const passwordInput = this.loginPageContainer?.querySelector('#login-password') as HTMLInputElement;
        const submitBtn = this.loginPageContainer?.querySelector('#login-submit-btn') as HTMLButtonElement;
        const statusDiv = this.loginPageContainer?.querySelector('#login-page-status') as HTMLDivElement;

        if (!emailInput || !passwordInput || !submitBtn || !statusDiv) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const emailError = this.loginPageContainer?.querySelector('#login-email-error') as HTMLSpanElement;
            if (emailError) {
                emailError.textContent = '올바른 이메일 형식이 아닙니다.';
                emailError.style.display = 'block';
            }
            return;
        }

        // 비밀번호 검증
        if (!password || password.length < 6) {
            const passwordError = this.loginPageContainer?.querySelector('#login-password-error') as HTMLSpanElement;
            if (passwordError) {
                passwordError.textContent = '비밀번호를 입력해주세요.';
                passwordError.style.display = 'block';
            }
            return;
        }

        // 에러 메시지 초기화
        const emailError = this.loginPageContainer?.querySelector('#login-email-error') as HTMLSpanElement;
        const passwordError = this.loginPageContainer?.querySelector('#login-password-error') as HTMLSpanElement;
        if (emailError) emailError.style.display = 'none';
        if (passwordError) passwordError.style.display = 'none';

        // 버튼 비활성화
        submitBtn.disabled = true;
        submitBtn.textContent = '로그인 중...';
        statusDiv.style.display = 'none';

        try {
            const success = await this.deps.firebaseStorageManager.signInWithEmailAndPassword(email, password);
            
            if (success) {
                // 로그인 성공
                statusDiv.textContent = '로그인 성공!';
                statusDiv.className = 'login-page-status login-page-status-success';
                statusDiv.style.display = 'block';

                // 잠시 후 페이지 닫기
                setTimeout(() => {
                    this.hide();
                    if (this.deps.onLoginSuccess) {
                        this.deps.onLoginSuccess();
                    }
                }, 1000);
            } else {
                // 로그인 실패
                statusDiv.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
                statusDiv.className = 'login-page-status login-page-status-error';
                statusDiv.style.display = 'block';
                
                submitBtn.disabled = false;
                submitBtn.textContent = '이메일로 로그인';
            }
        } catch (error: any) {
            logger.error('이메일 로그인 처리 중 오류:', error);
            
            let errorMessage = '로그인에 실패했습니다.';
            
            // Firebase 에러 코드에 따른 메시지
            if (error?.code === 'auth/user-not-found') {
                errorMessage = '등록되지 않은 이메일입니다.';
                if (emailError) {
                    emailError.textContent = errorMessage;
                    emailError.style.display = 'block';
                }
            } else if (error?.code === 'auth/wrong-password') {
                errorMessage = '비밀번호가 올바르지 않습니다.';
                if (passwordError) {
                    passwordError.textContent = errorMessage;
                    passwordError.style.display = 'block';
                }
            } else if (error?.code === 'auth/invalid-email') {
                errorMessage = '올바른 이메일 형식이 아닙니다.';
                if (emailError) {
                    emailError.textContent = errorMessage;
                    emailError.style.display = 'block';
                }
            } else if (error?.code === 'auth/invalid-credential') {
                errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
                statusDiv.textContent = errorMessage;
            } else if (error?.code === 'auth/too-many-requests') {
                errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
                statusDiv.textContent = errorMessage;
            } else if (error?.message) {
                errorMessage = `로그인 오류: ${error.message}`;
                statusDiv.textContent = errorMessage;
            }
            
            statusDiv.className = 'login-page-status login-page-status-error';
            statusDiv.style.display = 'block';
            
            submitBtn.disabled = false;
            submitBtn.textContent = '이메일로 로그인';
        }
    }

    /**
     * 로그인 페이지 표시 여부 확인
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }
}



                // 로그인 성공
                statusDiv.textContent = '로그인 성공!';
                statusDiv.className = 'login-page-status login-page-status-success';
                statusDiv.style.display = 'block';

                // 잠시 후 페이지 닫기
                setTimeout(() => {
                    this.hide();
                    if (this.deps.onLoginSuccess) {
                        this.deps.onLoginSuccess();
                    }
                }, 1000);
            } else {
                // 로그인 실패 - FirebaseStorageManager에서 이미 에러 메시지를 표시했으므로
                // 여기서는 간단한 메시지만 표시
                statusDiv.textContent = '로그인에 실패했습니다. 아래 에러 메시지를 확인해주세요.';
                statusDiv.className = 'login-page-status login-page-status-error';
                statusDiv.style.display = 'block';
                
                googleBtn.disabled = false;
                googleBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Google로 로그인
                `;
            }
        } catch (error) {
            logger.error('로그인 처리 중 오류:', error);
            statusDiv.textContent = '오류가 발생했습니다. 다시 시도해주세요.';
            statusDiv.className = 'login-page-status login-page-status-error';
            statusDiv.style.display = 'block';
            
            googleBtn.disabled = false;
            googleBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Google로 로그인
            `;
        }
    }

    /**
     * 이메일/비밀번호 로그인 처리
     */
    private async handleEmailLogin(): Promise<void> {
        const emailInput = this.loginPageContainer?.querySelector('#login-email') as HTMLInputElement;
        const passwordInput = this.loginPageContainer?.querySelector('#login-password') as HTMLInputElement;
        const submitBtn = this.loginPageContainer?.querySelector('#login-submit-btn') as HTMLButtonElement;
        const statusDiv = this.loginPageContainer?.querySelector('#login-page-status') as HTMLDivElement;

        if (!emailInput || !passwordInput || !submitBtn || !statusDiv) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const emailError = this.loginPageContainer?.querySelector('#login-email-error') as HTMLSpanElement;
            if (emailError) {
                emailError.textContent = '올바른 이메일 형식이 아닙니다.';
                emailError.style.display = 'block';
            }
            return;
        }

        // 비밀번호 검증
        if (!password || password.length < 6) {
            const passwordError = this.loginPageContainer?.querySelector('#login-password-error') as HTMLSpanElement;
            if (passwordError) {
                passwordError.textContent = '비밀번호를 입력해주세요.';
                passwordError.style.display = 'block';
            }
            return;
        }

        // 에러 메시지 초기화
        const emailError = this.loginPageContainer?.querySelector('#login-email-error') as HTMLSpanElement;
        const passwordError = this.loginPageContainer?.querySelector('#login-password-error') as HTMLSpanElement;
        if (emailError) emailError.style.display = 'none';
        if (passwordError) passwordError.style.display = 'none';

        // 버튼 비활성화
        submitBtn.disabled = true;
        submitBtn.textContent = '로그인 중...';
        statusDiv.style.display = 'none';

        try {
            const success = await this.deps.firebaseStorageManager.signInWithEmailAndPassword(email, password);
            
            if (success) {
                // 로그인 성공
                statusDiv.textContent = '로그인 성공!';
                statusDiv.className = 'login-page-status login-page-status-success';
                statusDiv.style.display = 'block';

                // 잠시 후 페이지 닫기
                setTimeout(() => {
                    this.hide();
                    if (this.deps.onLoginSuccess) {
                        this.deps.onLoginSuccess();
                    }
                }, 1000);
            } else {
                // 로그인 실패
                statusDiv.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
                statusDiv.className = 'login-page-status login-page-status-error';
                statusDiv.style.display = 'block';
                
                submitBtn.disabled = false;
                submitBtn.textContent = '이메일로 로그인';
            }
        } catch (error: any) {
            logger.error('이메일 로그인 처리 중 오류:', error);
            
            let errorMessage = '로그인에 실패했습니다.';
            
            // Firebase 에러 코드에 따른 메시지
            if (error?.code === 'auth/user-not-found') {
                errorMessage = '등록되지 않은 이메일입니다.';
                if (emailError) {
                    emailError.textContent = errorMessage;
                    emailError.style.display = 'block';
                }
            } else if (error?.code === 'auth/wrong-password') {
                errorMessage = '비밀번호가 올바르지 않습니다.';
                if (passwordError) {
                    passwordError.textContent = errorMessage;
                    passwordError.style.display = 'block';
                }
            } else if (error?.code === 'auth/invalid-email') {
                errorMessage = '올바른 이메일 형식이 아닙니다.';
                if (emailError) {
                    emailError.textContent = errorMessage;
                    emailError.style.display = 'block';
                }
            } else if (error?.code === 'auth/invalid-credential') {
                errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
                statusDiv.textContent = errorMessage;
            } else if (error?.code === 'auth/too-many-requests') {
                errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
                statusDiv.textContent = errorMessage;
            } else if (error?.message) {
                errorMessage = `로그인 오류: ${error.message}`;
                statusDiv.textContent = errorMessage;
            }
            
            statusDiv.className = 'login-page-status login-page-status-error';
            statusDiv.style.display = 'block';
            
            submitBtn.disabled = false;
            submitBtn.textContent = '이메일로 로그인';
        }
    }

    /**
     * 로그인 페이지 표시 여부 확인
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }
}


