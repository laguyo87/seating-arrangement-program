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
import { SeatType } from '../models/Seat.js';
import { Student } from '../models/Student.js';
import { Seat } from '../models/Seat.js';

/**
 * 메인 컨트롤러 클래스
 * 전체 프로그램의 흐름을 제어하고 모듈들을 조율합니다.
 */
export class MainController {
    private inputModule!: InputModule;
    private layoutSelectorModule!: LayoutSelectorModule;
    private canvasModule!: SeatCanvasModule;
    private outputModule!: OutputModule;
    private customLayoutModule!: CustomLayoutModule;
    
    private students: Student[] = [];
    private seats: Seat[] = [];
    private isInitialized: boolean = false;
    private fixedSeatIds: Set<number> = new Set(); // 고정 좌석 ID 목록
    private nextSeatId: number = 1; // 좌석 카드 고유 ID 생성기
    private dragSourceCard: HTMLElement | null = null; // 드래그 시작 카드 참조
    private isSyncing: boolean = false; // 동기화 중 플래그 (무한 루프 방지)

    constructor() {
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
            
            // 초기 상태에서도 4단계 비활성화 체크
            const checkedLayoutType = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
            if (checkedLayoutType && checkedLayoutType.value === 'single-uniform') {
                this.toggleCustomMode1(true);
            }
            
            // 초기 상태에서 고정 좌석 모드 확인
            const checkedFixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
            if (checkedFixedRandomMode) {
                this.enableFixedSeatMode();
            }
            
            this.isInitialized = true;
            
            // 저장된 데이터 불러오기
            this.loadSavedLayoutResult();
            
            console.log('초기화 - seats.length:', this.seats.length, 'students.length:', this.students.length);
            
            if (this.seats.length > 0 && this.students.length > 0) {
                console.log('저장된 배치 결과를 로드합니다.');
                this.outputModule.showInfo('저장된 배치 결과가 로드되었습니다.');
                // 저장된 배치 결과 렌더링
                this.renderFinalLayout();
            } else {
                console.log('초기 예시 레이아웃을 표시합니다.');
                // 초기 예시 레이아웃 표시 (24명, 6분단)
                this.renderInitialExampleLayout();
                
                // 초기값으로 미리보기 자동 실행
                setTimeout(() => {
                    this.updatePreviewForGenderCounts();
                }, 100);
            }
        } catch (error) {
            console.error('초기화 실패:', error);
            alert('프로그램 초기화 중 오류가 발생했습니다.');
        }
    }

    /**
     * 앱 초기 상태로 되돌리기
     */
    private resetApp(): void {
        try {
            // 로컬 스토리지 정리 (앱 관련 데이터만)
            try {
                localStorage.removeItem('layoutResult');
                localStorage.removeItem('studentData');
            } catch {}

            // 입력값 초기화
            const maleInput = document.getElementById('male-students') as HTMLInputElement | null;
            const femaleInput = document.getElementById('female-students') as HTMLInputElement | null;
            const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement | null;
            if (maleInput) maleInput.value = '12';
            if (femaleInput) femaleInput.value = '12';
            if (partitionInput) partitionInput.value = '6';

            // 라디오 기본값 복원
            const singleUniform = document.querySelector('input[name="layout-type"][value="single-uniform"]') as HTMLInputElement | null;
            if (singleUniform) singleUniform.checked = true;

            const pairSubmenu = document.getElementById('pair-submenu');
            if (pairSubmenu) pairSubmenu.style.display = 'none';

            const pairModeGender = document.querySelector('input[name="pair-mode"][value="gender-pair"]') as HTMLInputElement | null;
            if (pairModeGender) pairModeGender.checked = true;

            const customRandom = document.querySelector('input[name="custom-mode-2"][value="random"]') as HTMLInputElement | null;
            if (customRandom) customRandom.checked = true;

            // 고정 좌석 모드 해제
            this.disableFixedSeatMode();
            this.fixedSeatIds.clear();
            this.nextSeatId = 1;

            // 좌석 영역 초기화
            const seatsArea = document.getElementById('seats-area');
            if (seatsArea) seatsArea.innerHTML = '';

            // 학생 테이블 제거 (존재한다면)
            const outputSection = document.getElementById('output-section');
            if (outputSection) {
                const tables = outputSection.querySelectorAll('table');
                tables.forEach(t => t.remove());
            }

            // 액션 버튼 숨김
            const actionButtons = document.getElementById('layout-action-buttons');
            if (actionButtons) actionButtons.style.display = 'none';

            // 내부 상태 초기화
            this.students = [];
            this.seats = [];

            // 초기 예시 레이아웃 렌더링 및 미리보기 갱신
            this.renderInitialExampleLayout();
            this.updatePreviewForGenderCounts();

            this.outputModule.showInfo('초기화되었습니다. 기본 설정으로 돌아갑니다.');
        } catch (error) {
            console.error('초기화 중 오류:', error);
            this.outputModule.showError('초기화 중 오류가 발생했습니다.');
        }
    }

    /**
     * 초기 캔버스에 칠판과 교탁 그리기
     */
    private drawInitialCanvas(): void {
        const canvas = document.getElementById('seat-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
    private initializeEventListeners(): void {
        // 라디오 버튼 변경 이벤트 직접 리스닝
        const layoutInputs = document.querySelectorAll('input[name="layout-type"]');
        layoutInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const layoutType = target.value;
                
                // '1명 한 줄로 배치' 선택 시 4단계 비활성화
                this.toggleCustomMode1(layoutType === 'single-uniform');
                
                // '2명씩 짝꿍 배치' 선택 시 서브 메뉴 표시
                this.togglePairSubmenu(layoutType === 'pair-uniform');
                
                
                // 배치 형태 변경 시 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        });

        // 모둠 크기 라디오 버튼 변경 이벤트
        const groupSizeInputs = document.querySelectorAll('input[name="group-size"]');
        groupSizeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                // 미리보기 기능 삭제됨
            });
        });
        
        // 짝꿍 모드 라디오 버튼 변경 이벤트
        const pairModeInputs = document.querySelectorAll('input[name="pair-mode"]');
        pairModeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                console.log('짝꿍 모드 변경:', (e.target as HTMLInputElement).value);
                // 현재 학생 수 가져오기
                this.updatePreviewForGenderCounts();
            });
        });

        // 인원수 설정 이벤트
        document.addEventListener('studentCountSet', (e: Event) => {
            const customEvent = e as CustomEvent;
            const count = customEvent.detail.count;
            this.handleCreateStudentTable(count);
            // 미리보기 업데이트
            this.updatePreviewForStudentCount(count);
        });

        // 남학생 수 입력 필드 이벤트
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
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

        // 초기화 버튼
        const resetBtn = document.getElementById('reset-app');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetApp();
            });
        }

        // 여학생 수 입력 필드 이벤트
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
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
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (partitionInput) {
            partitionInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    // 분단 수가 입력되면 자동으로 저장되도록 (현재는 change 이벤트만 사용)
                    partitionInput.blur(); // 포커스 제거
                }
            });
            
            // 분단 수 변경 시 미리보기 업데이트
            partitionInput.addEventListener('change', () => {
                console.log('분단 수 변경됨');
                // 현재 학생 수 가져오기
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
                const fileInput = document.getElementById('upload-file-input') as HTMLInputElement;
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
            const target = e.target as HTMLElement;
            
            // 자리 배치하기 버튼 클릭
            if (target.id === 'arrange-seats') {
                console.log('자리 배치하기 버튼 클릭됨');
                this.handleArrangeSeats();
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
            
            // 저장하기 버튼 클릭
            if (target.id === 'save-layout') {
                this.handleSaveLayout();
            }
        });
    }

    /**
     * 라디오 버튼 이벤트 리스너 초기화
     */
    private initializeRadioListeners(): void {
        // 배치 유형 라디오 버튼
        const layoutRadios = document.querySelectorAll('input[name="layout-type"]');
        layoutRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.id === 'radio-group') {
                    // 모둠 배치가 선택되면 서브 메뉴 표시
                    const groupSubmenu = document.getElementById('group-submenu');
                    if (groupSubmenu) {
                        groupSubmenu.style.display = 'block';
                    }
                } else {
                    // 다른 옵션 선택 시 서브 메뉴 숨김
                    const groupSubmenu = document.getElementById('group-submenu');
                    if (groupSubmenu) {
                        groupSubmenu.style.display = 'none';
                    }
                }
            });
        });

        // 고정 좌석 모드 라디오 버튼
        const customModeRadios = document.querySelectorAll('input[name="custom-mode-2"]');
        customModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.value === 'fixed-random') {
                    // 고정 좌석 지정 후 랜덤 배치 모드 활성화
                    this.enableFixedSeatMode();
                } else {
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
    private enableFixedSeatMode(): void {
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
                const cardElement = card as HTMLElement;
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
                    } else {
                        cardElement.title = '클릭하여 고정 좌석 지정/해제';
                    }
                }
            });
        }
    }

    /**
     * 고정 좌석 모드 비활성화
     */
    private disableFixedSeatMode(): void {
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
     * 좌석 카드 클릭 이벤트 핸들러
     */
    private handleSeatCardClick = (e: MouseEvent): void => {
        // 드래그가 발생했으면 클릭 이벤트 무시
        if (this.dragSourceCard) {
            return;
        }
        
        const target = e.target as HTMLElement;
        const card = target.closest('.student-seat-card') as HTMLElement;
        
        if (!card) return;

        // 고정 좌석 모드가 활성화되어 있는지 확인
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
        if (!fixedRandomMode) return;

        const seatIdStr = card.getAttribute('data-seat-id');
        if (!seatIdStr) return;

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
        } else {
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
    }

    /**
     * 최종 자리 배치도 렌더링
     */
    private renderFinalLayout(): void {
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
    private renderInitialExampleLayout(): void {
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
        const exampleSeats: Seat[] = [];
        for (let i = 0; i < 24; i++) {
            const student = StudentModel.create(
                `학생${i + 1}`,
                (i % 2 === 0) ? 'M' : 'F'
            );
            this.students.push(student);
            
            // 좌석 생성 (더미)
            const seat = {
                id: i + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            } as Seat;
            exampleSeats.push(seat);
        }
        
        this.seats = exampleSeats;
        
        // 예시 카드 렌더링
        this.renderExampleCards();
    }

    /**
     * 예시 카드 렌더링
     */
    private renderExampleCards(): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

        // 기존 카드 제거
        seatsArea.innerHTML = '';

        // 좌석 번호를 1부터 시작하도록 초기화
        this.nextSeatId = 1;

        // 선택된 배치 형태 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
        const layoutType = layoutTypeInput?.value;
        
        // 분단 수 가져오기
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        const partitionCount = partitionInput ? parseInt(partitionInput.value || '1', 10) : 1;
        
        // 2명씩 짝꿍 배치인 경우
        if (layoutType === 'pair-uniform') {
            // 분단 레이블 추가
            const labelsRow = document.createElement('div');
            labelsRow.style.gridColumn = `1 / -1`;
            labelsRow.style.display = 'grid';
            labelsRow.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
            labelsRow.style.gap = '40px';
            labelsRow.style.marginBottom = '5px';
            
            for (let i = 1; i <= partitionCount; i++) {
                const label = document.createElement('div');
                label.textContent = `${i}분단`;
                label.style.textAlign = 'center';
                label.style.fontWeight = 'bold';
                label.style.color = '#667eea';
                label.style.fontSize = '0.9em';
                labelsRow.appendChild(label);
            }
            
            seatsArea.appendChild(labelsRow);
            
            seatsArea.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
            seatsArea.style.gap = '10px 40px';
            
            // 선택된 짝꿍 모드 확인
            const pairModeInput = document.querySelector('input[name="pair-mode"]:checked') as HTMLInputElement;
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
                        } else {
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
            } else {
                // 남녀 짝꿍 하기인 경우 - 명확하게 남녀 교대로 짝꿍 + 남은 남자 처리
                const maleStudents = this.students.filter(s => s.gender === 'M');
                const femaleStudents = this.students.filter(s => s.gender === 'F');
                
                // 1단계: 남녀 짝꿍 생성
                const genderPairs = Math.min(maleStudents.length, femaleStudents.length);
                let maleIndex = 0;
                let femaleIndex = 0;
                
                // 남녀 짝꿍 배치를 위한 배열 생성
                const pairs: Array<{male: Student | null, female: Student | null}> = [];
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
                    if (pairIndex >= pairs.length) break; // 외부 루프도 종료
                    for (let partition = 0; partition < partitionCount; partition++) {
                        if (pairIndex >= pairs.length) break;
                        
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
        } else {
            // '1명씩 한 줄로 배치' - 각 행에서 남녀 교대로 한 줄로 배치
            // 분단 레이블 추가
            const labelsRow = document.createElement('div');
            labelsRow.style.gridColumn = `1 / -1`;
            labelsRow.style.display = 'grid';
            labelsRow.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
            labelsRow.style.gap = '40px';
            labelsRow.style.marginBottom = '5px';
            
            for (let i = 1; i <= partitionCount; i++) {
                const label = document.createElement('div');
                label.textContent = `${i}분단`;
                label.style.textAlign = 'center';
                label.style.fontWeight = 'bold';
                label.style.color = '#667eea';
                label.style.fontSize = '0.9em';
                labelsRow.appendChild(label);
            }
            
            seatsArea.appendChild(labelsRow);
            
            // 총 컬럼 수 = 분단 수 (사용자 입력값 그대로 사용)
            seatsArea.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
            seatsArea.style.gap = '10px 40px'; // 분단 간 넓은 간격
            
            // 남학생과 여학생 분리
            const maleStudents = this.students.filter(s => s.gender === 'M');
            const femaleStudents = this.students.filter(s => s.gender === 'F');
            
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
                        seatsArea.appendChild(card);
                    }
                    
                    // 여학생 카드 배치
                    if (femaleIndex < femaleStudents.length) {
                        const card = this.createStudentCard(femaleStudents[femaleIndex], this.students.indexOf(femaleStudents[femaleIndex]));
                        seatsArea.appendChild(card);
                    }
                }
            }
        }
    }
    
    /**
     * 학생 카드 생성 헬퍼 메서드
     */
    private createStudentCard(student: Student, index: number): HTMLDivElement {
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
        } else {
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
    private enableSeatSwapDragAndDrop(): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

        // dragstart
        seatsArea.addEventListener('dragstart', (ev) => {
            const e = ev as DragEvent;
            const target = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            if (!target) return;
            
            // 고정 좌석 모드가 활성화되어 있으면 드래그 비활성화
            const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
            if (fixedRandomMode) {
                e.preventDefault();
                return;
            }
            
            // 고정 좌석은 드래그 불가
            if (target.classList.contains('fixed-seat')) {
                e.preventDefault();
                return;
            }
            this.dragSourceCard = target;
            try { e.dataTransfer?.setData('text/plain', 'swap'); } catch {}
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        });
        
        // dragend - 드래그가 끝나면 dragSourceCard 초기화 (드롭되지 않은 경우 대비)
        seatsArea.addEventListener('dragend', () => {
            this.dragSourceCard = null;
        });

        // dragover
        seatsArea.addEventListener('dragover', (ev) => {
            const e = ev as DragEvent;
            if (this.dragSourceCard) {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            }
        });

        // drop -> 두 카드의 학생 정보/성별 클래스만 스왑 (좌석 번호/고정상태는 유지)
        seatsArea.addEventListener('drop', (ev) => {
            const e = ev as DragEvent;
            e.preventDefault();
            const target = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            const source = this.dragSourceCard;
            this.dragSourceCard = null;
            if (!source || !target || source === target) return;
            if (target.classList.contains('fixed-seat') || source.classList.contains('fixed-seat')) return;

            const srcNameEl = source.querySelector('.student-name') as HTMLElement | null;
            const tgtNameEl = target.querySelector('.student-name') as HTMLElement | null;
            if (!srcNameEl || !tgtNameEl) return;

            // 이름 스왑
            const tmpName = srcNameEl.textContent || '';
            srcNameEl.textContent = tgtNameEl.textContent || '';
            tgtNameEl.textContent = tmpName;

            // 성별 배경 클래스 스왑
            const srcIsM = source.classList.contains('gender-m');
            const srcIsF = source.classList.contains('gender-f');
            const tgtIsM = target.classList.contains('gender-m');
            const tgtIsF = target.classList.contains('gender-f');

            source.classList.toggle('gender-m', tgtIsM);
            source.classList.toggle('gender-f', tgtIsF);
            target.classList.toggle('gender-m', srcIsM);
            target.classList.toggle('gender-f', srcIsF);
        });
    }

    /**
     * 고정 좌석 클릭 핸들러 설정
     */
    private setupFixedSeatClickHandler(card: HTMLDivElement, seatId: number): void {
        // '고정 좌석 지정 후 랜덤 배치' 모드인지 확인
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
        
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
    private toggleFixedSeat(seatId: number, card: HTMLDivElement): void {
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
        } else {
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
    private updateFixedSeatDropdowns(): void {
        const fixedSeatSelects = document.querySelectorAll('.fixed-seat-select') as NodeListOf<HTMLSelectElement>;
        
        fixedSeatSelects.forEach(select => {
            const currentValue = select.value;
            const currentOption = select.querySelector(`option[value="${currentValue}"]`);
            
            // 기존 옵션 제거 (기본 옵션 제외)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild!);
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
            } else if (currentOption && !currentValue) {
                // "없음" 옵션이면 유지
                select.value = '';
            }
        });
    }

    /**
     * 성별별 학생 수에 따라 미리보기 업데이트
     */
    private updatePreviewForGenderCounts(): void {
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        
        const maleCount = maleCountInput ? parseInt(maleCountInput.value || '0', 10) : 0;
        const femaleCount = femaleCountInput ? parseInt(femaleCountInput.value || '0', 10) : 0;
        
        console.log('성별별 미리보기 업데이트:', { maleCount, femaleCount });
        
        // 학생 및 좌석 배열 초기화
        this.students = [];
        this.seats = [];
        
        let studentIndex = 0;
        
        // 남학생 생성
        for (let i = 0; i < maleCount && i < 100; i++) {
            const student = StudentModel.create(
                `남학생${i + 1}`,
                'M'
            );
            this.students.push(student);
            
            // 좌석 생성 (더미)
            const seat = {
                id: studentIndex + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            } as Seat;
            this.seats.push(seat);
            studentIndex++;
        }
        
        // 여학생 생성
        for (let i = 0; i < femaleCount && i < 100; i++) {
            const student = StudentModel.create(
                `여학생${i + 1}`,
                'F'
            );
            this.students.push(student);
            
            // 좌석 생성 (더미)
            const seat = {
                id: studentIndex + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            } as Seat;
            this.seats.push(seat);
            studentIndex++;
        }
        
        // 미리보기 렌더링
        this.renderExampleCards();
    }

    /**
     * 학생 수에 따라 미리보기 업데이트
     */
    private updatePreviewForStudentCount(count: number): void {
        console.log('미리보기 업데이트:', count);
        
        // 학생 및 좌석 배열 초기화
        this.students = [];
        this.seats = [];
        
        // 지정된 수만큼 학생과 좌석 생성
        for (let i = 0; i < count && i < 100; i++) {
            const student = StudentModel.create(
                `학생${i + 1}`,
                (i % 2 === 0) ? 'M' : 'F'
            );
            this.students.push(student);
            
            // 좌석 생성 (더미)
            const seat = {
                id: i + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            } as Seat;
            this.seats.push(seat);
        }
        
        // 카드 렌더링 (초기 6열 배치 유지)
        this.renderExampleCards();
    }

    /**
     * 학생 데이터로 카드 렌더링
     */
    private renderStudentCards(seats: Seat[]): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

        // 기존 카드 제거
        seatsArea.innerHTML = '';

        // 좌석 번호를 1부터 시작하도록 초기화
        this.nextSeatId = 1;

        // 학생 수에 따라 그리드 열 수 결정
        const columnCount = this.students.length <= 20 ? 4 : 6;
        seatsArea.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
        seatsArea.style.gap = '10px';

        seats.forEach((seat, index) => {
            if (index >= this.students.length) return;
            
            const student = this.students[index];
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
            nameDiv.textContent = student.name || `학생${index + 1}`;
            
            // 성별에 따라 클래스 추가
            if (student.gender === 'M') {
                card.classList.add('gender-m');
            } else {
                card.classList.add('gender-f');
            }
            
            card.appendChild(nameDiv);
            
            seatsArea.appendChild(card);
        });

        // 렌더 후 드래그&드롭 스왑 핸들러 보장
        this.enableSeatSwapDragAndDrop();
    }

    /**
     * 좌석 배치 결과를 localStorage에 저장
     */
    private saveLayoutResult(): void {
        try {
            const layoutData = {
                seats: this.seats,
                students: this.students,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('layoutResult', JSON.stringify(layoutData));
            console.log('좌석 배치 결과가 브라우저에 저장되었습니다.');
        } catch (error) {
            console.error('배치 결과 저장 중 오류:', error);
        }
    }

    /**
     * 저장된 좌석 배치 결과 불러오기
     */
    private loadSavedLayoutResult(): void {
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
        } catch (error) {
            console.error('배치 결과 불러오기 중 오류:', error);
        }
    }

    /**
     * 나머지 랜덤 배치 처리
     */
    private handleRandomizeRemaining(): void {
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
        } catch (error) {
            console.error('랜덤 배치 중 오류:', error);
            this.outputModule.showError('랜덤 배치 중 오류가 발생했습니다.');
        }
    }


    /**
     * 결과 내보내기 처리
     */
    private handleExport(): void {
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
        } catch (error) {
            console.error('내보내기 중 오류:', error);
            this.outputModule.showError('내보내기 중 오류가 발생했습니다.');
        }
    }


    /**
     * 배치 미리보기 처리
     * @param layoutType 배치 유형
     * @param groupSize 모둠 크기 (선택적)
     */
    private handleLayoutPreview(layoutType: string, groupSize?: number): void {
        // 미리보기 기능 비활성화됨
        // 사용자가 '자리 배치 생성' 버튼을 클릭할 때만 배치가 표시됩니다.
        return;
    }

    /**
     * 카드 형태로 미리보기 렌더링
     * @param seats 좌석 배열
     */
    private renderPreviewCards(seats: Seat[]): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

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
            } else {
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
    private handleCreateStudentTable(count?: number): void {
        const outputSection = document.getElementById('output-section');
        if (!outputSection) return;

        // count가 제공되지 않으면 남학생/여학생 수를 합산
        if (count === undefined) {
            const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
            const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
            
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
            (canvasContainer as HTMLElement).style.display = 'none';
        }

        // 테이블 생성
        let studentTableContainer = outputSection.querySelector('.student-table-container') as HTMLElement | null;
        
        // 기존 테이블이 있으면 제거
        if (studentTableContainer) {
            studentTableContainer.remove();
        }

        // 새 테이블 컨테이너 생성
        studentTableContainer = document.createElement('div');
        studentTableContainer.className = 'student-table-container';
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
        const buttonContainer = document.createElement('div') as HTMLElement;
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginBottom = '15px';
        buttonContainer.style.gridColumn = '1 / -1'; // 전체 그리드 너비 사용
        
        // 양식 다운로드 버튼
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'download-template';
        downloadBtn.className = 'secondary-btn';
        downloadBtn.textContent = '양식 다운로드';
        downloadBtn.style.flex = '1';
        downloadBtn.addEventListener('click', () => this.downloadTemplateFile());
        buttonContainer.appendChild(downloadBtn);
        
        // 파일 업로드 버튼
        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'upload-file';
        uploadBtn.className = 'secondary-btn';
        uploadBtn.textContent = '엑셀 파일에서 가져오기';
        uploadBtn.style.flex = '1';
        
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
        
        studentTableContainer.appendChild(buttonContainer);

        // '고정 좌석 지정 후 랜덤 배치' 모드인지 확인
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
        
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
                    <th title="미리보기 화면의 좌석 카드에 표시된 번호(#1, #2...)를 선택하세요. 고정 좌석을 지정하지 않으려면 '없음'을 선택하세요.">고정 좌석 <span style="font-size: 0.8em; color: #999;">(미리보기 좌석 번호)</span></th>
                    <th>작업</th>
                `;
            } else {
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
                let fixedSeatCell: HTMLTableCellElement | null = null;
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
                    
                    // 고정 좌석 선택 변경 이벤트
                    fixedSeatSelect.addEventListener('change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        
                        // 학생 데이터에 고정 좌석 ID 저장
                        if (this.students[studentIndex]) {
                            if (selectedSeatId) {
                                this.students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            } else {
                                delete this.students[studentIndex].fixedSeatId;
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
                deleteBtn.textContent = '삭제';
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.onclick = () => this.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);

                // 키보드 이벤트 추가 (이름 입력 필드)
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        genderSelect.focus();
                    } else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'name', 'down');
                    } else if (e.key === 'ArrowUp') {
                        this.moveToCell(tbody, localIndex, 'name', 'up');
                    }
                });

                // 키보드 이벤트 추가 (성별 선택 필드)
                genderSelect.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        const nextRow = tbody.querySelector(`tr:nth-child(${Math.min(localIndex + 1, studentsInThisTable)})`);
                        const nextNameInput = nextRow?.querySelector('.student-name-input') as HTMLInputElement;
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    } else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'gender', 'down');
                    } else if (e.key === 'ArrowUp') {
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
        
        // 통계 표시를 위한 컨테이너 추가 (모든 테이블 아래에 하나만)
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
            grid-column: 1 / -1;
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 0.95em;
            margin-top: 10px;
        `;
        statsContainer.id = 'student-table-stats';
        const statsCell = document.createElement('div');
        statsCell.id = 'student-table-stats-cell';
        statsContainer.appendChild(statsCell);
        studentTableContainer.appendChild(statsContainer);
        
        // 작업 버튼 추가
        const actionButtons = document.createElement('div');
        actionButtons.className = 'table-action-buttons';
        actionButtons.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: flex-start;">
                <button id="add-student-row-btn" style="width: auto; flex: 0 0 auto; min-width: 0;">행 추가</button>
                <button id="save-student-table-btn" class="save-btn" style="width: auto; flex: 0 0 auto; min-width: 0; background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">💾 저장</button>
                <button id="arrange-seats" class="arrange-seats-btn" style="width: auto; flex: 0 0 auto; min-width: 0;">자리 배치하기</button>
                <label style="display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;"><input type="checkbox" id="avoid-prev-seat" /><span>이전 좌석 안 앉기</span></label>
                <label style="display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;"><input type="checkbox" id="avoid-prev-partner" /><span>이전 짝 금지</span></label>
            </div>
        `;
        studentTableContainer.appendChild(actionButtons);
        
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

        this.outputModule.showInfo(`${count}명의 학생 명렬표가 생성되었습니다.`);
    }

    /**
     * 학생 행 삭제 처리
     * @param row 삭제할 행
     */
    private handleDeleteStudentRow(row: HTMLTableRowElement): void {
        if (confirm('이 학생을 삭제하시겠습니까?')) {
            row.remove();
            this.updateRowNumbers();
            this.updateStudentTableStats(); // 통계 업데이트
        }
    }

    /**
     * 학생 행 추가 처리 (마지막 행 뒤에 추가)
     */
    private handleAddStudentRow(): void {
        const outputSection = document.getElementById('output-section');
        if (!outputSection) return;

        // 모든 tbody 찾기
        const allTbodies = outputSection.querySelectorAll('.student-input-table tbody');
        if (allTbodies.length === 0) return;

        // 마지막 tbody 찾기
        const lastTbody = allTbodies[allTbodies.length - 1] as HTMLTableSectionElement;
        
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
            const studentTableContainer = outputSection.querySelector('.student-table-container') as HTMLElement;
            if (studentTableContainer) {
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
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
                        <th title="미리보기 화면의 좌석 카드에 표시된 번호(#1, #2...)를 선택하세요. 고정 좌석을 지정하지 않으려면 '없음'을 선택하세요.">고정 좌석 <span style="font-size: 0.8em; color: #999;">(미리보기 좌석 번호)</span></th>
                        <th>작업</th>
                    `;
                } else {
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
                
                // 통계 컨테이너와 작업 버튼 앞에 삽입
                const statsContainer = studentTableContainer.querySelector('#student-table-stats');
                if (statsContainer) {
                    studentTableContainer.insertBefore(tableWrapper, statsContainer);
                } else {
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
        let fixedSeatCell: HTMLTableCellElement | null = null;
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
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
                    } else {
                        delete this.students[studentIndex].fixedSeatId;
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
                const nextNameInput = nextRow?.querySelector('.student-name-input') as HTMLInputElement;
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
            const fixedSeatSelectInCell = fixedSeatCell.querySelector('.fixed-seat-select') as HTMLSelectElement;
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
    private updateStudentTableStats(): void {
        const statsCell = document.getElementById('student-table-stats-cell');
        // 통계 셀이 없으면 테이블이 아직 생성되지 않았거나 제거된 상태
        if (!statsCell) return;

        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr') || [];
        
        // rows가 없어도 통계는 표시해야 함 (0명일 수도 있으므로)

        let maleCount = 0;
        let femaleCount = 0;
        let fixedSeatCount = 0;

        rows.forEach((row) => {
            const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
            const fixedSeatSelect = row.querySelector('.fixed-seat-select') as HTMLSelectElement;
            
            if (genderSelect) {
                const gender = genderSelect.value;
                if (gender === 'M') {
                    maleCount++;
                } else if (gender === 'F') {
                    femaleCount++;
                }
            }

            if (fixedSeatSelect && fixedSeatSelect.value) {
                fixedSeatCount++;
            }
        });

        // 사이드바의 남녀 숫자 가져오기
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        
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

        // 경고 메시지 추가
        const warnings: string[] = [];
        
        if (expectedMaleCount > 0 && maleCount !== expectedMaleCount) {
            warnings.push(`남학생 수가 일치하지 않습니다. (입력: ${expectedMaleCount}명, 테이블: ${maleCount}명)`);
        }
        
        if (expectedFemaleCount > 0 && femaleCount !== expectedFemaleCount) {
            warnings.push(`여학생 수가 일치하지 않습니다. (입력: ${expectedFemaleCount}명, 테이블: ${femaleCount}명)`);
        }

        if (warnings.length > 0) {
            statsHTML += `
                <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404;">
                    <strong>⚠️ 경고:</strong>
                    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                        ${warnings.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        statsCell.innerHTML = statsHTML;
        
        // 자동 동기화 제거: 사용자가 명시적으로 '저장' 버튼을 클릭할 때만 동기화
    }

    /**
     * 학생 정보 입력 테이블 저장 처리
     * 테이블의 학생 수를 계산하여 1단계 사이드바에 반영하고 미리보기를 업데이트
     */
    private handleSaveStudentTable(): void {
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr') || [];
        
        let maleCount = 0;
        let femaleCount = 0;

        rows.forEach((row) => {
            const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
            if (genderSelect) {
                const gender = genderSelect.value;
                if (gender === 'M') {
                    maleCount++;
                } else if (gender === 'F') {
                    femaleCount++;
                }
            }
        });

        // 테이블의 학생 수를 1단계 사이드바로 동기화
        this.syncSidebarToTable(maleCount, femaleCount);
    }

    /**
     * 테이블의 숫자를 1단계 사이드바로 동기화
     * 테이블에 실제 입력된 학생 수를 1단계 입력 필드에 반영하고 미리보기를 업데이트
     */
    private syncSidebarToTable(tableMaleCount: number, tableFemaleCount: number): void {
        this.isSyncing = true; // 동기화 시작
        
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        
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
        
        // 완료 메시지 표시
        this.outputModule.showInfo(`1단계 입력 값이 테이블 기준으로 업데이트되었습니다. (남: ${tableMaleCount}명, 여: ${tableFemaleCount}명)`);
    }

    /**
     * 1단계 사이드바 값을 테이블로 동기화
     * 1단계에 입력된 숫자에 맞춰 테이블에 행을 추가하거나 삭제
     */
    private syncTableToSidebar(sidebarMaleCount: number, sidebarFemaleCount: number): void {
        const outputSection = document.getElementById('output-section');
        const tbody = outputSection?.querySelector('.student-input-table tbody');
        if (!tbody) {
            alert('테이블을 찾을 수 없습니다.');
            return;
        }

        const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
        const totalNeeded = sidebarMaleCount + sidebarFemaleCount;
        const currentTotal = rows.length;

        // 현재 행들의 성별 카운트
        let currentMaleCount = 0;
        let currentFemaleCount = 0;
        
        rows.forEach(row => {
            const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
            if (genderSelect) {
                if (genderSelect.value === 'M') {
                    currentMaleCount++;
                } else if (genderSelect.value === 'F') {
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
                const newRows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
                const lastRow = newRows[newRows.length - 1];
                const genderSelect = lastRow.querySelector('.student-gender-select') as HTMLSelectElement;
                if (genderSelect) {
                    genderSelect.value = 'M';
                }
            }
            
            // 여학생 행 추가
            for (let i = 0; i < femaleToAdd; i++) {
                this.handleAddStudentRow();
                // 추가된 행의 성별을 여자로 설정
                const newRows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
                const lastRow = newRows[newRows.length - 1];
                const genderSelect = lastRow.querySelector('.student-gender-select') as HTMLSelectElement;
                if (genderSelect) {
                    genderSelect.value = 'F';
                }
            }
        } else if (currentTotal > totalNeeded) {
            // 행 삭제 필요 (맨 아래부터 삭제)
            const toDelete = currentTotal - totalNeeded;
            const rowsToDelete = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
            
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
        const finalRows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
        let currentMales = 0;
        let currentFemales = 0;
        
        finalRows.forEach(row => {
            const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
            if (genderSelect) {
                if (genderSelect.value === 'M') {
                    currentMales++;
                } else if (genderSelect.value === 'F') {
                    currentFemales++;
                }
            }
        });

        // 성별이 맞지 않으면 조정
        if (currentMales !== sidebarMaleCount || currentFemales !== sidebarFemaleCount) {
            let maleNeeded = sidebarMaleCount - currentMales;
            let femaleNeeded = sidebarFemaleCount - currentFemales;
            
            finalRows.forEach(row => {
                const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
                if (!genderSelect) return;
                
                if (maleNeeded > 0 && genderSelect.value !== 'M') {
                    genderSelect.value = 'M';
                    maleNeeded--;
                    if (genderSelect.value === 'F') femaleNeeded++;
                } else if (femaleNeeded > 0 && genderSelect.value !== 'F') {
                    genderSelect.value = 'F';
                    femaleNeeded--;
                    if (genderSelect.value === 'M') maleNeeded++;
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
    private updateRowNumbers(): void {
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr');
        if (!rows) return;

        rows.forEach((row) => {
            const htmlRow = row as HTMLTableRowElement;
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
    private createLayoutResultSection(outputSection: HTMLElement, students: Array<{name: string, gender: 'M' | 'F'}>): void {
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
    private renderStudentLayout(students: Array<{name: string, gender: 'M' | 'F'}>): void {
        const layoutType = this.layoutSelectorModule.getCurrentLayoutType();
        
        if (!layoutType) {
            return;
        }

        const canvas = document.getElementById('dynamic-seat-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        // 분단 수 가져오기
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        const partitionCount = partitionInput ? parseInt(partitionInput.value || '1', 10) : 1;
        
        // 레이아웃 생성
        const layoutResult = LayoutService.createLayout(
            layoutType,
            students.length,
            canvas.width,
            canvas.height,
            partitionCount
        );

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
    private drawSeatWithStudent(ctx: CanvasRenderingContext2D, seat: any, student: {name: string, gender: 'M' | 'F'}): void {
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
    private moveToCell(tbody: HTMLTableSectionElement, currentRow: number, columnName: string, direction: 'up' | 'down'): void {
        const nextRowNum = direction === 'down' ? currentRow + 1 : currentRow - 1;
        const nextRow = tbody.querySelector(`tr:nth-child(${nextRowNum})`);
        
        if (nextRow) {
            const cellInput = columnName === 'name' 
                ? nextRow.querySelector('.student-name-input') as HTMLInputElement
                : nextRow.querySelector('.student-gender-select') as HTMLSelectElement;
            
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
    private downloadTemplateFile(): void {
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
    private handleFileUpload(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        
        if (!file) return;
        
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
                    const text = e.target?.result as string;
                    this.parseCsvFile(text);
                } catch (error) {
                    console.error('파일 읽기 오류:', error);
                    this.outputModule.showError('파일을 읽는 중 오류가 발생했습니다.');
                }
            };
            reader.readAsText(file, 'UTF-8');
        } else {
            // 엑셀 파일인 경우 안내 메시지
            this.outputModule.showError('엑셀 파일은 CSV로 저장한 후 업로드해주세요. 파일 > 다른 이름으로 저장 > CSV(쉼표로 구분)(*.csv)');
        }
    }

    /**
     * CSV 파일 파싱 및 테이블에 데이터 입력
     * @param csvText CSV 파일 내용
     */
    private parseCsvFile(csvText: string): void {
        // BOM 제거
        csvText = csvText.replace(/^\uFEFF/, '');
        
        // 줄바꿈 정리
        csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        const lines = csvText.split('\n');
        const students: Array<{name: string, gender: 'M' | 'F'}> = [];
        
        // 첫 번째 줄(헤더) 제외하고 파싱
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
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
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        
        if (maleCountInput && femaleCountInput) {
            const maleStudents = students.filter(s => s.gender === 'M').length;
            const femaleStudents = students.filter(s => s.gender === 'F').length;
            
            maleCountInput.value = maleStudents.toString();
            femaleCountInput.value = femaleStudents.toString();
        }
        
        // 파일 input 초기화
        const uploadInput = document.getElementById('upload-file') as HTMLInputElement;
        if (uploadInput) {
            uploadInput.value = '';
        }
    }

    /**
     * 학생 데이터로 테이블 생성
     * @param students 학생 배열
     */
    private createTableWithStudents(students: Array<{name: string, gender: 'M' | 'F'}>): void {
        const outputSection = document.getElementById('output-section');
        if (!outputSection) return;

        // 기존 캔버스 숨기기
        const canvasContainer = outputSection.querySelector('#canvas-container');
        if (canvasContainer) {
            (canvasContainer as HTMLElement).style.display = 'none';
        }

        // 기존 테이블 제거
        let studentTableContainer = outputSection.querySelector('.student-table-container') as HTMLElement | null;
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
        const buttonContainer = document.createElement('div') as HTMLElement;
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginBottom = '15px';
        buttonContainer.style.gridColumn = '1 / -1';
        
        // 양식 다운로드 버튼
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'download-template';
        downloadBtn.className = 'secondary-btn';
        downloadBtn.textContent = '양식 다운로드';
        downloadBtn.style.flex = '1';
        downloadBtn.addEventListener('click', () => this.downloadTemplateFile());
        buttonContainer.appendChild(downloadBtn);
        
        // 파일 업로드 버튼
        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'upload-file';
        uploadBtn.className = 'secondary-btn';
        uploadBtn.textContent = '엑셀 파일에서 가져오기';
        uploadBtn.style.flex = '1';
        
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
        
        studentTableContainer.appendChild(buttonContainer);

        const count = students.length;
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
        
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
                    <th title="미리보기 화면의 좌석 카드에 표시된 번호(#1, #2...)를 선택하세요. 고정 좌석을 지정하지 않으려면 '없음'을 선택하세요.">고정 좌석 <span style="font-size: 0.8em; color: #999;">(미리보기 좌석 번호)</span></th>
                    <th>작업</th>
                `;
            } else {
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
                let fixedSeatCell: HTMLTableCellElement | null = null;
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
                    
                    // 고정 좌석 선택 변경 이벤트
                    fixedSeatSelect.addEventListener('change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        
                        // 학생 데이터에 고정 좌석 ID 저장
                        if (this.students[studentIndex]) {
                            if (selectedSeatId) {
                                this.students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            } else {
                                delete this.students[studentIndex].fixedSeatId;
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
                deleteBtn.textContent = '삭제';
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.onclick = () => this.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);

                // 키보드 이벤트 추가 (이름 입력 필드)
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        genderSelect.focus();
                    } else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'name', 'down');
                    } else if (e.key === 'ArrowUp') {
                        this.moveToCell(tbody, localIndex, 'name', 'up');
                    }
                });

                // 키보드 이벤트 추가 (성별 선택 필드)
                genderSelect.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        const nextRow = tbody.querySelector(`tr:nth-child(${Math.min(localIndex + 1, studentsInThisTable)})`);
                        const nextNameInput = nextRow?.querySelector('.student-name-input') as HTMLInputElement;
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    } else if (e.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'gender', 'down');
                    } else if (e.key === 'ArrowUp') {
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
        
        // 통계 표시를 위한 컨테이너 추가 (모든 테이블 아래에 하나만)
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
            grid-column: 1 / -1;
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 0.95em;
            margin-top: 10px;
        `;
        statsContainer.id = 'student-table-stats';
        const statsCell = document.createElement('div');
        statsCell.id = 'student-table-stats-cell';
        statsContainer.appendChild(statsCell);
        studentTableContainer.appendChild(statsContainer);
        
        // 작업 버튼 추가
        const actionButtons = document.createElement('div');
        actionButtons.className = 'table-action-buttons';
        actionButtons.style.cssText = 'grid-column: 1 / -1;';
        actionButtons.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: flex-start;">
                <button id="add-student-row-btn" style="width: auto; flex: 0 0 auto; min-width: 0;">행 추가</button>
                <button id="save-student-table-btn" class="save-btn" style="width: auto; flex: 0 0 auto; min-width: 0; background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">💾 저장</button>
                <button id="arrange-seats" class="arrange-seats-btn" style="width: auto; flex: 0 0 auto; min-width: 0;">자리 배치하기</button>
                <label style="display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;"><input type="checkbox" id="avoid-prev-seat" /><span>이전 좌석 안 앉기</span></label>
                <label style="display:flex; align-items:center; gap:4px; margin:0; white-space:nowrap;"><input type="checkbox" id="avoid-prev-partner" /><span>이전 짝 금지</span></label>
            </div>
        `;
        studentTableContainer.appendChild(actionButtons);
        
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
    private drawTeacherDeskAndBoard(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
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
    private toggleCustomMode1(disable: boolean): void {
        const advancedSection = document.getElementById('advanced-section');
        if (!advancedSection) return;

        // 라디오 버튼들 가져오기
        const radioOptions = advancedSection.querySelectorAll('input[name="custom-mode-1"]');
        const labels = advancedSection.querySelectorAll('label.radio-option');
        
        radioOptions.forEach((radio, index) => {
            const radioElement = radio as HTMLInputElement;
            const label = labels[index] as HTMLElement;
            
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
            } else {
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
     * 2명씩 짝꿍 배치 서브 메뉴 토글
     */
    private togglePairSubmenu(show: boolean): void {
        const pairSubmenu = document.getElementById('pair-submenu');
        if (!pairSubmenu) return;
        
        if (show) {
            pairSubmenu.style.display = 'block';
        } else {
            pairSubmenu.style.display = 'none';
        }
    }

    /**
     * 프로그램 실행
     */
    public run(): void {
        if (!this.isInitialized) {
            console.error('컨트롤러가 초기화되지 않았습니다.');
            return;
        }
        
        console.log('교실 자리 배치 프로그램이 시작되었습니다.');
    }

    /**
     * 좌석 배치하기 처리
     */
    private handleArrangeSeats(): void {
        try {
            // 사이드바의 남녀 숫자와 테이블의 수 일치 여부 확인
            const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
            const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
            
            const expectedMaleCount = maleCountInput ? parseInt(maleCountInput.value || '0', 10) : 0;
            const expectedFemaleCount = femaleCountInput ? parseInt(femaleCountInput.value || '0', 10) : 0;

            if (expectedMaleCount > 0 || expectedFemaleCount > 0) {
                // 테이블에서 실제 학생 데이터 가져오기
                const studentData = this.inputModule.getStudentData();
                
                const actualMaleCount = studentData.filter(s => s.gender === 'M').length;
                const actualFemaleCount = studentData.filter(s => s.gender === 'F').length;

                const warnings: string[] = [];
                
                if (expectedMaleCount > 0 && actualMaleCount !== expectedMaleCount) {
                    warnings.push(`남학생 수가 일치하지 않습니다. (입력: ${expectedMaleCount}명, 테이블: ${actualMaleCount}명)`);
                }
                
                if (expectedFemaleCount > 0 && actualFemaleCount !== expectedFemaleCount) {
                    warnings.push(`여학생 수가 일치하지 않습니다. (입력: ${expectedFemaleCount}명, 테이블: ${actualFemaleCount}명)`);
                }

                if (warnings.length > 0) {
                    const warningMessage = '⚠️ 경고:\n\n' + warnings.join('\n') + '\n\n자리 배치를 계속하시겠습니까?';
                    if (!confirm(warningMessage)) {
                        return;
                    }
                }
            }

            // 테이블에서 학생 데이터 가져오기
            const studentData = this.inputModule.getStudentData();
            
            if (studentData.length === 0) {
                alert('학생 정보를 먼저 입력해주세요.');
                return;
            }

            console.log('학생 데이터:', studentData);

            // 학생 데이터를 Student 객체로 변환
            this.students = StudentModel.createMultiple(studentData);
            
            // 고정 좌석 모드인지 확인
            const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
            
            // 고정 좌석 정보를 테이블에서 읽어오기
            if (fixedRandomMode) {
                const fixedSeatSelects = document.querySelectorAll('.fixed-seat-select') as NodeListOf<HTMLSelectElement>;
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
            if (!seatsArea) return;
            
            // 기존 카드들 가져오기 (분단 레이블 제외)
            const existingCards = seatsArea.querySelectorAll('.student-seat-card');
            
            console.log('기존 카드 수:', existingCards.length);
            
            if (existingCards.length === 0) {
                alert('먼저 좌석 배치 형태를 설정해주세요.');
                return;
            }
            
            // 옵션 체크박스 값 읽기
            const avoidPrevSeat = (document.getElementById('avoid-prev-seat') as HTMLInputElement | null)?.checked === true;
            const avoidPrevPartner = (document.getElementById('avoid-prev-partner') as HTMLInputElement | null)?.checked === true;

            // 이전 배치 기록 불러오기
            const lastSeatByStudent: Record<string, number> = (() => {
                try { return JSON.parse(localStorage.getItem('lastSeatByStudent') || '{}'); } catch { return {}; }
            })();
            const lastPartnerByStudent: Record<string, string> = (() => {
                try { return JSON.parse(localStorage.getItem('lastPartnerByStudent') || '{}'); } catch { return {}; }
            })();
            
            // 고정 좌석 모드인 경우
            if (fixedRandomMode && this.fixedSeatIds.size > 0) {
                // 1단계: 모든 카드의 이름 초기화
                existingCards.forEach((card) => {
                    const cardElement = card as HTMLElement;
                    const nameDiv = cardElement.querySelector('.student-name') as HTMLElement;
                    if (nameDiv) {
                        nameDiv.textContent = '';
                    }
                });
                
                // 2단계: 고정 좌석에 지정된 학생 배치
                const fixedStudents = this.students.filter(s => s.fixedSeatId !== undefined);
                existingCards.forEach((card) => {
                    const cardElement = card as HTMLElement;
                    const seatIdStr = cardElement.getAttribute('data-seat-id');
                    if (!seatIdStr) return;
                    
                    const seatId = parseInt(seatIdStr, 10);
                    
                    // 고정 좌석인 경우
                    if (this.fixedSeatIds.has(seatId)) {
                        const fixedStudent = fixedStudents.find(s => s.fixedSeatId === seatId);
                        if (fixedStudent) {
                            const nameDiv = cardElement.querySelector('.student-name') as HTMLElement;
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
                    const seatIdStr = (card as HTMLElement).getAttribute('data-seat-id');
                    if (!seatIdStr) return false;
                    const seatId = parseInt(seatIdStr, 10);
                    return !this.fixedSeatIds.has(seatId);
                }) as HTMLElement[];
                
                console.log(`고정 좌석 제외: 총 ${existingCards.length}개 좌석 중 ${nonFixedCards.length}개 좌석만 랜덤 배치 대상`);
                console.log(`고정 학생 제외: 남학생 ${allRemainingMales.length}명, 여학생 ${allRemainingFemales.length}명만 랜덤 배치 대상`);
                
                // 페어 컨테이너 우선 처리 (짝 제약 고려)
                const seatsAreaEl = document.getElementById('seats-area')!;
                const pairContainers: HTMLElement[] = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = (card as HTMLElement).parentElement as HTMLElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (siblings && siblings.length === 2 && pairContainers.indexOf(parent) === -1) {
                        pairContainers.push(parent);
                    }
                });

                pairContainers.forEach(container => {
                    const cards = Array.from(container.querySelectorAll('.student-seat-card')) as HTMLElement[];
                    if (cards.length !== 2) return;
                    const [cardA, cardB] = cards;
                    const seatIdA = parseInt(cardA.getAttribute('data-seat-id') || '0', 10);
                    const seatIdB = parseInt(cardB.getAttribute('data-seat-id') || '0', 10);
                    const isMaleA = cardA.classList.contains('gender-m');
                    const isMaleB = cardB.classList.contains('gender-m');
                    const nameDivA = cardA.querySelector('.student-name') as HTMLElement;
                    const nameDivB = cardB.querySelector('.student-name') as HTMLElement;

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
                    let chosenA: Student | undefined = undefined;
                    if (!hasNameA) {
                        if (poolA.length === 0) {
                            // poolA가 비어있으면 다른 성별에서 시도
                            const alternativePoolA = isMaleA ? shuffledFemales : shuffledMales;
                            if (alternativePoolA.length > 0) {
                                let idxA = 0;
                                if (avoidPrevSeat) {
                                    for (let i = 0; i < alternativePoolA.length; i++) {
                                        const cand = alternativePoolA[i];
                                        if (lastSeatByStudent[cand.name] !== seatIdA) { idxA = i; break; }
                                    }
                                }
                                chosenA = alternativePoolA.splice(idxA, 1)[0];
                                if (nameDivA && chosenA) nameDivA.textContent = chosenA.name || '';
                                if (isMaleA) shuffledMales = alternativePoolA; else shuffledFemales = alternativePoolA;
                            }
                        } else {
                            let idxA = 0;
                            if (avoidPrevSeat) {
                                for (let i = 0; i < poolA.length; i++) {
                                    const cand = poolA[i];
                                    if (lastSeatByStudent[cand.name] !== seatIdA) { idxA = i; break; }
                                }
                            }
                            chosenA = poolA.splice(idxA, 1)[0];
                            if (nameDivA && chosenA) nameDivA.textContent = chosenA.name || '';
                            if (isMaleA) shuffledMales = poolA; else shuffledFemales = poolA;
                        }
                    } else {
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
                                        const partnerOk = !avoidPrevPartner || (
                                            lastPartnerByStudent[chosenA.name] !== cand.name && 
                                            lastPartnerByStudent[cand.name] !== chosenA.name
                                        );
                                        if (seatOk && partnerOk) { idxB = i; break; }
                                    }
                                } else if (avoidPrevSeat) {
                                    for (let i = 0; i < alternativePoolB.length; i++) {
                                        const cand = alternativePoolB[i];
                                        if (lastSeatByStudent[cand.name] !== seatIdB) { idxB = i; break; }
                                    }
                                }
                                const chosenB = alternativePoolB.splice(idxB, 1)[0];
                                if (nameDivB && chosenB) nameDivB.textContent = chosenB.name || '';
                                if (isMaleB) shuffledMales = alternativePoolB; else shuffledFemales = alternativePoolB;
                            }
                        } else {
                            let idxB = -1;
                            // partner 제약 고려
                            for (let i = 0; i < poolB.length; i++) {
                                const cand = poolB[i];
                                const seatOk = !avoidPrevSeat || lastSeatByStudent[cand.name] !== seatIdB;
                                const partnerOk = !avoidPrevPartner || !chosenA || (
                                    lastPartnerByStudent[chosenA.name] !== cand.name && 
                                    lastPartnerByStudent[cand.name] !== chosenA.name
                                );
                                if (seatOk && partnerOk) { idxB = i; break; }
                            }
                            
                            // 조건을 만족하는 학생이 없으면 첫 번째 학생을 선택 (강제 배치)
                            if (idxB === -1) {
                                idxB = 0;
                            }
                            
                            const chosenB = poolB.splice(idxB, 1)[0];
                            if (nameDivB && chosenB) nameDivB.textContent = chosenB.name || '';
                            if (isMaleB) shuffledMales = poolB; else shuffledFemales = poolB;
                        }
                    }
                });

                // 나머지 단일 카드 처리 (고정 좌석 제외)
                const singleCards: HTMLElement[] = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = (card as HTMLElement).parentElement as HTMLElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (!siblings || siblings.length !== 2) {
                        const seatIdStr = (card as HTMLElement).getAttribute('data-seat-id');
                        if (seatIdStr) {
                            const seatId = parseInt(seatIdStr, 10);
                            // 고정 좌석이 아닌 경우만 추가
                            if (!this.fixedSeatIds.has(seatId)) {
                                singleCards.push(card as HTMLElement);
                            }
                        }
                    }
                });
                singleCards.forEach(cardElement => {
                    const seatIdStr = cardElement.getAttribute('data-seat-id');
                    if (!seatIdStr) return;
                    const seatId = parseInt(seatIdStr, 10);
                    const nameDiv = cardElement.querySelector('.student-name') as HTMLElement;
                    
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
                        if (nameDiv) nameDiv.textContent = ''; 
                        return; 
                    }
                    let pickIdx = 0;
                    if (avoidPrevSeat) {
                        for (let i = 0; i < pool.length; i++) {
                            const cand = pool[i];
                            if (lastSeatByStudent[cand.name] !== seatId) { pickIdx = i; break; }
                        }
                    }
                    const chosen = pool.splice(pickIdx, 1)[0];
                    if (nameDiv && chosen) nameDiv.textContent = chosen.name || '';
                    if (isMaleCard) shuffledMales = pool; else shuffledFemales = pool;
                });
            } else {
                // 일반 랜덤 배치 모드
                let shuffledMales = [...maleStudents].sort(() => Math.random() - 0.5);
                let shuffledFemales = [...femaleStudents].sort(() => Math.random() - 0.5);
                
                console.log('섞인 남학생:', shuffledMales.map(s => s.name));
                console.log('섞인 여학생:', shuffledFemales.map(s => s.name));
                
                // 페어 컨테이너 우선 처리
                const seatsAreaEl = document.getElementById('seats-area')!;
                const pairContainers: HTMLElement[] = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = (card as HTMLElement).parentElement as HTMLElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (siblings && siblings.length === 2 && pairContainers.indexOf(parent) === -1) {
                        pairContainers.push(parent);
                    }
                });

                pairContainers.forEach(container => {
                    const cards = Array.from(container.querySelectorAll('.student-seat-card')) as HTMLElement[];
                    if (cards.length !== 2) return;
                    const [cardA, cardB] = cards;
                    const seatIdA = parseInt(cardA.getAttribute('data-seat-id') || '0', 10);
                    const seatIdB = parseInt(cardB.getAttribute('data-seat-id') || '0', 10);
                    const isMaleA = cardA.classList.contains('gender-m');
                    const isMaleB = cardB.classList.contains('gender-m');
                    const nameDivA = cardA.querySelector('.student-name') as HTMLElement;
                    const nameDivB = cardB.querySelector('.student-name') as HTMLElement;

                    const poolA = isMaleA ? shuffledMales : shuffledFemales;
                    const poolB = isMaleB ? shuffledMales : shuffledFemales;

                    // poolA가 비어있으면 스킵
                    if (poolA.length === 0) {
                        if (nameDivA) nameDivA.textContent = '';
                        if (nameDivB) nameDivB.textContent = '';
                        if (isMaleA) shuffledMales = poolA; else shuffledFemales = poolA;
                        if (isMaleB) shuffledMales = poolB; else shuffledFemales = poolB;
                        return;
                    }

                    let idxA = 0;
                    if (avoidPrevSeat) {
                        for (let i = 0; i < poolA.length; i++) {
                            const cand = poolA[i];
                            if (lastSeatByStudent[cand.name] !== seatIdA) { idxA = i; break; }
                        }
                    }
                    const chosenA = poolA.splice(idxA, 1)[0];
                    if (nameDivA) nameDivA.textContent = chosenA?.name || '';

                    // poolB가 비어있으면 다른 성별에서 시도 (고정 좌석 모드)
                    if (poolB.length === 0) {
                        // 성별에 맞는 학생이 없으면 다른 성별에서 가져오기
                        const alternativePoolB = isMaleB ? shuffledFemales : shuffledMales;
                        if (alternativePoolB.length > 0) {
                            // 대체 풀에서 학생 선택
                            const chosenB = alternativePoolB.splice(0, 1)[0];
                            if (nameDivB && chosenB) nameDivB.textContent = chosenB.name || '';
                            if (isMaleB) shuffledMales = alternativePoolB; else shuffledFemales = alternativePoolB;
                        } else {
                            if (nameDivB) nameDivB.textContent = '';
                        }
                        if (isMaleA) shuffledMales = poolA; else shuffledFemales = poolA;
                        return;
                    }

                    let idxB = -1;
                    for (let i = 0; i < poolB.length; i++) {
                        const cand = poolB[i];
                        const seatOk = !avoidPrevSeat || lastSeatByStudent[cand.name] !== seatIdB;
                        const partnerOk = !avoidPrevPartner || (
                            (chosenA && lastPartnerByStudent[chosenA.name] !== cand.name) && (lastPartnerByStudent[cand.name] !== (chosenA?.name || ''))
                        );
                        if (seatOk && partnerOk) { idxB = i; break; }
                    }
                    
                    // 조건을 만족하는 학생이 없으면 첫 번째 학생을 선택 (강제 배치)
                    if (idxB === -1) {
                        idxB = 0;
                    }
                    
                    const chosenB = poolB.splice(idxB, 1)[0];
                    if (nameDivB) nameDivB.textContent = chosenB?.name || '';

                    if (isMaleA) shuffledMales = poolA; else shuffledFemales = poolA;
                    if (isMaleB) shuffledMales = poolB; else shuffledFemales = poolB;
                });

                // 나머지 단일 카드 처리
                const singleCards: HTMLElement[] = [];
                Array.from(seatsAreaEl.querySelectorAll('.student-seat-card')).forEach(card => {
                    const parent = (card as HTMLElement).parentElement as HTMLElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (!siblings || siblings.length !== 2) {
                        singleCards.push(card as HTMLElement);
                    }
                });
                singleCards.forEach(cardElement => {
                    const seatIdStr = cardElement.getAttribute('data-seat-id');
                    if (!seatIdStr) return;
                    const seatId = parseInt(seatIdStr, 10);
                    const nameDiv = cardElement.querySelector('.student-name') as HTMLElement;
                    const isMaleCard = cardElement.classList.contains('gender-m');
                    // 남은 학생 중에서 성별에 맞는 학생 찾기, 없으면 다른 성별도 허용
                    let pool = isMaleCard ? shuffledMales : shuffledFemales;
                    if (pool.length === 0) {
                        // 성별에 맞는 학생이 없으면 다른 성별에서 가져오기
                        pool = isMaleCard ? shuffledFemales : shuffledMales;
                    }
                    if (pool.length === 0) { 
                        if (nameDiv) nameDiv.textContent = ''; 
                        return; 
                    }
                    let pickIdx = 0;
                    if (avoidPrevSeat) {
                        for (let i = 0; i < pool.length; i++) {
                            const cand = pool[i];
                            if (lastSeatByStudent[cand.name] !== seatId) { pickIdx = i; break; }
                        }
                    }
                    const chosen = pool.splice(pickIdx, 1)[0];
                    if (nameDiv && chosen) nameDiv.textContent = chosen.name || '';
                    if (isMaleCard) shuffledMales = pool; else shuffledFemales = pool;
                });
            }
            
            // 현재 배치 결과 저장 (이전 좌석/짝 정보)
            const newLastSeatByStudent: Record<string, number> = {};
            const newLastPartnerByStudent: Record<string, string> = {};
            const allCards = Array.from(document.querySelectorAll('#seats-area .student-seat-card')) as HTMLElement[];
            allCards.forEach(card => {
                const name = (card.querySelector('.student-name') as HTMLElement)?.textContent?.trim() || '';
                const seatId = parseInt(card.getAttribute('data-seat-id') || '0', 10);
                if (name) newLastSeatByStudent[name] = seatId;
                const parent = card.parentElement as HTMLElement | null;
                if (parent) {
                    const siblings = Array.from(parent.querySelectorAll('.student-seat-card')) as HTMLElement[];
                    if (siblings.length === 2) {
                        const other = siblings[0] === card ? siblings[1] : siblings[0];
                        const otherName = (other.querySelector('.student-name') as HTMLElement)?.textContent?.trim() || '';
                        if (name && otherName) {
                            newLastPartnerByStudent[name] = otherName;
                        }
                    }
                }
            });
            try {
                localStorage.setItem('lastSeatByStudent', JSON.stringify(newLastSeatByStudent));
                localStorage.setItem('lastPartnerByStudent', JSON.stringify(newLastPartnerByStudent));
            } catch {}
            this.outputModule.showSuccess('좌석 배치가 완료되었습니다!');
            
            // 자리 배치도 액션 버튼들 표시
            const actionButtons = document.getElementById('layout-action-buttons');
            if (actionButtons) {
                actionButtons.style.display = 'block';
            }
            
            // 배치 완료 후 화면을 맨 위로 스크롤 (스크롤 컨테이너와 윈도우 모두 시도)
            try {
                const resultContainer = document.querySelector('.result-container') as any;
                const mainContent = document.querySelector('.main-content') as any;
                const scrollTargets: any[] = [
                    window as any,
                    document.documentElement as any,
                    document.body as any,
                    resultContainer,
                    mainContent
                ].filter(Boolean);
                scrollTargets.forEach((t) => {
                    try {
                        if (typeof t.scrollTo === 'function') {
                            t.scrollTo({ top: 0, behavior: 'smooth' });
                        } else if (typeof t.scrollTop === 'number') {
                            t.scrollTop = 0;
                        }
                    } catch {}
                });
            } catch {}
            
        } catch (error) {
            console.error('좌석 배치 중 오류:', error);
            this.outputModule.showError('좌석 배치 중 오류가 발생했습니다.');
        }
    }


    /**
     * 남녀 짝꿍 배치 렌더링
     */
    private renderGenderPairs(maleStudents: Student[], femaleStudents: Student[], partitionCount: number): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

        // 남학생과 여학생을 무작위로 섞기
        const shuffledMales = [...maleStudents].sort(() => Math.random() - 0.5);
        const shuffledFemales = [...femaleStudents].sort(() => Math.random() - 0.5);

        const totalPairs = Math.min(shuffledMales.length, shuffledFemales.length);
        const rowsPerPartition = Math.ceil(totalPairs / partitionCount);

        let maleIndex = 0;
        let femaleIndex = 0;

        for (let row = 0; row < rowsPerPartition; row++) {
            for (let partition = 0; partition < partitionCount; partition++) {
                if (maleIndex >= shuffledMales.length || femaleIndex >= shuffledFemales.length) break;

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
    private renderSameGenderPairs(maleStudents: Student[], femaleStudents: Student[], partitionCount: number): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

        // 남학생과 여학생을 무작위로 섞기
        const shuffledMales = [...maleStudents].sort(() => Math.random() - 0.5);
        const shuffledFemales = [...femaleStudents].sort(() => Math.random() - 0.5);

        const allPairs: Array<{student1: Student, student2: Student | null}> = [];

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
    private createStudentNameCard(student: Student): HTMLDivElement {
        const card = document.createElement('div');
        card.className = 'student-seat-card';
        
        // 성별에 따라 클래스 추가
        if (student.gender === 'M') {
            card.classList.add('gender-m');
        } else {
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
    private handlePrintLayout(): void {
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

        } catch (error) {
            console.error('인쇄 중 오류:', error);
            this.outputModule.showError('인쇄 중 오류가 발생했습니다.');
        }
    }

    /**
     * 자리 배치도 저장 처리
     */
    private handleSaveLayout(): void {
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

        } catch (error) {
            console.error('저장 중 오류:', error);
            this.outputModule.showError('저장 중 오류가 발생했습니다.');
        }
    }

    /**
     * 자리 배치도 공유하기
     */
    private handleShareLayout(): void {
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

            // 간단한 공유 코드 생성
            const shareCode = this.generateShareCode(seatsAreaHtml, currentGridTemplateColumns, dateString);

            // 모달 창으로 공유하기 (방법 2)
            console.log('모달 창으로 공유하기 실행');
            this.showShareModal(shareCode);

        } catch (error) {
            console.error('공유 중 오류:', error);
            this.outputModule.showError('공유 중 오류가 발생했습니다.');
        }
    }

    /**
     * 간단한 공유 코드 생성
     */
    private generateShareCode(seatsHtml: string, gridColumns: string, dateString: string): string {
        // 학생 정보 추출
        const studentNames: string[] = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = seatsHtml;
        
        const nameElements = tempDiv.querySelectorAll('.student-name');
        nameElements.forEach(element => {
            const name = element.textContent?.trim();
            if (name && name !== '') {
                studentNames.push(name);
            }
        });

        // 간단한 공유 코드 생성
        const shareData = {
            type: 'seating-arrangement',
            date: dateString,
            students: studentNames,
            layout: gridColumns,
            version: '1.0'
        };

        // Base64로 인코딩하여 짧게 만들기
        const jsonString = JSON.stringify(shareData);
        const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
        
        // 공유 링크 생성 (실제로는 로컬 데이터이지만 사용자에게는 링크처럼 보이게)
        const shareCode = `자리배치도:${encodedData}`;
        
        return shareCode;
    }

    /**
     * 모달 창으로 자리 배치도 공유하기
     */
    private showShareModal(content: string): void {
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
                1. 아래 공유 코드를 복사하세요 (Ctrl+A → Ctrl+C)<br>
                2. 이메일, 메신저, 문서 등에 붙여넣기하세요<br>
                3. 받는 사람이 이 코드를 자리 배치 프로그램에 입력하면 동일한 배치를 볼 수 있습니다
            </p>
        `;

        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.cssText = `
            width: 100%;
            height: 120px;
            font-family: monospace;
            font-size: 14px;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 15px;
            resize: none;
            background: #f8f9fa;
            font-weight: bold;
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
            } catch (error) {
                console.warn('모달 닫기 중 오류 (무시됨):', error);
            }
        };

        // ESC 키로 모달 닫기
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        const copyButton = document.createElement('button');
        copyButton.textContent = '📋 전체 선택';
        copyButton.className = 'primary-btn';
        copyButton.style.marginRight = '10px';
        copyButton.onclick = () => {
            textarea.select();
            textarea.setSelectionRange(0, 99999);
            // 복사 완료 메시지
            setTimeout(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = '✅ 복사됨!';
                copyButton.style.background = '#28a745';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.style.background = '';
                }, 2000);
            }, 100);
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
}

