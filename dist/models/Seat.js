/**
 * 배치 유형 열거형
 */
export var LayoutType;
(function (LayoutType) {
    /** 1열 균등 배치 */
    LayoutType["SINGLE_UNIFORM"] = "single-uniform";
    /** 2열 균등 배치 */
    LayoutType["PAIR_UNIFORM"] = "pair-uniform";
    /** 모둠 배치 */
    LayoutType["GROUP"] = "group";
    /** 4명 모둠 배치 */
    LayoutType["GROUP_4"] = "group-4";
    /** 6명 모둠 배치 */
    LayoutType["GROUP_6"] = "group-6";
    /** ㄷ자 배치 */
    LayoutType["USHAPE"] = "ushape";
    /** 사용자 임의 구성 */
    LayoutType["CUSTOM"] = "custom";
})(LayoutType || (LayoutType = {}));
/**
 * 좌석 타입 열거형
 */
export var SeatType;
(function (SeatType) {
    /** 1열 좌석 (개별 책상) */
    SeatType["SINGLE"] = "single";
    /** 2열 좌석 (짝꿍 책상) */
    SeatType["PAIR"] = "pair";
})(SeatType || (SeatType = {}));
/**
 * 좌석 생성 및 관리 클래스
 */
export class SeatModel {
    /**
     * 새로운 좌석 객체를 생성합니다.
     * @param position 좌석 위치
     * @param isFixed 고정 여부
     * @param isActive 활성화 여부
     * @returns 생성된 Seat 객체
     */
    static create(position, isFixed = false, isActive = true) {
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
    static assignStudent(seat, studentId, studentName) {
        seat.studentId = studentId;
        seat.studentName = studentName;
    }
    /**
     * 좌석에서 학생을 제거합니다.
     * @param seat 좌석 객체
     */
    static removeStudent(seat) {
        seat.studentId = undefined;
        seat.studentName = undefined;
    }
    /**
     * 좌석이 비어있는지 확인합니다.
     * @param seat 좌석 객체
     * @returns 좌석이 비어있으면 true
     */
    static isEmpty(seat) {
        return seat.studentId === undefined;
    }
    /**
     * 좌석이 활성화되어 있고 비어있는지 확인합니다.
     * @param seat 좌석 객체
     * @returns 활성화되어 있고 비어있으면 true
     */
    static isAvailable(seat) {
        return seat.isActive && !seat.isFixed && SeatModel.isEmpty(seat);
    }
    /**
     * 좌석 목록에서 비어있는 좌석만 필터링합니다.
     * @param seats 좌석 배열
     * @returns 비어있는 좌석 배열
     */
    static getEmptySeats(seats) {
        return seats.filter(seat => SeatModel.isEmpty(seat));
    }
    /**
     * 좌석 목록에서 배정된 좌석만 필터링합니다.
     * @param seats 좌석 배열
     * @returns 배정된 좌석 배열
     */
    static getAssignedSeats(seats) {
        return seats.filter(seat => !SeatModel.isEmpty(seat));
    }
    /**
     * 좌석 목록에서 고정되지 않고 비어있는 좌석만 필터링합니다.
     * @param seats 좌석 배열
     * @returns 고정되지 않고 비어있는 좌석 배열
     */
    static getAvailableSeats(seats) {
        return seats.filter(seat => SeatModel.isAvailable(seat));
    }
}
SeatModel.nextId = 1;
//# sourceMappingURL=Seat.js.map