/**
 * 입력 데이터 검증 및 관리 서비스
 */
import { Student } from '../models/Student.js';
/**
 * 입력 검증 결과
 */
export interface ValidationResult {
    /** 검증 성공 여부 */
    isValid: boolean;
    /** 에러 메시지 */
    errorMessage?: string;
}
/**
 * 입력 데이터 관리 및 검증을 담당하는 서비스
 */
export declare class InputService {
    /**
     * 학생 이름이 유효한지 검증합니다.
     * @param name 학생 이름
     * @returns 검증 결과
     */
    static validateName(name: string): ValidationResult;
    /**
     * 학생 인원수가 유효한지 검증합니다.
     * @param count 학생 인원수
     * @returns 검증 결과
     */
    static validateStudentCount(count: number): ValidationResult;
    /**
     * 학생 목록이 유효한지 검증합니다.
     * @param students 학생 배열
     * @param expectedCount 예상 학생 수
     * @returns 검증 결과
     */
    static validateStudentList(students: Student[], expectedCount: number): ValidationResult;
    /**
     * 성비를 계산합니다.
     * @param students 학생 배열
     * @returns 성별 분포 객체
     */
    static calculateGenderRatio(students: Student[]): {
        male: number;
        female: number;
        total: number;
    };
    /**
     * 성비가 균형잡혔는지 확인합니다.
     * @param students 학생 배열
     * @param maxDifference 허용되는 최대 차이 (기본값: 3)
     * @returns 균형잡혔는지 여부
     */
    static isGenderRatioBalanced(students: Student[], maxDifference?: number): boolean;
    /**
     * 사용자 입력으로부터 Student 객체를 생성합니다.
     * @param name 학생 이름
     * @param gender 학생 성별
     * @returns 생성된 Student 객체 또는 에러 메시지
     */
    static createStudentFromInput(name: string, gender: string): Student | string;
    /**
     * 2열 배치시 남녀 짝꿍 배치가 가능한지 확인합니다.
     * @param students 학생 배열
     * @returns 가능 여부 및 메시지
     */
    static canCreateGenderPairs(students: Student[]): {
        canPair: boolean;
        message: string;
    };
}
//# sourceMappingURL=InputService.d.ts.map