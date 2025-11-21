/**
 * 공유 데이터 타입 정의
 */

import { Student } from '../models/Student.js';

/**
 * 공유 데이터의 학생 정보 형식 (압축된 배열 형식 또는 객체 형식)
 */
export type SharedStudentData = 
    | [string, 'M' | 'F']  // 압축된 형식: [이름, 성별]
    | { name: string; gender: 'M' | 'F' };  // 객체 형식

/**
 * 공유 데이터 인터페이스
 */
export interface SharedLayoutData {
    t?: string;  // type (압축)
    type?: string;  // type (전체)
    s?: SharedStudentData[];  // students (압축)
    students?: SharedStudentData[];  // students (전체)
    l?: string;  // layout (압축)
    layout?: string;  // layout (전체)
}

/**
 * 스크롤 타겟 타입
 */
export type ScrollTarget = Window | HTMLElement | Document;

