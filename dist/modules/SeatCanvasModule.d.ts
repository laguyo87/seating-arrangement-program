/**
 * 좌석 캔버스 모듈
 * 좌석 배열 시각화 및 상호작용 기능 담당
 */
import { Seat } from '../models/Seat.js';
import { Student } from '../models/Student.js';
/**
 * 캔버스 모듈
 */
export declare class SeatCanvasModule {
    private canvas;
    private ctx;
    private seats;
    private students;
    private isCustomMode;
    private selectedSeat;
    private dragOffset;
    constructor(canvasId: string);
    /**
     * 이벤트 리스너 초기화
     */
    private initializeEventListeners;
    /**
     * 좌석 데이터 설정
     * @param seats 좌석 배열
     * @param students 학생 배열
     */
    setData(seats: Seat[], students: Student[]): void;
    /**
     * 자유 배치 모드 토글
     * @param enabled 활성화 여부
     */
    setCustomMode(enabled: boolean): void;
    /**
     * 자유 배치 모드 상태 가져오기
     */
    getCustomMode(): boolean;
    /**
     * 좌석 설정
     * @param seats 좌석 배열
     */
    setSeats(seats: Seat[]): void;
    /**
     * 렌더링
     */
    render(): void;
    /**
     * 좌석 그리기
     * @param seat 좌석 객체
     */
    private drawSeat;
    /**
     * 연결선 그리기 (짝꿍 좌석)
     * @param pos1 첫 번째 좌석 위치
     * @param pos2 두 번째 좌석 위치
     */
    private drawConnection;
    /**
     * 마우스 다운 이벤트 처리
     * @param e 마우스 이벤트
     */
    private handleMouseDown;
    /**
     * 마우스 이동 이벤트 처리
     * @param e 마우스 이벤트
     */
    private handleMouseMove;
    /**
     * 마우스 업 이벤트 처리
     */
    private handleMouseUp;
    /**
     * 더블 클릭 이벤트 처리
     * @param e 마우스 이벤트
     */
    private handleDoubleClick;
    /**
     * 마우스 위치를 캔버스 좌표로 변환
     * @param e 마우스 이벤트
     * @returns 캔버스 상의 위치
     */
    private getMousePosition;
    /**
     * 특정 위치에 있는 좌석 찾기
     * @param position 위치
     * @returns 해당 위치의 좌석 또는 null
     */
    private findSeatAtPosition;
    /**
     * 특정 좌석에 학생을 고정 배치합니다.
     * @param seatId 좌석 ID
     * @param studentId 학생 ID
     */
    assignStudentToSeat(seatId: number, studentId: number): void;
    /**
     * 캔버스를 초기화합니다.
     */
    clear(): void;
    /**
     * 커스텀 이벤트 발생
     * @param eventName 이벤트 이름
     * @param data 이벤트 데이터
     */
    private dispatchCustomEvent;
    /**
     * 캔버스를 이미지로 내보냅니다.
     * @returns 이미지 데이터 URL
     */
    exportAsImage(): string;
}
//# sourceMappingURL=SeatCanvasModule.d.ts.map