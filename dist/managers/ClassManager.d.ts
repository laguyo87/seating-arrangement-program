/**
 * 반 관리자
 * 반별 자리 배치도 저장/불러오기 기능 담당
 */
import { StorageManager } from './StorageManager.js';
import { OutputModule } from '../modules/OutputModule.js';
import { Seat } from '../models/Seat.js';
import { Student } from '../models/Student.js';
/**
 * 반별 자리 배치도 데이터 타입
 */
export interface ClassLayoutData {
    seats: Seat[];
    students: Student[];
    timestamp: string;
    className: string;
}
/**
 * 반 정보 타입
 */
export interface ClassInfo {
    id: string;
    name: string;
    createdAt: string;
    lastModified: string;
}
/**
 * ClassManager가 필요로 하는 의존성 인터페이스
 */
export interface ClassManagerDependencies {
    storageManager: StorageManager;
    outputModule: OutputModule;
    getCurrentSeats: () => Seat[];
    getCurrentStudents: () => Student[];
    setSeats: (seats: Seat[]) => void;
    setStudents: (students: Student[]) => void;
    renderLayout: () => void;
    firebaseStorageManager?: import('./FirebaseStorageManager.js').FirebaseStorageManager;
}
/**
 * 반 관리자 클래스
 */
export declare class ClassManager {
    private deps;
    private currentClassId;
    private readonly STORAGE_KEY_CLASSES;
    private readonly STORAGE_KEY_PREFIX;
    constructor(dependencies: ClassManagerDependencies);
    /**
     * 반 목록 가져오기
     */
    getClassList(): ClassInfo[];
    /**
     * 반 목록 저장하기
     */
    private saveClassList;
    /**
     * 새 반 추가
     */
    addClass(className: string): Promise<string | null>;
    /**
     * 반 삭제
     */
    deleteClass(classId: string): Promise<boolean>;
    /**
     * 현재 선택된 반 ID 가져오기
     */
    getCurrentClassId(): string | null;
    /**
     * 반 선택
     */
    selectClass(classId: string | null): void;
    /**
     * 현재 반의 자리 배치도 저장
     */
    saveCurrentLayout(): Promise<boolean>;
    /**
     * 선택된 반의 자리 배치도 불러오기
     */
    loadLayout(classId: string): Promise<boolean>;
    /**
     * 마지막 수정 시간 업데이트
     */
    private updateLastModified;
    /**
     * 반 이름 가져오기
     */
    getClassName(classId: string): string | null;
    /**
     * Firebase에서 반 목록을 불러와서 localStorage에 저장
     */
    syncClassListFromFirebase(): Promise<boolean>;
}
//# sourceMappingURL=ClassManager.d.ts.map