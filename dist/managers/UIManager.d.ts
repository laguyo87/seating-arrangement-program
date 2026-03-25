/**
 * UI 관리자
 * UI 업데이트 관련 작업 담당 (미리보기, 통계, 히스토리 드롭다운 등)
 */
import { OutputModule } from '../modules/OutputModule.js';
import { Student } from '../models/Student.js';
import { Seat } from '../models/Seat.js';
import { StorageManager } from './StorageManager.js';
/**
 * 좌석 이력 항목 타입
 */
export interface SeatHistoryItem {
    id: string;
    date: string;
    layout: Array<{
        seatId: number;
        studentName: string;
        gender: 'M' | 'F';
    }>;
    pairInfo?: Array<{
        student1: string;
        student2: string;
    }>;
    timestamp: number;
    layoutType?: string;
    singleMode?: string;
    pairMode?: string;
    partitionCount?: number;
    groupSize?: string;
    classId?: string;
}
/**
 * UIManager가 필요로 하는 의존성 인터페이스
 */
export interface UIManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    storageManager: StorageManager;
    getStudents: () => Student[];
    setStudents: (students: Student[]) => void;
    getSeats: () => Seat[];
    setSeats: (seats: Seat[]) => void;
    validateAndFixStudentInput: (input: HTMLInputElement, inputType: 'male' | 'female') => void;
    renderExampleCards: () => void;
    getSeatHistory: () => SeatHistoryItem[];
    deleteHistoryItem: (historyId: string) => void;
    loadHistoryItem: (historyId: string) => void;
}
/**
 * UI 관리자 클래스
 */
export declare class UIManager {
    private deps;
    constructor(dependencies: UIManagerDependencies);
    /**
     * 성별별 학생 수에 따라 미리보기 업데이트
     */
    updatePreviewForGenderCounts(): void;
    /**
     * 학생 테이블 통계 업데이트
     */
    updateStudentTableStats(): void;
    /**
     * 히스토리 드롭다운 초기화
     */
    initializeHistoryDropdown(): void;
    /**
     * 히스토리 드롭다운 업데이트
     */
    updateHistoryDropdown(): void;
}
//# sourceMappingURL=UIManager.d.ts.map