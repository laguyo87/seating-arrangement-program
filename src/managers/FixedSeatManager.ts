/**
 * 고정 좌석 관리자
 * 고정 좌석 지정, 해제, 드롭다운 업데이트 기능을 담당합니다.
 */
import { logger } from '../utils/logger.js';

export class FixedSeatManager {
    private fixedSeatIds: Set<number> = new Set();
    private onUpdate?: () => void;

    constructor(onUpdate?: () => void) {
        this.onUpdate = onUpdate;
    }

    /**
     * 고정 좌석 ID 목록 가져오기
     */
    public getFixedSeatIds(): Set<number> {
        return this.fixedSeatIds;
    }

    /**
     * 고정 좌석인지 확인
     */
    public isFixed(seatId: number): boolean {
        return this.fixedSeatIds.has(seatId);
    }

    /**
     * 고정 좌석 추가
     */
    public addFixedSeat(seatId: number, card: HTMLDivElement): void {
        this.fixedSeatIds.add(seatId);
        card.classList.add('fixed-seat');
        card.title = '고정 좌석 (클릭하여 해제)';
        
        // 🔒 아이콘 추가 (없는 경우만)
        if (!card.querySelector('.fixed-seat-lock')) {
            const lockIcon = document.createElement('div');
            lockIcon.className = 'fixed-seat-lock';
            lockIcon.textContent = '🔒';
            lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
            card.appendChild(lockIcon);
        }
        
        this.updateDropdowns();
        logger.log(`고정 좌석 ${seatId} 설정`);
    }

    /**
     * 고정 좌석 제거
     */
    public removeFixedSeat(seatId: number, card: HTMLDivElement): void {
        this.fixedSeatIds.delete(seatId);
        card.classList.remove('fixed-seat');
        card.title = '클릭하여 고정 좌석 지정';
        
        // 🔒 아이콘 제거
        const lockIcon = card.querySelector('.fixed-seat-lock');
        if (lockIcon) {
            lockIcon.remove();
        }
        
        this.updateDropdowns();
        logger.log(`고정 좌석 ${seatId} 해제`);
    }

    /**
     * 고정 좌석 토글
     */
    public toggleFixedSeat(seatId: number, card: HTMLDivElement): void {
        if (this.fixedSeatIds.has(seatId)) {
            this.removeFixedSeat(seatId, card);
        } else {
            this.addFixedSeat(seatId, card);
        }
        
        if (this.onUpdate) {
            this.onUpdate();
        }
    }

    /**
     * 고정 좌석 클릭 핸들러 설정
     */
    public setupFixedSeatClickHandler(card: HTMLDivElement, seatId: number): void {
        // '고정 좌석 지정 후 랜덤 배치' 모드인지 확인
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
        
        if (fixedRandomMode) {
            card.style.cursor = 'pointer';
            card.title = '클릭하여 고정 좌석 지정/해제';
            
            // 이미 고정된 좌석인지 확인하여 시각적 표시
            if (this.fixedSeatIds.has(seatId)) {
                card.classList.add('fixed-seat');
                card.title = '고정 좌석 (클릭하여 해제)';
                
                // 🔒 아이콘 추가 (없는 경우만)
                if (!card.querySelector('.fixed-seat-lock')) {
                    const lockIcon = document.createElement('div');
                    lockIcon.className = 'fixed-seat-lock';
                    lockIcon.textContent = '🔒';
                    lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
                    card.appendChild(lockIcon);
                }
            }
        }
    }

    /**
     * 테이블의 고정 좌석 드롭다운 업데이트
     */
    public updateDropdowns(): void {
        const fixedSeatSelects = document.querySelectorAll('.fixed-seat-select') as NodeListOf<HTMLSelectElement>;
        
        fixedSeatSelects.forEach(select => {
            const currentValue = select.value;
            const currentOption = select.querySelector(`option[value="${currentValue}"]`);
            
            // 기존 옵션 제거 (기본 옵션 제외)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild!);
            }
            
            // 고정 좌석 옵션 추가
            if (this.fixedSeatIds.size > 0) {
                this.fixedSeatIds.forEach(seatId => {
                    const option = document.createElement('option');
                    option.value = seatId.toString();
                    option.textContent = `좌석 #${seatId}`;
                    select.appendChild(option);
                });
            }
            
            // 기존 값이 유효하면 유지
            if (currentOption && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            } else {
                select.value = '';
            }
        });
    }

    /**
     * 모든 고정 좌석 초기화
     */
    public clearAll(): void {
        this.fixedSeatIds.clear();
        this.updateDropdowns();
        
        // 모든 고정 좌석 카드에서 시각적 표시 제거
        document.querySelectorAll('.fixed-seat').forEach(card => {
            card.classList.remove('fixed-seat');
            const lockIcon = card.querySelector('.fixed-seat-lock');
            if (lockIcon) {
                lockIcon.remove();
            }
        });
        
        if (this.onUpdate) {
            this.onUpdate();
        }
    }

    /**
     * 고정 좌석 개수
     */
    public getCount(): number {
        return this.fixedSeatIds.size;
    }
}

