export declare class FixedSeatManager {
    private fixedSeatIds;
    private onUpdate?;
    constructor(onUpdate?: () => void);
    /**
     * 고정 좌석 ID 목록 가져오기
     */
    getFixedSeatIds(): Set<number>;
    /**
     * 고정 좌석인지 확인
     */
    isFixed(seatId: number): boolean;
    /**
     * 고정 좌석 추가
     */
    addFixedSeat(seatId: number, card: HTMLDivElement): void;
    /**
     * 고정 좌석 제거
     */
    removeFixedSeat(seatId: number, card: HTMLDivElement): void;
    /**
     * 고정 좌석 토글
     */
    toggleFixedSeat(seatId: number, card: HTMLDivElement): void;
    /**
     * 고정 좌석 클릭 핸들러 설정
     */
    setupFixedSeatClickHandler(card: HTMLDivElement, seatId: number): void;
    /**
     * 테이블의 고정 좌석 드롭다운 업데이트
     */
    updateDropdowns(): void;
    /**
     * 모든 고정 좌석 초기화
     */
    clearAll(): void;
    /**
     * 고정 좌석 개수
     */
    getCount(): number;
}
//# sourceMappingURL=FixedSeatManager.d.ts.map