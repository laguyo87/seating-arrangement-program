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
export function isLayoutHistoryData(data: HistoryData): data is LayoutHistoryData {
    return 'seatsAreaHTML' in data && 'students' in data && 'gridTemplateColumns' in data;
}

/**
 * 타입 가드: 학생 입력 히스토리 데이터인지 확인
 */
export function isStudentInputHistoryData(data: HistoryData): data is StudentInputHistoryData {
    return 'students' in data && !('seatsAreaHTML' in data);
}

/**
 * 타입 가드: 옵션 설정 히스토리 데이터인지 확인
 */
export function isOptionsHistoryData(data: HistoryData): data is OptionsHistoryData {
    return 'options' in data && !('seatsAreaHTML' in data) && !('students' in data);
}

