/**
 * CSV 파일 핸들러
 * CSV/엑셀 파일 업로드, 다운로드, 파싱 및 학생 테이블 생성 담당
 */
import { OutputModule } from '../modules/OutputModule.js';
/**
 * CSVFileHandler가 필요로 하는 의존성 인터페이스
 */
export interface CSVFileHandlerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    handleCreateStudentTable: (count: number) => void;
    handleLoadClassNames: () => void;
    handleDeleteStudentRow: (row: HTMLTableRowElement) => void;
    updateStudentTableStats: () => void;
    getFixedSeatIds: () => Set<number>;
    getStudents: () => Array<{
        name: string;
        gender: 'M' | 'F';
        fixedSeatId?: number;
    }>;
    setStudents: (students: Array<{
        name: string;
        gender: 'M' | 'F';
        fixedSeatId?: number;
    }>) => void;
    syncSidebarToTable: (maleCount: number, femaleCount: number) => void;
    moveToCell: (tbody: HTMLTableSectionElement, currentRow: number, columnName: 'name' | 'gender', direction: 'up' | 'down') => void;
}
/**
 * CSV 파일 핸들러 클래스
 */
export declare class CSVFileHandler {
    private deps;
    constructor(dependencies: CSVFileHandlerDependencies);
    /**
     * 템플릿 파일 다운로드
     */
    downloadTemplateFile(): void;
    /**
     * 파일 형식 자동 감지
     */
    private detectFileType;
    /**
     * 파일 업로드 처리
     */
    handleFileUpload(event: Event): void;
    /**
     * CSV 파일 읽기
     */
    private readCsvFile;
    /**
     * 엑셀 파일 읽기
     */
    private readExcelFile;
    /**
     * 엑셀 데이터 파싱
     */
    private parseExcelData;
    /**
     * 미리보기 및 확인 다이얼로그 표시
     */
    private showPreviewAndConfirm;
    /**
     * 학생 데이터 적용
     */
    private applyStudentData;
    /**
     * 대용량 데이터를 위한 비동기 테이블 생성
     */
    private createTableWithStudentsAsync;
    /**
     * 테이블에 학생 데이터 추가 (대용량 파일용)
     */
    private appendStudentsToTable;
    /**
     * 학생 테이블 행 생성
     */
    private createStudentTableRow;
    /**
     * CSV 파일 파싱 및 학생 배열 반환
     */
    private parseCsvFile;
    /**
     * CSV 라인 파싱 (따옴표 처리)
     */
    private parseCsvLine;
    /**
     * 학생 데이터로 테이블 생성
     */
    private createTableWithStudents;
    /**
     * 저장된 학생 데이터를 테이블에 로드
     */
    loadStudentDataToTable(studentData: Array<{
        name: string;
        gender: 'M' | 'F';
        fixedSeatId?: number;
    }>, retryCount?: number): void;
    /**
     * 학생 수 입력 필드 업데이트
     */
    private updateStudentCounts;
}
//# sourceMappingURL=CSVFileHandler.d.ts.map