/**
 * 에러 타입 정의
 */
/**
 * 에러 코드 열거형
 */
export var ErrorCode;
(function (ErrorCode) {
    // 초기화 관련
    ErrorCode["INITIALIZATION_FAILED"] = "INITIALIZATION_FAILED";
    ErrorCode["RESET_FAILED"] = "RESET_FAILED";
    // 옵션 관련
    ErrorCode["OPTIONS_SAVE_FAILED"] = "OPTIONS_SAVE_FAILED";
    ErrorCode["OPTIONS_LOAD_FAILED"] = "OPTIONS_LOAD_FAILED";
    // 데이터 저장/로드 관련
    ErrorCode["DATA_SAVE_FAILED"] = "DATA_SAVE_FAILED";
    ErrorCode["DATA_LOAD_FAILED"] = "DATA_LOAD_FAILED";
    ErrorCode["DATA_NOT_FOUND"] = "DATA_NOT_FOUND";
    // 배치 관련
    ErrorCode["ARRANGEMENT_FAILED"] = "ARRANGEMENT_FAILED";
    ErrorCode["RANDOM_ASSIGNMENT_FAILED"] = "RANDOM_ASSIGNMENT_FAILED";
    ErrorCode["LAYOUT_NOT_FOUND"] = "LAYOUT_NOT_FOUND";
    ErrorCode["NO_STUDENTS"] = "NO_STUDENTS";
    ErrorCode["NO_SEATS"] = "NO_SEATS";
    // 파일 관련
    ErrorCode["FILE_READ_FAILED"] = "FILE_READ_FAILED";
    ErrorCode["FILE_INVALID_FORMAT"] = "FILE_INVALID_FORMAT";
    ErrorCode["FILE_UPLOAD_FAILED"] = "FILE_UPLOAD_FAILED";
    ErrorCode["EXPORT_FAILED"] = "EXPORT_FAILED";
    // 히스토리 관련
    ErrorCode["UNDO_NOT_AVAILABLE"] = "UNDO_NOT_AVAILABLE";
    ErrorCode["HISTORY_LOAD_FAILED"] = "HISTORY_LOAD_FAILED";
    ErrorCode["HISTORY_DELETE_FAILED"] = "HISTORY_DELETE_FAILED";
    // 공유 관련
    ErrorCode["SHARE_FAILED"] = "SHARE_FAILED";
    ErrorCode["SHARED_DATA_INVALID"] = "SHARED_DATA_INVALID";
    ErrorCode["SHARED_DATA_LOAD_FAILED"] = "SHARED_DATA_LOAD_FAILED";
    // 일반
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    ErrorCode["OPERATION_FAILED"] = "OPERATION_FAILED";
})(ErrorCode || (ErrorCode = {}));
/**
 * 에러 심각도
 */
export var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical"; // 치명적 에러
})(ErrorSeverity || (ErrorSeverity = {}));
/**
 * 에러 메시지 맵
 */
const ERROR_MESSAGES = {
    [ErrorCode.INITIALIZATION_FAILED]: {
        userMessage: '프로그램을 시작하는 중 문제가 발생했습니다. 페이지를 새로고침해주세요.',
        severity: ErrorSeverity.CRITICAL
    },
    [ErrorCode.RESET_FAILED]: {
        userMessage: '초기화 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.OPTIONS_SAVE_FAILED]: {
        userMessage: '설정을 저장하는 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.OPTIONS_LOAD_FAILED]: {
        userMessage: '저장된 설정을 불러오는 중 문제가 발생했습니다. 기본 설정으로 진행합니다.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.DATA_SAVE_FAILED]: {
        userMessage: '데이터를 저장하는 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.DATA_LOAD_FAILED]: {
        userMessage: '저장된 데이터를 불러오는 중 문제가 발생했습니다.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.DATA_NOT_FOUND]: {
        userMessage: '저장된 데이터를 찾을 수 없습니다.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.ARRANGEMENT_FAILED]: {
        userMessage: '자리 배치를 생성하는 중 문제가 발생했습니다. 입력 정보를 확인하고 다시 시도해주세요.',
        severity: ErrorSeverity.HIGH
    },
    [ErrorCode.RANDOM_ASSIGNMENT_FAILED]: {
        userMessage: '랜덤 배치를 실행하는 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.LAYOUT_NOT_FOUND]: {
        userMessage: '자리 배치를 찾을 수 없습니다. 먼저 자리 배치를 생성해주세요.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.NO_STUDENTS]: {
        userMessage: '학생 정보가 없습니다. 학생 수를 입력하고 명렬표를 작성해주세요.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.NO_SEATS]: {
        userMessage: '좌석 정보가 없습니다. 자리 배치를 다시 생성해주세요.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.FILE_READ_FAILED]: {
        userMessage: '파일을 읽는 중 문제가 발생했습니다. 파일이 손상되지 않았는지 확인해주세요.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.FILE_INVALID_FORMAT]: {
        userMessage: '지원하지 않는 파일 형식입니다. CSV 또는 엑셀 파일(.csv, .xlsx, .xls)만 업로드 가능합니다.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.FILE_UPLOAD_FAILED]: {
        userMessage: '파일 업로드 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.EXPORT_FAILED]: {
        userMessage: '파일 내보내기 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.UNDO_NOT_AVAILABLE]: {
        userMessage: '되돌리기할 이전 상태가 없습니다.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.HISTORY_LOAD_FAILED]: {
        userMessage: '이력을 불러오는 중 문제가 발생했습니다.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.HISTORY_DELETE_FAILED]: {
        userMessage: '이력을 삭제하는 중 문제가 발생했습니다.',
        severity: ErrorSeverity.LOW
    },
    [ErrorCode.SHARE_FAILED]: {
        userMessage: '공유 링크를 생성하는 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.SHARED_DATA_INVALID]: {
        userMessage: '공유된 데이터가 유효하지 않습니다. 링크가 만료되었거나 손상되었을 수 있습니다.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.SHARED_DATA_LOAD_FAILED]: {
        userMessage: '공유된 자리 배치도를 불러올 수 없습니다.',
        severity: ErrorSeverity.MEDIUM
    },
    [ErrorCode.UNKNOWN_ERROR]: {
        userMessage: '예상치 못한 문제가 발생했습니다. 페이지를 새로고침해주세요.',
        severity: ErrorSeverity.HIGH
    },
    [ErrorCode.OPERATION_FAILED]: {
        userMessage: '작업을 완료하는 중 문제가 발생했습니다. 다시 시도해주세요.',
        severity: ErrorSeverity.MEDIUM
    }
};
/**
 * 에러 생성 함수
 */
export function createAppError(code, originalError, context) {
    const errorInfo = ERROR_MESSAGES[code];
    const errorMessage = originalError instanceof Error
        ? originalError.message
        : String(originalError || '알 수 없는 오류');
    return {
        code,
        message: errorMessage,
        userMessage: errorInfo.userMessage,
        severity: errorInfo.severity,
        originalError,
        context
    };
}
/**
 * 알 수 없는 에러를 AppError로 변환
 */
export function toAppError(error, defaultCode = ErrorCode.UNKNOWN_ERROR) {
    if (error && typeof error === 'object' && 'code' in error && 'userMessage' in error) {
        return error;
    }
    return createAppError(defaultCode, error);
}
//# sourceMappingURL=errors.js.map