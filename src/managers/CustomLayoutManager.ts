/**
 * 사용자 구성 배치 관리자
 *
 * 교사가 책상을 원하는 위치로 끌어다 놓아 교실 모양을 직접 만드는 배치를 담당한다.
 *
 * 다른 배치 형태에서 카드를 끄는 것은 '학생을 서로 바꾸는' 동작이지만,
 * 이 배치에서 자리를 배정하기 전에 카드를 끄는 것은 '책상을 옮기는' 동작이다.
 * 두 동작이 섞이면 교사가 무엇을 하고 있는지 알 수 없으므로 상태로 분리한다.
 *
 *  - 책상 편집 중(배정 전): 카드를 끌면 책상이 움직인다. HTML5 드래그는 꺼 둔다.
 *  - 배정 후: 기존과 동일하게 카드를 끌면 학생이 서로 바뀐다.
 */

import { CustomLayoutService, SeatPosition, CARD_SIZE } from '../services/CustomLayoutService.js';
import { logger } from '../utils/logger.js';

export interface CustomLayoutManagerDependencies {
    /** 책상 위치가 바뀌었을 때 (저장용) */
    onPositionsChanged: (positions: SeatPosition[]) => void;
}

export class CustomLayoutManager {
    private deps: CustomLayoutManagerDependencies;
    /** 책상을 옮길 수 있는 상태인지 */
    private deskEditing = false;
    /** 지금 끌고 있는 카드 */
    private movingCard: HTMLElement | null = null;
    /** 끌고 있는 카드의 좌석 번호 (자석 계산에서 자신을 제외하기 위해) */
    private movingSeatId: number | null = null;
    /** 카드 안에서 잡은 지점 (카드 좌상단으로부터의 거리) */
    private grabOffset = { x: 0, y: 0 };
    /** 리스너를 중복 등록하지 않기 위한 표시 */
    private listenersBound = false;
    /** 줄이 맞았을 때 보여주는 안내선 */
    private guideX: HTMLElement | null = null;
    private guideY: HTMLElement | null = null;

    constructor(dependencies: CustomLayoutManagerDependencies) {
        this.deps = dependencies;
    }

    private getArea(): HTMLElement | null {
        return document.getElementById('seats-area');
    }

    /**
     * 사용자 구성 배치 모드로 좌석 영역을 준비한다.
     */
    public applyLayout(positions: SeatPosition[]): void {
        const area = this.getArea();
        if (!area) return;

        // 카드가 다시 그려지면서 안내선도 함께 사라졌으므로 참조를 버린다
        this.guideX = null;
        this.guideY = null;

        area.classList.add('custom-layout');
        area.style.height = `${CustomLayoutService.requiredHeight(positions)}px`;

        const cards = Array.from(area.querySelectorAll('.student-seat-card')) as HTMLElement[];
        const byId = new Map(positions.map(p => [p.seatId, p]));

        cards.forEach((card, index) => {
            // 좌석 번호가 있으면 그것으로, 없으면 순서로 위치를 찾는다
            const seatId = parseInt(card.getAttribute('data-seat-id') || '', 10);
            const position = byId.get(Number.isNaN(seatId) ? index + 1 : seatId) ?? positions[index];
            if (!position) return;

            card.style.left = `${position.x}px`;
            card.style.top = `${position.y}px`;
        });

        this.bindListeners();
    }

    /**
     * 사용자 구성 배치 모드를 해제한다 (다른 배치 형태로 전환할 때).
     */
    public clearLayout(): void {
        const area = this.getArea();
        if (!area) return;

        this.clearGuides();
        area.classList.remove('custom-layout', 'arranging-desks');
        area.style.height = '';

        Array.from(area.querySelectorAll('.student-seat-card')).forEach((card) => {
            const element = card as HTMLElement;
            element.style.left = '';
            element.style.top = '';
            element.draggable = true;
        });

        this.deskEditing = false;
    }

    /**
     * 책상을 옮길 수 있는 상태로 전환한다.
     *
     * 켜면 HTML5 드래그(학생 교환)를 끄고 포인터로 책상을 옮긴다.
     * 끄면 반대로 되돌려 기존 교환 동작이 살아난다.
     */
    public setDeskEditing(editing: boolean): void {
        const area = this.getArea();
        if (!area) return;

        this.deskEditing = editing;
        area.classList.toggle('arranging-desks', editing);

        Array.from(area.querySelectorAll('.student-seat-card')).forEach((card) => {
            (card as HTMLElement).draggable = !editing;
        });
    }

    public isDeskEditing(): boolean {
        return this.deskEditing;
    }

    /**
     * 현재 화면에 놓인 책상 위치를 읽는다.
     */
    public readPositions(): SeatPosition[] {
        const area = this.getArea();
        if (!area) return [];

        return (Array.from(area.querySelectorAll('.student-seat-card')) as HTMLElement[])
            .map((card, index) => {
                const seatId = parseInt(card.getAttribute('data-seat-id') || '', 10);
                return {
                    seatId: Number.isNaN(seatId) ? index + 1 : seatId,
                    x: parseInt(card.style.left || '0', 10) || 0,
                    y: parseInt(card.style.top || '0', 10) || 0
                };
            });
    }

