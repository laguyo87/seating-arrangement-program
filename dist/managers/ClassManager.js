/**
 * 반 관리자
 * 반별 자리 배치도 저장/불러오기 기능 담당
 */
import { logger } from '../utils/logger.js';
/**
 * 반 관리자 클래스
 */
export class ClassManager {
    constructor(dependencies) {
        this.currentClassId = null;
        this.STORAGE_KEY_CLASSES = 'classList';
        this.STORAGE_KEY_PREFIX = 'classLayout_';
        this.deps = dependencies;
    }
    /**
     * 반 목록 가져오기
     */
    getClassList() {
        try {
            const classListStr = this.deps.storageManager.safeGetItem(this.STORAGE_KEY_CLASSES);
            if (!classListStr) {
                return [];
            }
            const classList = JSON.parse(classListStr);
            return Array.isArray(classList) ? classList : [];
        }
        catch (error) {
            logger.error('반 목록 불러오기 중 오류:', error);
            return [];
        }
    }
    /**
     * 반 목록 저장하기
     */
    async saveClassList(classList) {
        try {
            // localStorage에 저장
            const localSuccess = this.deps.storageManager.safeSetItem(this.STORAGE_KEY_CLASSES, JSON.stringify(classList));
            // Firebase에 저장 (로그인된 경우)
            if (this.deps.firebaseStorageManager?.getIsAuthenticated()) {
                const firebaseSuccess = await this.deps.firebaseStorageManager.saveClassList(classList);
                if (firebaseSuccess) {
                    logger.info('Firebase에 반 목록 저장 완료');
                }
            }
            return localSuccess;
        }
        catch (error) {
            logger.error('반 목록 저장 중 오류:', error);
            this.deps.outputModule.showError('반 목록 저장 중 오류가 발생했습니다.');
            return false;
        }
    }
    /**
     * 새 반 추가
     */
    async addClass(className) {
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
        const newClass = {
            id: `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: className.trim(),
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        classList.push(newClass);
        const saved = await this.saveClassList(classList);
        if (saved) {
            this.deps.outputModule.showInfo(`"${className}" 반이 추가되었습니다.`);
            return newClass.id;
        }
        return null;
    }
    /**
     * 반 삭제
     */
    async deleteClass(classId) {
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
        }
        catch (error) {
            logger.error('반 데이터 삭제 중 오류:', error);
        }
        // 목록에서 제거
        classList.splice(classIndex, 1);
        // Firebase에서도 삭제
        if (this.deps.firebaseStorageManager?.getIsAuthenticated()) {
            await this.deps.firebaseStorageManager.deleteClass(classId);
        }
        const saved = await this.saveClassList(classList);
        if (saved) {
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
    getCurrentClassId() {
        return this.currentClassId;
    }
    /**
     * 반 선택
     */
    selectClass(classId) {
        this.currentClassId = classId;
    }
    /**
     * 현재 반의 자리 배치도 저장
     */
    async saveCurrentLayout() {
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
            const layoutData = {
                seats: seats,
                students: students,
                timestamp: new Date().toISOString(),
                className: this.getClassList().find(c => c.id === this.currentClassId)?.name || ''
            };
            // localStorage에 저장
            const storageKey = `${this.STORAGE_KEY_PREFIX}${this.currentClassId}`;
            const localSuccess = this.deps.storageManager.safeSetItem(storageKey, JSON.stringify(layoutData));
            // Firebase에 저장 (로그인된 경우)
            if (this.deps.firebaseStorageManager?.getIsAuthenticated()) {
                const firebaseSuccess = await this.deps.firebaseStorageManager.saveClassLayout(this.currentClassId, layoutData);
                if (firebaseSuccess) {
                    logger.info('Firebase에 자리 배치도 저장 완료');
                }
            }
            if (localSuccess) {
                // 마지막 수정 시간 업데이트
                this.updateLastModified(this.currentClassId);
                this.deps.outputModule.showInfo('자리 배치도가 저장되었습니다.');
                return true;
            }
            return false;
        }
        catch (error) {
            logger.error('자리 배치도 저장 중 오류:', error);
            this.deps.outputModule.showError('자리 배치도 저장 중 오류가 발생했습니다.');
            return false;
        }
    }
    /**
     * 선택된 반의 자리 배치도 불러오기
     */
    async loadLayout(classId) {
        if (!classId) {
            return false;
        }
        try {
            let layoutData = null;
            // Firebase에서 불러오기 시도 (로그인된 경우)
            if (this.deps.firebaseStorageManager?.getIsAuthenticated()) {
                layoutData = await this.deps.firebaseStorageManager.loadClassLayout(classId);
                if (layoutData) {
                    logger.info('Firebase에서 자리 배치도 불러오기 완료');
                }
            }
            // Firebase에서 불러오지 못했으면 localStorage에서 불러오기
            if (!layoutData) {
                const storageKey = `${this.STORAGE_KEY_PREFIX}${classId}`;
                const layoutDataStr = this.deps.storageManager.safeGetItem(storageKey);
                if (!layoutDataStr) {
                    this.deps.outputModule.showInfo('저장된 자리 배치도가 없습니다.');
                    return false;
                }
                // JSON 파싱 시도 (데이터 손상 처리)
                try {
                    layoutData = JSON.parse(layoutDataStr);
                }
                catch (parseError) {
                    this.deps.outputModule.showError('저장된 데이터가 손상되어 불러올 수 없습니다.');
                    logger.error('자리 배치도 파싱 오류:', parseError);
                    return false;
                }
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
            }
            else {
                this.deps.outputModule.showError('저장된 데이터 형식이 올바르지 않습니다.');
                return false;
            }
        }
        catch (error) {
            logger.error('자리 배치도 불러오기 중 오류:', error);
            this.deps.outputModule.showError('자리 배치도 불러오기 중 오류가 발생했습니다.');
            return false;
        }
    }
    /**
     * 마지막 수정 시간 업데이트
     */
    updateLastModified(classId) {
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
    getClassName(classId) {
        const classList = this.getClassList();
        const classInfo = classList.find(c => c.id === classId);
        return classInfo ? classInfo.name : null;
    }
    /**
     * Firebase에서 반 목록을 불러와서 localStorage에 저장
     */
    async syncClassListFromFirebase() {
        if (!this.deps.firebaseStorageManager?.getIsAuthenticated()) {
            return false;
        }
        try {
            const firebaseClassList = await this.deps.firebaseStorageManager.loadClassList();
            if (firebaseClassList && firebaseClassList.length > 0) {
                // Firebase에서 불러온 반 목록을 localStorage에 저장
                const localSuccess = this.deps.storageManager.safeSetItem(this.STORAGE_KEY_CLASSES, JSON.stringify(firebaseClassList));
                if (localSuccess) {
                    logger.info(`Firebase에서 반 목록 ${firebaseClassList.length}개 동기화 완료`);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            logger.error('Firebase에서 반 목록 동기화 실패:', error);
            return false;
        }
    }
}
//# sourceMappingURL=ClassManager.js.map