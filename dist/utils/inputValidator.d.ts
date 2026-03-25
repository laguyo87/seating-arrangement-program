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
    showMessage?: boolean;
    showIcon?: boolean;
    highlightBorder?: boolean;
}
/**
 * 입력 검증 관리자
 */
export declare class InputValidator {
    private errorMessages;
    private errorIcons;
    /**
     * 입력 필드에 실시간 검증 적용
     */
    setupValidation(input: HTMLInputElement, config: ValidationConfig): void;
    /**
     * ARIA 속성 설정
     */
    private setupAriaAttributes;
    /**
     * 입력값 검증 및 피드백 표시
     */
    private validateInput;
    /**
     * 에러 상태 표시
     */
    private showError;
    /**
     * 에러 상태 제거
     */
    private clearError;
    /**
     * 에러 메시지 표시
     */
    private showErrorMessage;
    /**
     * 에러 메시지 제거
     */
    private removeErrorMessage;
    /**
     * 에러 아이콘 표시
     */
    private showErrorIcon;
    /**
     * 에러 아이콘 제거
     */
    private removeErrorIcon;
    /**
     * 모든 검증 상태 초기화
     */
    clearAll(): void;
    /**
     * 특정 입력 필드의 검증 상태 초기화
     */
    clearInput(input: HTMLInputElement): void;
}
/**
 * 공통 검증 규칙 팩토리
 */
export declare class ValidationRules {
    /**
     * 숫자 범위 검증 규칙
     */
    static range(min: number, max: number, fieldName: string): ValidationRule;
    /**
     * 최소값 검증 규칙
     */
    static min(min: number, fieldName: string): ValidationRule;
    /**
     * 최대값 검증 규칙
     */
    static max(max: number, fieldName: string): ValidationRule;
    /**
     * 필수 입력 검증 규칙
     */
    static required(fieldName: string): ValidationRule;
    /**
     * 문자열 길이 검증 규칙
     */
    static maxLength(maxLength: number, fieldName: string): ValidationRule;
    /**
     * 숫자만 허용 검증 규칙
     */
    static numeric(fieldName: string): ValidationRule;
}
//# sourceMappingURL=inputValidator.d.ts.map