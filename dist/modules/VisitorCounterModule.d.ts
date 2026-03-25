/**
 * 방문자 수 카운터 모듈
 * Firebase를 사용하여 전역 방문자 수를 관리합니다.
 */
import { FirebaseStorageManager } from '../managers/FirebaseStorageManager.js';
export interface VisitorCounterModuleDependencies {
    firebaseStorageManager: FirebaseStorageManager;
}
export declare class VisitorCounterModule {
    private deps;
    private visitorNumberElement;
    private lastVisitKey;
    private unsubscribeListener;
    constructor(dependencies: VisitorCounterModuleDependencies);
    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
     */
    private getTodayString;
    /**
     * 오늘 첫 방문인지 확인
     */
    private isFirstVisitToday;
    /**
     * 오늘 방문 기록 저장
     */
    private saveTodayVisit;
    /**
     * Firebase 초기화 대기
     */
    private waitForFirebase;
    /**
     * 방문자 수 업데이트
     */
    updateVisitorCount(): Promise<void>;
    /**
     * 방문자 수 표시
     */
    private displayVisitorCount;
    /**
     * 실시간 리스너 설정
     */
    private setupRealtimeListener;
    /**
     * 초기화
     */
    init(): void;
    /**
     * 리스너 해제
     */
    cleanup(): void;
}
//# sourceMappingURL=VisitorCounterModule.d.ts.map