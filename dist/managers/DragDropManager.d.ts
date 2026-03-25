/**
 * 드래그&드롭 관리자
 * 좌석 카드의 드래그&드롭 기능을 담당합니다.
 */
export type OnDropCallback = (sourceCard: HTMLElement, targetCard: HTMLElement | null, insertPosition?: 'before' | 'after') => void;
export declare class DragDropManager {
    private dragSourceCard;
    private dragOverIndicator;
    private seatsArea;
    private onDropCallback?;
    private isFixedSeat?;
    private touchStartX;
    private touchStartY;
    private touchCurrentCard;
    private isDragging;
    constructor(seatsAreaId: string, onDrop?: OnDropCallback, isFixedSeat?: (seatId: number) => boolean);
    /**
     * 드래그&드롭 기능 활성화
     */
    enable(): void;
    /**
     * 터치 이벤트 설정 (모바일 드래그 앤 드롭)
     */
    private setupTouchEvents;
    /**
     * 터치 드래그 오버 상태 업데이트
     */
    private updateDragOverStateForTouch;
    /**
     * 드래그 상태 정리
     */
    private cleanupDragState;
    /**
     * 드래그 오버 상태 업데이트
     */
    private updateDragOverState;
    /**
     * 드롭 위치 삽입 인디케이터 표시
     */
    private showInsertIndicator;
    /**
     * 드래그&드롭 기능 비활성화
     */
    disable(): void;
}
//# sourceMappingURL=DragDropManager.d.ts.map