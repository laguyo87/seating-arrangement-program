/**
 * 히스토리 타입 정의
 */
import { Student } from '../models/Student.js';
/**
 * 레이아웃 히스토리 데이터
 */
export interface LayoutHistoryData {
    seatsAreaHTML: string;
    students: Student[];
    gridTemplateColumns: string;
}
/**
 * 학생 입력 히스토리 데이터
 */
export interface StudentInputHistoryData {
    students: Student[];
}
/**
 * 옵션 설정 히스토리 데이터
 */
export interface OptionsHistoryData {
    options: Record<string, unknown>;
}
/**
 * 히스토리 타입별 데이터 유니온
 */
export type HistoryData = LayoutHistoryData | StudentInputHistoryData | OptionsHistoryData;
/**
 * 히스토리 상태 타입
 */
export type HistoryStateType = 'layout' | 'student-input' | 'options';
/**
 * 히스토리 상태 인터페이스
 */
export interface HistoryState<T extends HistoryData = HistoryData> {
    type: HistoryStateType;
    data: T;
}
/**
 * 타입 가드: 레이아웃 히스토리 데이터인지 확인
 */
export declare function isLayoutHistoryData(data: HistoryData): data is LayoutHistoryData;
/**
 * 타입 가드: 학생 입력 히스토리 데이터인지 확인
 */
export declare function isStudentInputHistoryData(data: HistoryData): data is StudentInputHistoryData;
/**
 * 타입 가드: 옵션 설정 히스토리 데이터인지 확인
 */
export declare function isOptionsHistoryData(data: HistoryData): data is OptionsHistoryData;
//# sourceMappingURL=history.d.ts.map