/**
 * 방문자 수 카운터 모듈
 *
 * 서버가 필요한 유일한 기능이다. Firebase는 이 경로에서만,
 * 그것도 필요할 때 동적으로 불러온다. (visitorCounter 서비스 참고)
 * 실패해도 앱 사용에는 영향이 없어야 한다.
 */

import { incrementVisitorCount, getVisitorCount } from '../services/visitorCounter.js';
import { logger } from '../utils/logger.js';

export class VisitorCounterModule {
    private visitorNumberElement: HTMLElement | null = null;
    private readonly lastVisitKey = 'seating_arrangement_last_visit';

    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
     */
    private getTodayString(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 오늘 첫 방문인지 확인 (하루에 한 번만 카운트를 올린다)
     */
    private isFirstVisitToday(): boolean {
        try {
            return localStorage.getItem(this.lastVisitKey) !== this.getTodayString();
        } catch (error) {
            logger.error('방문 기록 확인 실패:', error);
            return false;
        }
    }

    /**
     * 오늘 방문 기록 저장
     */
    private saveTodayVisit(): void {
        try {
            localStorage.setItem(this.lastVisitKey, this.getTodayString());
        } catch (error) {
            logger.error('방문 기록 저장 실패:', error);
        }
    }

    /**
     * 화면에 방문자 수 표시
     */
    private render(count: number | null): void {
        if (!this.visitorNumberElement) return;
        this.visitorNumberElement.textContent = count === null ? '-' : count.toLocaleString('ko-KR');
    }

    /**
     * 방문자 수 초기화 및 표시
     */
    public init(): void {
        this.visitorNumberElement = document.getElementById('visitor-number');
        if (!this.visitorNumberElement) return;

        // 방문자 수는 부가 기능이므로 실패해도 조용히 넘어간다
        void this.load().catch((error) => {
            logger.error('방문자 수 표시 실패:', error);
            this.render(null);
        });
    }

    private async load(): Promise<void> {
        if (this.isFirstVisitToday()) {
            const newCount = await incrementVisitorCount();
            if (newCount !== null) {
                this.saveTodayVisit();
                this.render(newCount);
                return;
            }
        }

        this.render(await getVisitorCount());
    }
}
