/**
 * 입력 검증 유틸리티
 * 실시간 검증 메시지 표시 및 시각적 하이라이트 제공
 */

export interface ValidationRule {
    validate: (value: string | number) => boolean;
    errorMessage: string;
}

export interface ValidationConfig {
    rules: ValidationRule[];
    showMessage?: boolean;  // 실시간 메시지 표시 여부
    showIcon?: boolean;      // 에러 아이콘 표시 여부
    highlightBorder?: boolean;  // 테두리 하이라이트 여부
}

/**
 * 입력 검증 관리자
 */
export class InputValidator {
    private errorMessages: Map<HTMLElement, HTMLElement> = new Map();
    private errorIcons: Map<HTMLElement, HTMLElement> = new Map();

    /**
     * 입력 필드에 실시간 검증 적용
     */
    public setupValidation(
        input: HTMLInputElement,
        config: ValidationConfig
    ): void {
        // ARIA 속성 초기 설정
        this.setupAriaAttributes(input, config);
        
        // input 이벤트: 실시간 검증
        input.addEventListener('input', () => {
            this.validateInput(input, config);
        });

        // blur 이벤트: 포커스 해제 시 최종 검증
        input.addEventListener('blur', () => {
            this.validateInput(input, config);
        });

        // 초기 검증
        this.validateInput(input, config);
    }
    
