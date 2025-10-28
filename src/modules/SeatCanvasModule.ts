/**
 * 좌석 캔버스 모듈
 * 좌석 배열 시각화 및 상호작용 기능 담당
 */
import { Seat, Position } from '../models/Seat.js';
import { Student } from '../models/Student.js';

/**
 * 캔버스 모듈
 */
export class SeatCanvasModule {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private seats: Seat[] = [];
    private students: Student[] = [];
    private isCustomMode: boolean = false;
    private selectedSeat: Seat | null = null;
    private dragOffset: Position | null = null;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas with id '${canvasId}' not found`);
        }
        
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        
        this.ctx = ctx;
        this.initializeEventListeners();
    }

    /**
     * 이벤트 리스너 초기화
     */
    private initializeEventListeners(): void {
        // 마우스 이벤트
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        
        // 더블 클릭: 좌석 고정/해제
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    }

    /**
     * 좌석 데이터 설정
     * @param seats 좌석 배열
     * @param students 학생 배열
     */
    public setData(seats: Seat[], students: Student[]): void {
        this.seats = seats;
        this.students = students;
        this.render();
    }

    /**
     * 자유 배치 모드 토글
     * @param enabled 활성화 여부
     */
    public setCustomMode(enabled: boolean): void {
        this.isCustomMode = enabled;
        
        if (enabled) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'default';
            this.selectedSeat = null;
        }
    }

    /**
     * 자유 배치 모드 상태 가져오기
     */
    public getCustomMode(): boolean {
        return this.isCustomMode;
    }

    /**
     * 좌석 설정
     * @param seats 좌석 배열
     */
    public setSeats(seats: Seat[]): void {
        this.seats = seats;
    }

    /**
     * 렌더링
     */
    public render(): void {
        // 캔버스 클리어
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 좌석 그리기
        for (const seat of this.seats) {
            if (!seat.isActive) continue;
            
            this.drawSeat(seat);
        }
        
        // 연결선 그리기 (짝꿍 좌석)
        for (const seat of this.seats) {
            if (seat.pairSeatId && seat.isActive) {
                const pairSeat = this.seats.find(s => s.id === seat.pairSeatId);
                if (pairSeat && pairSeat.isActive) {
                    this.drawConnection(seat.position, pairSeat.position);
                }
            }
        }
    }

    /**
     * 좌석 그리기
     * @param seat 좌석 객체
     */
    private drawSeat(seat: Seat): void {
        const { x, y } = seat.position;
        
        // 기본 크기
        const width = 50;
        const height = 50;
        
        // 색상 설정
        let fillColor = '#e0e0e0';
        let borderColor = '#999';
        
        if (seat.studentId) {
            fillColor = '#4CAF50'; // 배정된 좌석: 초록
            borderColor = '#388E3C';
        }
        
        if (seat.isFixed) {
            borderColor = '#F44336'; // 고정 좌석: 빨강 테두리
            this.ctx.lineWidth = 3;
        } else {
            this.ctx.lineWidth = 1;
        }
        
        if (this.selectedSeat === seat) {
            fillColor = '#FFA726'; // 선택된 좌석: 주황
            borderColor = '#F57C00';
        }
        
        // 좌석 그리기
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, width, height);
        
        this.ctx.strokeStyle = borderColor;
        this.ctx.strokeRect(x, y, width, height);
        
        // 학생 이름 표시
        if (seat.studentName) {
            this.ctx.fillStyle = '#333';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(seat.studentName, x + width / 2, y + height / 2 + 5);
        }
        
        // 좌석 ID 표시 (디버깅용)
        this.ctx.fillStyle = '#666';
        this.ctx.font = '8px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`#${seat.id}`, x + 2, y + 10);
    }

    /**
     * 연결선 그리기 (짝꿍 좌석)
     * @param pos1 첫 번째 좌석 위치
     * @param pos2 두 번째 좌석 위치
     */
    private drawConnection(pos1: Position, pos2: Position): void {
        this.ctx.strokeStyle = '#bbb';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(pos1.x + 25, pos1.y + 25);
        this.ctx.lineTo(pos2.x + 25, pos2.y + 25);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    /**
     * 마우스 다운 이벤트 처리
     * @param e 마우스 이벤트
     */
    private handleMouseDown(e: MouseEvent): void {
        if (!this.isCustomMode) return;
        
        const mousePos = this.getMousePosition(e);
        const seat = this.findSeatAtPosition(mousePos);
        
        if (seat) {
            this.selectedSeat = seat;
            this.dragOffset = {
                x: mousePos.x - seat.position.x,
                y: mousePos.y - seat.position.y
            };
        }
    }

    /**
     * 마우스 이동 이벤트 처리
     * @param e 마우스 이벤트
     */
    private handleMouseMove(e: MouseEvent): void {
        if (!this.isCustomMode || !this.selectedSeat || !this.dragOffset) {
            return;
        }
        
        const mousePos = this.getMousePosition(e);
        
        // 좌석 이동
        this.selectedSeat.position = {
            x: mousePos.x - this.dragOffset.x,
            y: mousePos.y - this.dragOffset.y
        };
        
        this.render();
    }

    /**
     * 마우스 업 이벤트 처리
     */
    private handleMouseUp(): void {
        this.selectedSeat = null;
        this.dragOffset = null;
    }

    /**
     * 더블 클릭 이벤트 처리
     * @param e 마우스 이벤트
     */
    private handleDoubleClick(e: MouseEvent): void {
        const mousePos = this.getMousePosition(e);
        const seat = this.findSeatAtPosition(mousePos);
        
        if (seat) {
            // 좌석 고정/해제 토글
            seat.isFixed = !seat.isFixed;
            this.render();
            
            // 이벤트 발생: 좌석 고정 변경
            this.dispatchCustomEvent('seatFixedChanged', { seatId: seat.id, isFixed: seat.isFixed });
        }
    }

    /**
     * 마우스 위치를 캔버스 좌표로 변환
     * @param e 마우스 이벤트
     * @returns 캔버스 상의 위치
     */
    private getMousePosition(e: MouseEvent): Position {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * 특정 위치에 있는 좌석 찾기
     * @param position 위치
     * @returns 해당 위치의 좌석 또는 null
     */
    private findSeatAtPosition(position: Position): Seat | undefined {
        return this.seats.find(seat => {
            const { x, y } = seat.position;
            const width = 50;
            const height = 50;
            
            return position.x >= x &&
                   position.x <= x + width &&
                   position.y >= y &&
                   position.y <= y + height;
        });
    }

    /**
     * 특정 좌석에 학생을 고정 배치합니다.
     * @param seatId 좌석 ID
     * @param studentId 학생 ID
     */
    public assignStudentToSeat(seatId: number, studentId: number): void {
        const seat = this.seats.find(s => s.id === seatId);
        const student = this.students.find(s => s.id === studentId);
        
        if (seat && student) {
            const { SeatModel } = require('../models/Seat');
            SeatModel.assignStudent(seat, student.id, student.name);
            student.fixedSeatId = seatId;
            seat.isFixed = true;
            this.render();
        }
    }

    /**
     * 캔버스를 초기화합니다.
     */
    public clear(): void {
        this.seats = [];
        this.students = [];
        this.render();
    }

    /**
     * 커스텀 이벤트 발생
     * @param eventName 이벤트 이름
     * @param data 이벤트 데이터
     */
    private dispatchCustomEvent(eventName: string, data?: any): void {
        const event = new CustomEvent(eventName, { detail: data });
        this.canvas.dispatchEvent(event);
    }

    /**
     * 캔버스를 이미지로 내보냅니다.
     * @returns 이미지 데이터 URL
     */
    public exportAsImage(): string {
        return this.canvas.toDataURL('image/png');
    }
}

