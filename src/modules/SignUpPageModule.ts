/**
 * 회원가입 페이지 모듈
 * Firebase 이메일/비밀번호 회원가입 UI 및 로직 담당
 */

import { FirebaseStorageManager } from '../managers/FirebaseStorageManager.js';
import { OutputModule } from './OutputModule.js';
import { logger } from '../utils/logger.js';

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
export class SignUpPageModule {
    private deps: SignUpPageModuleDependencies;
    private signUpPageContainer: HTMLDivElement | null = null;
    private isVisible: boolean = false;

    constructor(dependencies: SignUpPageModuleDependencies) {
        this.deps = dependencies;
    }

    /**
     * 회원가입 페이지 표시
     */
    public show(): void {
        if (this.isVisible) {
            return;
        }

        this.createSignUpPage();
        this.isVisible = true;
    }

    /**
     * 회원가입 페이지 숨기기
     */
    public hide(): void {
        if (!this.isVisible || !this.signUpPageContainer) {
            return;
        }

        this.signUpPageContainer.remove();
        this.signUpPageContainer = null;
        this.isVisible = false;

        if (this.deps.onClose) {
            this.deps.onClose();
        }
    }

    /**
     * 회원가입 페이지 생성
     */
    private createSignUpPage(): void {
        // 기존 회원가입 페이지가 있으면 제거
        const existing = document.getElementById('signup-page-container');
        if (existing) {
            existing.remove();
        }

        // 회원가입 페이지 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'signup-page-container';
        container.className = 'signup-page-container';

        // 회원가입 페이지 내용
        container.innerHTML = `
            <div class="signup-page-content">
                <div class="signup-page-header">
                    <h2>회원가입</h2>
                    <button id="signup-page-close-btn" class="signup-page-close-btn" aria-label="닫기">×</button>
                </div>
                <div class="signup-page-body">
                    <div class="signup-page-description">
                        <p>이메일과 비밀번호로 계정을 생성하여 클라우드에 데이터를 동기화할 수 있습니다.</p>
                    </div>
                    <form id="signup-form" class="signup-form">
                        <div class="signup-form-group">
                            <label for="signup-name" class="signup-form-label">닉네임</label>
                            <input 
                                type="text" 
                                id="signup-name" 
                                class="signup-form-input" 
                                placeholder="닉네임을 입력하세요"
                                required
                                autocomplete="name"
                                minlength="2"
                            />
                            <span class="signup-form-error" id="signup-name-error"></span>
                        </div>
                        <div class="signup-form-group">
                            <label for="signup-email" class="signup-form-label">이메일</label>
                            <input 
                                type="email" 
                                id="signup-email" 
                                class="signup-form-input" 
                                placeholder="example@email.com"
                                required
                                autocomplete="email"
                            />
                            <span class="signup-form-error" id="signup-email-error"></span>
                        </div>
                        <div class="signup-form-group">
                            <label for="signup-password" class="signup-form-label">비밀번호</label>
                            <input 
                                type="password" 
                                id="signup-password" 
                                class="signup-form-input" 
                                placeholder="비밀번호 (최소 6자)"
                                required
                                autocomplete="new-password"
                                minlength="6"
                            />
                            <span class="signup-form-error" id="signup-password-error"></span>
                        </div>
                        <div class="signup-form-group">
                            <label for="signup-password-confirm" class="signup-form-label">비밀번호 확인</label>
                            <input 
                                type="password" 
                                id="signup-password-confirm" 
                                class="signup-form-input" 
                                placeholder="비밀번호 다시 입력"
                                required
                                autocomplete="new-password"
                                minlength="6"
                            />
                            <span class="signup-form-error" id="signup-password-confirm-error"></span>
                        </div>
                        <div class="signup-page-actions">
                            <button type="submit" id="signup-submit-btn" class="signup-submit-btn">
                                회원가입
                            </button>
                            <button type="button" id="signup-back-btn" class="signup-back-btn">
                                로그인으로 돌아가기
                            </button>
                        </div>
                    </form>
                    <div id="signup-page-status" class="signup-page-status" style="display: none;"></div>
                </div>
            </div>
        `;

        // DOM에 추가
        document.body.appendChild(container);
        this.signUpPageContainer = container;

        // 이벤트 리스너 설정
        this.setupEventListeners();

        // 애니메이션 효과
        requestAnimationFrame(() => {
            container.classList.add('signup-page-visible');
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        if (!this.signUpPageContainer) return;

        // 닫기 버튼
        const closeBtn = this.signUpPageContainer.querySelector('#signup-page-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // 뒤로가기 버튼
        const backBtn = this.signUpPageContainer.querySelector('#signup-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.hide();
                if (this.deps.onBackToLogin) {
                    this.deps.onBackToLogin();
                }
            });
        }

        // 폼 제출
        const form = this.signUpPageContainer.querySelector('#signup-form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignUp();
            });
        }

        // 비밀번호 확인 실시간 검증
        const passwordInput = this.signUpPageContainer.querySelector('#signup-password') as HTMLInputElement;
        const passwordConfirmInput = this.signUpPageContainer.querySelector('#signup-password-confirm') as HTMLInputElement;
        
        if (passwordConfirmInput) {
            passwordConfirmInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }

