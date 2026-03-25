import { HistoryState, HistoryData, HistoryStateType } from '../types/history.js';
export declare class HistoryManager {
    private history;
    private historyIndex;
    private maxHistorySize;
    private onStateChange?;
    constructor(onStateChange?: () => void);
    /**
     * 히스토리에 상태 저장
     */
    saveState<T extends HistoryData>(type: HistoryStateType, data: T): void;
    /**
     * 이전 상태로 되돌리기
     */
    undo(): HistoryState | null;
    /**
     * 다시 실행하기 (되돌리기 취소)
     */
    redo(): HistoryState | null;
    /**
     * 되돌리기 가능 여부
     */
    canUndo(): boolean;
    /**
     * 다시 실행 가능 여부
     */
    canRedo(): boolean;
    /**
     * 히스토리 초기화
     */
    reset(): void;
    /**
     * 현재 히스토리 인덱스
     */
    getCurrentIndex(): number;
    /**
     * 히스토리 길이
     */
    getLength(): number;
    /**
     * 특정 인덱스의 상태 가져오기
     */
    getState(index: number): HistoryState | null;
}
//# sourceMappingURL=HistoryManager.d.ts.map