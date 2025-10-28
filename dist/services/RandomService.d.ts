/**
 * 랜덤 배치 및 셔플 서비스
 */
import { Student } from '../models/Student.js';
import { Seat } from '../models/Seat.js';
/**
 * 랜덤 배치 관련 서비스
 */
export declare class RandomService {
    /**
     * 배열을 셔플합니다 (Fisher-Yates 알고리즘).
     * @param array 원본 배열
     * @returns 셔플된 배열 (새 배열, 원본은 변경되지 않음)
     */
    static shuffle<T>(array: T[]): T[];
    /**
     * 학생 배열을 랜덤하게 섞어서 반환합니다.
     * @param students 원본 학생 배열
     * @returns 셔플된 학생 배열
     */
    static shuffleStudents(students: Student[]): Student[];
    /**
     * 좌석 배열을 랜덤하게 섞어서 반환합니다.
     * @param seats 원본 좌석 배열
     * @returns 셔플된 좌석 배열
     */
    static shuffleSeats(seats: Seat[]): Seat[];
    /**
     * 나머지 좌석에 학생들을 랜덤하게 배치합니다.
     * @param students 배치할 학생 배열
     * @param seats 좌석 배열
     * @returns 배치된 좌석 배열
     */
    static assignRandomly(students: Student[], seats: Seat[]): Seat[];
    /**
     * 남녀 짝꿍 배치를 수행합니다.
     * 남녀를 랜덤하게 짝을 맞춘 후 좌석에 배치합니다.
     * @param students 학생 배열
     * @param seats 좌석 배열
     * @param seatType 좌석 타입 (1열 또는 2열)
     * @returns 배치된 좌석 배열
     */
    static assignGenderPairs(students: Student[], seats: Seat[], seatType: 'single' | 'pair'): Seat[];
    /**
     * 고정 좌석이 있는 학생들을 먼저 배치하고,
     * 나머지 학생들을 랜덤하게 배치합니다.
     * @param students 학생 배열
     * @param seats 좌석 배열
     * @returns 배치된 좌석 배열
     */
    static assignWithFixedSeats(students: Student[], seats: Seat[]): Seat[];
    /**
     * 좌석에 학생을 무작위로 재배치합니다.
     * @param seats 좌석 배열 (수정됨)
     */
    static reshuffleAssignments(seats: Seat[]): void;
}
//# sourceMappingURL=RandomService.d.ts.map