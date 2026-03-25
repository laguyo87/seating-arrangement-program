/**
 * 히스토리 타입 정의
 */
/**
 * 타입 가드: 레이아웃 히스토리 데이터인지 확인
 */
export function isLayoutHistoryData(data) {
    return 'seatsAreaHTML' in data && 'students' in data && 'gridTemplateColumns' in data;
}
/**
 * 타입 가드: 학생 입력 히스토리 데이터인지 확인
 */
export function isStudentInputHistoryData(data) {
    return 'students' in data && !('seatsAreaHTML' in data);
}
/**
 * 타입 가드: 옵션 설정 히스토리 데이터인지 확인
 */
export function isOptionsHistoryData(data) {
    return 'options' in data && !('seatsAreaHTML' in data) && !('students' in data);
}
//# sourceMappingURL=history.js.map