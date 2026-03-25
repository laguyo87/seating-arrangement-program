/**
 * 키보드 네비게이션 유틸리티
 * 접근성 향상을 위한 키보드 네비게이션 지원
 */
/**
 * 키보드 네비게이션 관리자
 */
export class KeyboardNavigation {
    /**
     * 요소에 키보드 접근성 속성 추가
     */
    static enhanceElement(element, config) {
        if (config.tabOrder !== undefined) {
            element.setAttribute('tabindex', config.tabOrder.toString());
        }
        else if (config.keyboardAccessible !== false) {
            // 기본적으로 포커스 가능하도록 (이미 포커스 가능한 요소는 제외)
            if (!this.isNativelyFocusable(element)) {
                element.setAttribute('tabindex', '0');
            }
        }
        if (config.ariaLabel) {
            element.setAttribute('aria-label', config.ariaLabel);
        }
        if (config.ariaDescribedBy) {
            element.setAttribute('aria-describedby', config.ariaDescribedBy);
        }
    }
    /**
     * 요소가 기본적으로 포커스 가능한지 확인
     */
    static isNativelyFocusable(element) {
        const tagName = element.tagName.toLowerCase();
        const focusableTags = ['a', 'button', 'input', 'select', 'textarea', 'iframe'];
        if (focusableTags.includes(tagName)) {
            return true;
        }
        // tabindex 속성이 있으면 포커스 가능
        if (element.hasAttribute('tabindex')) {
            return true;
        }
        return false;
    }
    /**
     * Tab 순서 설정
     */
    static setTabOrder(elements, startOrder = 1) {
        elements.forEach((element, index) => {
            element.setAttribute('tabindex', (startOrder + index).toString());
        });
    }
    /**
     * 화살표 키로 포커스 이동
     */
    static setupArrowKeyNavigation(container, selector, options) {
        const horizontal = options?.horizontal !== false;
        const vertical = options?.vertical !== false;
        const wrap = options?.wrap === true;
        container.addEventListener('keydown', (e) => {
            const focusableElements = Array.from(container.querySelectorAll(selector));
            if (focusableElements.length === 0)
                return;
            const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
            if (currentIndex === -1)
                return;
            let nextIndex = currentIndex;
            if (horizontal) {
                if (e.key === 'ArrowLeft') {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : (wrap ? focusableElements.length - 1 : currentIndex);
                    e.preventDefault();
                }
                else if (e.key === 'ArrowRight') {
                    nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : (wrap ? 0 : currentIndex);
                    e.preventDefault();
                }
            }
            if (vertical) {
                if (e.key === 'ArrowUp') {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : (wrap ? focusableElements.length - 1 : currentIndex);
                    e.preventDefault();
                }
                else if (e.key === 'ArrowDown') {
                    nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : (wrap ? 0 : currentIndex);
                    e.preventDefault();
                }
            }
            if (nextIndex !== currentIndex) {
                focusableElements[nextIndex].focus();
            }
        });
    }
    /**
     * Enter/Space 키로 클릭 이벤트 트리거
     */
    static setupKeyboardActivation(element, callback) {
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                callback();
            }
        });
    }
    /**
     * Escape 키로 닫기
     */
    static setupEscapeToClose(element, callback) {
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                callback();
            }
        });
    }
    /**
     * 포커스 트랩 설정 (모달 등에서 사용)
     */
    static setupFocusTrap(container) {
        const focusableElements = container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length === 0) {
            return () => { };
        }
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const handleTabKey = (e) => {
            if (e.key !== 'Tab')
                return;
            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            }
            else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        container.addEventListener('keydown', handleTabKey);
        // 정리 함수 반환
        return () => {
            container.removeEventListener('keydown', handleTabKey);
        };
    }
}
//# sourceMappingURL=keyboardNavigation.js.map