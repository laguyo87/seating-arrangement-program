/**
 * 공유 데이터 타입 정의
 */
/**
 * 공유 데이터의 학생 정보 형식 (압축된 배열 형식 또는 객체 형식)
 */
export type SharedStudentData = [string, 'M' | 'F'] | {
    name: string;
    gender: 'M' | 'F';
};
/**
 * 공유 데이터 인터페이스
 */
export interface SharedLayoutData {
    t?: string;
    type?: string;
    s?: SharedStudentData[];
    students?: SharedStudentData[];
    l?: string;
    layout?: string;
}
/**
 * 스크롤 타겟 타입
 */
export type ScrollTarget = Window | HTMLElement | Document;
//# sourceMappingURL=shared.d.ts.map