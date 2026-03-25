/**
 * 로깅 유틸리티
 * 개발 모드에서만 로그를 출력하고, 프로덕션에서는 제거됩니다.
 */
/**
 * 로그 인자 타입 (unknown을 사용하여 타입 안전성 확보)
 */
type LogArgs = unknown[];
/**
 * 개발 모드에서만 로그를 출력합니다.
 */
export declare const logger: {
    /**
     * 일반 로그 (개발 모드에서만 출력)
     */
    log: (...args: LogArgs) => void;
    /**
     * 에러 로그 (항상 출력)
     */
    error: (...args: LogArgs) => void;
    /**
     * 경고 로그 (개발 모드에서만 출력)
     */
    warn: (...args: LogArgs) => void;
    /**
     * 디버그 로그 (개발 모드에서만 출력)
     */
    debug: (...args: LogArgs) => void;
    /**
     * 정보 로그 (개발 모드에서만 출력)
     */
    info: (...args: LogArgs) => void;
    /**
     * 그룹 로그 시작 (개발 모드에서만 출력)
     */
    group: (label?: string) => void;
    /**
     * 그룹 로그 종료 (개발 모드에서만 출력)
     */
    groupEnd: () => void;
    /**
     * 테이블 로그 (개발 모드에서만 출력)
     */
    table: (data: unknown) => void;
};
/**
 * 개발 모드 여부 확인
 */
export declare const isDev: () => boolean;
export {};
//# sourceMappingURL=logger.d.ts.map