/**
 * 방문자 수 카운터 모듈
 * Firebase를 사용하여 전역 방문자 수를 관리합니다.
 */
import { logger } from '../utils/logger.js';
export class VisitorCounterModule {
    constructor(dependencies) {
        this.visitorNumberElement = null;
        this.lastVisitKey = 'seating_arrangement_last_visit';
        this.unsubscribeListener = null;
        this.deps = dependencies;
    }
    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
     */
    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    /**
     * 오늘 첫 방문인지 확인
     */
    isFirstVisitToday() {
        try {
            if (typeof Storage === 'undefined') {
                return false;
            }
            const today = this.getTodayString();
            const lastVisit = localStorage.getItem(this.lastVisitKey);
            return lastVisit !== today;
        }
        catch (error) {
            logger.error('localStorage 확인 실패:', error);
            return false;
        }
    }
    /**
     * 오늘 방문 기록 저장
     */
    saveTodayVisit() {
        try {
            if (typeof Storage === 'undefined') {
                return;
            }
            const today = this.getTodayString();
            localStorage.setItem(this.lastVisitKey, today);
        }
        catch (error) {
            logger.error('localStorage 저장 실패:', error);
        }
    }
    /**
     * Firebase 초기화 대기
     */
    async waitForFirebase(maxRetries = 10, delay = 500) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const firebaseService = this.deps.firebaseStorageManager.getFirebaseService();
                const firestore = firebaseService?.getFirestore();
                if (firestore) {
                    logger.info('Firebase 초기화 확인 완료');
                    return true;
                }
            }
            catch (error) {
                logger.warn(`Firebase 초기화 대기 중... (${i + 1}/${maxRetries})`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        logger.warn('Firebase 초기화 대기 시간 초과');
        return false;
    }
    /**
     * 방문자 수 업데이트
     */
    async updateVisitorCount() {
        try {
            // 요소를 찾을 때까지 재시도
            this.visitorNumberElement = document.getElementById('visitor-number');
            if (!this.visitorNumberElement) {
                logger.warn('visitor-number 요소를 찾을 수 없습니다. 재시도 중...');
                setTimeout(() => this.updateVisitorCount(), 100);
                return;
            }
            // Firebase 초기화 대기
            const firebaseReady = await this.waitForFirebase();
            if (!firebaseReady) {
                logger.warn('Firebase가 초기화되지 않아 방문자 수를 가져올 수 없습니다.');
                if (this.visitorNumberElement) {
                    this.visitorNumberElement.textContent = '?';
                }
                return;
            }
            // 오늘 첫 방문인 경우 Firebase 방문자 수 증가
            if (this.isFirstVisitToday()) {
                const newCount = await this.deps.firebaseStorageManager.incrementVisitorCount();
                if (newCount !== null) {
                    this.saveTodayVisit();
                    logger.info(`새 방문자! 총 방문자 수: ${newCount.toLocaleString('ko-KR')}`);
                }
                else {
                    logger.warn('방문자 수 증가 실패, Firebase에서 현재 값을 가져옵니다.');
                }
            }
            // Firebase에서 현재 방문자 수 가져오기
            const currentCount = await this.deps.firebaseStorageManager.getVisitorCount();
            this.displayVisitorCount(currentCount);
            // 실시간 리스너 설정
            this.setupRealtimeListener();
        }
        catch (error) {
            logger.error('방문자 수 업데이트 중 오류:', error);
            if (this.visitorNumberElement) {
                this.visitorNumberElement.textContent = '?';
            }
        }
    }
    /**
     * 방문자 수 표시
     */
    displayVisitorCount(count) {
        if (this.visitorNumberElement) {
            this.visitorNumberElement.textContent = count.toLocaleString('ko-KR');
            logger.info(`방문자 수 표시: ${count.toLocaleString('ko-KR')}명`);
        }
    }
    /**
     * 실시간 리스너 설정
     */
    setupRealtimeListener() {
        // 기존 리스너가 있으면 해제
        if (this.unsubscribeListener) {
            this.unsubscribeListener();
        }
        const unsubscribe = this.deps.firebaseStorageManager.setupVisitorCountListener((count) => {
            this.displayVisitorCount(count);
        }, (error) => {
            logger.error('방문자 수 리스너 오류:', error);
        });
        if (unsubscribe) {
            this.unsubscribeListener = unsubscribe;
        }
    }
    /**
     * 초기화
     */
    init() {
        // DOM이 완전히 로드된 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.updateVisitorCount(), 50);
            });
        }
        else {
            setTimeout(() => this.updateVisitorCount(), 50);
        }
    }
    /**
     * 리스너 해제
     */
    cleanup() {
        if (this.unsubscribeListener) {
            this.unsubscribeListener();
            this.unsubscribeListener = null;
        }
    }
}
//# sourceMappingURL=VisitorCounterModule.js.map