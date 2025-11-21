/**
 * 에러 처리 유틸리티
 * 일관된 에러 처리 및 사용자 친화적인 메시지 제공
 */

import { AppError, ErrorCode, createAppError, toAppError } from '../types/errors.js';
import { logger } from './logger.js';

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
export class ErrorHandler {
    /**
     * 에러를 처리하고 사용자에게 표시할 메시지를 반환
     */
    public static handleError(
        error: unknown,
        errorCode: ErrorCode,
        context?: Record<string, unknown>
    ): ErrorHandlingResult {
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
    public static handleUnknownError(
        error: unknown,
        context?: Record<string, unknown>
    ): ErrorHandlingResult {
        return this.handleError(error, ErrorCode.UNKNOWN_ERROR, context);
    }
    
    /**
     * 에러를 안전하게 처리 (에러가 발생해도 앱이 계속 실행되도록)
     */
    public static safeHandle(
        error: unknown,
        errorCode: ErrorCode,
        context?: Record<string, unknown>
    ): string {
        try {
            const result = this.handleError(error, errorCode, context);
            return result.userMessage || '문제가 발생했습니다.';
        } catch (handlingError) {
            // 에러 처리 중 에러가 발생한 경우
            logger.error('에러 처리 중 문제 발생:', handlingError);
            return '예상치 못한 문제가 발생했습니다.';
        }
    }
    
    /**
     * 에러를 로그에 기록만 하고 사용자에게는 표시하지 않음
     */
    public static logOnly(
        error: unknown,
        errorCode: ErrorCode,
        context?: Record<string, unknown>
    ): void {
        const appError = createAppError(errorCode, error, context);
        logger.error(`[${appError.code}] ${appError.message}`, {
            severity: appError.severity,
            context: appError.context
        });
    }
    
    /**
     * 에러 메시지 포맷팅
     */
    public static formatErrorMessage(
        error: unknown,
        defaultMessage: string = '문제가 발생했습니다.'
    ): string {
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
    public static getUserFriendlyMessage(
        errorCode: ErrorCode,
        additionalInfo?: string
    ): string {
        const appError = createAppError(errorCode);
        if (additionalInfo) {
            return `${appError.userMessage} ${additionalInfo}`;
        }
        return appError.userMessage;
    }
}

/**
 * 에러 처리 데코레이터 (향후 사용 가능)
 */
export function handleErrors(
    errorCode: ErrorCode,
    context?: Record<string, unknown>
) {
    return function (
        target: unknown,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        const originalMethod = descriptor.value;
        
        descriptor.value = function (...args: unknown[]) {
            try {
                return originalMethod.apply(this, args);
            } catch (error) {
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

