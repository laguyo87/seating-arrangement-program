/**
 * 드래그&드롭 관리자
 * 좌석 카드의 드래그&드롭 기능을 담당합니다.
 */

export type OnDropCallback = (sourceCard: HTMLElement, targetCard: HTMLElement | null, insertPosition?: 'before' | 'after') => void;

export class DragDropManager {
    private dragSourceCard: HTMLElement | null = null;
    private dragOverIndicator: HTMLElement | null = null;
    private seatsArea: HTMLElement | null = null;
    private onDropCallback?: OnDropCallback;
    private isFixedSeat?: (seatId: number) => boolean;

    constructor(seatsAreaId: string, onDrop?: OnDropCallback, isFixedSeat?: (seatId: number) => boolean) {
        this.seatsArea = document.getElementById(seatsAreaId);
        this.onDropCallback = onDrop;
        this.isFixedSeat = isFixedSeat;
    }

    /**
     * 드래그&드롭 기능 활성화
     */
    public enable(): void {
        if (!this.seatsArea) return;

        // dragstart
        this.seatsArea.addEventListener('dragstart', (ev) => {
            const e = ev as DragEvent;
            const target = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            if (!target) return;
            
            // 자리 배치가 완료되었는지 확인 (액션 버튼이 표시되어 있으면 배치 완료 상태)
            const actionButtons = document.getElementById('layout-action-buttons');
            const isLayoutComplete = actionButtons && actionButtons.style.display !== 'none';
            
            // 배치가 완료되지 않은 상태에서 고정 좌석 모드가 활성화되어 있으면 드래그 비활성화
            if (!isLayoutComplete) {
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
                if (fixedRandomMode) {
                    e.preventDefault();
                    return;
                }
            }
            
            // 고정 좌석은 드래그 불가
            if (target.classList.contains('fixed-seat')) {
                e.preventDefault();
                return;
            }
            
            this.dragSourceCard = target;
            try { 
                e.dataTransfer?.setData('text/plain', 'swap'); 
            } catch {}
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        });
        
        // dragend
        this.seatsArea.addEventListener('dragend', () => {
            this.cleanupDragState();
        });

        // dragover
        this.seatsArea.addEventListener('dragover', (ev) => {
            const e = ev as DragEvent;
            if (this.dragSourceCard) {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                
                this.updateDragOverState(e);
            }
        });

        // dragleave
        this.seatsArea.addEventListener('dragleave', (ev) => {
            const e = ev as DragEvent;
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!relatedTarget || !this.seatsArea?.contains(relatedTarget)) {
                this.cleanupDragState();
            }
        });

