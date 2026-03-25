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
    
    // 터치 이벤트 관련
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchCurrentCard: HTMLElement | null = null;
    private isDragging: boolean = false;

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
        
        // 터치 이벤트 지원 (모바일)
        this.setupTouchEvents();
    }
    
    /**
     * 터치 이벤트 설정 (모바일 드래그 앤 드롭)
     */
    private setupTouchEvents(): void {
        if (!this.seatsArea) return;
        
        // touchstart
        this.seatsArea.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            if (!touch) return;
            
            const target = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            if (!target) return;
            
            // 자리 배치가 완료되었는지 확인
            const actionButtons = document.getElementById('layout-action-buttons');
            const isLayoutComplete = actionButtons && actionButtons.style.display !== 'none';
            
            // 배치가 완료되지 않은 상태에서 고정 좌석 모드가 활성화되어 있으면 터치 비활성화
            if (!isLayoutComplete) {
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
                if (fixedRandomMode) {
                    return;
                }
            }
            
            // 고정 좌석은 드래그 불가
            if (target.classList.contains('fixed-seat')) {
                return;
            }
            
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchCurrentCard = target;
            this.isDragging = false;
            
            // 카드에 시각적 피드백
            target.style.opacity = '0.7';
            target.style.transform = 'scale(0.95)';
        }, { passive: true });
        
        // touchmove
        this.seatsArea.addEventListener('touchmove', (e) => {
            if (!this.touchCurrentCard) return;
            
            const touch = e.touches[0];
            if (!touch) return;
            
            const deltaX = Math.abs(touch.clientX - this.touchStartX);
            const deltaY = Math.abs(touch.clientY - this.touchStartY);
            
            // 최소 이동 거리 확인 (10px)
            if (deltaX > 10 || deltaY > 10) {
                if (!this.isDragging) {
                    this.isDragging = true;
                    e.preventDefault(); // 스크롤 방지
                    
                    // 카드를 따라다니도록
                    this.touchCurrentCard.style.position = 'fixed';
                    this.touchCurrentCard.style.zIndex = '10000';
                    this.touchCurrentCard.style.pointerEvents = 'none';
                }
                
                // 카드 위치 업데이트
                if (this.touchCurrentCard) {
                    this.touchCurrentCard.style.left = `${touch.clientX - 50}px`;
                    this.touchCurrentCard.style.top = `${touch.clientY - 50}px`;
                }
                
                // 드래그 오버 상태 업데이트
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                if (elementBelow) {
                    const targetCard = (elementBelow as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
                    if (targetCard && targetCard !== this.touchCurrentCard) {
                        this.updateDragOverStateForTouch(targetCard);
                    } else {
                        this.cleanupDragState();
                    }
                }
            }
        }, { passive: false });
        
        // touchend
        this.seatsArea.addEventListener('touchend', (e) => {
            if (!this.touchCurrentCard) return;
            
            const touch = e.changedTouches[0];
            if (!touch) return;
            
            if (this.isDragging) {
                // 드롭 처리
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                let targetCard: HTMLElement | null = null;
                
                if (elementBelow) {
                    const card = (elementBelow as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
                    if (card && card !== this.touchCurrentCard) {
                        targetCard = card;
                    }
                }
                
                // 카드 스타일 복원
                this.touchCurrentCard.style.position = '';
                this.touchCurrentCard.style.zIndex = '';
                this.touchCurrentCard.style.opacity = '';
                this.touchCurrentCard.style.transform = '';
                this.touchCurrentCard.style.left = '';
                this.touchCurrentCard.style.top = '';
                this.touchCurrentCard.style.pointerEvents = '';
                
                // 콜백 호출
                if (this.onDropCallback && targetCard) {
                    this.onDropCallback(this.touchCurrentCard, targetCard);
                }
                
                this.cleanupDragState();
            } else {
                // 단순 터치 (드래그 아님)
                this.touchCurrentCard.style.opacity = '';
                this.touchCurrentCard.style.transform = '';
            }
            
            this.touchCurrentCard = null;
            this.isDragging = false;
        }, { passive: true });
        
        // touchcancel
        this.seatsArea.addEventListener('touchcancel', () => {
            if (this.touchCurrentCard) {
                this.touchCurrentCard.style.position = '';
                this.touchCurrentCard.style.zIndex = '';
                this.touchCurrentCard.style.opacity = '';
                this.touchCurrentCard.style.transform = '';
                this.touchCurrentCard.style.left = '';
                this.touchCurrentCard.style.top = '';
                this.touchCurrentCard.style.pointerEvents = '';
                this.touchCurrentCard = null;
            }
            this.isDragging = false;
            this.cleanupDragState();
        }, { passive: true });
    }
    
    /**
     * 터치 드래그 오버 상태 업데이트
     */
    private updateDragOverStateForTouch(targetCard: HTMLElement): void {
        if (!this.seatsArea) return;
        
        // 기존 하이라이트 제거
        this.seatsArea.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // 타겟 카드 하이라이트
        if (targetCard && !targetCard.classList.contains('fixed-seat')) {
            targetCard.classList.add('drag-over');
        }
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