        // 배경 클릭 시 닫기
        this.signUpPageContainer.addEventListener('click', (e) => {
            if (e.target === this.signUpPageContainer) {
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
     * 비밀번호 일치 검증
     */
    private validatePasswordMatch(): boolean {
        if (!this.signUpPageContainer) return false;

        const passwordInput = this.signUpPageContainer.querySelector('#signup-password') as HTMLInputElement;
        const passwordConfirmInput = this.signUpPageContainer.querySelector('#signup-password-confirm') as HTMLInputElement;
        const errorSpan = this.signUpPageContainer.querySelector('#signup-password-confirm-error') as HTMLSpanElement;

        if (!passwordInput || !passwordConfirmInput || !errorSpan) return false;

        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;

        if (passwordConfirm && password !== passwordConfirm) {
            errorSpan.textContent = '비밀번호가 일치하지 않습니다.';
            errorSpan.style.display = 'block';
            passwordConfirmInput.setCustomValidity('비밀번호가 일치하지 않습니다.');
            return false;
        } else {
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
            passwordConfirmInput.setCustomValidity('');
            return true;
        }
    }

    /**
     * 회원가입 처리
     */
    private async handleSignUp(): Promise<void> {
        if (!this.signUpPageContainer) return;

        const nameInput = this.signUpPageContainer.querySelector('#signup-name') as HTMLInputElement;
        const emailInput = this.signUpPageContainer.querySelector('#signup-email') as HTMLInputElement;
        const passwordInput = this.signUpPageContainer.querySelector('#signup-password') as HTMLInputElement;
        const passwordConfirmInput = this.signUpPageContainer.querySelector('#signup-password-confirm') as HTMLInputElement;
        const submitBtn = this.signUpPageContainer.querySelector('#signup-submit-btn') as HTMLButtonElement;
        const statusDiv = this.signUpPageContainer.querySelector('#signup-page-status') as HTMLDivElement;

        if (!nameInput || !emailInput || !passwordInput || !passwordConfirmInput || !submitBtn || !statusDiv) return;

        // 비밀번호 일치 확인
        if (!this.validatePasswordMatch()) {
            return;
        }

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // 닉네임 검증
        if (name.length < 2) {
            const nameError = this.signUpPageContainer.querySelector('#signup-name-error') as HTMLSpanElement;
            if (nameError) {
                nameError.textContent = '닉네임은 최소 2자 이상이어야 합니다.';
                nameError.style.display = 'block';
            }
            return;
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const emailError = this.signUpPageContainer.querySelector('#signup-email-error') as HTMLSpanElement;
            if (emailError) {
                emailError.textContent = '올바른 이메일 형식이 아닙니다.';
                emailError.style.display = 'block';
            }
            return;
        }

        // 비밀번호 길이 검증
        if (password.length < 6) {
            const passwordError = this.signUpPageContainer.querySelector('#signup-password-error') as HTMLSpanElement;
            if (passwordError) {
                passwordError.textContent = '비밀번호는 최소 6자 이상이어야 합니다.';
                passwordError.style.display = 'block';
            }
            return;
        }

        // 버튼 비활성화
        submitBtn.disabled = true;
        submitBtn.textContent = '회원가입 중...';
        statusDiv.style.display = 'none';

        // 에러 메시지 초기화
        const nameError = this.signUpPageContainer.querySelector('#signup-name-error') as HTMLSpanElement;
        const emailError = this.signUpPageContainer.querySelector('#signup-email-error') as HTMLSpanElement;
        const passwordError = this.signUpPageContainer.querySelector('#signup-password-error') as HTMLSpanElement;
        const passwordConfirmError = this.signUpPageContainer.querySelector('#signup-password-confirm-error') as HTMLSpanElement;
        
        if (nameError) nameError.style.display = 'none';
        if (emailError) emailError.style.display = 'none';
        if (passwordError) passwordError.style.display = 'none';
        if (passwordConfirmError) passwordConfirmError.style.display = 'none';

        try {
            const success = await this.deps.firebaseStorageManager.signUpWithEmailAndPassword(email, password, name);
            
            if (success) {
                // 회원가입 성공
                statusDiv.textContent = '회원가입이 완료되었습니다!';
                statusDiv.className = 'signup-page-status signup-page-status-success';
                statusDiv.style.display = 'block';

                // 잠시 후 페이지 닫기
                setTimeout(() => {
                    this.hide();
                    if (this.deps.onSignUpSuccess) {
                        this.deps.onSignUpSuccess();
                    }
                }, 1500);
            } else {
                // 회원가입 실패
                statusDiv.textContent = '회원가입에 실패했습니다. 다시 시도해주세요.';
                statusDiv.className = 'signup-page-status signup-page-status-error';
                statusDiv.style.display = 'block';
                
                submitBtn.disabled = false;
                submitBtn.textContent = '회원가입';
            }
        } catch (error: any) {
            logger.error('회원가입 처리 중 오류:', error);
            
            let errorMessage = '오류가 발생했습니다. 다시 시도해주세요.';
            
            // Firebase 에러 코드에 따른 메시지
            if (error?.code === 'auth/email-already-in-use') {
                errorMessage = '이미 사용 중인 이메일입니다.';
                if (emailError) {
                    emailError.textContent = errorMessage;
                    emailError.style.display = 'block';
                }
            } else if (error?.code === 'auth/invalid-email') {
                errorMessage = '올바른 이메일 형식이 아닙니다.';
                if (emailError) {
                    emailError.textContent = errorMessage;
                    emailError.style.display = 'block';
                }
            } else if (error?.code === 'auth/weak-password') {
                errorMessage = '비밀번호가 너무 약합니다.';
                if (passwordError) {
                    passwordError.textContent = errorMessage;
                    passwordError.style.display = 'block';
                }
            }
            
            statusDiv.textContent = errorMessage;
            statusDiv.className = 'signup-page-status signup-page-status-error';
            statusDiv.style.display = 'block';
            
            submitBtn.disabled = false;
            submitBtn.textContent = '회원가입';
        }
    }

    /**
     * 회원가입 페이지 표시 여부 확인
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }
}

