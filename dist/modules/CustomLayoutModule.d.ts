/**
 * 사용자 맞춤 배치 모듈
 * 드래그 앤 드롭으로 좌석을 직접 배치하는 기능 제공
 */
export declare class CustomLayoutModule {
    private canvas;
    private ctx;
    private isCustomMode;
    private placedItems;
    private currentDragElement;
    private currentDragOffset;
    constructor(canvasId: string);
    /**
     * 이벤트 리스너 초기화
     */
    private initializeEventListeners;
    /**
     * 드래그 시작 이벤트 처리 (HTML5 API)
     */
    private handleDragStartEvent;
    /**
     * 커스텀 모드 시작
     */
    private startCustomMode;
    /**
     * 드래그 오버 처리
     */
    private handleDragOver;
    /**
     * 드래그 엔터 처리
     */
    private handleDragEnter;
    /**
     * 드래그 리브 처리
     */
    private handleDragLeave;
    /**
     * 드롭 처리
     */
    private handleDrop;
    /**
     * 아이템 배치
     */
    private placeItem;
    /**
     * 드래그 미리보기 그리기
     */
    private drawDragPreview;
    /**
     * 배경 그리기
     */
    private drawBackground;
    /**
     * 렌더링
     */
    private render;
    /**
     * 아이템 그리기
     */
    private drawItem;
    /**
     * 캔버스 초기화
     */
    clear(): void;
    /**
     * 커스텀 모드 활성화
     */
    enableCustomMode(): void;
    /**
     * 커스텀 모드 비활성화
     */
    disableCustomMode(): void;
    /**
     * 커스텀 모드 상태 반환
     */
    getCustomMode(): boolean;
}
//# sourceMappingURL=CustomLayoutModule.d.ts.map