/**
 * 결과 출력 모듈
 * 배치 결과 표시 및 내보내기 기능 담당
 */
/**
 * 출력 모듈
 */
export declare class OutputModule {
    private container;
    constructor(containerId: string);
    /**
     * 성공 메시지를 표시합니다.
     * @param message 메시지
     */
    showSuccess(message: string): void;
    /**
     * 에러 메시지를 표시합니다.
     * @param message 메시지
     */
    showError(message: string): void;
    /**
     * 정보 메시지를 표시합니다.
     * @param message 메시지
     */
    showInfo(message: string): void;
    /**
     * 메시지를 표시합니다.
     * @param message 메시지
     * @param type 메시지 타입
     */
    private showMessage;
    /**
     * 배치 통계를 표시합니다.
     * @param totalSeats 전체 좌석 수
     * @param assignedSeats 배정된 좌석 수
     * @param fixedSeats 고정 좌석 수
     */
    showStatistics(totalSeats: number, assignedSeats: number, fixedSeats: number): void;
    /**
     * 배치 결과를 텍스트로 내보냅니다.
     * @param seats 좌석 배열
     * @returns 텍스트 결과
     */
    exportAsText(seats: import('../models/Seat').Seat[]): string;
    /**
     * 배치 결과를 다운로드합니다.
     * @param content 파일 내용
     * @param filename 파일 이름
     * @param mimeType MIME 타입
     */
    downloadFile(content: string, filename: string, mimeType?: string): void;
    /**
     * 결과를 초기화합니다.
     */
    clear(): void;
    /**
     * 로딩 인디케이터를 표시합니다.
     */
    showLoading(): void;
    /**
     * 통계를 숨깁니다.
     */
    hideStatistics(): void;
}
//# sourceMappingURL=OutputModule.d.ts.map