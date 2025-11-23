/**
 * 레이아웃 렌더러
 * 학생 카드 및 좌석 배치 렌더링 담당
 */

import { Student } from '../models/Student.js';
import { Seat } from '../models/Seat.js';
import { OutputModule } from '../modules/OutputModule.js';

/**
 * LayoutRenderer가 필요로 하는 의존성 인터페이스
 */
export interface LayoutRendererDependencies {
    getStudents: () => Student[];
    getSeats: () => Seat[];
    getNextSeatId: () => number;
    setNextSeatId: (id: number) => void;
    incrementNextSeatId: () => number;
    getFixedSeatIds: () => Set<number>;
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    setupFixedSeatClickHandler: (card: HTMLDivElement, seatId: number) => void;
    enableSeatSwapDragAndDrop: () => void;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    saveLayoutToHistory: () => void;
}

/**
 * 레이아웃 렌더러 클래스
 */
export class LayoutRenderer {
    private deps: LayoutRendererDependencies;

    constructor(dependencies: LayoutRendererDependencies) {
        this.deps = dependencies;
    }

    /**
     * 최종 자리 배치도 렌더링
     */
    public renderFinalLayout(seats: Seat[]): void {
        // 카드 컨테이너 표시
        const cardContainer = document.getElementById('card-layout-container');
        
        if (!cardContainer) {
            if (this.deps.isDevelopmentMode()) {
                console.error('카드 컨테이너를 찾을 수 없습니다.');
            }
            return;
        }
        
        cardContainer.style.display = 'block';
        
        // 헤더 제목 변경
        const mainHeader = document.querySelector('.main-header h2');
        if (mainHeader) {
            mainHeader.textContent = '자리 배치도';
        }

        // 실제 학생 데이터로 카드 렌더링
        this.renderStudentCards(seats);
    }

    /**
     * 학생 데이터로 카드 렌더링
     */
    private renderStudentCards(seats: Seat[]): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

        // 기존 카드 제거
        seatsArea.innerHTML = '';
        
        // 좌석 번호를 1부터 시작하도록 초기화
        this.deps.setNextSeatId(1);

        // 현재 선택된 배치 형태 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
        const layoutType = layoutTypeInput ? layoutTypeInput.value : '';
        const groupSizeInput = document.querySelector('input[name="group-size"]:checked') as HTMLInputElement;
        const groupSize = groupSizeInput ? groupSizeInput.value : '';

        // 모둠 배치인지 확인
        const isGroupLayout = layoutType === 'group' && (groupSize === 'group-3' || groupSize === 'group-4' || groupSize === 'group-5' || groupSize === 'group-6');
        const groupSizeNumber = groupSize === 'group-3' ? 3 : groupSize === 'group-4' ? 4 : groupSize === 'group-5' ? 5 : groupSize === 'group-6' ? 6 : 0;

        if (isGroupLayout && groupSizeNumber > 0) {
            // 모둠 배치: 카드를 그룹으로 묶어서 표시
            this.renderGroupCards(seats, groupSizeNumber, seatsArea);
        } else {
            // 일반 배치: 기존 방식대로 표시
            const students = this.deps.getStudents();
            
            // 학생 수에 따라 그리드 열 수 결정
            const columnCount = students.length <= 20 ? 4 : 6;
            seatsArea.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
            seatsArea.style.gap = '10px';
            seatsArea.style.display = 'grid';

            seats.forEach((seat, index) => {
                if (index >= students.length) return;
                
                const student = students[index];
                const card = this.createStudentCard(student, index);
                seatsArea.appendChild(card);
            });
        }

        // 렌더 후 드래그&드롭 스왑 핸들러 보장
        this.deps.enableSeatSwapDragAndDrop();
        
