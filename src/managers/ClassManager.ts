/**
 * 반 관리자
 * 반별 자리 배치도 저장/불러오기 기능 담당
 */

import { StorageManager } from './StorageManager.js';
import { OutputModule } from '../modules/OutputModule.js';
import { logger } from '../utils/logger.js';
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
}

/**
 * 반 관리자 클래스
 */
export class ClassManager {
    private deps: ClassManagerDependencies;
    private currentClassId: string | null = null;
    private readonly STORAGE_KEY_CLASSES = 'classList';
    private readonly STORAGE_KEY_PREFIX = 'classLayout_';

    constructor(dependencies: ClassManagerDependencies) {
        this.deps = dependencies;
    }

    /**
     * 반 목록 가져오기
     */
    public getClassList(): ClassInfo[] {
        try {
            const classListStr = this.deps.storageManager.safeGetItem(this.STORAGE_KEY_CLASSES);
            if (!classListStr) {
                return [];
            }

            const classList = JSON.parse(classListStr) as ClassInfo[];
            return Array.isArray(classList) ? classList : [];
        } catch (error) {
            logger.error('반 목록 불러오기 중 오류:', error);
            return [];
        }
    }

    /**
     * 반 목록 저장하기
     */
    private saveClassList(classList: ClassInfo[]): boolean {
        try {
            const success = this.deps.storageManager.safeSetItem(
                this.STORAGE_KEY_CLASSES,
                JSON.stringify(classList)
            );
            return success;
        } catch (error) {
            logger.error('반 목록 저장 중 오류:', error);
            this.deps.outputModule.showError('반 목록 저장 중 오류가 발생했습니다.');
            return false;
        }
    }

    /**
     * 새 반 추가
     */
    public addClass(className: string): string | null {
        if (!className || className.trim() === '') {
            this.deps.outputModule.showError('반 이름을 입력해주세요.');
            return null;
        }

        const classList = this.getClassList();
        
        // 중복 확인
        const existingClass = classList.find(c => c.name === className.trim());
        if (existingClass) {
            this.deps.outputModule.showError('이미 존재하는 반 이름입니다.');
            return null;
        }

        const newClass: ClassInfo = {
            id: `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: className.trim(),
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        classList.push(newClass);
        
        if (this.saveClassList(classList)) {
            this.deps.outputModule.showInfo(`"${className}" 반이 추가되었습니다.`);
            return newClass.id;
        }

        return null;
    }

    /**
     * 반 삭제
     */
    public deleteClass(classId: string): boolean {
        const classList = this.getClassList();
        const classIndex = classList.findIndex(c => c.id === classId);
        
        if (classIndex === -1) {
            this.deps.outputModule.showError('삭제할 반을 찾을 수 없습니다.');
            return false;
        }

        const className = classList[classIndex].name;
        
        // 반 데이터 삭제
        try {
            localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${classId}`);
        } catch (error) {
            logger.error('반 데이터 삭제 중 오류:', error);
        }

        // 목록에서 제거
        classList.splice(classIndex, 1);
        
        if (this.saveClassList(classList)) {
            // 현재 선택된 반이 삭제된 경우 선택 해제
            if (this.currentClassId === classId) {
                this.currentClassId = null;
            }
            this.deps.outputModule.showInfo(`"${className}" 반이 삭제되었습니다.`);
            return true;
        }

        return false;
    }

    /**
     * 현재 선택된 반 ID 가져오기
     */
    public getCurrentClassId(): string | null {
        return this.currentClassId;
    }

    /**
     * 반 선택
     */
    public selectClass(classId: string | null): void {
        this.currentClassId = classId;
    }

    /**
     * 현재 반의 자리 배치도 저장
     */
    public saveCurrentLayout(): boolean {
        if (!this.currentClassId) {
            this.deps.outputModule.showError('반을 선택해주세요.');
            return false;
        }

        try {
            const seats = this.deps.getCurrentSeats();
            const students = this.deps.getCurrentStudents();

            if (!seats || seats.length === 0 || !students || students.length === 0) {
                this.deps.outputModule.showError('저장할 자리 배치도가 없습니다.');
                return false;
            }

            const layoutData: ClassLayoutData = {
                seats: seats,
                students: students,
                timestamp: new Date().toISOString(),
                className: this.getClassList().find(c => c.id === this.currentClassId)?.name || ''
            };

            const storageKey = `${this.STORAGE_KEY_PREFIX}${this.currentClassId}`;
            const success = this.deps.storageManager.safeSetItem(
                storageKey,
                JSON.stringify(layoutData)
            );

            if (success) {
                // 마지막 수정 시간 업데이트
                this.updateLastModified(this.currentClassId!);
                this.deps.outputModule.showInfo('자리 배치도가 저장되었습니다.');
                return true;
            }

            return false;
        } catch (error) {
            logger.error('자리 배치도 저장 중 오류:', error);
            this.deps.outputModule.showError('자리 배치도 저장 중 오류가 발생했습니다.');
            return false;
        }
    }

    /**
     * 선택된 반의 자리 배치도 불러오기
     */
    public loadLayout(classId: string): boolean {
        if (!classId) {
            return false;
        }

        try {
            const storageKey = `${this.STORAGE_KEY_PREFIX}${classId}`;
            const layoutDataStr = this.deps.storageManager.safeGetItem(storageKey);
            
            if (!layoutDataStr) {
                this.deps.outputModule.showInfo('저장된 자리 배치도가 없습니다.');
                return false;
            }

            // JSON 파싱 시도 (데이터 손상 처리)
            let layoutData: ClassLayoutData;
            try {
                layoutData = JSON.parse(layoutDataStr) as ClassLayoutData;
            } catch (parseError) {
                this.deps.outputModule.showError('저장된 데이터가 손상되어 불러올 수 없습니다.');
                logger.error('자리 배치도 파싱 오류:', parseError);
                return false;
            }

            // 데이터 구조 검증
            if (!layoutData || typeof layoutData !== 'object') {
                this.deps.outputModule.showError('저장된 데이터 형식이 올바르지 않습니다.');
                return false;
            }

            if (layoutData.seats && Array.isArray(layoutData.seats) && 
                layoutData.students && Array.isArray(layoutData.students)) {
                this.deps.setSeats(layoutData.seats);
                this.deps.setStudents(layoutData.students);
                
                // 레이아웃 렌더링
                this.deps.renderLayout();
                
                this.deps.outputModule.showInfo('자리 배치도를 불러왔습니다.');
                return true;
            } else {
                this.deps.outputModule.showError('저장된 데이터 형식이 올바르지 않습니다.');
                return false;
            }
        } catch (error) {
            logger.error('자리 배치도 불러오기 중 오류:', error);
            this.deps.outputModule.showError('자리 배치도 불러오기 중 오류가 발생했습니다.');
            return false;
        }
    }

    /**
     * 마지막 수정 시간 업데이트
     */
    private updateLastModified(classId: string): void {
        const classList = this.getClassList();
        const classInfo = classList.find(c => c.id === classId);
        
        if (classInfo) {
            classInfo.lastModified = new Date().toISOString();
            this.saveClassList(classList);
        }
    }

    /**
     * 반 이름 가져오기
     */
    public getClassName(classId: string): string | null {
        const classList = this.getClassList();
        const classInfo = classList.find(c => c.id === classId);
        return classInfo ? classInfo.name : null;
    }
}

