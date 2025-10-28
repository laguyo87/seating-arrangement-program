/**
 * 좌석 위치 정보를 나타내는 인터페이스
 */
export interface Position {
    /** X 좌표 */
    x: number;
    /** Y 좌표 */
    y: number;
}

/**
 * 좌석 데이터 모델
 * @interface Seat 좌석 정보를 담는 인터페이스
 */
export interface Seat {
    /** 좌석 고유 ID */
    id: number;
    /** 좌석 위치 (2D 좌표) */
    position: Position;
    /** 이 좌석에 배정된 학생 ID (없으면 undefined) */
    studentId?: number;
    /** 해당 좌석에 학생 이름 (없으면 빈 문자열) */
    studentName?: string;
    /** 짝꿍 좌석 ID (없으면 undefined, 2열 배치시 사용) */
    pairSeatId?: number;
    /** 좌석이 고정되었는지 여부 */
    isFixed: boolean;
    /** 좌석이 활성화되어 있는지 여부 */
    isActive: boolean;
}

/**
 * 배치 유형 열거형
 */
export enum LayoutType {
    /** 1열 균등 배치 */
    SINGLE_UNIFORM = 'single-uniform',
    /** 2열 균등 배치 */
    PAIR_UNIFORM = 'pair-uniform',
    /** 모둠 배치 */
    GROUP = 'group',
    /** 4명 모둠 배치 */
    GROUP_4 = 'group-4',
    /** 6명 모둠 배치 */
    GROUP_6 = 'group-6',
    /** ㄷ자 배치 */
    USHAPE = 'ushape',
    /** 사용자 임의 구성 */
    CUSTOM = 'custom'
}

/**
 * 좌석 타입 열거형
 */
export enum SeatType {
    /** 1열 좌석 (개별 책상) */
    SINGLE = 'single',
    /** 2열 좌석 (짝꿍 책상) */
    PAIR = 'pair'
}

/**
 * 좌석 생성 및 관리 클래스
 */
export class SeatModel {
    private static nextId: number = 1;

    /**
     * 새로운 좌석 객체를 생성합니다.
     * @param position 좌석 위치
     * @param isFixed 고정 여부
     * @param isActive 활성화 여부
     * @returns 생성된 Seat 객체
     */
    public static create(position: Position, isFixed: boolean = false, isActive: boolean = true): Seat {
        return {
            id: SeatModel.nextId++,
            position,
            isFixed,
            isActive
        };
    }

    /**
     * 좌석에 학생을 배정합니다.
     * @param seat 좌석 객체
     * @param studentId 학생 ID
     * @param studentName 학생 이름
     */
    public static assignStudent(seat: Seat, studentId: number, studentName: string): void {
        seat.studentId = studentId;
        seat.studentName = studentName;
    }

    /**
     * 좌석에서 학생을 제거합니다.
     * @param seat 좌석 객체
     */
    public static removeStudent(seat: Seat): void {
        seat.studentId = undefined;
        seat.studentName = undefined;
    }

    /**
     * 좌석이 비어있는지 확인합니다.
     * @param seat 좌석 객체
     * @returns 좌석이 비어있으면 true
     */
    public static isEmpty(seat: Seat): boolean {
        return seat.studentId === undefined;
    }

    /**
     * 좌석이 활성화되어 있고 비어있는지 확인합니다.
     * @param seat 좌석 객체
     * @returns 활성화되어 있고 비어있으면 true
     */
    public static isAvailable(seat: Seat): boolean {
        return seat.isActive && !seat.isFixed && SeatModel.isEmpty(seat);
    }

    /**
     * 좌석 목록에서 비어있는 좌석만 필터링합니다.
     * @param seats 좌석 배열
     * @returns 비어있는 좌석 배열
     */
    public static getEmptySeats(seats: Seat[]): Seat[] {
        return seats.filter(seat => SeatModel.isEmpty(seat));
    }

    /**
     * 좌석 목록에서 배정된 좌석만 필터링합니다.
     * @param seats 좌석 배열
     * @returns 배정된 좌석 배열
     */
    public static getAssignedSeats(seats: Seat[]): Seat[] {
        return seats.filter(seat => !SeatModel.isEmpty(seat));
    }

    /**
     * 좌석 목록에서 고정되지 않고 비어있는 좌석만 필터링합니다.
     * @param seats 좌석 배열
     * @returns 고정되지 않고 비어있는 좌석 배열
     */
    public static getAvailableSeats(seats: Seat[]): Seat[] {
        return seats.filter(seat => SeatModel.isAvailable(seat));
    }
}

