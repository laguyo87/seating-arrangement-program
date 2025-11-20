/**
 * 배치 옵션 선택 모듈
 * 2단계: 좌석 배치 옵션 선택 기능 담당
 */
import { SeatType, LayoutType } from '../models/Seat.js';
/**
 * 배치 옵션 모듈
 */
export declare class LayoutSelectorModule {
    private container;
    private currentSeatType;
    private currentLayoutType;
    private genderPairingEnabled;
    constructor(containerId: string);
    /**
     * 현재 선택된 배치 유형 초기화
     */
    private initializeCurrentSelection;
    /**
     * 이벤트 리스너 초기화
     */
    private initializeEventListeners;
    /**
     * 좌석 타입 변경 처리
     * @param seatType 선택된 좌석 타입
     */
    private handleSeatTypeChange;
    /**
     * 배치 유형 선택 처리
     * @param layoutType 선택된 배치 유형
     */
    private handleLayoutTypeSelect;
    /**
     * 남녀 짝꿍 옵션 변경 처리
     * @param enabled 활성화 여부
     */
    private handleGenderPairingChange;
    /**
     * 배치 유형 호환성 확인
     * @param layoutType 배치 유형
     * @returns 호환 여부
     */
    private isLayoutCompatible;
    /**
     * 충돌 메시지 반환
     * @param layoutType 배치 유형
     * @returns 충돌 메시지
     */
    private getConflictMessage;
    /**
     * 현재 선택된 좌석 타입을 가져옵니다.
     * @returns 좌석 타입
     */
    getCurrentSeatType(): SeatType;
    /**
     * 현재 선택된 배치 유형을 가져옵니다.
     * @returns 배치 유형 또는 null
     */
    getCurrentLayoutType(): LayoutType | null;
    /**
     * 남녀 짝꿍 옵션이 활성화되어 있는지 확인합니다.
     * @returns 활성화 여부
     */
    isGenderPairingEnabled(): boolean;
    /**
     * 배치 옵션을 검증합니다.
     * @returns 검증 성공 여부 및 에러 메시지
     */
    validateOptions(): {
        isValid: boolean;
        errorMessage?: string;
    };
    /**
     * 커스텀 이벤트 발생
     * @param eventName 이벤트 이름
     * @param data 이벤트 데이터
     */
    private dispatchCustomEvent;
    /**
     * 선택을 초기화합니다.
     */
    reset(): void;
}
//# sourceMappingURL=LayoutSelectorModule.d.ts.map