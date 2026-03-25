/**
 * 에러 처리 유틸리티
 * 일관된 에러 처리 및 사용자 친화적인 메시지 제공
 */
import { ErrorCode, createAppError } from '../types/errors.js';
import { logger } from './logger.js';
/**
 * 에러 핸들러 클래스
 */
export class ErrorHandler {
    /**
     * 에러를 처리하고 사용자에게 표시할 메시지를 반환
     */
    static handleError(error, errorCode, context) {
        const appError = createAppError(errorCode, error, context);
        // 개발 모드에서만 상세 에러 로그 출력
        logger.error(`[${appError.code}] ${appError.message}`, {
            severity: appError.severity,
            context: appError.context,
            originalError: appError.originalError
        });
        return {
            handled: true,
            userMessage: appError.userMessage
        };
    }
    /**
     * 알 수 없는 에러를 처리
     */
    static handleUnknownError(error, context) {
        return this.handleError(error, ErrorCode.UNKNOWN_ERROR, context);
    }
    /**
     * 에러를 안전하게 처리 (에러가 발생해도 앱이 계속 실행되도록)
     */
    static safeHandle(error, errorCode, context) {
        try {
            const result = this.handleError(error, errorCode, context);
            return result.userMessage || '문제가 발생했습니다.';
        }
        catch (handlingError) {
            // 에러 처리 중 에러가 발생한 경우
            logger.error('에러 처리 중 문제 발생:', handlingError);
            return '예상치 못한 문제가 발생했습니다.';
        }
    }
    /**
     * 에러를 로그에 기록만 하고 사용자에게는 표시하지 않음
     */
    static logOnly(error, errorCode, context) {
        const appError = createAppError(errorCode, error, context);
        logger.error(`[${appError.code}] ${appError.message}`, {
            severity: appError.severity,
            context: appError.context
        });
    }
    /**
     * 에러 메시지 포맷팅
     */
    static formatErrorMessage(error, defaultMessage = '문제가 발생했습니다.') {
        if (error instanceof Error) {
            return error.message || defaultMessage;
        }
        if (typeof error === 'string') {
            return error;
        }
        return defaultMessage;
    }
    /**
     * 사용자 친화적인 에러 메시지 생성
     */
    static getUserFriendlyMessage(errorCode, additionalInfo) {
        const appError = createAppError(errorCode);
        if (additionalInfo) {
            return `${appError.userMessage} ${additionalInfo}`;
        }
        return appError.userMessage;
    }
    /**
     * 재시도 가능한 작업 실행 (에러 복구 메커니즘)
     * @param operation 실행할 작업
     * @param errorCode 에러 코드
     * @param maxRetries 최대 재시도 횟수 (기본값: 3)
     * @param retryDelay 재시도 간격 (ms, 기본값: 1000)
     * @param context 추가 컨텍스트
     * @returns 작업 결과 또는 에러 처리 결과
     */
    static async withRetry(operation, errorCode, maxRetries = 3, retryDelay = 1000, context) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await Promise.resolve(operation());
                return result;
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    logger.warn(`작업 실패 (시도 ${attempt}/${maxRetries}), ${retryDelay}ms 후 재시도...`, {
                        error,
                        attempt,
                        context
                    });
                    // 재시도 전 대기
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
                else {
                    // 최대 재시도 횟수 초과
                    logger.error(`작업 실패 (최대 재시도 횟수 초과)`, {
                        error,
                        attempts: maxRetries,
                        context
                    });
                    return this.handleError(error, errorCode, {
                        ...context,
                        attempts: maxRetries,
                        lastError: lastError
                    });
                }
            }
        }
        // 이 코드는 실행되지 않아야 하지만 타입 안전성을 위해 추가
        return this.handleError(lastError, errorCode, context);
    }
    /**
     * 동기 작업에 대한 재시도 메커니즘 (대기 없이 즉시 재시도)
     */
    static withRetrySync(operation, errorCode, maxRetries = 3, _retryDelay = 0, context) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return operation();
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    logger.warn(`작업 실패 (시도 ${attempt}/${maxRetries}), 즉시 재시도...`, {
                        error,
                        attempt,
                        context
                    });
                }
                else {
                    // 최대 재시도 횟수 초과
                    logger.error(`작업 실패 (최대 재시도 횟수 초과)`, {
                        error,
                        attempts: maxRetries,
                        context
                    });
                    return this.handleError(error, errorCode, {
                        ...context,
                        attempts: maxRetries,
                        lastError: lastError
                    });
                }
            }
        }
        return this.handleError(lastError, errorCode, context);
    }
    /**
     * 에러 처리 및 사용자에게 메시지 표시 (OutputModule과 통합)
     */
    static handleAndShow(error, errorCode, showError, context) {
        const result = this.handleError(error, errorCode, context);
        if (result.userMessage) {
            showError(result.userMessage);
        }
    }
}
/**
 * 에러 처리 데코레이터 (향후 사용 가능)
 */
export function handleErrors(errorCode, context) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            try {
                return originalMethod.apply(this, args);
            }
            catch (error) {
                const result = ErrorHandler.handleError(error, errorCode, {
                    ...context,
                    method: propertyKey,
                    args: args.length
                });
                throw new Error(result.userMessage);
            }
        };
        return descriptor;
    };
}
//# sourceMappingURL=errorHandler.js.map