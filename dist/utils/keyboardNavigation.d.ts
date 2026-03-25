/**
 * 키보드 네비게이션 유틸리티
 * 접근성 향상을 위한 키보드 네비게이션 지원
 */
export interface KeyboardNavigationConfig {
    /** Tab 순서 (낮을수록 먼저 포커스) */
    tabOrder?: number;
    /** 키보드 접근 가능 여부 */
    keyboardAccessible?: boolean;
    /** ARIA 레이블 */
    ariaLabel?: string;
    /** ARIA 설명 */
    ariaDescribedBy?: string;
}
/**
 * 키보드 네비게이션 관리자
 */
export declare class KeyboardNavigation {
    /**
     * 요소에 키보드 접근성 속성 추가
     */
    static enhanceElement(element: HTMLElement, config: KeyboardNavigationConfig): void;
    /**
     * 요소가 기본적으로 포커스 가능한지 확인
     */
    private static isNativelyFocusable;
    /**
     * Tab 순서 설정
     */
    static setTabOrder(elements: HTMLElement[], startOrder?: number): void;
    /**
     * 화살표 키로 포커스 이동
     */
    static setupArrowKeyNavigation(container: HTMLElement, selector: string, options?: {
        horizontal?: boolean;
        vertical?: boolean;
        wrap?: boolean;
    }): void;
    /**
     * Enter/Space 키로 클릭 이벤트 트리거
     */
    static setupKeyboardActivation(element: HTMLElement, callback: () => void): void;
    /**
     * Escape 키로 닫기
     */
    static setupEscapeToClose(element: HTMLElement, callback: () => void): void;
    /**
     * 포커스 트랩 설정 (모달 등에서 사용)
     */
    static setupFocusTrap(container: HTMLElement): () => void;
}
//# sourceMappingURL=keyboardNavigation.d.ts.map