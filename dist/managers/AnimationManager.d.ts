/**
 * 애니메이션 매니저
 * 커튼, 폭죽 애니메이션 및 사운드 효과 담당
 */
/**
 * AnimationManager가 필요로 하는 의존성 인터페이스
 */
export interface AnimationManagerDependencies {
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    isDevelopmentMode: () => boolean;
}
/**
 * 애니메이션 매니저 클래스
 */
export declare class AnimationManager {
    private deps;
    constructor(dependencies: AnimationManagerDependencies);
    /**
     * 커튼 애니메이션 시작
     */
    startCurtainAnimation(): void;
    /**
     * 커튼 애니메이션 종료 (열기)
     */
    openCurtain(): void;
    /**
     * 커튼 애니메이션 즉시 종료 (에러 시)
     */
    stopCurtainAnimation(): void;
    /**
     * 폭죽 애니메이션 시작
     */
    startFireworks(): void;
    /**
     * 개별 폭죽 생성 및 파티클 애니메이션
     */
    private createFirework;
    /**
     * 자리 배치 실행 시 음향 효과 재생 (3초)
     */
    playArrangementSound(): void;
}
//# sourceMappingURL=AnimationManager.d.ts.map