        // drop
        this.seatsArea.addEventListener('drop', (ev) => {
            const e = ev as DragEvent;
            e.preventDefault();
            
            this.cleanupDragState();
            
            const source = this.dragSourceCard;
            this.dragSourceCard = null;
            if (!source || !this.onDropCallback) return;
            
            // 타겟 카드 찾기
            let targetCard: HTMLElement | null = null;
            const targetElement = e.target as HTMLElement;
            
            if (targetElement) {
                if (targetElement.classList.contains('student-seat-card')) {
                    targetCard = targetElement;
                } else {
                    targetCard = targetElement.closest('.student-seat-card') as HTMLElement | null;
                }
            }
            
            // 드롭 위치 계산
            let insertPosition: 'before' | 'after' | undefined = undefined;
            if (!targetCard && this.seatsArea) {
                // 빈 공간에 드롭: 가장 가까운 카드 찾기
                const seatsAreaRect = this.seatsArea.getBoundingClientRect();
                const dropX = e.clientX - seatsAreaRect.left;
                const dropY = e.clientY - seatsAreaRect.top;
                
                const allCards = Array.from(this.seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
                const cardsOnly = allCards.filter(card => 
                    card !== source && 
                    !card.classList.contains('partition-label') &&
                    !card.closest('.labels-row')
                );
                
                if (cardsOnly.length > 0) {
                    let closestCard: HTMLElement | null = null;
                    let minDistance = Infinity;
                    
                    for (const card of cardsOnly) {
                        const cardRect = card.getBoundingClientRect();
                        const cardX = cardRect.left - seatsAreaRect.left + cardRect.width / 2;
                        const cardY = cardRect.top - seatsAreaRect.top + cardRect.height / 2;
                        
                        const distance = Math.sqrt(Math.pow(dropX - cardX, 2) + Math.pow(dropY - cardY, 2));
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestCard = card;
                            
                            if (dropY < cardY - cardRect.height / 4) {
                                insertPosition = 'before';
                            } else if (dropY > cardY + cardRect.height / 4) {
                                insertPosition = 'after';
                            } else {
                                if (dropX < cardX) {
                                    insertPosition = 'before';
                                } else {
                                    insertPosition = 'after';
                                }
                            }
                        }
                    }
                    
                    if (closestCard) {
                        targetCard = closestCard;
                    }
                }
            }
            
            // 콜백 호출
            this.onDropCallback(source, targetCard, insertPosition);
        });
    }

    /**
     * 드래그 상태 정리
     */
    private cleanupDragState(): void {
        if (!this.seatsArea) return;
        
        this.seatsArea.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        this.seatsArea.classList.remove('drag-over-area');
        
        if (this.dragOverIndicator) {
            this.dragOverIndicator.remove();
            this.dragOverIndicator = null;
        }
    }

    /**
     * 드래그 오버 상태 업데이트
     */
    private updateDragOverState(e: DragEvent): void {
        if (!this.seatsArea || !this.dragSourceCard) return;
        
        // 기존 하이라이트 및 인디케이터 제거
        this.cleanupDragState();
        
        // 마우스 위치 기반으로 드롭 위치 계산
        const seatsAreaRect = this.seatsArea.getBoundingClientRect();
        const mouseX = e.clientX - seatsAreaRect.left;
        const mouseY = e.clientY - seatsAreaRect.top;
        
        // 모든 카드 가져오기
        const allCards = Array.from(this.seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
        const cardsOnly = allCards.filter(card => 
            card !== this.dragSourceCard && 
            !card.classList.contains('partition-label') &&
            !card.closest('.labels-row')
        );
        
        // 마우스 위치에서 가장 가까운 카드 찾기
        let closestCard: HTMLElement | null = null;
        let minDistance = Infinity;
        let insertPosition: 'before' | 'after' | 'on' = 'on';
        
        for (const card of cardsOnly) {
            const cardRect = card.getBoundingClientRect();
            const cardX = cardRect.left - seatsAreaRect.left + cardRect.width / 2;
            const cardY = cardRect.top - seatsAreaRect.top + cardRect.height / 2;
            
            // 카드 영역 내부인지 확인
            const cardLeft = cardRect.left - seatsAreaRect.left;
            const cardRight = cardRect.right - seatsAreaRect.left;
            const cardTop = cardRect.top - seatsAreaRect.top;
            const cardBottom = cardRect.bottom - seatsAreaRect.top;
            
            if (mouseX >= cardLeft && mouseX <= cardRight && 
                mouseY >= cardTop && mouseY <= cardBottom) {
                closestCard = card;
                insertPosition = 'on';
                break;
            }
            
            // 카드 근처 거리 계산
            const distance = Math.sqrt(Math.pow(mouseX - cardX, 2) + Math.pow(mouseY - cardY, 2));
            
            if (distance < minDistance) {
                minDistance = distance;
                closestCard = card;
                
                if (mouseY < cardY - cardRect.height / 4) {
                    insertPosition = 'before';
                } else if (mouseY > cardY + cardRect.height / 4) {
                    insertPosition = 'after';
                } else {
                    if (mouseX < cardX) {
                        insertPosition = 'before';
                    } else {
                        insertPosition = 'after';
                    }
                }
            }
        }
        
        // 시각적 피드백 제공
        if (closestCard) {
            if (insertPosition === 'on') {
                closestCard.classList.add('drag-over');
            } else {
                this.showInsertIndicator(closestCard, insertPosition);
            }
        } else {
            this.seatsArea.classList.add('drag-over-area');
        }
    }

    /**
     * 드롭 위치 삽입 인디케이터 표시
     */
    private showInsertIndicator(card: HTMLElement, position: 'before' | 'after'): void {
        // 기존 인디케이터 제거
        if (this.dragOverIndicator) {
            this.dragOverIndicator.remove();
        }
        
        // 새 인디케이터 생성
        const indicator = document.createElement('div');
        indicator.className = 'drag-insert-indicator';
        indicator.style.cssText = `
            position: absolute;
            width: 100%;
            height: 3px;
            background: #4CAF50;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.8);
        `;
        
        const cardRect = card.getBoundingClientRect();
        const seatsAreaRect = this.seatsArea!.getBoundingClientRect();
        
        if (position === 'before') {
            indicator.style.top = `${cardRect.top - seatsAreaRect.top - 1.5}px`;
        } else {
            indicator.style.top = `${cardRect.bottom - seatsAreaRect.top - 1.5}px`;
        }
        
        indicator.style.left = `${cardRect.left - seatsAreaRect.left}px`;
        indicator.style.width = `${cardRect.width}px`;
        
        this.seatsArea!.appendChild(indicator);
        this.dragOverIndicator = indicator;
    }

    /**
     * 드래그&드롭 기능 비활성화
     */
    public disable(): void {
        // 이벤트 리스너는 제거하지 않고, 드래그 소스만 초기화
        this.dragSourceCard = null;
        this.cleanupDragState();
    }
}