    /**
     * ARIA 속성 설정
     */
    private setupAriaAttributes(input: HTMLInputElement, config: ValidationConfig): void {
        // aria-required 설정 (필수 규칙이 있는 경우)
        const hasRequired = config.rules.some(rule => 
            rule.errorMessage.includes('입력해주세요') || 
            rule.errorMessage.includes('필수')
        );
        
        if (hasRequired) {
            input.setAttribute('aria-required', 'true');
        }
        
        // aria-label이 없으면 label에서 가져오기
        if (!input.hasAttribute('aria-label')) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) {
                input.setAttribute('aria-label', label.textContent?.trim() || '');
            }
        }
    }

    /**
     * 입력값 검증 및 피드백 표시
     */
    private validateInput(input: HTMLInputElement, config: ValidationConfig): boolean {
        const value = input.type === 'number' 
            ? parseFloat(input.value || '0')
            : input.value;

        let isValid = true;
        let errorMessage = '';

        // 모든 규칙 검증
        for (const rule of config.rules) {
            if (!rule.validate(value)) {
                isValid = false;
                errorMessage = rule.errorMessage;
                break;
            }
        }

        // 검증 결과에 따라 스타일 및 메시지 업데이트
        if (isValid) {
            this.clearError(input);
            // aria-invalid 제거
            input.setAttribute('aria-invalid', 'false');
        } else {
            this.showError(input, errorMessage, config);
            // aria-invalid 설정
            input.setAttribute('aria-invalid', 'true');
        }

        return isValid;
    }

    /**
     * 에러 상태 표시
     */
    private showError(
        input: HTMLInputElement,
        message: string,
        config: ValidationConfig
    ): void {
        // 테두리 하이라이트
        if (config.highlightBorder !== false) {
            input.style.borderColor = '#dc3545';
            input.style.borderWidth = '2px';
            input.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
        }

        // 에러 메시지 표시
        if (config.showMessage !== false) {
            this.showErrorMessage(input, message);
        }

        // 에러 아이콘 표시
        if (config.showIcon !== false) {
            this.showErrorIcon(input);
        }
    }

    /**
     * 에러 상태 제거
     */
    private clearError(input: HTMLInputElement): void {
        // 테두리 스타일 복원
        input.style.borderColor = '';
        input.style.borderWidth = '';
        input.style.boxShadow = '';

        // 에러 메시지 제거
        this.removeErrorMessage(input);

        // 에러 아이콘 제거
        this.removeErrorIcon(input);
        
        // ARIA 속성 업데이트
        input.setAttribute('aria-invalid', 'false');
        const describedBy = input.getAttribute('aria-describedby');
        if (describedBy && describedBy.startsWith('error-')) {
            input.removeAttribute('aria-describedby');
        }
    }

    /**
     * 에러 메시지 표시
     */
    private showErrorMessage(input: HTMLInputElement, message: string): void {
        // 기존 메시지 제거
        this.removeErrorMessage(input);

        // 새 메시지 생성
        const messageId = `error-${input.id || `input-${Date.now()}`}`;
        const messageElement = document.createElement('div');
        messageElement.id = messageId;
        messageElement.className = 'input-error-message';
        messageElement.textContent = message;
        messageElement.setAttribute('role', 'alert');
        messageElement.setAttribute('aria-live', 'polite');
        messageElement.style.cssText = `
            color: #dc3545;
            font-size: 0.85em;
            margin-top: 4px;
            display: block;
        `;

        // 입력 필드 다음에 삽입
        const container = input.parentElement;
        if (container) {
            container.appendChild(messageElement);
            this.errorMessages.set(input, messageElement);
            
            // ARIA 속성 업데이트
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', messageId);
            input.setAttribute('aria-errormessage', messageId);
        }
    }

    /**
     * 에러 메시지 제거
     */
    private removeErrorMessage(input: HTMLInputElement): void {
        const messageElement = this.errorMessages.get(input);
        if (messageElement && messageElement.parentElement) {
            messageElement.parentElement.removeChild(messageElement);
            this.errorMessages.delete(input);
        }
    }

    /**
     * 에러 아이콘 표시
     */
    private showErrorIcon(input: HTMLInputElement): void {
        // 기존 아이콘 제거
        this.removeErrorIcon(input);

        // 아이콘 생성
        const iconElement = document.createElement('span');
        iconElement.className = 'input-error-icon';
        iconElement.textContent = '⚠️';
        iconElement.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: #dc3545;
            font-size: 1.2em;
            pointer-events: none;
            z-index: 10;
        `;

        // 입력 필드의 부모 컨테이너에 아이콘 추가
        const container = input.parentElement;
        if (container) {
            // position: relative 설정 (없는 경우)
            const containerStyle = window.getComputedStyle(container);
            if (containerStyle.position === 'static') {
                container.style.position = 'relative';
            }
            container.appendChild(iconElement);
            this.errorIcons.set(input, iconElement);
        }
    }

    /**
     * 에러 아이콘 제거
     */
    private removeErrorIcon(input: HTMLInputElement): void {
        const iconElement = this.errorIcons.get(input);
        if (iconElement && iconElement.parentElement) {
            iconElement.parentElement.removeChild(iconElement);
            this.errorIcons.delete(input);
        }
    }

    /**
     * 모든 검증 상태 초기화
     */
    public clearAll(): void {
        this.errorMessages.forEach((message) => {
            if (message.parentElement) {
                message.parentElement.removeChild(message);
            }
        });
        this.errorMessages.clear();

        this.errorIcons.forEach((icon) => {
            if (icon.parentElement) {
                icon.parentElement.removeChild(icon);
            }
        });
        this.errorIcons.clear();
    }

    /**
     * 특정 입력 필드의 검증 상태 초기화
     */
    public clearInput(input: HTMLInputElement): void {
        this.clearError(input);
    }
}

/**
 * 공통 검증 규칙 팩토리
 */
export class ValidationRules {
    /**
     * 숫자 범위 검증 규칙
     */
    static range(min: number, max: number, fieldName: string): ValidationRule {
        return {
            validate: (value) => {
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                return !isNaN(num) && num >= min && num <= max;
            },
            errorMessage: `${fieldName}은(는) ${min}~${max} 사이의 값이어야 합니다.`
        };
    }

    /**
     * 최소값 검증 규칙
     */
    static min(min: number, fieldName: string): ValidationRule {
        return {
            validate: (value) => {
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                return !isNaN(num) && num >= min;
            },
            errorMessage: `${fieldName}은(는) ${min} 이상이어야 합니다.`
        };
    }

    /**
     * 최대값 검증 규칙
     */
    static max(max: number, fieldName: string): ValidationRule {
        return {
            validate: (value) => {
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                return !isNaN(num) && num <= max;
            },
            errorMessage: `${fieldName}은(는) ${max} 이하여야 합니다.`
        };
    }

    /**
     * 필수 입력 검증 규칙
     */
    static required(fieldName: string): ValidationRule {
        return {
            validate: (value) => {
                if (typeof value === 'string') {
                    return value.trim().length > 0;
                }
                return value !== null && value !== undefined && String(value) !== '';
            },
            errorMessage: `${fieldName}을(를) 입력해주세요.`
        };
    }

    /**
     * 문자열 길이 검증 규칙
     */
    static maxLength(maxLength: number, fieldName: string): ValidationRule {
        return {
            validate: (value) => {
                const str = String(value);
                return str.length <= maxLength;
            },
            errorMessage: `${fieldName}은(는) ${maxLength}자 이하여야 합니다.`
        };
    }

    /**
     * 숫자만 허용 검증 규칙
     */
    static numeric(fieldName: string): ValidationRule {
        return {
            validate: (value) => {
                if (typeof value === 'number') return true;
                const str = String(value);
                return /^\d+$/.test(str) || str === '';
            },
            errorMessage: `${fieldName}은(는) 숫자만 입력 가능합니다.`
        };
    }
}

