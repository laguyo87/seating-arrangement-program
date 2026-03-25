/**
 * 키보드 드래그&드롭 관리자
 * 화살표 키를 사용한 좌석 이동 기능
 */
export type OnKeyboardMoveCallback = (sourceCard: HTMLElement, direction: 'up' | 'down' | 'left' | 'right') => void;
export declare class KeyboardDragDropManager {
    private seatsArea;
    private onMoveCallback?;
    private isFixedSeat?;
    private selectedCard;
    constructor(seatsAreaId: string, onMove?: OnKeyboardMoveCallback, isFixedSeat?: (seatId: number) => boolean);
    /**
     * 키보드 드래그&드롭 기능 활성화
     */
    enable(): void;
    /**
     * 좌석 카드를 포커스 가능하도록 설정
     */
    private setupFocusableCards;
    /**
     * 포커스 가능한 카드 업데이트
     */
    private updateFocusableCards;
    /**
     * 카드 레이블 가져오기
     */
    private getCardLabel;
    /**
     * 키보드 이벤트 처리
     */
    private handleKeyDown;
    /**
     * 카드 선택
     */
    private selectCard;
    /**
     * 카드 선택 해제
     */
    private deselectCard;
    /**
     * 카드 하이라이트
     */
    private highlightCard;
    /**
     * 카드 하이라이트 제거
     */
    private unhighlightCard;
    /**
     * 비활성화
     */
    disable(): void;
}
//# sourceMappingURL=KeyboardDragDropManager.d.ts.map