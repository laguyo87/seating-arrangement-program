/**
 * 로깅 유틸리티
 * 개발 모드에서만 로그를 출력하고, 프로덕션에서는 제거됩니다.
 */
// Vite 환경 변수 타입 안전성 확보
const isDevelopment = import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true;
/**
 * 개발 모드에서만 로그를 출력합니다.
 */
export const logger = {
    /**
     * 일반 로그 (개발 모드에서만 출력)
     */
    log: (...args) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },
    /**
     * 에러 로그 (항상 출력)
     */
    error: (...args) => {
        console.error(...args);
    },
    /**
     * 경고 로그 (개발 모드에서만 출력)
     */
    warn: (...args) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },
    /**
     * 디버그 로그 (개발 모드에서만 출력)
     */
    debug: (...args) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },
    /**
     * 정보 로그 (개발 모드에서만 출력)
     */
    info: (...args) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },
    /**
     * 그룹 로그 시작 (개발 모드에서만 출력)
     */
    group: (label) => {
        if (isDevelopment) {
            console.group(label);
        }
    },
    /**
     * 그룹 로그 종료 (개발 모드에서만 출력)
     */
    groupEnd: () => {
        if (isDevelopment) {
            console.groupEnd();
        }
    },
    /**
     * 테이블 로그 (개발 모드에서만 출력)
     */
    table: (data) => {
        if (isDevelopment) {
            console.table(data);
        }
    }
};
/**
 * 개발 모드 여부 확인
 */
export const isDev = () => isDevelopment;
//# sourceMappingURL=logger.js.map