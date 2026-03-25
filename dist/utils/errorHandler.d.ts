/**
 * 에러 처리 유틸리티
 * 일관된 에러 처리 및 사용자 친화적인 메시지 제공
 */
import { ErrorCode } from '../types/errors.js';
/**
 * 에러 처리 결과
 */
export interface ErrorHandlingResult {
    handled: boolean;
    userMessage?: string;
}
/**
 * 에러 핸들러 클래스
 */
export declare class ErrorHandler {
    /**
     * 에러를 처리하고 사용자에게 표시할 메시지를 반환
     */
    static handleError(error: unknown, errorCode: ErrorCode, context?: Record<string, unknown>): ErrorHandlingResult;
    /**
     * 알 수 없는 에러를 처리
     */
    static handleUnknownError(error: unknown, context?: Record<string, unknown>): ErrorHandlingResult;
    /**
     * 에러를 안전하게 처리 (에러가 발생해도 앱이 계속 실행되도록)
     */
    static safeHandle(error: unknown, errorCode: ErrorCode, context?: Record<string, unknown>): string;
    /**
     * 에러를 로그에 기록만 하고 사용자에게는 표시하지 않음
     */
    static logOnly(error: unknown, errorCode: ErrorCode, context?: Record<string, unknown>): void;
    /**
     * 에러 메시지 포맷팅
     */
    static formatErrorMessage(error: unknown, defaultMessage?: string): string;
    /**
     * 사용자 친화적인 에러 메시지 생성
     */
    static getUserFriendlyMessage(errorCode: ErrorCode, additionalInfo?: string): string;
    /**
     * 재시도 가능한 작업 실행 (에러 복구 메커니즘)
     * @param operation 실행할 작업
     * @param errorCode 에러 코드
     * @param maxRetries 최대 재시도 횟수 (기본값: 3)
     * @param retryDelay 재시도 간격 (ms, 기본값: 1000)
     * @param context 추가 컨텍스트
     * @returns 작업 결과 또는 에러 처리 결과
     */
    static withRetry<T>(operation: () => Promise<T> | T, errorCode: ErrorCode, maxRetries?: number, retryDelay?: number, context?: Record<string, unknown>): Promise<T | ErrorHandlingResult>;
    /**
     * 동기 작업에 대한 재시도 메커니즘 (대기 없이 즉시 재시도)
     */
    static withRetrySync<T>(operation: () => T, errorCode: ErrorCode, maxRetries?: number, _retryDelay?: number, context?: Record<string, unknown>): T | ErrorHandlingResult;
    /**
     * 에러 처리 및 사용자에게 메시지 표시 (OutputModule과 통합)
     */
    static handleAndShow(error: unknown, errorCode: ErrorCode, showError: (message: string) => void, context?: Record<string, unknown>): void;
}
/**
 * 에러 처리 데코레이터 (향후 사용 가능)
 */
export declare function handleErrors(errorCode: ErrorCode, context?: Record<string, unknown>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=errorHandler.d.ts.map