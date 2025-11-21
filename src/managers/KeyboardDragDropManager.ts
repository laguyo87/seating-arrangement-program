/**
 * 키보드 드래그&드롭 관리자
 * 화살표 키를 사용한 좌석 이동 기능
 */

export type OnKeyboardMoveCallback = (sourceCard: HTMLElement, direction: 'up' | 'down' | 'left' | 'right') => void;

export class KeyboardDragDropManager {
    private seatsArea: HTMLElement | null = null;
    private onMoveCallback?: OnKeyboardMoveCallback;
    private isFixedSeat?: (seatId: number) => boolean;
    private selectedCard: HTMLElement | null = null;

    constructor(seatsAreaId: string, onMove?: OnKeyboardMoveCallback, isFixedSeat?: (seatId: number) => boolean) {
        this.seatsArea = document.getElementById(seatsAreaId);
        this.onMoveCallback = onMove;
        this.isFixedSeat = isFixedSeat;
    }

    /**
     * 키보드 드래그&드롭 기능 활성화
     */
    public enable(): void {
        if (!this.seatsArea) return;

        // 좌석 카드에 포커스 가능하도록 설정
        this.setupFocusableCards();

        // 키보드 이벤트 리스너
        this.seatsArea.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // 포커스 이벤트 (카드 선택 표시)
        this.seatsArea.addEventListener('focusin', (e) => {
            const target = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            if (target) {
                this.selectedCard = target;
                this.highlightCard(target);
            }
        });

        this.seatsArea.addEventListener('focusout', () => {
            if (this.selectedCard) {
                this.unhighlightCard(this.selectedCard);
                this.selectedCard = null;
            }
        });
    }

    /**
     * 좌석 카드를 포커스 가능하도록 설정
     */
    private setupFocusableCards(): void {
        if (!this.seatsArea) return;

        const observer = new MutationObserver(() => {
            this.updateFocusableCards();
        });

        observer.observe(this.seatsArea, {
            childList: true,
            subtree: true
        });

        // 초기 설정
        this.updateFocusableCards();
    }

    /**
     * 포커스 가능한 카드 업데이트
     */
    private updateFocusableCards(): void {
        if (!this.seatsArea) return;

        const cards = this.seatsArea.querySelectorAll('.student-seat-card') as NodeListOf<HTMLElement>;
        cards.forEach((card) => {
            // 고정 좌석은 포커스 불가
            if (card.classList.contains('fixed-seat')) {
                card.setAttribute('tabindex', '-1');
            } else {
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', this.getCardLabel(card));
            }
        });
    }

    /**
     * 카드 레이블 가져오기
     */
    private getCardLabel(card: HTMLElement): string {
        const nameElement = card.querySelector('.student-name');
        const name = nameElement?.textContent?.trim() || '빈 좌석';
        return `${name} 좌석. 화살표 키로 이동, Enter로 선택`;
    }

    /**
     * 키보드 이벤트 처리
     */
    private handleKeyDown(e: KeyboardEvent): void {
        const target = e.target as HTMLElement;
        const card = target.closest('.student-seat-card') as HTMLElement | null;

        if (!card) return;

        // 고정 좌석은 이동 불가
        if (card.classList.contains('fixed-seat')) {
            return;
        }

        // 자리 배치가 완료되었는지 확인
        const actionButtons = document.getElementById('layout-action-buttons');
        const isLayoutComplete = actionButtons && actionButtons.style.display !== 'none';

        if (!isLayoutComplete) {
            const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
            if (fixedRandomMode) {
                return;
            }
        }

        let direction: 'up' | 'down' | 'left' | 'right' | null = null;

        switch (e.key) {
            case 'ArrowUp':
                direction = 'up';
                e.preventDefault();
                break;
            case 'ArrowDown':
                direction = 'down';
                e.preventDefault();
                break;
            case 'ArrowLeft':
                direction = 'left';
                e.preventDefault();
                break;
            case 'ArrowRight':
                direction = 'right';
                e.preventDefault();
                break;
            case 'Enter':
            case ' ':
                // Enter/Space: 카드 선택 (드래그 시작)
                this.selectCard(card);
                e.preventDefault();
                return;
            case 'Escape':
                // Escape: 선택 해제
                this.deselectCard();
                e.preventDefault();
                return;
        }

        if (direction && this.onMoveCallback) {
            this.onMoveCallback(card, direction);
            // 이동 후 포커스 유지
            requestAnimationFrame(() => {
                card.focus();
            });
        }
    }

    /**
     * 카드 선택
     */
    private selectCard(card: HTMLElement): void {
        this.selectedCard = card;
        this.highlightCard(card, true);
        card.setAttribute('aria-pressed', 'true');
    }

    /**
     * 카드 선택 해제
     */
    private deselectCard(): void {
        if (this.selectedCard) {
            this.unhighlightCard(this.selectedCard);
            this.selectedCard.setAttribute('aria-pressed', 'false');
            this.selectedCard = null;
        }
    }

    /**
     * 카드 하이라이트
     */
    private highlightCard(card: HTMLElement, isSelected: boolean = false): void {
        card.classList.add('keyboard-focused');
        if (isSelected) {
            card.classList.add('keyboard-selected');
        }
    }

    /**
     * 카드 하이라이트 제거
     */
    private unhighlightCard(card: HTMLElement): void {
        card.classList.remove('keyboard-focused', 'keyboard-selected');
    }

    /**
     * 비활성화
     */
    public disable(): void {
        if (this.selectedCard) {
            this.deselectCard();
        }
    }
}