        // 초기 렌더링 후 첫 번째 상태를 히스토리에 저장
        this.deps.setTimeoutSafe(() => {
            this.deps.saveLayoutToHistory();
        }, 100);
    }

    /**
     * 모둠 배치로 카드 렌더링 (그룹으로 묶어서 표시)
     */
    private renderGroupCards(seats: Seat[], groupSize: number, seatsArea: HTMLElement): void {
        // 이 메서드는 MainController에서 복잡한 로직이 있으므로
        // 일단 기본 구조만 만들고, 나중에 이동
        const students = this.deps.getStudents();
        
        if (students.length === 0) {
            // 임시 학생 데이터 생성 로직은 MainController에 남겨둠
            return;
        }

        // TODO: renderGroupCards 로직 이동 (복잡하므로 단계적으로)
        console.warn('renderGroupCards는 아직 구현되지 않았습니다. MainController에서 처리합니다.');
    }

    /**
     * 학생 카드 생성
     */
    private createStudentCard(student: Student, index: number): HTMLDivElement {
        const card = document.createElement('div');
        card.className = 'student-seat-card';
        card.setAttribute('draggable', 'true');
        
        // 좌석 고유 ID 부여
        const seatId = this.deps.incrementNextSeatId();
        card.setAttribute('data-seat-id', seatId.toString());
        
        // 접근성 개선: ARIA 레이블 추가
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `좌석 ${seatId}: ${student.name} (${student.gender === 'M' ? '남학생' : '여학생'})`);
        card.setAttribute('tabindex', '0');
        
        // 좌석 번호 표시 (좌측 상단)
        const seatNumberDiv = document.createElement('div');
        seatNumberDiv.className = 'seat-number-label';
        seatNumberDiv.textContent = `#${seatId}`;
        seatNumberDiv.setAttribute('aria-hidden', 'true');
        seatNumberDiv.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            font-size: 0.8em;
            font-weight: bold;
            color: #667eea;
            background: rgba(255, 255, 255, 0.9);
            padding: 2px 6px;
            border-radius: 4px;
            z-index: 5;
        `;
        card.appendChild(seatNumberDiv);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'student-name';
        
        // 긴 이름 처리: 20자 이상이면 말줄임표 표시 및 툴팁 추가
        const displayName = student.name.length > 20 ? student.name.substring(0, 20) + '...' : student.name;
        nameDiv.textContent = displayName;
        if (student.name.length > 20) {
            nameDiv.setAttribute('title', student.name);
            nameDiv.setAttribute('aria-label', student.name);
        }
        
        nameDiv.style.display = 'flex';
        nameDiv.style.alignItems = 'center';
        nameDiv.style.justifyContent = 'center';
        nameDiv.style.height = '100%';
        nameDiv.style.width = '100%';
        nameDiv.style.overflow = 'hidden';
        nameDiv.style.textOverflow = 'ellipsis';
        nameDiv.style.whiteSpace = 'nowrap';
        nameDiv.style.padding = '0 5px';
        
        // 성별에 따라 클래스 추가
        if (student.gender === 'M') {
            card.classList.add('gender-m');
        } else {
            card.classList.add('gender-f');
        }
        
        card.appendChild(nameDiv);
        
        // 이미 고정된 좌석인 경우 시각적 표시
        const fixedSeatIds = this.deps.getFixedSeatIds();
        if (fixedSeatIds.has(seatId)) {
            card.classList.add('fixed-seat');
            card.setAttribute('aria-label', `고정 좌석 ${seatId}: ${student.name} (${student.gender === 'M' ? '남학생' : '여학생'}) - 클릭하여 해제`);
            card.title = '고정 좌석 (클릭하여 해제)';
            
            // 🔒 아이콘 추가
            const lockIcon = document.createElement('div');
            lockIcon.className = 'fixed-seat-lock';
            lockIcon.textContent = '🔒';
            lockIcon.setAttribute('aria-hidden', 'true');
            lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
            card.appendChild(lockIcon);
        }
        
        // 키보드 네비게이션 지원
        this.deps.addEventListenerSafe(card, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter' || ke.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
        
        // 고정 좌석 모드일 때 클릭 이벤트 추가
        this.deps.setupFixedSeatClickHandler(card, seatId);
        
        return card;
    }
}
