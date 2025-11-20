/**
 * 배치 옵션 선택 모듈
 * 2단계: 좌석 배치 옵션 선택 기능 담당
 */
import { SeatType, LayoutType } from '../models/Seat.js';
/**
 * 배치 옵션 모듈
 */
export class LayoutSelectorModule {
    constructor(containerId) {
        this.currentSeatType = SeatType.SINGLE;
        this.currentLayoutType = null;
        this.genderPairingEnabled = false;
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        this.container = container;
        this.initializeEventListeners();
        this.initializeCurrentSelection();
    }
    /**
     * 현재 선택된 배치 유형 초기화
     */
    initializeCurrentSelection() {
        // 기본으로 선택된 라디오 버튼 찾기
        const checkedLayout = document.querySelector('input[name="layout-type"]:checked');
        if (checkedLayout) {
            this.currentLayoutType = checkedLayout.value;
            // data-seat-type 속성에 따라 currentSeatType 업데이트
            const seatType = checkedLayout.getAttribute('data-seat-type');
            if (seatType === 'pair') {
                this.currentSeatType = SeatType.PAIR;
            }
            else {
                this.currentSeatType = SeatType.SINGLE;
            }
        }
    }
    /**
     * 이벤트 리스너 초기화
     */
    initializeEventListeners() {
        // 좌석 타입 선택 (라디오 버튼)
        const seatTypeInputs = document.querySelectorAll('input[name="seat-type"]');
        seatTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target;
                this.handleSeatTypeChange(target.value);
            });
        });
        // 배치 유형 선택 - 라디오 버튼 (layout-type)
        const layoutTypeInputs = document.querySelectorAll('input[name="layout-type"]');
        layoutTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target;
                const layoutType = target.value;
                // data-seat-type 속성에 따라 currentSeatType 업데이트
                const seatTypeAttr = target.getAttribute('data-seat-type');
                if (seatTypeAttr === 'pair') {
                    this.currentSeatType = SeatType.PAIR;
                }
                else {
                    this.currentSeatType = SeatType.SINGLE;
                }
                if (layoutType) {
                    this.handleLayoutTypeSelect(layoutType);
                }
            });
        });
        // 배치 유형 선택 (버튼)
        const layoutButtons = document.querySelectorAll('.layout-btn');
        layoutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const layoutType = target.dataset.type;
                if (layoutType) {
                    this.handleLayoutTypeSelect(layoutType);
                }
            });
        });
        // 남녀 짝꿍 옵션
        const genderPairingCheckbox = document.getElementById('gender-pairing');
        if (genderPairingCheckbox) {
            genderPairingCheckbox.addEventListener('change', (e) => {
                const target = e.target;
                this.handleGenderPairingChange(target.checked);
            });
        }
    }
    /**
     * 좌석 타입 변경 처리
     * @param seatType 선택된 좌석 타입
     */
    handleSeatTypeChange(seatType) {
        this.currentSeatType = seatType;
        // 2열 좌석 선택시 남녀 짝꿍 옵션 표시
        const genderPairingOption = document.getElementById('gender-pairing-option');
        if (genderPairingOption) {
            if (seatType === SeatType.PAIR) {
                genderPairingOption.style.display = 'block';
            }
            else {
                genderPairingOption.style.display = 'none';
                this.genderPairingEnabled = false;
            }
        }
        // 이벤트 발생: 좌석 타입 변경
        this.dispatchCustomEvent('seatTypeChanged', { seatType });
    }
    /**
     * 배치 유형 선택 처리
     * @param layoutType 선택된 배치 유형
     */
    handleLayoutTypeSelect(layoutType) {
        // 현재 선택과 충돌하는지 체크
        if (!this.isLayoutCompatible(layoutType)) {
            alert(this.getConflictMessage(layoutType));
            return;
        }
        this.currentLayoutType = layoutType;
        // 버튼 스타일 업데이트 (선택된 버튼 표시)
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const selectedBtn = document.querySelector(`[data-type="${layoutType}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
        // 이벤트 발생: 배치 유형 선택
        this.dispatchCustomEvent('layoutTypeSelected', { layoutType });
    }
    /**
     * 남녀 짝꿍 옵션 변경 처리
     * @param enabled 활성화 여부
     */
    handleGenderPairingChange(enabled) {
        this.genderPairingEnabled = enabled;
        // 2열 좌석에서만 가능
        if (enabled && this.currentSeatType !== SeatType.PAIR) {
            alert('남녀 짝꿍 배치는 2열 좌석 배치에서만 선택할 수 있습니다.');
            this.genderPairingEnabled = false;
            const checkbox = document.getElementById('gender-pairing');
            if (checkbox) {
                checkbox.checked = false;
            }
            return;
        }
        // 이벤트 발생: 남녀 짝꿍 옵션 변경
        this.dispatchCustomEvent('genderPairingChanged', { enabled });
    }
    /**
     * 배치 유형 호환성 확인
     * @param layoutType 배치 유형
     * @returns 호환 여부
     */
    isLayoutCompatible(layoutType) {
        // 1열 좌석 배치인데 2열 균등 배치를 선택하는 경우
        if (this.currentSeatType === SeatType.SINGLE && layoutType === LayoutType.PAIR_UNIFORM) {
            return false;
        }
        return true;
    }
    /**
     * 충돌 메시지 반환
     * @param layoutType 배치 유형
     * @returns 충돌 메시지
     */
    getConflictMessage(layoutType) {
        if (layoutType === LayoutType.PAIR_UNIFORM) {
            return '2열 균등 배치는 2열 좌석 배치와 함께 사용할 수 없습니다. 좌석 열 구성을 먼저 선택해주세요.';
        }
        return '선택한 배치 유형은 현재 설정과 호환되지 않습니다.';
    }
    /**
     * 현재 선택된 좌석 타입을 가져옵니다.
     * @returns 좌석 타입
     */
    getCurrentSeatType() {
        return this.currentSeatType;
    }
    /**
     * 현재 선택된 배치 유형을 가져옵니다.
     * @returns 배치 유형 또는 null
     */
    getCurrentLayoutType() {
        return this.currentLayoutType;
    }
    /**
     * 남녀 짝꿍 옵션이 활성화되어 있는지 확인합니다.
     * @returns 활성화 여부
     */
    isGenderPairingEnabled() {
        return this.genderPairingEnabled && this.currentSeatType === SeatType.PAIR;
    }
    /**
     * 배치 옵션을 검증합니다.
     * @returns 검증 성공 여부 및 에러 메시지
     */
    validateOptions() {
        if (!this.currentLayoutType) {
            return { isValid: false, errorMessage: '배치 유형을 선택해주세요.' };
        }
        // 호환성 검사
        if (!this.isLayoutCompatible(this.currentLayoutType)) {
            return { isValid: false, errorMessage: this.getConflictMessage(this.currentLayoutType) };
        }
        return { isValid: true };
    }
    /**
     * 커스텀 이벤트 발생
     * @param eventName 이벤트 이름
     * @param data 이벤트 데이터
     */
    dispatchCustomEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        this.container.dispatchEvent(event);
    }
    /**
     * 선택을 초기화합니다.
     */
    reset() {
        this.currentSeatType = SeatType.SINGLE;
        this.currentLayoutType = null;
        this.genderPairingEnabled = false;
        // UI 초기화
        const singleRadio = document.querySelector('input[value="single"]');
        if (singleRadio) {
            singleRadio.checked = true;
        }
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const genderPairingCheckbox = document.getElementById('gender-pairing');
        if (genderPairingCheckbox) {
            genderPairingCheckbox.checked = false;
        }
    }
}
//# sourceMappingURL=LayoutSelectorModule.js.map