    /**
     * 포인터로 책상을 옮기는 리스너를 붙인다. (한 번만)
     */
    private bindListeners(): void {
        const area = this.getArea();
        if (!area || this.listenersBound) return;
        this.listenersBound = true;

        area.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        area.addEventListener('pointermove', (e) => this.onPointerMove(e));
        area.addEventListener('pointerup', (e) => this.onPointerUp(e));
        area.addEventListener('pointercancel', () => this.cancelMove());
    }

    private onPointerDown(e: PointerEvent): void {
        if (!this.deskEditing) return;
        // 마우스 왼쪽 버튼, 터치, 펜만 처리한다
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const area = this.getArea();
        const card = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
        if (!area || !card) return;

        // 학생이 이미 배정된 뒤에는 카드를 끄는 것이 '학생 교환'이므로 책상을 옮기지 않는다
        if (!area.classList.contains('arranging-desks')) return;

        const areaRect = area.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        this.movingCard = card;
        const seatId = parseInt(card.getAttribute('data-seat-id') || '', 10);
        this.movingSeatId = Number.isNaN(seatId) ? null : seatId;
        this.grabOffset = {
            x: e.clientX - cardRect.left,
            y: e.clientY - cardRect.top
        };

        card.classList.add('desk-moving');
        // 포인터가 카드 밖으로 나가도 계속 추적한다
        try {
            card.setPointerCapture(e.pointerId);
        } catch {
            // 지원하지 않는 환경에서는 영역 리스너만으로 동작한다
        }

        // 스크롤이나 텍스트 선택이 끼어들지 않게 한다
        e.preventDefault();

        // 첫 위치를 즉시 반영해 손끝과 책상이 어긋나지 않게 한다
        this.moveTo(e.clientX, e.clientY, areaRect);
    }

    private onPointerMove(e: PointerEvent): void {
        if (!this.movingCard) return;

        const area = this.getArea();
        if (!area) return;

        e.preventDefault();
        this.moveTo(e.clientX, e.clientY, area.getBoundingClientRect());
    }

    private moveTo(clientX: number, clientY: number, areaRect: DOMRect): void {
        const card = this.movingCard;
        const area = this.getArea();
        if (!card || !area) return;

        const rawX = clientX - areaRect.left - this.grabOffset.x;
        const rawY = clientY - areaRect.top - this.grabOffset.y;

        // 옮기는 중인 책상을 뺀 나머지 책상에 자석처럼 달라붙게 한다
        const others = this.readPositions().filter(p => p.seatId !== this.movingSeatId);
        const magnet = CustomLayoutService.magnetize(rawX, rawY, others);

        // 아래로 끌면 영역이 함께 늘어나도록 현재 높이보다 넉넉히 잡는다
        const areaHeight = Math.max(area.clientHeight, magnet.y + CARD_SIZE);
        const resolved = CustomLayoutService.clampToArea(
            magnet.x,
            magnet.y,
            area.clientWidth,
            areaHeight
        );

        card.style.left = `${resolved.x}px`;
        card.style.top = `${resolved.y}px`;

        // 붙은 줄이 어디인지 보여준다. 가둬지며 좌표가 바뀌었다면 안내선도 지운다.
        this.showGuides(
            magnet.guideX !== null && resolved.x === magnet.x ? resolved.x : null,
            magnet.guideY !== null && resolved.y === magnet.y ? resolved.y : null
        );
    }

    /**
     * 줄이 맞았을 때 안내선을 보여준다.
     * 멀리 떨어진 책상과 줄이 맞은 것은 선이 없으면 알아채기 어렵다.
     */
    private showGuides(x: number | null, y: number | null): void {
        const area = this.getArea();
        if (!area) return;

        if (x === null) {
            this.guideX?.remove();
            this.guideX = null;
        } else {
            if (!this.guideX) {
                this.guideX = this.createGuide('vertical');
                area.appendChild(this.guideX);
            }
            this.guideX.style.left = `${x + CARD_SIZE / 2}px`;
        }

        if (y === null) {
            this.guideY?.remove();
            this.guideY = null;
        } else {
            if (!this.guideY) {
                this.guideY = this.createGuide('horizontal');
                area.appendChild(this.guideY);
            }
            this.guideY.style.top = `${y + CARD_SIZE / 2}px`;
        }
    }

    private createGuide(orientation: 'vertical' | 'horizontal'): HTMLElement {
        const guide = document.createElement('div');
        guide.className = `desk-guide desk-guide-${orientation}`;
        guide.setAttribute('aria-hidden', 'true');
        return guide;
    }

    private clearGuides(): void {
        this.guideX?.remove();
        this.guideY?.remove();
        this.guideX = null;
        this.guideY = null;
    }

    private onPointerUp(e: PointerEvent): void {
        if (!this.movingCard) return;

        try {
            this.movingCard.releasePointerCapture(e.pointerId);
        } catch {
            // 캡처하지 못했던 경우는 무시한다
        }

        this.finishMove();
    }

    private cancelMove(): void {
        this.finishMove();
    }

    private finishMove(): void {
        const card = this.movingCard;
        this.movingCard = null;
        this.movingSeatId = null;
        this.clearGuides();
        if (!card) return;

        card.classList.remove('desk-moving');

        const area = this.getArea();
        const positions = this.readPositions();

        if (area) {
            // 아래쪽으로 옮겼다면 영역 높이를 맞춘다
            area.style.height = `${CustomLayoutService.requiredHeight(positions)}px`;
        }

        try {
            this.deps.onPositionsChanged(positions);
        } catch (error) {
            logger.error('책상 위치 저장 중 오류:', error);
        }
    }
}
