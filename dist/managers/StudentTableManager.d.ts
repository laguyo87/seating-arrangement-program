/**
 * 학생 테이블 관리자
 * 학생 테이블 생성, 관리 및 관련 작업 담당
 */
import { OutputModule } from '../modules/OutputModule.js';
import { StorageManager } from './StorageManager.js';
import { CSVFileHandler } from './CSVFileHandler.js';
import { UIManager } from './UIManager.js';
import { Student } from '../models/Student.js';
/**
 * StudentTableManager가 필요로 하는 의존성 인터페이스
 */
export interface StudentTableManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    storageManager: StorageManager;
    csvFileHandler: CSVFileHandler;
    uiManager: UIManager;
    getFixedSeatIds: () => Set<number>;
    getStudents: () => Student[];
    setStudents: (students: Student[]) => void;
    handleDeleteStudentRow: (row: HTMLTableRowElement) => void;
    moveToCell: (tbody: HTMLTableSectionElement, currentRow: number, columnName: 'name' | 'gender', direction: 'up' | 'down') => void;
    updateRowNumbers: () => void;
    syncSidebarToTable: (maleCount: number, femaleCount: number) => void;
    updatePreviewForGenderCounts: () => void;
}
/**
 * 학생 테이블 관리자 클래스
 */
export declare class StudentTableManager {
    private deps;
    constructor(dependencies: StudentTableManagerDependencies);
    /**
     * 학생 테이블 생성
     */
    createStudentTable(count?: number): void;
    /**
     * 우리 반 이름 불러오기 처리
     * localStorage에 저장된 학생 데이터를 테이블에 로드
     */
    loadClassNames(): void;
    /**
     * 고정 좌석 드롭다운 업데이트
     */
    updateFixedSeatDropdowns(): void;
    /**
     * 학생 행 추가 처리 (마지막 행 뒤에 추가)
     */
    addStudentRow(): void;
}
//# sourceMappingURL=StudentTableManager.d.ts.map