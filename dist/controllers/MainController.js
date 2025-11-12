/**
 * 메인 컨트롤러
 * 전체 프로그램 흐름 제어 및 모듈 통합
 */
import { InputModule } from '../modules/InputModule.js';
import { LayoutSelectorModule } from '../modules/LayoutSelectorModule.js';
import { SeatCanvasModule } from '../modules/SeatCanvasModule.js';
import { OutputModule } from '../modules/OutputModule.js';
import { CustomLayoutModule } from '../modules/CustomLayoutModule.js';
import { StudentModel } from '../models/Student.js';
import { LayoutService } from '../services/LayoutService.js';
import { RandomService } from '../services/RandomService.js';
/**
 * 메인 컨트롤러 클래스
 * 전체 프로그램의 흐름을 제어하고 모듈들을 조율합니다.
 */
export class MainController {
    constructor() {
        this.students = [];
        this.seats = [];
        this.isInitialized = false;
        this.fixedSeatIds = new Set(); // 고정 좌석 ID 목록
        this.nextSeatId = 1; // 좌석 카드 고유 ID 생성기
        this.dragSourceCard = null; // 드래그 시작 카드 참조
        this.dragOverIndicator = null; // 드롭 위치 인디케이터
        this.isSyncing = false; // 동기화 중 플래그 (무한 루프 방지)
        this.layoutHistory = []; // 통합 히스토리 (모든 액션 추적)
        this.historyIndex = -1; // 현재 히스토리 인덱스
        /**
         * 좌석 카드 클릭 이벤트 핸들러
         */
        this.handleSeatCardClick = (e) => {
            // 드래그가 발생했으면 클릭 이벤트 무시
            if (this.dragSourceCard) {
                return;
            }
            const target = e.target;
            const card = target.closest('.student-seat-card');
            if (!card)
                return;
            // 고정 좌석 모드가 활성화되어 있는지 확인
            const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
            if (!fixedRandomMode)
                return;
            const seatIdStr = card.getAttribute('data-seat-id');
            if (!seatIdStr)
                return;
            const seatId = parseInt(seatIdStr, 10);
            // 이벤트 전파 중단 (다른 이벤트 핸들러와의 충돌 방지)
            e.stopPropagation();
            e.preventDefault();
            // 고정 좌석 토글
            if (this.fixedSeatIds.has(seatId)) {
                // 고정 해제
                this.fixedSeatIds.delete(seatId);
                card.classList.remove('fixed-seat');
                card.title = '클릭하여 고정 좌석 지정';
                const lockIcon = card.querySelector('.fixed-seat-lock');
                if (lockIcon) {
                    lockIcon.remove();
                }
                console.log(`좌석 ${seatId} 고정 해제`);
            }
            else {
                // 고정 설정
                this.fixedSeatIds.add(seatId);
                card.classList.add('fixed-seat');
                card.title = '고정 좌석 (클릭하여 해제)';
                // 🔒 아이콘 추가 (없는 경우만)
                if (!card.querySelector('.fixed-seat-lock')) {
                    const lockIcon = document.createElement('div');
                    lockIcon.className = 'fixed-seat-lock';
                    lockIcon.textContent = '🔒';
                    lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
                    card.appendChild(lockIcon);
                }
                console.log(`좌석 ${seatId} 고정 설정`);
            }
            // 테이블의 고정 좌석 드롭다운 업데이트
            this.updateFixedSeatDropdowns();
        };
        try {
            // 모듈 초기화
            this.inputModule = new InputModule('input-section');
            this.layoutSelectorModule = new LayoutSelectorModule('layout-section');
            // Canvas 관련 모듈은 선택적으로 초기화 (카드 기반 배치 사용 시)
            const canvas = document.getElementById('seat-canvas');
            if (canvas) {
                this.canvasModule = new SeatCanvasModule('seat-canvas');
                this.customLayoutModule = new CustomLayoutModule('seat-canvas');
            }
            this.outputModule = new OutputModule('output-section');
            // 이벤트 리스너 설정
            this.initializeEventListeners();
            // 이력 드롭다운 초기화
            this.initializeHistoryDropdown();
            // 저장된 옵션 설정 불러오기
            this.loadOptions();
            // 초기 상태에서도 4단계 비활성화 체크 및 분단 개수 제한 적용
            const checkedLayoutType = document.querySelector('input[name="layout-type"]:checked');
            if (checkedLayoutType) {
                if (checkedLayoutType.value === 'single-uniform') {
                    this.toggleCustomMode1(true);
                    this.updatePartitionLimitForSingleUniform();
                }
                else if (checkedLayoutType.value === 'pair-uniform') {
                    this.updatePartitionLimitForPair();
                }
            }
            // 초기 상태에서 고정 좌석 모드 확인
            const checkedFixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
            if (checkedFixedRandomMode) {
                this.enableFixedSeatMode();
            }
            this.isInitialized = true;
            // URL 파라미터에서 공유 데이터 확인
            const urlParams = new URLSearchParams(window.location.search);
            // 'share' 또는 's' 파라미터 지원 (하위 호환성)
            const shareParam = urlParams.get('s') || urlParams.get('share');
            if (shareParam) {
                // 공유된 배치 데이터 로드
                this.loadSharedLayout(shareParam);
            }
            else {
                // 저장된 데이터 불러오기
                this.loadSavedLayoutResult();
                console.log('초기화 - seats.length:', this.seats.length, 'students.length:', this.students.length);
                if (this.seats.length > 0 && this.students.length > 0) {
                    console.log('저장된 배치 결과를 로드합니다.');
                    this.outputModule.showInfo('저장된 배치 결과가 로드되었습니다.');
                    // 저장된 배치 결과 렌더링
                    this.renderFinalLayout();
                }
                else {
                    console.log('초기 예시 레이아웃을 표시합니다.');
                    // 초기 예시 레이아웃 표시 (24명, 5분단)
                    this.renderInitialExampleLayout();
                    // 초기값으로 미리보기 자동 실행
                    setTimeout(() => {
                        this.updatePreviewForGenderCounts();
                    }, 100);
                }
            }
        }
        catch (error) {
            console.error('초기화 실패:', error);
            alert('프로그램 초기화 중 오류가 발생했습니다.');
        }
    }
    /**
     * 초기화 시 이력 드롭다운 업데이트
     */
    initializeHistoryDropdown() {
        // 드롭다운은 항상 표시되므로 내용만 업데이트
        this.updateHistoryDropdown();
    }
    /**
     * 앱 초기 상태로 되돌리기
     */
    resetApp() {
        try {
            // 로컬 스토리지 정리 (앱 관련 데이터만)
            try {
                localStorage.removeItem('layoutResult');
                localStorage.removeItem('studentData');
            }
            catch { }
            // 입력값 초기화
            const maleInput = document.getElementById('male-students');
            const femaleInput = document.getElementById('female-students');
            const partitionInput = document.getElementById('number-of-partitions');
            if (maleInput)
                maleInput.value = '12';
            if (femaleInput)
                femaleInput.value = '12';
            if (partitionInput)
                partitionInput.value = '5';
            // 라디오 기본값 복원
            const singleUniform = document.querySelector('input[name="layout-type"][value="single-uniform"]');
            if (singleUniform)
                singleUniform.checked = true;
            const pairSubmenu = document.getElementById('pair-submenu');
            if (pairSubmenu)
                pairSubmenu.style.display = 'none';
            const pairModeGender = document.querySelector('input[name="pair-mode"][value="gender-pair"]');
            if (pairModeGender)
                pairModeGender.checked = true;
            const customRandom = document.querySelector('input[name="custom-mode-2"][value="random"]');
            if (customRandom)
                customRandom.checked = true;
            // 고정 좌석 모드 해제
            this.disableFixedSeatMode();
            this.fixedSeatIds.clear();
            this.nextSeatId = 1;
            // 좌석 영역 초기화
            const seatsArea = document.getElementById('seats-area');
            if (seatsArea)
                seatsArea.innerHTML = '';
            // 학생 테이블 제거 (존재한다면)
            const outputSection = document.getElementById('output-section');
            if (outputSection) {
                const tables = outputSection.querySelectorAll('table');
                tables.forEach(t => t.remove());
            }
            // 액션 버튼 숨김
            const actionButtons = document.getElementById('layout-action-buttons');
            if (actionButtons)
                actionButtons.style.display = 'none';
            // 내부 상태 초기화
            this.students = [];
            this.seats = [];
            // 초기 예시 레이아웃 렌더링 및 미리보기 갱신
            this.renderInitialExampleLayout();
            this.updatePreviewForGenderCounts();
            this.outputModule.showInfo('초기화되었습니다. 기본 설정으로 돌아갑니다.');
        }
        catch (error) {
            console.error('초기화 중 오류:', error);
            this.outputModule.showError('초기화 중 오류가 발생했습니다.');
        }
    }
    /**
     * 옵션 설정 저장
     */
    saveOptions() {
        try {
            const options = {};
            // 옵션1: 좌석 배치 형태
            const layoutType = document.querySelector('input[name="layout-type"]:checked');
            if (layoutType) {
                options.layoutType = layoutType.value;
            }
            const pairMode = document.querySelector('input[name="pair-mode"]:checked');
            if (pairMode) {
                options.pairMode = pairMode.value;
            }
            const groupSize = document.querySelector('input[name="group-size"]:checked');
            if (groupSize) {
                options.groupSize = groupSize.value;
            }
            const groupGenderMix = document.getElementById('group-gender-mix');
            if (groupGenderMix) {
                options.groupGenderMix = groupGenderMix.checked;
            }
            // 옵션2: 학생 자리 수
            const maleStudents = document.getElementById('male-students');
            if (maleStudents) {
                options.maleStudents = maleStudents.value;
            }
            const femaleStudents = document.getElementById('female-students');
            if (femaleStudents) {
                options.femaleStudents = femaleStudents.value;
            }
            // 옵션3: 분단 개수
            const numberOfPartitions = document.getElementById('number-of-partitions');
            if (numberOfPartitions) {
                options.numberOfPartitions = numberOfPartitions.value;
            }
            // 옵션4: 맞춤 구성
            const customMode2 = document.querySelector('input[name="custom-mode-2"]:checked');
            if (customMode2) {
                options.customMode2 = customMode2.value;
            }
            // localStorage에 저장
            localStorage.setItem('savedOptions', JSON.stringify(options));
            this.outputModule.showSuccess('옵션 설정이 기억되었습니다.');
        }
        catch (error) {
            console.error('옵션 설정 저장 중 오류:', error);
            this.outputModule.showError('옵션 설정 저장 중 오류가 발생했습니다.');
        }
    }
    /**
     * 저장된 옵션 설정 불러오기
     */
    loadOptions() {
        try {
            const savedOptionsStr = localStorage.getItem('savedOptions');
            if (!savedOptionsStr) {
                return; // 저장된 설정이 없으면 기본값 유지
            }
            const options = JSON.parse(savedOptionsStr);
            // 옵션1: 좌석 배치 형태
            if (options.layoutType) {
                const layoutTypeInput = document.querySelector(`input[name="layout-type"][value="${options.layoutType}"]`);
                if (layoutTypeInput) {
                    layoutTypeInput.checked = true;
                    layoutTypeInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            // pair-mode는 layout-type이 pair-uniform일 때만 적용
            if (options.pairMode && options.layoutType === 'pair-uniform') {
                setTimeout(() => {
                    const pairModeInput = document.querySelector(`input[name="pair-mode"][value="${options.pairMode}"]`);
                    if (pairModeInput) {
                        pairModeInput.checked = true;
                        pairModeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, 100);
            }
            // group-size는 layout-type이 group일 때만 적용
            if (options.groupSize && options.layoutType === 'group') {
                setTimeout(() => {
                    const groupSizeInput = document.querySelector(`input[name="group-size"][value="${options.groupSize}"]`);
                    if (groupSizeInput) {
                        groupSizeInput.checked = true;
                        groupSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    // group-gender-mix는 group-size가 선택된 후에 적용
                    if (options.groupGenderMix !== undefined) {
                        setTimeout(() => {
                            const groupGenderMixInput = document.getElementById('group-gender-mix');
                            if (groupGenderMixInput) {
                                groupGenderMixInput.checked = options.groupGenderMix;
                                groupGenderMixInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, 200);
                    }
                }, 100);
            }
            // 옵션2: 학생 자리 수
            if (options.maleStudents !== undefined) {
                const maleStudentsInput = document.getElementById('male-students');
                if (maleStudentsInput) {
                    maleStudentsInput.value = options.maleStudents;
                    maleStudentsInput.dispatchEvent(new Event('input', { bubbles: true }));
                    maleStudentsInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            if (options.femaleStudents !== undefined) {
                const femaleStudentsInput = document.getElementById('female-students');
                if (femaleStudentsInput) {
                    femaleStudentsInput.value = options.femaleStudents;
                    femaleStudentsInput.dispatchEvent(new Event('input', { bubbles: true }));
                    femaleStudentsInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            // 옵션3: 분단 개수
            if (options.numberOfPartitions !== undefined) {
                const numberOfPartitionsInput = document.getElementById('number-of-partitions');
                if (numberOfPartitionsInput) {
                    numberOfPartitionsInput.value = options.numberOfPartitions;
                    numberOfPartitionsInput.dispatchEvent(new Event('input', { bubbles: true }));
                    numberOfPartitionsInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            // 옵션4: 맞춤 구성
            if (options.customMode2) {
                const customMode2Input = document.querySelector(`input[name="custom-mode-2"][value="${options.customMode2}"]`);
                if (customMode2Input) {
                    customMode2Input.checked = true;
                    customMode2Input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
        catch (error) {
            console.error('옵션 설정 불러오기 중 오류:', error);
            // 오류가 발생해도 기본값으로 진행
        }
    }
    /**
     * 초기 캔버스에 칠판과 교탁 그리기
     */
    drawInitialCanvas() {
        const canvas = document.getElementById('seat-canvas');
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // 캔버스 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 배경 설정
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 교탁과 칠판 그리기
        this.drawTeacherDeskAndBoard(ctx, canvas);
        // 안내 메시지
        ctx.fillStyle = '#666';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('교실 자리 배치 프로그램', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#999';
        ctx.fillText('칠판과 교탁이 상단에 자동으로 배치됩니다.', canvas.width / 2, canvas.height / 2);
    }
    /**
     * 이벤트 리스너 초기화
     */
    initializeEventListeners() {
        // 라디오 버튼 변경 이벤트 직접 리스닝
        const layoutInputs = document.querySelectorAll('input[name="layout-type"]');
        layoutInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target;
                const layoutType = target.value;
                // '1명 한 줄로 배치' 선택 시 4단계 비활성화 및 분단 개수 제한
                if (layoutType === 'single-uniform') {
                    this.toggleSingleSubmenu(true);
                    this.toggleCustomMode1(true);
                    this.updatePartitionLimitForSingleUniform();
                }
                else {
                    this.toggleSingleSubmenu(false);
                    this.toggleCustomMode1(false);
                }
                // '2명씩 짝꿍 배치' 선택 시 서브 메뉴 표시 및 분단 개수 제한
                if (layoutType === 'pair-uniform') {
                    this.togglePairSubmenu(true);
                    this.updatePartitionLimitForPair();
                }
                else {
                    this.togglePairSubmenu(false);
                }
                // '모둠 배치' 선택 시 서브 메뉴 표시 및 분단 개수 제한
                if (layoutType === 'group') {
                    this.toggleGroupSubmenu(true);
                    this.toggleGroupGenderMixOption(true);
                    // 모둠 배치가 선택되면 현재 선택된 group-size에 따라 분단 개수 제한 적용
                    const selectedGroupSize = document.querySelector('input[name="group-size"]:checked');
                    if (selectedGroupSize) {
                        this.updatePartitionLimitForGroup(selectedGroupSize.value);
                    }
                    else {
                        // 아직 선택되지 않았으면 제한 해제
                        this.resetPartitionLimit();
                    }
                }
                else {
                    this.toggleGroupSubmenu(false);
                    this.toggleGroupGenderMixOption(false);
                    // 모둠 배치가 아니고 다른 배치 형태도 아니면 분단 개수 제한 해제
                    if (layoutType !== 'single-uniform' && layoutType !== 'pair-uniform') {
                        this.resetPartitionLimit();
                    }
                }
                // 배치 형태 변경 시 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        });
        // 1명씩 한 줄로 배치 모드 라디오 버튼 변경 이벤트
        const singleModeInputs = document.querySelectorAll('input[name="single-mode"]');
        singleModeInputs.forEach(input => {
            input.addEventListener('change', () => {
                // 배치 형태 변경 시 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        });
        // '남녀 순서 바꾸기' 체크박스 이벤트 리스너
        const reverseGenderOrderCheckbox = document.getElementById('reverse-gender-order');
        if (reverseGenderOrderCheckbox) {
            reverseGenderOrderCheckbox.addEventListener('change', () => {
                // 체크박스 변경 시 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        }
        // 모둠 크기 라디오 버튼 변경 이벤트
        const groupSizeInputs = document.querySelectorAll('input[name="group-size"]');
        groupSizeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target;
                const groupSize = target.value;
                console.log('모둠 크기 변경:', groupSize);
                // 분단 개수 제한 적용
                this.updatePartitionLimitForGroup(groupSize);
                // 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        });
        // 짝꿍 모드 라디오 버튼 변경 이벤트
        const pairModeInputs = document.querySelectorAll('input[name="pair-mode"]');
        pairModeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                console.log('짝꿍 모드 변경:', e.target.value);
                // 분단 개수 제한 적용 (짝꿍 배치 선택 시)
                const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked');
                if (layoutTypeInput && layoutTypeInput.value === 'pair-uniform') {
                    this.updatePartitionLimitForPair();
                }
                // 현재 학생 수 가져오기
                this.updatePreviewForGenderCounts();
            });
        });
        // 모둠 배치 남녀 섞기 체크박스 변경 이벤트
        const genderMixCheckbox = document.getElementById('group-gender-mix');
        if (genderMixCheckbox) {
            genderMixCheckbox.addEventListener('change', () => {
                console.log('남녀 섞기 옵션 변경:', genderMixCheckbox.checked);
                // 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        }
        // 인원수 설정 이벤트
        document.addEventListener('studentCountSet', (e) => {
            const customEvent = e;
            const count = customEvent.detail.count;
            this.handleCreateStudentTable(count);
            // 미리보기 업데이트
            this.updatePreviewForStudentCount(count);
        });
        // 남학생 수 입력 필드 이벤트
        const maleCountInput = document.getElementById('male-students');
        if (maleCountInput) {
            maleCountInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.updatePreviewForGenderCounts();
                }
            });
            maleCountInput.addEventListener('change', () => {
                this.updatePreviewForGenderCounts();
            });
            // 입력값이 변경될 때마다 실시간으로 업데이트
            maleCountInput.addEventListener('input', () => {
                this.updatePreviewForGenderCounts();
                this.updateStudentTableStats(); // 통계 업데이트
            });
        }
        // 좌석 카드 드래그&드롭(스왑) 활성화
        this.enableSeatSwapDragAndDrop();
        // 옵션 설정 저장 버튼
        const saveOptionsBtn = document.getElementById('save-options');
        if (saveOptionsBtn) {
            saveOptionsBtn.addEventListener('click', () => {
                this.saveOptions();
            });
        }
        // 초기화 버튼
        const resetBtn = document.getElementById('reset-app');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetApp();
            });
        }
        // 여학생 수 입력 필드 이벤트
        const femaleCountInput = document.getElementById('female-students');
        if (femaleCountInput) {
            femaleCountInput.addEventListener('change', () => {
                this.updatePreviewForGenderCounts();
            });
            // 입력값이 변경될 때마다 실시간으로 업데이트
            femaleCountInput.addEventListener('input', () => {
                this.updatePreviewForGenderCounts();
                this.updateStudentTableStats(); // 통계 업데이트
            });
        }
        // 학생 정보 입력 테이블 생성 버튼
        const createTableBtn = document.getElementById('create-student-table');
        if (createTableBtn) {
            createTableBtn.addEventListener('click', () => {
                this.handleCreateStudentTable();
            });
        }
        // 분단 수 입력 필드에 엔터 키 이벤트 추가
        const partitionInput = document.getElementById('number-of-partitions');
        if (partitionInput) {
            partitionInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    // 분단 수가 입력되면 자동으로 저장되도록 (현재는 change 이벤트만 사용)
                    partitionInput.blur(); // 포커스 제거
                }
            });
            // 분단 수 변경 시 미리보기 업데이트
            partitionInput.addEventListener('change', () => {
                console.log('분단 수 변경:', partitionInput.value);
                // 현재 학생 수 가져오기
                this.updatePreviewForGenderCounts();
            });
            partitionInput.addEventListener('input', () => {
                // 실시간 업데이트
                this.updatePreviewForGenderCounts();
            });
        }
        // 결과 내보내기 버튼
        const exportBtn = document.getElementById('export-result');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }
        // 고정 좌석 모드 버튼
        const fixedModeBtn = document.getElementById('enable-fixed-seats');
        if (fixedModeBtn) {
            fixedModeBtn.addEventListener('click', () => {
                this.outputModule.showInfo('고정 좌석 모드: 캔버스의 좌석을 더블 클릭하여 고정/해제할 수 있습니다.');
            });
        }
        // 나머지 랜덤 배치 버튼
        const randomizeBtn = document.getElementById('randomize-remaining');
        if (randomizeBtn) {
            randomizeBtn.addEventListener('click', () => this.handleRandomizeRemaining());
        }
        // 양식 파일 다운로드 버튼
        const downloadTemplateBtn = document.getElementById('download-template');
        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', () => this.downloadTemplateFile());
        }
        // 엑셀 파일 업로드 버튼 (눌러서 파일 선택 트리거)
        const uploadFileBtn = document.getElementById('upload-file');
        if (uploadFileBtn) {
            uploadFileBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('upload-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
        // 엑셀 파일 업로드 입력 필드
        const uploadFileInput = document.getElementById('upload-file-input');
        if (uploadFileInput) {
            uploadFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        // 라디오 버튼 이벤트 리스너
        this.initializeRadioListeners();
        // 이벤트 위임을 사용하여 동적으로 생성되는 버튼들 처리
        document.addEventListener('click', (e) => {
            const target = e.target;
            // 자리 배치하기 버튼 클릭
            if (target.id === 'arrange-seats') {
                console.log('자리 배치하기 버튼 클릭됨');
                this.handleArrangeSeats();
            }
            // 자리 확정 버튼 클릭
            if (target.id === 'confirm-seats') {
                console.log('자리 확정 버튼 클릭됨');
                this.handleConfirmSeats();
            }
            // 확정된 자리 이력 드롭다운 버튼 클릭
            const dropdown = document.getElementById('history-dropdown-content');
            const dropdownContainer = document.getElementById('history-dropdown');
            if (target.id === 'history-dropdown-btn' || target.closest('#history-dropdown-btn')) {
                // 드롭다운 버튼 클릭 시 토글
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            }
            else if (dropdown && dropdownContainer) {
                // 드롭다운이 열려있고, 클릭된 요소가 드롭다운 내부가 아니면 닫기
                if (dropdown.style.display === 'block' && !dropdownContainer.contains(target)) {
                    dropdown.style.display = 'none';
                }
            }
            // 이력 항목 클릭
            if (target.classList.contains('history-item')) {
                const historyId = target.dataset.historyId;
                if (historyId) {
                    this.loadHistoryItem(historyId);
                }
            }
            // 행 추가 버튼 클릭
            if (target.id === 'add-student-row-btn') {
                this.handleAddStudentRow();
            }
            // 저장 버튼 클릭
            if (target.id === 'save-student-table-btn') {
                this.handleSaveStudentTable();
            }
            // 공유하기 버튼 클릭
            if (target.id === 'share-layout') {
                console.log('공유하기 버튼 클릭됨');
                this.handleShareLayout();
            }
            // 인쇄하기 버튼 클릭
            if (target.id === 'print-layout') {
                this.handlePrintLayout();
            }
            // 교탁용 인쇄하기 버튼 클릭
            if (target.id === 'print-layout-teacher') {
                this.handlePrintLayoutForTeacher();
            }
            // 되돌리기 버튼 클릭
            if (target.id === 'undo-layout') {
                this.handleUndoLayout();
            }
            // 저장하기 버튼 클릭
            if (target.id === 'save-layout') {
                this.handleSaveLayout();
            }
            // 사용설명서 버튼 클릭
            if (target.id === 'user-manual-btn') {
                this.showUserManual();
            }
            // 사이드바 토글 버튼 클릭
            if (target.id === 'sidebar-toggle-btn' || target.closest('#sidebar-toggle-btn')) {
                this.toggleSidebar();
            }
        });
        // 키보드 단축키: Ctrl+Z / Cmd+Z (되돌리기)
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z (Windows/Linux) 또는 Cmd+Z (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                // 입력 필드에 포커스가 있으면 기본 동작 허용 (텍스트 입력 되돌리기)
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    (activeElement.isContentEditable === true))) {
                    return; // 기본 동작 허용
                }
                e.preventDefault();
                this.handleUndoLayout();
            }
        });
    }
    /**
     * 라디오 버튼 이벤트 리스너 초기화
     */
    initializeRadioListeners() {
        // 배치 유형 라디오 버튼
        const layoutRadios = document.querySelectorAll('input[name="layout-type"]');
        // layout-type 변경 이벤트는 initializeEventListeners에서 처리하므로 여기서는 제거
        // 고정 좌석 모드 라디오 버튼
        const customModeRadios = document.querySelectorAll('input[name="custom-mode-2"]');
        customModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const target = e.target;
                if (target.value === 'fixed-random') {
                    // 고정 좌석 지정 후 랜덤 배치 모드 활성화
                    this.enableFixedSeatMode();
                }
                else {
                    // 일반 랜덤 배치 모드
                    this.disableFixedSeatMode();
                }
            });
        });
    }
    /**
     * 고정 좌석 모드 활성화
     * 기존 좌석 카드들에 클릭 이벤트를 다시 설정
     */
    enableFixedSeatMode() {
        console.log('고정 좌석 모드 활성화');
        // 고정 좌석 모드 도움말 표시
        const fixedSeatHelp = document.getElementById('fixed-seat-help');
        if (fixedSeatHelp) {
            fixedSeatHelp.style.display = 'block';
        }
        // 좌석 카드에 클릭 이벤트 추가 (이벤트 위임)
        const seatsArea = document.getElementById('seats-area');
        if (seatsArea) {
            seatsArea.style.cursor = 'pointer';
            seatsArea.addEventListener('click', this.handleSeatCardClick);
            // 기존 좌석 카드들에 스타일 및 시각적 표시 업데이트
            const cards = seatsArea.querySelectorAll('.student-seat-card');
            cards.forEach((card) => {
                const cardElement = card;
                const seatIdStr = cardElement.getAttribute('data-seat-id');
                if (seatIdStr) {
                    const seatId = parseInt(seatIdStr, 10);
                    cardElement.style.cursor = 'pointer';
                    // 이미 고정된 좌석인 경우 시각적 표시
                    if (this.fixedSeatIds.has(seatId)) {
                        cardElement.classList.add('fixed-seat');
                        cardElement.title = '고정 좌석 (클릭하여 해제)';
                        if (!cardElement.querySelector('.fixed-seat-lock')) {
                            const lockIcon = document.createElement('div');
                            lockIcon.className = 'fixed-seat-lock';
                            lockIcon.textContent = '🔒';
                            lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
                            cardElement.appendChild(lockIcon);
                        }
                    }
                    else {
                        cardElement.title = '클릭하여 고정 좌석 지정/해제';
                    }
                }
            });
        }
    }
    /**
     * 고정 좌석 모드 비활성화
     */
    disableFixedSeatMode() {
        console.log('고정 좌석 모드 비활성화');
        // 고정 좌석 모드 도움말 숨김
        const fixedSeatHelp = document.getElementById('fixed-seat-help');
        if (fixedSeatHelp) {
            fixedSeatHelp.style.display = 'none';
        }
        // 고정 좌석 초기화
        this.fixedSeatIds.clear();
        // 모든 좌석 카드에서 고정 표시 제거
        const fixedSeats = document.querySelectorAll('.student-seat-card.fixed-seat');
        fixedSeats.forEach(seat => {
            seat.classList.remove('fixed-seat');
            const lockIcon = seat.querySelector('.fixed-seat-lock');
            if (lockIcon) {
                lockIcon.remove();
            }
        });
        const seatsArea = document.getElementById('seats-area');
        if (seatsArea) {
            seatsArea.style.cursor = 'default';
            seatsArea.removeEventListener('click', this.handleSeatCardClick);
        }
    }
    /**
     * 최종 자리 배치도 렌더링
     */
    renderFinalLayout() {
        console.log('renderFinalLayout 시작');
        console.log('Students:', this.students);
        console.log('Seats:', this.seats);
        // 카드 컨테이너 표시
        const cardContainer = document.getElementById('card-layout-container');
        console.log('Card container:', cardContainer);
        if (!cardContainer) {
            console.error('카드 컨테이너를 찾을 수 없습니다.');
            return;
        }
        cardContainer.style.display = 'block';
        // 헤더 제목 변경
        const mainHeader = document.querySelector('.main-header h2');
        if (mainHeader) {
            mainHeader.textContent = '자리 배치도';
        }
        // 실제 학생 데이터로 카드 렌더링
        this.renderStudentCards(this.seats);
    }
    /**
     * 초기 예시 레이아웃 렌더링
     */
    renderInitialExampleLayout() {
        console.log('초기 예시 레이아웃 렌더링 시작');
        // 카드 컨테이너 표시
        const cardContainer = document.getElementById('card-layout-container');
        if (!cardContainer) {
            console.error('카드 컨테이너를 찾을 수 없습니다.');
            return;
        }
        cardContainer.style.display = 'block';
        // 학생 및 좌석 배열 초기화
        this.students = [];
        this.seats = [];
        // 좌석 번호를 1부터 시작하도록 초기화
        this.nextSeatId = 1;
        // 예시 좌석 생성 (24개)
        const exampleSeats = [];
        for (let i = 0; i < 24; i++) {
            const student = StudentModel.create(`학생${i + 1}`, (i % 2 === 0) ? 'M' : 'F');
            this.students.push(student);
            // 좌석 생성 (더미)
            const seat = {
                id: i + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            };
            exampleSeats.push(seat);
        }
        this.seats = exampleSeats;
        // 예시 카드 렌더링
        this.renderExampleCards();
    }
    /**
     * 예시 카드 렌더링
     */
    renderExampleCards() {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 기존 카드 제거
        seatsArea.innerHTML = '';
        // 좌석 번호를 1부터 시작하도록 초기화
        this.nextSeatId = 1;
        // 선택된 배치 형태 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked');
        const layoutType = layoutTypeInput?.value;
        const groupSizeInput = document.querySelector('input[name="group-size"]:checked');
        const groupSize = groupSizeInput ? groupSizeInput.value : '';
        // 분단 수 가져오기
        const partitionInput = document.getElementById('number-of-partitions');
        const partitionCount = partitionInput ? parseInt(partitionInput.value || '1', 10) : 1;
        // 모둠 배치인 경우
        console.log('renderExampleCards - layoutType:', layoutType, 'groupSize:', groupSize);
        if (layoutType === 'group' && (groupSize === 'group-3' || groupSize === 'group-4' || groupSize === 'group-5' || groupSize === 'group-6')) {
            console.log('모둠 배치 감지됨 - groupSize:', groupSize);
            const groupSizeNumber = groupSize === 'group-3' ? 3 : groupSize === 'group-4' ? 4 : groupSize === 'group-5' ? 5 : 6;
            // 예시 학생 데이터 생성 (this.students가 비어있을 경우)
            if (this.students.length === 0) {
                const maleCount = parseInt(document.getElementById('male-students')?.value || '0', 10);
                const femaleCount = parseInt(document.getElementById('female-students')?.value || '0', 10);
                const totalCount = maleCount + femaleCount;
                console.log('임시 학생 데이터 생성 - maleCount:', maleCount, 'femaleCount:', femaleCount, 'totalCount:', totalCount);
                // 임시 학생 데이터 생성
                const tempStudents = [];
                for (let i = 0; i < totalCount; i++) {
                    const gender = i < maleCount ? 'M' : 'F';
                    tempStudents.push({
                        id: i + 1,
                        name: gender === 'M' ? `남학생${i + 1}` : `여학생${i - maleCount + 1}`,
                        gender: gender
                    });
                }
                this.students = tempStudents;
                console.log('임시 학생 데이터 생성 완료 - students.length:', this.students.length);
            }
            // 모둠 배치로 렌더링
            const dummySeats = this.students.map((_, index) => ({
                id: index + 1,
                position: { x: 0, y: 0 },
                studentId: undefined,
                studentName: undefined,
                isFixed: false,
                isActive: true
            }));
            console.log('renderGroupCards 호출 전 - students.length:', this.students.length, 'dummySeats.length:', dummySeats.length);
            this.renderGroupCards(dummySeats, groupSizeNumber, seatsArea);
            return;
        }
        // 2명씩 짝꿍 배치인 경우
        if (layoutType === 'pair-uniform') {
            // seatsArea의 그리드 설정 먼저
            seatsArea.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
            seatsArea.style.gap = '10px 40px';
            // 분단 레이블을 각 컬럼에 직접 추가 (중첩 그리드 구조 제거)
            for (let i = 1; i <= partitionCount; i++) {
                const label = document.createElement('div');
                label.textContent = `${i}분단`;
                label.style.textAlign = 'center';
                label.style.fontWeight = 'bold';
                label.style.color = '#667eea';
                label.style.fontSize = '0.9em';
                label.style.marginBottom = '5px';
                // 각 레이블이 해당 분단 컬럼에 직접 배치되도록 grid-column 지정 안함 (자동으로 배치됨)
                seatsArea.appendChild(label);
            }
            // 선택된 짝꿍 모드 확인
            const pairModeInput = document.querySelector('input[name="pair-mode"]:checked');
            const pairMode = pairModeInput?.value || 'gender-pair'; // 기본값: 남녀 짝꿍
            console.log('짝꿍 모드:', pairMode);
            if (pairMode === 'same-gender-pair') {
                // 같은 성끼리 짝꿍하기: 각 행에서 분단을 넘나들며 같은 성별끼리 짝꿍
                // 성별별로 학생 분류
                const maleStudents = this.students.filter(s => s.gender === 'M');
                const femaleStudents = this.students.filter(s => s.gender === 'F');
                const studentsPerPartition = Math.ceil(this.students.length / partitionCount);
                const rowsPerPartition = Math.ceil(studentsPerPartition / 2);
                let maleIndex = 0;
                let femaleIndex = 0;
                // 가로로 배치 (각 행을 분단별로 채움)
                for (let row = 0; row < rowsPerPartition; row++) {
                    for (let partition = 0; partition < partitionCount; partition++) {
                        const pairContainer = document.createElement('div');
                        pairContainer.style.display = 'flex';
                        pairContainer.style.gap = '0px';
                        pairContainer.style.width = '100%';
                        pairContainer.style.justifyContent = 'center';
                        // 각 행마다 올바른 패턴으로 배치
                        // 첫 번째 행: 남남 -> 여여 -> 남남
                        // 두 번째 행: 여여 -> 남남 -> 여여  
                        // 세 번째 행: 남남 -> 여여 -> 남남
                        // 네 번째 행: 여여 -> 남남 -> 여여
                        const shouldBeMale = (row + partition) % 2 === 0;
                        if (shouldBeMale) {
                            // 남학생 짝꿍
                            if (maleIndex < maleStudents.length) {
                                const card1 = this.createStudentCard(maleStudents[maleIndex], this.students.indexOf(maleStudents[maleIndex]));
                                pairContainer.appendChild(card1);
                                maleIndex++;
                                if (maleIndex < maleStudents.length) {
                                    const card2 = this.createStudentCard(maleStudents[maleIndex], this.students.indexOf(maleStudents[maleIndex]));
                                    pairContainer.appendChild(card2);
                                    maleIndex++;
                                }
                            }
                        }
                        else {
                            // 여학생 짝꿍
                            if (femaleIndex < femaleStudents.length) {
                                const card1 = this.createStudentCard(femaleStudents[femaleIndex], this.students.indexOf(femaleStudents[femaleIndex]));
                                pairContainer.appendChild(card1);
                                femaleIndex++;
                                if (femaleIndex < femaleStudents.length) {
                                    const card2 = this.createStudentCard(femaleStudents[femaleIndex], this.students.indexOf(femaleStudents[femaleIndex]));
                                    pairContainer.appendChild(card2);
                                    femaleIndex++;
                                }
                            }
                        }
                        seatsArea.appendChild(pairContainer);
                    }
                }
            }
            else {
                // 남녀 짝꿍 하기인 경우 - 명확하게 남녀 교대로 짝꿍 + 남은 남자 처리
                const maleStudents = this.students.filter(s => s.gender === 'M');
                const femaleStudents = this.students.filter(s => s.gender === 'F');
                // 1단계: 남녀 짝꿍 생성
                const genderPairs = Math.min(maleStudents.length, femaleStudents.length);
                let maleIndex = 0;
                let femaleIndex = 0;
                // 남녀 짝꿍 배치를 위한 배열 생성
                const pairs = [];
                for (let i = 0; i < genderPairs; i++) {
                    pairs.push({
                        male: maleStudents[maleIndex++],
                        female: femaleStudents[femaleIndex++]
                    });
                }
                // 2단계: 남은 남자 학생 처리
                const remainingMales = maleStudents.length - genderPairs;
                if (remainingMales > 0) {
                    // 남은 남자 수가 짝수면 남자끼리 짝꿍
                    // 홀수면 (남은 수 - 1)명끼리 짝꿍 + 1명 혼자 배치
                    const malePairs = Math.floor(remainingMales / 2);
                    const singleMale = remainingMales % 2;
                    // 남자끼리 짝꿍 추가 (한 쌍에 남자 2명)
                    for (let i = 0; i < malePairs; i++) {
                        pairs.push({
                            male: maleStudents[maleIndex++],
                            female: maleStudents[maleIndex++] // 남자끼리 짝꿍이므로 두 번째도 남자
                        });
                    }
                    // 혼자 배치되는 남자 1명 추가
                    if (singleMale === 1) {
                        pairs.push({
                            male: maleStudents[maleIndex++],
                            female: null
                        });
                    }
                }
                // 3단계: 전체 짝꿍을 분단별로 배치
                const rowsPerPartition = Math.ceil(pairs.length / partitionCount);
                let pairIndex = 0;
                for (let row = 0; row < rowsPerPartition; row++) {
                    if (pairIndex >= pairs.length)
                        break; // 외부 루프도 종료
                    for (let partition = 0; partition < partitionCount; partition++) {
                        if (pairIndex >= pairs.length)
                            break;
                        const pair = pairs[pairIndex++];
                        const pairContainer = document.createElement('div');
                        pairContainer.style.display = 'flex';
                        pairContainer.style.gap = '0px';
                        pairContainer.style.width = '100%';
                        pairContainer.style.justifyContent = 'center';
                        if (pair.male) {
                            const card1 = this.createStudentCard(pair.male, this.students.indexOf(pair.male));
                            pairContainer.appendChild(card1);
                        }
                        if (pair.female) {
                            const card2 = this.createStudentCard(pair.female, this.students.indexOf(pair.female));
                            pairContainer.appendChild(card2);
                        }
                        seatsArea.appendChild(pairContainer);
                    }
                }
            }
        }
        else {
            // '1명씩 한 줄로 배치' - 선택된 모드에 따라 배치
            // seatsArea의 그리드 설정 먼저
            seatsArea.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
            seatsArea.style.gap = '5px 10px'; // 카드 간 좁은 간격 (세로 5px, 가로 10px)
            seatsArea.style.justifyItems = 'center'; // 각 분단 컬럼 내에서 중앙 정렬
            // 분단 레이블을 각 컬럼에 직접 추가 (중첩 그리드 구조 제거)
            for (let i = 1; i <= partitionCount; i++) {
                const label = document.createElement('div');
                label.textContent = `${i}분단`;
                label.style.textAlign = 'center';
                label.style.fontWeight = 'bold';
                label.style.color = '#667eea';
                label.style.fontSize = '0.9em';
                label.style.marginBottom = '5px';
                label.style.width = '100%'; // 레이블이 컬럼 전체 너비를 차지하도록
                // 각 레이블이 해당 분단 컬럼에 직접 배치되도록 grid-column 지정 안함 (자동으로 배치됨)
                seatsArea.appendChild(label);
            }
            // 선택된 배치 모드 확인
            const singleModeInput = document.querySelector('input[name="single-mode"]:checked');
            const singleMode = singleModeInput ? singleModeInput.value : 'basic-row';
            // '남녀 순서 바꾸기' 체크박스 상태 확인
            const reverseGenderOrderCheckbox = document.getElementById('reverse-gender-order');
            const reverseGenderOrder = reverseGenderOrderCheckbox ? reverseGenderOrderCheckbox.checked : false;
            // 남학생과 여학생 분리
            let maleStudents = this.students.filter(s => s.gender === 'M');
            let femaleStudents = this.students.filter(s => s.gender === 'F');
            // '남녀 순서 바꾸기'가 체크되면 남학생과 여학생 배열을 교환
            if (reverseGenderOrder) {
                [maleStudents, femaleStudents] = [femaleStudents, maleStudents];
            }
            if (singleMode === 'basic-row') {
                // '기본 1줄 배치' 모드
                // 각 행에서 분단 순서대로 남학생과 여학생을 교대로 순차적으로 배치
                // 홀수 분단(1, 3, 5, ...): 홀수 행에서 남학생, 짝수 행에서 여학생
                // 짝수 분단(2, 4, 6, ...): 홀수 행에서 여학생, 짝수 행에서 남학생
                // 전체 학생 수를 고려하여 필요한 행 수 계산
                const totalStudents = maleStudents.length + femaleStudents.length;
                const studentsPerRow = partitionCount; // 각 행당 분단 수만큼의 학생
                const totalRows = Math.ceil(totalStudents / studentsPerRow);
                let maleIndex = 0;
                let femaleIndex = 0;
                for (let row = 0; row < totalRows; row++) {
                    for (let partition = 0; partition < partitionCount; partition++) {
                        const partitionNumber = partition + 1; // 1-based 분단 번호
                        const isOddPartition = partitionNumber % 2 === 1; // 홀수 분단인지 확인
                        const isOddRow = row % 2 === 0; // 0-based이므로 row % 2 === 0이 홀수 행
                        if (isOddPartition) {
                            // 홀수 분단: 홀수 행에서 남학생, 짝수 행에서 여학생
                            if (isOddRow) {
                                // 홀수 행: 남학생 배치
                                if (maleIndex < maleStudents.length) {
                                    const card = this.createStudentCard(maleStudents[maleIndex], this.students.indexOf(maleStudents[maleIndex]));
                                    card.style.width = '100%';
                                    card.style.maxWidth = '120px';
                                    card.style.margin = '0 auto';
                                    seatsArea.appendChild(card);
                                    maleIndex++;
                                }
                            }
                            else {
                                // 짝수 행: 여학생 배치
                                if (femaleIndex < femaleStudents.length) {
                                    const card = this.createStudentCard(femaleStudents[femaleIndex], this.students.indexOf(femaleStudents[femaleIndex]));
                                    card.style.width = '100%';
                                    card.style.maxWidth = '120px';
                                    card.style.margin = '0 auto';
                                    seatsArea.appendChild(card);
                                    femaleIndex++;
                                }
                            }
                        }
                        else {
                            // 짝수 분단: 홀수 행에서 여학생, 짝수 행에서 남학생
                            if (isOddRow) {
                                // 홀수 행: 여학생 배치
                                if (femaleIndex < femaleStudents.length) {
                                    const card = this.createStudentCard(femaleStudents[femaleIndex], this.students.indexOf(femaleStudents[femaleIndex]));
                                    card.style.width = '100%';
                                    card.style.maxWidth = '120px';
                                    card.style.margin = '0 auto';
                                    seatsArea.appendChild(card);
                                    femaleIndex++;
                                }
                            }
                            else {
                                // 짝수 행: 남학생 배치
                                if (maleIndex < maleStudents.length) {
                                    const card = this.createStudentCard(maleStudents[maleIndex], this.students.indexOf(maleStudents[maleIndex]));
                                    card.style.width = '100%';
                                    card.style.maxWidth = '120px';
                                    card.style.margin = '0 auto';
                                    seatsArea.appendChild(card);
                                    maleIndex++;
                                }
                            }
                        }
                    }
                }
            }
            else if (singleMode === 'gender-row') {
                // '남녀 1줄 배치' 모드 - 세로(열) 방향으로 배치
                // 홀수 분단(1, 3, 5, ...): 남학생을 세로로 순차적으로 배치
                // 짝수 분단(2, 4, 6, ...): 여학생을 세로로 순차적으로 배치
                // 마지막 분단이 홀수일 경우: 남학생 먼저 세로로, 그 다음 여학생 세로로
                // 예: 남학생 12명, 여학생 12명, 5분단
                // 1분단: 남1, 남2, 남3, 남4, 남5 (세로로)
                // 2분단: 여1, 여2, 여3, 여4, 여5 (세로로)
                // 3분단: 남6, 남7, 남8, 남9, 남10 (세로로)
                // 4분단: 여6, 여7, 여8, 여9, 여10 (세로로)
                // 5분단: 남11, 남12, 여11, 여12 (세로로)
                // 
                // 그리드 레이아웃에서 세로 방향 배치를 위해서는 각 분단의 모든 학생을 먼저 배치해야 함
                // 각 분단별로 컨테이너를 만들거나, 행 단위로 배치해야 함
                const isLastPartitionOdd = partitionCount % 2 === 1; // 마지막 분단이 홀수인지 확인
                // 마지막 분단 제외한 홀수 분단 수와 짝수 분단 수 계산
                const regularPartitionCount = partitionCount - 1;
                const regularOddPartitionCount = Math.ceil(regularPartitionCount / 2); // 홀수 분단 수 (1, 3, 5, ...)
                const regularEvenPartitionCount = Math.floor(regularPartitionCount / 2); // 짝수 분단 수 (2, 4, 6, ...)
                // 각 분단당 배치할 학생 수 계산
                // 마지막 분단을 제외한 분단에 균등하게 배치하고, 마지막 분단에 나머지 배치
                const maleStudentsPerOddPartition = regularOddPartitionCount > 0
                    ? Math.floor(maleStudents.length / (regularOddPartitionCount + 1)) + 1
                    : 0;
                const femaleStudentsPerEvenPartition = regularEvenPartitionCount > 0
                    ? Math.floor(femaleStudents.length / (regularEvenPartitionCount + 1)) + 1
                    : 0;
                // 각 분단별 학생 배열을 먼저 구성
                const partitionStudents = [];
                for (let partition = 0; partition < partitionCount; partition++) {
                    partitionStudents.push([]);
                }
                let maleIndex = 0;
                let femaleIndex = 0;
                // 각 분단별로 학생을 배열에 추가
                for (let partition = 0; partition < partitionCount; partition++) {
                    const partitionNumber = partition + 1; // 1-based 분단 번호
                    const isOddPartition = partitionNumber % 2 === 1; // 홀수 분단인지 확인
                    const isLastPartition = partition === partitionCount - 1; // 마지막 분단인지 확인
                    if (isLastPartition && isLastPartitionOdd) {
                        // 마지막 분단이 홀수일 경우: 남학생 먼저 세로로, 그 다음 여학생 세로로
                        // 남학생 배치 (나머지 모두 세로로)
                        while (maleIndex < maleStudents.length) {
                            partitionStudents[partition].push({
                                student: maleStudents[maleIndex],
                                index: this.students.indexOf(maleStudents[maleIndex])
                            });
                            maleIndex++;
                        }
                        // 여학생 배치 (나머지 모두 세로로)
                        while (femaleIndex < femaleStudents.length) {
                            partitionStudents[partition].push({
                                student: femaleStudents[femaleIndex],
                                index: this.students.indexOf(femaleStudents[femaleIndex])
                            });
                            femaleIndex++;
                        }
                    }
                    else if (isLastPartition && !isLastPartitionOdd) {
                        // 마지막 분단이 짝수일 경우: 여학생 먼저 세로로, 그 다음 남학생 세로로
                        // 여학생 배치 (나머지 모두 세로로)
                        while (femaleIndex < femaleStudents.length) {
                            partitionStudents[partition].push({
                                student: femaleStudents[femaleIndex],
                                index: this.students.indexOf(femaleStudents[femaleIndex])
                            });
                            femaleIndex++;
                        }
                        // 남학생 배치 (나머지 모두 세로로)
                        while (maleIndex < maleStudents.length) {
                            partitionStudents[partition].push({
                                student: maleStudents[maleIndex],
                                index: this.students.indexOf(maleStudents[maleIndex])
                            });
                            maleIndex++;
                        }
                    }
                    else if (isOddPartition) {
                        // 홀수 분단: 남학생을 세로로 배치
                        const currentOddPartitionIndex = Math.floor(partition / 2); // 현재 홀수 분단의 인덱스 (0, 1, 2, ...)
                        const startIndex = currentOddPartitionIndex * maleStudentsPerOddPartition;
                        const endIndex = Math.min(startIndex + maleStudentsPerOddPartition, maleStudents.length);
                        for (let i = startIndex; i < endIndex; i++) {
                            partitionStudents[partition].push({
                                student: maleStudents[i],
                                index: this.students.indexOf(maleStudents[i])
                            });
                            maleIndex++;
                        }
                    }
                    else {
                        // 짝수 분단: 여학생을 세로로 배치
                        const currentEvenPartitionIndex = Math.floor((partition - 1) / 2); // 현재 짝수 분단의 인덱스 (0, 1, 2, ...)
                        const startIndex = currentEvenPartitionIndex * femaleStudentsPerEvenPartition;
                        const endIndex = Math.min(startIndex + femaleStudentsPerEvenPartition, femaleStudents.length);
                        for (let i = startIndex; i < endIndex; i++) {
                            partitionStudents[partition].push({
                                student: femaleStudents[i],
                                index: this.students.indexOf(femaleStudents[i])
                            });
                            femaleIndex++;
                        }
                    }
                }
                // 각 분단의 학생들을 세로 방향으로 배치 (행 단위로 배치)
                // 최대 행 수 계산
                const maxRows = Math.max(...partitionStudents.map(students => students.length));
                // 각 행별로 배치 (세로 방향)
                for (let row = 0; row < maxRows; row++) {
                    for (let partition = 0; partition < partitionCount; partition++) {
                        if (row < partitionStudents[partition].length) {
                            const { student, index } = partitionStudents[partition][row];
                            const card = this.createStudentCard(student, index);
                            card.style.width = '100%';
                            card.style.maxWidth = '120px';
                            card.style.margin = '0 auto';
                            seatsArea.appendChild(card);
                        }
                    }
                }
            }
            else if (singleMode === 'gender-symmetric-row') {
                // '남녀 대칭 1줄 배치' 모드 - 세로(열) 방향으로 배치
                // 남학생을 먼저 앞쪽 분단부터 순차적으로 배치
                // 남학생이 다 배치되면 여학생을 나머지 자리에 배치
                // 예: 남학생 12명, 여학생 12명, 5분단
                // 1분단: 남1, 남2, 남3, 남4, 남5 (5명)
                // 2분단: 남6, 남7, 남8, 남9, 남10 (5명)
                // 3분단: 남11, 남12, 여1, 여2, 여3 (5명)
                // 4분단: 여4, 여5, 여6, 여7, 여8 (5명)
                // 5분단: 여9, 여10, 여11, 여12 (4명)
                const totalStudents = maleStudents.length + femaleStudents.length;
                const studentsPerPartition = Math.ceil(totalStudents / partitionCount);
                // 각 분단별 학생 배열을 먼저 구성
                const partitionStudents = [];
                for (let partition = 0; partition < partitionCount; partition++) {
                    partitionStudents.push([]);
                }
                let maleIndex = 0;
                let femaleIndex = 0;
                // 먼저 남학생을 앞쪽 분단부터 순차적으로 배치
                for (let partition = 0; partition < partitionCount; partition++) {
                    // 각 분단의 최대 용량 계산
                    const remainingStudents = totalStudents - (maleIndex + femaleIndex);
                    const remainingPartitions = partitionCount - partition;
                    const maxCapacity = partition === partitionCount - 1
                        ? remainingStudents
                        : Math.min(studentsPerPartition, remainingStudents);
                    // 남학생을 먼저 배치
                    while (maleIndex < maleStudents.length && partitionStudents[partition].length < maxCapacity) {
                        partitionStudents[partition].push({
                            student: maleStudents[maleIndex],
                            index: this.students.indexOf(maleStudents[maleIndex])
                        });
                        maleIndex++;
                    }
                }
                // 남학생이 다 배치된 후, 여학생을 나머지 자리에 배치
                for (let partition = 0; partition < partitionCount; partition++) {
                    const remainingStudents = totalStudents - (maleIndex + femaleIndex);
                    const remainingPartitions = partitionCount - partition;
                    const maxCapacity = partition === partitionCount - 1
                        ? remainingStudents
                        : Math.min(studentsPerPartition, remainingStudents);
                    // 여학생을 나머지 자리에 배치
                    while (femaleIndex < femaleStudents.length && partitionStudents[partition].length < maxCapacity) {
                        partitionStudents[partition].push({
                            student: femaleStudents[femaleIndex],
                            index: this.students.indexOf(femaleStudents[femaleIndex])
                        });
                        femaleIndex++;
                    }
                }
                // 각 분단의 학생들을 세로 방향으로 배치 (행 단위로 배치)
                // 최대 행 수 계산
                const maxRows = Math.max(...partitionStudents.map(students => students.length));
                // 각 행별로 배치 (세로 방향)
                for (let row = 0; row < maxRows; row++) {
                    for (let partition = 0; partition < partitionCount; partition++) {
                        if (row < partitionStudents[partition].length) {
                            const { student, index } = partitionStudents[partition][row];
                            const card = this.createStudentCard(student, index);
                            card.style.width = '100%';
                            card.style.maxWidth = '120px';
                            card.style.margin = '0 auto';
                            seatsArea.appendChild(card);
                        }
                    }
                }
            }
            else {
                // 기존 로직 (다른 모드가 추가될 경우를 위해)
                // 각 분단별 행 수 계산
                const rowsPerPartition = Math.ceil(maleStudents.length / partitionCount);
                // 각 행별로 배치
                for (let row = 0; row < rowsPerPartition; row++) {
                    // 각 분단의 남학생과 여학생을 교대로 배치
                    for (let partition = 0; partition < partitionCount; partition++) {
                        const maleIndex = row * partitionCount + partition;
                        const femaleIndex = row * partitionCount + partition;
                        // 남학생 카드 배치
                        if (maleIndex < maleStudents.length) {
                            const card = this.createStudentCard(maleStudents[maleIndex], this.students.indexOf(maleStudents[maleIndex]));
                            // 카드 너비를 일정하게 설정하여 분단 이름과 정렬되도록
                            card.style.width = '100%';
                            card.style.maxWidth = '120px'; // 최대 너비 제한
                            card.style.margin = '0 auto'; // 중앙 정렬
                            seatsArea.appendChild(card);
                        }
                        // 여학생 카드 배치
                        if (femaleIndex < femaleStudents.length) {
                            const card = this.createStudentCard(femaleStudents[femaleIndex], this.students.indexOf(femaleStudents[femaleIndex]));
                            // 카드 너비를 일정하게 설정하여 분단 이름과 정렬되도록
                            card.style.width = '100%';
                            card.style.maxWidth = '120px'; // 최대 너비 제한
                            card.style.margin = '0 auto'; // 중앙 정렬
                            seatsArea.appendChild(card);
                        }
                    }
                }
            }
        }
    }
    /**
     * 학생 카드 생성 헬퍼 메서드
     */
    createStudentCard(student, index) {
        const card = document.createElement('div');
        card.className = 'student-seat-card';
        card.setAttribute('draggable', 'true');
        // 좌석 고유 ID 부여
        const seatId = this.nextSeatId++;
        card.setAttribute('data-seat-id', seatId.toString());
        // 좌석 번호 표시 (좌측 상단)
        const seatNumberDiv = document.createElement('div');
        seatNumberDiv.className = 'seat-number-label';
        seatNumberDiv.textContent = `#${seatId}`;
        seatNumberDiv.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            font-size: 0.8em;
            font-weight: bold;
            color: #667eea;
            background: rgba(255, 255, 255, 0.9);
            padding: 2px 6px;
            border-radius: 4px;
            z-index: 5;
        `;
        card.appendChild(seatNumberDiv);
        const nameDiv = document.createElement('div');
        nameDiv.className = 'student-name';
        nameDiv.textContent = student.name;
        nameDiv.style.display = 'flex';
        nameDiv.style.alignItems = 'center';
        nameDiv.style.justifyContent = 'center';
        nameDiv.style.height = '100%';
        nameDiv.style.width = '100%';
        // 성별에 따라 클래스 추가
        if (student.gender === 'M') {
            card.classList.add('gender-m');
        }
        else {
            card.classList.add('gender-f');
        }
        card.appendChild(nameDiv);
        // 이미 고정된 좌석인 경우 시각적 표시
        if (this.fixedSeatIds.has(seatId)) {
            card.classList.add('fixed-seat');
            card.title = '고정 좌석 (클릭하여 해제)';
            // 🔒 아이콘 추가
            const lockIcon = document.createElement('div');
            lockIcon.className = 'fixed-seat-lock';
            lockIcon.textContent = '🔒';
            lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
            card.appendChild(lockIcon);
        }
        // 고정 좌석 모드일 때 클릭 이벤트 추가
        this.setupFixedSeatClickHandler(card, seatId);
        return card;
    }
    /**
     * 좌석 카드 드래그&드롭 스왑 기능 활성화 (이벤트 위임)
     */
    enableSeatSwapDragAndDrop() {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // dragstart
        seatsArea.addEventListener('dragstart', (ev) => {
            const e = ev;
            const target = e.target?.closest('.student-seat-card');
            if (!target)
                return;
            // 자리 배치가 완료되었는지 확인 (액션 버튼이 표시되어 있으면 배치 완료 상태)
            const actionButtons = document.getElementById('layout-action-buttons');
            const isLayoutComplete = actionButtons && actionButtons.style.display !== 'none';
            // 배치가 완료되지 않은 상태에서 고정 좌석 모드가 활성화되어 있으면 드래그 비활성화
            // (미리보기 단계에서 좌석을 클릭해서 고정할 수 있도록)
            if (!isLayoutComplete) {
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
                if (fixedRandomMode) {
                    e.preventDefault();
                    return;
                }
            }
            // 고정 좌석은 드래그 불가
            if (target.classList.contains('fixed-seat')) {
                e.preventDefault();
                return;
            }
            this.dragSourceCard = target;
            try {
                e.dataTransfer?.setData('text/plain', 'swap');
            }
            catch { }
            if (e.dataTransfer)
                e.dataTransfer.effectAllowed = 'move';
        });
        // dragend - 드래그가 끝나면 dragSourceCard 초기화 (드롭되지 않은 경우 대비)
        seatsArea.addEventListener('dragend', () => {
            // 모든 하이라이트 및 인디케이터 제거
            seatsArea.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
            seatsArea.classList.remove('drag-over-area');
            if (this.dragOverIndicator) {
                this.dragOverIndicator.remove();
                this.dragOverIndicator = null;
            }
            this.dragSourceCard = null;
        });
        // dragover - 빈 공간과 카드 모두에서 드롭 가능하도록
        seatsArea.addEventListener('dragover', (ev) => {
            const e = ev;
            if (this.dragSourceCard) {
                e.preventDefault();
                if (e.dataTransfer)
                    e.dataTransfer.dropEffect = 'move';
                // 기존 하이라이트 및 인디케이터 제거
                seatsArea.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                if (this.dragOverIndicator) {
                    this.dragOverIndicator.remove();
                    this.dragOverIndicator = null;
                }
                // 마우스 위치 기반으로 드롭 위치 계산
                const seatsAreaRect = seatsArea.getBoundingClientRect();
                const mouseX = e.clientX - seatsAreaRect.left;
                const mouseY = e.clientY - seatsAreaRect.top;
                // 모든 카드 가져오기 (분단 레이블 제외)
                const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card'));
                const cardsOnly = allCards.filter(card => card !== this.dragSourceCard &&
                    !card.classList.contains('partition-label') &&
                    !card.closest('.labels-row'));
                // 마우스 위치에서 가장 가까운 카드 찾기
                let closestCard = null;
                let minDistance = Infinity;
                let insertPosition = 'on';
                for (const card of cardsOnly) {
                    const cardRect = card.getBoundingClientRect();
                    const cardX = cardRect.left - seatsAreaRect.left + cardRect.width / 2;
                    const cardY = cardRect.top - seatsAreaRect.top + cardRect.height / 2;
                    // 카드 영역 내부인지 확인
                    const cardLeft = cardRect.left - seatsAreaRect.left;
                    const cardRight = cardRect.right - seatsAreaRect.left;
                    const cardTop = cardRect.top - seatsAreaRect.top;
                    const cardBottom = cardRect.bottom - seatsAreaRect.top;
                    if (mouseX >= cardLeft && mouseX <= cardRight &&
                        mouseY >= cardTop && mouseY <= cardBottom) {
                        // 카드 위에 마우스가 있으면 카드 하이라이트
                        closestCard = card;
                        insertPosition = 'on';
                        break;
                    }
                    // 카드 근처 거리 계산
                    const distance = Math.sqrt(Math.pow(mouseX - cardX, 2) + Math.pow(mouseY - cardY, 2));
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCard = card;
                        // 드롭 위치가 카드보다 위쪽이면 앞에, 아래쪽이면 뒤에
                        if (mouseY < cardY - cardRect.height / 4) {
                            insertPosition = 'before';
                        }
                        else if (mouseY > cardY + cardRect.height / 4) {
                            insertPosition = 'after';
                        }
                        else {
                            // 수평 위치로 판단
                            if (mouseX < cardX) {
                                insertPosition = 'before';
                            }
                            else {
                                insertPosition = 'after';
                            }
                        }
                    }
                }
                // 시각적 피드백 제공
                if (closestCard) {
                    if (insertPosition === 'on') {
                        // 카드 위에 마우스가 있으면 카드 하이라이트
                        closestCard.classList.add('drag-over');
                    }
                    else {
                        // 카드 앞/뒤에 삽입 인디케이터 표시
                        this.showInsertIndicator(closestCard, insertPosition);
                    }
                }
                else {
                    // 빈 공간에 드롭할 경우 seats-area에 하이라이트
                    seatsArea.classList.add('drag-over-area');
                }
            }
        });
        // dragleave - 하이라이트 제거
        seatsArea.addEventListener('dragleave', (ev) => {
            const e = ev;
            // seats-area를 완전히 벗어난 경우에만 하이라이트 제거
            const relatedTarget = e.relatedTarget;
            if (!relatedTarget || !seatsArea.contains(relatedTarget)) {
                seatsArea.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                seatsArea.classList.remove('drag-over-area');
                if (this.dragOverIndicator) {
                    this.dragOverIndicator.remove();
                    this.dragOverIndicator = null;
                }
            }
        });
        // drop -> 카드 교환 또는 이동
        seatsArea.addEventListener('drop', (ev) => {
            const e = ev;
            e.preventDefault();
            // 하이라이트 및 인디케이터 제거
            seatsArea.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
            seatsArea.classList.remove('drag-over-area');
            if (this.dragOverIndicator) {
                this.dragOverIndicator.remove();
                this.dragOverIndicator = null;
            }
            const source = this.dragSourceCard;
            this.dragSourceCard = null;
            if (!source)
                return;
            // 타겟이 카드인지 확인 (더 정확한 감지)
            let targetCard = null;
            const targetElement = e.target;
            // target이 카드 자체이거나, 카드의 자식 요소인 경우
            if (targetElement) {
                if (targetElement.classList.contains('student-seat-card')) {
                    targetCard = targetElement;
                }
                else {
                    targetCard = targetElement.closest('.student-seat-card');
                }
            }
            // 카드에 직접 드롭한 경우: 교환
            if (targetCard && targetCard !== source) {
                // 고정 좌석은 교환 불가
                if (targetCard.classList.contains('fixed-seat') || source.classList.contains('fixed-seat'))
                    return;
                const srcNameEl = source.querySelector('.student-name');
                const tgtNameEl = targetCard.querySelector('.student-name');
                if (!srcNameEl || !tgtNameEl)
                    return;
                // 이름 스왑
                const tmpName = srcNameEl.textContent || '';
                srcNameEl.textContent = tgtNameEl.textContent || '';
                tgtNameEl.textContent = tmpName;
                // 성별 배경 클래스 스왑
                const srcIsM = source.classList.contains('gender-m');
                const srcIsF = source.classList.contains('gender-f');
                const tgtIsM = targetCard.classList.contains('gender-m');
                const tgtIsF = targetCard.classList.contains('gender-f');
                source.classList.toggle('gender-m', tgtIsM);
                source.classList.toggle('gender-f', tgtIsF);
                targetCard.classList.toggle('gender-m', srcIsM);
                targetCard.classList.toggle('gender-f', srcIsF);
            }
            else {
                // 빈 공간에 드롭: 이동
                // 드롭 위치 계산 (마우스 좌표 사용)
                const seatsAreaRect = seatsArea.getBoundingClientRect();
                const dropX = e.clientX - seatsAreaRect.left;
                const dropY = e.clientY - seatsAreaRect.top;
                // 모든 카드 가져오기 (분단 레이블 제외)
                const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card'));
                const cardsOnly = allCards.filter(card => card !== source &&
                    !card.classList.contains('partition-label') &&
                    !card.closest('.labels-row'));
                if (cardsOnly.length === 0) {
                    // 다른 카드가 없으면 그냥 추가
                    seatsArea.appendChild(source);
                    return;
                }
                // 가장 가까운 카드 찾기
                let closestCard = null;
                let minDistance = Infinity;
                let insertPosition = 'after';
                for (const card of cardsOnly) {
                    const cardRect = card.getBoundingClientRect();
                    const cardX = cardRect.left - seatsAreaRect.left + cardRect.width / 2;
                    const cardY = cardRect.top - seatsAreaRect.top + cardRect.height / 2;
                    const distance = Math.sqrt(Math.pow(dropX - cardX, 2) + Math.pow(dropY - cardY, 2));
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCard = card;
                        // 드롭 위치가 카드보다 위쪽이면 앞에, 아래쪽이면 뒤에
                        if (dropY < cardY - cardRect.height / 4) {
                            insertPosition = 'before';
                        }
                        else if (dropY > cardY + cardRect.height / 4) {
                            insertPosition = 'after';
                        }
                        else {
                            // 수평 위치로 판단
                            if (dropX < cardX) {
                                insertPosition = 'before';
                            }
                            else {
                                insertPosition = 'after';
                            }
                        }
                    }
                }
                // 카드 이동
                if (closestCard) {
                    if (insertPosition === 'before') {
                        seatsArea.insertBefore(source, closestCard);
                    }
                    else {
                        // 다음 형제가 있으면 그 앞에, 없으면 맨 끝에
                        const nextSibling = closestCard.nextElementSibling;
                        if (nextSibling && nextSibling.classList.contains('student-seat-card')) {
                            seatsArea.insertBefore(source, nextSibling);
                        }
                        else {
                            seatsArea.insertBefore(source, closestCard.nextSibling);
                        }
                    }
                }
                else {
                    seatsArea.appendChild(source);
                }
            }
            // 드래그&드롭 완료 후 히스토리 저장 (약간의 지연을 두어 DOM 업데이트 완료 후 저장)
            setTimeout(() => {
                this.saveLayoutToHistory();
            }, 50);
        });
    }
    /**
     * 드롭 위치 삽입 인디케이터 표시
     */
    showInsertIndicator(card, position) {
        // 기존 인디케이터 제거
        if (this.dragOverIndicator) {
            this.dragOverIndicator.remove();
        }
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 인디케이터 생성
        const indicator = document.createElement('div');
        indicator.className = 'drag-insert-indicator';
        indicator.style.position = 'absolute';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '1000';
        const cardRect = card.getBoundingClientRect();
        const seatsAreaRect = seatsArea.getBoundingClientRect();
        // seats-area가 relative 포지션이 아니면 설정
        const currentPosition = window.getComputedStyle(seatsArea).position;
        if (currentPosition === 'static') {
            seatsArea.style.position = 'relative';
        }
        if (position === 'before') {
            // 카드 앞에 표시
            indicator.style.top = `${cardRect.top - seatsAreaRect.top - 3}px`;
            indicator.style.left = `${cardRect.left - seatsAreaRect.left}px`;
            indicator.style.width = `${cardRect.width}px`;
            indicator.style.height = '4px';
        }
        else {
            // 카드 뒤에 표시
            indicator.style.top = `${cardRect.bottom - seatsAreaRect.top + 3}px`;
            indicator.style.left = `${cardRect.left - seatsAreaRect.left}px`;
            indicator.style.width = `${cardRect.width}px`;
            indicator.style.height = '4px';
        }
        seatsArea.appendChild(indicator);
        this.dragOverIndicator = indicator;
    }
    /**
     * 현재 상태를 히스토리에 저장 (통합 히스토리 시스템)
     */
    saveToHistory(type, data) {
        // 현재 인덱스 이후의 히스토리 제거 (새로운 상태가 추가되면 이후 히스토리는 삭제)
        if (this.historyIndex < this.layoutHistory.length - 1) {
            this.layoutHistory = this.layoutHistory.slice(0, this.historyIndex + 1);
        }
        // 새 상태 추가
        this.layoutHistory.push({ type, data });
        // 히스토리 크기 제한 (최대 100개)
        if (this.layoutHistory.length > 100) {
            this.layoutHistory.shift();
        }
        else {
            this.historyIndex++;
        }
        // 되돌리기 버튼 활성화/비활성화 업데이트
        this.updateUndoButtonState();
    }
    /**
     * 현재 자리 배치 상태를 히스토리에 저장
     */
    saveLayoutToHistory() {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 현재 상태를 HTML 문자열로 저장
        const currentState = seatsArea.innerHTML;
        // 학생 데이터도 함께 저장
        const studentData = this.inputModule.getStudentData();
        this.saveToHistory('layout', {
            seatsAreaHTML: currentState,
            students: JSON.parse(JSON.stringify(studentData)), // 깊은 복사
            gridTemplateColumns: seatsArea.style.gridTemplateColumns
        });
    }
    /**
     * 되돌리기 기능 실행 (모든 액션에 대해 작동)
     */
    handleUndoLayout() {
        console.log('되돌리기 시도. 히스토리 인덱스:', this.historyIndex, '히스토리 길이:', this.layoutHistory.length);
        if (this.historyIndex <= 0 || this.layoutHistory.length === 0) {
            // 되돌리기할 히스토리가 없음
            this.outputModule.showError('되돌리기할 이전 상태가 없습니다.');
            return;
        }
        // 이전 상태로 복원 (인덱스를 먼저 감소시켜 이전 상태를 가져옴)
        this.historyIndex--;
        const previousState = this.layoutHistory[this.historyIndex];
        console.log('되돌리기 - 복원할 상태:', previousState);
        // 상태 타입에 따라 복원
        if (previousState && previousState.type === 'layout') {
            const seatsArea = document.getElementById('seats-area');
            if (seatsArea && previousState.data) {
                // HTML 복원
                if (previousState.data.seatsAreaHTML) {
                    seatsArea.innerHTML = previousState.data.seatsAreaHTML;
                }
                // 그리드 설정 복원
                if (previousState.data.gridTemplateColumns) {
                    seatsArea.style.gridTemplateColumns = previousState.data.gridTemplateColumns;
                }
                // 학생 데이터 복원
                if (previousState.data.students) {
                    // 학생 데이터 복원은 나중에 구현
                    console.log('학생 데이터 복원:', previousState.data.students);
                }
                // 드래그&드롭 기능 다시 활성화 (복원된 카드에 대해)
                this.enableSeatSwapDragAndDrop();
            }
        }
        else if (previousState && previousState.type === 'student-input') {
            // 학생 입력 상태 복원
            if (previousState.data && previousState.data.students) {
                this.inputModule.setStudentData(previousState.data.students);
            }
        }
        else if (previousState && previousState.type === 'options') {
            // 옵션 설정 복원
            if (previousState.data && previousState.data.options) {
                // 옵션 복원 로직 (필요시 구현)
                console.log('옵션 복원:', previousState.data.options);
            }
        }
        // 되돌리기 버튼 상태 업데이트
        this.updateUndoButtonState();
        console.log('되돌리기 완료. 현재 히스토리 인덱스:', this.historyIndex);
    }
    /**
     * 되돌리기 버튼 활성화/비활성화 상태 업데이트
     */
    updateUndoButtonState() {
        const undoButton = document.getElementById('undo-layout');
        if (!undoButton)
            return;
        // 히스토리가 있고 이전 상태가 있으면 활성화
        if (this.historyIndex >= 0 && this.layoutHistory.length > 0) {
            undoButton.disabled = false;
            undoButton.style.opacity = '1';
            undoButton.style.cursor = 'pointer';
        }
        else {
            undoButton.disabled = true;
            undoButton.style.opacity = '0.5';
            undoButton.style.cursor = 'not-allowed';
        }
    }
    /**
     * 히스토리 초기화
     */
    resetHistory() {
        this.layoutHistory = [];
        this.historyIndex = -1;
        this.updateUndoButtonState();
    }
    /**
     * 고정 좌석 클릭 핸들러 설정
     */
    setupFixedSeatClickHandler(card, seatId) {
        // '고정 좌석 지정 후 랜덤 배치' 모드인지 확인
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
        if (fixedRandomMode) {
            card.style.cursor = 'pointer';
            card.title = '클릭하여 고정 좌석 지정/해제';
            // 이미 고정된 좌석인지 확인하여 시각적 표시
            if (this.fixedSeatIds.has(seatId)) {
                card.classList.add('fixed-seat');
                card.title = '고정 좌석 (클릭하여 해제)';
                // 🔒 아이콘 추가 (없는 경우만)
                if (!card.querySelector('.fixed-seat-lock')) {
                    const lockIcon = document.createElement('div');
                    lockIcon.className = 'fixed-seat-lock';
                    lockIcon.textContent = '🔒';
                    lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
                    card.appendChild(lockIcon);
                }
            }
        }
        // 개별 클릭 이벤트는 추가하지 않음 - 이벤트 위임 방식 사용 (handleSeatCardClick)
    }
    /**
     * 고정 좌석 토글
     */
    toggleFixedSeat(seatId, card) {
        if (this.fixedSeatIds.has(seatId)) {
            // 고정 해제
            this.fixedSeatIds.delete(seatId);
            card.classList.remove('fixed-seat');
            card.title = '클릭하여 고정 좌석 지정';
            // 🔒 아이콘 제거
            const lockIcon = card.querySelector('.fixed-seat-lock');
            if (lockIcon) {
                lockIcon.remove();
            }
        }
        else {
            // 고정 설정
            this.fixedSeatIds.add(seatId);
            card.classList.add('fixed-seat');
            card.title = '고정 좌석 (클릭하여 해제)';
            // 🔒 아이콘 추가 (없는 경우만)
            if (!card.querySelector('.fixed-seat-lock')) {
                const lockIcon = document.createElement('div');
                lockIcon.className = 'fixed-seat-lock';
                lockIcon.textContent = '🔒';
                lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
                card.appendChild(lockIcon);
            }
        }
        // 테이블의 드롭다운 업데이트
        this.updateFixedSeatDropdowns();
        console.log(`고정 좌석 ${seatId} ${this.fixedSeatIds.has(seatId) ? '설정' : '해제'}`);
    }
    /**
     * 테이블의 고정 좌석 드롭다운 업데이트
     */
    updateFixedSeatDropdowns() {
        const fixedSeatSelects = document.querySelectorAll('.fixed-seat-select');
        fixedSeatSelects.forEach(select => {
            const currentValue = select.value;
            const currentOption = select.querySelector(`option[value="${currentValue}"]`);
            // 기존 옵션 제거 (기본 옵션 제외)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            // 고정 좌석 옵션 추가
            if (this.fixedSeatIds.size > 0) {
                this.fixedSeatIds.forEach(seatId => {
                    const option = document.createElement('option');
                    option.value = seatId.toString();
                    option.textContent = `좌석 #${seatId}`;
                    select.appendChild(option);
                });
            }
            // 이전 값이 유효하면 다시 설정
            if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            }
            else if (currentOption && !currentValue) {
                // "없음" 옵션이면 유지
                select.value = '';
            }
            // 번호 셀 배경색 업데이트
            const row = select.closest('tr');
            if (row) {
                const numCell = row.querySelector('td:first-child');
                if (numCell) {
                    if (select.value) {
                        // 고정 좌석이 선택된 경우 파란색 배경
                        numCell.style.background = '#667eea';
                        numCell.style.color = 'white';
                        numCell.style.fontWeight = 'bold';
                    }
                    else {
                        // 선택이 해제된 경우 원래 배경색으로 복원
                        numCell.style.background = '#f8f9fa';
                        numCell.style.color = '';
                        numCell.style.fontWeight = '';
                    }
                }
            }
        });
    }
    /**
     * 성별별 학생 수에 따라 미리보기 업데이트
     */
    updatePreviewForGenderCounts() {
        const maleCountInput = document.getElementById('male-students');
        const femaleCountInput = document.getElementById('female-students');
        const maleCount = maleCountInput ? parseInt(maleCountInput.value || '0', 10) : 0;
        const femaleCount = femaleCountInput ? parseInt(femaleCountInput.value || '0', 10) : 0;
        console.log('성별별 미리보기 업데이트:', { maleCount, femaleCount });
        // 학생 및 좌석 배열 초기화
        this.students = [];
        this.seats = [];
        let studentIndex = 0;
        // 남학생 생성
        for (let i = 0; i < maleCount && i < 100; i++) {
            const student = StudentModel.create(`남학생${i + 1}`, 'M');
            this.students.push(student);
            // 좌석 생성 (더미)
            const seat = {
                id: studentIndex + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            };
            this.seats.push(seat);
            studentIndex++;
        }
        // 여학생 생성
        for (let i = 0; i < femaleCount && i < 100; i++) {
            const student = StudentModel.create(`여학생${i + 1}`, 'F');
            this.students.push(student);
            // 좌석 생성 (더미)
            const seat = {
                id: studentIndex + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            };
            this.seats.push(seat);
            studentIndex++;
        }
        // 미리보기 렌더링
        this.renderExampleCards();
    }
    /**
     * 학생 수에 따라 미리보기 업데이트
     */
    updatePreviewForStudentCount(count) {
        console.log('미리보기 업데이트:', count);
        // 학생 및 좌석 배열 초기화
        this.students = [];
        this.seats = [];
        // 지정된 수만큼 학생과 좌석 생성
        for (let i = 0; i < count && i < 100; i++) {
            const student = StudentModel.create(`학생${i + 1}`, (i % 2 === 0) ? 'M' : 'F');
            this.students.push(student);
            // 좌석 생성 (더미)
            const seat = {
                id: i + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            };
            this.seats.push(seat);
        }
        // 카드 렌더링 (초기 6열 배치 유지)
        this.renderExampleCards();
    }
    /**
     * 학생 데이터로 카드 렌더링
     */
    renderStudentCards(seats) {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 기존 카드 제거
        seatsArea.innerHTML = '';
        // 새로운 배치 시작 시 히스토리 초기화는 하지 않음
        // (자리 배치 실행 후에도 히스토리를 유지하여 되돌리기 가능하도록)
        // 좌석 번호를 1부터 시작하도록 초기화
        this.nextSeatId = 1;
        // 현재 선택된 배치 형태 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked');
        const layoutType = layoutTypeInput ? layoutTypeInput.value : '';
        const groupSizeInput = document.querySelector('input[name="group-size"]:checked');
        const groupSize = groupSizeInput ? groupSizeInput.value : '';
        console.log('renderStudentCards - layoutType:', layoutType, 'groupSize:', groupSize);
        // 모둠 배치인지 확인
        const isGroupLayout = layoutType === 'group' && (groupSize === 'group-3' || groupSize === 'group-4' || groupSize === 'group-5' || groupSize === 'group-6');
        const groupSizeNumber = groupSize === 'group-3' ? 3 : groupSize === 'group-4' ? 4 : groupSize === 'group-5' ? 5 : groupSize === 'group-6' ? 6 : 0;
        console.log('renderStudentCards - isGroupLayout:', isGroupLayout, 'groupSizeNumber:', groupSizeNumber);
        if (isGroupLayout && groupSizeNumber > 0) {
            // 모둠 배치: 카드를 그룹으로 묶어서 표시
            console.log('모둠 배치로 렌더링 시작');
            this.renderGroupCards(seats, groupSizeNumber, seatsArea);
        }
        else {
            // 일반 배치: 기존 방식대로 표시
            console.log('일반 배치로 렌더링');
            // 학생 수에 따라 그리드 열 수 결정
            const columnCount = this.students.length <= 20 ? 4 : 6;
            seatsArea.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
            seatsArea.style.gap = '10px';
            seatsArea.style.display = 'grid';
            seats.forEach((seat, index) => {
                if (index >= this.students.length)
                    return;
                const student = this.students[index];
                const card = this.createStudentCard(student, index);
                seatsArea.appendChild(card);
            });
        }
        // 렌더 후 드래그&드롭 스왑 핸들러 보장
        this.enableSeatSwapDragAndDrop();
        // 초기 렌더링 후 첫 번째 상태를 히스토리에 저장
        setTimeout(() => {
            this.saveLayoutToHistory();
        }, 100);
    }
    /**
     * 모둠 배치로 카드 렌더링 (그룹으로 묶어서 표시)
     */
    renderGroupCards(seats, groupSize, seatsArea) {
        console.log('renderGroupCards 호출됨 - groupSize:', groupSize, 'students.length:', this.students.length);
        // this.students가 비어있으면 임시 학생 데이터 생성
        if (this.students.length === 0) {
            const maleCount = parseInt(document.getElementById('male-students')?.value || '0', 10);
            const femaleCount = parseInt(document.getElementById('female-students')?.value || '0', 10);
            const totalCount = maleCount + femaleCount;
            console.log('임시 학생 데이터 생성 - maleCount:', maleCount, 'femaleCount:', femaleCount, 'totalCount:', totalCount);
            // 임시 학생 데이터 생성
            const tempStudents = [];
            for (let i = 0; i < totalCount; i++) {
                const gender = i < maleCount ? 'M' : 'F';
                tempStudents.push({
                    id: i + 1,
                    name: gender === 'M' ? `남학생${i + 1}` : `여학생${i - maleCount + 1}`,
                    gender: gender
                });
            }
            this.students = tempStudents;
        }
        // 남녀 섞기 옵션 확인
        const genderMixCheckbox = document.getElementById('group-gender-mix');
        const shouldMixGender = genderMixCheckbox ? genderMixCheckbox.checked : false;
        // 남녀 섞기 옵션이 체크되어 있으면 각 모둠에 남녀가 균등하게 섞이도록 배치
        let studentsToUse = [];
        if (shouldMixGender) {
            // 남학생과 여학생 분리
            const maleStudents = this.students.filter(s => s.gender === 'M');
            const femaleStudents = this.students.filter(s => s.gender === 'F');
            // 각 그룹에 배치할 남녀 수 계산
            const totalStudents = this.students.length;
            const groupCount = Math.ceil(totalStudents / groupSize);
            const malesPerGroup = Math.floor(maleStudents.length / groupCount);
            const femalesPerGroup = Math.floor(femaleStudents.length / groupCount);
            const remainingMales = maleStudents.length % groupCount;
            const remainingFemales = femaleStudents.length % groupCount;
            console.log('남녀 균등 섞기 - 남학생:', maleStudents.length, '여학생:', femaleStudents.length, '그룹당 남:', malesPerGroup, '그룹당 여:', femalesPerGroup);
            // 각 그룹별로 남녀를 균등하게 배치
            let maleIndex = 0;
            let femaleIndex = 0;
            for (let groupIdx = 0; groupIdx < groupCount; groupIdx++) {
                // 현재 그룹에 배치할 남녀 수 (남은 학생들을 앞 그룹에 배치)
                const currentMales = malesPerGroup + (groupIdx < remainingMales ? 1 : 0);
                const currentFemales = femalesPerGroup + (groupIdx < remainingFemales ? 1 : 0);
                // 남학생 추가
                for (let i = 0; i < currentMales && maleIndex < maleStudents.length; i++) {
                    studentsToUse.push(maleStudents[maleIndex++]);
                }
                // 여학생 추가
                for (let i = 0; i < currentFemales && femaleIndex < femaleStudents.length; i++) {
                    studentsToUse.push(femaleStudents[femaleIndex++]);
                }
            }
            // 각 그룹 내에서 남녀를 섞기
            for (let groupIdx = 0; groupIdx < groupCount; groupIdx++) {
                const startIdx = groupIdx * groupSize;
                const endIdx = Math.min(startIdx + groupSize, studentsToUse.length);
                // 그룹 내에서만 섞기
                for (let i = endIdx - 1; i > startIdx; i--) {
                    const j = startIdx + Math.floor(Math.random() * (i - startIdx + 1));
                    [studentsToUse[i], studentsToUse[j]] = [studentsToUse[j], studentsToUse[i]];
                }
            }
            console.log('남녀 균등 섞기 완료');
        }
        else {
            // 남녀 섞기 옵션이 체크되지 않으면 기존 순서 유지
            studentsToUse = [...this.students];
        }
        // 분단 수 가져오기
        const partitionInput = document.getElementById('number-of-partitions');
        const partitionCount = partitionInput ? parseInt(partitionInput.value || '3', 10) : 3;
        console.log('분단 수:', partitionCount);
        // 그리드 레이아웃 설정 (모둠별로 배치)
        seatsArea.style.display = 'grid';
        seatsArea.style.gap = '20px 40px'; // 모둠 간 간격 (세로 20px, 가로 40px - 모둠 간 넓은 간격)
        seatsArea.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
        seatsArea.style.justifyContent = 'center';
        seatsArea.style.justifyItems = 'center'; // 각 모둠 컨테이너를 중앙 정렬
        // 그룹 내 그리드 설정 (3명: 2x2, 4명: 2x2, 5명: 2x3, 6명: 2x3)
        let colsPerGroup;
        let rowsPerGroup;
        if (groupSize === 3) {
            colsPerGroup = 2; // 3명: 가로 2개
            rowsPerGroup = 2; // 3명: 세로 2개
        }
        else if (groupSize === 4) {
            colsPerGroup = 2; // 4명: 가로 2개
            rowsPerGroup = 2; // 4명: 세로 2개
        }
        else if (groupSize === 5) {
            colsPerGroup = 2; // 5명: 가로 2개
            rowsPerGroup = 3; // 5명: 세로 3개
        }
        else { // groupSize === 6
            colsPerGroup = 2; // 6명: 가로 2개
            rowsPerGroup = 3; // 6명: 세로 3개
        }
        // 학생들을 그룹으로 나누기 (섞인 학생 배열 사용)
        const totalStudents = studentsToUse.length;
        const groupCount = Math.ceil(totalStudents / groupSize);
        // 모둠별 그룹 수 계산
        const groupsPerPartition = Math.ceil(groupCount / partitionCount);
        console.log('그룹 생성 - totalStudents:', totalStudents, 'groupSize:', groupSize, 'groupCount:', groupCount, 'groupsPerPartition:', groupsPerPartition);
        // 모둠별로 그룹 배치
        for (let partitionIndex = 0; partitionIndex < partitionCount; partitionIndex++) {
            const partitionStartGroup = partitionIndex * groupsPerPartition;
            const partitionEndGroup = Math.min(partitionStartGroup + groupsPerPartition, groupCount);
            // 모둠 컨테이너 생성 (레이블과 그룹들을 함께 묶음)
            const partitionContainer = document.createElement('div');
            partitionContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                width: 100%;
            `;
            // 분단 레이블 추가 (모둠 컨테이너 내부에)
            const label = document.createElement('div');
            label.textContent = `${partitionIndex + 1}분단`;
            label.style.textAlign = 'center';
            label.style.fontWeight = 'bold';
            label.style.color = '#667eea';
            label.style.fontSize = '0.9em';
            label.style.width = '100%';
            partitionContainer.appendChild(label);
            // 각 모둠 내의 그룹들을 담을 컨테이너
            const groupsContainer = document.createElement('div');
            groupsContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                width: 100%;
            `;
            // 각 모둠 내의 그룹들
            for (let groupIndex = partitionStartGroup; groupIndex < partitionEndGroup; groupIndex++) {
                // 그룹 컨테이너 생성
                const groupContainer = document.createElement('div');
                groupContainer.className = 'seat-group-container';
                // 그리드 행 수도 명시적으로 설정
                const gridTemplateRows = groupSize === 3 ? 'repeat(2, 1fr)' :
                    groupSize === 4 ? 'repeat(2, 1fr)' :
                        groupSize === 5 ? 'repeat(3, 1fr)' :
                            'repeat(3, 1fr)'; // 6명
                groupContainer.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(${colsPerGroup}, 1fr);
                    grid-template-rows: ${gridTemplateRows};
                    gap: 0;
                    border: 3px solid #667eea;
                    border-radius: 12px;
                    padding: 5px;
                    background: #f8f9fa;
                    width: fit-content;
                    min-width: 250px;
                `;
                // 그룹 내 카드 생성
                const startIndex = groupIndex * groupSize;
                const endIndex = Math.min(startIndex + groupSize, totalStudents);
                console.log(`그룹 ${groupIndex + 1} 생성 - startIndex: ${startIndex}, endIndex: ${endIndex}`);
                for (let i = startIndex; i < endIndex; i++) {
                    if (!studentsToUse[i]) {
                        console.warn(`학생 데이터 없음 - index: ${i}`);
                        continue;
                    }
                    const student = studentsToUse[i];
                    const card = this.createStudentCard(student, i);
                    // 그룹 내 카드는 gap 없이 붙여서 표시
                    card.style.margin = '0';
                    card.style.borderRadius = '0';
                    card.style.width = '100%';
                    card.style.height = '100%';
                    card.style.minWidth = '0';
                    card.style.maxWidth = 'none';
                    const positionInGroup = i - startIndex;
                    const row = Math.floor(positionInGroup / colsPerGroup);
                    const col = positionInGroup % colsPerGroup;
                    const isLastRow = row === rowsPerGroup - 1 || i === endIndex - 1 || (i + 1 - startIndex) > (row + 1) * colsPerGroup;
                    const isFirstRow = row === 0;
                    const isFirstCol = col === 0;
                    const isLastCol = col === colsPerGroup - 1 || (i === endIndex - 1 && (i - startIndex) % colsPerGroup === (endIndex - startIndex - 1) % colsPerGroup);
                    // 모서리 둥글게 처리
                    if (isFirstRow && isFirstCol) {
                        card.style.borderTopLeftRadius = '8px';
                    }
                    if (isFirstRow && isLastCol) {
                        card.style.borderTopRightRadius = '8px';
                    }
                    if (isLastRow && isFirstCol) {
                        card.style.borderBottomLeftRadius = '8px';
                    }
                    if (isLastRow && isLastCol) {
                        card.style.borderBottomRightRadius = '8px';
                    }
                    groupContainer.appendChild(card);
                }
                groupsContainer.appendChild(groupContainer);
            }
            // groupsContainer를 partitionContainer에 추가
            partitionContainer.appendChild(groupsContainer);
            // partitionContainer를 seatsArea에 추가
            seatsArea.appendChild(partitionContainer);
        }
    }
    /**
     * 좌석 배치 결과를 localStorage에 저장
     */
    saveLayoutResult() {
        try {
            const layoutData = {
                seats: this.seats,
                students: this.students,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('layoutResult', JSON.stringify(layoutData));
            console.log('좌석 배치 결과가 브라우저에 저장되었습니다.');
        }
        catch (error) {
            console.error('배치 결과 저장 중 오류:', error);
        }
    }
    /**
     * 저장된 좌석 배치 결과 불러오기
     */
    loadSavedLayoutResult() {
        try {
            const layoutDataStr = localStorage.getItem('layoutResult');
            if (!layoutDataStr) {
                return;
            }
            const layoutData = JSON.parse(layoutDataStr);
            if (layoutData.seats && layoutData.students) {
                this.seats = layoutData.seats;
                this.students = layoutData.students;
                if (this.canvasModule) {
                    this.canvasModule.setData(this.seats, this.students);
                }
                console.log('저장된 배치 결과를 불러왔습니다.');
            }
        }
        catch (error) {
            console.error('배치 결과 불러오기 중 오류:', error);
        }
    }
    /**
     * 나머지 랜덤 배치 처리
     */
    handleRandomizeRemaining() {
        if (this.seats.length === 0) {
            this.outputModule.showError('먼저 자리 배치를 생성해주세요.');
            return;
        }
        try {
            const unassignedStudents = this.students.filter(s => !s.fixedSeatId);
            if (unassignedStudents.length === 0) {
                this.outputModule.showInfo('배치할 학생이 없습니다.');
                return;
            }
            this.seats = RandomService.assignRandomly(unassignedStudents, this.seats);
            if (this.canvasModule) {
                this.canvasModule.setData(this.seats, this.students);
            }
            this.outputModule.showSuccess(`나머지 ${unassignedStudents.length}명의 학생이 랜덤으로 배치되었습니다.`);
        }
        catch (error) {
            console.error('랜덤 배치 중 오류:', error);
            this.outputModule.showError('랜덤 배치 중 오류가 발생했습니다.');
        }
    }
    /**
     * 결과 내보내기 처리
     */
    handleExport() {
        if (this.seats.length === 0) {
            this.outputModule.showError('내보낼 배치 결과가 없습니다.');
            return;
        }
        try {
            // 텍스트로 내보내기
            const textContent = this.outputModule.exportAsText(this.seats);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.outputModule.downloadFile(textContent, `seating-arrangement-${timestamp}.txt`);
            this.outputModule.showSuccess('결과가 다운로드되었습니다.');
        }
        catch (error) {
            console.error('내보내기 중 오류:', error);
            this.outputModule.showError('내보내기 중 오류가 발생했습니다.');
        }
    }
    /**
     * 배치 미리보기 처리
     * @param layoutType 배치 유형
     * @param groupSize 모둠 크기 (선택적)
     */
    handleLayoutPreview(layoutType, groupSize) {
        // 미리보기 기능 비활성화됨
        // 사용자가 '자리 배치 생성' 버튼을 클릭할 때만 배치가 표시됩니다.
        return;
    }
    /**
     * 카드 형태로 미리보기 렌더링
     * @param seats 좌석 배열
     */
    renderPreviewCards(seats) {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 기존 카드 제거
        seatsArea.innerHTML = '';
        // 그리드 레이아웃 설정 (6열 x 4행)
        seatsArea.style.gridTemplateColumns = 'repeat(6, 1fr)';
        seatsArea.style.gap = '10px';
        seats.forEach((seat, index) => {
            const card = document.createElement('div');
            card.className = 'student-seat-card';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'student-name';
            nameDiv.textContent = `학생${index + 1}`;
            const genderDiv = document.createElement('div');
            genderDiv.className = 'student-gender';
            genderDiv.textContent = (index % 2 === 0) ? '남' : '여';
            const numberDiv = document.createElement('div');
            numberDiv.className = 'student-number';
            numberDiv.textContent = `${index + 1}번`;
            // 성별에 따라 클래스 추가
            if (index % 2 === 0) {
                card.classList.add('gender-m');
            }
            else {
                card.classList.add('gender-f');
            }
            card.appendChild(nameDiv);
            card.appendChild(genderDiv);
            card.appendChild(numberDiv);
            seatsArea.appendChild(card);
        });
    }
    /**
     * 학생 명렬표 테이블 생성
     * @param count 학생 수 (선택적)
     */
    handleCreateStudentTable(count) {
        const outputSection = document.getElementById('output-section');
        if (!outputSection)
            return;
        // count가 제공되지 않으면 남학생/여학생 수를 합산
        if (count === undefined) {
            const maleCountInput = document.getElementById('male-students');
            const femaleCountInput = document.getElementById('female-students');
            const maleCount = maleCountInput ? parseInt(maleCountInput.value || '0', 10) : 0;
            const femaleCount = femaleCountInput ? parseInt(femaleCountInput.value || '0', 10) : 0;
            count = maleCount + femaleCount;
        }
        if (count <= 0) {
            alert('학생 수를 입력해주세요.');
            return;
        }
        // 기존 캔버스 숨기기
        const canvasContainer = outputSection.querySelector('#canvas-container');
        if (canvasContainer) {
            canvasContainer.style.display = 'none';
        }
        // 테이블 생성
        let studentTableContainer = outputSection.querySelector('.student-table-container');
        // 기존 테이블이 있으면 제거
        if (studentTableContainer) {
            studentTableContainer.remove();
        }
        // 새 테이블 컨테이너 생성
        studentTableContainer = document.createElement('div');
        studentTableContainer.className = 'student-table-container';
        studentTableContainer.id = 'student-table-container';
        // 가로 방향 2-3단 레이아웃을 위한 스타일 적용
        // 화면 크기에 따라 자동으로 2-3단으로 조정
        studentTableContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        `;
        // 반응형: 작은 화면에서는 2단, 큰 화면에서는 3단
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 1200px) {
                .student-table-container {
                    grid-template-columns: repeat(2, 1fr) !important;
                }
            }
            @media (max-width: 800px) {
                .student-table-container {
                    grid-template-columns: 1fr !important;
                }
            }
        `;
        document.head.appendChild(style);
        // 버튼 컨테이너 생성
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginBottom = '15px';
        buttonContainer.style.gridColumn = '1 / -1'; // 전체 그리드 너비 사용
        buttonContainer.style.justifyContent = 'space-between'; // 좌우 분리
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.flexWrap = 'wrap';
        // 왼쪽 버튼 그룹
        const leftButtonGroup = document.createElement('div');
        leftButtonGroup.style.display = 'flex';
        leftButtonGroup.style.gap = '10px';
        leftButtonGroup.style.alignItems = 'center';
        leftButtonGroup.style.flexWrap = 'wrap';
        // 양식 다운로드 버튼
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'download-template';
        downloadBtn.className = 'secondary-btn';
        downloadBtn.textContent = '학생 이름 양식 다운로드';
        downloadBtn.style.flex = 'none';
        downloadBtn.style.width = 'auto';
        downloadBtn.style.whiteSpace = 'nowrap';
        downloadBtn.addEventListener('click', () => this.downloadTemplateFile());
        leftButtonGroup.appendChild(downloadBtn);
        // 파일 업로드 버튼
        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'upload-file';
        uploadBtn.className = 'secondary-btn';
        uploadBtn.textContent = '학생 이름 엑셀파일에서 가져오기';
        uploadBtn.style.flex = 'none';
        uploadBtn.style.width = 'auto';
        uploadBtn.style.whiteSpace = 'nowrap';
        // 숨겨진 파일 입력
        const fileInput = document.createElement('input');
        fileInput.id = 'upload-file-input';
        fileInput.type = 'file';
        fileInput.accept = '.csv,.xlsx,.xls';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        leftButtonGroup.appendChild(uploadBtn);
        leftButtonGroup.appendChild(fileInput);
        // 우리 반 이름 불러오기 버튼
        const loadClassBtn = document.createElement('button');
        loadClassBtn.id = 'load-class-names';
        loadClassBtn.className = 'secondary-btn';
        loadClassBtn.textContent = '우리 반 이름 불러오기';
        loadClassBtn.style.flex = 'none';
        loadClassBtn.style.width = 'auto';
        loadClassBtn.style.whiteSpace = 'nowrap';
        loadClassBtn.addEventListener('click', () => this.handleLoadClassNames());
        leftButtonGroup.appendChild(loadClassBtn);
        // 오른쪽 버튼 그룹
        const rightButtonGroup = document.createElement('div');
        rightButtonGroup.style.display = 'flex';
        rightButtonGroup.style.gap = '10px';
        rightButtonGroup.style.alignItems = 'center';
        rightButtonGroup.style.flexWrap = 'wrap';
        // 자리 배치 실행하기 버튼과 체크박스 추가
        const arrangeBtn = document.createElement('button');
        arrangeBtn.id = 'arrange-seats';
        arrangeBtn.className = 'arrange-seats-btn';
        arrangeBtn.textContent = '자리 배치 실행하기';
        arrangeBtn.style.width = 'auto';
        arrangeBtn.style.flex = 'none';
        arrangeBtn.style.whiteSpace = 'nowrap';
        rightButtonGroup.appendChild(arrangeBtn);
        // 이전 좌석 안 앉기 체크박스
        const avoidPrevSeatLabel = document.createElement('label');
        avoidPrevSeatLabel.style.cssText = 'display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;';
        const avoidPrevSeatInput = document.createElement('input');
        avoidPrevSeatInput.type = 'checkbox';
        avoidPrevSeatInput.id = 'avoid-prev-seat';
        const avoidPrevSeatSpan = document.createElement('span');
        avoidPrevSeatSpan.textContent = '이전 좌석 안 앉기';
        avoidPrevSeatLabel.appendChild(avoidPrevSeatInput);
        avoidPrevSeatLabel.appendChild(avoidPrevSeatSpan);
        rightButtonGroup.appendChild(avoidPrevSeatLabel);
        // 이전 짝 금지 체크박스
        const avoidPrevPartnerLabel = document.createElement('label');
        avoidPrevPartnerLabel.style.cssText = 'display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;';
        const avoidPrevPartnerInput = document.createElement('input');
        avoidPrevPartnerInput.type = 'checkbox';
        avoidPrevPartnerInput.id = 'avoid-prev-partner';
        const avoidPrevPartnerSpan = document.createElement('span');
        avoidPrevPartnerSpan.textContent = '이전 짝 금지';
        avoidPrevPartnerLabel.appendChild(avoidPrevPartnerInput);
        avoidPrevPartnerLabel.appendChild(avoidPrevPartnerSpan);
        rightButtonGroup.appendChild(avoidPrevPartnerLabel);
        buttonContainer.appendChild(leftButtonGroup);
        buttonContainer.appendChild(rightButtonGroup);
        studentTableContainer.appendChild(buttonContainer);
        // '고정 좌석 지정 후 랜덤 배치' 모드인지 확인
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
        // 학생 수에 따라 테이블 개수 결정 (10명씩 그룹화)
        const studentsPerTable = 10;
        const numberOfTables = Math.ceil(count / studentsPerTable);
        // 각 테이블 생성 (10명씩)
        for (let tableIndex = 0; tableIndex < numberOfTables; tableIndex++) {
            const startIndex = tableIndex * studentsPerTable;
            const endIndex = Math.min(startIndex + studentsPerTable, count);
            const studentsInThisTable = endIndex - startIndex;
            // 개별 테이블 래퍼 생성
            const tableWrapper = document.createElement('div');
            tableWrapper.style.cssText = `
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                min-width: 0; /* 그리드 아이템이 축소될 수 있도록 */
                overflow-x: auto; /* 테이블이 너무 넓으면 가로 스크롤 */
            `;
            // 테이블 제목 추가 (2개 이상일 때만)
            if (numberOfTables > 1) {
                const tableTitle = document.createElement('div');
                tableTitle.style.cssText = `
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #495057;
                    font-size: 1.1em;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #dee2e6;
                `;
                tableTitle.textContent = `${startIndex + 1}번 ~ ${endIndex}번`;
                tableWrapper.appendChild(tableTitle);
            }
            // 테이블 생성
            const table = document.createElement('table');
            table.className = 'student-input-table';
            table.style.cssText = `
                width: 100%;
                border-collapse: collapse;
            `;
            // 헤더 생성
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            if (fixedRandomMode) {
                headerRow.innerHTML = `
                    <th>번호</th>
                    <th>이름</th>
                    <th>성별</th>
                    <th title="미리보기 화면의 좌석 카드에 표시된 번호(#1, #2...)를 선택하세요. 고정 좌석을 지정하지 않으려면 '없음'을 선택하세요.">고정 좌석</th>
                    <th>작업</th>
                `;
            }
            else {
                headerRow.innerHTML = `
                    <th>번호</th>
                    <th>이름</th>
                    <th>성별</th>
                    <th>작업</th>
                `;
            }
            thead.appendChild(headerRow);
            table.appendChild(thead);
            // 본문 생성
            const tbody = document.createElement('tbody');
            for (let i = startIndex + 1; i <= endIndex; i++) {
                const localIndex = i - startIndex; // 현재 테이블 내에서의 인덱스 (1부터 시작)
                const row = document.createElement('tr');
                row.dataset.studentIndex = (i - 1).toString();
                // 번호 열
                const numCell = document.createElement('td');
                numCell.textContent = i.toString();
                numCell.style.textAlign = 'center';
                numCell.style.padding = '10px';
                numCell.style.background = '#f8f9fa';
                // 이름 입력 열
                const nameCell = document.createElement('td');
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.placeholder = '학생 이름';
                nameInput.className = 'student-name-input';
                nameInput.id = `student-name-${i}`;
                nameInput.tabIndex = i;
                nameCell.appendChild(nameInput);
                // 성별 선택 열
                const genderCell = document.createElement('td');
                const genderSelect = document.createElement('select');
                genderSelect.className = 'student-gender-select';
                genderSelect.id = `student-gender-${i}`;
                genderSelect.innerHTML = `
                    <option value="">선택</option>
                    <option value="M">남</option>
                    <option value="F">여</option>
                `;
                genderSelect.tabIndex = count + i;
                genderCell.appendChild(genderSelect);
                // 고정 좌석 선택 열 (고정 좌석 모드일 때만)
                let fixedSeatCell = null;
                if (fixedRandomMode) {
                    fixedSeatCell = document.createElement('td');
                    const fixedSeatSelect = document.createElement('select');
                    fixedSeatSelect.className = 'fixed-seat-select';
                    fixedSeatSelect.id = `fixed-seat-${i}`;
                    fixedSeatSelect.innerHTML = '<option value="">없음</option>';
                    fixedSeatSelect.tabIndex = count * 2 + i;
                    // 고정된 좌석이 있으면 옵션 추가
                    if (this.fixedSeatIds.size > 0) {
                        this.fixedSeatIds.forEach(seatId => {
                            const option = document.createElement('option');
                            option.value = seatId.toString();
                            option.textContent = `좌석 #${seatId}`;
                            fixedSeatSelect.appendChild(option);
                        });
                    }
                    // 학생 데이터에 저장된 고정 좌석이 있으면 선택
                    const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                    if (this.students[studentIndex] && this.students[studentIndex].fixedSeatId) {
                        fixedSeatSelect.value = this.students[studentIndex].fixedSeatId.toString();
                        // 번호 셀 배경색 설정 (초기 상태)
                        if (numCell) {
                            numCell.style.background = '#667eea';
                            numCell.style.color = 'white';
                            numCell.style.fontWeight = 'bold';
                        }
                    }
                    // 고정 좌석 선택 변경 이벤트
                    fixedSeatSelect.addEventListener('change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        // 학생 데이터에 고정 좌석 ID 저장
                        if (this.students[studentIndex]) {
                            if (selectedSeatId) {
                                this.students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            }
                            else {
                                delete this.students[studentIndex].fixedSeatId;
                            }
                        }
                        // 번호 셀 배경색 변경
                        const numCell = row.querySelector('td:first-child');
                        if (numCell) {
                            if (selectedSeatId) {
                                // 고정 좌석이 선택된 경우 파란색 배경
                                numCell.style.background = '#667eea';
                                numCell.style.color = 'white';
                                numCell.style.fontWeight = 'bold';
                            }
                            else {
                                // 선택이 해제된 경우 원래 배경색으로 복원
                                numCell.style.background = '#f8f9fa';
                                numCell.style.color = '';
                                numCell.style.fontWeight = '';
                            }
                        }
                        console.log(`학생 ${studentIndex}의 고정 좌석: ${selectedSeatId || '없음'}`);
                    });
                    fixedSeatCell.appendChild(fixedSeatSelect);
                }
                // 작업 열 (삭제 버튼)
                const actionCell = document.createElement('td');
                actionCell.style.textAlign = 'center';
                actionCell.style.padding = '8px';
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '🗑️'; // 삭제 아이콘
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.title = '삭제';
                deleteBtn.onclick = () => this.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);
                // 키보드 이벤트 추가 (이름 입력 필드)
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        genderSelect.focus();
                    }
                    else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'name', 'down');
                    }
                    else if (e.key === 'ArrowUp') {
                        this.moveToCell(tbody, localIndex, 'name', 'up');
                    }
                });
                // 키보드 이벤트 추가 (성별 선택 필드)
                genderSelect.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        const nextRow = tbody.querySelector(`tr:nth-child(${Math.min(localIndex + 1, studentsInThisTable)})`);
                        const nextNameInput = nextRow?.querySelector('.student-name-input');
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    }
                    else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'gender', 'down');
                    }
                    else if (e.key === 'ArrowUp') {
                        this.moveToCell(tbody, localIndex, 'gender', 'up');
                    }
                });
                row.appendChild(numCell);
                row.appendChild(nameCell);
                row.appendChild(genderCell);
                if (fixedSeatCell) {
                    row.appendChild(fixedSeatCell);
                }
                row.appendChild(actionCell);
                tbody.appendChild(row);
            }
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            studentTableContainer.appendChild(tableWrapper);
        }
        // 통계와 버튼을 하나의 컨테이너로 묶기
        const statsAndButtonsWrapper = document.createElement('div');
        statsAndButtonsWrapper.style.cssText = `
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 10px;
            margin-top: 10px;
            flex-wrap: wrap;
        `;
        // 통계 표시를 위한 컨테이너 추가 (모든 테이블 아래에 하나만)
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 0.95em;
            flex: 0 0 auto;
            width: fit-content;
        `;
        statsContainer.id = 'student-table-stats';
        const statsCell = document.createElement('div');
        statsCell.id = 'student-table-stats-cell';
        statsContainer.appendChild(statsCell);
        statsAndButtonsWrapper.appendChild(statsContainer);
        // 작업 버튼 추가
        const actionButtons = document.createElement('div');
        actionButtons.className = 'table-action-buttons';
        actionButtons.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            flex: 0 0 auto;
        `;
        actionButtons.innerHTML = `
            <button id="add-student-row-btn" style="width: auto; flex: 0 0 auto; min-width: 0;">행 추가</button>
            <button id="save-student-table-btn" class="save-btn" style="width: auto; flex: 0 0 auto; min-width: 0; background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; white-space: nowrap;">✅ 우리반 학생으로 등록하기</button>
        `;
        statsAndButtonsWrapper.appendChild(actionButtons);
        studentTableContainer.appendChild(statsAndButtonsWrapper);
        outputSection.appendChild(studentTableContainer);
        // 초기 통계 업데이트
        this.updateStudentTableStats();
        // 통계 업데이트를 위한 이벤트 리스너 추가 (이벤트 위임으로 모든 변경사항 감지)
        // 모든 테이블의 tbody에 이벤트 리스너 추가
        const allTbodies = studentTableContainer.querySelectorAll('tbody');
        allTbodies.forEach(tbody => {
            tbody.addEventListener('input', () => {
                this.updateStudentTableStats();
            });
            tbody.addEventListener('change', () => {
                this.updateStudentTableStats();
            });
            // 테이블이 동적으로 변경될 때를 대비한 MutationObserver 추가
            const observer = new MutationObserver(() => {
                this.updateStudentTableStats();
            });
            observer.observe(tbody, {
                childList: true,
                subtree: true,
                attributes: false
            });
        });
        // 테이블이 생성된 후 해당 위치로 스크롤
        setTimeout(() => {
            studentTableContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
        this.outputModule.showInfo(`${count}명의 학생 명렬표가 생성되었습니다.`);
    }
    /**
     * 학생 행 삭제 처리
     * @param row 삭제할 행
     */
    handleDeleteStudentRow(row) {
        if (confirm('이 학생을 삭제하시겠습니까?')) {
            row.remove();
            this.updateRowNumbers();
            this.updateStudentTableStats(); // 통계 업데이트
        }
    }
    /**
     * 학생 행 추가 처리 (마지막 행 뒤에 추가)
     */
    handleAddStudentRow() {
        const outputSection = document.getElementById('output-section');
        if (!outputSection)
            return;
        // 모든 tbody 찾기
        const allTbodies = outputSection.querySelectorAll('.student-input-table tbody');
        if (allTbodies.length === 0)
            return;
        // 마지막 tbody 찾기
        const lastTbody = allTbodies[allTbodies.length - 1];
        // 전체 행 수 계산 (새 행 번호 결정용)
        let totalRows = 0;
        allTbodies.forEach(tbody => {
            totalRows += tbody.querySelectorAll('tr').length;
        });
        const newGlobalIndex = totalRows; // 전체 행 번호 (0부터 시작)
        // 마지막 테이블의 현재 행 수 확인
        const studentsPerTable = 10;
        const currentRowsInLastTable = lastTbody.querySelectorAll('tr').length;
        // 마지막 테이블이 10명으로 가득 찬 경우 새로운 테이블 생성
        let targetTbody = lastTbody;
        if (currentRowsInLastTable >= studentsPerTable) {
            // 새로운 테이블을 만들어야 함
            const studentTableContainer = outputSection.querySelector('.student-table-container');
            if (studentTableContainer) {
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
                const tableWrapper = document.createElement('div');
                tableWrapper.style.cssText = `
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 15px;
                    background: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    min-width: 0;
                    overflow-x: auto;
                `;
                // 테이블 제목 추가
                const numberOfTables = Math.ceil((totalRows + 1) / studentsPerTable);
                const startIndex = Math.floor(totalRows / studentsPerTable) * studentsPerTable;
                const endIndex = totalRows + 1;
                if (numberOfTables > 1) {
                    const tableTitle = document.createElement('div');
                    tableTitle.style.cssText = `
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #495057;
                        font-size: 1.1em;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #dee2e6;
                    `;
                    tableTitle.textContent = `${startIndex + 1}번 ~ ${endIndex}번`;
                    tableWrapper.appendChild(tableTitle);
                }
                const table = document.createElement('table');
                table.className = 'student-input-table';
                table.style.cssText = `
                    width: 100%;
                    border-collapse: collapse;
                `;
                // 헤더 생성
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                if (fixedRandomMode) {
                    headerRow.innerHTML = `
                        <th>번호</th>
                        <th>이름</th>
                        <th>성별</th>
                        <th title="미리보기 화면의 좌석 카드에 표시된 번호(#1, #2...)를 선택하세요. 고정 좌석을 지정하지 않으려면 '없음'을 선택하세요.">고정 좌석</th>
                        <th>작업</th>
                    `;
                }
                else {
                    headerRow.innerHTML = `
                        <th>번호</th>
                        <th>이름</th>
                        <th>성별</th>
                        <th>작업</th>
                    `;
                }
                thead.appendChild(headerRow);
                table.appendChild(thead);
                const newTbody = document.createElement('tbody');
                table.appendChild(newTbody);
                tableWrapper.appendChild(table);
                // 통계와 버튼 래퍼 앞에 삽입
                const statsAndButtonsWrapper = studentTableContainer.querySelector('div[style*="grid-column: 1 / -1"]');
                if (statsAndButtonsWrapper && statsAndButtonsWrapper.querySelector('#student-table-stats')) {
                    studentTableContainer.insertBefore(tableWrapper, statsAndButtonsWrapper);
                }
                else {
                    studentTableContainer.appendChild(tableWrapper);
                }
                targetTbody = newTbody;
            }
        }
        // 새 행 생성
        const row = document.createElement('tr');
        row.dataset.studentIndex = newGlobalIndex.toString();
        const numCell = document.createElement('td');
        numCell.textContent = (newGlobalIndex + 1).toString();
        numCell.style.textAlign = 'center';
        numCell.style.padding = '10px';
        numCell.style.background = '#f8f9fa';
        const nameCell = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '학생 이름';
        nameInput.className = 'student-name-input';
        nameInput.id = `student-name-${newGlobalIndex + 1}`;
        nameInput.tabIndex = newGlobalIndex + 1;
        nameCell.appendChild(nameInput);
        const genderCell = document.createElement('td');
        const genderSelect = document.createElement('select');
        genderSelect.className = 'student-gender-select';
        genderSelect.id = `student-gender-${newGlobalIndex + 1}`;
        genderSelect.innerHTML = `
            <option value="">선택</option>
            <option value="M">남</option>
            <option value="F">여</option>
        `;
        genderSelect.tabIndex = totalRows + newGlobalIndex + 1;
        genderCell.appendChild(genderSelect);
        // 고정 좌석 선택 열 (고정 좌석 모드일 때만)
        let fixedSeatCell = null;
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
        if (fixedRandomMode) {
            fixedSeatCell = document.createElement('td');
            const fixedSeatSelect = document.createElement('select');
            fixedSeatSelect.className = 'fixed-seat-select';
            fixedSeatSelect.id = `fixed-seat-${newGlobalIndex + 1}`;
            fixedSeatSelect.innerHTML = '<option value="">없음</option>';
            fixedSeatSelect.tabIndex = totalRows * 2 + newGlobalIndex + 1;
            // 고정된 좌석이 있으면 옵션 추가
            if (this.fixedSeatIds.size > 0) {
                this.fixedSeatIds.forEach(seatId => {
                    const option = document.createElement('option');
                    option.value = seatId.toString();
                    option.textContent = `좌석 #${seatId}`;
                    fixedSeatSelect.appendChild(option);
                });
            }
            // 고정 좌석 선택 변경 이벤트
            fixedSeatSelect.addEventListener('change', () => {
                const selectedSeatId = fixedSeatSelect.value;
                const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                // 학생 데이터에 고정 좌석 ID 저장
                if (this.students[studentIndex]) {
                    if (selectedSeatId) {
                        this.students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                    }
                    else {
                        delete this.students[studentIndex].fixedSeatId;
                    }
                }
                // 번호 셀 배경색 변경
                const numCell = row.querySelector('td:first-child');
                if (numCell) {
                    if (selectedSeatId) {
                        // 고정 좌석이 선택된 경우 파란색 배경
                        numCell.style.background = '#667eea';
                        numCell.style.color = 'white';
                        numCell.style.fontWeight = 'bold';
                    }
                    else {
                        // 선택이 해제된 경우 원래 배경색으로 복원
                        numCell.style.background = '#f8f9fa';
                        numCell.style.color = '';
                        numCell.style.fontWeight = '';
                    }
                }
            });
            fixedSeatCell.appendChild(fixedSeatSelect);
        }
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        actionCell.style.padding = '8px';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-row-btn';
        deleteBtn.onclick = () => this.handleDeleteStudentRow(row);
        actionCell.appendChild(deleteBtn);
        // 키보드 이벤트 추가
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                genderSelect.focus();
            }
        });
        genderSelect.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
                const nextRow = targetTbody.querySelector(`tr:nth-child(${targetTbody.querySelectorAll('tr').length + 1})`);
                const nextNameInput = nextRow?.querySelector('.student-name-input');
                if (nextNameInput) {
                    nextNameInput.focus();
                    nextNameInput.select();
                }
            }
        });
        row.appendChild(numCell);
        row.appendChild(nameCell);
        row.appendChild(genderCell);
        if (fixedSeatCell) {
            row.appendChild(fixedSeatCell);
        }
        row.appendChild(actionCell);
        // 마지막 행 뒤에 추가
        targetTbody.appendChild(row);
        // 전체 행 번호 재정렬
        this.updateRowNumbers();
        // 통계 업데이트
        this.updateStudentTableStats();
        // 새 행에 이벤트 리스너 추가
        if (nameInput) {
            nameInput.addEventListener('input', () => this.updateStudentTableStats());
        }
        if (genderSelect) {
            genderSelect.addEventListener('change', () => this.updateStudentTableStats());
        }
        // 고정 좌석 셀에서 select 요소 찾기
        if (fixedSeatCell) {
            const fixedSeatSelectInCell = fixedSeatCell.querySelector('.fixed-seat-select');
            if (fixedSeatSelectInCell) {
                fixedSeatSelectInCell.addEventListener('change', () => this.updateStudentTableStats());
            }
        }
        // 새로 추가된 입력 필드에 포커스
        setTimeout(() => {
            nameInput.focus();
        }, 100);
    }
    /**
     * 학생 테이블 통계 업데이트
     */
    updateStudentTableStats() {
        const statsCell = document.getElementById('student-table-stats-cell');
        // 통계 셀이 없으면 테이블이 아직 생성되지 않았거나 제거된 상태
        if (!statsCell)
            return;
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr') || [];
        // rows가 없어도 통계는 표시해야 함 (0명일 수도 있으므로)
        let maleCount = 0;
        let femaleCount = 0;
        let fixedSeatCount = 0;
        rows.forEach((row) => {
            const genderSelect = row.querySelector('.student-gender-select');
            const fixedSeatSelect = row.querySelector('.fixed-seat-select');
            if (genderSelect) {
                const gender = genderSelect.value;
                if (gender === 'M') {
                    maleCount++;
                }
                else if (gender === 'F') {
                    femaleCount++;
                }
            }
            if (fixedSeatSelect && fixedSeatSelect.value) {
                fixedSeatCount++;
            }
        });
        // 사이드바의 남녀 숫자 가져오기
        const maleCountInput = document.getElementById('male-students');
        const femaleCountInput = document.getElementById('female-students');
        const expectedMaleCount = maleCountInput ? parseInt(maleCountInput.value || '0', 10) : 0;
        const expectedFemaleCount = femaleCountInput ? parseInt(femaleCountInput.value || '0', 10) : 0;
        // 통계 표시
        let statsHTML = `
            <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                <span><strong>남자:</strong> <span id="stats-male-count">${maleCount}</span>명</span>
                <span><strong>여자:</strong> <span id="stats-female-count">${femaleCount}</span>명</span>
                <span><strong>고정 자리:</strong> <span id="stats-fixed-seat-count">${fixedSeatCount}</span>개</span>
            </div>
        `;
        statsCell.innerHTML = statsHTML;
        // 자동 동기화 제거: 사용자가 명시적으로 '저장' 버튼을 클릭할 때만 동기화
    }
    /**
     * 학생 정보 입력 테이블 저장 처리
     * 테이블의 학생 수를 계산하여 1단계 사이드바에 반영하고 미리보기를 업데이트
     * 그리고 localStorage에 학생 데이터를 저장
     */
    handleSaveStudentTable() {
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr') || [];
        let maleCount = 0;
        let femaleCount = 0;
        const studentData = [];
        rows.forEach((row) => {
            const nameInput = row.querySelector('.student-name-input');
            const genderSelect = row.querySelector('.student-gender-select');
            const fixedSeatSelect = row.querySelector('.fixed-seat-select');
            if (nameInput && genderSelect) {
                const name = nameInput.value.trim();
                const gender = genderSelect.value;
                if (name && gender) {
                    if (gender === 'M') {
                        maleCount++;
                    }
                    else if (gender === 'F') {
                        femaleCount++;
                    }
                    const student = { name, gender };
                    // 고정 좌석 정보가 있으면 추가
                    if (fixedSeatSelect && fixedSeatSelect.value) {
                        const fixedSeatId = parseInt(fixedSeatSelect.value, 10);
                        if (!isNaN(fixedSeatId)) {
                            student.fixedSeatId = fixedSeatId;
                        }
                    }
                    studentData.push(student);
                }
            }
        });
        // localStorage에 학생 데이터 저장
        try {
            localStorage.setItem('classStudentData', JSON.stringify(studentData));
            console.log('학생 데이터 저장 완료:', studentData);
        }
        catch (error) {
            console.error('학생 데이터 저장 중 오류:', error);
            alert('학생 데이터 저장 중 오류가 발생했습니다.');
            return;
        }
        // 테이블의 학생 수를 1단계 사이드바로 동기화
        this.syncSidebarToTable(maleCount, femaleCount);
        alert(`우리반 학생 ${studentData.length}명이 등록되었습니다!`);
    }
    /**
     * 테이블의 숫자를 1단계 사이드바로 동기화
     * 테이블에 실제 입력된 학생 수를 1단계 입력 필드에 반영하고 미리보기를 업데이트
     */
    syncSidebarToTable(tableMaleCount, tableFemaleCount) {
        this.isSyncing = true; // 동기화 시작
        const maleCountInput = document.getElementById('male-students');
        const femaleCountInput = document.getElementById('female-students');
        if (!maleCountInput || !femaleCountInput) {
            alert('입력 필드를 찾을 수 없습니다.');
            this.isSyncing = false;
            return;
        }
        // 1단계 입력 필드 업데이트
        maleCountInput.value = tableMaleCount.toString();
        femaleCountInput.value = tableFemaleCount.toString();
        // 입력 필드 값 변경 이벤트 수동 발생 (이벤트 리스너가 제대로 작동하도록)
        // 단, 통계 업데이트는 호출하지 않도록 (무한 루프 방지)
        maleCountInput.dispatchEvent(new Event('input', { bubbles: true }));
        femaleCountInput.dispatchEvent(new Event('input', { bubbles: true }));
        maleCountInput.dispatchEvent(new Event('change', { bubbles: true }));
        femaleCountInput.dispatchEvent(new Event('change', { bubbles: true }));
        // 미리보기 업데이트 (카드 재생성) - 명시적으로 호출
        this.updatePreviewForGenderCounts();
        // 통계 업데이트 (경고 메시지 제거) - 동기화 플래그를 해제하기 전에
        setTimeout(() => {
            this.updateStudentTableStats();
            this.isSyncing = false; // 동기화 완료
        }, 100);
    }
    /**
     * 우리 반 이름 불러오기 처리
     * localStorage에 저장된 학생 데이터를 테이블에 로드
     */
    handleLoadClassNames() {
        try {
            const savedDataStr = localStorage.getItem('classStudentData');
            if (!savedDataStr) {
                alert('저장된 우리반 학생 데이터가 없습니다.');
                return;
            }
            const savedData = JSON.parse(savedDataStr);
            if (!Array.isArray(savedData) || savedData.length === 0) {
                alert('저장된 우리반 학생 데이터가 없습니다.');
                return;
            }
            // 기존 테이블이 있는지 확인
            const outputSection = document.getElementById('output-section');
            if (!outputSection) {
                alert('테이블 영역을 찾을 수 없습니다.');
                return;
            }
            // 기존 테이블이 없으면 생성
            let existingTable = outputSection.querySelector('.student-input-table');
            if (!existingTable) {
                // 테이블이 없으면 먼저 테이블 생성
                this.handleCreateStudentTable(savedData.length);
                // 테이블이 생성될 때까지 잠시 대기
                setTimeout(() => {
                    this.loadStudentDataToTable(savedData);
                }, 100);
            }
            else {
                // 기존 테이블에 데이터 로드
                this.loadStudentDataToTable(savedData);
            }
        }
        catch (error) {
            console.error('우리반 학생 데이터 불러오기 중 오류:', error);
            alert('우리반 학생 데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }
    /**
     * 저장된 학생 데이터를 테이블에 로드
     */
    loadStudentDataToTable(studentData) {
        const outputSection = document.getElementById('output-section');
        if (!outputSection)
            return;
        // 기존 테이블이 없으면 새로 생성
        let studentTableContainer = outputSection.querySelector('.student-table-container');
        if (!studentTableContainer) {
            this.handleCreateStudentTable(studentData.length);
            // 테이블이 생성될 때까지 잠시 대기
            setTimeout(() => {
                this.loadStudentDataToTable(studentData);
            }, 100);
            return;
        }
        // 모든 테이블의 tbody 가져오기
        const allTbodies = outputSection.querySelectorAll('.student-input-table tbody');
        if (allTbodies.length === 0) {
            // 테이블이 없으면 새로 생성
            this.handleCreateStudentTable(studentData.length);
            setTimeout(() => {
                this.loadStudentDataToTable(studentData);
            }, 100);
            return;
        }
        // 학생 수에 따라 10명씩 그룹화
        const studentsPerTable = 10;
        // 각 테이블의 tbody에 데이터 로드
        allTbodies.forEach((tbody, tableIndex) => {
            // 기존 행 모두 제거
            tbody.innerHTML = '';
            const startIndex = tableIndex * studentsPerTable;
            const endIndex = Math.min(startIndex + studentsPerTable, studentData.length);
            // 이 테이블에 해당하는 학생 데이터
            for (let i = startIndex; i < endIndex; i++) {
                const student = studentData[i];
                const globalIndex = i + 1; // 전체 학생 번호 (1부터 시작)
                const row = document.createElement('tr');
                row.dataset.studentIndex = i.toString();
                // 행 번호 셀
                const numCell = document.createElement('td');
                numCell.className = 'row-number';
                numCell.textContent = globalIndex.toString();
                numCell.style.textAlign = 'center';
                numCell.style.padding = '10px';
                numCell.style.background = '#f8f9fa';
                row.appendChild(numCell);
                // 이름 입력 셀
                const nameCell = document.createElement('td');
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'student-name-input';
                nameInput.id = `student-name-${globalIndex}`;
                nameInput.value = student.name;
                nameInput.placeholder = '학생 이름';
                nameCell.appendChild(nameInput);
                row.appendChild(nameCell);
                // 성별 선택 셀
                const genderCell = document.createElement('td');
                const genderSelect = document.createElement('select');
                genderSelect.className = 'student-gender-select';
                genderSelect.id = `student-gender-${globalIndex}`;
                genderSelect.innerHTML = `
                    <option value="">선택</option>
                    <option value="M" ${student.gender === 'M' ? 'selected' : ''}>남</option>
                    <option value="F" ${student.gender === 'F' ? 'selected' : ''}>여</option>
                `;
                genderCell.appendChild(genderSelect);
                row.appendChild(genderCell);
                // 고정 좌석 선택 셀 (고정 좌석 모드인지 확인)
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
                if (fixedRandomMode) {
                    const fixedSeatCell = document.createElement('td');
                    const fixedSeatSelect = document.createElement('select');
                    fixedSeatSelect.className = 'fixed-seat-select';
                    fixedSeatSelect.id = `fixed-seat-${globalIndex}`;
                    fixedSeatSelect.innerHTML = '<option value="">없음</option>';
                    // 고정된 좌석이 있으면 옵션 추가
                    if (this.fixedSeatIds.size > 0) {
                        this.fixedSeatIds.forEach(seatId => {
                            const option = document.createElement('option');
                            option.value = seatId.toString();
                            option.textContent = `좌석 #${seatId}`;
                            if (student.fixedSeatId === seatId) {
                                option.selected = true;
                            }
                            fixedSeatSelect.appendChild(option);
                        });
                    }
                    // 고정 좌석 선택 변경 이벤트
                    fixedSeatSelect.addEventListener('change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        // 학생 데이터에 고정 좌석 ID 저장
                        if (this.students[studentIndex]) {
                            if (selectedSeatId) {
                                this.students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            }
                            else {
                                delete this.students[studentIndex].fixedSeatId;
                            }
                        }
                        // 번호 셀 배경색 변경
                        if (numCell) {
                            if (selectedSeatId) {
                                numCell.style.background = '#667eea';
                                numCell.style.color = 'white';
                                numCell.style.fontWeight = 'bold';
                            }
                            else {
                                numCell.style.background = '#f8f9fa';
                                numCell.style.color = '';
                                numCell.style.fontWeight = '';
                            }
                        }
                    });
                    // 고정 좌석이 있으면 번호 셀 배경색 설정
                    if (student.fixedSeatId !== undefined) {
                        numCell.style.background = '#667eea';
                        numCell.style.color = 'white';
                        numCell.style.fontWeight = 'bold';
                    }
                    fixedSeatCell.appendChild(fixedSeatSelect);
                    row.appendChild(fixedSeatCell);
                }
                // 삭제 버튼 셀
                const deleteCell = document.createElement('td');
                deleteCell.style.textAlign = 'center';
                deleteCell.style.padding = '8px';
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.type = 'button';
                deleteBtn.title = '삭제';
                deleteBtn.onclick = () => this.handleDeleteStudentRow(row);
                deleteCell.appendChild(deleteBtn);
                row.appendChild(deleteCell);
                tbody.appendChild(row);
            }
        });
        // 고정 좌석 드롭다운 업데이트
        this.updateFixedSeatDropdowns();
        // 통계 업데이트
        this.updateStudentTableStats();
        // 사이드바 동기화
        const maleCount = studentData.filter(s => s.gender === 'M').length;
        const femaleCount = studentData.filter(s => s.gender === 'F').length;
        this.syncSidebarToTable(maleCount, femaleCount);
        alert(`우리반 학생 ${studentData.length}명을 불러왔습니다!`);
    }
    /**
     * 1단계 사이드바 값을 테이블로 동기화
     * 1단계에 입력된 숫자에 맞춰 테이블에 행을 추가하거나 삭제
     */
    syncTableToSidebar(sidebarMaleCount, sidebarFemaleCount) {
        const outputSection = document.getElementById('output-section');
        const tbody = outputSection?.querySelector('.student-input-table tbody');
        if (!tbody) {
            alert('테이블을 찾을 수 없습니다.');
            return;
        }
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const totalNeeded = sidebarMaleCount + sidebarFemaleCount;
        const currentTotal = rows.length;
        // 현재 행들의 성별 카운트
        let currentMaleCount = 0;
        let currentFemaleCount = 0;
        rows.forEach(row => {
            const genderSelect = row.querySelector('.student-gender-select');
            if (genderSelect) {
                if (genderSelect.value === 'M') {
                    currentMaleCount++;
                }
                else if (genderSelect.value === 'F') {
                    currentFemaleCount++;
                }
            }
        });
        // 행 수 조정 (부족하면 추가, 많으면 삭제)
        if (currentTotal < totalNeeded) {
            // 행 추가 필요
            const maleToAdd = Math.max(0, sidebarMaleCount - currentMaleCount);
            const femaleToAdd = Math.max(0, sidebarFemaleCount - currentFemaleCount);
            // 남학생 행 먼저 추가
            for (let i = 0; i < maleToAdd; i++) {
                this.handleAddStudentRow();
                // 추가된 행의 성별을 남자로 설정
                const newRows = Array.from(tbody.querySelectorAll('tr'));
                const lastRow = newRows[newRows.length - 1];
                const genderSelect = lastRow.querySelector('.student-gender-select');
                if (genderSelect) {
                    genderSelect.value = 'M';
                }
            }
            // 여학생 행 추가
            for (let i = 0; i < femaleToAdd; i++) {
                this.handleAddStudentRow();
                // 추가된 행의 성별을 여자로 설정
                const newRows = Array.from(tbody.querySelectorAll('tr'));
                const lastRow = newRows[newRows.length - 1];
                const genderSelect = lastRow.querySelector('.student-gender-select');
                if (genderSelect) {
                    genderSelect.value = 'F';
                }
            }
        }
        else if (currentTotal > totalNeeded) {
            // 행 삭제 필요 (맨 아래부터 삭제)
            const toDelete = currentTotal - totalNeeded;
            const rowsToDelete = Array.from(tbody.querySelectorAll('tr'));
            // 맨 아래 행부터 삭제
            for (let i = 0; i < toDelete; i++) {
                const lastRow = rowsToDelete[rowsToDelete.length - 1 - i];
                if (lastRow) {
                    lastRow.remove();
                }
            }
            // 행 번호 재정렬
            this.updateRowNumbers();
        }
        // 성별 재분배 (필요한 경우)
        const finalRows = Array.from(tbody.querySelectorAll('tr'));
        let currentMales = 0;
        let currentFemales = 0;
        finalRows.forEach(row => {
            const genderSelect = row.querySelector('.student-gender-select');
            if (genderSelect) {
                if (genderSelect.value === 'M') {
                    currentMales++;
                }
                else if (genderSelect.value === 'F') {
                    currentFemales++;
                }
            }
        });
        // 성별이 맞지 않으면 조정
        if (currentMales !== sidebarMaleCount || currentFemales !== sidebarFemaleCount) {
            let maleNeeded = sidebarMaleCount - currentMales;
            let femaleNeeded = sidebarFemaleCount - currentFemales;
            finalRows.forEach(row => {
                const genderSelect = row.querySelector('.student-gender-select');
                if (!genderSelect)
                    return;
                if (maleNeeded > 0 && genderSelect.value !== 'M') {
                    genderSelect.value = 'M';
                    maleNeeded--;
                    if (genderSelect.value === 'F')
                        femaleNeeded++;
                }
                else if (femaleNeeded > 0 && genderSelect.value !== 'F') {
                    genderSelect.value = 'F';
                    femaleNeeded--;
                    if (genderSelect.value === 'M')
                        maleNeeded++;
                }
            });
        }
        // 통계 업데이트
        this.updateStudentTableStats();
        // 완료 메시지 표시
        this.outputModule.showInfo(`테이블이 1단계 입력 값에 맞춰 업데이트되었습니다. (남: ${sidebarMaleCount}명, 여: ${sidebarFemaleCount}명)`);
    }
    /**
     * 행 번호 업데이트
     */
    updateRowNumbers() {
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr');
        if (!rows)
            return;
        rows.forEach((row) => {
            const htmlRow = row;
            const numCell = htmlRow.querySelector('td:first-child');
            if (numCell) {
                const rowIndex = Array.from(rows).indexOf(htmlRow);
                numCell.textContent = (rowIndex + 1).toString();
                htmlRow.dataset.studentIndex = rowIndex.toString();
            }
        });
    }
    /**
     * 배치 결과 섹션 생성
     */
    createLayoutResultSection(outputSection, students) {
        // 기존 배치 결과 제거
        let layoutResultSection = outputSection.querySelector('.layout-result-section');
        if (layoutResultSection) {
            layoutResultSection.remove();
        }
        // 새 배치 결과 섹션 생성
        layoutResultSection = document.createElement('div');
        layoutResultSection.className = 'layout-result-section';
        const title = document.createElement('h3');
        title.textContent = '자리 배치도 생성';
        title.style.marginTop = '30px';
        title.style.marginBottom = '15px';
        title.style.color = '#333';
        layoutResultSection.appendChild(title);
        // 캔버스 컨테이너 생성
        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'dynamic-canvas-container';
        canvasContainer.style.background = '#f8f9fa';
        canvasContainer.style.border = '3px solid #667eea';
        canvasContainer.style.borderRadius = '10px';
        canvasContainer.style.padding = '20px';
        canvasContainer.style.display = 'flex';
        canvasContainer.style.justifyContent = 'center';
        canvasContainer.style.alignItems = 'center';
        canvasContainer.style.marginBottom = '20px';
        canvasContainer.style.minHeight = '450px';
        const canvas = document.createElement('canvas');
        canvas.id = 'dynamic-seat-canvas';
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.background = 'white';
        canvas.style.border = '2px solid #667eea';
        canvas.style.borderRadius = '5px';
        canvas.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
        canvasContainer.appendChild(canvas);
        layoutResultSection.appendChild(canvasContainer);
        outputSection.appendChild(layoutResultSection);
        // 배치 미리보기 렌더링
        this.renderStudentLayout(students);
    }
    /**
     * 학생 배치 미리보기 렌더링
     */
    renderStudentLayout(students) {
        const layoutType = this.layoutSelectorModule.getCurrentLayoutType();
        if (!layoutType) {
            return;
        }
        const canvas = document.getElementById('dynamic-seat-canvas');
        if (!canvas)
            return;
        // 분단 수 가져오기
        const partitionInput = document.getElementById('number-of-partitions');
        const partitionCount = partitionInput ? parseInt(partitionInput.value || '1', 10) : 1;
        // 레이아웃 생성
        const layoutResult = LayoutService.createLayout(layoutType, students.length, canvas.width, canvas.height, partitionCount);
        if (layoutResult.success && layoutResult.seats) {
            this.seats = layoutResult.seats;
            // 캔버스에 그리기
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // 캔버스 클리어
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // 배경 설정
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // 교탁과 칠판 그리기
                this.drawTeacherDeskAndBoard(ctx, canvas);
                // 학생 이름과 함께 좌석 그리기
                this.seats.forEach((seat, index) => {
                    if (index < students.length) {
                        this.drawSeatWithStudent(ctx, seat, students[index]);
                    }
                });
            }
        }
    }
    /**
     * 학생 정보와 함께 좌석 그리기
     */
    drawSeatWithStudent(ctx, seat, student) {
        const x = seat.position.x;
        const y = seat.position.y + 100; // 교탁 공간 확보
        const width = 50;
        const height = 50;
        // 좌석 색상 (성별에 따라)
        ctx.fillStyle = student.gender === 'M' ? '#e3f2fd' : '#fce4ec';
        ctx.fillRect(x, y, width, height);
        // 좌석 테두리
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        // 학생 이름 표시
        ctx.fillStyle = '#333';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(student.name, x + width / 2, y + height / 2);
        // 성별 표시
        ctx.fillStyle = '#666';
        ctx.font = '8px sans-serif';
        ctx.fillText(student.gender === 'M' ? '♂' : '♀', x + width / 2, y + height - 5);
    }
    /**
     * 셀 간 이동 처리
     * @param tbody tbody 요소
     * @param currentRow 현재 행 번호 (1부터 시작)
     * @param columnName 열 이름 ('name' 또는 'gender')
     * @param direction 이동 방향 ('up' 또는 'down')
     */
    moveToCell(tbody, currentRow, columnName, direction) {
        const nextRowNum = direction === 'down' ? currentRow + 1 : currentRow - 1;
        const nextRow = tbody.querySelector(`tr:nth-child(${nextRowNum})`);
        if (nextRow) {
            const cellInput = columnName === 'name'
                ? nextRow.querySelector('.student-name-input')
                : nextRow.querySelector('.student-gender-select');
            if (cellInput) {
                cellInput.focus();
                if (cellInput instanceof HTMLInputElement) {
                    cellInput.select();
                }
            }
        }
    }
    /**
     * 양식 파일 다운로드
     */
    downloadTemplateFile() {
        // CSV 양식 파일 생성
        const headers = ['번호', '이름', '성별'];
        const exampleData = [
            ['1', '홍길동', '남'],
            ['2', '김영희', '여'],
            ['3', '이철수', '남']
        ];
        let csvContent = headers.join(',') + '\n';
        exampleData.forEach(row => {
            csvContent += row.join(',') + '\n';
        });
        // BOM 추가 (엑셀에서 한글 깨짐 방지)
        const BOM = '\uFEFF';
        csvContent = BOM + csvContent;
        // 파일 다운로드
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '학생_명렬표_양식.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.outputModule.showSuccess('양식 파일이 다운로드되었습니다. 엑셀로 열어서 학생 정보를 입력하세요.');
    }
    /**
     * 파일 업로드 처리
     * @param event 파일 선택 이벤트
     */
    handleFileUpload(event) {
        const input = event.target;
        const file = input.files?.[0];
        if (!file)
            return;
        const fileName = file.name.toLowerCase();
        // 파일 확장자 확인
        if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            this.outputModule.showError('CSV 또는 엑셀 파일(.csv, .xlsx, .xls)만 업로드 가능합니다.');
            return;
        }
        // CSV 파일 읽기
        if (fileName.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    this.parseCsvFile(text);
                }
                catch (error) {
                    console.error('파일 읽기 오류:', error);
                    this.outputModule.showError('파일을 읽는 중 오류가 발생했습니다.');
                }
            };
            reader.readAsText(file, 'UTF-8');
        }
        else {
            // 엑셀 파일인 경우 안내 메시지
            this.outputModule.showError('엑셀 파일은 CSV로 저장한 후 업로드해주세요. 파일 > 다른 이름으로 저장 > CSV(쉼표로 구분)(*.csv)');
        }
    }
    /**
     * CSV 파일 파싱 및 테이블에 데이터 입력
     * @param csvText CSV 파일 내용
     */
    parseCsvFile(csvText) {
        // BOM 제거
        csvText = csvText.replace(/^\uFEFF/, '');
        // 줄바꿈 정리
        csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = csvText.split('\n');
        const students = [];
        // 첫 번째 줄(헤더) 제외하고 파싱
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            // CSV 파싱 (쉼표로 구분)
            const columns = line.split(',');
            if (columns.length >= 3) {
                const name = columns[1].trim();
                const gender = columns[2].trim();
                if (name && (gender === '남' || gender === '여' || gender === 'M' || gender === 'F')) {
                    const normalizedGender = (gender === '남' || gender === 'M') ? 'M' : 'F';
                    students.push({ name, gender: normalizedGender });
                }
            }
        }
        if (students.length === 0) {
            this.outputModule.showError('파일에서 학생 정보를 읽을 수 없습니다. 양식을 확인해주세요.');
            return;
        }
        // 테이블 생성 및 데이터 입력
        this.createTableWithStudents(students);
        this.outputModule.showSuccess(`${students.length}명의 학생 정보가 업로드되었습니다.`);
        // 인원수 입력 필드 업데이트 (남학생/여학생 수로 분리)
        const maleCountInput = document.getElementById('male-students');
        const femaleCountInput = document.getElementById('female-students');
        if (maleCountInput && femaleCountInput) {
            const maleStudents = students.filter(s => s.gender === 'M').length;
            const femaleStudents = students.filter(s => s.gender === 'F').length;
            maleCountInput.value = maleStudents.toString();
            femaleCountInput.value = femaleStudents.toString();
        }
        // 파일 input 초기화
        const uploadInput = document.getElementById('upload-file');
        if (uploadInput) {
            uploadInput.value = '';
        }
    }
    /**
     * 학생 데이터로 테이블 생성
     * @param students 학생 배열
     */
    createTableWithStudents(students) {
        const outputSection = document.getElementById('output-section');
        if (!outputSection)
            return;
        // 기존 캔버스 숨기기
        const canvasContainer = outputSection.querySelector('#canvas-container');
        if (canvasContainer) {
            canvasContainer.style.display = 'none';
        }
        // 기존 테이블 제거
        let studentTableContainer = outputSection.querySelector('.student-table-container');
        if (studentTableContainer) {
            studentTableContainer.remove();
        }
        // 새 테이블 컨테이너 생성
        studentTableContainer = document.createElement('div');
        studentTableContainer.className = 'student-table-container';
        // 가로 방향 2-3단 레이아웃을 위한 스타일 적용
        studentTableContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        `;
        // 버튼 컨테이너 생성
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginBottom = '15px';
        buttonContainer.style.gridColumn = '1 / -1';
        // 양식 다운로드 버튼
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'download-template';
        downloadBtn.className = 'secondary-btn';
        downloadBtn.textContent = '학생 이름 양식 다운로드';
        downloadBtn.style.flex = 'none';
        downloadBtn.style.width = 'auto';
        downloadBtn.style.whiteSpace = 'nowrap';
        downloadBtn.addEventListener('click', () => this.downloadTemplateFile());
        buttonContainer.appendChild(downloadBtn);
        // 파일 업로드 버튼
        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'upload-file';
        uploadBtn.className = 'secondary-btn';
        uploadBtn.textContent = '학생 이름 엑셀파일에서 가져오기';
        uploadBtn.style.flex = 'none';
        uploadBtn.style.width = 'auto';
        uploadBtn.style.whiteSpace = 'nowrap';
        // 숨겨진 파일 입력
        const fileInput = document.createElement('input');
        fileInput.id = 'upload-file-input';
        fileInput.type = 'file';
        fileInput.accept = '.csv,.xlsx,.xls';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        buttonContainer.appendChild(uploadBtn);
        buttonContainer.appendChild(fileInput);
        // 우리 반 이름 불러오기 버튼
        const loadClassBtn3 = document.createElement('button');
        loadClassBtn3.id = 'load-class-names-3';
        loadClassBtn3.className = 'secondary-btn';
        loadClassBtn3.textContent = '우리 반 이름 불러오기';
        loadClassBtn3.style.flex = 'none';
        loadClassBtn3.style.width = 'auto';
        loadClassBtn3.style.whiteSpace = 'nowrap';
        loadClassBtn3.addEventListener('click', () => this.handleLoadClassNames());
        buttonContainer.appendChild(loadClassBtn3);
        // 자리 배치하기 버튼과 체크박스 추가
        const arrangeBtn = document.createElement('button');
        arrangeBtn.id = 'arrange-seats';
        arrangeBtn.className = 'arrange-seats-btn';
        arrangeBtn.textContent = '자리 배치 실행하기';
        arrangeBtn.style.width = 'auto';
        arrangeBtn.style.flex = 'none';
        arrangeBtn.style.whiteSpace = 'nowrap';
        buttonContainer.appendChild(arrangeBtn);
        // 이전 좌석 안 앉기 체크박스
        const avoidPrevSeatLabel = document.createElement('label');
        avoidPrevSeatLabel.style.cssText = 'display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;';
        const avoidPrevSeatInput = document.createElement('input');
        avoidPrevSeatInput.type = 'checkbox';
        avoidPrevSeatInput.id = 'avoid-prev-seat';
        const avoidPrevSeatSpan = document.createElement('span');
        avoidPrevSeatSpan.textContent = '이전 좌석 안 앉기';
        avoidPrevSeatLabel.appendChild(avoidPrevSeatInput);
        avoidPrevSeatLabel.appendChild(avoidPrevSeatSpan);
        buttonContainer.appendChild(avoidPrevSeatLabel);
        // 이전 짝 금지 체크박스
        const avoidPrevPartnerLabel = document.createElement('label');
        avoidPrevPartnerLabel.style.cssText = 'display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;';
        const avoidPrevPartnerInput = document.createElement('input');
        avoidPrevPartnerInput.type = 'checkbox';
        avoidPrevPartnerInput.id = 'avoid-prev-partner';
        const avoidPrevPartnerSpan = document.createElement('span');
        avoidPrevPartnerSpan.textContent = '이전 짝 금지';
        avoidPrevPartnerLabel.appendChild(avoidPrevPartnerInput);
        avoidPrevPartnerLabel.appendChild(avoidPrevPartnerSpan);
        buttonContainer.appendChild(avoidPrevPartnerLabel);
        studentTableContainer.appendChild(buttonContainer);
        const count = students.length;
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
        // 학생 수에 따라 테이블 개수 결정 (10명씩 그룹화)
        const studentsPerTable = 10;
        const numberOfTables = Math.ceil(count / studentsPerTable);
        // 각 테이블 생성 (10명씩)
        for (let tableIndex = 0; tableIndex < numberOfTables; tableIndex++) {
            const startIndex = tableIndex * studentsPerTable;
            const endIndex = Math.min(startIndex + studentsPerTable, count);
            const studentsInThisTable = endIndex - startIndex;
            // 개별 테이블 래퍼 생성
            const tableWrapper = document.createElement('div');
            tableWrapper.style.cssText = `
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                min-width: 0; /* 그리드 아이템이 축소될 수 있도록 */
                overflow-x: auto; /* 테이블이 너무 넓으면 가로 스크롤 */
            `;
            // 테이블 제목 추가 (2개 이상일 때만)
            if (numberOfTables > 1) {
                const tableTitle = document.createElement('div');
                tableTitle.style.cssText = `
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #495057;
                    font-size: 1.1em;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #dee2e6;
                `;
                tableTitle.textContent = `${startIndex + 1}번 ~ ${endIndex}번`;
                tableWrapper.appendChild(tableTitle);
            }
            // 테이블 생성
            const table = document.createElement('table');
            table.className = 'student-input-table';
            table.style.cssText = `
                width: 100%;
                border-collapse: collapse;
            `;
            // 헤더 생성
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            if (fixedRandomMode) {
                headerRow.innerHTML = `
                    <th>번호</th>
                    <th>이름</th>
                    <th>성별</th>
                    <th title="미리보기 화면의 좌석 카드에 표시된 번호(#1, #2...)를 선택하세요. 고정 좌석을 지정하지 않으려면 '없음'을 선택하세요.">고정 좌석</th>
                    <th>작업</th>
                `;
            }
            else {
                headerRow.innerHTML = `
                    <th>번호</th>
                    <th>이름</th>
                    <th>성별</th>
                    <th>작업</th>
                `;
            }
            thead.appendChild(headerRow);
            table.appendChild(thead);
            // 본문 생성
            const tbody = document.createElement('tbody');
            for (let i = startIndex; i < endIndex; i++) {
                const student = students[i];
                const globalIndex = i + 1; // 전체 학생 중 인덱스 (1부터 시작)
                const localIndex = i - startIndex + 1; // 현재 테이블 내에서의 인덱스 (1부터 시작)
                const row = document.createElement('tr');
                row.dataset.studentIndex = i.toString();
                // 번호 열
                const numCell = document.createElement('td');
                numCell.textContent = globalIndex.toString();
                numCell.style.textAlign = 'center';
                numCell.style.padding = '10px';
                numCell.style.background = '#f8f9fa';
                // 이름 입력 열
                const nameCell = document.createElement('td');
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.placeholder = '학생 이름';
                nameInput.className = 'student-name-input';
                nameInput.value = student.name;
                nameInput.id = `student-name-${globalIndex}`;
                nameInput.tabIndex = globalIndex;
                nameCell.appendChild(nameInput);
                // 성별 선택 열
                const genderCell = document.createElement('td');
                const genderSelect = document.createElement('select');
                genderSelect.className = 'student-gender-select';
                genderSelect.id = `student-gender-${globalIndex}`;
                genderSelect.innerHTML = `
                    <option value="">선택</option>
                    <option value="M">남</option>
                    <option value="F">여</option>
                `;
                genderSelect.value = student.gender;
                genderSelect.tabIndex = count + globalIndex;
                genderCell.appendChild(genderSelect);
                // 고정 좌석 선택 열 (고정 좌석 모드일 때만)
                let fixedSeatCell = null;
                if (fixedRandomMode) {
                    fixedSeatCell = document.createElement('td');
                    const fixedSeatSelect = document.createElement('select');
                    fixedSeatSelect.className = 'fixed-seat-select';
                    fixedSeatSelect.id = `fixed-seat-${globalIndex}`;
                    fixedSeatSelect.innerHTML = '<option value="">없음</option>';
                    fixedSeatSelect.tabIndex = count * 2 + globalIndex;
                    // 고정된 좌석이 있으면 옵션 추가
                    if (this.fixedSeatIds.size > 0) {
                        this.fixedSeatIds.forEach(seatId => {
                            const option = document.createElement('option');
                            option.value = seatId.toString();
                            option.textContent = `좌석 #${seatId}`;
                            fixedSeatSelect.appendChild(option);
                        });
                    }
                    // 학생 데이터에 저장된 고정 좌석이 있으면 선택
                    const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                    if (this.students[studentIndex] && this.students[studentIndex].fixedSeatId) {
                        fixedSeatSelect.value = this.students[studentIndex].fixedSeatId.toString();
                        // 번호 셀 배경색 설정 (초기 상태)
                        if (numCell) {
                            numCell.style.background = '#667eea';
                            numCell.style.color = 'white';
                            numCell.style.fontWeight = 'bold';
                        }
                    }
                    // 고정 좌석 선택 변경 이벤트
                    fixedSeatSelect.addEventListener('change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        // 학생 데이터에 고정 좌석 ID 저장
                        if (this.students[studentIndex]) {
                            if (selectedSeatId) {
                                this.students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            }
                            else {
                                delete this.students[studentIndex].fixedSeatId;
                            }
                        }
                        // 번호 셀 배경색 변경
                        const numCell = row.querySelector('td:first-child');
                        if (numCell) {
                            if (selectedSeatId) {
                                // 고정 좌석이 선택된 경우 파란색 배경
                                numCell.style.background = '#667eea';
                                numCell.style.color = 'white';
                                numCell.style.fontWeight = 'bold';
                            }
                            else {
                                // 선택이 해제된 경우 원래 배경색으로 복원
                                numCell.style.background = '#f8f9fa';
                                numCell.style.color = '';
                                numCell.style.fontWeight = '';
                            }
                        }
                        console.log(`학생 ${studentIndex}의 고정 좌석: ${selectedSeatId || '없음'}`);
                    });
                    fixedSeatCell.appendChild(fixedSeatSelect);
                }
                // 작업 열 (삭제 버튼)
                const actionCell = document.createElement('td');
                actionCell.style.textAlign = 'center';
                actionCell.style.padding = '8px';
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '🗑️'; // 삭제 아이콘
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.title = '삭제';
                deleteBtn.onclick = () => this.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);
                // 키보드 이벤트 추가 (이름 입력 필드)
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        genderSelect.focus();
                    }
                    else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'name', 'down');
                    }
                    else if (e.key === 'ArrowUp') {
                        this.moveToCell(tbody, localIndex, 'name', 'up');
                    }
                });
                // 키보드 이벤트 추가 (성별 선택 필드)
                genderSelect.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        const nextRow = tbody.querySelector(`tr:nth-child(${Math.min(localIndex + 1, studentsInThisTable)})`);
                        const nextNameInput = nextRow?.querySelector('.student-name-input');
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    }
                    else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'gender', 'down');
                    }
                    else if (e.key === 'ArrowUp') {
                        this.moveToCell(tbody, localIndex, 'gender', 'up');
                    }
                });
                row.appendChild(numCell);
                row.appendChild(nameCell);
                row.appendChild(genderCell);
                if (fixedSeatCell) {
                    row.appendChild(fixedSeatCell);
                }
                row.appendChild(actionCell);
                tbody.appendChild(row);
            }
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            studentTableContainer.appendChild(tableWrapper);
        }
        // 통계와 버튼을 하나의 컨테이너로 묶기
        const statsAndButtonsWrapper = document.createElement('div');
        statsAndButtonsWrapper.style.cssText = `
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 10px;
            margin-top: 10px;
            flex-wrap: wrap;
        `;
        // 통계 표시를 위한 컨테이너 추가 (모든 테이블 아래에 하나만)
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 0.95em;
            flex: 0 0 auto;
            width: fit-content;
        `;
        statsContainer.id = 'student-table-stats';
        const statsCell = document.createElement('div');
        statsCell.id = 'student-table-stats-cell';
        statsContainer.appendChild(statsCell);
        statsAndButtonsWrapper.appendChild(statsContainer);
        // 작업 버튼 추가
        const actionButtons = document.createElement('div');
        actionButtons.className = 'table-action-buttons';
        actionButtons.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            flex: 0 0 auto;
        `;
        actionButtons.innerHTML = `
            <button id="add-student-row-btn" style="width: auto; flex: 0 0 auto; min-width: 0;">행 추가</button>
            <button id="save-student-table-btn" class="save-btn" style="width: auto; flex: 0 0 auto; min-width: 0; background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; white-space: nowrap;">✅ 우리반 학생으로 등록하기</button>
        `;
        statsAndButtonsWrapper.appendChild(actionButtons);
        studentTableContainer.appendChild(statsAndButtonsWrapper);
        outputSection.appendChild(studentTableContainer);
        // 초기 통계 업데이트
        this.updateStudentTableStats();
        // 통계 업데이트를 위한 이벤트 리스너 추가 (이벤트 위임으로 모든 변경사항 감지)
        // 모든 테이블의 tbody에 이벤트 리스너 추가
        const allTbodies = studentTableContainer.querySelectorAll('tbody');
        allTbodies.forEach(tbody => {
            tbody.addEventListener('input', () => {
                this.updateStudentTableStats();
            });
            tbody.addEventListener('change', () => {
                this.updateStudentTableStats();
            });
            // 테이블이 동적으로 변경될 때를 대비한 MutationObserver 추가
            const observer = new MutationObserver(() => {
                this.updateStudentTableStats();
            });
            observer.observe(tbody, {
                childList: true,
                subtree: true,
                attributes: false
            });
        });
    }
    /**
     * 교탁과 칠판 그리기
     */
    drawTeacherDeskAndBoard(ctx, canvas) {
        const width = canvas.width;
        // 칠판 그리기
        ctx.fillStyle = '#2c3e50';
        const boardY = 10;
        const boardHeight = 60;
        ctx.fillRect(width * 0.2, boardY, width * 0.6, boardHeight);
        // 칠판 테두리
        ctx.strokeStyle = '#1a252f';
        ctx.lineWidth = 2;
        ctx.strokeRect(width * 0.2, boardY, width * 0.6, boardHeight);
        // 칠판 텍스트
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('칠판', width * 0.5, boardY + 40);
        // 교탁 그리기
        const deskY = boardY + boardHeight + 15;
        const deskWidth = 80;
        const deskHeight = 20;
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect((width - deskWidth) / 2, deskY, deskWidth, deskHeight);
        // 교탁 테두리
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.strokeRect((width - deskWidth) / 2, deskY, deskWidth, deskHeight);
        // 교탁 다리
        const legWidth = 5;
        const legHeight = 30;
        ctx.fillStyle = '#7f8c8d';
        // 왼쪽 다리
        ctx.fillRect((width - deskWidth) / 2 + 10, deskY + deskHeight, legWidth, legHeight);
        // 오른쪽 다리
        ctx.fillRect((width - deskWidth) / 2 + deskWidth - 10 - legWidth, deskY + deskHeight, legWidth, legHeight);
    }
    /**
     * 커스텀 모드 1 토글 (4단계 활성화/비활성화)
     */
    toggleCustomMode1(disable) {
        const advancedSection = document.getElementById('advanced-section');
        if (!advancedSection)
            return;
        // 라디오 버튼들 가져오기
        const radioOptions = advancedSection.querySelectorAll('input[name="custom-mode-1"]');
        const labels = advancedSection.querySelectorAll('label.radio-option');
        radioOptions.forEach((radio, index) => {
            const radioElement = radio;
            const label = labels[index];
            if (disable) {
                // 비활성화
                radioElement.disabled = true;
                if (label) {
                    label.style.opacity = '0.5';
                    label.style.pointerEvents = 'none';
                    label.style.cursor = 'not-allowed';
                }
                advancedSection.style.opacity = '0.5';
                advancedSection.style.pointerEvents = 'none';
            }
            else {
                // 활성화
                radioElement.disabled = false;
                if (label) {
                    label.style.opacity = '1';
                    label.style.pointerEvents = 'auto';
                    label.style.cursor = 'pointer';
                }
                advancedSection.style.opacity = '1';
                advancedSection.style.pointerEvents = 'auto';
            }
        });
    }
    /**
     * 1명씩 한 줄로 배치 서브 메뉴 토글
     */
    toggleSingleSubmenu(show) {
        const singleSubmenu = document.getElementById('single-submenu');
        if (!singleSubmenu)
            return;
        if (show) {
            singleSubmenu.style.display = 'block';
        }
        else {
            singleSubmenu.style.display = 'none';
        }
    }
    togglePairSubmenu(show) {
        const pairSubmenu = document.getElementById('pair-submenu');
        if (!pairSubmenu)
            return;
        if (show) {
            pairSubmenu.style.display = 'block';
        }
        else {
            pairSubmenu.style.display = 'none';
        }
    }
    /**
     * 모둠 배치 서브 메뉴 토글
     */
    toggleGroupSubmenu(show) {
        const groupSubmenu = document.getElementById('group-submenu');
        if (!groupSubmenu)
            return;
        if (show) {
            groupSubmenu.style.display = 'block';
        }
        else {
            groupSubmenu.style.display = 'none';
        }
    }
    /**
     * 모둠 배치 남녀 섞기 옵션 토글
     */
    toggleGroupGenderMixOption(show) {
        const genderMixOption = document.getElementById('group-gender-mix-option');
        if (!genderMixOption)
            return;
        if (show) {
            genderMixOption.style.display = 'block';
        }
        else {
            genderMixOption.style.display = 'none';
        }
    }
    /**
     * 모둠 배치 선택 시 분단 개수 제한 적용
     */
    updatePartitionLimitForGroup(groupSize) {
        const partitionInput = document.getElementById('number-of-partitions');
        if (!partitionInput)
            return;
        // 3명 모둠 배치 선택 시 3, 4, 5개 분단만 허용
        if (groupSize === 'group-3') {
            partitionInput.min = '3';
            partitionInput.max = '5';
            // 현재 값이 허용 범위를 벗어나면 조정
            const currentValue = parseInt(partitionInput.value, 10);
            if (currentValue < 3) {
                partitionInput.value = '3';
            }
            else if (currentValue > 5) {
                partitionInput.value = '5';
            }
        }
        // 4명 모둠 배치 선택 시 3, 4개 분단만 허용
        else if (groupSize === 'group-4') {
            partitionInput.min = '3';
            partitionInput.max = '4';
            // 현재 값이 허용 범위를 벗어나면 조정
            const currentValue = parseInt(partitionInput.value, 10);
            if (currentValue < 3) {
                partitionInput.value = '3';
            }
            else if (currentValue > 4) {
                partitionInput.value = '4';
            }
        }
        // 5명 모둠 배치 선택 시 3, 4, 5개 분단만 허용
        else if (groupSize === 'group-5') {
            partitionInput.min = '3';
            partitionInput.max = '5';
            // 현재 값이 허용 범위를 벗어나면 조정
            const currentValue = parseInt(partitionInput.value, 10);
            if (currentValue < 3) {
                partitionInput.value = '3';
            }
            else if (currentValue > 5) {
                partitionInput.value = '5';
            }
        }
        // 6명 모둠 배치 선택 시 2, 3, 4개 분단만 허용
        else if (groupSize === 'group-6') {
            partitionInput.min = '2';
            partitionInput.max = '4';
            // 현재 값이 허용 범위를 벗어나면 조정
            const currentValue = parseInt(partitionInput.value, 10);
            if (currentValue < 2) {
                partitionInput.value = '2';
            }
            else if (currentValue > 4) {
                partitionInput.value = '4';
            }
        }
        else {
            // 다른 모둠 배치 옵션이면 제한 해제
            this.resetPartitionLimit();
        }
    }
    /**
     * 1명씩 한줄로 배치 선택 시 분단 개수 제한 적용 (3, 4, 5, 6만 허용)
     */
    updatePartitionLimitForSingleUniform() {
        const partitionInput = document.getElementById('number-of-partitions');
        if (!partitionInput)
            return;
        partitionInput.min = '3';
        partitionInput.max = '6';
        // 현재 값이 허용 범위를 벗어나면 조정
        const currentValue = parseInt(partitionInput.value, 10);
        if (currentValue < 3) {
            partitionInput.value = '3';
        }
        else if (currentValue > 6) {
            partitionInput.value = '6';
        }
    }
    /**
     * 짝꿍 배치 선택 시 분단 개수 제한 적용 (3, 4, 5만 허용)
     */
    updatePartitionLimitForPair() {
        const partitionInput = document.getElementById('number-of-partitions');
        if (!partitionInput)
            return;
        partitionInput.min = '3';
        partitionInput.max = '5';
        // 현재 값이 허용 범위를 벗어나면 조정
        const currentValue = parseInt(partitionInput.value, 10);
        if (currentValue < 3) {
            partitionInput.value = '3';
        }
        else if (currentValue > 5) {
            partitionInput.value = '5';
        }
    }
    /**
     * 분단 개수 제한 해제 (기본값으로 복원)
     */
    resetPartitionLimit() {
        const partitionInput = document.getElementById('number-of-partitions');
        if (!partitionInput)
            return;
        partitionInput.min = '1';
        partitionInput.max = '10';
    }
    /**
     * 프로그램 실행
     */
    run() {
        if (!this.isInitialized) {
            console.error('컨트롤러가 초기화되지 않았습니다.');
            return;
        }
        console.log('교실 자리 배치 프로그램이 시작되었습니다.');
    }
    /**
     * 좌석 배치하기 처리
     */
    handleArrangeSeats() {
        // 3초 동안 지속하는 음향 효과 재생
        this.playArrangementSound();
        try {
            // 커튼 애니메이션 시작
            this.startCurtainAnimation();
            // 테이블에서 학생 데이터 가져오기
            const studentData = this.inputModule.getStudentData();
            if (studentData.length === 0) {
                alert('학생 정보를 먼저 입력해주세요.');
                this.stopCurtainAnimation();
                return;
            }
            console.log('학생 데이터:', studentData);
            // 학생 데이터를 Student 객체로 변환
            this.students = StudentModel.createMultiple(studentData);
            // 고정 좌석 모드인지 확인
            const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked');
            // 고정 좌석 정보를 테이블에서 읽어오기
            if (fixedRandomMode) {
                const fixedSeatSelects = document.querySelectorAll('.fixed-seat-select');
                fixedSeatSelects.forEach((select, index) => {
                    const seatIdStr = select.value;
                    if (seatIdStr && index < this.students.length && this.students[index]) {
                        const seatId = parseInt(seatIdStr, 10);
                        if (!isNaN(seatId)) {
                            this.students[index].fixedSeatId = seatId;
                            console.log(`학생 ${this.students[index].name} → 고정 좌석 ${seatIdStr}`);
                        }
                    }
                });
            }
            // 남학생과 여학생 분리
            const maleStudents = this.students.filter(s => s.gender === 'M');
            const femaleStudents = this.students.filter(s => s.gender === 'F');
            console.log('남학생 수:', maleStudents.length, '여학생 수:', femaleStudents.length);
            // 기존 카드들에서 이름만 변경 (카드 위치는 고정)
            const seatsArea = document.getElementById('seats-area');
            if (!seatsArea)
                return;
            // 기존 카드들 가져오기 (분단 레이블 제외)
            const existingCards = seatsArea.querySelectorAll('.student-seat-card');
            console.log('기존 카드 수:', existingCards.length);
            if (existingCards.length === 0) {
                alert('먼저 좌석 배치 형태를 설정해주세요.');
                return;
            }
            // 옵션 체크박스 값 읽기
            const avoidPrevSeat = document.getElementById('avoid-prev-seat')?.checked === true;
            const avoidPrevPartner = document.getElementById('avoid-prev-partner')?.checked === true;
            // 확정된 자리 이력에서 이전 좌석 및 짝꿍 정보 추출
            const { lastSeatByStudent, lastPartnerByStudent } = this.extractHistoryConstraints(avoidPrevSeat, avoidPrevPartner);
            // 고정 좌석 모드인 경우
            if (fixedRandomMode && this.fixedSeatIds.size > 0) {
                // 1단계: 모든 카드의 이름 초기화
                existingCards.forEach((card) => {
                    const cardElement = card;
                    const nameDiv = cardElement.querySelector('.student-name');
                    if (nameDiv) {
                        nameDiv.textContent = '';
                    }
                });
                // 2단계: 고정 좌석에 지정된 학생 배치
                const fixedStudents = this.students.filter(s => s.fixedSeatId !== undefined);
                existingCards.forEach((card) => {
                    const cardElement = card;
                    const seatIdStr = cardElement.getAttribute('data-seat-id');
                    if (!seatIdStr)
                        return;
                    const seatId = parseInt(seatIdStr, 10);
                    // 고정 좌석인 경우
                    if (this.fixedSeatIds.has(seatId)) {
                        const fixedStudent = fixedStudents.find(s => s.fixedSeatId === seatId);
                        if (fixedStudent) {
                            const nameDiv = cardElement.querySelector('.student-name');
                            if (nameDiv) {
                                nameDiv.textContent = fixedStudent.name;
                                console.log(`고정 좌석 ${seatId}에 ${fixedStudent.name} 배치`);
                            }
                        }
                    }
                });
                // 3단계: 나머지 좌석에 랜덤 배치
                // 고정 좌석에 배치된 학생들을 제외한 나머지 학생들
                const allRemainingMales = maleStudents.filter(s => !s.fixedSeatId);
                const allRemainingFemales = femaleStudents.filter(s => !s.fixedSeatId);
                let shuffledMales = [...allRemainingMales].sort(() => Math.random() - 0.5);
                let shuffledFemales = [...allRemainingFemales].sort(() => Math.random() - 0.5);
                // 고정 좌석이 아닌 좌석만 필터링
                const nonFixedCards = Array.from(existingCards).filter(card => {
                    const seatIdStr = card.getAttribute('data-seat-id');
                    if (!seatIdStr)
                        return false;
                    const seatId = parseInt(seatIdStr, 10);
                    return !this.fixedSeatIds.has(seatId);
                });
                console.log(`고정 좌석 제외: 총 ${existingCards.length}개 좌석 중 ${nonFixedCards.length}개 좌석만 랜덤 배치 대상`);
                console.log(`고정 학생 제외: 남학생 ${allRemainingMales.length}명, 여학생 ${allRemainingFemales.length}명만 랜덤 배치 대상`);
                // 페어 컨테이너 우선 처리 (짝 제약 고려)
                const seatsAreaEl = document.getElementById('seats-area');
                const pairContainers = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = card.parentElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (siblings && siblings.length === 2 && pairContainers.indexOf(parent) === -1) {
                        pairContainers.push(parent);
                    }
                });
                pairContainers.forEach(container => {
                    const cards = Array.from(container.querySelectorAll('.student-seat-card'));
                    if (cards.length !== 2)
                        return;
                    const [cardA, cardB] = cards;
                    const seatIdA = parseInt(cardA.getAttribute('data-seat-id') || '0', 10);
                    const seatIdB = parseInt(cardB.getAttribute('data-seat-id') || '0', 10);
                    const isMaleA = cardA.classList.contains('gender-m');
                    const isMaleB = cardB.classList.contains('gender-m');
                    const nameDivA = cardA.querySelector('.student-name');
                    const nameDivB = cardB.querySelector('.student-name');
                    // 각 카드의 이름 존재 여부 확인 (고정 좌석 모드)
                    const hasNameA = nameDivA && nameDivA.textContent && nameDivA.textContent.trim() !== '';
                    const hasNameB = nameDivB && nameDivB.textContent && nameDivB.textContent.trim() !== '';
                    // 둘 다 이름이 있으면 이미 모두 배치된 것이므로 스킵
                    if (hasNameA && hasNameB) {
                        return;
                    }
                    const poolA = isMaleA ? shuffledMales : shuffledFemales;
                    const poolB = isMaleB ? shuffledMales : shuffledFemales;
                    // A 카드 처리 (이름이 없는 경우만)
                    let chosenA = undefined;
                    if (!hasNameA) {
                        if (poolA.length === 0) {
                            // poolA가 비어있으면 다른 성별에서 시도
                            const alternativePoolA = isMaleA ? shuffledFemales : shuffledMales;
                            if (alternativePoolA.length > 0) {
                                let idxA = 0;
                                if (avoidPrevSeat) {
                                    for (let i = 0; i < alternativePoolA.length; i++) {
                                        const cand = alternativePoolA[i];
                                        if (lastSeatByStudent[cand.name] !== seatIdA) {
                                            idxA = i;
                                            break;
                                        }
                                    }
                                }
                                chosenA = alternativePoolA.splice(idxA, 1)[0];
                                if (nameDivA && chosenA)
                                    nameDivA.textContent = chosenA.name || '';
                                if (isMaleA)
                                    shuffledMales = alternativePoolA;
                                else
                                    shuffledFemales = alternativePoolA;
                            }
                        }
                        else {
                            let idxA = 0;
                            if (avoidPrevSeat) {
                                for (let i = 0; i < poolA.length; i++) {
                                    const cand = poolA[i];
                                    if (lastSeatByStudent[cand.name] !== seatIdA) {
                                        idxA = i;
                                        break;
                                    }
                                }
                            }
                            chosenA = poolA.splice(idxA, 1)[0];
                            if (nameDivA && chosenA)
                                nameDivA.textContent = chosenA.name || '';
                            if (isMaleA)
                                shuffledMales = poolA;
                            else
                                shuffledFemales = poolA;
                        }
                    }
                    else {
                        // A에 이미 이름이 있으면 해당 학생 정보 가져오기 (partner 제약 확인용)
                        const existingName = nameDivA.textContent?.trim() || '';
                        chosenA = this.students.find(s => s.name === existingName);
                    }
                    // B 카드 처리 (이름이 없는 경우만)
                    if (!hasNameB) {
                        if (poolB.length === 0) {
                            // poolB가 비어있으면 다른 성별에서 시도
                            const alternativePoolB = isMaleB ? shuffledFemales : shuffledMales;
                            if (alternativePoolB.length > 0) {
                                let idxB = 0;
                                // partner 제약 고려
                                if (chosenA) {
                                    for (let i = 0; i < alternativePoolB.length; i++) {
                                        const cand = alternativePoolB[i];
                                        const seatOk = !avoidPrevSeat || lastSeatByStudent[cand.name] !== seatIdB;
                                        const partnerOk = !avoidPrevPartner || (lastPartnerByStudent[chosenA.name] !== cand.name &&
                                            lastPartnerByStudent[cand.name] !== chosenA.name);
                                        if (seatOk && partnerOk) {
                                            idxB = i;
                                            break;
                                        }
                                    }
                                }
                                else if (avoidPrevSeat) {
                                    for (let i = 0; i < alternativePoolB.length; i++) {
                                        const cand = alternativePoolB[i];
                                        if (lastSeatByStudent[cand.name] !== seatIdB) {
                                            idxB = i;
                                            break;
                                        }
                                    }
                                }
                                const chosenB = alternativePoolB.splice(idxB, 1)[0];
                                if (nameDivB && chosenB)
                                    nameDivB.textContent = chosenB.name || '';
                                if (isMaleB)
                                    shuffledMales = alternativePoolB;
                                else
                                    shuffledFemales = alternativePoolB;
                            }
                        }
                        else {
                            let idxB = -1;
                            // partner 제약 고려
                            for (let i = 0; i < poolB.length; i++) {
                                const cand = poolB[i];
                                const seatOk = !avoidPrevSeat || lastSeatByStudent[cand.name] !== seatIdB;
                                const partnerOk = !avoidPrevPartner || !chosenA || (lastPartnerByStudent[chosenA.name] !== cand.name &&
                                    lastPartnerByStudent[cand.name] !== chosenA.name);
                                if (seatOk && partnerOk) {
                                    idxB = i;
                                    break;
                                }
                            }
                            // 조건을 만족하는 학생이 없으면 첫 번째 학생을 선택 (강제 배치)
                            if (idxB === -1) {
                                idxB = 0;
                            }
                            const chosenB = poolB.splice(idxB, 1)[0];
                            if (nameDivB && chosenB)
                                nameDivB.textContent = chosenB.name || '';
                            if (isMaleB)
                                shuffledMales = poolB;
                            else
                                shuffledFemales = poolB;
                        }
                    }
                });
                // 나머지 단일 카드 처리 (고정 좌석 제외)
                const singleCards = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = card.parentElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (!siblings || siblings.length !== 2) {
                        const seatIdStr = card.getAttribute('data-seat-id');
                        if (seatIdStr) {
                            const seatId = parseInt(seatIdStr, 10);
                            // 고정 좌석이 아닌 경우만 추가
                            if (!this.fixedSeatIds.has(seatId)) {
                                singleCards.push(card);
                            }
                        }
                    }
                });
                singleCards.forEach(cardElement => {
                    const seatIdStr = cardElement.getAttribute('data-seat-id');
                    if (!seatIdStr)
                        return;
                    const seatId = parseInt(seatIdStr, 10);
                    const nameDiv = cardElement.querySelector('.student-name');
                    // 이미 이름이 있는 카드는 스킵 (이미 페어 컨테이너에서 배치된 경우)
                    const hasName = nameDiv && nameDiv.textContent && nameDiv.textContent.trim() !== '';
                    if (hasName) {
                        return;
                    }
                    const isMaleCard = cardElement.classList.contains('gender-m');
                    // 남은 학생 중에서 성별에 맞는 학생 찾기, 없으면 다른 성별도 허용
                    let pool = isMaleCard ? shuffledMales : shuffledFemales;
                    if (pool.length === 0) {
                        // 성별에 맞는 학생이 없으면 다른 성별에서 가져오기
                        pool = isMaleCard ? shuffledFemales : shuffledMales;
                    }
                    if (pool.length === 0) {
                        if (nameDiv)
                            nameDiv.textContent = '';
                        return;
                    }
                    let pickIdx = 0;
                    if (avoidPrevSeat) {
                        for (let i = 0; i < pool.length; i++) {
                            const cand = pool[i];
                            if (lastSeatByStudent[cand.name] !== seatId) {
                                pickIdx = i;
                                break;
                            }
                        }
                    }
                    const chosen = pool.splice(pickIdx, 1)[0];
                    if (nameDiv && chosen)
                        nameDiv.textContent = chosen.name || '';
                    if (isMaleCard)
                        shuffledMales = pool;
                    else
                        shuffledFemales = pool;
                });
            }
            else {
                // 일반 랜덤 배치 모드
                let shuffledMales = [...maleStudents].sort(() => Math.random() - 0.5);
                let shuffledFemales = [...femaleStudents].sort(() => Math.random() - 0.5);
                console.log('섞인 남학생:', shuffledMales.map(s => s.name));
                console.log('섞인 여학생:', shuffledFemales.map(s => s.name));
                // 페어 컨테이너 우선 처리
                const seatsAreaEl = document.getElementById('seats-area');
                const pairContainers = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = card.parentElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (siblings && siblings.length === 2 && pairContainers.indexOf(parent) === -1) {
                        pairContainers.push(parent);
                    }
                });
                pairContainers.forEach(container => {
                    const cards = Array.from(container.querySelectorAll('.student-seat-card'));
                    if (cards.length !== 2)
                        return;
                    const [cardA, cardB] = cards;
                    const seatIdA = parseInt(cardA.getAttribute('data-seat-id') || '0', 10);
                    const seatIdB = parseInt(cardB.getAttribute('data-seat-id') || '0', 10);
                    const isMaleA = cardA.classList.contains('gender-m');
                    const isMaleB = cardB.classList.contains('gender-m');
                    const nameDivA = cardA.querySelector('.student-name');
                    const nameDivB = cardB.querySelector('.student-name');
                    const poolA = isMaleA ? shuffledMales : shuffledFemales;
                    const poolB = isMaleB ? shuffledMales : shuffledFemales;
                    // poolA가 비어있으면 스킵
                    if (poolA.length === 0) {
                        if (nameDivA)
                            nameDivA.textContent = '';
                        if (nameDivB)
                            nameDivB.textContent = '';
                        if (isMaleA)
                            shuffledMales = poolA;
                        else
                            shuffledFemales = poolA;
                        if (isMaleB)
                            shuffledMales = poolB;
                        else
                            shuffledFemales = poolB;
                        return;
                    }
                    let idxA = 0;
                    if (avoidPrevSeat) {
                        for (let i = 0; i < poolA.length; i++) {
                            const cand = poolA[i];
                            if (lastSeatByStudent[cand.name] !== seatIdA) {
                                idxA = i;
                                break;
                            }
                        }
                    }
                    const chosenA = poolA.splice(idxA, 1)[0];
                    if (nameDivA)
                        nameDivA.textContent = chosenA?.name || '';
                    // poolB가 비어있으면 다른 성별에서 시도 (고정 좌석 모드)
                    if (poolB.length === 0) {
                        // 성별에 맞는 학생이 없으면 다른 성별에서 가져오기
                        const alternativePoolB = isMaleB ? shuffledFemales : shuffledMales;
                        if (alternativePoolB.length > 0) {
                            // 대체 풀에서 학생 선택
                            const chosenB = alternativePoolB.splice(0, 1)[0];
                            if (nameDivB && chosenB)
                                nameDivB.textContent = chosenB.name || '';
                            if (isMaleB)
                                shuffledMales = alternativePoolB;
                            else
                                shuffledFemales = alternativePoolB;
                        }
                        else {
                            if (nameDivB)
                                nameDivB.textContent = '';
                        }
                        if (isMaleA)
                            shuffledMales = poolA;
                        else
                            shuffledFemales = poolA;
                        return;
                    }
                    let idxB = -1;
                    for (let i = 0; i < poolB.length; i++) {
                        const cand = poolB[i];
                        const seatOk = !avoidPrevSeat || lastSeatByStudent[cand.name] !== seatIdB;
                        const partnerOk = !avoidPrevPartner || ((chosenA && lastPartnerByStudent[chosenA.name] !== cand.name) && (lastPartnerByStudent[cand.name] !== (chosenA?.name || '')));
                        if (seatOk && partnerOk) {
                            idxB = i;
                            break;
                        }
                    }
                    // 조건을 만족하는 학생이 없으면 첫 번째 학생을 선택 (강제 배치)
                    if (idxB === -1) {
                        idxB = 0;
                    }
                    const chosenB = poolB.splice(idxB, 1)[0];
                    if (nameDivB)
                        nameDivB.textContent = chosenB?.name || '';
                    if (isMaleA)
                        shuffledMales = poolA;
                    else
                        shuffledFemales = poolA;
                    if (isMaleB)
                        shuffledMales = poolB;
                    else
                        shuffledFemales = poolB;
                });
                // 나머지 단일 카드 처리
                const singleCards = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = card.parentElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (!siblings || siblings.length !== 2) {
                        singleCards.push(card);
                    }
                });
                singleCards.forEach(cardElement => {
                    const seatIdStr = cardElement.getAttribute('data-seat-id');
                    if (!seatIdStr)
                        return;
                    const seatId = parseInt(seatIdStr, 10);
                    const nameDiv = cardElement.querySelector('.student-name');
                    const isMaleCard = cardElement.classList.contains('gender-m');
                    // 남은 학생 중에서 성별에 맞는 학생 찾기, 없으면 다른 성별도 허용
                    let pool = isMaleCard ? shuffledMales : shuffledFemales;
                    if (pool.length === 0) {
                        // 성별에 맞는 학생이 없으면 다른 성별에서 가져오기
                        pool = isMaleCard ? shuffledFemales : shuffledMales;
                    }
                    if (pool.length === 0) {
                        if (nameDiv)
                            nameDiv.textContent = '';
                        return;
                    }
                    let pickIdx = 0;
                    if (avoidPrevSeat) {
                        for (let i = 0; i < pool.length; i++) {
                            const cand = pool[i];
                            if (lastSeatByStudent[cand.name] !== seatId) {
                                pickIdx = i;
                                break;
                            }
                        }
                    }
                    const chosen = pool.splice(pickIdx, 1)[0];
                    if (nameDiv && chosen)
                        nameDiv.textContent = chosen.name || '';
                    if (isMaleCard)
                        shuffledMales = pool;
                    else
                        shuffledFemales = pool;
                });
            }
            // 현재 배치 결과 저장 (이전 좌석/짝 정보)
            const newLastSeatByStudent = {};
            const newLastPartnerByStudent = {};
            const allCards = Array.from(document.querySelectorAll('#seats-area .student-seat-card'));
            allCards.forEach(card => {
                const name = card.querySelector('.student-name')?.textContent?.trim() || '';
                const seatId = parseInt(card.getAttribute('data-seat-id') || '0', 10);
                if (name)
                    newLastSeatByStudent[name] = seatId;
                const parent = card.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.querySelectorAll('.student-seat-card'));
                    if (siblings.length === 2) {
                        const other = siblings[0] === card ? siblings[1] : siblings[0];
                        const otherName = other.querySelector('.student-name')?.textContent?.trim() || '';
                        if (name && otherName) {
                            newLastPartnerByStudent[name] = otherName;
                        }
                    }
                }
            });
            try {
                localStorage.setItem('lastSeatByStudent', JSON.stringify(newLastSeatByStudent));
                localStorage.setItem('lastPartnerByStudent', JSON.stringify(newLastPartnerByStudent));
            }
            catch { }
            this.outputModule.showSuccess('좌석 배치가 완료되었습니다!');
            // 자리 배치도 액션 버튼들 표시
            const actionButtons = document.getElementById('layout-action-buttons');
            if (actionButtons) {
                actionButtons.style.display = 'block';
            }
            // 확정된 자리 이력 드롭다운 업데이트 (항상 표시되므로 업데이트만)
            this.updateHistoryDropdown();
            // 고정 좌석 모드 도움말 숨기기
            const fixedSeatHelp = document.getElementById('fixed-seat-help');
            if (fixedSeatHelp) {
                fixedSeatHelp.style.display = 'none';
            }
            // 1초 후 폭죽 애니메이션 시작
            setTimeout(() => {
                this.startFireworks();
            }, 1000);
            // 3초 후 커튼 열기
            setTimeout(() => {
                this.openCurtain();
            }, 3000);
            // 자리 배치 완료 후 히스토리 저장
            setTimeout(() => {
                this.saveLayoutToHistory();
            }, 3100);
            // 배치 완료 후 화면을 맨 위로 스크롤 (스크롤 컨테이너와 윈도우 모두 시도)
            try {
                const resultContainer = document.querySelector('.result-container');
                const mainContent = document.querySelector('.main-content');
                const scrollTargets = [
                    window,
                    document.documentElement,
                    document.body,
                    resultContainer,
                    mainContent
                ].filter(Boolean);
                scrollTargets.forEach((t) => {
                    try {
                        if (typeof t.scrollTo === 'function') {
                            t.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        else if (typeof t.scrollTop === 'number') {
                            t.scrollTop = 0;
                        }
                    }
                    catch { }
                });
            }
            catch { }
        }
        catch (error) {
            console.error('좌석 배치 중 오류:', error);
            this.outputModule.showError('좌석 배치 중 오류가 발생했습니다.');
        }
    }
    /**
     * 자리 확정 처리
     */
    handleConfirmSeats() {
        try {
            // 현재 좌석 배치 데이터 수집
            const seatsArea = document.getElementById('seats-area');
            if (!seatsArea) {
                alert('좌석 배치 데이터를 찾을 수 없습니다.');
                return;
            }
            // 현재 배치 상태 저장
            const currentLayout = [];
            const pairInfo = []; // 짝꿍 정보
            // 현재 배치 유형 확인
            const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked');
            const isPairLayout = layoutTypeInput && layoutTypeInput.value === 'pair-uniform';
            const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card'));
            // 짝꿍 배치인 경우 짝꿍 정보 추출
            if (isPairLayout) {
                const pairContainers = [];
                allCards.forEach(card => {
                    const parent = card.parentElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (siblings && siblings.length === 2 && pairContainers.indexOf(parent) === -1) {
                        pairContainers.push(parent);
                    }
                });
                pairContainers.forEach(container => {
                    const cards = Array.from(container.querySelectorAll('.student-seat-card'));
                    if (cards.length === 2) {
                        const nameDiv1 = cards[0].querySelector('.student-name');
                        const nameDiv2 = cards[1].querySelector('.student-name');
                        const student1 = nameDiv1?.textContent?.trim() || '';
                        const student2 = nameDiv2?.textContent?.trim() || '';
                        if (student1 && student2) {
                            pairInfo.push({ student1, student2 });
                        }
                    }
                });
            }
            allCards.forEach(card => {
                const seatIdStr = card.getAttribute('data-seat-id');
                if (!seatIdStr)
                    return;
                const seatId = parseInt(seatIdStr, 10);
                const nameDiv = card.querySelector('.student-name');
                const studentName = nameDiv?.textContent?.trim() || '';
                if (studentName) {
                    const gender = card.classList.contains('gender-m') ? 'M' : 'F';
                    currentLayout.push({ seatId, studentName, gender });
                }
            });
            if (currentLayout.length === 0) {
                alert('확정할 자리 배치가 없습니다.');
                return;
            }
            // 날짜 생성 (yy-mm-dd 형식)
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            // 이력 데이터 생성
            const historyId = `history_${Date.now()}`;
            const historyItem = {
                id: historyId,
                date: dateString,
                layout: currentLayout,
                timestamp: now.getTime()
            };
            // 짝꿍 정보가 있으면 추가
            if (pairInfo.length > 0) {
                historyItem.pairInfo = pairInfo;
            }
            // localStorage에 이력 저장
            const existingHistory = this.getSeatHistory();
            existingHistory.unshift(historyItem); // 최신 항목을 맨 앞에 추가
            // 최대 50개까지만 저장
            if (existingHistory.length > 50) {
                existingHistory.splice(50);
            }
            localStorage.setItem('seatHistory', JSON.stringify(existingHistory));
            // 드롭다운 메뉴 업데이트
            this.updateHistoryDropdown();
            alert(`자리가 확정되었습니다!\n날짜: ${dateString}`);
        }
        catch (error) {
            console.error('자리 확정 중 오류:', error);
            alert('자리 확정 중 오류가 발생했습니다.');
        }
    }
    /**
     * 좌석 이력 가져오기 (최신순으로 정렬)
     */
    getSeatHistory() {
        try {
            const historyStr = localStorage.getItem('seatHistory');
            if (!historyStr)
                return [];
            const history = JSON.parse(historyStr);
            // 최신 항목이 앞에 오도록 timestamp 기준 내림차순 정렬
            return history.sort((a, b) => {
                return (b.timestamp || 0) - (a.timestamp || 0);
            });
        }
        catch {
            return [];
        }
    }
    /**
     * 확정된 자리 이력에서 이전 좌석 및 짝꿍 제약 조건 추출
     */
    extractHistoryConstraints(avoidPrevSeat, avoidPrevPartner) {
        const lastSeatByStudent = {};
        const lastPartnerByStudent = {};
        if (!avoidPrevSeat && !avoidPrevPartner) {
            return { lastSeatByStudent, lastPartnerByStudent };
        }
        // 확정된 자리 이력 가져오기
        const history = this.getSeatHistory();
        if (history.length === 0) {
            return { lastSeatByStudent, lastPartnerByStudent };
        }
        // 현재 배치 유형 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked');
        const isPairLayout = layoutTypeInput && layoutTypeInput.value === 'pair-uniform';
        // 모든 이력에서 정보 추출 (최신 이력 우선)
        history.forEach(historyItem => {
            const layout = historyItem.layout;
            // 이전 좌석 정보 추출
            if (avoidPrevSeat) {
                layout.forEach(item => {
                    if (item.studentName && !lastSeatByStudent[item.studentName]) {
                        lastSeatByStudent[item.studentName] = item.seatId;
                    }
                });
            }
            // 이전 짝꿍 정보 추출 (짝꿍 배치인 경우)
            if (avoidPrevPartner && isPairLayout) {
                // pairInfo가 있으면 사용 (더 정확함)
                if (historyItem.pairInfo && historyItem.pairInfo.length > 0) {
                    historyItem.pairInfo.forEach(pair => {
                        if (pair.student1 && pair.student2) {
                            if (!lastPartnerByStudent[pair.student1]) {
                                lastPartnerByStudent[pair.student1] = pair.student2;
                            }
                            if (!lastPartnerByStudent[pair.student2]) {
                                lastPartnerByStudent[pair.student2] = pair.student1;
                            }
                        }
                    });
                }
                else {
                    // pairInfo가 없으면 좌석 번호 기반으로 추론 (하위 호환성)
                    const seatGroups = {};
                    layout.forEach(item => {
                        if (item.studentName) {
                            if (!seatGroups[item.seatId]) {
                                seatGroups[item.seatId] = [];
                            }
                            seatGroups[item.seatId].push(item);
                        }
                    });
                    // 같은 좌석에 2명이 앉은 경우 (짝꿍 배치)
                    Object.values(seatGroups).forEach(group => {
                        if (group.length === 2) {
                            const [student1, student2] = group;
                            if (student1.studentName && student2.studentName) {
                                if (!lastPartnerByStudent[student1.studentName]) {
                                    lastPartnerByStudent[student1.studentName] = student2.studentName;
                                }
                                if (!lastPartnerByStudent[student2.studentName]) {
                                    lastPartnerByStudent[student2.studentName] = student1.studentName;
                                }
                            }
                        }
                    });
                    // 인접한 좌석 번호를 가진 학생들도 짝꿍으로 간주 (같은 행에 있는 경우)
                    const sortedLayout = [...layout].sort((a, b) => a.seatId - b.seatId);
                    for (let i = 0; i < sortedLayout.length - 1; i++) {
                        const current = sortedLayout[i];
                        const next = sortedLayout[i + 1];
                        // 인접한 좌석이고 (차이가 1 또는 2), 같은 행에 있을 가능성이 높은 경우
                        if (current.studentName && next.studentName &&
                            (next.seatId - current.seatId <= 2)) {
                            // 이미 다른 짝꿍이 없으면 인접 학생을 짝꿍으로 기록
                            if (!lastPartnerByStudent[current.studentName] && !lastPartnerByStudent[next.studentName]) {
                                lastPartnerByStudent[current.studentName] = next.studentName;
                                lastPartnerByStudent[next.studentName] = current.studentName;
                            }
                        }
                    }
                }
            }
        });
        return { lastSeatByStudent, lastPartnerByStudent };
    }
    /**
     * 이력 드롭다운 메뉴 업데이트
     */
    updateHistoryDropdown() {
        const historyContent = document.getElementById('history-dropdown-content');
        if (!historyContent)
            return;
        const history = this.getSeatHistory();
        // 기존 내용 제거
        historyContent.innerHTML = '';
        if (history.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'history-empty';
            emptyDiv.id = 'history-empty';
            emptyDiv.textContent = '확정된 자리 이력이 없습니다.';
            historyContent.appendChild(emptyDiv);
            return;
        }
        // 최신 항목이 위에 오도록 timestamp 기준 내림차순 정렬
        const sortedHistory = [...history].sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
        // 같은 날짜별로 그룹화하여 번호 매기기
        const dateGroups = {};
        sortedHistory.forEach(item => {
            if (!dateGroups[item.date]) {
                dateGroups[item.date] = [];
            }
            dateGroups[item.date].push(item);
        });
        // 각 날짜별로 항목에 번호 부여 (최신 항목이 높은 번호를 받도록)
        const itemNumberMap = {};
        Object.keys(dateGroups).forEach(date => {
            const items = dateGroups[date];
            // 같은 날짜 내에서도 timestamp 기준으로 정렬 (최신이 앞)
            items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            // 최신 항목부터 높은 번호 부여 (3, 2, 1 순서)
            items.forEach((item, index) => {
                itemNumberMap[item.id] = items.length - index;
            });
        });
        // 이력 항목들 추가 (최신순으로)
        sortedHistory.forEach(item => {
            const historyItemContainer = document.createElement('div');
            historyItemContainer.className = 'history-item-container';
            historyItemContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 2px 8px; border-bottom: 1px solid #eee; transition: background 0.2s; writing-mode: horizontal-tb; text-orientation: mixed;';
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.historyId = item.id;
            historyItem.style.cssText = 'flex: 1; cursor: pointer; color: #333; font-size: 0.9em; writing-mode: horizontal-tb; text-orientation: mixed; white-space: nowrap;';
            // 같은 날짜가 여러 개인 경우 번호 추가 (최신 항목이 높은 번호)
            let displayText = `${item.date} 확정자리`;
            const itemCount = dateGroups[item.date]?.length || 0;
            if (itemCount > 1) {
                const itemNumber = itemNumberMap[item.id] || 1;
                displayText = `${item.date} 확정자리 (${itemNumber})`;
            }
            historyItem.textContent = displayText;
            historyItemContainer.appendChild(historyItem);
            // 삭제 버튼 추가
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = '삭제';
            deleteBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 1em; padding: 4px 8px; color: #dc3545; opacity: 0.7; transition: opacity 0.2s; margin-left: 8px;';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 클릭 이벤트 전파 방지
                this.deleteHistoryItem(item.id);
            });
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.opacity = '1';
            });
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.opacity = '0.7';
            });
            historyItemContainer.appendChild(deleteBtn);
            historyContent.appendChild(historyItemContainer);
            // 클릭 이벤트는 historyItem에만 추가
            historyItem.addEventListener('click', () => {
                this.loadHistoryItem(item.id);
            });
            historyItem.addEventListener('mouseenter', () => {
                historyItemContainer.style.background = '#f0f0f0';
            });
            historyItem.addEventListener('mouseleave', () => {
                historyItemContainer.style.background = '';
            });
        });
    }
    /**
     * 이력 항목 삭제
     */
    deleteHistoryItem(historyId) {
        if (!confirm('이 자리 이력을 삭제하시겠습니까?')) {
            return;
        }
        try {
            const history = this.getSeatHistory();
            const filteredHistory = history.filter(item => item.id !== historyId);
            localStorage.setItem('seatHistory', JSON.stringify(filteredHistory));
            // 드롭다운 메뉴 업데이트
            this.updateHistoryDropdown();
            // 드롭다운이 열려있으면 닫기
            const historyContent = document.getElementById('history-dropdown-content');
            if (historyContent) {
                historyContent.style.display = 'none';
            }
        }
        catch (error) {
            console.error('이력 삭제 중 오류:', error);
            alert('이력 삭제 중 오류가 발생했습니다.');
        }
    }
    /**
     * 이력 항목 불러오기
     */
    loadHistoryItem(historyId) {
        try {
            const history = this.getSeatHistory();
            const historyItem = history.find(item => item.id === historyId);
            if (!historyItem) {
                alert('이력을 찾을 수 없습니다.');
                return;
            }
            // 좌석 배치 복원
            const seatsArea = document.getElementById('seats-area');
            if (!seatsArea) {
                alert('좌석 배치 영역을 찾을 수 없습니다.');
                return;
            }
            // 모든 카드 초기화
            const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card'));
            allCards.forEach(card => {
                const nameDiv = card.querySelector('.student-name');
                if (nameDiv) {
                    nameDiv.textContent = '';
                }
            });
            // 이력 데이터로 복원
            historyItem.layout.forEach(({ seatId, studentName }) => {
                const card = seatsArea.querySelector(`[data-seat-id="${seatId}"]`);
                if (card) {
                    const nameDiv = card.querySelector('.student-name');
                    if (nameDiv) {
                        nameDiv.textContent = studentName;
                    }
                }
            });
            // 드롭다운 닫기
            const dropdown = document.getElementById('history-dropdown-content');
            if (dropdown) {
                dropdown.style.display = 'none';
            }
            alert(`${historyItem.date}의 자리 배치를 불러왔습니다.`);
        }
        catch (error) {
            console.error('이력 불러오기 중 오류:', error);
            alert('이력을 불러오는 중 오류가 발생했습니다.');
        }
    }
    /**
     * 남녀 짝꿍 배치 렌더링
     */
    renderGenderPairs(maleStudents, femaleStudents, partitionCount) {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 남학생과 여학생을 무작위로 섞기
        const shuffledMales = [...maleStudents].sort(() => Math.random() - 0.5);
        const shuffledFemales = [...femaleStudents].sort(() => Math.random() - 0.5);
        const totalPairs = Math.min(shuffledMales.length, shuffledFemales.length);
        const rowsPerPartition = Math.ceil(totalPairs / partitionCount);
        let maleIndex = 0;
        let femaleIndex = 0;
        for (let row = 0; row < rowsPerPartition; row++) {
            for (let partition = 0; partition < partitionCount; partition++) {
                if (maleIndex >= shuffledMales.length || femaleIndex >= shuffledFemales.length)
                    break;
                const pairContainer = document.createElement('div');
                pairContainer.style.display = 'flex';
                pairContainer.style.gap = '0px';
                // 남학생 카드
                const maleCard = this.createStudentNameCard(shuffledMales[maleIndex]);
                pairContainer.appendChild(maleCard);
                maleIndex++;
                // 여학생 카드
                const femaleCard = this.createStudentNameCard(shuffledFemales[femaleIndex]);
                pairContainer.appendChild(femaleCard);
                femaleIndex++;
                seatsArea.appendChild(pairContainer);
            }
        }
    }
    /**
     * 같은 성끼리 짝꿍 배치 렌더링
     */
    renderSameGenderPairs(maleStudents, femaleStudents, partitionCount) {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 남학생과 여학생을 무작위로 섞기
        const shuffledMales = [...maleStudents].sort(() => Math.random() - 0.5);
        const shuffledFemales = [...femaleStudents].sort(() => Math.random() - 0.5);
        const allPairs = [];
        // 남학생 짝꿍
        for (let i = 0; i < shuffledMales.length; i += 2) {
            allPairs.push({
                student1: shuffledMales[i],
                student2: (i + 1 < shuffledMales.length) ? shuffledMales[i + 1] : null
            });
        }
        // 여학생 짝꿍
        for (let i = 0; i < shuffledFemales.length; i += 2) {
            allPairs.push({
                student1: shuffledFemales[i],
                student2: (i + 1 < shuffledFemales.length) ? shuffledFemales[i + 1] : null
            });
        }
        const totalPairs = allPairs.length;
        const rowsPerPartition = Math.ceil(totalPairs / partitionCount);
        for (let row = 0; row < rowsPerPartition; row++) {
            for (let partition = 0; partition < partitionCount; partition++) {
                const pairIndex = row * partitionCount + partition;
                if (pairIndex < allPairs.length) {
                    const pair = allPairs[pairIndex];
                    const pairContainer = document.createElement('div');
                    pairContainer.style.display = 'flex';
                    pairContainer.style.gap = '0px';
                    // 첫 번째 카드
                    const card1 = this.createStudentNameCard(pair.student1);
                    pairContainer.appendChild(card1);
                    // 두 번째 카드 (있으면)
                    if (pair.student2) {
                        const card2 = this.createStudentNameCard(pair.student2);
                        pairContainer.appendChild(card2);
                    }
                    seatsArea.appendChild(pairContainer);
                }
            }
        }
    }
    /**
     * 학생 이름만 표시하는 카드 생성
     */
    createStudentNameCard(student) {
        const card = document.createElement('div');
        card.className = 'student-seat-card';
        // 성별에 따라 클래스 추가
        if (student.gender === 'M') {
            card.classList.add('gender-m');
        }
        else {
            card.classList.add('gender-f');
        }
        // 이름만 표시 (가운데 정렬)
        const nameDiv = document.createElement('div');
        nameDiv.className = 'student-name';
        nameDiv.textContent = student.name;
        nameDiv.style.textAlign = 'center';
        nameDiv.style.fontSize = '1.1em';
        nameDiv.style.fontWeight = 'bold';
        card.appendChild(nameDiv);
        return card;
    }
    /**
     * 자리 배치도 인쇄 처리
     */
    handlePrintLayout() {
        try {
            // 인쇄용 스타일이 포함된 새 창 열기
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
                return;
            }
            // 현재 자리 배치도 영역 가져오기
            const seatsArea = document.getElementById('seats-area');
            const classroomLayout = document.getElementById('classroom-layout');
            if (!seatsArea || !classroomLayout) {
                alert('인쇄할 자리 배치도를 찾을 수 없습니다.');
                return;
            }
            // 현재 그리드 설정 가져오기
            const currentGridTemplateColumns = seatsArea.style.gridTemplateColumns;
            console.log('현재 그리드 설정:', currentGridTemplateColumns);
            // 현재 화면의 실제 HTML 구조를 그대로 사용
            const seatsAreaHtml = seatsArea.innerHTML;
            // 현재 날짜와 시간
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            // 인쇄용 HTML 생성
            const printContent = `
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>자리 배치도 - ${dateString}</title>
                    <style>
                        body {
                            font-family: 'Malgun Gothic', sans-serif;
                            margin: 0;
                            padding: 10px;
                            background: white;
                            font-size: 12px;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 15px;
                            border-bottom: 1px solid #333;
                            padding-bottom: 8px;
                        }
                        .print-title {
                            font-size: 18px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .print-date {
                            font-size: 11px;
                            color: #666;
                        }
                        .classroom-layout {
                            background: #f8f9fa;
                            border: 1px dashed #ddd;
                            border-radius: 5px;
                            padding: 10px;
                            margin: 10px 0;
                        }
                        .blackboard-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 200px;
                            height: 50px;
                            background: #2c3e50;
                            border: 2px solid #1a252f;
                            border-radius: 3px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                            margin-bottom: 10px;
                        }
                        .teacher-desk-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 80px;
                            height: 25px;
                            background: #95a5a6;
                            border: 1px solid #7f8c8d;
                            border-radius: 3px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 10px;
                            margin-bottom: 20px;
                        }
                        .seats-area {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            margin-top: 10px;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                        }
                        .student-seat-card {
                            min-width: 60px;
                            height: 60px;
                            background: white;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 5px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }
                        .student-seat-card.gender-m {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                        }
                        .student-seat-card.gender-f {
                            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
                        }
                        .student-name {
                            text-align: center;
                            font-size: 20px; /* 인쇄 시 카드 가득 차게 크게 */
                            font-weight: bold;
                            color: #333;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            width: 100%;
                            line-height: 1;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        .partition-label {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                        }
                        /* 분단 레이블과 카드들의 정렬을 위한 추가 스타일 */
                        .labels-row {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                            margin-bottom: 5px;
                        }
                        .labels-row > div {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                        }
                        @media print {
                            body { 
                                margin: 0; 
                                padding: 5px;
                                font-size: 10px;
                            }
                            .print-header { 
                                page-break-after: avoid; 
                                margin-bottom: 10px;
                            }
                            .classroom-layout { 
                                page-break-inside: avoid; 
                                margin: 5px 0;
                                padding: 5px;
                            }
                            .seats-area {
                                gap: 3px 15px !important;
                            }
                            .student-seat-card {
                                min-width: 50px;
                                height: 50px;
                                padding: 3px;
                            }
                            .student-name {
                                font-size: 18px; /* 실제 인쇄 페이지에서도 크게 유지 */
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <div class="print-title">교실 자리 배치도</div>
                        <div class="print-date">생성일시: ${dateString}</div>
                    </div>
                    
                    <div class="classroom-layout">
                        <div class="blackboard-area">📝 칠판</div>
                        <div class="teacher-desk-area">🖥️ 교탁</div>
                        <div class="seats-area">
                            ${seatsAreaHtml}
                        </div>
                    </div>
                </body>
                </html>
            `;
            printWindow.document.write(printContent);
            printWindow.document.close();
            // 인쇄 대화상자 열기
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
        catch (error) {
            console.error('인쇄 중 오류:', error);
            this.outputModule.showError('인쇄 중 오류가 발생했습니다.');
        }
    }
    /**
     * 교탁용 자리 배치도 인쇄 처리 (180도 회전)
     */
    handlePrintLayoutForTeacher() {
        try {
            // 인쇄용 스타일이 포함된 새 창 열기
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
                return;
            }
            // 현재 자리 배치도 영역 가져오기
            const seatsArea = document.getElementById('seats-area');
            const classroomLayout = document.getElementById('classroom-layout');
            if (!seatsArea || !classroomLayout) {
                alert('인쇄할 자리 배치도를 찾을 수 없습니다.');
                return;
            }
            // 현재 그리드 설정 가져오기
            const currentGridTemplateColumns = seatsArea.style.gridTemplateColumns;
            console.log('교탁용 인쇄 - 현재 그리드 설정:', currentGridTemplateColumns);
            // 현재 화면의 실제 HTML 구조를 그대로 사용
            const seatsAreaHtml = seatsArea.innerHTML;
            // 현재 날짜와 시간
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            // 인쇄용 HTML 생성 (180도 회전)
            const printContent = `
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>교탁용 자리 배치도 - ${dateString}</title>
                    <style>
                        body {
                            font-family: 'Malgun Gothic', sans-serif;
                            margin: 0;
                            padding: 10px;
                            background: white;
                            font-size: 12px;
                        }
                        .print-container {
                            transform: rotate(180deg);
                            transform-origin: center center;
                            width: 100%;
                            min-height: 100vh;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 15px;
                            border-bottom: 1px solid #333;
                            padding-bottom: 8px;
                        }
                        .print-title {
                            font-size: 18px;
                            font-weight: bold;
                            margin-bottom: 5px;
                            transform: rotate(180deg);
                        }
                        .print-date {
                            font-size: 11px;
                            color: #666;
                            transform: rotate(180deg);
                        }
                        .classroom-layout {
                            background: #f8f9fa;
                            border: 1px dashed #ddd;
                            border-radius: 5px;
                            padding: 10px;
                            margin: 10px 0;
                        }
                        .blackboard-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 200px;
                            height: 50px;
                            background: #2c3e50;
                            border: 2px solid #1a252f;
                            border-radius: 3px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                            margin-bottom: 10px;
                        }
                        .blackboard-area span {
                            transform: rotate(180deg);
                        }
                        .teacher-desk-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 80px;
                            height: 25px;
                            background: #95a5a6;
                            border: 1px solid #7f8c8d;
                            border-radius: 3px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 10px;
                            margin-bottom: 20px;
                        }
                        .teacher-desk-area span {
                            transform: rotate(180deg);
                        }
                        .seats-area {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            margin-top: 10px;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                        }
                        .student-seat-card {
                            min-width: 60px;
                            height: 60px;
                            background: white;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 5px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }
                        .student-seat-card.gender-m {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                        }
                        .student-seat-card.gender-f {
                            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
                        }
                        .student-name {
                            text-align: center;
                            font-size: 20px;
                            font-weight: bold;
                            color: #333;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            width: 100%;
                            line-height: 1;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            transform: rotate(180deg);
                        }
                        .partition-label {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                            transform: rotate(180deg) !important;
                        }
                        .labels-row {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                            margin-bottom: 5px;
                        }
                        .labels-row > div {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                            transform: rotate(180deg) !important;
                        }
                        /* 분단 레이블 회전 (클래스 없이 직접 추가된 경우도 포함) */
                        .seats-area > div:not(.student-seat-card):not(.labels-row):not(.student-name) {
                            transform: rotate(180deg) !important;
                        }
                        @media print {
                            @page {
                                margin: 3mm;
                            }
                            body { 
                                margin: 0; 
                                padding: 0;
                                font-size: 9px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                            }
                            .print-container {
                                width: 100%;
                                min-height: auto;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                            }
                            .print-header { 
                                page-break-after: avoid; 
                                margin-bottom: 5px;
                                padding-bottom: 3px;
                                border-bottom-width: 1px;
                                width: 100%;
                            }
                            .print-title {
                                font-size: 14px;
                                margin-bottom: 2px;
                            }
                            .print-date {
                                font-size: 8px;
                            }
                            .classroom-layout { 
                                page-break-inside: avoid; 
                                margin: 0 auto;
                                padding: 3px;
                                width: fit-content;
                            }
                            .blackboard-area {
                                width: 160px;
                                height: 40px;
                                font-size: 10px;
                                margin-bottom: 5px;
                            }
                            .teacher-desk-area {
                                width: 60px;
                                height: 20px;
                                font-size: 8px;
                                margin-bottom: 8px;
                            }
                            .seats-area {
                                display: grid !important;
                                gap: 2px 25px !important;
                                margin-top: 5px;
                                grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'} !important;
                            }
                            .student-seat-card {
                                min-width: 45px;
                                height: 45px;
                                padding: 2px;
                            }
                            .student-name {
                                font-size: 16px;
                            }
                            .partition-label {
                                font-size: 7px;
                                margin-bottom: 2px;
                            }
                            .labels-row {
                                display: grid !important;
                                gap: 2px 25px !important;
                                margin-bottom: 3px;
                                grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'} !important;
                            }
                            .labels-row > div {
                                font-size: 7px;
                                margin-bottom: 2px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="print-header">
                            <div class="print-title">교탁용 자리 배치도</div>
                            <div class="print-date">생성일시: ${dateString}</div>
                        </div>
                        <div class="classroom-layout">
                            <div class="blackboard-area"><span>📝 칠판</span></div>
                            <div class="teacher-desk-area"><span>🖥️ 교탁</span></div>
                            <div class="seats-area">
                                ${seatsAreaHtml}
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;
            printWindow.document.write(printContent);
            printWindow.document.close();
            // 인쇄 대화상자 열기
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
        catch (error) {
            console.error('교탁용 인쇄 중 오류:', error);
            this.outputModule.showError('교탁용 인쇄 중 오류가 발생했습니다.');
        }
    }
    /**
     * 자리 배치도 저장 처리
     */
    handleSaveLayout() {
        try {
            // 현재 자리 배치도 영역 가져오기
            const seatsArea = document.getElementById('seats-area');
            const classroomLayout = document.getElementById('classroom-layout');
            if (!seatsArea || !classroomLayout) {
                alert('저장할 자리 배치도를 찾을 수 없습니다.');
                return;
            }
            // 현재 그리드 설정 가져오기
            const currentGridTemplateColumns = seatsArea.style.gridTemplateColumns;
            console.log('저장용 현재 그리드 설정:', currentGridTemplateColumns);
            // 현재 화면의 실제 HTML 구조를 그대로 사용
            const seatsAreaHtml = seatsArea.innerHTML;
            // 현재 날짜와 시간
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/\./g, '-').replace(/\s/g, '_');
            // HTML 내용 생성
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>자리 배치도 - ${dateString}</title>
                    <style>
                        body {
                            font-family: 'Malgun Gothic', sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #333;
                            padding-bottom: 15px;
                        }
                        .print-title {
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }
                        .print-date {
                            font-size: 14px;
                            color: #666;
                        }
                        .classroom-layout {
                            background: #f8f9fa;
                            border: 2px dashed #ddd;
                            border-radius: 10px;
                            padding: 20px;
                            margin: 20px 0;
                        }
                        .blackboard-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 300px;
                            height: 80px;
                            background: #2c3e50;
                            border: 3px solid #1a252f;
                            border-radius: 5px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 18px;
                            margin-bottom: 20px;
                        }
                        .teacher-desk-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 120px;
                            height: 40px;
                            background: #95a5a6;
                            border: 2px solid #7f8c8d;
                            border-radius: 5px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            margin-bottom: 40px;
                        }
                        .seats-area {
                            display: grid;
                            gap: 10px 40px !important;
                            justify-content: center !important;
                            margin-top: 20px;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                        }
                        .student-seat-card {
                            min-width: 120px;
                            height: 120px;
                            background: white;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            padding: 15px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        }
                        .student-seat-card.gender-m {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                        }
                        .student-seat-card.gender-f {
                            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
                        }
                        .student-name {
                            text-align: center;
                            font-size: 1.8em;
                            font-weight: bold;
                            color: #333;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            width: 100%;
                        }
                        .partition-label {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 0.9em;
                            margin-bottom: 5px;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <div class="print-title">교실 자리 배치도</div>
                        <div class="print-date">생성일시: ${dateString}</div>
                    </div>
                    
                    <div class="classroom-layout">
                        <div class="blackboard-area">📝 칠판</div>
                        <div class="teacher-desk-area">🖥️ 교탁</div>
                        <div class="seats-area">
                            ${seatsAreaHtml}
                        </div>
                    </div>
                </body>
                </html>
            `;
            // 파일명 생성
            const fileName = `자리배치도_${dateString}.html`;
            // Blob 생성 및 다운로드
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            this.outputModule.showSuccess(`자리 배치도가 "${fileName}"으로 저장되었습니다.`);
        }
        catch (error) {
            console.error('저장 중 오류:', error);
            this.outputModule.showError('저장 중 오류가 발생했습니다.');
        }
    }
    /**
     * 자리 배치도 공유하기
     */
    handleShareLayout() {
        console.log('handleShareLayout 메서드 시작');
        try {
            const seatsArea = document.getElementById('seats-area');
            const classroomLayout = document.getElementById('classroom-layout');
            console.log('seatsArea:', seatsArea);
            console.log('classroomLayout:', classroomLayout);
            if (!seatsArea || !classroomLayout) {
                console.log('자리 배치도 요소를 찾을 수 없음');
                alert('공유할 자리 배치도를 찾을 수 없습니다.');
                return;
            }
            const currentGridTemplateColumns = seatsArea.style.gridTemplateColumns;
            const seatsAreaHtml = seatsArea.innerHTML;
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            // 공유 주소(URL) 생성
            const shareUrl = this.generateShareUrl(seatsAreaHtml, currentGridTemplateColumns, dateString);
            // 모달 창으로 공유하기
            console.log('모달 창으로 공유하기 실행');
            this.showShareModal(shareUrl);
        }
        catch (error) {
            console.error('공유 중 오류:', error);
            this.outputModule.showError('공유 중 오류가 발생했습니다.');
        }
    }
    /**
     * 공유된 배치 데이터 로드
     */
    loadSharedLayout(shareData) {
        try {
            // URL-safe Base64 디코딩 (+, /, = 문자 복원)
            const base64Data = shareData
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            // 패딩 추가 (필요한 경우)
            const padding = base64Data.length % 4;
            const paddedData = padding ? base64Data + '='.repeat(4 - padding) : base64Data;
            // Base64 디코딩
            let decodedData;
            try {
                decodedData = decodeURIComponent(escape(atob(paddedData)));
            }
            catch (e) {
                // 이전 형식 호환성: 일반 Base64 디코딩 시도
                decodedData = decodeURIComponent(escape(atob(shareData)));
            }
            // JSON 파싱
            const shareInfo = JSON.parse(decodedData);
            // 이전 형식과 새 형식 모두 지원
            const type = shareInfo.t || shareInfo.type;
            if (type !== 'sa' && type !== 'seating-arrangement') {
                throw new Error('유효하지 않은 공유 데이터입니다.');
            }
            console.log('공유된 배치 데이터 로드:', shareInfo);
            // 학생 정보로부터 배치 복원 (압축된 형식과 이전 형식 모두 지원)
            const studentDataList = shareInfo.s || shareInfo.students || [];
            const gridColumns = shareInfo.l || shareInfo.layout || '';
            // 학생 데이터 생성 (압축된 형식 [이름, 성별] 또는 객체 형식 지원)
            this.students = studentDataList.map((student, index) => {
                if (Array.isArray(student)) {
                    // 압축된 형식: [이름, 성별]
                    return {
                        id: index + 1,
                        name: student[0],
                        gender: (student[1] || 'M')
                    };
                }
                else {
                    // 이전 형식: {name: string, gender: 'M' | 'F'}
                    return {
                        id: index + 1,
                        name: student.name,
                        gender: (student.gender || 'M')
                    };
                }
            });
            // 성별별 학생 수 계산
            let maleCount = 0;
            let femaleCount = 0;
            this.students.forEach(student => {
                if (student.gender === 'M') {
                    maleCount++;
                }
                else {
                    femaleCount++;
                }
            });
            // 사이드바 입력 업데이트
            const maleCountInput = document.getElementById('male-students');
            const femaleCountInput = document.getElementById('female-students');
            if (maleCountInput)
                maleCountInput.value = maleCount.toString();
            if (femaleCountInput)
                femaleCountInput.value = femaleCount.toString();
            // 미리보기 업데이트
            this.updatePreviewForGenderCounts();
            // 학생 테이블 생성
            setTimeout(() => {
                const totalStudents = this.students.length;
                this.handleCreateStudentTable(totalStudents);
                // 학생 정보 입력 (이름과 성별)
                setTimeout(() => {
                    this.students.forEach((student, index) => {
                        const nameInput = document.getElementById(`student-name-${index + 1}`);
                        const genderSelect = document.getElementById(`student-gender-${index + 1}`);
                        if (nameInput) {
                            nameInput.value = student.name;
                        }
                        if (genderSelect) {
                            genderSelect.value = student.gender;
                        }
                    });
                    // 자리 배치 실행
                    setTimeout(() => {
                        const arrangeBtn = document.getElementById('arrange-seats');
                        if (arrangeBtn) {
                            arrangeBtn.click();
                        }
                        // 그리드 컬럼 설정 (레이아웃 복원)
                        setTimeout(() => {
                            const seatsArea = document.getElementById('seats-area');
                            if (seatsArea && gridColumns) {
                                seatsArea.style.gridTemplateColumns = gridColumns;
                            }
                            this.outputModule.showSuccess('공유된 자리 배치도가 로드되었습니다.');
                        }, 500);
                    }, 500);
                }, 500);
            }, 300);
        }
        catch (error) {
            console.error('공유 데이터 로드 실패:', error);
            this.outputModule.showError('공유된 자리 배치도를 로드할 수 없습니다.');
            // 실패 시 기본 레이아웃 표시
            this.renderInitialExampleLayout();
            setTimeout(() => {
                this.updatePreviewForGenderCounts();
            }, 100);
        }
    }
    /**
     * 간단한 공유 주소(URL) 생성 (압축된 형식)
     */
    generateShareUrl(seatsHtml, gridColumns, dateString) {
        // 학생 정보 추출 (이름과 성별)
        const studentData = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = seatsHtml;
        const cards = tempDiv.querySelectorAll('.student-seat-card');
        cards.forEach(card => {
            const nameElement = card.querySelector('.student-name');
            const name = nameElement?.textContent?.trim() || '';
            if (name && name !== '') {
                const isMale = card.classList.contains('gender-m');
                studentData.push({
                    name: name,
                    gender: isMale ? 'M' : 'F'
                });
            }
        });
        // 공유 데이터 생성 (최적화된 형식)
        // 학생 데이터를 배열로 압축: [이름, 성별] 형식
        const compressedStudents = studentData.map(s => [s.name, s.gender]);
        const shareData = {
            t: 'sa', // type: 'seating-arrangement' 축약
            d: dateString, // date
            s: compressedStudents, // students (압축된 형식)
            l: gridColumns, // layout
            v: '1.0' // version
        };
        // JSON 문자열 생성
        const jsonString = JSON.stringify(shareData);
        // Base64 URL-safe 인코딩 (+, /, = 문자를 URL-safe 문자로 변환)
        const encodedData = btoa(unescape(encodeURIComponent(jsonString)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        // 현재 페이지의 기본 URL 가져오기
        const baseUrl = window.location.origin + window.location.pathname;
        // 공유 URL 생성 (짧은 파라미터 이름 사용)
        const shareUrl = `${baseUrl}?s=${encodedData}`;
        return shareUrl;
    }
    /**
     * 모달 창으로 자리 배치도 공유하기
     */
    showShareModal(content) {
        // 모달 창으로 텍스트 영역 표시
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
        `;
        const title = document.createElement('h3');
        title.textContent = '📤 자리 배치도 공유';
        title.style.marginTop = '0';
        title.style.color = '#333';
        const instruction = document.createElement('div');
        instruction.innerHTML = `
            <p style="margin-bottom: 10px; color: #666;">
                <strong>사용 방법:</strong><br>
                1. 아래 공유 주소를 복사하세요 (Ctrl+A → Ctrl+C 또는 '주소 복사' 버튼 클릭)<br>
                2. 이메일, 메신저, 문서 등에 붙여넣기하세요<br>
                3. 받는 사람이 이 주소를 클릭하면 동일한 배치를 볼 수 있습니다
            </p>
        `;
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.id = 'share-url-textarea';
        textarea.readOnly = true;
        textarea.style.cssText = `
            width: 100%;
            height: 100px;
            font-family: monospace;
            font-size: 13px;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 12px;
            resize: none;
            background: #f8f9fa;
            word-break: break-all;
        `;
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            margin-top: 15px;
            text-align: right;
        `;
        // 모달 닫기 함수 (안전하게 처리)
        const closeModal = () => {
            try {
                if (modal && modal.parentNode) {
                    document.body.removeChild(modal);
                }
                document.removeEventListener('keydown', handleKeyDown);
            }
            catch (error) {
                console.warn('모달 닫기 중 오류 (무시됨):', error);
            }
        };
        // ESC 키로 모달 닫기
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        const copyButton = document.createElement('button');
        copyButton.textContent = '📋 주소 복사';
        copyButton.className = 'primary-btn';
        copyButton.style.marginRight = '10px';
        copyButton.onclick = async () => {
            try {
                // 클립보드 API 사용
                await navigator.clipboard.writeText(content);
                const originalText = copyButton.textContent;
                copyButton.textContent = '✅ 복사됨!';
                copyButton.style.background = '#28a745';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.style.background = '';
                }, 2000);
            }
            catch (err) {
                // 클립보드 API 실패 시 대체 방법
                textarea.select();
                textarea.setSelectionRange(0, 99999);
                document.execCommand('copy');
                const originalText = copyButton.textContent;
                copyButton.textContent = '✅ 복사됨!';
                copyButton.style.background = '#28a745';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.style.background = '';
                }, 2000);
            }
        };
        const closeButton = document.createElement('button');
        closeButton.textContent = '❌ 닫기';
        closeButton.className = 'secondary-btn';
        closeButton.onclick = closeModal;
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(closeButton);
        modalContent.appendChild(title);
        modalContent.appendChild(instruction);
        modalContent.appendChild(textarea);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        document.addEventListener('keydown', handleKeyDown);
        // 모달 배경 클릭으로 닫기
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        // 텍스트 영역에 포커스하고 전체 선택
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 100);
    }
    /**
     * 사용설명서 모달 표시
     */
    showUserManual() {
        // 모달 창 생성
        const modal = document.createElement('div');
        modal.id = 'user-manual-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            overflow-y: auto;
            padding: 20px;
        `;
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        `;
        const title = document.createElement('h2');
        title.textContent = '📖 사용설명서';
        title.style.cssText = `
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 1.8em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        `;
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="line-height: 1.8; color: #444;">
                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">1️⃣ 기본 사용 방법</h3>
                <ol style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>📋 옵션1: 좌석 배치 형태</strong> - 원하는 배치 유형을 선택하세요
                        <ul style="padding-left: 20px; margin-top: 8px;">
                            <li><strong>🪑 1명씩 한 줄로 배치</strong>: 개별 좌석을 분단별로 배치 (분단 수: 3~6)
                                <ul style="padding-left: 15px; margin-top: 5px;">
                                    <li>📐 <strong>기본 1줄 배치</strong>: 가로(행) 방향으로 남학생과 여학생을 교대로 순차 배치</li>
                                    <li>👥 <strong>남녀 1줄 배치</strong>: 세로(열) 방향으로 홀수 분단은 남학생, 짝수 분단은 여학생 배치</li>
                                    <li>⚖️ <strong>남녀 대칭 1줄 배치</strong>: 세로(열) 방향으로 남학생을 먼저 앞쪽 분단부터 배치, 그 다음 여학생 배치</li>
                                    <li>🔄 <strong>남녀 순서 바꾸기</strong>: 체크 시 여학생을 먼저 배치하고 남학생을 나중에 배치 (세 가지 옵션 모두 적용)</li>
                                </ul>
                            </li>
                            <li><strong>👫 2명씩 짝꿍 배치</strong>: 두 명이 나란히 앉는 형태 (분단 수: 3~5)
                                <ul style="padding-left: 15px; margin-top: 5px;">
                                    <li>💑 남녀 짝꿍하기: 남학생과 여학생을 짝지어 배치</li>
                                    <li>👨‍👨‍👧‍👧 같은 성끼리 짝꿍하기: 같은 성별끼리 짝지어 배치</li>
                                </ul>
                            </li>
                            <li><strong>👥 모둠 배치</strong>: 모둠 단위로 좌석 배치
                                <ul style="padding-left: 15px; margin-top: 5px;">
                                    <li>3명 모둠 배치: 2x2 그리드 (분단 수: 3~5)</li>
                                    <li>4명 모둠 배치: 2x2 그리드 (분단 수: 3~4)</li>
                                    <li>5명 모둠 배치: 2x3 그리드 (분단 수: 3~5)</li>
                                    <li>6명 모둠 배치: 2x3 그리드 (분단 수: 2~4)</li>
                                    <li>🔄 남녀 섞기: 모둠 내에서 남녀를 균형있게 섞어 배치</li>
                                </ul>
                            </li>
                        </ul>
                    </li>
                    <li><strong>👨‍🎓 옵션2: 학생 자리 수</strong> - 남학생 수와 여학생 수를 입력하세요. 우측에 미리보기가 자동으로 표시됩니다.</li>
                    <li><strong>📏 옵션3: 분단 개수</strong> - 교실의 분단 수를 입력하세요 (선택한 배치 형태에 따라 가능한 범위가 다릅니다)</li>
                    <li><strong>⚙️ 옵션4: 맞춤 구성</strong> - 추가 옵션을 선택하세요
                        <ul style="padding-left: 20px; margin-top: 8px;">
                            <li>🎲 랜덤 배치: 완전 랜덤으로 좌석 배치</li>
                            <li>🔒 고정 좌석 지정 후 랜덤 배치: 특정 좌석을 고정하고 나머지만 랜덤 배치</li>
                        </ul>
                    </li>
                    <li><strong>🪑 좌석 배치하기</strong> - "학생 이름 입력하기" 버튼을 클릭하여 학생 정보를 입력한 후, "자리 배치 실행하기" 버튼을 클릭하면 좌석에 학생들이 배치됩니다</li>
                </ol>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">2️⃣ 학생 정보 입력</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>📝 학생 이름 입력하기</strong>: 버튼을 클릭하여 학생 정보 입력 테이블을 생성하세요</li>
                    <li><strong>📊 학생 이름 엑셀파일에서 가져오기</strong>: 엑셀 파일을 업로드하여 학생 정보를 한 번에 입력할 수 있습니다</li>
                    <li><strong>📥 학생 이름 양식 다운로드</strong>: 엑셀 양식 파일을 다운로드하여 학생 정보를 작성한 후 업로드하세요</li>
                    <li><strong>📂 우리 반 이름 불러오기</strong>: 이전에 저장한 반 학생 정보를 불러옵니다</li>
                    <li><strong>💾 우리반 학생으로 등록하기</strong>: 현재 입력한 학생 정보를 저장하여 다음에 불러올 수 있습니다</li>
                    <li><strong>➕ 행 추가</strong>: 학생 정보 입력 테이블에서 "행 추가" 버튼을 클릭하여 학생을 추가할 수 있습니다</li>
                    <li><strong>🗑️ 삭제</strong>: 각 행의 삭제 아이콘(🗑️)을 클릭하여 학생을 삭제할 수 있습니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">3️⃣ 고정 좌석 기능</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>🔒 고정 좌석 지정</strong>: "옵션4: 맞춤 구성"에서 "고정 좌석 지정 후 랜덤 배치" 옵션을 선택하세요</li>
                    <li>미리보기 화면에서 원하는 좌석 카드를 클릭하면 🔒 아이콘과 빨간 테두리가 표시됩니다</li>
                    <li>학생 정보 입력 테이블의 "고정 좌석" 드롭다운에서 고정된 좌석을 선택하여 학생을 연결하세요</li>
                    <li>고정 좌석이 선택된 행의 번호 셀은 파란색 배경으로 표시됩니다</li>
                    <li>고정 좌석을 제외한 나머지 좌석에만 학생들이 랜덤 배치됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">4️⃣ 자리 배치 옵션</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>🚫 이전 좌석 안 앉기</strong>: "확정된 자리 이력"에 저장된 이전 배치를 참고하여 같은 좌석에 배치되지 않도록 합니다</li>
                    <li><strong>👥 이전 짝 금지</strong>: "확정된 자리 이력"에 저장된 이전 배치를 참고하여 이전에 같은 짝이었던 학생과 다시 짝지어지지 않도록 합니다</li>
                    <li>두 옵션을 모두 체크하면 두 조건을 모두 만족하도록 배치됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">5️⃣ 확정된 자리 이력</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>✅ 자리 확정</strong>: 자리 배치가 완료된 후 "✅ 자리 확정" 버튼을 클릭하면 현재 배치가 이력에 저장됩니다</li>
                    <li><strong>📋 확정된 자리 이력</strong>: 상단 바의 "📋 확정된 자리 이력" 드롭다운에서 저장된 배치를 확인할 수 있습니다</li>
                    <li>같은 날짜에 여러 개의 배치가 저장되면 번호가 표시됩니다 (예: 25-11-10 확정자리 (3), (2), (1))</li>
                    <li>이력 항목을 클릭하면 해당 배치를 불러올 수 있습니다</li>
                    <li>이력 항목 옆의 삭제 아이콘(🗑️)을 클릭하면 해당 이력을 삭제할 수 있습니다</li>
                    <li>드롭다운 외부를 클릭하면 드롭다운이 자동으로 닫힙니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">6️⃣ 옵션 설정 기억하기</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>💾 옵션 설정 기억하기</strong>: "초기화" 버튼 위의 "옵션 설정 기억하기" 버튼을 클릭하면 현재 설정(옵션1~옵션4)이 저장됩니다</li>
                    <li>다음에 프로그램을 실행하면 저장된 설정이 자동으로 적용됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">7️⃣ 자리 바꾸기</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li>자리 배치가 완료된 후, 좌석 카드를 드래그하여 다른 좌석에 드롭하면 자리를 바꿀 수 있습니다</li>
                    <li>두 카드를 서로 드래그 & 드롭하면 위치가 교환됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">8️⃣ 공유 및 출력</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>📤 공유하기</strong>: 공유 주소(URL)를 생성하여 다른 사람과 자리 배치도를 공유할 수 있습니다</li>
                    <li><strong>🖨️ 인쇄하기</strong>: 현재 자리 배치도를 인쇄합니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">💡 유용한 팁</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li>📊 학생 정보 입력 테이블 하단의 통계를 확인하여 남학생/여학생 수와 고정 좌석 수를 확인할 수 있습니다</li>
                    <li>🔒 고정 좌석 모드에서는 미리보기 화면에서 좌석을 클릭하여 고정할 수 있습니다</li>
                    <li>🔄 자리 배치 후에는 드래그 & 드롭으로 자유롭게 자리를 조정할 수 있습니다</li>
                    <li>👥 모둠 배치 시 "남녀 섞기" 옵션을 사용하면 모둠 내에서 남녀를 균형있게 배치할 수 있습니다</li>
                    <li>📐 "1명씩 한 줄로 배치" 옵션에서 "남녀 순서 바꾸기" 체크박스를 사용하면 여학생을 먼저 배치할 수 있습니다</li>
                    <li>⚖️ "남녀 대칭 1줄 배치"는 남학생을 앞쪽 분단부터 배치하고, 여학생을 나머지 자리에 배치하는 대칭적인 배치 방식입니다</li>
                    <li>◀ 좌측 사이드바의 토글 버튼(◀)을 클릭하면 사이드바를 접거나 펼칠 수 있습니다</li>
                </ul>

                <div style="margin-top: 30px; padding: 15px; background: #f0f8ff; border-left: 4px solid #667eea; border-radius: 4px;">
                    <strong style="color: #667eea;">제작자:</strong> 김신회<br>
                    <strong style="color: #667eea;">Copyright:</strong> Copyright (c) 2025 김신회
                </div>
            </div>
        `;
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            margin-top: 25px;
            text-align: right;
        `;
        const closeButton = document.createElement('button');
        closeButton.textContent = '❌ 닫기';
        closeButton.className = 'primary-btn';
        closeButton.style.cssText = `
            padding: 10px 24px;
            font-size: 1em;
        `;
        // 모달 닫기 함수
        const closeModal = () => {
            try {
                if (modal && modal.parentNode) {
                    document.body.removeChild(modal);
                }
                document.removeEventListener('keydown', handleKeyDown);
            }
            catch (error) {
                console.warn('모달 닫기 중 오류 (무시됨):', error);
            }
        };
        closeButton.onclick = closeModal;
        // ESC 키로 모달 닫기
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        buttonContainer.appendChild(closeButton);
        modalContent.appendChild(title);
        modalContent.appendChild(content);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        document.addEventListener('keydown', handleKeyDown);
        // 모달 배경 클릭으로 닫기
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
    }
    /**
     * 사이드바 토글
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContainer = document.querySelector('.main-container');
        if (sidebar && mainContainer) {
            sidebar.classList.toggle('collapsed');
            mainContainer.classList.toggle('sidebar-collapsed');
        }
    }
    /**
     * 커튼 애니메이션 시작 (닫기)
     */
    startCurtainAnimation() {
        const curtainOverlay = document.getElementById('curtain-overlay');
        if (!curtainOverlay)
            return;
        // 커튼 오버레이 활성화
        curtainOverlay.classList.add('active');
        curtainOverlay.classList.remove('opening');
        // 약간의 지연 후 닫기 애니메이션 시작 (렌더링 보장)
        setTimeout(() => {
            curtainOverlay.classList.add('closing');
        }, 10);
    }
    /**
     * 커튼 애니메이션 종료 (열기)
     */
    openCurtain() {
        const curtainOverlay = document.getElementById('curtain-overlay');
        if (!curtainOverlay)
            return;
        // 열기 애니메이션 시작
        curtainOverlay.classList.remove('closing');
        curtainOverlay.classList.add('opening');
        // 애니메이션 완료 후 오버레이 숨기기
        setTimeout(() => {
            curtainOverlay.classList.remove('active', 'opening');
        }, 600); // transition 시간과 동일 (0.6s)
    }
    /**
     * 커튼 애니메이션 즉시 종료 (에러 시)
     */
    stopCurtainAnimation() {
        const curtainOverlay = document.getElementById('curtain-overlay');
        if (!curtainOverlay)
            return;
        curtainOverlay.classList.remove('active', 'closing', 'opening');
    }
    /**
     * 폭죽 애니메이션 시작
     */
    startFireworks() {
        const container = document.getElementById('fireworks-container');
        if (!container)
            return;
        // 컨테이너 활성화 및 초기화
        container.classList.add('active');
        container.innerHTML = '';
        // 화면 중앙 위치 계산
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // 여러 폭죽 동시 발사 (8-12개로 증가)
        const fireworkCount = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < fireworkCount; i++) {
            // 각 폭죽의 위치를 화면 중앙 주변에 랜덤 배치 (범위 확대)
            const offsetX = (Math.random() - 0.5) * (rect.width * 0.8);
            const offsetY = (Math.random() - 0.5) * (rect.height * 0.8);
            const x = centerX + offsetX;
            const y = centerY + offsetY;
            // 약간의 지연을 주어 순차적으로 터지게 (간격 단축)
            setTimeout(() => {
                this.createFirework(container, x, y);
            }, i * 100);
        }
        // 애니메이션 완료 후 컨테이너 비활성화 (시간 연장)
        setTimeout(() => {
            container.classList.remove('active');
            container.innerHTML = '';
        }, 3000);
    }
    /**
     * 개별 폭죽 생성 및 파티클 애니메이션
     */
    createFirework(container, x, y) {
        // 폭죽 색상 배열 (더 화려한 색상들 추가)
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
            '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8C471', '#82E0AA',
            '#FF6B9D', '#C44569', '#F8B500', '#00D2FF', '#FC6C85',
            '#A29BFE', '#FD79A8', '#FDCB6E', '#00B894', '#E17055'
        ];
        // 랜덤 색상 선택 (3-5개로 증가)
        const fireworkColors = [];
        const colorCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < colorCount; i++) {
            fireworkColors.push(colors[Math.floor(Math.random() * colors.length)]);
        }
        // 폭죽 중심점 생성 (더 크게)
        const center = document.createElement('div');
        center.className = 'firework';
        center.style.left = `${x}px`;
        center.style.top = `${y}px`;
        center.style.width = '8px';
        center.style.height = '8px';
        center.style.backgroundColor = fireworkColors[0];
        center.style.boxShadow = `0 0 20px ${fireworkColors[0]}, 0 0 40px ${fireworkColors[0]}`;
        container.appendChild(center);
        // 파티클 생성 (40-60개로 증가)
        const particleCount = 40 + Math.floor(Math.random() * 21);
        const angleStep = (Math.PI * 2) / particleCount;
        for (let i = 0; i < particleCount; i++) {
            const angle = angleStep * i;
            // 거리 증가 (120-220px)
            const distance = 120 + Math.random() * 100;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            // 파티클 색상 (주기적으로 다른 색상 사용)
            const colorIndex = i % fireworkColors.length;
            const color = fireworkColors[colorIndex];
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 12px ${color}, 0 0 24px ${color}`;
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            container.appendChild(particle);
        }
        // 추가: 별 모양 파티클 (더 화려하게)
        if (Math.random() > 0.5) {
            const starCount = 8 + Math.floor(Math.random() * 5);
            const starAngleStep = (Math.PI * 2) / starCount;
            for (let i = 0; i < starCount; i++) {
                const angle = starAngleStep * i;
                const starDistance = 160 + Math.random() * 80;
                const dx = Math.cos(angle) * starDistance;
                const dy = Math.sin(angle) * starDistance;
                const starColor = fireworkColors[i % fireworkColors.length];
                const star = document.createElement('div');
                star.className = 'firework-particle';
                star.style.left = `${x}px`;
                star.style.top = `${y}px`;
                star.style.width = '12px';
                star.style.height = '12px';
                star.style.borderRadius = '0';
                star.style.backgroundColor = starColor;
                star.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                star.style.boxShadow = `0 0 15px ${starColor}, 0 0 30px ${starColor}`;
                star.style.setProperty('--dx', `${dx}px`);
                star.style.setProperty('--dy', `${dy}px`);
                container.appendChild(star);
            }
        }
        // 폭죽 중심 제거 (애니메이션 후)
        setTimeout(() => {
            if (center.parentNode) {
                center.remove();
            }
        }, 1000);
    }
    /**
     * 자리 배치 실행 시 음향 효과 재생 (3초)
     */
    playArrangementSound() {
        try {
            // Web Audio API를 사용하여 음향 효과 생성
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const duration = 3.0; // 3초
            const sampleRate = audioContext.sampleRate;
            const numSamples = duration * sampleRate;
            const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
            const data = buffer.getChannelData(0);
            // 상승하는 톤과 함께 부드러운 효과음 생성
            for (let i = 0; i < numSamples; i++) {
                const t = i / sampleRate;
                // 주파수가 점진적으로 상승하는 톤 (200Hz에서 400Hz로)
                const frequency = 200 + (200 * t / duration);
                // 진폭이 점진적으로 감소하는 엔벨로프
                const envelope = Math.exp(-t * 0.5) * (1 - t / duration);
                // 사인파 생성
                data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
            }
            // 오디오 소스 생성 및 재생
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        }
        catch (error) {
            // Web Audio API가 지원되지 않거나 오류가 발생한 경우 조용히 실패
            console.log('음향 효과 재생 실패:', error);
        }
    }
}
//# sourceMappingURL=MainController.js.map