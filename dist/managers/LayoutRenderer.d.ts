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
export declare class LayoutRenderer {
    private deps;
    constructor(dependencies: LayoutRendererDependencies);
    /**
     * 최종 자리 배치도 렌더링
     */
    renderFinalLayout(seats: Seat[]): void;
    /**
     * 학생 데이터로 카드 렌더링
     */
    private renderStudentCards;
    /**
     * 모둠 배치로 카드 렌더링 (그룹으로 묶어서 표시)
     */
    private renderGroupCards;
    /**
     * 학생 카드 생성
     */
    private createStudentCard;
}
//# sourceMappingURL=LayoutRenderer.d.ts.map