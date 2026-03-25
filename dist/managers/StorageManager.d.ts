/**
 * 스토리지 매니저
 * localStorage 관련 작업 담당
 */
import { OutputModule } from '../modules/OutputModule.js';
/**
 * StorageManager가 필요로 하는 의존성 인터페이스
 */
export interface StorageManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
}
/**
 * 스토리지 매니저 클래스
 */
export declare class StorageManager {
    private deps;
    constructor(dependencies: StorageManagerDependencies);
    /**
     * localStorage 사용 가능 여부 확인
     */
    isLocalStorageAvailable(): boolean;
    /**
     * 안전한 localStorage 저장
     */
    safeSetItem(key: string, value: string): boolean;
    /**
     * 안전한 localStorage 읽기
     */
    safeGetItem(key: string): string | null;
    /**
     * 옵션 설정 저장
     */
    saveOptions(): void;
    /**
     * 저장된 옵션 설정 불러오기
     */
    loadOptions(setTimeoutSafe: (callback: () => void, delay: number) => void): void;
}
//# sourceMappingURL=StorageManager.d.ts.map