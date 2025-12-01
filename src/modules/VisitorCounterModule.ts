/**
 * 방문자 수 카운터 모듈
 * Firebase를 사용하여 전역 방문자 수를 관리합니다.
 */

import { FirebaseStorageManager } from '../managers/FirebaseStorageManager.js';
import { logger } from '../utils/logger.js';

export interface VisitorCounterModuleDependencies {
  firebaseStorageManager: FirebaseStorageManager;
}

export class VisitorCounterModule {
  private deps: VisitorCounterModuleDependencies;
  private visitorNumberElement: HTMLElement | null = null;
  private lastVisitKey = 'seating_arrangement_last_visit';
  private unsubscribeListener: (() => void) | null = null;

  constructor(dependencies: VisitorCounterModuleDependencies) {
    this.deps = dependencies;
  }

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
   * 오늘 첫 방문인지 확인
   */
  private isFirstVisitToday(): boolean {
    try {
      if (typeof Storage === 'undefined') {
        return false;
      }
      const today = this.getTodayString();
      const lastVisit = localStorage.getItem(this.lastVisitKey);
      return lastVisit !== today;
    } catch (error) {
      logger.error('localStorage 확인 실패:', error);
      return false;
    }
  }

  /**
   * 오늘 방문 기록 저장
   */
  private saveTodayVisit(): void {
    try {
      if (typeof Storage === 'undefined') {
        return;
      }
      const today = this.getTodayString();
      localStorage.setItem(this.lastVisitKey, today);
    } catch (error) {
      logger.error('localStorage 저장 실패:', error);
    }
  }

  /**
   * 방문자 수 업데이트
   */
  public async updateVisitorCount(): Promise<void> {
    try {
      // 요소를 찾을 때까지 재시도
      this.visitorNumberElement = document.getElementById('visitor-number');
      if (!this.visitorNumberElement) {
        logger.warn('visitor-number 요소를 찾을 수 없습니다. 재시도 중...');
        setTimeout(() => this.updateVisitorCount(), 100);
        return;
      }

      // 오늘 첫 방문인 경우 Firebase 방문자 수 증가
      if (this.isFirstVisitToday()) {
        const newCount = await this.deps.firebaseStorageManager.incrementVisitorCount();
        if (newCount !== null) {
          this.saveTodayVisit();
          logger.info(`새 방문자! 총 방문자 수: ${newCount.toLocaleString('ko-KR')}`);
        } else {
          logger.warn('방문자 수 증가 실패, Firebase에서 현재 값을 가져옵니다.');
        }
      }

      // Firebase에서 현재 방문자 수 가져오기
      const currentCount = await this.deps.firebaseStorageManager.getVisitorCount();
      this.displayVisitorCount(currentCount);

      // 실시간 리스너 설정
      this.setupRealtimeListener();
    } catch (error) {
      logger.error('방문자 수 업데이트 중 오류:', error);
      if (this.visitorNumberElement) {
        this.visitorNumberElement.textContent = '?';
      }
    }
  }

  /**
   * 방문자 수 표시
   */
  private displayVisitorCount(count: number): void {
    if (this.visitorNumberElement) {
      this.visitorNumberElement.textContent = count.toLocaleString('ko-KR');
      logger.info(`방문자 수 표시: ${count.toLocaleString('ko-KR')}명`);
    }
  }

  /**
   * 실시간 리스너 설정
   */
  private setupRealtimeListener(): void {
    // 기존 리스너가 있으면 해제
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }

    const unsubscribe = this.deps.firebaseStorageManager.setupVisitorCountListener(
      (count: number) => {
        this.displayVisitorCount(count);
      },
      (error: Error) => {
        logger.error('방문자 수 리스너 오류:', error);
      }
    );

    if (unsubscribe) {
      this.unsubscribeListener = unsubscribe;
    }
  }

  /**
   * 초기화
   */
  public init(): void {
    // DOM이 완전히 로드된 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.updateVisitorCount(), 50);
      });
    } else {
      setTimeout(() => this.updateVisitorCount(), 50);
    }
  }

  /**
   * 리스너 해제
   */
  public cleanup(): void {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = null;
    }
  }
}


