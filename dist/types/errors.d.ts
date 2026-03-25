/**
 * 에러 타입 정의
 */
/**
 * 에러 코드 열거형
 */
export declare enum ErrorCode {
    INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
    RESET_FAILED = "RESET_FAILED",
    OPTIONS_SAVE_FAILED = "OPTIONS_SAVE_FAILED",
    OPTIONS_LOAD_FAILED = "OPTIONS_LOAD_FAILED",
    DATA_SAVE_FAILED = "DATA_SAVE_FAILED",
    DATA_LOAD_FAILED = "DATA_LOAD_FAILED",
    DATA_NOT_FOUND = "DATA_NOT_FOUND",
    ARRANGEMENT_FAILED = "ARRANGEMENT_FAILED",
    RANDOM_ASSIGNMENT_FAILED = "RANDOM_ASSIGNMENT_FAILED",
    LAYOUT_NOT_FOUND = "LAYOUT_NOT_FOUND",
    NO_STUDENTS = "NO_STUDENTS",
    NO_SEATS = "NO_SEATS",
    FILE_READ_FAILED = "FILE_READ_FAILED",
    FILE_INVALID_FORMAT = "FILE_INVALID_FORMAT",
    FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED",
    EXPORT_FAILED = "EXPORT_FAILED",
    UNDO_NOT_AVAILABLE = "UNDO_NOT_AVAILABLE",
    HISTORY_LOAD_FAILED = "HISTORY_LOAD_FAILED",
    HISTORY_DELETE_FAILED = "HISTORY_DELETE_FAILED",
    SHARE_FAILED = "SHARE_FAILED",
    SHARED_DATA_INVALID = "SHARED_DATA_INVALID",
    SHARED_DATA_LOAD_FAILED = "SHARED_DATA_LOAD_FAILED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
    OPERATION_FAILED = "OPERATION_FAILED"
}
/**
 * 에러 심각도
 */
export declare enum ErrorSeverity {
    LOW = "low",// 정보성 에러
    MEDIUM = "medium",// 경고성 에러
    HIGH = "high",// 심각한 에러
    CRITICAL = "critical"
}
/**
 * 애플리케이션 에러 인터페이스
 */
export interface AppError {
    code: ErrorCode;
    message: string;
    userMessage: string;
    severity: ErrorSeverity;
    originalError?: unknown;
    context?: Record<string, unknown>;
}
/**
 * 에러 생성 함수
 */
export declare function createAppError(code: ErrorCode, originalError?: unknown, context?: Record<string, unknown>): AppError;
/**
 * 알 수 없는 에러를 AppError로 변환
 */
export declare function toAppError(error: unknown, defaultCode?: ErrorCode): AppError;
//# sourceMappingURL=errors.d.ts.map