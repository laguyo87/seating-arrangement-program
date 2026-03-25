/**
 * 히스토리 관리자
 * 자리 배치 히스토리 저장, 복원, 되돌리기 기능을 담당합니다.
 */
import { logger } from '../utils/logger.js';
import { HistoryState, HistoryData, HistoryStateType } from '../types/history.js';

export class HistoryManager {
    private history: HistoryState[] = [];
    private historyIndex: number = -1;
    private maxHistorySize: number = 100;
    private onStateChange?: () => void;

    constructor(onStateChange?: () => void) {
        this.onStateChange = onStateChange;
    }

    /**
     * 히스토리에 상태 저장
     */
    public saveState<T extends HistoryData>(type: HistoryStateType, data: T): void {
        // 현재 인덱스 이후의 히스토리 제거 (새로운 상태가 추가되면 이후 히스토리는 삭제)
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // 새 상태 추가
        this.history.push({ type, data });
        
        // 히스토리 크기 제한
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex = this.history.length - 1;
        } else {
            this.historyIndex++;
        }
        
        logger.log('히스토리 저장:', { type, historyIndex: this.historyIndex, historyLength: this.history.length });
        
        // 상태 변경 콜백 호출
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    /**
     * 이전 상태로 되돌리기
     */
    public undo(): HistoryState | null {
        // 되돌리기할 히스토리가 없거나, 이미 첫 번째 상태인 경우
        if (this.historyIndex < 0 || this.history.length === 0 || this.historyIndex === 0) {
            return null;
        }
        
        // 이전 상태로 이동
        this.historyIndex--;
        const previousState = this.history[this.historyIndex];
        
        logger.log('되돌리기 - 복원할 상태:', previousState);
        logger.log('되돌리기 - 복원할 인덱스:', this.historyIndex);
        
        // 상태 변경 콜백 호출
        if (this.onStateChange) {
            this.onStateChange();
        }
        
        return previousState;
    }

    /**
     * 다시 실행하기 (되돌리기 취소)
     */
    public redo(): HistoryState | null {
        // 다시 실행할 히스토리가 없는 경우
        if (this.historyIndex >= this.history.length - 1) {
            return null;
        }
        
        // 다음 상태로 이동
        this.historyIndex++;
        const nextState = this.history[this.historyIndex];
        
        logger.log('다시 실행 - 복원할 상태:', nextState);
        
        // 상태 변경 콜백 호출
        if (this.onStateChange) {
            this.onStateChange();
        }
        
        return nextState;
    }

    /**
     * 되돌리기 가능 여부
     */
    public canUndo(): boolean {
        return this.historyIndex > 0 && this.history.length > 0;
    }

    /**
     * 다시 실행 가능 여부
     */
    public canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * 히스토리 초기화
     */
    public reset(): void {
        this.history = [];
        this.historyIndex = -1;
        
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    /**
     * 현재 히스토리 인덱스
     */
    public getCurrentIndex(): number {
        return this.historyIndex;
    }

    /**
     * 히스토리 길이
     */
    public getLength(): number {
        return this.history.length;
    }

    /**
     * 특정 인덱스의 상태 가져오기
     */
    public getState(index: number): HistoryState | null {
        if (index < 0 || index >= this.history.length) {
            return null;
        }
        return this.history[index];
    }
}

