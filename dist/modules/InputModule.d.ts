/**
 * 학생 입력 UI 모듈
 * 1단계: 학생 인원수 및 명렬표 입력 기능 담당
 */
/**
 * 학생 입력 데이터
 */
export interface StudentInputData {
    name: string;
    gender: 'M' | 'F';
}
/**
 * 학생 입력 모듈
 */
export declare class InputModule {
    private studentInputs;
    constructor(containerId: string);
    /**
     * 이벤트 리스너 초기화
     */
    private initializeEventListeners;
    /**
     * 학생 행을 추가합니다.
     */
    addStudentRow(): void;
    /**
     * 컨테이너에 학생 행 추가 (내부 메서드)
     */
    private addStudentRowToContainer;
    /**
     * 학생 행을 제거합니다.
     * @param rowIndex 제거할 행 인덱스
     */
    private removeStudentRow;
    /**
     * 학생 행의 인덱스를 재정렬합니다.
     */
    private reindexRows;
    /**
     * 입력된 학생 데이터를 가져옵니다.
     * @returns 학생 입력 데이터 배열
     */
    getStudentData(): StudentInputData[];
    /**
     * 학생 인원수를 가져옵니다.
     * @returns 학생 인원수
     */
    getStudentCount(): number;
    /**
     * 입력 데이터를 검증합니다.
     * @returns 검증 성공 여부 및 에러 메시지
     */
    validateInput(): {
        isValid: boolean;
        errorMessage?: string;
    };
    /**
     * 입력을 초기화합니다.
     */
    reset(): void;
}
//# sourceMappingURL=InputModule.d.ts.map