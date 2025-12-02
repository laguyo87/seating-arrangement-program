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
// import { SeatType } from '../models/Seat.js'; // 향후 사용 예정
import { Student } from '../models/Student.js';
import { Seat } from '../models/Seat.js';
import { LayoutRenderer, LayoutRendererDependencies } from '../managers/LayoutRenderer.js';
import { AnimationManager, AnimationManagerDependencies } from '../managers/AnimationManager.js';
import { StorageManager, StorageManagerDependencies } from '../managers/StorageManager.js';
import { CSVFileHandler, CSVFileHandlerDependencies } from '../managers/CSVFileHandler.js';
import { PrintExportManager, PrintExportManagerDependencies } from '../managers/PrintExportManager.js';
import { UIManager, UIManagerDependencies } from '../managers/UIManager.js';
import { StudentTableManager, StudentTableManagerDependencies } from '../managers/StudentTableManager.js';
import { logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { ErrorCode } from '../types/errors.js';
import { InputValidator, ValidationRules } from '../utils/inputValidator.js';
import { KeyboardNavigation } from '../utils/keyboardNavigation.js';
import { KeyboardDragDropManager } from '../managers/KeyboardDragDropManager.js';
import { ClassManager, ClassManagerDependencies } from '../managers/ClassManager.js';
import { FirebaseStorageManager, FirebaseStorageManagerDependencies } from '../managers/FirebaseStorageManager.js';
import { LoginPageModule, LoginPageModuleDependencies } from '../modules/LoginPageModule.js';
import { SignUpPageModule, SignUpPageModuleDependencies } from '../modules/SignUpPageModule.js';
import { VisitorCounterModule, VisitorCounterModuleDependencies } from '../modules/VisitorCounterModule.js';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

/**
 * 히스토리 데이터 타입
 */
interface HistoryData {
    seats?: Seat[];
    students?: Student[];
    layout?: string;
    [key: string]: unknown; // 확장 가능한 구조
}

/**
 * 히스토리 항목 타입
 */
interface HistoryItem {
    type: string;
    data: HistoryData;
}

/**
 * 레이아웃 결과 데이터 타입
 */
interface LayoutResultData {
    seats?: Seat[];
    students?: Student[];
    [key: string]: unknown;
}

/**
 * 좌석 이력 항목 타입
 */
interface SeatHistoryItem {
    id: string;
    date: string;
    layout: Array<{seatId: number, studentName: string, gender: 'M' | 'F'}>;
    pairInfo?: Array<{student1: string, student2: string}>;
    timestamp: number;
}

/**
 * 공유 학생 데이터 타입 (압축 형식 또는 객체 형식)
 */
type SharedStudentData = [string, 'M' | 'F'] | {name: string, gender: 'M' | 'F'};

/**
 * 공유 정보 타입
 */
interface ShareInfo {
    t?: string;
    type?: string;
    s?: SharedStudentData[];
    students?: SharedStudentData[];
    l?: string;
    layout?: string;
    [key: string]: unknown; // 확장 가능한 구조
}


/**
 * 옵션 설정 타입
 */
interface OptionsData {
    layoutType?: string;
    pairMode?: string;
    groupSize?: string;
    groupGenderMix?: boolean;
    seatCount?: number;
    [key: string]: unknown; // 확장 가능한 구조
}

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
    private layoutRenderer!: LayoutRenderer;
    private animationManager!: AnimationManager;
    private storageManager!: StorageManager;
    private csvFileHandler!: CSVFileHandler;
    private printExportManager!: PrintExportManager;
    private uiManager!: UIManager;
    private studentTableManager!: StudentTableManager;
    private inputValidator!: InputValidator;
    private keyboardDragDropManager!: KeyboardDragDropManager;
    private classManager!: ClassManager;
    private firebaseStorageManager!: FirebaseStorageManager;
    private loginPageModule!: LoginPageModule;
    private signUpPageModule!: SignUpPageModule;
    private visitorCounterModule!: VisitorCounterModule;
    
    private students: Student[] = [];
    private seats: Seat[] = [];
    private isInitialized: boolean = false;
    private fixedSeatIds: Set<number> = new Set(); // 고정 좌석 ID 목록
    private nextSeatId: number = 1; // 좌석 카드 고유 ID 생성기
    private dragSourceCard: HTMLElement | null = null; // 드래그 시작 카드 참조
    private dragOverIndicator: HTMLElement | null = null; // 드롭 위치 인디케이터
    private touchStartCard: HTMLElement | null = null; // 터치 시작 카드 참조 (모바일)
    private touchStartPosition: { x: number, y: number } | null = null; // 터치 시작 위치
    private isSyncing: boolean = false; // 동기화 중 플래그 (무한 루프 방지)
    private layoutHistory: HistoryItem[] = []; // 통합 히스토리 (모든 액션 추적)
    private historyIndex: number = -1; // 현재 히스토리 인덱스
    private isReadOnlyMode: boolean = false; // 읽기 전용 모드 (이력에서 불러온 경우)
    
    // 메모리 누수 방지를 위한 추적 변수
    private eventListeners: Array<{element: EventTarget, event: string, handler: EventListener | ((e: Event) => void)}> = [];
    private timers: Set<number> = new Set(); // setTimeout ID 추적

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
            
            // LayoutRenderer 초기화
            const layoutRendererDeps: LayoutRendererDependencies = {
                getStudents: () => this.students,
                getSeats: () => this.seats,
                getNextSeatId: () => this.nextSeatId,
                setNextSeatId: (id: number) => { this.nextSeatId = id; },
                incrementNextSeatId: () => { return this.nextSeatId++; },
                getFixedSeatIds: () => this.fixedSeatIds,
                outputModule: this.outputModule,
                isDevelopmentMode: () => this.isDevelopmentMode(),
                addEventListenerSafe: (element, event, handler, options) => 
                    this.addEventListenerSafe(element, event, handler, options),
                setupFixedSeatClickHandler: (card, seatId) => 
                    this.setupFixedSeatClickHandler(card, seatId),
                enableSeatSwapDragAndDrop: () => this.enableSeatSwapDragAndDrop(),
                setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
                saveLayoutToHistory: () => this.saveLayoutToHistory()
            };
            this.layoutRenderer = new LayoutRenderer(layoutRendererDeps);
            
            // AnimationManager 초기화
            const animationManagerDeps: AnimationManagerDependencies = {
                setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
                isDevelopmentMode: () => this.isDevelopmentMode()
            };
            this.animationManager = new AnimationManager(animationManagerDeps);
            
            // StorageManager 초기화
            const storageManagerDeps: StorageManagerDependencies = {
                outputModule: this.outputModule,
                isDevelopmentMode: () => this.isDevelopmentMode()
            };
            this.storageManager = new StorageManager(storageManagerDeps);
            
            // CSVFileHandler 초기화
            const csvFileHandlerDeps: CSVFileHandlerDependencies = {
                outputModule: this.outputModule,
                isDevelopmentMode: () => this.isDevelopmentMode(),
                setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
                addEventListenerSafe: (element, event, handler, options) => 
                    this.addEventListenerSafe(element, event, handler, options),
                handleCreateStudentTable: (count) => this.studentTableManager.createStudentTable(count),
                handleLoadClassNames: () => this.studentTableManager.loadClassNames(),
                handleDeleteStudentRow: (row) => this.handleDeleteStudentRow(row),
                updateStudentTableStats: () => this.updateStudentTableStats(),
                getFixedSeatIds: () => this.fixedSeatIds,
                getStudents: () => this.students,
                setStudents: (students) => { 
                    this.students = students.map((s, index) => {
                        const student: Student = {
                            id: index + 1,
                            name: s.name,
                            gender: s.gender,
                            fixedSeatId: s.fixedSeatId
                        };
                        return student;
                    });
                },
                syncSidebarToTable: (maleCount, femaleCount) => this.syncSidebarToTable(maleCount, femaleCount),
                moveToCell: (tbody, currentRow, columnName, direction) => this.moveToCell(tbody, currentRow, columnName, direction)
            };
            this.csvFileHandler = new CSVFileHandler(csvFileHandlerDeps);
            
            // PrintExportManager 초기화
            const printExportManagerDeps: PrintExportManagerDependencies = {
                outputModule: this.outputModule,
                isDevelopmentMode: () => this.isDevelopmentMode(),
                setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
                getSeats: () => this.seats
            };
            this.printExportManager = new PrintExportManager(printExportManagerDeps);
            
            // UIManager 초기화
            const uiManagerDeps: UIManagerDependencies = {
                outputModule: this.outputModule,
                isDevelopmentMode: () => this.isDevelopmentMode(),
                setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
                addEventListenerSafe: (element, event, handler, options) => 
                    this.addEventListenerSafe(element, event, handler, options),
                storageManager: this.storageManager,
                getStudents: () => this.students,
                setStudents: (students) => { this.students = students; },
                getSeats: () => this.seats,
                setSeats: (seats) => { this.seats = seats; },
                validateAndFixStudentInput: (input, inputType) => this.validateAndFixStudentInput(input, inputType),
                renderExampleCards: () => this.renderExampleCards(),
                getSeatHistory: () => this.getSeatHistory(),
                deleteHistoryItem: (historyId) => this.deleteHistoryItem(historyId),
                loadHistoryItem: (historyId) => this.loadHistoryItem(historyId)
            };
            this.uiManager = new UIManager(uiManagerDeps);
            
            // StudentTableManager 초기화
            const studentTableManagerDeps: StudentTableManagerDependencies = {
                outputModule: this.outputModule,
                isDevelopmentMode: () => this.isDevelopmentMode(),
                setTimeoutSafe: (callback, delay) => this.setTimeoutSafe(callback, delay),
                addEventListenerSafe: (element, event, handler, options) => 
                    this.addEventListenerSafe(element, event, handler, options),
                storageManager: this.storageManager,
                csvFileHandler: this.csvFileHandler,
                uiManager: this.uiManager,
                getFixedSeatIds: () => this.fixedSeatIds,
                getStudents: () => this.students,
                setStudents: (students) => { this.students = students; },
                handleDeleteStudentRow: (row) => this.handleDeleteStudentRow(row),
                moveToCell: (tbody, currentRow, columnName, direction) => this.moveToCell(tbody, currentRow, columnName, direction),
                updateRowNumbers: () => this.updateRowNumbers(),
                syncSidebarToTable: (maleCount, femaleCount) => this.syncSidebarToTable(maleCount, femaleCount),
                updatePreviewForGenderCounts: () => this.updatePreviewForGenderCounts()
            };
            this.studentTableManager = new StudentTableManager(studentTableManagerDeps);
            
            // InputValidator 초기화
            this.inputValidator = new InputValidator();
            
            // FirebaseStorageManager 초기화
            const firebaseStorageManagerDeps: FirebaseStorageManagerDependencies = {
                outputModule: this.outputModule,
                isDevelopmentMode: () => this.isDevelopmentMode()
            };
            this.firebaseStorageManager = new FirebaseStorageManager(firebaseStorageManagerDeps);
            
            // ClassManager 초기화
            const classManagerDeps: ClassManagerDependencies = {
                storageManager: this.storageManager,
                outputModule: this.outputModule,
                getCurrentSeats: () => this.seats,
                getCurrentStudents: () => this.students,
                setSeats: (seats) => { this.seats = seats; },
                setStudents: (students) => { this.students = students; },
                renderLayout: () => this.renderFinalLayout(),
                firebaseStorageManager: this.firebaseStorageManager
            };
            this.classManager = new ClassManager(classManagerDeps);
            
            // SignUpPageModule 초기화 (먼저 초기화하여 LoginPageModule에서 참조 가능하도록)
            const signUpPageModuleDeps: SignUpPageModuleDependencies = {
                firebaseStorageManager: this.firebaseStorageManager,
                outputModule: this.outputModule,
                onSignUpSuccess: () => {
                    this.updateFirebaseStatus();
                },
                onClose: () => {
                    // 회원가입 페이지 닫힘 처리
                },
                onBackToLogin: () => {
                    this.loginPageModule.show();
                }
            };
            this.signUpPageModule = new SignUpPageModule(signUpPageModuleDeps);
            
            // LoginPageModule 초기화
            const loginPageModuleDeps: LoginPageModuleDependencies = {
                firebaseStorageManager: this.firebaseStorageManager,
                outputModule: this.outputModule,
                onLoginSuccess: () => {
                    this.updateFirebaseStatus();
                },
                onClose: () => {
                    // 로그인 페이지 닫힘 처리
                },
                onShowSignUp: () => {
                    this.signUpPageModule.show();
                }
            };
            this.loginPageModule = new LoginPageModule(loginPageModuleDeps);
            
            // VisitorCounterModule 초기화
            const visitorCounterModuleDeps: VisitorCounterModuleDependencies = {
                firebaseStorageManager: this.firebaseStorageManager
            };
            this.visitorCounterModule = new VisitorCounterModule(visitorCounterModuleDeps);
            this.visitorCounterModule.init();
            
            // 입력 필드 검증 설정
            this.setupInputValidation();
            
            // 이벤트 리스너 설정
            this.initializeEventListeners();
            
            // 이력 드롭다운 초기화
            this.uiManager.initializeHistoryDropdown();
            
            // 반 관리 초기화
            this.initializeClassManagement();
            
            // Firebase 리다이렉트 로그인 결과 확인
            this.firebaseStorageManager.checkRedirectResult().then((success) => {
                if (success) {
                    this.updateFirebaseStatus();
                }
            });
            
            // Firebase 상태 업데이트
            this.setTimeoutSafe(() => {
                this.updateFirebaseStatus();
            }, 1000);
            
            // 모바일 반응형 초기화
            this.initializeMobileResponsive();
            
            // 키보드 네비게이션 초기화
            this.initializeKeyboardNavigation();
            
            // 저장된 옵션 설정 불러오기
            this.storageManager.loadOptions((callback, delay) => this.setTimeoutSafe(callback, delay));
            
            // 초기 상태에서도 4단계 비활성화 체크 및 분단 개수 제한 적용
            const checkedLayoutType = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
            if (checkedLayoutType) {
                if (checkedLayoutType.value === 'single-uniform') {
                    this.toggleCustomMode1(true);
                    this.updatePartitionLimitForSingleUniform();
                } else if (checkedLayoutType.value === 'pair-uniform') {
                    this.updatePartitionLimitForPair();
                }
            }
            
            // 초기 상태에서 고정 좌석 모드 확인
            const checkedFixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
            if (checkedFixedRandomMode) {
                this.enableFixedSeatMode();
            }
            
            this.isInitialized = true;
            
            // URL 파라미터에서 공유 데이터 확인
            const urlParams = new URLSearchParams(window.location.search);
            // 뷰어 모드 파라미터 확인 (?v=)
            const viewParam = urlParams.get('v');
            // 하위 호환성: 'share' 또는 's' 파라미터 지원
            const shareParam = urlParams.get('s') || urlParams.get('share');
            
            if (viewParam) {
                // 뷰어 모드: 자리 배치도만 표시
                this.enableViewerMode(viewParam);
            } else if (shareParam) {
                // 공유된 배치 데이터 로드 (기존 방식)
                this.loadSharedLayout(shareParam);
            } else {
                // 저장된 데이터 불러오기
                this.loadSavedLayoutResult();
                
                
                
                if (this.seats.length > 0 && this.students.length > 0) {
                    
                    this.outputModule.showInfo('저장된 배치 결과가 로드되었습니다.');
                    // 저장된 배치 결과 렌더링
                    this.renderFinalLayout();
                } else {
                    
                    // 초기 예시 레이아웃 표시 (24명, 5분단)
                    this.renderInitialExampleLayout();
                    
                    // 초기값으로 미리보기 자동 실행
                    this.setTimeoutSafe(() => {
                        this.updatePreviewForGenderCounts();
                    }, 100);
                }
            }
        } catch (error) {
            ErrorHandler.handleAndShow(
                error,
                ErrorCode.INITIALIZATION_FAILED,
                (message) => this.outputModule.showError(message),
                { method: 'initialize' }
            );
        }
    }

    /**
     * 초기화 시 이력 드롭다운 업데이트
     */

    /**
     * 앱 초기 상태로 되돌리기
     */
    private resetApp(): void {
        try {
            // 읽기 전용 모드 해제
            this.disableReadOnlyMode();
            
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
            if (partitionInput) partitionInput.value = '5';

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

            // card-layout-container 숨김 (초기화면으로 복귀)
            const cardContainer = document.getElementById('card-layout-container');
            if (cardContainer) {
                cardContainer.style.display = 'none';
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
            ErrorHandler.handleAndShow(
                error,
                ErrorCode.RESET_FAILED,
                (message) => this.outputModule.showError(message),
                { method: 'resetApp' }
            );
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
    /**
     * 입력 필드 검증 설정
     */
    private setupInputValidation(): void {
        // 남학생 수 입력 필드 검증
        const maleInput = document.getElementById('male-students') as HTMLInputElement;
        if (maleInput) {
            this.inputValidator.setupValidation(maleInput, {
                rules: [
                    ValidationRules.numeric('남학생 수'),
                    ValidationRules.range(0, 100, '남학생 수')
                ],
                showMessage: true,
                showIcon: true,
                highlightBorder: true
            });
        }

        // 여학생 수 입력 필드 검증
        const femaleInput = document.getElementById('female-students') as HTMLInputElement;
        if (femaleInput) {
            this.inputValidator.setupValidation(femaleInput, {
                rules: [
                    ValidationRules.numeric('여학생 수'),
                    ValidationRules.range(0, 100, '여학생 수')
                ],
                showMessage: true,
                showIcon: true,
                highlightBorder: true
            });
        }

        // 분단 수 입력 필드 검증
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (partitionInput) {
            this.inputValidator.setupValidation(partitionInput, {
                rules: [
                    ValidationRules.numeric('분단 수'),
                    ValidationRules.range(1, 10, '분단 수')
                ],
                showMessage: true,
                showIcon: true,
                highlightBorder: true
            });
        }
    }

    private initializeEventListeners(): void {
        // 라디오 버튼 변경 이벤트 직접 리스닝
        const layoutInputs = document.querySelectorAll('input[name="layout-type"]');
        layoutInputs.forEach(input => {
            this.addEventListenerSafe(input, 'change', (e) => {
                const target = e.target as HTMLInputElement;
                const layoutType = target.value;
                
                // '1명 한 줄로 배치' 선택 시 4단계 비활성화 및 분단 개수 제한
                if (layoutType === 'single-uniform') {
                    this.toggleSingleSubmenu(true);
                    this.toggleCustomMode1(true);
                    this.updatePartitionLimitForSingleUniform();
                } else {
                    this.toggleSingleSubmenu(false);
                    this.toggleCustomMode1(false);
                }
                
                // '2명씩 짝꿍 배치' 선택 시 서브 메뉴 표시 및 분단 개수 제한
                if (layoutType === 'pair-uniform') {
                    this.togglePairSubmenu(true);
                    this.updatePartitionLimitForPair();
                } else {
                    this.togglePairSubmenu(false);
                }
                
                // '모둠 배치' 선택 시 서브 메뉴 표시 및 분단 개수 제한
                if (layoutType === 'group') {
                    this.toggleGroupSubmenu(true);
                    this.toggleGroupGenderMixOption(true);
                    // 모둠 배치가 선택되면 현재 선택된 group-size에 따라 분단 개수 제한 적용
                    const selectedGroupSize = document.querySelector('input[name="group-size"]:checked') as HTMLInputElement;
                    if (selectedGroupSize) {
                        this.updatePartitionLimitForGroup(selectedGroupSize.value);
                    } else {
                        // 아직 선택되지 않았으면 제한 해제
                        this.resetPartitionLimit();
                    }
                } else {
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
            this.addEventListenerSafe(input, 'change', () => {
                // 배치 형태 변경 시 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        });
        
        // '남녀 순서 바꾸기' 체크박스 이벤트 리스너
        const reverseGenderOrderCheckbox = document.getElementById('reverse-gender-order');
        if (reverseGenderOrderCheckbox) {
            this.addEventListenerSafe(reverseGenderOrderCheckbox, 'change', () => {
                // 체크박스 변경 시 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        }

        // 모둠 크기 라디오 버튼 변경 이벤트
        const groupSizeInputs = document.querySelectorAll('input[name="group-size"]');
        groupSizeInputs.forEach(input => {
            this.addEventListenerSafe(input, 'change', (e) => {
                const target = e.target as HTMLInputElement;
                const groupSize = target.value;
                
                // 분단 개수 제한 적용
                this.updatePartitionLimitForGroup(groupSize);
                // 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        });
        
        // 짝꿍 모드 라디오 버튼 변경 이벤트
        const pairModeInputs = document.querySelectorAll('input[name="pair-mode"]');
        pairModeInputs.forEach(input => {
            this.addEventListenerSafe(input, 'change', (e) => {
                // 짝꿍 모드 변경됨
                // 분단 개수 제한 적용 (짝꿍 배치 선택 시)
                const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
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
            this.addEventListenerSafe(genderMixCheckbox, 'change', () => {
                // 남녀 섞기 옵션 변경됨
                // 미리보기 업데이트
                this.updatePreviewForGenderCounts();
            });
        }

        // 인원수 설정 이벤트
        this.addEventListenerSafe(document, 'studentCountSet', (e: Event) => {
            const customEvent = e as CustomEvent;
            const count = customEvent.detail.count;
            this.studentTableManager.createStudentTable(count);
            // 미리보기 업데이트
            this.updatePreviewForStudentCount(count);
        });

        // 남학생 수 입력 필드 이벤트
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        if (maleCountInput) {
            // 숫자만 입력되도록 제한
            this.addEventListenerSafe(maleCountInput, 'input', (e: Event) => {
                const input = e.target as HTMLInputElement;
                // 숫자가 아닌 문자 제거
                const cleanedValue = input.value.replace(/[^0-9]/g, '');
                if (input.value !== cleanedValue) {
                    input.value = cleanedValue;
                }
                this.updatePreviewForGenderCounts();
                this.updateStudentTableStats(); // 통계 업데이트
            });
            
            this.addEventListenerSafe(maleCountInput, 'keydown', (e: Event) => {
                const ke = e as KeyboardEvent;
                if (ke.key === 'Enter') {
                    this.updatePreviewForGenderCounts();
                }
                // 숫자, 백스페이스, 삭제, 화살표 키 등만 허용
                if (!/[0-9]/.test(ke.key) && 
                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'].includes(ke.key) &&
                    !(ke.ctrlKey || ke.metaKey || ke.altKey)) {
                    ke.preventDefault();
                }
            });

            this.addEventListenerSafe(maleCountInput, 'change', () => {
                this.validateAndFixStudentInput(maleCountInput, 'male');
                this.updatePreviewForGenderCounts();
            });
        }

        // 좌석 카드 드래그&드롭(스왑) 활성화
        this.enableSeatSwapDragAndDrop();

        // 옵션 설정 저장 버튼
        const saveOptionsBtn = document.getElementById('save-options');
        if (saveOptionsBtn) {
            this.addEventListenerSafe(saveOptionsBtn, 'click', () => {
                this.storageManager.saveOptions();
            });
        }

        // 초기화 버튼
        const resetBtn = document.getElementById('reset-app');
        if (resetBtn) {
            this.addEventListenerSafe(resetBtn, 'click', () => {
                this.resetApp();
            });
        }

        // 여학생 수 입력 필드 이벤트
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        if (femaleCountInput) {
            // 숫자만 입력되도록 제한
            this.addEventListenerSafe(femaleCountInput, 'input', (e: Event) => {
                const input = e.target as HTMLInputElement;
                // 숫자가 아닌 문자 제거
                const cleanedValue = input.value.replace(/[^0-9]/g, '');
                if (input.value !== cleanedValue) {
                    input.value = cleanedValue;
                }
                this.updatePreviewForGenderCounts();
                this.updateStudentTableStats(); // 통계 업데이트
            });
            
            this.addEventListenerSafe(femaleCountInput, 'keydown', (e: Event) => {
                const ke = e as KeyboardEvent;
                // 숫자, 백스페이스, 삭제, 화살표 키 등만 허용
                if (!/[0-9]/.test(ke.key) && 
                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'].includes(ke.key) &&
                    !(ke.ctrlKey || ke.metaKey || ke.altKey)) {
                    ke.preventDefault();
                }
            });
            
            this.addEventListenerSafe(femaleCountInput, 'change', () => {
                this.validateAndFixStudentInput(femaleCountInput, 'female');
                this.updatePreviewForGenderCounts();
            });
        }

        // 학생 정보 입력 테이블 생성 버튼
        const createTableBtn = document.getElementById('create-student-table');
        if (createTableBtn) {
            this.addEventListenerSafe(createTableBtn, 'click', () => {
                this.studentTableManager.createStudentTable();
            });
        }
        
        // 분단 수 입력 필드에 엔터 키 이벤트 추가
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (partitionInput) {
            this.addEventListenerSafe(partitionInput, 'keydown', (e: Event) => {
                const ke = e as KeyboardEvent;
                if (ke.key === 'Enter') {
                    // 분단 수가 입력되면 자동으로 저장되도록 (현재는 change 이벤트만 사용)
                    partitionInput.blur(); // 포커스 제거
                }
            });
            
            // 남학생/여학생 수 입력 필드에 검증 이벤트 추가 (중복 제거 - 이미 위에서 처리됨)
            
            // 분단 수 변경 시 미리보기 업데이트
            this.addEventListenerSafe(partitionInput, 'change', () => {
                // 입력 검증
                this.validateAndFixPartitionInput(partitionInput);
                // 현재 학생 수 가져오기
                this.updatePreviewForGenderCounts();
            });
            this.addEventListenerSafe(partitionInput, 'input', () => {
                // 실시간 업데이트
                this.updatePreviewForGenderCounts();
            });
        }



        // 결과 내보내기 버튼
        const exportBtn = document.getElementById('export-result');
        if (exportBtn) {
            this.addEventListenerSafe(exportBtn, 'click', () => this.handleExport());
        }

        // 고정 좌석 모드 버튼
        const fixedModeBtn = document.getElementById('enable-fixed-seats');
        if (fixedModeBtn) {
            this.addEventListenerSafe(fixedModeBtn, 'click', () => {
                this.outputModule.showInfo('고정 좌석 모드: 캔버스의 좌석을 더블 클릭하여 고정/해제할 수 있습니다.');
            });
        }

        // 나머지 랜덤 배치 버튼
        const randomizeBtn = document.getElementById('randomize-remaining');
        if (randomizeBtn) {
            this.addEventListenerSafe(randomizeBtn, 'click', () => this.handleRandomizeRemaining());
        }


        // 양식 파일 다운로드 버튼
        const downloadTemplateBtn = document.getElementById('download-template');
        if (downloadTemplateBtn) {
            this.addEventListenerSafe(downloadTemplateBtn, 'click', () => this.csvFileHandler.downloadTemplateFile());
        }

        // 엑셀 파일 업로드 버튼 (눌러서 파일 선택 트리거)
        const uploadFileBtn = document.getElementById('upload-file');
        if (uploadFileBtn) {
            this.addEventListenerSafe(uploadFileBtn, 'click', () => {
                const fileInput = document.getElementById('upload-file-input') as HTMLInputElement;
                if (fileInput) {
                    fileInput.click();
                }
            });
        }

        // 엑셀 파일 업로드 입력 필드
        const uploadFileInput = document.getElementById('upload-file-input');
        if (uploadFileInput) {
            this.addEventListenerSafe(uploadFileInput, 'change', (e) => this.csvFileHandler.handleFileUpload(e));
        }

        // 라디오 버튼 이벤트 리스너
        this.initializeRadioListeners();
        
        // 이벤트 위임을 사용하여 동적으로 생성되는 버튼들 처리
        this.addEventListenerSafe(document, 'click', (e) => {
            const target = e.target as HTMLElement;
            
            // 자리 배치하기 버튼 클릭 (버튼 내부 텍스트 클릭도 처리)
            const arrangeBtn = target.id === 'arrange-seats' ? target : target.closest('#arrange-seats');
            if (arrangeBtn) {
                e.preventDefault();
                this.handleArrangeSeats();
                return;
            }
            
            // 자리 확정 버튼 클릭 (버튼 내부 텍스트 클릭도 처리)
            const confirmBtn = target.id === 'confirm-seats' ? target : target.closest('#confirm-seats');
            if (confirmBtn) {
                e.preventDefault();
                this.handleConfirmSeats();
                return;
            }
            
            // 확정된 자리 이력 드롭다운 버튼 클릭
            const dropdown = document.getElementById('history-dropdown-content');
            const dropdownContainer = document.getElementById('history-dropdown');
            
            if (target.id === 'history-dropdown-btn' || target.closest('#history-dropdown-btn')) {
                // 드롭다운 버튼 클릭 시 토글
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            } else if (dropdown && dropdownContainer) {
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
                this.studentTableManager.addStudentRow();
            }
            
            // 저장 버튼 클릭
            if (target.id === 'save-student-table-btn') {
                this.handleSaveStudentTable();
            }
            
            // 인쇄하기 버튼 클릭
            if (target.id === 'print-layout') {
                this.printExportManager.printLayout();
            }
            
            // 교탁용 인쇄하기 버튼 클릭
            if (target.id === 'print-layout-teacher') {
                this.printExportManager.printLayoutForTeacher();
            }
            
            // 되돌리기 버튼 클릭
            if (target.id === 'undo-layout') {
                this.handleUndoLayout();
            }
            
            // 다시 실행하기 버튼 클릭
            if (target.id === 'redo-layout') {
                this.handleRedoLayout();
            }
            
            // 저장하기 버튼 클릭
            if (target.id === 'save-layout') {
                this.handleSaveLayout();
            }
            
            // 사용설명서 버튼 클릭
            if (target.id === 'user-manual-btn') {
                this.showUserManual();
            }
            
            // 반 추가 버튼 클릭
            if (target.id === 'add-class-btn') {
                this.handleAddClass();
            }
            
            // 반 삭제 버튼 클릭
            if (target.id === 'delete-class-btn') {
                this.handleDeleteClass();
            }
            
            // 자리 배치도 저장 버튼 클릭
            if (target.id === 'save-layout-btn') {
                this.handleSaveClassLayout();
            }
            
            // 사이드바 토글 버튼 클릭
            if (target.id === 'sidebar-toggle-btn' || target.closest('#sidebar-toggle-btn')) {
                this.toggleSidebar();
            }
        });
        
        // 키보드 단축키: Ctrl+Z / Cmd+Z (되돌리기), Ctrl+Y / Cmd+Y (다시 실행하기)
        this.addEventListenerSafe(document, 'keydown', (e) => {
            const ke = e as KeyboardEvent;
            
            // 입력 필드에 포커스가 있으면 기본 동작 허용 (텍스트 입력 되돌리기/다시 실행하기)
                const activeElement = document.activeElement as HTMLElement;
            const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    (activeElement.isContentEditable === true)
            );
            
            // Ctrl+Z / Cmd+Z (되돌리기)
            if ((ke.ctrlKey || ke.metaKey) && ke.key === 'z' && !ke.shiftKey) {
                if (isInputFocused) {
                    return; // 기본 동작 허용
                }
                
                e.preventDefault();
                this.handleUndoLayout();
            }
            
            // Ctrl+Y / Cmd+Y (다시 실행하기)
            if ((ke.ctrlKey || ke.metaKey) && ke.key === 'y' && !ke.shiftKey) {
                if (isInputFocused) {
                    return; // 기본 동작 허용
                }
                
                e.preventDefault();
                this.handleRedoLayout();
            }
            
            // Ctrl+Shift+Z / Cmd+Shift+Z (다시 실행하기 - 대체 단축키)
            if ((ke.ctrlKey || ke.metaKey) && ke.key === 'z' && ke.shiftKey) {
                if (isInputFocused) {
                    return; // 기본 동작 허용
                }
                
                e.preventDefault();
                this.handleRedoLayout();
            }
        });
    }

    /**
     * 라디오 버튼 이벤트 리스너 초기화
     */
    private initializeRadioListeners(): void {
        // 배치 유형 라디오 버튼
        const layoutRadios = document.querySelectorAll('input[name="layout-type"]');
        // layout-type 변경 이벤트는 initializeEventListeners에서 처리하므로 여기서는 제거

        // 고정 좌석 모드 라디오 버튼
        const customModeRadios = document.querySelectorAll('input[name="custom-mode-2"]');
        customModeRadios.forEach(radio => {
            this.addEventListenerSafe(radio, 'change', (e) => {
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
        
        
        // 고정 좌석 모드 도움말 표시
        const fixedSeatHelp = document.getElementById('fixed-seat-help');
        if (fixedSeatHelp) {
            fixedSeatHelp.style.display = 'block';
        }
        
        // 좌석 카드에 클릭 이벤트 추가 (이벤트 위임)
        const seatsArea = document.getElementById('seats-area');
        if (seatsArea) {
            seatsArea.style.cursor = 'pointer';
            this.addEventListenerSafe(seatsArea, 'click', this.handleSeatCardClick as (e: Event) => void);
            
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

        // 테이블의 고정 좌석 드롭다운 업데이트
        this.studentTableManager.updateFixedSeatDropdowns();
    }

    /**
     * 최종 자리 배치도 렌더링
     */
    private renderFinalLayout(): void {
        // LayoutRenderer로 위임
        this.layoutRenderer.renderFinalLayout(this.seats);
    }

    /**
     * 초기 예시 레이아웃 렌더링
     */
    private renderInitialExampleLayout(): void {
        
        
        // 카드 컨테이너 표시
        const cardContainer = document.getElementById('card-layout-container');
        if (!cardContainer) {
            ErrorHandler.logOnly(
                new Error('카드 컨테이너를 찾을 수 없습니다.'),
                ErrorCode.LAYOUT_NOT_FOUND,
                { method: 'renderInitialExampleLayout' }
            );
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
        
        // 대용량 데이터 처리: 학생 수가 많으면 로딩 표시
        const maleCount = parseInt((document.getElementById('male-students') as HTMLInputElement)?.value || '0', 10);
        const femaleCount = parseInt((document.getElementById('female-students') as HTMLInputElement)?.value || '0', 10);
        const totalCount = maleCount + femaleCount;
        
        // 대용량 데이터 처리: DocumentFragment 사용 및 배치 렌더링
        const useBatchRendering = totalCount > 100;
        if (useBatchRendering) {
            this.outputModule.showInfo('대량의 좌석을 렌더링하는 중입니다. 잠시만 기다려주세요...');
        }
        
        // DocumentFragment를 사용하여 DOM 조작 최소화
        const fragment = useBatchRendering ? document.createDocumentFragment() : null;

        // 선택된 배치 형태 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
        const layoutType = layoutTypeInput?.value;
        const groupSizeInput = document.querySelector('input[name="group-size"]:checked') as HTMLInputElement;
        const groupSize = groupSizeInput ? groupSizeInput.value : '';
        
        // 분단 수 가져오기
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        const partitionCount = partitionInput ? parseInt(partitionInput.value || '1', 10) : 1;
        
        // 모둠 배치인 경우
        
        if (layoutType === 'group' && (groupSize === 'group-3' || groupSize === 'group-4' || groupSize === 'group-5' || groupSize === 'group-6')) {
            
            const groupSizeNumber = groupSize === 'group-3' ? 3 : groupSize === 'group-4' ? 4 : groupSize === 'group-5' ? 5 : 6;
            // 예시 학생 데이터 생성 (this.students가 비어있을 경우)
            if (this.students.length === 0) {
                const maleCount = parseInt((document.getElementById('male-students') as HTMLInputElement)?.value || '0', 10);
                const femaleCount = parseInt((document.getElementById('female-students') as HTMLInputElement)?.value || '0', 10);
                const totalCount = maleCount + femaleCount;
                
                
                
                // 임시 학생 데이터 생성
                const tempStudents: Student[] = [];
                for (let i = 0; i < totalCount; i++) {
                    const gender = i < maleCount ? 'M' : 'F';
                    tempStudents.push({
                        id: i + 1,
                        name: gender === 'M' ? `남학생${i + 1}` : `여학생${i - maleCount + 1}`,
                        gender: gender as 'M' | 'F'
                    });
                }
                this.students = tempStudents;
                
            }
            
            // 모둠 배치로 렌더링 (LayoutRenderer를 통해 처리)
            const dummySeats: Seat[] = this.students.map((_, index) => ({
                id: index + 1,
                position: { x: 0, y: 0 },
                studentId: undefined,
                studentName: undefined,
                isFixed: false,
                isActive: true
            }));
            
            // LayoutRenderer를 통해 모둠 배치 렌더링
            this.layoutRenderer.renderFinalLayout(dummySeats);
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
            const pairModeInput = document.querySelector('input[name="pair-mode"]:checked') as HTMLInputElement;
            const pairMode = pairModeInput?.value || 'gender-pair'; // 기본값: 남녀 짝꿍
            
            
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
            const singleModeInput = document.querySelector('input[name="single-mode"]:checked') as HTMLInputElement;
            const singleMode = singleModeInput ? singleModeInput.value : 'basic-row';
            
            // '남녀 순서 바꾸기' 체크박스 상태 확인
            const reverseGenderOrderCheckbox = document.getElementById('reverse-gender-order') as HTMLInputElement;
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
                            } else {
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
                        } else {
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
                            } else {
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
            } else if (singleMode === 'gender-row') {
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
                const partitionStudents: Array<Array<{student: Student, index: number}>> = [];
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
                    } else if (isLastPartition && !isLastPartitionOdd) {
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
                    } else if (isOddPartition) {
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
                    } else {
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
                            const {student, index} = partitionStudents[partition][row];
                            const card = this.createStudentCard(student, index);
                            card.style.width = '100%';
                            card.style.maxWidth = '120px';
                            card.style.margin = '0 auto';
                            seatsArea.appendChild(card);
                        }
                    }
                }
            } else if (singleMode === 'gender-symmetric-row') {
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
                const partitionStudents: Array<Array<{student: Student, index: number}>> = [];
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
                            const {student, index} = partitionStudents[partition][row];
                            const card = this.createStudentCard(student, index);
                            card.style.width = '100%';
                            card.style.maxWidth = '120px';
                            card.style.margin = '0 auto';
                            seatsArea.appendChild(card);
                        }
                    }
                }
            } else {
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
    private createStudentCard(student: Student, index: number): HTMLDivElement {
        const card = document.createElement('div');
        card.className = 'student-seat-card';
        card.setAttribute('draggable', 'true');
        
        // 좌석 고유 ID 부여
        const seatId = this.nextSeatId++;
        card.setAttribute('data-seat-id', seatId.toString());
        
        // 접근성 개선: ARIA 레이블 추가
        card.setAttribute('role', 'button');
        // 성별 아이콘 정보 포함
        const genderLabel = student.gender === 'M' ? '남학생 ♂' : '여학생 ♀';
        card.setAttribute('aria-label', `좌석 ${seatId}: ${student.name} (${genderLabel})`);
        card.setAttribute('tabindex', '0');
        
        // 좌석 번호 표시 (좌측 상단)
        const seatNumberDiv = document.createElement('div');
        seatNumberDiv.className = 'seat-number-label';
        seatNumberDiv.textContent = `#${seatId}`;
        seatNumberDiv.setAttribute('aria-hidden', 'true');
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
        
        // 긴 이름 처리: 20자 이상이면 말줄임표 표시 및 툴팁 추가
        const displayName = student.name.length > 20 ? student.name.substring(0, 20) + '...' : student.name;
        nameDiv.textContent = displayName;
        if (student.name.length > 20) {
            nameDiv.setAttribute('title', student.name);
            nameDiv.setAttribute('aria-label', student.name);
        }
        
        nameDiv.style.display = 'flex';
        nameDiv.style.alignItems = 'center';
        nameDiv.style.justifyContent = 'center';
        nameDiv.style.height = '100%';
        nameDiv.style.width = '100%';
        nameDiv.style.overflow = 'hidden';
        nameDiv.style.textOverflow = 'ellipsis';
        nameDiv.style.whiteSpace = 'nowrap';
        nameDiv.style.padding = '0 5px';
        
        // 성별에 따라 클래스 추가
        if (student.gender === 'M') {
            card.classList.add('gender-m');
            // ARIA 레이블에 성별 아이콘 정보 추가
            card.setAttribute('aria-label', `좌석 ${seatId}: ${student.name} (남학생 ♂)`);
        } else {
            card.classList.add('gender-f');
            // ARIA 레이블에 성별 아이콘 정보 추가
            card.setAttribute('aria-label', `좌석 ${seatId}: ${student.name} (여학생 ♀)`);
        }
        
        card.appendChild(nameDiv);
        
        // 이미 고정된 좌석인 경우 시각적 표시
        if (this.fixedSeatIds.has(seatId)) {
            card.classList.add('fixed-seat');
            const genderLabel = student.gender === 'M' ? '남학생 ♂' : '여학생 ♀';
            card.setAttribute('aria-label', `고정 좌석 ${seatId}: ${student.name} (${genderLabel}) - 클릭하여 해제`);
            card.title = '고정 좌석 (클릭하여 해제)';
            
            // 🔒 아이콘 추가 (색상 외 시각적 구분)
            const lockIcon = document.createElement('div');
            lockIcon.className = 'fixed-seat-lock';
            lockIcon.textContent = '🔒';
            lockIcon.setAttribute('aria-hidden', 'true');
            lockIcon.setAttribute('aria-label', '고정 좌석');
            lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
            card.appendChild(lockIcon);
        }
        
        // 키보드 네비게이션 지원
        this.addEventListenerSafe(card, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter' || ke.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
        
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
        this.addEventListenerSafe(seatsArea, 'dragstart', (ev) => {
            const e = ev as DragEvent;
            const target = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            if (!target) return;
            
            // 읽기 전용 모드에서는 드래그 불가
            if (this.isReadOnlyMode) {
                e.preventDefault();
                return;
            }
            
            // 자리 배치가 완료되었는지 확인 (액션 버튼이 표시되어 있으면 배치 완료 상태)
            const actionButtons = document.getElementById('layout-action-buttons');
            const isLayoutComplete = actionButtons && actionButtons.style.display !== 'none';
            
            // 배치가 완료되지 않은 상태에서 고정 좌석 모드가 활성화되어 있으면 드래그 비활성화
            // (미리보기 단계에서 좌석을 클릭해서 고정할 수 있도록)
            if (!isLayoutComplete) {
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
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
            
            // 드래그 피드백: 드래그 중인 카드 스타일 변경
            target.style.opacity = '0.5';
            target.style.transform = 'scale(0.95)';
            target.style.transition = 'all 0.2s ease';
            target.style.cursor = 'grabbing';
            target.classList.add('dragging');
            
            try { e.dataTransfer?.setData('text/plain', 'swap'); } catch {}
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                // 드래그 이미지 설정 (투명한 이미지로 커스텀 커서 효과)
                const dragImage = target.cloneNode(true) as HTMLElement;
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
                this.setTimeoutSafe(() => {
                    document.body.removeChild(dragImage);
                }, 0);
            }
        });
        
        // dragend - 드래그가 끝나면 dragSourceCard 초기화 (드롭되지 않은 경우 대비)
        this.addEventListenerSafe(seatsArea, 'dragend', (ev) => {
            const e = ev as DragEvent;
            const target = (e.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            
            // 드래그 피드백 복원
            if (target) {
                target.style.opacity = '';
                target.style.transform = '';
                target.style.cursor = '';
                target.classList.remove('dragging');
            }
            
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
        this.addEventListenerSafe(seatsArea, 'dragover', (ev) => {
            const e = ev as DragEvent;
            if (this.dragSourceCard) {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                
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
                const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
                const cardsOnly = allCards.filter(card => 
                    card !== this.dragSourceCard && 
                    !card.classList.contains('partition-label') &&
                    !card.closest('.labels-row')
                );
                
                // 마우스 위치에서 가장 가까운 카드 찾기
                let closestCard: HTMLElement | null = null;
                let minDistance = Infinity;
                let insertPosition: 'before' | 'after' | 'on' = 'on';
                
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
                        } else if (mouseY > cardY + cardRect.height / 4) {
                            insertPosition = 'after';
                        } else {
                            // 수평 위치로 판단
                            if (mouseX < cardX) {
                                insertPosition = 'before';
                            } else {
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
                    } else {
                        // 카드 앞/뒤에 삽입 인디케이터 표시
                        this.showInsertIndicator(closestCard, insertPosition);
                    }
                } else {
                    // 빈 공간에 드롭할 경우 seats-area에 하이라이트
                    seatsArea.classList.add('drag-over-area');
                }
            }
        });

        // dragleave - 하이라이트 제거
        this.addEventListenerSafe(seatsArea, 'dragleave', (ev) => {
            const e = ev as DragEvent;
            // seats-area를 완전히 벗어난 경우에만 하이라이트 제거
            const relatedTarget = e.relatedTarget as HTMLElement;
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
        this.addEventListenerSafe(seatsArea, 'drop', (ev) => {
            const e = ev as DragEvent;
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
            if (!source) return;
            
            // 타겟이 카드인지 확인 (더 정확한 감지)
            let targetCard: HTMLElement | null = null;
            const targetElement = e.target as HTMLElement;
            
            // target이 카드 자체이거나, 카드의 자식 요소인 경우
            if (targetElement) {
                if (targetElement.classList.contains('student-seat-card')) {
                    targetCard = targetElement;
                } else {
                    targetCard = targetElement.closest('.student-seat-card') as HTMLElement | null;
                }
            }
            
            // 카드에 직접 드롭한 경우: 교환
            if (targetCard && targetCard !== source) {
                // 고정 좌석은 교환 불가
                if (targetCard.classList.contains('fixed-seat') || source.classList.contains('fixed-seat')) return;

                const srcNameEl = source.querySelector('.student-name') as HTMLElement | null;
                const tgtNameEl = targetCard.querySelector('.student-name') as HTMLElement | null;
                if (!srcNameEl || !tgtNameEl) return;

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
            } else {
                // 빈 공간에 드롭: 이동
                // 드롭 위치 계산 (마우스 좌표 사용)
                const seatsAreaRect = seatsArea.getBoundingClientRect();
                const dropX = e.clientX - seatsAreaRect.left;
                const dropY = e.clientY - seatsAreaRect.top;
                
                // 모든 카드 가져오기 (분단 레이블 제외)
                const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
                const cardsOnly = allCards.filter(card => 
                    card !== source && 
                    !card.classList.contains('partition-label') &&
                    !card.closest('.labels-row')
                );
                
                if (cardsOnly.length === 0) {
                    // 다른 카드가 없으면 그냥 추가
                    seatsArea.appendChild(source);
                    return;
                }
                
                // 가장 가까운 카드 찾기
                let closestCard: HTMLElement | null = null;
                let minDistance = Infinity;
                let insertPosition: 'before' | 'after' = 'after';
                
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
                        } else if (dropY > cardY + cardRect.height / 4) {
                            insertPosition = 'after';
                        } else {
                            // 수평 위치로 판단
                            if (dropX < cardX) {
                                insertPosition = 'before';
                            } else {
                                insertPosition = 'after';
                            }
                        }
                    }
                }
                
                // 카드 이동
                if (closestCard) {
                    if (insertPosition === 'before') {
                        seatsArea.insertBefore(source, closestCard);
                    } else {
                        // 다음 형제가 있으면 그 앞에, 없으면 맨 끝에
                        const nextSibling = closestCard.nextElementSibling;
                        if (nextSibling && nextSibling.classList.contains('student-seat-card')) {
                            seatsArea.insertBefore(source, nextSibling);
                        } else {
                            seatsArea.insertBefore(source, closestCard.nextSibling);
                        }
                    }
                } else {
                    seatsArea.appendChild(source);
                }
            }
            
            // 드래그&드롭 완료 후 히스토리 저장 (약간의 지연을 두어 DOM 업데이트 완료 후 저장)
            this.setTimeoutSafe(() => {
                this.saveLayoutToHistory();
            }, 50);
        });
        
        // 모바일 터치 이벤트 지원
        this.enableTouchDragAndDrop(seatsArea);
    }
    
    /**
     * 모바일 터치 드래그&드롭 지원
     */
    private enableTouchDragAndDrop(seatsArea: HTMLElement): void {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoved = false;
        let touchStartTime = 0;
        const DRAG_THRESHOLD = 15; // 드래그로 인식할 최소 이동 거리 (px)
        const LONG_PRESS_TIME = 500; // 길게 누르기로 인식할 시간 (ms)
        
        this.addEventListenerSafe(seatsArea, 'touchstart', (e: Event) => {
            const te = e as TouchEvent;
            const target = (te.target as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
            if (!target) return;
            
            // 자리 배치가 완료되었는지 확인
            const actionButtons = document.getElementById('layout-action-buttons');
            const isLayoutComplete = actionButtons && actionButtons.style.display !== 'none';
            
            if (!isLayoutComplete) {
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
                if (fixedRandomMode) return;
            }
            
            // 고정 좌석은 드래그 불가
            if (target.classList.contains('fixed-seat')) return;
            
            this.touchStartCard = target;
            touchMoved = false;
            touchStartTime = Date.now();
            const touch = te.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            this.touchStartPosition = { x: touchStartX, y: touchStartY };
            
            // 시각적 피드백 (약간의 지연 후)
            const feedbackTimer = window.setTimeout(() => {
                if (this.touchStartCard === target && !touchMoved) {
                    target.style.opacity = '0.7';
                    target.style.transform = 'scale(1.08)';
                    target.style.transition = 'transform 0.2s ease';
                    target.style.zIndex = '1000';
                }
            }, 100);
            
            // 타이머 정리를 위한 저장
            (target as any).__feedbackTimer = feedbackTimer;
        }, { passive: true });
        
        this.addEventListenerSafe(seatsArea, 'touchmove', (e: Event) => {
            const te = e as TouchEvent;
            if (!this.touchStartCard) return;
            
            const touch = te.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // 최소 이동 거리 체크 (개선된 임계값)
            if (totalDelta > DRAG_THRESHOLD) {
                touchMoved = true;
                
                // 피드백 타이머 취소
                const feedbackTimer = (this.touchStartCard as any).__feedbackTimer;
                if (feedbackTimer) {
                    clearTimeout(feedbackTimer);
                    delete (this.touchStartCard as any).__feedbackTimer;
                }
                
                // 드래그 중 시각적 피드백 강화
                this.touchStartCard.style.opacity = '0.8';
                this.touchStartCard.style.transform = `scale(1.1) translate(${touch.clientX - touchStartX}px, ${touch.clientY - touchStartY}px)`;
                this.touchStartCard.style.transition = 'none';
                
                // 스크롤 방지
                te.preventDefault();
                
                // 드롭 위치 인디케이터 표시
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetCard = (elementBelow as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
                
                // 이전 인디케이터 제거
                if (this.dragOverIndicator && this.dragOverIndicator !== targetCard) {
                    this.dragOverIndicator.style.outline = '';
                    this.dragOverIndicator.style.outlineOffset = '';
                }
                
                // 새 인디케이터 표시
                if (targetCard && targetCard !== this.touchStartCard && !targetCard.classList.contains('fixed-seat')) {
                    targetCard.style.outline = '3px dashed #667eea';
                    targetCard.style.outlineOffset = '2px';
                    this.dragOverIndicator = targetCard;
                } else if (this.dragOverIndicator) {
                    this.dragOverIndicator.style.outline = '';
                    this.dragOverIndicator.style.outlineOffset = '';
                    this.dragOverIndicator = null;
                }
            }
        }, { passive: false });
        
        this.addEventListenerSafe(seatsArea, 'touchend', (e: Event) => {
            const te = e as TouchEvent;
            if (!this.touchStartCard) {
                this.touchStartCard = null;
                this.touchStartPosition = null;
                return;
            }
            
            // 피드백 타이머 취소
            const feedbackTimer = (this.touchStartCard as any).__feedbackTimer;
            if (feedbackTimer) {
                clearTimeout(feedbackTimer);
                delete (this.touchStartCard as any).__feedbackTimer;
            }
            
            const touch = te.changedTouches[0];
            const endX = touch.clientX;
            const endY = touch.clientY;
            
            // 원래 스타일 복원
            this.touchStartCard.style.opacity = '';
            this.touchStartCard.style.transform = '';
            this.touchStartCard.style.transition = '';
            this.touchStartCard.style.zIndex = '';
            
            // 드롭 위치 인디케이터 제거
            if (this.dragOverIndicator) {
                this.dragOverIndicator.style.outline = '';
                this.dragOverIndicator.style.outlineOffset = '';
                this.dragOverIndicator = null;
            }
            
            // 이동 거리가 충분하면 드롭 처리
            if (touchMoved) {
                const elementBelow = document.elementFromPoint(endX, endY);
                const targetCard = (elementBelow as HTMLElement)?.closest('.student-seat-card') as HTMLElement | null;
                
                if (targetCard && targetCard !== this.touchStartCard && !targetCard.classList.contains('fixed-seat')) {
                    // 카드 교환
                    const srcNameEl = this.touchStartCard.querySelector('.student-name') as HTMLElement | null;
                    const tgtNameEl = targetCard.querySelector('.student-name') as HTMLElement | null;
                    if (srcNameEl && tgtNameEl) {
                        // 이름 스왑
                        const tmpName = srcNameEl.textContent || '';
                        srcNameEl.textContent = tgtNameEl.textContent || '';
                        tgtNameEl.textContent = tmpName;
                        
                        // 성별 배경 클래스 스왑
                        const srcIsM = this.touchStartCard.classList.contains('gender-m');
                        const srcIsF = this.touchStartCard.classList.contains('gender-f');
                        const tgtIsM = targetCard.classList.contains('gender-m');
                        const tgtIsF = targetCard.classList.contains('gender-f');
                        
                        this.touchStartCard.classList.toggle('gender-m', tgtIsM);
                        this.touchStartCard.classList.toggle('gender-f', tgtIsF);
                        targetCard.classList.toggle('gender-m', srcIsM);
                        targetCard.classList.toggle('gender-f', srcIsF);
                        
                        // 성공 피드백 (시각적)
                        targetCard.style.transform = 'scale(1.05)';
                        setTimeout(() => {
                            targetCard.style.transform = '';
                        }, 200);
                        
                        // 히스토리 저장
                        this.setTimeoutSafe(() => {
                            this.saveLayoutToHistory();
                        }, 50);
                    }
                }
            }
            
            this.touchStartCard = null;
            this.touchStartPosition = null;
            touchMoved = false;
        }, { passive: true });
        
        this.addEventListenerSafe(seatsArea, 'touchcancel', () => {
            // 터치 취소 시 정리
            if (this.touchStartCard) {
                this.touchStartCard.style.opacity = '';
                this.touchStartCard.style.transform = '';
                this.touchStartCard.style.transition = '';
                this.touchStartCard.style.zIndex = '';
                
                if (this.dragOverIndicator) {
                    this.dragOverIndicator.style.outline = '';
                    this.dragOverIndicator.style.outlineOffset = '';
                    this.dragOverIndicator = null;
                }
                
                this.touchStartCard = null;
                this.touchStartPosition = null;
                touchMoved = false;
            }
        }, { passive: true });
    }

    /**
     * 드롭 위치 삽입 인디케이터 표시
     */
    private showInsertIndicator(card: HTMLElement, position: 'before' | 'after'): void {
        // 기존 인디케이터 제거
        if (this.dragOverIndicator) {
            this.dragOverIndicator.remove();
        }

        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

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
        } else {
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
    private saveToHistory(type: string, data: HistoryData): void {
        // 현재 인덱스 이후의 히스토리 제거 (새로운 상태가 추가되면 이후 히스토리는 삭제)
        if (this.historyIndex < this.layoutHistory.length - 1) {
            this.layoutHistory = this.layoutHistory.slice(0, this.historyIndex + 1);
        }
        
        // 새 상태 추가
        this.layoutHistory.push({ type, data });
        
        // 히스토리 크기 제한 (최대 100개)
        if (this.layoutHistory.length > 100) {
            this.layoutHistory.shift();
        } else {
            this.historyIndex++;
        }
        
        // 되돌리기 버튼 활성화/비활성화 업데이트
        this.updateUndoButtonState();
    }
    
    /**
     * 현재 자리 배치 상태를 히스토리에 저장
     */
    private saveLayoutToHistory(): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;
        
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
    private handleUndoLayout(): void {
        
        
        if (this.historyIndex <= 0 || this.layoutHistory.length === 0) {
            // 되돌리기할 히스토리가 없음
            const message = ErrorHandler.getUserFriendlyMessage(ErrorCode.UNDO_NOT_AVAILABLE);
            this.outputModule.showError(message);
            return;
        }
        
        // 이전 상태로 복원 (인덱스를 먼저 감소시켜 이전 상태를 가져옴)
        this.historyIndex--;
        const previousState = this.layoutHistory[this.historyIndex];
        
        
        
        // 상태 타입에 따라 복원
        if (previousState && previousState.type === 'layout') {
            const seatsArea = document.getElementById('seats-area');
            if (seatsArea && previousState.data) {
                // HTML 복원
                if (previousState.data.seatsAreaHTML && typeof previousState.data.seatsAreaHTML === 'string') {
                    seatsArea.innerHTML = previousState.data.seatsAreaHTML;
                }
                
                // 그리드 설정 복원
                if (previousState.data.gridTemplateColumns && typeof previousState.data.gridTemplateColumns === 'string') {
                    seatsArea.style.gridTemplateColumns = previousState.data.gridTemplateColumns;
                }
                
                // 학생 데이터 복원
                if (previousState.data.students) {
                    // 학생 데이터 복원은 나중에 구현
                    
                }
                
                // 드래그&드롭 기능 다시 활성화 (복원된 카드에 대해)
                this.enableSeatSwapDragAndDrop();
            }
        } else if (previousState && previousState.type === 'student-input') {
            // 학생 입력 상태 복원
            if (previousState.data && previousState.data.students) {
                this.inputModule.setStudentData(previousState.data.students);
            }
        } else if (previousState && previousState.type === 'options') {
            // 옵션 설정 복원
            if (previousState.data && previousState.data.options) {
                // 옵션 복원 로직 (필요시 구현)
                
            }
        }
        
        // 되돌리기/다시 실행하기 버튼 상태 업데이트
        this.updateUndoRedoButtonState();
        
        
    }
    
    /**
     * 다시 실행하기 기능 실행
     */
    private handleRedoLayout(): void {
        // 다시 실행할 히스토리가 없는 경우
        if (this.historyIndex >= this.layoutHistory.length - 1 || this.layoutHistory.length === 0) {
            const message = ErrorHandler.getUserFriendlyMessage(ErrorCode.UNDO_NOT_AVAILABLE);
            this.outputModule.showError(message);
            return;
        }
        
        // 다음 상태로 복원 (인덱스를 먼저 증가시켜 다음 상태를 가져옴)
        this.historyIndex++;
        const nextState = this.layoutHistory[this.historyIndex];
        
        // 상태 타입에 따라 복원
        if (nextState && nextState.type === 'layout') {
            const seatsArea = document.getElementById('seats-area');
            if (seatsArea && nextState.data) {
                // HTML 복원
                if (nextState.data.seatsAreaHTML && typeof nextState.data.seatsAreaHTML === 'string') {
                    seatsArea.innerHTML = nextState.data.seatsAreaHTML;
                }
                
                // 그리드 설정 복원
                if (nextState.data.gridTemplateColumns && typeof nextState.data.gridTemplateColumns === 'string') {
                    seatsArea.style.gridTemplateColumns = nextState.data.gridTemplateColumns;
                }
                
                // 학생 데이터 복원
                if (nextState.data.students) {
                    // 학생 데이터 복원은 나중에 구현
                    
                }
                
                // 드래그&드롭 기능 다시 활성화 (복원된 카드에 대해)
                this.enableSeatSwapDragAndDrop();
            }
        } else if (nextState && nextState.type === 'student-input') {
            // 학생 입력 상태 복원
            if (nextState.data && nextState.data.students) {
                this.inputModule.setStudentData(nextState.data.students);
            }
        } else if (nextState && nextState.type === 'options') {
            // 옵션 설정 복원
            if (nextState.data && nextState.data.options) {
                // 옵션 복원 로직 (필요시 구현)
                
            }
        }
        
        // 되돌리기/다시 실행하기 버튼 상태 업데이트
        this.updateUndoRedoButtonState();
    }
    
    /**
     * 되돌리기/다시 실행하기 버튼 활성화/비활성화 상태 업데이트
     */
    private updateUndoRedoButtonState(): void {
        const undoButton = document.getElementById('undo-layout') as HTMLButtonElement;
        const redoButton = document.getElementById('redo-layout') as HTMLButtonElement;
        
        // 되돌리기 버튼 상태 업데이트
        if (undoButton) {
        // 히스토리가 있고 이전 상태가 있으면 활성화
            if (this.historyIndex > 0 && this.layoutHistory.length > 0) {
            undoButton.disabled = false;
            undoButton.style.opacity = '1';
            undoButton.style.cursor = 'pointer';
        } else {
            undoButton.disabled = true;
            undoButton.style.opacity = '0.5';
            undoButton.style.cursor = 'not-allowed';
            }
        }
        
        // 다시 실행하기 버튼 상태 업데이트
        if (redoButton) {
            // 히스토리가 있고 다음 상태가 있으면 활성화
            if (this.historyIndex < this.layoutHistory.length - 1 && this.layoutHistory.length > 0) {
                redoButton.disabled = false;
                redoButton.style.opacity = '1';
                redoButton.style.cursor = 'pointer';
            } else {
                redoButton.disabled = true;
                redoButton.style.opacity = '0.5';
                redoButton.style.cursor = 'not-allowed';
            }
        }
    }
    
    /**
     * 되돌리기 버튼 활성화/비활성화 상태 업데이트 (하위 호환성)
     */
    private updateUndoButtonState(): void {
        this.updateUndoRedoButtonState();
    }
    
    /**
     * 히스토리 초기화
     */
    private resetHistory(): void {
        this.layoutHistory = [];
        this.historyIndex = -1;
        this.updateUndoButtonState();
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
        this.studentTableManager.updateFixedSeatDropdowns();
        
        // 고정 좌석 설정/해제됨
    }
    
    /**
     * 테이블의 고정 좌석 드롭다운 업데이트
     */
    private updateFixedSeatDropdowns(): void {
        this.studentTableManager.updateFixedSeatDropdowns();
    }
    

    /**
     * 입력 값 검증 및 수정 (음수, 0, 큰 숫자 처리)
     * InputValidator가 실시간 검증을 처리하므로, 여기서는 값 정규화만 수행
     */
    private validateAndFixStudentInput(input: HTMLInputElement, inputType: 'male' | 'female'): void {
        // 숫자가 아닌 문자 제거
        let cleanedValue = input.value.replace(/[^0-9]/g, '');
        let value = parseInt(cleanedValue || '0', 10);
        
        // NaN 체크
        if (isNaN(value)) {
            value = 0;
        }
        
        // 최소값 제한: 0
        if (value < 0) {
            value = 0;
        }
        
        // 최대값 제한: 100 (InputValidator에서도 검증하지만 여기서도 제한)
        if (value > 100) {
            value = 100;
        }
        
        // 값이 변경되었으면 입력 필드 업데이트
        const currentValue = parseInt(input.value.replace(/[^0-9]/g, '') || '0', 10);
        if (currentValue !== value || input.value !== value.toString()) {
            input.value = value.toString();
            // 값이 변경되면 InputValidator가 자동으로 재검증
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    /**
     * 분단 수 입력 값 검증 및 수정
     * InputValidator가 실시간 검증을 처리하므로, 여기서는 값 정규화만 수행
     */
    private validateAndFixPartitionInput(input: HTMLInputElement): void {
        let value = parseInt(input.value || '1', 10);
        
        // NaN 체크
        if (isNaN(value)) {
            value = 1;
        }
        
        // 최소값: 1
        if (value < 1) {
            value = 1;
        }
        
        // 최대값: 10
        if (value > 10) {
            value = 10;
            this.outputModule.showInfo('분단 수는 최대 10개까지 입력 가능합니다.');
        }
        
        // 값이 변경되었으면 입력 필드 업데이트
        const currentValue = parseInt(input.value.replace(/[^0-9]/g, '') || '1', 10);
        if (currentValue !== value || input.value !== value.toString()) {
            input.value = value.toString();
            // 값이 변경되면 InputValidator가 자동으로 재검증
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * 성별별 학생 수에 따라 미리보기 업데이트
     */
    private updatePreviewForGenderCounts(): void {
        this.uiManager.updatePreviewForGenderCounts();
    }

    /**
     * 학생 수에 따라 미리보기 업데이트
     */
    private updatePreviewForStudentCount(count: number): void {
        
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
        
        // 새로운 배치 시작 시 히스토리 초기화는 하지 않음
        // (자리 배치 실행 후에도 히스토리를 유지하여 되돌리기 가능하도록)

        // 좌석 번호를 1부터 시작하도록 초기화
        this.nextSeatId = 1;

        // 현재 선택된 배치 형태 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
        const layoutType = layoutTypeInput ? layoutTypeInput.value : '';
        const groupSizeInput = document.querySelector('input[name="group-size"]:checked') as HTMLInputElement;
        const groupSize = groupSizeInput ? groupSizeInput.value : '';

        

        // 모둠 배치인지 확인
        const isGroupLayout = layoutType === 'group' && (groupSize === 'group-3' || groupSize === 'group-4' || groupSize === 'group-5' || groupSize === 'group-6');
        const groupSizeNumber = groupSize === 'group-3' ? 3 : groupSize === 'group-4' ? 4 : groupSize === 'group-5' ? 5 : groupSize === 'group-6' ? 6 : 0;

        if (isGroupLayout && groupSizeNumber > 0) {
            // 모둠 배치: LayoutRenderer를 통해 처리
            this.layoutRenderer.renderFinalLayout(seats);
            return;
        }
            
            // 일반 배치: 기존 방식대로 표시
            // 학생 수에 따라 그리드 열 수 결정
            const columnCount = this.students.length <= 20 ? 4 : 6;
            seatsArea.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
            seatsArea.style.gap = '10px';
            seatsArea.style.display = 'grid';

            seats.forEach((seat, index) => {
                if (index >= this.students.length) return;
                
                const student = this.students[index];
                const card = this.createStudentCard(student, index);
                seatsArea.appendChild(card);
            });

        // 렌더 후 드래그&드롭 스왑 핸들러 보장
        this.enableSeatSwapDragAndDrop();
        
        // 초기 렌더링 후 첫 번째 상태를 히스토리에 저장
        this.setTimeoutSafe(() => {
            this.saveLayoutToHistory();
        }, 100);
    }



    /**
     * localStorage 사용 가능 여부 확인
     */
    private isLocalStorageAvailable(): boolean {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * 안전한 localStorage 저장
     */
    private safeSetItem(key: string, value: string): boolean {
        if (!this.isLocalStorageAvailable()) {
            this.outputModule.showError('브라우저의 저장소 기능이 비활성화되어 있습니다. 설정에서 쿠키 및 사이트 데이터를 허용해주세요.');
            return false;
        }
        
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            if (error instanceof DOMException && error.code === 22) {
                // 저장소 용량 초과
                this.outputModule.showError('저장소 용량이 부족합니다. 브라우저 설정에서 저장된 데이터를 삭제해주세요.');
            } else {
                this.outputModule.showError('데이터 저장에 실패했습니다. 브라우저 설정을 확인해주세요.');
            }
            logger.error('localStorage 저장 실패:', error);
            return false;
        }
    }
    
    /**
     * 안전한 localStorage 읽기
     */
    private safeGetItem(key: string): string | null {
        if (!this.isLocalStorageAvailable()) {
            return null;
        }
        
        try {
            return localStorage.getItem(key);
        } catch (error) {
            logger.error('localStorage 읽기 실패:', error);
            return null;
        }
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
            
            const success = this.storageManager.safeSetItem('layoutResult', JSON.stringify(layoutData));
            if (!success) {
                // 저장 실패 시 사용자에게 알림 (이미 safeSetItem에서 표시됨)
            }
        } catch (error) {
            logger.error('배치 결과 저장 중 오류:', error);
            this.outputModule.showError('배치 결과 저장 중 오류가 발생했습니다.');
        }
    }

    /**
     * 저장된 좌석 배치 결과 불러오기
     */
    private loadSavedLayoutResult(): void {
        try {
            const layoutDataStr = this.storageManager.safeGetItem('layoutResult');
            if (!layoutDataStr) {
                return;
            }

            // JSON 파싱 시도 (데이터 손상 처리)
            let layoutData: LayoutResultData;
            try {
                layoutData = JSON.parse(layoutDataStr) as LayoutResultData;
            } catch (parseError) {
                // 데이터 손상 시 저장소에서 제거하고 기본값으로 복구
                try {
                    localStorage.removeItem('layoutResult');
                } catch {}
                this.outputModule.showInfo('저장된 데이터가 손상되어 초기화되었습니다.');
                return;
            }
            
            // 데이터 구조 검증
            if (!layoutData || typeof layoutData !== 'object') {
                try {
                    localStorage.removeItem('layoutResult');
                } catch {}
                return;
            }
            
            if (layoutData.seats && Array.isArray(layoutData.seats) && 
                layoutData.students && Array.isArray(layoutData.students)) {
                this.seats = layoutData.seats;
                this.students = layoutData.students;
                if (this.canvasModule) {
                    this.canvasModule.setData(this.seats, this.students);
                }
            } else {
                // 데이터 구조가 올바르지 않으면 제거
                try {
                    localStorage.removeItem('layoutResult');
                } catch {}
            }
        } catch (error) {
            logger.error('배치 결과 불러오기 중 오류:', error);
            // 에러 발생 시 저장소 정리 시도
            try {
                localStorage.removeItem('layoutResult');
            } catch {}
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
            logger.error('랜덤 배치 중 오류:', error);
            this.outputModule.showError('랜덤 배치 중 오류가 발생했습니다.');
        }
    }


    /**
     * 결과 내보내기 처리
     */
    private handleExport(): void {
        this.printExportManager.exportAsText();
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
        this.studentTableManager.createStudentTable(count);
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
        this.studentTableManager.addStudentRow();
    }

    /**
     * 학생 테이블 통계 업데이트
     */
    private updateStudentTableStats(): void {
        this.uiManager.updateStudentTableStats();
    }

    /**
     * 학생 정보 입력 테이블 저장 처리
     * 테이블의 학생 수를 계산하여 1단계 사이드바에 반영하고 미리보기를 업데이트
     * 그리고 localStorage에 학생 데이터를 저장
     */
    private handleSaveStudentTable(): void {
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr') || [];
        
        let maleCount = 0;
        let femaleCount = 0;
        const studentData: Array<{name: string, gender: 'M' | 'F', fixedSeatId?: number}> = [];

        rows.forEach((row) => {
            const nameInput = row.querySelector('.student-name-input') as HTMLInputElement;
            const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
            const fixedSeatSelect = row.querySelector('.fixed-seat-select') as HTMLSelectElement;
            
            if (nameInput && genderSelect) {
                const name = nameInput.value.trim();
                const gender = genderSelect.value as 'M' | 'F';
                
                if (name && gender) {
                    if (gender === 'M') {
                        maleCount++;
                    } else if (gender === 'F') {
                        femaleCount++;
                    }
                    
                    const student: {name: string, gender: 'M' | 'F', fixedSeatId?: number} = { name, gender };
                    
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
            this.storageManager.safeSetItem('classStudentData', JSON.stringify(studentData));
            
        } catch (error) {
            logger.error('학생 데이터 저장 중 오류:', error);
            this.outputModule.showError('학생 데이터 저장 중 오류가 발생했습니다.');
            return;
        }

        // 테이블의 학생 수를 1단계 사이드바로 동기화
        this.syncSidebarToTable(maleCount, femaleCount);
        
        this.outputModule.showSuccess(`우리반 학생 ${studentData.length}명이 등록되었습니다!`);
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
            this.outputModule.showError('입력 필드를 찾을 수 없습니다.');
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
        this.setTimeoutSafe(() => {
            this.updateStudentTableStats();
            this.isSyncing = false; // 동기화 완료
        }, 100);
    }

    /**
     * 우리 반 이름 불러오기 처리
     * localStorage에 저장된 학생 데이터를 테이블에 로드
     */
    private handleLoadClassNames(): void {
        this.studentTableManager.loadClassNames();
    }

    /**
     * 저장된 학생 데이터를 테이블에 로드
     */
    private loadStudentDataToTable(studentData: Array<{name: string, gender: 'M' | 'F', fixedSeatId?: number}>): void {
        const outputSection = document.getElementById('output-section');
        if (!outputSection) return;

        // 기존 테이블이 없으면 새로 생성
        let studentTableContainer = outputSection.querySelector('.student-table-container') as HTMLElement | null;
        if (!studentTableContainer) {
            this.studentTableManager.createStudentTable(studentData.length);
            // 테이블이 생성될 때까지 잠시 대기
            this.setTimeoutSafe(() => {
                this.csvFileHandler.loadStudentDataToTable(studentData);
            }, 100);
            return;
        }

        // 모든 테이블의 tbody 가져오기
        const allTbodies = outputSection.querySelectorAll('.student-input-table tbody');
        if (allTbodies.length === 0) {
            // 테이블이 없으면 새로 생성
            this.studentTableManager.createStudentTable(studentData.length);
            this.setTimeoutSafe(() => {
                this.csvFileHandler.loadStudentDataToTable(studentData);
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
                const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
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
                    this.addEventListenerSafe(fixedSeatSelect, 'change', () => {
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
                        
                        // 번호 셀 배경색 변경
                        if (numCell) {
                            if (selectedSeatId) {
                                numCell.style.background = '#667eea';
                                numCell.style.color = 'white';
                                numCell.style.fontWeight = 'bold';
                            } else {
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
        this.studentTableManager.updateFixedSeatDropdowns();

        // 통계 업데이트
        this.updateStudentTableStats();

        // 사이드바 동기화
        const maleCount = studentData.filter(s => s.gender === 'M').length;
        const femaleCount = studentData.filter(s => s.gender === 'F').length;
        this.syncSidebarToTable(maleCount, femaleCount);

        this.outputModule.showSuccess(`우리반 학생 ${studentData.length}명을 불러왔습니다!`);
    }

    /**
     * 1단계 사이드바 값을 테이블로 동기화
     * 1단계에 입력된 숫자에 맞춰 테이블에 행을 추가하거나 삭제
     */
    private syncTableToSidebar(sidebarMaleCount: number, sidebarFemaleCount: number): void {
        const outputSection = document.getElementById('output-section');
        const tbody = outputSection?.querySelector('.student-input-table tbody');
        if (!tbody) {
            this.outputModule.showError('테이블을 찾을 수 없습니다.');
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
                this.studentTableManager.addStudentRow();
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
                this.studentTableManager.addStudentRow();
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
    private drawSeatWithStudent(ctx: CanvasRenderingContext2D, seat: Seat, student: {name: string, gender: 'M' | 'F'}): void {
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
     * 학생 데이터로 테이블 생성 (handleCreateStudentTable에서 사용)
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
        downloadBtn.textContent = '학생 이름 양식 다운로드';
        downloadBtn.style.flex = 'none';
        downloadBtn.style.width = 'auto';
        downloadBtn.style.whiteSpace = 'nowrap';
        this.addEventListenerSafe(downloadBtn, 'click', () => this.csvFileHandler.downloadTemplateFile());
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
        this.addEventListenerSafe(fileInput, 'change', (e) => this.csvFileHandler.handleFileUpload(e));
        
        this.addEventListenerSafe(uploadBtn, 'click', () => {
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
        this.addEventListenerSafe(loadClassBtn3, 'click', () => this.handleLoadClassNames());
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
                    <th title="미리보기 화면의 좌석 카드에 표시된 번호(#1, #2...)를 선택하세요. 고정 좌석을 지정하지 않으려면 '없음'을 선택하세요.">고정 좌석</th>
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
                    this.addEventListenerSafe(fixedSeatSelect, 'change', () => {
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
                        
                        // 번호 셀 배경색 변경
                        const numCell = row.querySelector('td:first-child') as HTMLElement;
                        if (numCell) {
                            if (selectedSeatId) {
                                // 고정 좌석이 선택된 경우 파란색 배경
                                numCell.style.background = '#667eea';
                                numCell.style.color = 'white';
                                numCell.style.fontWeight = 'bold';
                            } else {
                                // 선택이 해제된 경우 원래 배경색으로 복원
                                numCell.style.background = '#f8f9fa';
                                numCell.style.color = '';
                                numCell.style.fontWeight = '';
                            }
                        }
                        
                        
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
                this.addEventListenerSafe(nameInput, 'keydown', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Enter') {
                        genderSelect.focus();
                    } else if (ke.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'name', 'down');
                    } else if (ke.key === 'ArrowUp') {
                        this.moveToCell(tbody, localIndex, 'name', 'up');
                    }
                });

                // 키보드 이벤트 추가 (성별 선택 필드)
                this.addEventListenerSafe(genderSelect, 'keydown', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Enter' || ke.key === 'Tab') {
                        const nextRow = tbody.querySelector(`tr:nth-child(${Math.min(localIndex + 1, studentsInThisTable)})`);
                        const nextNameInput = nextRow?.querySelector('.student-name-input') as HTMLInputElement;
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    } else if (ke.key === 'ArrowDown') {
                        this.moveToCell(tbody, localIndex, 'gender', 'down');
                    } else if (ke.key === 'ArrowUp') {
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
            this.addEventListenerSafe(tbody, 'input', () => {
                this.updateStudentTableStats();
            });
            this.addEventListenerSafe(tbody, 'change', () => {
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
     * 1명씩 한 줄로 배치 서브 메뉴 토글
     */
    private toggleSingleSubmenu(show: boolean): void {
        const singleSubmenu = document.getElementById('single-submenu');
        if (!singleSubmenu) return;
        
        if (show) {
            singleSubmenu.style.display = 'block';
        } else {
            singleSubmenu.style.display = 'none';
        }
    }

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
     * 모둠 배치 서브 메뉴 토글
     */
    private toggleGroupSubmenu(show: boolean): void {
        const groupSubmenu = document.getElementById('group-submenu');
        if (!groupSubmenu) return;
        
        if (show) {
            groupSubmenu.style.display = 'block';
        } else {
            groupSubmenu.style.display = 'none';
        }
    }

    /**
     * 모둠 배치 남녀 섞기 옵션 토글
     */
    private toggleGroupGenderMixOption(show: boolean): void {
        const genderMixOption = document.getElementById('group-gender-mix-option');
        if (!genderMixOption) return;
        
        if (show) {
            genderMixOption.style.display = 'block';
        } else {
            genderMixOption.style.display = 'none';
        }
    }

    /**
     * 모둠 배치 선택 시 분단 개수 제한 적용
     */
    private updatePartitionLimitForGroup(groupSize: string): void {
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (!partitionInput) return;

        // 3명 모둠 배치 선택 시 3, 4, 5개 분단만 허용
        if (groupSize === 'group-3') {
            partitionInput.min = '3';
            partitionInput.max = '5';
            
            // 현재 값이 허용 범위를 벗어나면 조정
            const currentValue = parseInt(partitionInput.value, 10);
            if (currentValue < 3) {
                partitionInput.value = '3';
            } else if (currentValue > 5) {
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
            } else if (currentValue > 4) {
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
            } else if (currentValue > 5) {
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
            } else if (currentValue > 4) {
                partitionInput.value = '4';
            }
        } else {
            // 다른 모둠 배치 옵션이면 제한 해제
            this.resetPartitionLimit();
        }
    }

    /**
     * 1명씩 한줄로 배치 선택 시 분단 개수 제한 적용 (3, 4, 5, 6만 허용)
     */
    private updatePartitionLimitForSingleUniform(): void {
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (!partitionInput) return;

        partitionInput.min = '3';
        partitionInput.max = '6';
        
        // 현재 값이 허용 범위를 벗어나면 조정
        const currentValue = parseInt(partitionInput.value, 10);
        if (currentValue < 3) {
            partitionInput.value = '3';
        } else if (currentValue > 6) {
            partitionInput.value = '6';
        }
    }

    /**
     * 짝꿍 배치 선택 시 분단 개수 제한 적용 (3, 4, 5만 허용)
     */
    private updatePartitionLimitForPair(): void {
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (!partitionInput) return;

        partitionInput.min = '3';
        partitionInput.max = '5';
        
        // 현재 값이 허용 범위를 벗어나면 조정
        const currentValue = parseInt(partitionInput.value, 10);
        if (currentValue < 3) {
            partitionInput.value = '3';
        } else if (currentValue > 5) {
            partitionInput.value = '5';
        }
    }

    /**
     * 분단 개수 제한 해제 (기본값으로 복원)
     */
    private resetPartitionLimit(): void {
        const partitionInput = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (!partitionInput) return;

        partitionInput.min = '1';
        partitionInput.max = '10';
    }

    /**
     * 프로그램 실행
     */
    public run(): void {
        if (!this.isInitialized) {
            // 개발 모드에서만 에러 로깅
            logger.error('컨트롤러가 초기화되지 않았습니다.');
            return;
        }
    }
    
    /**
     * 개발 모드 확인 (로컬호스트 또는 개발 환경)
     */
    private isDevelopmentMode(): boolean {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('dev');
    }
    
    /**
     * 안전한 클립보드 복사 (브라우저 호환성 개선)
     */
    private async copyToClipboard(text: string): Promise<boolean> {
        try {
            // 최신 Clipboard API 시도
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            // Clipboard API 실패 시 폴백 사용
        }
        
        // 폴백: document.execCommand 사용
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            return successful;
        } catch (err) {
            logger.error('클립보드 복사 실패:', err);
            return false;
        }
    }
    
    /**
     * HTML 이스케이프 (XSS 방지)
     * 향후 사용자 입력이 포함된 HTML 생성 시 사용
     */
    private escapeHtml(_text: string): string {
        const div = document.createElement('div');
        div.textContent = _text;
        return div.innerHTML;
    }
    
    /**
     * 안전한 innerHTML 설정 (XSS 방지)
     * 향후 사용자 입력이 포함된 HTML 생성 시 사용
     */
    private setSafeInnerHTML(_element: HTMLElement, _html: string): void {
        // 사용자 입력이 포함된 경우 이스케이프 처리
        // 단순 템플릿 리터럴은 그대로 사용 (성능 고려)
        // _element.innerHTML = _html;
    }
    
    /**
     * 안전한 이벤트 리스너 추가 (메모리 누수 방지)
     * 향후 사용 예정
     */
    private addEventListenerSafe(element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions): void {
        element.addEventListener(event, handler as EventListener, options);
        this.eventListeners.push({ element, event, handler: handler as EventListener });
    }
    
    /**
     * 안전한 setTimeout (메모리 누수 방지)
     */
    private setTimeoutSafe(callback: () => void, delay: number): number {
        const timerId = window.setTimeout(() => {
            this.timers.delete(timerId);
            callback();
        }, delay);
        this.timers.add(timerId);
        return timerId;
    }
    
    /**
     * 모든 타이머 정리
     */
    private clearAllTimers(): void {
        this.timers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.timers.clear();
    }
    
    /**
     * 모든 이벤트 리스너 정리
     */
    private removeAllEventListeners(): void {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
    
    /**
     * 정리 메서드 (컨트롤러 종료 시 호출)
     */
    public cleanup(): void {
        this.clearAllTimers();
        this.removeAllEventListeners();
    }

    /**
     * 좌석 배치하기 처리
     */
    private handleArrangeSeats(): void {
            // 읽기 전용 모드 해제
            this.disableReadOnlyMode();
            
            // 테이블에서 학생 데이터 가져오기
            const studentData = this.inputModule.getStudentData();
            
            if (studentData.length === 0) {
                this.outputModule.showError('학생 정보를 먼저 입력해주세요.');
                return;
            }

        // 대용량 데이터 처리 시 프로그레스 바 사용 (100명 이상)
        const useProgress = studentData.length >= 100;
        let updateProgress: ((progress: number, statusMessage?: string) => void) | null = null;
        
        if (useProgress) {
            updateProgress = this.outputModule.showProgress('자리 배치를 생성하는 중입니다...', 0);
        } else {
            // 로딩 상태 표시
            this.outputModule.showLoading('자리 배치를 생성하는 중...');
        }
        
        // 3초 동안 지속하는 음향 효과 재생
        this.animationManager.playArrangementSound();
        
        try {
            // 커튼 애니메이션 시작
            this.animationManager.startCurtainAnimation();

            // 대용량 데이터 처리 시 지연 렌더링
            if (studentData.length > 50) {
                // 비동기 처리로 UI 블로킹 방지
                this.setTimeoutSafe(() => {
                    this.processArrangeSeats(studentData, updateProgress);
                }, 50);
            } else {
                this.processArrangeSeats(studentData, updateProgress);
            }
        } catch (error) {
            logger.error('좌석 배치 중 오류:', error);
            if (updateProgress) {
                this.outputModule.hideProgress();
            }
            this.outputModule.showError('좌석 배치 중 오류가 발생했습니다.');
            this.animationManager.stopCurtainAnimation();
        }
    }
    
    /**
     * 좌석 배치 처리 (내부 메서드)
     */
    private processArrangeSeats(
        studentData: Array<{name: string, gender: 'M' | 'F'}>,
        updateProgress?: ((progress: number, statusMessage?: string) => void) | null
    ): void {
        try {
            if (updateProgress) {
                updateProgress(10, '학생 데이터 준비 중...');
            }

            

            // 학생 데이터를 Student 객체로 변환
            this.students = StudentModel.createMultiple(studentData);
            
            if (updateProgress) {
                updateProgress(30, '학생 데이터 변환 완료');
            }
            
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
                            
                        }
                    }
                });
            }
            
            // 남학생과 여학생 분리
            const maleStudents = this.students.filter(s => s.gender === 'M');
            const femaleStudents = this.students.filter(s => s.gender === 'F');
            
            
            
            // card-layout-container가 숨겨져 있으면 표시
            const cardContainer = document.getElementById('card-layout-container');
            if (cardContainer) {
                cardContainer.style.display = 'block';
            }
            
            // 기존 카드들에서 이름만 변경 (카드 위치는 고정)
            const seatsArea = document.getElementById('seats-area');
            if (!seatsArea) {
                this.animationManager.stopCurtainAnimation();
                this.outputModule.showError('좌석 배치 영역을 찾을 수 없습니다.');
                return;
            }
            
            // 기존 카드들 가져오기 (분단 레이블 제외)
            let existingCards = seatsArea.querySelectorAll('.student-seat-card');
            
            // 옵션 체크박스 값 읽기
            const avoidPrevSeat = (document.getElementById('avoid-prev-seat') as HTMLInputElement | null)?.checked === true;
            const avoidPrevPartner = (document.getElementById('avoid-prev-partner') as HTMLInputElement | null)?.checked === true;
            
            // 좌석 카드가 없으면 자동으로 생성
            if (existingCards.length === 0) {
                // card-layout-container가 숨겨져 있으면 표시
                if (cardContainer) {
                    cardContainer.style.display = 'block';
                }
                
                this.renderExampleCards();
                
                // renderExampleCards() 후 다시 카드 가져오기
                existingCards = seatsArea.querySelectorAll('.student-seat-card');
                if (existingCards.length === 0) {
                    this.animationManager.stopCurtainAnimation();
                    const loadingElement = document.querySelector('.loading');
                    if (loadingElement) {
                        loadingElement.remove();
                    }
                    this.outputModule.showError('좌석 배치 형태를 설정하고 학생 수를 입력해주세요.');
                    return;
                }
            }
            
            if (updateProgress) {
                updateProgress(50, '좌석 배치 준비 중...');
            }

            // 확정된 자리 이력에서 이전 좌석 및 짝꿍 정보 추출
            const { lastSeatByStudent, lastPartnerByStudent } = this.extractHistoryConstraints(avoidPrevSeat, avoidPrevPartner);
            
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
                this.storageManager.safeSetItem('lastSeatByStudent', JSON.stringify(newLastSeatByStudent));
                this.storageManager.safeSetItem('lastPartnerByStudent', JSON.stringify(newLastPartnerByStudent));
            } catch {}
            
            if (updateProgress) {
                updateProgress(90, '배치 결과 저장 중...');
            }
            
            // 로딩 제거 (showSuccess가 자동으로 로딩을 제거하지만 확실히 하기 위해)
            const loadingElement = document.querySelector('.loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            if (updateProgress) {
                updateProgress(100, '배치 완료!');
                // 프로그레스 바를 잠시 표시한 후 숨김
                this.setTimeoutSafe(() => {
                    this.outputModule.hideProgress();
            this.outputModule.showSuccess('좌석 배치가 완료되었습니다!');
                }, 500);
            } else {
                this.outputModule.showSuccess('좌석 배치가 완료되었습니다!');
            }
            
            // 읽기 전용 모드 해제 (새로운 배치 생성 시)
            this.disableReadOnlyMode();
            
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
            this.setTimeoutSafe(() => {
                this.animationManager.startFireworks();
            }, 1000);
            
            // 3초 후 커튼 열기
            this.setTimeoutSafe(() => {
                this.animationManager.openCurtain();
            }, 3000);
            
            // 자리 배치 완료 후 히스토리 저장
            this.setTimeoutSafe(() => {
                this.saveLayoutToHistory();
            }, 3100);
            
            // 배치 완료 후 화면을 맨 위로 스크롤 (스크롤 컨테이너와 윈도우 모두 시도)
            try {
                const resultContainer = document.querySelector('.result-container') as HTMLElement | null;
                const mainContent = document.querySelector('.main-content') as HTMLElement | null;
                
                // 윈도우 스크롤
                try {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch {}
                
                // DOM 요소 스크롤
                [document.documentElement, document.body, resultContainer, mainContent].forEach((target) => {
                    if (target && target instanceof HTMLElement) {
                        try {
                            if ('scrollTo' in target && typeof target.scrollTo === 'function') {
                                target.scrollTo({ top: 0, behavior: 'smooth' });
                            } else if ('scrollTop' in target && typeof target.scrollTop === 'number') {
                                target.scrollTop = 0;
                        }
                    } catch {}
                    }
                });
            } catch {}
            
        } catch (error) {
            // 로딩 제거
            const loadingElement = document.querySelector('.loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            this.animationManager.stopCurtainAnimation();
            
            logger.error('좌석 배치 중 오류:', error);
            this.outputModule.showError('좌석 배치 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
        }
    }

    /**
     * 자리 확정 처리
     */
    private handleConfirmSeats(): void {
        try {
            // 현재 좌석 배치 데이터 수집
            const seatsArea = document.getElementById('seats-area');
            if (!seatsArea) {
                this.outputModule.showError('좌석 배치 데이터를 찾을 수 없습니다.');
                return;
            }

            // 현재 배치 상태 저장
            const currentLayout: Array<{seatId: number, studentName: string, gender: 'M' | 'F'}> = [];
            const pairInfo: Array<{student1: string, student2: string}> = []; // 짝꿍 정보
            
            // 현재 배치 유형 확인
            const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
            const isPairLayout = layoutTypeInput && layoutTypeInput.value === 'pair-uniform';
            
            const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
            
            // 짝꿍 배치인 경우 짝꿍 정보 추출
            if (isPairLayout) {
                const pairContainers: HTMLElement[] = [];
                allCards.forEach(card => {
                    const parent = (card as HTMLElement).parentElement as HTMLElement;
                    const siblings = parent ? parent.querySelectorAll('.student-seat-card') : null;
                    if (siblings && siblings.length === 2 && pairContainers.indexOf(parent) === -1) {
                        pairContainers.push(parent);
                    }
                });
                
                pairContainers.forEach(container => {
                    const cards = Array.from(container.querySelectorAll('.student-seat-card')) as HTMLElement[];
                    if (cards.length === 2) {
                        const nameDiv1 = cards[0].querySelector('.student-name') as HTMLElement;
                        const nameDiv2 = cards[1].querySelector('.student-name') as HTMLElement;
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
                if (!seatIdStr) return;
                
                const seatId = parseInt(seatIdStr, 10);
                const nameDiv = card.querySelector('.student-name') as HTMLElement;
                const studentName = nameDiv?.textContent?.trim() || '';
                
                if (studentName) {
                    const gender = card.classList.contains('gender-m') ? 'M' : 'F';
                    currentLayout.push({ seatId, studentName, gender });
                }
            });

            if (currentLayout.length === 0) {
                this.outputModule.showError('확정할 자리 배치가 없습니다.');
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
            const historyItem: {
                id: string,
                date: string,
                layout: Array<{seatId: number, studentName: string, gender: 'M' | 'F'}>,
                pairInfo?: Array<{student1: string, student2: string}>,
                timestamp: number
            } = {
                id: historyId,
                date: dateString,
                layout: currentLayout,
                timestamp: now.getTime()
            };
            
            // 짝꿍 정보가 있으면 추가
            if (pairInfo.length > 0) {
                historyItem.pairInfo = pairInfo;
            }

            // 현재 선택된 반 ID 가져오기
            const currentClassId = this.classManager?.getCurrentClassId();
            if (!currentClassId) {
                this.outputModule.showWarning('반이 선택되지 않아 이력이 저장되지 않습니다. 먼저 반을 선택하세요.');
                return;
            }
            
            // 반별 이력 키: seatHistory_${classId}
            const historyKey = `seatHistory_${currentClassId}`;
            const existingHistory = this.getSeatHistory(currentClassId);
            existingHistory.unshift(historyItem); // 최신 항목을 맨 앞에 추가
            // 최대 50개까지만 저장
            if (existingHistory.length > 50) {
                existingHistory.splice(50);
            }
            
            // 저장 실행
            const saved = this.storageManager.safeSetItem(historyKey, JSON.stringify(existingHistory));
            if (!saved) {
                logger.error('이력 저장 실패:', { historyKey, historyLength: existingHistory.length });
                this.outputModule.showError('이력 저장에 실패했습니다. 브라우저 저장소를 확인해주세요.');
                return;
            }
            
            // 저장 확인: 저장 직후 읽어서 검증
            const verifyHistory = this.getSeatHistory(currentClassId);
            if (verifyHistory.length === 0 || verifyHistory[0].id !== historyItem.id) {
                logger.error('이력 저장 검증 실패:', { 
                    saved: saved, 
                    verifyLength: verifyHistory.length,
                    expectedId: historyItem.id,
                    actualId: verifyHistory[0]?.id 
                });
                this.outputModule.showError('이력 저장 후 검증에 실패했습니다. 다시 시도해주세요.');
                return;
            }
            
            logger.info('✅ 이력 저장 성공:', { 
                historyKey, 
                historyLength: verifyHistory.length,
                historyId: historyItem.id,
                date: historyItem.date 
            });

            // 드롭다운 메뉴 업데이트
            this.updateHistoryDropdown();

            // 반이 선택된 경우 Firebase에 자리 배치도 저장
            if (this.classManager && this.classManager.getCurrentClassId()) {
                // 현재 seats와 students를 화면 데이터로 업데이트한 후 저장
                this.updateSeatsAndStudentsFromLayout(currentLayout);
                this.classManager.saveCurrentLayout().then((saved) => {
                    if (saved) {
                        logger.info('✅ 자리 확정 시 Firebase에 자동 저장 완료');
                    } else {
                        logger.warn('⚠️ 자리 확정 시 Firebase 저장 실패');
                    }
                }).catch((error) => {
                    logger.error('❌ 자리 확정 시 Firebase 저장 실패:', error);
                });
            }

            // 이쁘고 가독성 있는 메시지 생성 (HTML 형식)
            const successMessage = `✅ 확정된 자리 이력에 기록하였습니다.<br><br>💾 <strong>'저장하기'</strong>를 클릭하면 최종 저장됩니다.<br><br>📅 날짜: <strong>${dateString}</strong>`;
            
            // OutputModule의 showSuccess는 innerHTML을 사용하므로 HTML 지원
            // 하지만 기본적으로 textContent를 사용하므로, 직접 메시지 요소를 생성
            const container = (this.outputModule as any).container;
            if (container) {
                // 기존 메시지 제거
                const existingMessage = container.querySelector('.output-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                // 새 메시지 생성
                const messageElement = document.createElement('div');
                messageElement.className = 'output-message success';
                messageElement.innerHTML = successMessage;
                messageElement.style.cssText = `
                    padding: 18px;
                    margin: 20px 0;
                    border-radius: 8px;
                    font-weight: 500;
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                    line-height: 1.8;
                    font-size: 1.05em;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                `;
                messageElement.setAttribute('role', 'status');
                messageElement.setAttribute('aria-live', 'polite');
                messageElement.setAttribute('aria-atomic', 'true');
                messageElement.setAttribute('aria-label', '확정된 자리 이력에 기록되었습니다');
                
                container.appendChild(messageElement);
                
                // 7초 후 자동 제거 (메시지가 길어서 조금 더 길게)
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.remove();
                    }
                }, 7000);
            } else {
                // 폴백: 기본 showSuccess 사용
                this.outputModule.showSuccess(`✅ 확정된 자리 이력에 기록하였습니다. 💾 '저장하기'를 클릭하면 최종 저장됩니다. 📅 날짜: ${dateString}`);
            }
        } catch (error) {
            logger.error('자리 확정 중 오류:', error);
            this.outputModule.showError('자리 확정 중 오류가 발생했습니다.');
        }
    }

    /**
     * 자리 확정 시 수집한 데이터로 현재 seats와 students 업데이트
     */
    private updateSeatsAndStudentsFromLayout(
        currentLayout: Array<{seatId: number, studentName: string, gender: 'M' | 'F'}>
    ): void {
        try {
            if (!currentLayout || currentLayout.length === 0) {
                logger.warn('자리 확정 데이터가 비어있습니다.');
                return;
            }

            // 학생 목록 생성/업데이트
            const studentMap = new Map<string, Student>();
            currentLayout.forEach(layoutItem => {
                if (layoutItem.studentName && !studentMap.has(layoutItem.studentName)) {
                    const student = StudentModel.create(layoutItem.studentName, layoutItem.gender);
                    studentMap.set(layoutItem.studentName, student);
                }
            });
            
            this.students = Array.from(studentMap.values());
            
            // 좌석 목록 업데이트 (기존 seats의 position 정보 유지)
            const seatIds = currentLayout.map(l => l.seatId).filter(id => id > 0);
            const maxSeatId = seatIds.length > 0 ? Math.max(...seatIds) : 0;
            const updatedSeats: Seat[] = [];
            
            // 기존 seats에서 position 정보 가져오기
            const existingSeatMap = new Map<number, Seat>();
            if (this.seats && Array.isArray(this.seats)) {
                this.seats.forEach(seat => {
                    if (seat && seat.id) {
                        existingSeatMap.set(seat.id, seat);
                    }
                });
            }
            
            // maxSeatId가 0이면 빈 배열 반환
            if (maxSeatId === 0) {
                logger.warn('유효한 좌석 ID가 없어 seats를 초기화했습니다.');
                this.seats = [];
                return;
            }
            
            for (let i = 1; i <= maxSeatId; i++) {
                const layoutItem = currentLayout.find(l => l.seatId === i);
                const existingSeat = existingSeatMap.get(i);
                
                if (layoutItem && layoutItem.studentName) {
                    // 학생이 배치된 좌석
                    const student = studentMap.get(layoutItem.studentName);
                    if (student) {
                        const seat: Seat = {
                            id: i,
                            position: existingSeat?.position || { x: 0, y: 0 },
                            studentId: student.id,
                            studentName: student.name,
                            isFixed: existingSeat?.isFixed || false,
                            isActive: existingSeat?.isActive !== false
                        };
                        updatedSeats.push(seat);
                    }
                } else {
                    // 빈 좌석
                    const seat: Seat = {
                        id: i,
                        position: existingSeat?.position || { x: 0, y: 0 },
                        isFixed: existingSeat?.isFixed || false,
                        isActive: existingSeat?.isActive !== false
                    };
                    updatedSeats.push(seat);
                }
            }
            
            this.seats = updatedSeats;
            
            logger.info('자리 확정 데이터로 seats와 students 업데이트 완료:', {
                seatsCount: this.seats.length,
                studentsCount: this.students.length
            });
        } catch (error) {
            logger.error('자리 확정 데이터 업데이트 중 오류:', error);
            // 오류 발생 시에도 프로그램이 계속 실행되도록 함
        }
    }

    /**
     * 좌석 이력 가져오기 (반별로 관리, 최신순으로 정렬)
     * @param classId 반 ID (없으면 현재 선택된 반의 ID 사용)
     */
    private getSeatHistory(classId?: string): SeatHistoryItem[] {
        try {
            // 반 ID가 없으면 현재 선택된 반 ID 사용
            const targetClassId = classId || this.classManager?.getCurrentClassId();
            
            // 반이 선택되지 않았으면 빈 배열 반환
            if (!targetClassId) {
                return [];
            }
            
            // 반별 이력 키: seatHistory_${classId}
            const historyKey = `seatHistory_${targetClassId}`;
            const historyStr = this.storageManager.safeGetItem(historyKey);
            if (!historyStr) return [];
            
            // JSON 파싱 시도 (데이터 손상 처리)
            let history: SeatHistoryItem[];
            try {
                history = JSON.parse(historyStr) as SeatHistoryItem[];
                if (!Array.isArray(history)) {
                    return [];
                }
            } catch (parseError) {
                // 데이터 손상 시 저장소에서 제거하고 빈 배열 반환
                try {
                    localStorage.removeItem(historyKey);
                } catch {}
                return [];
            }
            // 최신 항목이 앞에 오도록 timestamp 기준 내림차순 정렬
            return history.sort((a, b) => {
                return (b.timestamp || 0) - (a.timestamp || 0);
            });
        } catch {
            return [];
        }
    }

    /**
     * 확정된 자리 이력에서 이전 좌석 및 짝꿍 제약 조건 추출
     */
    private extractHistoryConstraints(avoidPrevSeat: boolean, avoidPrevPartner: boolean): {
        lastSeatByStudent: Record<string, number>,
        lastPartnerByStudent: Record<string, string>
    } {
        const lastSeatByStudent: Record<string, number> = {};
        const lastPartnerByStudent: Record<string, string> = {};

        if (!avoidPrevSeat && !avoidPrevPartner) {
            return { lastSeatByStudent, lastPartnerByStudent };
        }

        // 확정된 자리 이력 가져오기
        const history = this.getSeatHistory();
        if (history.length === 0) {
            return { lastSeatByStudent, lastPartnerByStudent };
        }

        // 현재 배치 유형 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
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
                } else {
                    // pairInfo가 없으면 좌석 번호 기반으로 추론 (하위 호환성)
                    const seatGroups: {[seatId: number]: Array<{studentName: string, seatId: number}>} = {};
                    
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
    private updateHistoryDropdown(): void {
        this.uiManager.updateHistoryDropdown();
    }

    /**
     * 이력 항목 삭제 (반별로 관리)
     */
    private deleteHistoryItem(historyId: string): void {
        if (!confirm('이 자리 이력을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const currentClassId = this.classManager?.getCurrentClassId();
            if (!currentClassId) {
                this.outputModule.showError('반이 선택되지 않았습니다.');
                return;
            }
            
            const historyKey = `seatHistory_${currentClassId}`;
            const history = this.getSeatHistory(currentClassId);
            const filteredHistory = history.filter(item => item.id !== historyId);
            this.storageManager.safeSetItem(historyKey, JSON.stringify(filteredHistory));
            
            // 드롭다운 메뉴 업데이트
            this.updateHistoryDropdown();
            
            // 드롭다운이 열려있으면 닫기
            const historyContent = document.getElementById('history-dropdown-content');
            if (historyContent) {
                historyContent.style.display = 'none';
            }
        } catch (error) {
            logger.error('이력 삭제 중 오류:', error);
            this.outputModule.showError('이력 삭제 중 오류가 발생했습니다.');
        }
    }

    /**
     * 이력 항목 불러오기 (반별로 관리)
     */
    private loadHistoryItem(historyId: string): void {
        try {
            const currentClassId = this.classManager?.getCurrentClassId();
            if (!currentClassId) {
                this.outputModule.showError('반이 선택되지 않았습니다.');
                return;
            }
            
            const history = this.getSeatHistory(currentClassId);
            const historyItem = history.find(item => item.id === historyId);

            if (!historyItem) {
                this.outputModule.showError('이력을 찾을 수 없습니다.');
                return;
            }

            // card-layout-container가 숨겨져 있으면 표시
            const cardContainer = document.getElementById('card-layout-container');
            if (cardContainer) {
                cardContainer.style.display = 'block';
            }

            // 좌석 배치 복원
            const seatsArea = document.getElementById('seats-area');
            if (!seatsArea) {
                this.outputModule.showError('좌석 배치 영역을 찾을 수 없습니다.');
                return;
            }

            // 모든 카드 초기화
            let allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
            
            // 좌석 카드가 없으면 미리보기 카드 생성
            if (allCards.length === 0) {
                // 이력에서 필요한 좌석 수 계산
                const maxSeatId = Math.max(...historyItem.layout.map(item => item.seatId), 0);
                const totalSeats = maxSeatId;
                
                // 학생 수 계산 (남학생 + 여학생)
                const maleCount = historyItem.layout.filter(item => item.gender === 'M').length;
                const femaleCount = historyItem.layout.filter(item => item.gender === 'F').length;
                const totalStudents = maleCount + femaleCount;
                
                // 기본값으로 미리보기 카드 생성
                if (totalSeats > 0) {
                    // 남학생/여학생 수 입력 필드 설정
                    const maleInput = document.getElementById('male-students') as HTMLInputElement;
                    const femaleInput = document.getElementById('female-students') as HTMLInputElement;
                    if (maleInput) maleInput.value = maleCount.toString();
                    if (femaleInput) femaleInput.value = femaleCount.toString();
                    
                    // 미리보기 카드 생성 (renderExampleCards 호출)
                    this.renderExampleCards();
                    
                    // 카드 다시 가져오기
                    allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
                }
            }
            
            // 모든 카드 초기화
            allCards.forEach(card => {
                const nameDiv = card.querySelector('.student-name') as HTMLElement;
                if (nameDiv) {
                    nameDiv.textContent = '';
                }
            });

            // 이력 데이터로 복원
            let restoredCount = 0;
            historyItem.layout.forEach(({ seatId, studentName }) => {
                const card = seatsArea.querySelector(`[data-seat-id="${seatId}"]`) as HTMLElement;
                if (card) {
                    const nameDiv = card.querySelector('.student-name') as HTMLElement;
                    if (nameDiv) {
                        nameDiv.textContent = studentName;
                        restoredCount++;
                    }
                } else {
                    logger.warn(`좌석 카드를 찾을 수 없습니다: seatId=${seatId}, studentName=${studentName}`);
                }
            });
            
            if (restoredCount === 0) {
                logger.error('이력 복원 실패: 복원된 좌석이 없습니다.');
                this.outputModule.showError('이력 복원에 실패했습니다. 좌석 카드를 찾을 수 없습니다.');
                return;
            }
            
            logger.info(`이력 복원 완료: ${restoredCount}개 좌석 복원됨`);

            // 읽기 전용 모드 활성화
            this.isReadOnlyMode = true;
            
            // 모든 좌석 카드의 드래그 비활성화
            allCards.forEach(card => {
                card.setAttribute('draggable', 'false');
                card.style.cursor = 'default';
                card.style.opacity = '0.8';
                card.classList.add('read-only-seat');
            });
            
            // "자리 배치하기" 버튼 비활성화
            const arrangeBtn = document.getElementById('arrange-seats');
            if (arrangeBtn) {
                (arrangeBtn as HTMLButtonElement).disabled = true;
                arrangeBtn.style.opacity = '0.5';
                arrangeBtn.style.cursor = 'not-allowed';
                arrangeBtn.title = '확정된 자리 이력은 수정할 수 없습니다.';
            }
            
            // 사이드바 옵션들 비활성화
            this.disableSidebarOptions();
            
            // 읽기 전용 모드 표시 배지 추가
            const readOnlyBadge = document.createElement('div');
            readOnlyBadge.id = 'read-only-badge';
            readOnlyBadge.textContent = '📋 읽기 전용 (확정된 자리 이력)';
            readOnlyBadge.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #ff9800;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 0.9em;
                font-weight: bold;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease;
            `;
            
            // 기존 배지 제거
            const existingBadge = document.getElementById('read-only-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            document.body.appendChild(readOnlyBadge);

            // 드롭다운 닫기
            const dropdown = document.getElementById('history-dropdown-content');
            if (dropdown) {
                dropdown.style.display = 'none';
            }

            // 자리 배치도 액션 버튼들 표시
            const actionButtons = document.getElementById('layout-action-buttons');
            if (actionButtons) {
                actionButtons.style.display = 'block';
            }

            this.outputModule.showSuccess(`${historyItem.date}의 자리 배치를 불러왔습니다. (읽기 전용)`);
        } catch (error) {
            logger.error('이력 불러오기 중 오류:', error);
            this.outputModule.showError('이력을 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 사이드바 옵션들 비활성화 (읽기 전용 모드)
     */
    private disableSidebarOptions(): void {
        // 옵션1: 좌석 배치 형태
        const layoutTypeInputs = document.querySelectorAll('input[name="layout-type"]') as NodeListOf<HTMLInputElement>;
        layoutTypeInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        });
        
        // 서브 옵션들
        const singleModeInputs = document.querySelectorAll('input[name="single-mode"]') as NodeListOf<HTMLInputElement>;
        singleModeInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        });
        
        const pairModeInputs = document.querySelectorAll('input[name="pair-mode"]') as NodeListOf<HTMLInputElement>;
        pairModeInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        });
        
        const groupSizeInputs = document.querySelectorAll('input[name="group-size"]') as NodeListOf<HTMLInputElement>;
        groupSizeInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        });
        
        const reverseGenderOrder = document.getElementById('reverse-gender-order') as HTMLInputElement;
        if (reverseGenderOrder) {
            reverseGenderOrder.disabled = true;
            reverseGenderOrder.style.opacity = '0.5';
            reverseGenderOrder.style.cursor = 'not-allowed';
        }
        
        const groupGenderMix = document.getElementById('group-gender-mix') as HTMLInputElement;
        if (groupGenderMix) {
            groupGenderMix.disabled = true;
            groupGenderMix.style.opacity = '0.5';
            groupGenderMix.style.cursor = 'not-allowed';
        }
        
        const genderPairing = document.getElementById('gender-pairing') as HTMLInputElement;
        if (genderPairing) {
            genderPairing.disabled = true;
            genderPairing.style.opacity = '0.5';
            genderPairing.style.cursor = 'not-allowed';
        }
        
        // 옵션2: 학생 자리 수
        const maleStudents = document.getElementById('male-students') as HTMLInputElement;
        if (maleStudents) {
            maleStudents.disabled = true;
            maleStudents.style.opacity = '0.5';
            maleStudents.style.cursor = 'not-allowed';
        }
        
        const femaleStudents = document.getElementById('female-students') as HTMLInputElement;
        if (femaleStudents) {
            femaleStudents.disabled = true;
            femaleStudents.style.opacity = '0.5';
            femaleStudents.style.cursor = 'not-allowed';
        }
        
        // 옵션3: 분단 개수
        const numberOfPartitions = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (numberOfPartitions) {
            numberOfPartitions.disabled = true;
            numberOfPartitions.style.opacity = '0.5';
            numberOfPartitions.style.cursor = 'not-allowed';
        }
        
        // 옵션4: 맞춤 구성
        const customModeInputs = document.querySelectorAll('input[name="custom-mode-2"]') as NodeListOf<HTMLInputElement>;
        customModeInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        });
        
        // 학생 이름 입력하기 버튼
        const createStudentTable = document.getElementById('create-student-table') as HTMLButtonElement;
        if (createStudentTable) {
            createStudentTable.disabled = true;
            createStudentTable.style.opacity = '0.5';
            createStudentTable.style.cursor = 'not-allowed';
            createStudentTable.title = '확정된 자리 이력은 수정할 수 없습니다.';
        }
        
        // 옵션 설정 기억하기 버튼
        const saveOptions = document.getElementById('save-options') as HTMLButtonElement;
        if (saveOptions) {
            saveOptions.disabled = true;
            saveOptions.style.opacity = '0.5';
            saveOptions.style.cursor = 'not-allowed';
        }
        
        // 초기화 버튼 (읽기 전용 모드에서는 비활성화하지 않음 - 사용자가 초기화할 수 있도록)
        
        // 자리 배치하기 섹션의 체크박스들 (출력 영역)
        const avoidPrevSeat = document.getElementById('avoid-prev-seat') as HTMLInputElement;
        if (avoidPrevSeat) {
            avoidPrevSeat.disabled = true;
            avoidPrevSeat.style.opacity = '0.5';
            avoidPrevSeat.style.cursor = 'not-allowed';
        }
        
        const avoidPrevPartner = document.getElementById('avoid-prev-partner') as HTMLInputElement;
        if (avoidPrevPartner) {
            avoidPrevPartner.disabled = true;
            avoidPrevPartner.style.opacity = '0.5';
            avoidPrevPartner.style.cursor = 'not-allowed';
        }
    }

    /**
     * 사이드바 옵션들 활성화 (읽기 전용 모드 해제)
     */
    private enableSidebarOptions(): void {
        // 옵션1: 좌석 배치 형태
        const layoutTypeInputs = document.querySelectorAll('input[name="layout-type"]') as NodeListOf<HTMLInputElement>;
        layoutTypeInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.cursor = '';
        });
        
        // 서브 옵션들
        const singleModeInputs = document.querySelectorAll('input[name="single-mode"]') as NodeListOf<HTMLInputElement>;
        singleModeInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.cursor = '';
        });
        
        const pairModeInputs = document.querySelectorAll('input[name="pair-mode"]') as NodeListOf<HTMLInputElement>;
        pairModeInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.cursor = '';
        });
        
        const groupSizeInputs = document.querySelectorAll('input[name="group-size"]') as NodeListOf<HTMLInputElement>;
        groupSizeInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.cursor = '';
        });
        
        const reverseGenderOrder = document.getElementById('reverse-gender-order') as HTMLInputElement;
        if (reverseGenderOrder) {
            reverseGenderOrder.disabled = false;
            reverseGenderOrder.style.opacity = '1';
            reverseGenderOrder.style.cursor = '';
        }
        
        const groupGenderMix = document.getElementById('group-gender-mix') as HTMLInputElement;
        if (groupGenderMix) {
            groupGenderMix.disabled = false;
            groupGenderMix.style.opacity = '1';
            groupGenderMix.style.cursor = '';
        }
        
        const genderPairing = document.getElementById('gender-pairing') as HTMLInputElement;
        if (genderPairing) {
            genderPairing.disabled = false;
            genderPairing.style.opacity = '1';
            genderPairing.style.cursor = '';
        }
        
        // 옵션2: 학생 자리 수
        const maleStudents = document.getElementById('male-students') as HTMLInputElement;
        if (maleStudents) {
            maleStudents.disabled = false;
            maleStudents.style.opacity = '1';
            maleStudents.style.cursor = '';
        }
        
        const femaleStudents = document.getElementById('female-students') as HTMLInputElement;
        if (femaleStudents) {
            femaleStudents.disabled = false;
            femaleStudents.style.opacity = '1';
            femaleStudents.style.cursor = '';
        }
        
        // 옵션3: 분단 개수
        const numberOfPartitions = document.getElementById('number-of-partitions') as HTMLInputElement;
        if (numberOfPartitions) {
            numberOfPartitions.disabled = false;
            numberOfPartitions.style.opacity = '1';
            numberOfPartitions.style.cursor = '';
        }
        
        // 옵션4: 맞춤 구성
        const customModeInputs = document.querySelectorAll('input[name="custom-mode-2"]') as NodeListOf<HTMLInputElement>;
        customModeInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.cursor = '';
        });
        
        // 학생 이름 입력하기 버튼
        const createStudentTable = document.getElementById('create-student-table') as HTMLButtonElement;
        if (createStudentTable) {
            createStudentTable.disabled = false;
            createStudentTable.style.opacity = '1';
            createStudentTable.style.cursor = 'pointer';
            createStudentTable.title = '';
        }
        
        // 옵션 설정 기억하기 버튼
        const saveOptions = document.getElementById('save-options') as HTMLButtonElement;
        if (saveOptions) {
            saveOptions.disabled = false;
            saveOptions.style.opacity = '1';
            saveOptions.style.cursor = 'pointer';
        }
        
        // 자리 배치하기 섹션의 체크박스들 (출력 영역)
        const avoidPrevSeat = document.getElementById('avoid-prev-seat') as HTMLInputElement;
        if (avoidPrevSeat) {
            avoidPrevSeat.disabled = false;
            avoidPrevSeat.style.opacity = '1';
            avoidPrevSeat.style.cursor = '';
        }
        
        const avoidPrevPartner = document.getElementById('avoid-prev-partner') as HTMLInputElement;
        if (avoidPrevPartner) {
            avoidPrevPartner.disabled = false;
            avoidPrevPartner.style.opacity = '1';
            avoidPrevPartner.style.cursor = '';
        }
    }

    /**
     * 읽기 전용 모드 해제
     */
    private disableReadOnlyMode(): void {
        if (!this.isReadOnlyMode) return;
        
        this.isReadOnlyMode = false;
        
        // 모든 좌석 카드의 드래그 활성화
        const seatsArea = document.getElementById('seats-area');
        if (seatsArea) {
            const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
            allCards.forEach(card => {
                card.setAttribute('draggable', 'true');
                card.style.cursor = 'grab';
                card.style.opacity = '1';
                card.classList.remove('read-only-seat');
            });
        }
        
        // "자리 배치하기" 버튼 활성화
        const arrangeBtn = document.getElementById('arrange-seats');
        if (arrangeBtn) {
            (arrangeBtn as HTMLButtonElement).disabled = false;
            arrangeBtn.style.opacity = '1';
            arrangeBtn.style.cursor = 'pointer';
            arrangeBtn.title = '';
        }
        
        // 사이드바 옵션들 활성화
        this.enableSidebarOptions();
        
        // 읽기 전용 모드 표시 배지 제거
        const readOnlyBadge = document.getElementById('read-only-badge');
        if (readOnlyBadge) {
            readOnlyBadge.remove();
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
     * 자리 배치도 저장 처리
     */
    private handleSaveLayout(): void {
        this.printExportManager.saveLayoutAsHtml();
    }


    /**
     * 뷰어 모드 활성화 (자리 배치도만 표시)
     */
    private enableViewerMode(viewData: string): void {
        try {
            // 입력 데이터 길이 검증 (보안)
            if (!viewData || viewData.length > 10000) {
                throw new Error('공유 데이터가 유효하지 않습니다.');
            }
            
            // URL-safe Base64 디코딩
            const base64Data = viewData
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            
            // 패딩 추가 (필요한 경우)
            const padding = base64Data.length % 4;
            const paddedData = padding ? base64Data + '='.repeat(4 - padding) : base64Data;
            
            // Base64 디코딩
            let decodedData: string;
            try {
                decodedData = decodeURIComponent(escape(atob(paddedData)));
            } catch (e) {
                try {
                    decodedData = decodeURIComponent(escape(atob(viewData)));
                } catch (e2) {
                    throw new Error('공유 데이터 디코딩에 실패했습니다.');
                }
            }
            
            // JSON 파싱
            let shareInfo: ShareInfo;
            try {
                shareInfo = JSON.parse(decodedData) as ShareInfo;
            } catch (e) {
                throw new Error('공유 데이터 형식이 올바르지 않습니다.');
            }
            
            // 데이터 검증
            if (!this.validateSharedData(shareInfo)) {
                throw new Error('공유 데이터 검증에 실패했습니다.');
            }
            
            // 만료 시간 확인 (36진수로 저장된 경우 파싱)
            if (shareInfo.e) {
                let expiresAt: number;
                if (typeof shareInfo.e === 'string') {
                    // 36진수로 저장된 경우
                    expiresAt = parseInt(shareInfo.e, 36);
                } else {
                    // 숫자로 저장된 경우 (이전 형식 호환)
                    expiresAt = shareInfo.e as number;
                }
                if (Date.now() > expiresAt) {
                    throw new Error('이 공유 링크는 만료되었습니다.');
                }
            }
            
            // 비밀번호 확인
            if (shareInfo.p) {
                const passwordHash = shareInfo.p as string;
                const userPassword = prompt('이 공유 링크는 비밀번호가 필요합니다. 비밀번호를 입력하세요:');
                if (!userPassword) {
                    throw new Error('비밀번호가 필요합니다.');
                }
                
                // 비밀번호 해시 계산
                let hash = 0;
                for (let i = 0; i < userPassword.length; i++) {
                    const char = userPassword.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                const userPasswordHash = Math.abs(hash).toString(36);
                
                if (userPasswordHash !== passwordHash) {
                    throw new Error('비밀번호가 올바르지 않습니다.');
                }
            }
            
            // 학생 정보 추출 (새로운 압축 형식 지원)
            const studentDataList = shareInfo.s || shareInfo.students || [];
            const nameArray = shareInfo.n || shareInfo.names || [];
            const gridColumns = shareInfo.l || shareInfo.layout || '';
            
            // 만료 시간 처리 (상대 시간을 절대 시간으로 변환)
            if (shareInfo.e && typeof shareInfo.e === 'number') {
                // 상대 시간(시간 단위)인 경우 절대 시간으로 변환
                if (shareInfo.e < 1000000000000) { // 밀리초가 아닌 경우 (상대 시간)
                    const expiresAt = Date.now() + (shareInfo.e * 60 * 60 * 1000);
                    shareInfo.e = expiresAt;
                }
            }
            
            // 학생 데이터 생성 (새로운 압축 형식: [이름ID, 성별])
            this.students = studentDataList.map((student: SharedStudentData, index: number) => {
                if (Array.isArray(student)) {
                    // 새로운 형식: [이름ID, 성별]
                    if (nameArray.length > 0 && typeof student[0] === 'number') {
                        const nameId = student[0] as number;
                        const name = nameArray[nameId] || `학생${index + 1}`;
                        const gender = (student[1] === 'F' ? 'F' : 'M') as 'M' | 'F';
                        return {
                            id: index + 1,
                            name: String(name).trim() || `학생${index + 1}`,
                            gender: gender
                        };
                    } else {
                        // 이전 형식: [이름, 성별]
                        const name = String(student[0] || '').trim();
                        const gender = (student[1] === 'F' ? 'F' : 'M') as 'M' | 'F';
                        return {
                            id: index + 1,
                            name: name || `학생${index + 1}`,
                            gender: gender
                        };
                    }
                } else {
                    // 객체 형식: {name: string, gender: 'M' | 'F'}
                    const name = String(student.name || '').trim();
                    const gender = (student.gender === 'F' ? 'F' : 'M') as 'M' | 'F';
                    return {
                        id: index + 1,
                        name: name || `학생${index + 1}`,
                        gender: gender
                    };
                }
            });
            
            // 성별별 학생 수 계산
            let maleCount = 0;
            let femaleCount = 0;
            this.students.forEach(student => {
                if (student.gender === 'M') {
                    maleCount++;
                } else {
                    femaleCount++;
                }
            });
            
            // 사이드바 입력 업데이트 (숨겨져 있지만 데이터는 설정)
            const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
            const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
            if (maleCountInput) maleCountInput.value = maleCount.toString();
            if (femaleCountInput) femaleCountInput.value = femaleCount.toString();
            
            // 미리보기 업데이트 (좌석 카드 생성)
            this.updatePreviewForGenderCounts();
            
            // 자리 배치 렌더링 (학생 테이블 생성 없이 직접 렌더링)
            this.setTimeoutSafe(() => {
                // 좌석 영역 가져오기
                const seatsArea = document.getElementById('seats-area');
                if (!seatsArea) {
                    throw new Error('좌석 영역을 찾을 수 없습니다.');
                }
                
                // 그리드 컬럼 설정
                if (gridColumns) {
                    seatsArea.style.gridTemplateColumns = gridColumns;
                }
                
                // 좌석 카드가 없으면 예시 카드 렌더링
                const existingCards = seatsArea.querySelectorAll('.student-seat-card');
                if (existingCards.length === 0) {
                    this.renderExampleCards();
                }
                
                // 학생들을 좌석에 배치 (더 긴 대기 시간)
                this.setTimeoutSafe(() => {
                    const cards = seatsArea.querySelectorAll('.student-seat-card');
                    
                    // 카드가 없으면 다시 렌더링 시도
                    if (cards.length === 0) {
                        logger.warn('좌석 카드가 없습니다. 다시 렌더링 시도...');
                        this.renderExampleCards();
                        this.setTimeoutSafe(() => {
                            this.updateSeatsFromCards();
                            // 인쇄용 화면 표시
                            this.setTimeoutSafe(() => {
                                this.showPrintView();
                            }, 500);
                        }, 500);
                        return;
                    }
                    
                    this.updateSeatsFromCards();
                    // 인쇄용 화면 표시 (이미지 변환 대신)
                    this.setTimeoutSafe(() => {
                        this.showPrintView();
                    }, 500);
                }, 500);
            }, 500);
            
        } catch (error) {
            logger.error('뷰어 모드 로드 실패:', error);
            // 안전한 에러 메시지 표시 (innerHTML 대신 textContent 사용)
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'padding: 20px; text-align: center;';
            const h2 = document.createElement('h2');
            h2.textContent = '자리 배치도를 불러올 수 없습니다.';
            const p = document.createElement('p');
            p.textContent = '공유 링크가 유효하지 않거나 만료되었을 수 있습니다.';
            errorDiv.appendChild(h2);
            errorDiv.appendChild(p);
            document.body.innerHTML = '';
            document.body.appendChild(errorDiv);
        }
    }
    
    /**
     * 좌석 카드에서 학생 정보 업데이트
     */
    private updateSeatsFromCards(): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;
        
        const cards = seatsArea.querySelectorAll('.student-seat-card');
        let cardIndex = 0;
        
        this.students.forEach((student) => {
            if (cardIndex < cards.length) {
                const card = cards[cardIndex] as HTMLElement;
                const nameDiv = card.querySelector('.student-name') as HTMLElement;
                if (nameDiv) {
                    nameDiv.textContent = student.name;
                    // 성별 클래스 설정
                    card.classList.remove('gender-m', 'gender-f');
                    card.classList.add(`gender-${student.gender.toLowerCase()}`);
                }
                cardIndex++;
            }
        });
        
        // 빈 좌석 초기화
        for (let i = cardIndex; i < cards.length; i++) {
            const card = cards[i] as HTMLElement;
            const nameDiv = card.querySelector('.student-name') as HTMLElement;
            if (nameDiv) {
                nameDiv.textContent = '';
            }
        }
    }
    
    /**
     * 인쇄용 화면 표시 (QR 스캔 시 사용)
     */
    private showPrintView(): void {
        try {
            // UI 숨기기
            this.setupViewerModeUI();
            
            // 잠시 대기 (렌더링 완료 보장)
            setTimeout(() => {
                // classroom-layout 가져오기
                const classroomLayout = document.getElementById('classroom-layout');
                if (!classroomLayout) {
                    throw new Error('교실 레이아웃을 찾을 수 없습니다.');
                }
                
                // 모든 UI 숨기고 인쇄용 화면만 표시
                document.body.innerHTML = '';
                document.body.style.cssText = 'margin: 0; padding: 0; background: #f5f5f5; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; min-height: 100vh; overflow-x: hidden;';
                
                // 상단 컨트롤 바 (인쇄 버튼)
                const controlBar = document.createElement('div');
                controlBar.style.cssText = 'width: 100%; background: #fff; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: center; gap: 10px; position: sticky; top: 0; z-index: 1000;';
                
                const printBtn = document.createElement('button');
                printBtn.textContent = '🖨️ 인쇄하기';
                printBtn.style.cssText = 'padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; font-weight: bold;';
                printBtn.onclick = () => window.print();
                
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '✕ 닫기';
                closeBtn.style.cssText = 'padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;';
                closeBtn.onclick = () => window.location.href = window.location.pathname;
                
                controlBar.appendChild(printBtn);
                controlBar.appendChild(closeBtn);
                
                // 컨테이너 생성
                const container = document.createElement('div');
                container.style.cssText = 'width: 100%; max-width: 100%; padding: 20px; box-sizing: border-box; flex: 1;';
                
                // classroom-layout 복사 및 스타일 조정
                const printLayout = classroomLayout.cloneNode(true) as HTMLElement;
                printLayout.style.cssText = `
                    min-height: auto;
                    background: #ffffff;
                    border: 2px solid #ddd;
                    border-radius: 10px;
                    padding: 20px;
                    position: relative;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    margin: 0 auto;
                `;
                
                // 스마트폰 화면에 맞게 조절
                const viewportWidth = window.innerWidth || 375;
                const maxContentWidth = Math.min(viewportWidth - 40, 800);
                printLayout.style.maxWidth = `${maxContentWidth}px`;
                
                // 인쇄용 화면에서 좌석 카드 크기를 반응형으로 조절
                const style = document.createElement('style');
                style.id = 'print-view-responsive-style';
                
                // 기존 그리드 레이아웃 가져오기
                const seatsArea = printLayout.querySelector('#seats-area') as HTMLElement;
                const originalGridTemplate = seatsArea ? window.getComputedStyle(seatsArea).gridTemplateColumns : '';
                
                // 화면 크기에 따라 카드 크기 계산
                const calcViewportWidth = window.innerWidth || 375;
                const containerPadding = 40; // 좌우 패딩
                const availableWidth = Math.min(calcViewportWidth - containerPadding, maxContentWidth - containerPadding);
                
                // 카드 개수 추정 (기존 그리드 컬럼 수 유지)
                const cardCount = seatsArea ? seatsArea.querySelectorAll('.student-seat-card').length : 0;
                let estimatedColumns = 6; // 기본값
                
                if (originalGridTemplate && originalGridTemplate !== 'none') {
                    // 기존 그리드 컬럼 수 추출
                    const match = originalGridTemplate.match(/repeat\((\d+)/);
                    if (match) {
                        estimatedColumns = parseInt(match[1], 10);
                    }
                }
                
                // 카드 크기 계산 (그리드 컬럼 수 유지하면서 화면에 맞게)
                const gap = 8;
                const cardSize = Math.floor((availableWidth - (gap * (estimatedColumns - 1))) / estimatedColumns);
                const minCardSize = Math.max(50, cardSize); // 최소 50px
                const maxCardSize = 120; // 최대 120px
                const finalCardSize = Math.min(maxCardSize, Math.max(minCardSize, cardSize));
                
                style.textContent = `
                    /* 인쇄용 화면에서 좌석 카드 반응형 크기 조절 */
                    .student-seat-card {
                        width: ${finalCardSize}px !important;
                        height: ${finalCardSize}px !important;
                        min-width: ${finalCardSize}px !important;
                        max-width: ${finalCardSize}px !important;
                        flex-shrink: 0 !important;
                    }
                    
                    /* 좌석 영역 그리드 간격 조절 */
                    #seats-area {
                        gap: ${gap}px !important;
                    }
                    
                    /* 작은 화면에서는 더 작은 카드 */
                    @media (max-width: 480px) {
                        .student-seat-card {
                            width: 50px !important;
                            height: 50px !important;
                            min-width: 50px !important;
                            max-width: 50px !important;
                            padding: 3px !important;
                        }
                        
                        .student-name {
                            font-size: 0.75em !important;
                        }
                        
                        #seats-area {
                            gap: 5px !important;
                        }
                    }
                    
                    /* 중간 화면 */
                    @media (min-width: 481px) and (max-width: 768px) {
                        .student-seat-card {
                            width: 70px !important;
                            height: 70px !important;
                            min-width: 70px !important;
                            max-width: 70px !important;
                        }
                        
                        #seats-area {
                            gap: 6px !important;
                        }
                    }
                `;
                document.head.appendChild(style);
                
                container.appendChild(printLayout);
                document.body.appendChild(controlBar);
                document.body.appendChild(container);
                
                logger.info('인쇄용 화면 표시 완료');
            }, 500);
        } catch (error) {
            logger.error('인쇄용 화면 표시 실패:', error);
            // 실패 시 에러 메시지 표시
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'padding: 20px; text-align: center; color: #dc3545;';
            errorDiv.innerHTML = '<h2>화면 표시 실패</h2><p>자리 배치도를 표시할 수 없습니다.</p>';
            document.body.innerHTML = '';
            document.body.appendChild(errorDiv);
        }
    }
    
    /**
     * 자리 배치도를 이미지로 변환하여 이미지만 표시
     */
    private async convertLayoutToImage(): Promise<void> {
        try {
            // 먼저 UI 숨기기 (이미지 변환 전)
            this.setupViewerModeUI();
            
            // 렌더링 완료를 기다림 (충분한 시간 확보)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // classroom-layout 전체를 캡처 (칠판, 교탁, 좌석 모두 포함)
            const classroomLayout = document.getElementById('classroom-layout');
            if (!classroomLayout) {
                throw new Error('교실 레이아웃을 찾을 수 없습니다.');
            }
            
            // 전체 크기 계산 (실제 콘텐츠 크기 - 칠판, 교탁, 좌석 모두 포함)
            // 요소의 실제 크기를 정확히 계산
            const rect = classroomLayout.getBoundingClientRect();
            
            // 모든 자식 요소의 실제 크기를 계산하여 전체 영역 파악
            const seatsArea = document.getElementById('seats-area');
            const blackboardArea = document.getElementById('blackboard-area');
            const teacherDeskArea = document.getElementById('teacher-desk-area');
            
            // 좌석 영역의 실제 크기 계산 (모든 좌석 카드 포함)
            let seatsAreaHeight = 0;
            let seatsAreaWidth = 0;
            let maxBottom = 0;
            
            if (seatsArea) {
                // 모든 좌석 카드의 실제 위치 계산
                const seatCards = seatsArea.querySelectorAll('.student-seat-card');
                if (seatCards.length > 0) {
                    // 각 카드의 bottom 위치를 찾아서 가장 아래쪽 위치 계산
                    seatCards.forEach((card) => {
                        const cardRect = card.getBoundingClientRect();
                        const seatsRect = seatsArea.getBoundingClientRect();
                        // 상대 위치 계산 (seatsArea 기준)
                        const relativeBottom = (cardRect.bottom - seatsRect.top) + (cardRect.height || 0);
                        maxBottom = Math.max(maxBottom, relativeBottom);
                    });
                    
                    // 좌석 영역의 실제 높이 = 가장 아래쪽 카드의 bottom + 여유 공간
                    seatsAreaHeight = Math.max(
                        maxBottom + 20, // 여유 공간 추가
                        seatsArea.scrollHeight,
                        seatsArea.offsetHeight,
                        seatsArea.getBoundingClientRect().height
                    );
                } else {
                    // 카드가 없으면 기본 높이 사용
                    seatsAreaHeight = seatsArea.scrollHeight || seatsArea.offsetHeight || seatsArea.getBoundingClientRect().height;
                }
                
                seatsAreaWidth = Math.max(
                    seatsArea.scrollWidth,
                    seatsArea.offsetWidth,
                    seatsArea.getBoundingClientRect().width
                );
            }
            
            // 칠판과 교탁 영역 고려 (절대 위치이므로 포함)
            const blackboardHeight = blackboardArea ? (blackboardArea.getBoundingClientRect().height || 40) : 40;
            const teacherDeskHeight = teacherDeskArea ? (teacherDeskArea.getBoundingClientRect().height || 40) : 40;
            
            // 전체 높이 계산: 상단 패딩(20px) + 칠판(20px top + 높이) + 교탁(84px top + 높이) + 좌석 영역(margin-top 140px + 실제 높이) + 하단 패딩(20px)
            // 좌석 영역은 margin-top 140px부터 시작하므로, 전체 높이는 140 + seatsAreaHeight
            const calculatedHeight = 20 + // 상단 패딩
                Math.max(20 + blackboardHeight, 84 + teacherDeskHeight) + // 칠판/교탁 영역
                seatsAreaHeight + // 좌석 영역 높이
                20; // 하단 패딩
            
            const totalHeight = Math.max(
                calculatedHeight,
                classroomLayout.scrollHeight,
                classroomLayout.offsetHeight,
                140 + seatsAreaHeight, // 좌석 영역 시작 위치 + 높이
                rect.height
            );
            
            // 전체 너비 계산
            const totalWidth = Math.max(
                classroomLayout.scrollWidth,
                classroomLayout.offsetWidth,
                seatsAreaWidth + 40, // 좌석 영역 너비 + 좌우 패딩
                rect.width
            );
            
            // 스마트폰 화면 크기에 맞게 최대 너비 설정 (viewport width 고려)
            const viewportWidth = window.innerWidth || 375; // 기본값: iPhone SE 크기
            const maxWidth = Math.min(viewportWidth - 20, 800); // 패딩 고려
            
            // 전체 영역을 캡처하기 위해 스크롤 위치 저장 및 리셋
            const originalScrollX = window.scrollX;
            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);
            
            // 요소의 원래 스타일 저장
            const originalOverflow = classroomLayout.style.overflow;
            const originalPosition = classroomLayout.style.position;
            const originalMaxHeight = classroomLayout.style.maxHeight;
            const originalMinHeight = classroomLayout.style.minHeight;
            
            // 전체 영역이 보이도록 스타일 조정
            classroomLayout.style.overflow = 'visible';
            classroomLayout.style.position = 'relative';
            if (classroomLayout.style.maxHeight) {
                classroomLayout.style.maxHeight = 'none';
            }
            // 최소 높이를 실제 높이로 설정하여 전체 영역 확보
            classroomLayout.style.minHeight = `${totalHeight}px`;
            
            // html2canvas로 이미지 변환 (전체 캡처, 스마트폰 최적화)
            // width와 height를 명시하지 않으면 자동으로 전체 영역을 캡처
            const canvas = await html2canvas(classroomLayout, {
                backgroundColor: '#ffffff',
                scale: 2, // 고해상도 (스마트폰에서도 선명하게)
                logging: false,
                useCORS: true,
                allowTaint: false,
                scrollX: 0,
                scrollY: 0,
                ignoreElements: (element) => {
                    // 숨겨진 요소는 제외
                    const style = window.getComputedStyle(element);
                    return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
                }
            });
            
            logger.info('이미지 캡처 완료', {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                expectedWidth: totalWidth,
                expectedHeight: totalHeight,
                seatsAreaHeight
            });
            
            // 스타일 복원
            classroomLayout.style.overflow = originalOverflow;
            classroomLayout.style.position = originalPosition;
            if (originalMaxHeight) {
                classroomLayout.style.maxHeight = originalMaxHeight;
            }
            if (originalMinHeight) {
                classroomLayout.style.minHeight = originalMinHeight;
            }
            
            // 스크롤 위치 복원
            window.scrollTo(originalScrollX, originalScrollY);
            
            // 캔버스 크기를 스마트폰에 맞게 조정
            let finalCanvas = canvas;
            if (canvas.width > maxWidth) {
                const newWidth = maxWidth;
                const newHeight = (canvas.height * maxWidth) / canvas.width;
                const resizedCanvas = document.createElement('canvas');
                resizedCanvas.width = newWidth;
                resizedCanvas.height = newHeight;
                const ctx = resizedCanvas.getContext('2d');
                if (ctx) {
                    // 고품질 리사이징
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
                    finalCanvas = resizedCanvas;
                }
            }
            
            // 이미지 데이터 URL 생성 (품질 조정)
            const imageDataUrl = finalCanvas.toDataURL('image/png', 0.95);
            
            // 모든 UI 숨기고 이미지만 표시 (스마트폰 화면에 맞게)
            document.body.innerHTML = '';
            document.body.style.cssText = 'margin: 0; padding: 10px; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; overflow-x: hidden;';
            
            const imageContainer = document.createElement('div');
            imageContainer.style.cssText = 'text-align: center; max-width: 100%; width: 100%; display: flex; flex-direction: column; align-items: center;';
            
            const img = document.createElement('img');
            img.src = imageDataUrl;
            // 스마트폰 화면 크기에 딱 맞게 조절
            img.style.cssText = 'max-width: 100%; width: 100%; height: auto; border: 2px solid #ddd; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); background: white; display: block; object-fit: contain;';
            img.alt = '자리 배치도';
            
            imageContainer.appendChild(img);
            document.body.appendChild(imageContainer);
            
            logger.info('자리 배치도 이미지 변환 완료', { width: finalCanvas.width, height: finalCanvas.height });
        } catch (error) {
            logger.error('이미지 변환 실패:', error);
            // 이미지 변환 실패 시 원래 뷰어 모드 유지
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'padding: 20px; text-align: center; color: #dc3545;';
            errorDiv.innerHTML = '<h2>이미지 변환 실패</h2><p>자리 배치도를 이미지로 변환할 수 없습니다.</p>';
            document.body.innerHTML = '';
            document.body.appendChild(errorDiv);
        }
    }
    
    /**
     * 뷰어 모드 UI 설정 (사이드바, 헤더 버튼 숨기기)
     */
    private setupViewerModeUI(): void {
        // 사이드바 숨기기
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }
        
        // 사이드바 토글 버튼 숨기기
        const sidebarToggle = document.getElementById('sidebar-toggle-btn');
        if (sidebarToggle) {
            sidebarToggle.style.display = 'none';
        }
        
        // 헤더 숨기기
        const header = document.querySelector('.top-header');
        if (header) {
            (header as HTMLElement).style.display = 'none';
        }
        
        // 메인 컨테이너를 전체 화면으로
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            (mainContainer as HTMLElement).style.margin = '0';
            (mainContainer as HTMLElement).style.padding = '0';
        }
        
        // 메인 콘텐츠 영역 스타일 조정
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            (mainContent as HTMLElement).style.width = '100%';
            (mainContent as HTMLElement).style.margin = '0';
            (mainContent as HTMLElement).style.padding = '10px';
        }
        
        // 메인 헤더 숨기기 (자리 배치도 제목과 버튼들)
        const mainHeader = document.querySelector('.main-header');
        if (mainHeader) {
            (mainHeader as HTMLElement).style.display = 'none';
        }
        
        // 결과 컨테이너 스타일 조정 (전체 화면)
        const resultContainer = document.getElementById('output-section');
        if (resultContainer) {
            resultContainer.style.margin = '0';
            resultContainer.style.padding = '0';
        }
        
        // 카드 레이아웃 컨테이너 스타일 조정
        const cardLayoutContainer = document.getElementById('card-layout-container');
        if (cardLayoutContainer) {
            cardLayoutContainer.style.margin = '0';
            cardLayoutContainer.style.padding = '10px';
        }
        
        // 교실 레이아웃 스타일 조정 (전체 화면)
        const classroomLayout = document.getElementById('classroom-layout');
        if (classroomLayout) {
            classroomLayout.style.minHeight = 'calc(100vh - 20px)';
            classroomLayout.style.padding = '10px';
        }
        
        // body 스타일 조정 (여백 제거)
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        
        // 뷰포트 메타 태그 확인 및 추가 (모바일 최적화)
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.setAttribute('name', 'viewport');
            document.head.appendChild(viewportMeta);
        }
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    /**
     * 공유된 배치 데이터 검증
     */
    private validateSharedData(shareInfo: ShareInfo): boolean {
        // 타입 검증
        const type = shareInfo.t || shareInfo.type;
        if (type !== 'sa' && type !== 'seating-arrangement') {
            return false;
        }
        
        // 학생 데이터 검증
        const studentDataList = shareInfo.s || shareInfo.students || [];
        if (!Array.isArray(studentDataList)) {
            return false;
        }
        
        // 최대 학생 수 제한 (보안 및 성능)
        if (studentDataList.length > 200) {
            return false;
        }
        
        // 이름 배열 검증 (새로운 압축 형식)
        const nameArray = shareInfo.n || shareInfo.names || [];
        if (nameArray.length > 0) {
            if (!Array.isArray(nameArray)) {
                return false;
            }
            for (const name of nameArray) {
                if (typeof name !== 'string' || name.length > 50) {
                    return false;
                }
            }
        }
        
        // 각 학생 데이터 검증
        for (const student of studentDataList) {
            if (Array.isArray(student)) {
                // 새로운 압축 형식: [이름ID, 성별] 또는 이전 형식: [이름, 성별]
                if (student.length < 2) {
                    return false;
                }
                // 이름ID가 숫자인 경우 (새로운 형식)
                if (typeof student[0] === 'number') {
                    const nameId = student[0] as number;
                    if (nameId < 0 || (nameArray.length > 0 && nameId >= nameArray.length)) {
                        return false;
                    }
                } else if (typeof student[0] === 'string') {
                    // 이전 형식: [이름, 성별]
                    if (student[0].length > 50) {
                        return false;
                    }
                } else {
                    return false;
                }
                if (student[1] !== 'M' && student[1] !== 'F') {
                    return false;
                }
            } else if (typeof student === 'object' && student !== null) {
                // 객체 형식: {name: string, gender: 'M' | 'F'}
                if (typeof student.name !== 'string' || student.name.length > 50) {
                    return false;
                }
                if (student.gender !== 'M' && student.gender !== 'F') {
                    return false;
                }
            } else {
                return false;
            }
        }
        
        // 레이아웃 검증 (선택적)
        const gridColumns = shareInfo.l || shareInfo.layout;
        if (gridColumns && (typeof gridColumns !== 'string' || gridColumns.length > 500)) {
            return false;
        }
        
        return true;
    }

    /**
     * 공유된 배치 데이터 로드
     */
    private loadSharedLayout(shareData: string): void {
        try {
            // 입력 데이터 길이 검증 (보안)
            if (!shareData || shareData.length > 10000) {
                throw new Error('공유 데이터가 유효하지 않습니다.');
            }
            
            // URL-safe Base64 디코딩 (+, /, = 문자 복원)
            const base64Data = shareData
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            
            // 패딩 추가 (필요한 경우)
            const padding = base64Data.length % 4;
            const paddedData = padding ? base64Data + '='.repeat(4 - padding) : base64Data;
            
            // Base64 디코딩
            let decodedData: string;
            try {
                decodedData = decodeURIComponent(escape(atob(paddedData)));
            } catch (e) {
                // 이전 형식 호환성: 일반 Base64 디코딩 시도
                try {
                decodedData = decodeURIComponent(escape(atob(shareData)));
                } catch (e2) {
                    throw new Error('공유 데이터 디코딩에 실패했습니다.');
                }
            }
            
            // JSON 파싱
            let shareInfo: ShareInfo;
            try {
                shareInfo = JSON.parse(decodedData) as ShareInfo;
            } catch (e) {
                throw new Error('공유 데이터 형식이 올바르지 않습니다.');
            }
            
            // 데이터 검증
            if (!this.validateSharedData(shareInfo)) {
                throw new Error('공유 데이터 검증에 실패했습니다.');
            }
            
            // 학생 정보로부터 배치 복원 (압축된 형식과 이전 형식 모두 지원)
            const studentDataList = shareInfo.s || shareInfo.students || [];
            const nameArray = shareInfo.n || shareInfo.names || [];
            const gridColumns = shareInfo.l || shareInfo.layout || '';
            
            // 학생 데이터 생성 (새로운 압축 형식: [이름ID, 성별] 또는 이전 형식 지원)
            this.students = studentDataList.map((student: SharedStudentData, index: number) => {
                if (Array.isArray(student)) {
                    // 새로운 형식: [이름ID, 성별]
                    if (nameArray.length > 0 && typeof student[0] === 'number') {
                        const nameId = student[0] as number;
                        const name = nameArray[nameId] || `학생${index + 1}`;
                        const gender = (student[1] === 'F' ? 'F' : 'M') as 'M' | 'F';
                        return {
                            id: index + 1,
                            name: String(name).trim() || `학생${index + 1}`,
                            gender: gender
                        };
                    } else {
                        // 이전 형식: [이름, 성별]
                        const name = String(student[0] || '').trim();
                        const gender = (student[1] === 'F' ? 'F' : 'M') as 'M' | 'F';
                        return {
                            id: index + 1,
                            name: name || `학생${index + 1}`,
                            gender: gender
                        };
                    }
                } else {
                    // 객체 형식: {name: string, gender: 'M' | 'F'}
                    const name = String(student.name || '').trim();
                    const gender = (student.gender === 'F' ? 'F' : 'M') as 'M' | 'F';
                    return {
                        id: index + 1,
                        name: name || `학생${index + 1}`,
                        gender: gender
                    };
                }
            });
            
            // 성별별 학생 수 계산
            let maleCount = 0;
            let femaleCount = 0;
            this.students.forEach(student => {
                if (student.gender === 'M') {
                    maleCount++;
                } else {
                    femaleCount++;
                }
            });
            
            // 사이드바 입력 업데이트
            const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
            const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
            if (maleCountInput) maleCountInput.value = maleCount.toString();
            if (femaleCountInput) femaleCountInput.value = femaleCount.toString();
            
            // 미리보기 업데이트
            this.updatePreviewForGenderCounts();
            
            // 학생 테이블 생성
            this.setTimeoutSafe(() => {
                const totalStudents = this.students.length;
                this.studentTableManager.createStudentTable(totalStudents);
                
                // 학생 정보 입력 (이름과 성별)
                this.setTimeoutSafe(() => {
                    this.students.forEach((student, index) => {
                        const nameInput = document.getElementById(`student-name-${index + 1}`) as HTMLInputElement;
                        const genderSelect = document.getElementById(`student-gender-${index + 1}`) as HTMLSelectElement;
                        if (nameInput) {
                            nameInput.value = student.name;
                        }
                        if (genderSelect) {
                            genderSelect.value = student.gender;
                        }
                    });
                    
                    // 자리 배치 실행
                    this.setTimeoutSafe(() => {
                        const arrangeBtn = document.getElementById('arrange-seats') as HTMLButtonElement;
                        if (arrangeBtn) {
                            arrangeBtn.click();
                        }
                        
                        // 그리드 컬럼 설정 (레이아웃 복원)
                        this.setTimeoutSafe(() => {
                            const seatsArea = document.getElementById('seats-area');
                            if (seatsArea && gridColumns) {
                                seatsArea.style.gridTemplateColumns = gridColumns;
                            }
                            
                            this.outputModule.showSuccess('공유된 자리 배치도가 로드되었습니다.');
                        }, 500);
                    }, 500);
                }, 500);
            }, 300);
            
        } catch (error) {
            logger.error('공유 데이터 로드 실패:', error);
            this.outputModule.showError('공유된 자리 배치도를 로드할 수 없습니다.');
            
            // 실패 시 기본 레이아웃 표시
            this.renderInitialExampleLayout();
            this.setTimeoutSafe(() => {
                this.updatePreviewForGenderCounts();
            }, 100);
        }
    }

    /**
     * 간단한 공유 주소(URL) 생성 (압축된 형식, 뷰어 모드)
     * @param seatsHtml 좌석 HTML
     * @param gridColumns 그리드 컬럼 설정
     * @param dateString 날짜 문자열
     * @param expiresIn 만료 시간 (시간 단위, 선택사항)
     * @param password 비밀번호 (선택사항)
     * @deprecated 공유 기능이 제거되었습니다. 이 메서드는 더 이상 사용되지 않습니다.
     */
    private generateShareUrl(seatsHtml: string, gridColumns: string, dateString: string, expiresIn?: number, password?: string): string {
        // 공유 기능이 제거되었으므로 빈 문자열 반환
        return '';
        // 학생 정보 추출 (이름과 성별)
        const studentData: Array<{name: string, gender: 'M' | 'F'}> = [];
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

        // 공유 데이터 생성 (최적화된 형식 - 더 짧게 압축)
        // 학생 데이터를 더 짧게 압축: [이름축약, 성별] 형식
        // 이름을 숫자로 매핑하여 더 짧게 만들기
        const nameMap = new Map<string, number>();
        let nameIndex = 0;
        const compressedStudents = studentData.map(s => {
            let nameId: number;
            if (nameMap.has(s.name)) {
                nameId = nameMap.get(s.name)!;
            } else {
                nameId = nameIndex++;
                nameMap.set(s.name, nameId);
            }
            return [nameId, s.gender];
        });
        
        // 이름 맵을 배열로 변환 (인덱스 순서대로)
        const nameArray: string[] = [];
        nameMap.forEach((id, name) => {
            nameArray[id] = name;
        });
        
        // 그리드 컬럼을 더 짧게 압축
        let compressedLayout = gridColumns || '';
        if (compressedLayout.includes('repeat')) {
            // 'repeat(6, 1fr)' -> 'r6' 같은 형식으로 압축
            compressedLayout = compressedLayout.replace(/repeat\((\d+),\s*1fr\)/g, 'r$1');
            compressedLayout = compressedLayout.replace(/repeat\((\d+),\s*(\d+)px\)/g, 'r$1-$2px');
        }
        // 빈 문자열이면 생략
        if (!compressedLayout) {
            compressedLayout = undefined;
        }
        
        // 최소한의 데이터만 포함
        const shareData: any = {
            t: 'sa', // type
            n: nameArray, // names
            s: compressedStudents // students
        };
        
        // 레이아웃이 있으면 추가
        if (compressedLayout) {
            shareData.l = compressedLayout;
        }
        
        // 만료 시간 추가 (선택사항) - 36진수로 변환하여 짧게 저장
        if (expiresIn && expiresIn > 0) {
            const expiresAt = Date.now() + (expiresIn * 60 * 60 * 1000);
            shareData.e = expiresAt.toString(36); // 36진수로 변환하여 단축
        }
        
        // 비밀번호 해시 추가 (선택사항)
        if (password && password.length > 0) {
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            shareData.p = Math.abs(hash).toString(36); // 36진수로 단축
        }

        // JSON 문자열 생성 (공백 제거하여 더 짧게)
        const jsonString = JSON.stringify(shareData);
        
        // Base64 URL-safe 인코딩 (+, /, = 문자를 URL-safe 문자로 변환)
        const encodedData = btoa(unescape(encodeURIComponent(jsonString)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        
        // 현재 페이지의 기본 URL 가져오기
        const baseUrl = window.location.origin + window.location.pathname;
        
        // 공유 URL 생성 (뷰어 모드용 ?v= 파라미터 사용)
        const shareUrl = `${baseUrl}?v=${encodedData}`;
        
        return shareUrl;
    }

    /**
     * 모달 창으로 자리 배치도 공유하기 (개선된 버전: QR 코드, 만료 시간, 비밀번호 지원)
     * @deprecated 공유 기능이 제거되었습니다. 이 메서드는 더 이상 사용되지 않습니다.
     */
    private async showShareModal(shareUrl: string, options?: {expiresIn?: number, password?: string}): Promise<void> {
        // 공유 기능이 제거되었으므로 아무 작업도 하지 않음
        return;
        // 모달 창 생성
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
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        `;

        const title = document.createElement('h3');
        title.textContent = '📤 자리 배치도 공유';
        title.style.cssText = 'margin-top: 0; margin-bottom: 20px; color: #333; font-size: 1.5em;';

        // 옵션 설정 섹션
        const optionsSection = document.createElement('div');
        optionsSection.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;';

        // 만료 시간 설정
        const expiresGroup = document.createElement('div');
        expiresGroup.style.cssText = 'margin-bottom: 15px;';
        const expiresLabel = document.createElement('label');
        expiresLabel.innerHTML = '<strong>⏰ 만료 시간 설정 (선택사항):</strong>';
        expiresLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #555;';
        const expiresSelect = document.createElement('select');
        expiresSelect.id = 'share-expires-select';
        expiresSelect.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;';
        expiresSelect.innerHTML = `
            <option value="0">만료 시간 없음</option>
            <option value="1">1시간 후</option>
            <option value="6">6시간 후</option>
            <option value="24">24시간 후</option>
            <option value="72">3일 후</option>
            <option value="168">7일 후</option>
        `;
        if (options?.expiresIn) {
            expiresSelect.value = options.expiresIn.toString();
        }
        expiresGroup.appendChild(expiresLabel);
        expiresGroup.appendChild(expiresSelect);

        // 비밀번호 설정
        const passwordGroup = document.createElement('div');
        passwordGroup.style.cssText = 'margin-bottom: 15px;';
        const passwordLabel = document.createElement('label');
        passwordLabel.innerHTML = '<strong>🔒 비밀번호 보호 (선택사항):</strong>';
        passwordLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #555;';
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.id = 'share-password-input';
        passwordInput.placeholder = '비밀번호를 입력하세요 (4자 이상)';
        passwordInput.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;';
        if (options?.password) {
            passwordInput.value = options.password;
        }
        passwordGroup.appendChild(passwordLabel);
        passwordGroup.appendChild(passwordInput);

        // URL 재생성 버튼
        const regenerateButton = document.createElement('button');
        regenerateButton.textContent = '🔄 링크 재생성';
        regenerateButton.className = 'secondary-btn';
        regenerateButton.style.cssText = 'width: 100%; margin-top: 10px;';
        
        let currentShareUrl = shareUrl;
        regenerateButton.onclick = async () => {
            const expiresIn = parseInt(expiresSelect.value) || 0;
            const password = passwordInput.value.trim();
            
            if (password && password.length < 4) {
                this.outputModule.showError('비밀번호는 4자 이상이어야 합니다.');
                return;
            }
            
            // 현재 seatsArea에서 데이터 가져오기
            const seatsArea = document.getElementById('seats-area');
            const currentGridTemplateColumns = seatsArea?.style.gridTemplateColumns || '';
            const seatsAreaHtml = seatsArea?.innerHTML || '';
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            currentShareUrl = this.generateShareUrl(seatsAreaHtml, currentGridTemplateColumns, dateString, expiresIn > 0 ? expiresIn : undefined, password || undefined);
            
            // QR 코드 재생성
            await this.generateQRCode(currentShareUrl, qrCodeContainer);
            
            this.outputModule.showSuccess('QR 코드가 재생성되었습니다.');
        };

        optionsSection.appendChild(expiresGroup);
        optionsSection.appendChild(passwordGroup);
        optionsSection.appendChild(regenerateButton);

        // QR 코드 컨테이너
        const qrCodeContainer = document.createElement('div');
        qrCodeContainer.id = 'share-qrcode-container';
        qrCodeContainer.style.cssText = 'text-align: center; margin: 20px 0;';
        
        // QR 코드 생성
        await this.generateQRCode(currentShareUrl, qrCodeContainer);

        // QR 코드 사용 안내
        const instruction = document.createElement('div');
        instruction.innerHTML = `
            <p style="margin-bottom: 15px; color: #666; font-size: 0.9em; text-align: center;">
                <strong>QR 코드를 스캔하여 자리 배치도를 확인하세요</strong>
            </p>
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: center;
        `;

        // 모달 닫기 함수
        const closeModal = () => {
            try {
                if (modal && modal.parentNode) {
                    document.body.removeChild(modal);
                }
                document.removeEventListener('keydown', handleKeyDown);
            } catch (error) {
                logger.warn('모달 닫기 중 오류 (무시됨):', error);
            }
        };

        // ESC 키로 모달 닫기
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        // QR 인쇄 버튼
        const printQRButton = document.createElement('button');
        printQRButton.textContent = '🖨️ QR 인쇄';
        printQRButton.className = 'primary-btn';
        printQRButton.onclick = () => {
            this.printQRCode(currentShareUrl, qrCodeContainer);
        };

        const closeButton = document.createElement('button');
        closeButton.textContent = '❌ 닫기';
        closeButton.className = 'secondary-btn';
        closeButton.onclick = closeModal;

        buttonContainer.appendChild(printQRButton);
        buttonContainer.appendChild(closeButton);

        modalContent.appendChild(title);
        modalContent.appendChild(optionsSection);
        modalContent.appendChild(qrCodeContainer);
        modalContent.appendChild(instruction);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        this.addEventListenerSafe(document, 'keydown', handleKeyDown as (e: Event) => void);

        // 모달 배경 클릭으로 닫기
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
    }

    /**
     * QR 코드 인쇄
     * @deprecated 공유 기능이 제거되었습니다. 이 메서드는 더 이상 사용되지 않습니다.
     */
    private printQRCode(url: string, qrContainer: HTMLElement): void {
        // 공유 기능이 제거되었으므로 아무 작업도 하지 않음
        return;
        try {
            // QR 코드 이미지 찾기
            const qrCanvas = qrContainer.querySelector('canvas') as HTMLCanvasElement;
            if (!qrCanvas) {
                this.outputModule.showError('QR 코드를 찾을 수 없습니다.');
                return;
            }

            // 인쇄용 HTML 생성
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                this.outputModule.showError('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
                return;
            }

            const qrImageData = qrCanvas.toDataURL('image/png');
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>QR 코드 인쇄</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 20px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            font-family: 'Malgun Gothic', sans-serif;
                        }
                        .qr-title {
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 20px;
                            text-align: center;
                        }
                        .qr-image {
                            max-width: 100%;
                            height: auto;
                            border: 2px solid #333;
                            padding: 10px;
                            background: white;
                        }
                        .qr-instruction {
                            margin-top: 20px;
                            font-size: 14px;
                            color: #666;
                            text-align: center;
                        }
                        @media print {
                            body {
                                padding: 0;
                            }
                            .qr-title {
                                font-size: 20px;
                                margin-bottom: 10px;
                            }
                            .qr-image {
                                border: 1px solid #333;
                                padding: 5px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="qr-title">자리 배치도 QR 코드</div>
                    <img src="${qrImageData}" alt="QR Code" class="qr-image" />
                    <div class="qr-instruction">QR 코드를 스캔하여 자리 배치도를 확인하세요</div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // 인쇄 창이 로드된 후 인쇄 대화상자 열기
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            };
            
        } catch (error) {
            logger.error('QR 코드 인쇄 실패:', error);
            this.outputModule.showError('QR 코드 인쇄 중 오류가 발생했습니다.');
        }
    }

    /**
     * QR 코드 생성
     */
    /**
     * QR 코드 생성
     * @deprecated 공유 기능이 제거되었습니다. 이 메서드는 더 이상 사용되지 않습니다.
     */
    private async generateQRCode(url: string, container: HTMLElement): Promise<void> {
        // 공유 기능이 제거되었으므로 아무 작업도 하지 않음
        return;
        try {
            container.innerHTML = ''; // 기존 내용 제거
            
            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, url, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            container.appendChild(canvas);
            canvas.style.cssText = 'border: 2px solid #ddd; border-radius: 8px; padding: 10px; background: white;';
        } catch (error) {
            logger.error('QR 코드 생성 실패:', error);
            container.innerHTML = '<p style="color: #dc3545;">QR 코드 생성에 실패했습니다.</p>';
        }
    }

    /**
     * 사용설명서 모달 표시
     */
    private showUserManual(): void {
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
                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">1️⃣ 시작하기: 반 만들기 (필수)</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>✨ 반 만들기</strong>: 프로그램을 처음 사용하시면 상단 바의 "반 만들기" 영역이 하이라이트됩니다</li>
                    <li><strong>➕ 반 추가</strong>: 상단 바의 "반 만들기" 셀렉트 메뉴 옆 ➕ 버튼을 클릭하여 새 반을 추가하세요</li>
                    <li><strong>📚 반 선택</strong>: 셀렉트 메뉴에서 반을 선택하면 해당 반의 저장된 자리 배치도가 자동으로 불러와집니다</li>
                    <li><strong>💾 Firebase 저장</strong>: 반을 선택한 후 💾 버튼을 클릭하면 현재 자리 배치도가 Firebase 클라우드에 저장됩니다 (로그인 필요)</li>
                    <li><strong>🗑️ 반 삭제</strong>: 반을 선택한 후 🗑️ 버튼을 클릭하면 해당 반과 저장된 자리 배치도가 삭제됩니다</li>
                    <li>각 반의 자리 배치도는 독립적으로 저장되므로, 여러 반의 자리 배치도를 관리할 수 있습니다</li>
                    <li><strong>⚠️ 중요</strong>: 반을 먼저 만들지 않으면 자리 배치 기능을 사용할 수 없습니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">2️⃣ 로그인 및 클라우드 저장</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>🔐 로그인</strong>: 상단 바의 "🔐 로그인" 버튼을 클릭하여 로그인하세요</li>
                    <li><strong>구글 로그인</strong>: Google 계정으로 간편하게 로그인할 수 있습니다</li>
                    <li><strong>이메일 회원가입</strong>: 로그인 페이지에서 "회원가입" 버튼을 클릭하여 이메일과 비밀번호로 계정을 만들 수 있습니다</li>
                    <li><strong>로그인 상태 표시</strong>: 로그인 후 상단 바에 "안녕하세요. [이름/이메일]님!"이 노란색으로 표시됩니다</li>
                    <li><strong>💾 Firebase 저장</strong>: 로그인 후 반을 선택하고 💾 버튼을 클릭하면 자리 배치도가 클라우드에 저장되어 다른 기기에서도 접근할 수 있습니다</li>
                    <li><strong>🚪 로그아웃</strong>: 상단 바의 "🚪 로그아웃" 버튼을 클릭하여 로그아웃할 수 있습니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">3️⃣ 기본 사용 방법</h3>
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

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">4️⃣ 학생 정보 입력</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>📝 학생 이름 입력하기</strong>: 버튼을 클릭하여 학생 정보 입력 테이블을 생성하세요</li>
                    <li><strong>📊 학생 이름 엑셀파일에서 가져오기</strong>: 엑셀 파일을 업로드하여 학생 정보를 한 번에 입력할 수 있습니다</li>
                    <li><strong>📥 학생 이름 양식 다운로드</strong>: 엑셀 양식 파일을 다운로드하여 학생 정보를 작성한 후 업로드하세요</li>
                    <li><strong>📂 우리 반 이름 불러오기</strong>: 이전에 저장한 반 학생 정보를 불러옵니다</li>
                    <li><strong>💾 우리반 학생으로 등록하기</strong>: 현재 입력한 학생 정보를 저장하여 다음에 불러올 수 있습니다</li>
                    <li><strong>➕ 행 추가</strong>: 학생 정보 입력 테이블에서 "행 추가" 버튼을 클릭하여 학생을 추가할 수 있습니다</li>
                    <li><strong>🗑️ 삭제</strong>: 각 행의 삭제 아이콘(🗑️)을 클릭하여 학생을 삭제할 수 있습니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">5️⃣ 고정 좌석 기능</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>🔒 고정 좌석 지정</strong>: "옵션4: 맞춤 구성"에서 "고정 좌석 지정 후 랜덤 배치" 옵션을 선택하세요</li>
                    <li>미리보기 화면에서 원하는 좌석 카드를 클릭하면 🔒 아이콘과 빨간 테두리가 표시됩니다</li>
                    <li>학생 정보 입력 테이블의 "고정 좌석" 드롭다운에서 고정된 좌석을 선택하여 학생을 연결하세요</li>
                    <li>고정 좌석이 선택된 행의 번호 셀은 파란색 배경으로 표시됩니다</li>
                    <li>고정 좌석을 제외한 나머지 좌석에만 학생들이 랜덤 배치됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">6️⃣ 자리 배치 옵션</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>🚫 이전 좌석 안 앉기</strong>: "확정된 자리 이력"에 저장된 이전 배치를 참고하여 같은 좌석에 배치되지 않도록 합니다</li>
                    <li><strong>👥 이전 짝 금지</strong>: "확정된 자리 이력"에 저장된 이전 배치를 참고하여 이전에 같은 짝이었던 학생과 다시 짝지어지지 않도록 합니다</li>
                    <li>두 옵션을 모두 체크하면 두 조건을 모두 만족하도록 배치됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">7️⃣ 확정된 자리 이력 (반별 관리)</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>✅ 자리 확정하기</strong>: 자리 배치가 완료된 후 "✅ 자리 확정하기" 버튼을 클릭하면 현재 배치가 해당 반의 이력에 저장됩니다</li>
                    <li><strong>⚠️ 중요</strong>: "자리 확정하기" 버튼을 클릭하지 않으면 이력에 기록되지 않습니다</li>
                    <li><strong>📋 확정된 자리 이력</strong>: 상단 바의 "📋 확정된 자리 이력" 드롭다운에서 현재 선택된 반의 저장된 배치를 확인할 수 있습니다</li>
                    <li><strong>반별 이력 관리</strong>: 각 반의 확정된 자리 이력은 독립적으로 관리됩니다. 반을 변경하면 해당 반의 이력이 자동으로 표시됩니다</li>
                    <li>같은 날짜에 여러 개의 배치가 저장되면 번호가 표시됩니다 (예: 25-11-10 확정자리 (3), (2), (1))</li>
                    <li>이력 항목을 클릭하면 해당 배치를 불러올 수 있습니다</li>
                    <li>이력 항목 옆의 삭제 아이콘(🗑️)을 클릭하면 해당 이력을 삭제할 수 있습니다</li>
                    <li>드롭다운 외부를 클릭하면 드롭다운이 자동으로 닫힙니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">8️⃣ 옵션 설정 기억하기</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>💾 옵션 설정 기억하기</strong>: "초기화" 버튼 위의 "옵션 설정 기억하기" 버튼을 클릭하면 현재 설정(옵션1~옵션4)이 저장됩니다</li>
                    <li>다음에 프로그램을 실행하면 저장된 설정이 자동으로 적용됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">9️⃣ 자리 바꾸기</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li>자리 배치가 완료된 후, 좌석 카드를 드래그하여 다른 좌석에 드롭하면 자리를 바꿀 수 있습니다</li>
                    <li>두 카드를 서로 드래그 & 드롭하면 위치가 교환됩니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">🔟 공유 및 출력</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>🖨️ 인쇄하기</strong>: 현재 자리 배치도를 인쇄합니다</li>
                </ul>

                <h3 style="color: #667eea; margin-top: 25px; margin-bottom: 10px; font-size: 1.3em;">💡 유용한 팁</h3>
                <ul style="padding-left: 25px; margin-bottom: 20px;">
                    <li><strong>📚 반 관리 팁</strong>: 여러 반을 관리할 때는 각 반의 자리 배치도를 Firebase에 저장해두면 나중에 쉽게 불러올 수 있습니다</li>
                    <li><strong>🔐 클라우드 저장</strong>: 로그인 후 💾 버튼을 클릭하면 자리 배치도가 클라우드에 저장되어 다른 기기에서도 접근할 수 있습니다</li>
                    <li><strong>📋 반별 이력 관리</strong>: 각 반의 확정된 자리 이력은 독립적으로 관리되므로, 반을 변경하면 해당 반의 이력이 자동으로 표시됩니다</li>
                    <li>📊 학생 정보 입력 테이블 하단의 통계를 확인하여 남학생/여학생 수와 고정 좌석 수를 확인할 수 있습니다</li>
                    <li>🔒 고정 좌석 모드에서는 미리보기 화면에서 좌석을 클릭하여 고정할 수 있습니다</li>
                    <li>🔄 자리 배치 후에는 드래그 & 드롭으로 자유롭게 자리를 조정할 수 있습니다</li>
                    <li>👥 모둠 배치 시 "남녀 섞기" 옵션을 사용하면 모둠 내에서 남녀를 균형있게 배치할 수 있습니다</li>
                    <li>📐 "1명씩 한 줄로 배치" 옵션에서 "남녀 순서 바꾸기" 체크박스를 사용하면 여학생을 먼저 배치할 수 있습니다</li>
                    <li>⚖️ "남녀 대칭 1줄 배치"는 남학생을 앞쪽 분단부터 배치하고, 여학생을 나머지 자리에 배치하는 대칭적인 배치 방식입니다</li>
                    <li>◀ 좌측 사이드바의 토글 버튼(◀)을 클릭하면 사이드바를 접거나 펼칠 수 있습니다</li>
                    <li>↶↷ 상단 바의 되돌리기(↶)와 다시 실행하기(↷) 버튼으로 자리 배치 변경 이력을 관리할 수 있습니다</li>
                    <li><strong>✨ 반 만들기 하이라이트</strong>: 반이 없으면 상단 바의 "반 만들기" 영역이 하이라이트되어 먼저 반을 만들어야 함을 알려줍니다</li>
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
            } catch (error) {
                logger.warn('모달 닫기 중 오류 (무시됨):', error);
            }
        };

        closeButton.onclick = closeModal;

        // ESC 키로 모달 닫기
        const handleKeyDown = (e: KeyboardEvent) => {
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

        this.addEventListenerSafe(document, 'keydown', handleKeyDown as (e: Event) => void);

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
    private toggleSidebar(): void {
        const sidebar = document.getElementById('sidebar');
        const mainContainer = document.querySelector('.main-container');
        const overlay = document.getElementById('sidebar-overlay');
        const toggleBtn = document.getElementById('sidebar-toggle-btn');
        
        if (sidebar && mainContainer) {
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            if (isCollapsed) {
                // 사이드바 열기
                sidebar.classList.remove('collapsed');
                sidebar.classList.add('open');
                mainContainer.classList.remove('sidebar-collapsed');
                
                // 모바일에서 오버레이 표시
                if (overlay && window.innerWidth <= 768) {
                    overlay.classList.add('active');
                    overlay.setAttribute('aria-hidden', 'false');
                }
                
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-expanded', 'true');
                }
            } else {
                // 사이드바 닫기
                sidebar.classList.add('collapsed');
                sidebar.classList.remove('open');
                mainContainer.classList.add('sidebar-collapsed');
                
                // 오버레이 숨기기
                if (overlay) {
                    overlay.classList.remove('active');
                    overlay.setAttribute('aria-hidden', 'true');
                }
                
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
            }
        }
    }

    /**
     * 모바일 반응형 초기화
     */
    private initializeMobileResponsive(): void {
        // 화면 크기 변경 감지
        let resizeTimer: number | null = null;
        this.addEventListenerSafe(window, 'resize', () => {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }
            resizeTimer = window.setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // 초기 화면 크기에 따라 사이드바 상태 설정
        this.handleResize();

        // 오버레이 클릭 시 사이드바 닫기
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
            this.addEventListenerSafe(overlay, 'click', () => {
                this.toggleSidebar();
            });
        }
    }

    /**
     * 화면 크기 변경 처리
     */
    private handleResize(): void {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.getElementById('sidebar');
        const mainContainer = document.querySelector('.main-container');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (!sidebar || !mainContainer) return;

        if (isMobile) {
            // 모바일: 사이드바는 기본적으로 닫힘
            if (!sidebar.classList.contains('collapsed') && !sidebar.classList.contains('open')) {
                sidebar.classList.add('collapsed');
                mainContainer.classList.add('sidebar-collapsed');
            }
        } else {
            // 데스크톱: 사이드바는 기본적으로 열림
            sidebar.classList.remove('open');
            if (overlay) {
                overlay.classList.remove('active');
                overlay.setAttribute('aria-hidden', 'true');
            }
        }
    }

    /**
     * 키보드 네비게이션 초기화
     */
    private initializeKeyboardNavigation(): void {
        // Tab 순서 최적화
        this.optimizeTabOrder();
        
        // 포커스 표시 개선
        this.enhanceFocusStyles();
        
        // 키보드 드래그&드롭 활성화
        this.setupKeyboardDragDrop();
    }

    /**
     * Tab 순서 최적화
     */
    private optimizeTabOrder(): void {
        // 주요 버튼들에 Tab 순서 설정
        const primaryButtons = [
            document.getElementById('arrange-seats'),
            document.getElementById('reset-app'),
            document.getElementById('save-options'),
            document.getElementById('sidebar-toggle-btn'),
            document.getElementById('user-manual-btn')
        ].filter(Boolean) as HTMLElement[];

        KeyboardNavigation.setTabOrder(primaryButtons, 1);

        // 입력 필드들에 Tab 순서 설정
        const inputFields = [
            document.getElementById('male-students'),
            document.getElementById('female-students'),
            document.getElementById('number-of-partitions')
        ].filter(Boolean) as HTMLElement[];

        KeyboardNavigation.setTabOrder(inputFields, 10);
    }

    /**
     * 포커스 표시 개선
     */
    private enhanceFocusStyles(): void {
        // 모든 포커스 가능한 요소에 접근성 속성 추가
        const focusableElements = document.querySelectorAll(
            'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        focusableElements.forEach((element) => {
            // aria-label이 없으면 title에서 가져오기
            if (!element.hasAttribute('aria-label') && element.hasAttribute('title')) {
                element.setAttribute('aria-label', element.getAttribute('title') || '');
            }
        });
    }

    /**
     * 키보드 드래그&드롭 설정
     */
    private setupKeyboardDragDrop(): void {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return;

        // 키보드 드래그&드롭 매니저 초기화
        this.keyboardDragDropManager = new KeyboardDragDropManager(
            'seats-area',
            (sourceCard: HTMLElement, direction: 'up' | 'down' | 'left' | 'right') => {
                this.handleKeyboardSeatMove(sourceCard, direction);
            },
            (seatId: number) => this.fixedSeatIds.has(seatId)
        );

        // 좌석 카드가 생성될 때마다 활성화
        const observer = new MutationObserver(() => {
            const cards = seatsArea.querySelectorAll('.student-seat-card');
            if (cards.length > 0) {
                this.keyboardDragDropManager.enable();
            }
        });

        observer.observe(seatsArea, {
            childList: true,
            subtree: true
        });

        // 초기 활성화
        if (seatsArea.querySelectorAll('.student-seat-card').length > 0) {
            this.keyboardDragDropManager.enable();
        }
    }

    /**
     * 키보드로 좌석 이동 처리
     */
    private handleKeyboardSeatMove(sourceCard: HTMLElement, direction: 'up' | 'down' | 'left' | 'right'): void {
        const sourceSeatIdStr = sourceCard.getAttribute('data-seat-id');
        if (!sourceSeatIdStr) return;

        const sourceSeatId = parseInt(sourceSeatIdStr, 10);
        if (isNaN(sourceSeatId)) return;

        // 방향에 따라 인접한 좌석 찾기
        const targetCard = this.findAdjacentSeat(sourceCard, direction);
        if (!targetCard) return;

        const targetSeatIdStr = targetCard.getAttribute('data-seat-id');
        if (!targetSeatIdStr) return;

        const targetSeatId = parseInt(targetSeatIdStr, 10);
        if (isNaN(targetSeatId)) return;

        // 고정 좌석은 이동 불가
        if (this.fixedSeatIds.has(targetSeatId)) {
            return;
        }

        // 좌석 교환
        this.swapSeats(sourceCard, targetCard);

        // 히스토리 저장
        this.setTimeoutSafe(() => {
            this.saveLayoutToHistory();
        }, 50);
    }

    /**
     * 인접한 좌석 찾기
     */
    private findAdjacentSeat(card: HTMLElement, direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea) return null;

        const allCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
        if (allCards.length === 0) return null;

        const cardRect = card.getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;

        let bestMatch: HTMLElement | null = null;
        let minDistance = Infinity;

        allCards.forEach((otherCard) => {
            if (otherCard === card || otherCard.classList.contains('fixed-seat')) return;

            const otherRect = otherCard.getBoundingClientRect();
            const otherCenterX = otherRect.left + otherRect.width / 2;
            const otherCenterY = otherRect.top + otherRect.height / 2;

            let isInDirection = false;
            let distance = 0;

            switch (direction) {
                case 'up':
                    isInDirection = otherCenterY < cardCenterY;
                    distance = Math.abs(otherCenterX - cardCenterX) + (cardCenterY - otherCenterY);
                    break;
                case 'down':
                    isInDirection = otherCenterY > cardCenterY;
                    distance = Math.abs(otherCenterX - cardCenterX) + (otherCenterY - cardCenterY);
                    break;
                case 'left':
                    isInDirection = otherCenterX < cardCenterX;
                    distance = Math.abs(otherCenterY - cardCenterY) + (cardCenterX - otherCenterX);
                    break;
                case 'right':
                    isInDirection = otherCenterX > cardCenterX;
                    distance = Math.abs(otherCenterY - cardCenterY) + (otherCenterX - cardCenterX);
                    break;
            }

            if (isInDirection && distance < minDistance) {
                minDistance = distance;
                bestMatch = otherCard;
            }
        });

        return bestMatch;
    }

    /**
     * 좌석 교환
     */
    private swapSeats(sourceCard: HTMLElement, targetCard: HTMLElement): void {
        const srcNameEl = sourceCard.querySelector('.student-name') as HTMLElement | null;
        const tgtNameEl = targetCard.querySelector('.student-name') as HTMLElement | null;
        
        if (!srcNameEl || !tgtNameEl) return;

        // 이름 스왑
        const tmpName = srcNameEl.textContent || '';
        srcNameEl.textContent = tgtNameEl.textContent || '';
        tgtNameEl.textContent = tmpName;

        // 성별 배경 클래스 스왑
        const srcIsM = sourceCard.classList.contains('gender-m');
        const srcIsF = sourceCard.classList.contains('gender-f');
        const tgtIsM = targetCard.classList.contains('gender-m');
        const tgtIsF = targetCard.classList.contains('gender-f');

        sourceCard.classList.toggle('gender-m', tgtIsM);
        sourceCard.classList.toggle('gender-f', tgtIsF);
        targetCard.classList.toggle('gender-m', srcIsM);
        targetCard.classList.toggle('gender-f', srcIsF);

        // ARIA 레이블 업데이트 (성별 정보 포함)
        const srcSeatId = sourceCard.getAttribute('data-seat-id');
        const tgtSeatId = targetCard.getAttribute('data-seat-id');
        const srcName = srcNameEl.textContent || '빈 좌석';
        const tgtName = tgtNameEl.textContent || '빈 좌석';
        
        // 성별 정보 가져오기
        const srcIsMale = sourceCard.classList.contains('gender-m');
        const srcIsFemale = sourceCard.classList.contains('gender-f');
        const tgtIsMale = targetCard.classList.contains('gender-m');
        const tgtIsFemale = targetCard.classList.contains('gender-f');
        
        const srcGenderLabel = srcIsMale ? '남학생 ♂' : (srcIsFemale ? '여학생 ♀' : '');
        const tgtGenderLabel = tgtIsMale ? '남학생 ♂' : (tgtIsFemale ? '여학생 ♀' : '');

        if (srcSeatId) {
            const genderInfo = srcGenderLabel ? ` (${srcGenderLabel})` : '';
            sourceCard.setAttribute('aria-label', `좌석 ${srcSeatId}: ${tgtName}${genderInfo}. 화살표 키로 이동, Enter로 선택`);
        }
        if (tgtSeatId) {
            const genderInfo = tgtGenderLabel ? ` (${tgtGenderLabel})` : '';
            targetCard.setAttribute('aria-label', `좌석 ${tgtSeatId}: ${srcName}${genderInfo}. 화살표 키로 이동, Enter로 선택`);
        }

        // 성공 피드백
        targetCard.style.transform = 'scale(1.05)';
        setTimeout(() => {
            targetCard.style.transform = '';
        }, 200);
    }

    /**
     * 반 관리 초기화
     */
    private initializeClassManagement(): void {
        // 반 선택 셀렉트 메뉴 변경 이벤트
        const classSelect = document.getElementById('class-select') as HTMLSelectElement;
        if (classSelect) {
            this.addEventListenerSafe(classSelect, 'change', (e) => {
                const target = e.target as HTMLSelectElement;
                const classId = target.value;
                this.handleClassSelectChange(classId);
            });
        }

        // 반 목록 업데이트
        this.updateClassSelect();
        
        // 반이 없는 경우 '반 만들기' 하이라이트 애니메이션 적용
        this.checkAndHighlightClassCreation();
    }
    
    /**
     * 반이 없는 경우 '반 만들기' 하이라이트 애니메이션 적용
     * 처음 방문자뿐만 아니라 데이터가 없는 사용자도 하이라이트 표시
     */
    private checkAndHighlightClassCreation(): void {
        const classList = this.classManager.getClassList();
        const hasClasses = classList.length > 0;
        
        // 반이 있으면 하이라이트 제거
        if (hasClasses) {
            this.removeClassCreationHighlight();
            return;
        }
        
        // 반이 없으면 하이라이트 적용 (처음 방문자뿐만 아니라 데이터가 없는 모든 사용자)
        const classSelectContainer = document.getElementById('class-select-container');
        if (classSelectContainer) {
            classSelectContainer.classList.add('first-visit-highlight');
            logger.info('반이 없어서 반 만들기 하이라이트 적용');
        }
    }
    
    /**
     * 반 만들기 하이라이트 애니메이션 제거
     */
    private removeClassCreationHighlight(): void {
        const classSelectContainer = document.getElementById('class-select-container');
        if (classSelectContainer) {
            classSelectContainer.classList.remove('first-visit-highlight');
        }
    }

    /**
     * 반 선택 셀렉트 메뉴 업데이트
     */
    private updateClassSelect(): void {
        const classSelect = document.getElementById('class-select') as HTMLSelectElement;
        const deleteBtn = document.getElementById('delete-class-btn') as HTMLButtonElement;
        const saveBtn = document.getElementById('save-layout-btn') as HTMLButtonElement;
        
        if (!classSelect) return;

        const classList = this.classManager.getClassList();
        const currentClassId = this.classManager.getCurrentClassId();

        // 기존 옵션 제거 (첫 번째 옵션 제외)
        while (classSelect.options.length > 1) {
            classSelect.remove(1);
        }

        // 반 목록 추가
        classList.forEach(classInfo => {
            const option = document.createElement('option');
            option.value = classInfo.id;
            option.textContent = classInfo.name;
            classSelect.appendChild(option);
        });

        // 현재 선택된 반 설정
        if (currentClassId) {
            classSelect.value = currentClassId;
        } else {
            classSelect.value = '';
        }

        // 버튼 표시/숨김
        const hasSelection = classSelect.value !== '';
        if (deleteBtn) {
            deleteBtn.style.display = hasSelection ? 'inline-block' : 'none';
        }
        if (saveBtn) {
            saveBtn.style.display = hasSelection ? 'inline-block' : 'none';
        }
        
        // 반 목록 업데이트 후 하이라이트 상태 확인 (반이 삭제된 경우를 대비)
        this.checkAndHighlightClassCreation();
    }

    /**
     * 반 선택 변경 처리
     */
    private handleClassSelectChange(classId: string): void {
        if (!classId || classId === '') {
            // 선택 해제
            this.classManager.selectClass(null);
            this.updateClassSelect();
            // 반이 선택되지 않았으므로 이력 드롭다운 업데이트 (빈 상태로)
            this.updateHistoryDropdown();
            return;
        }

        // 반 선택
        this.classManager.selectClass(classId);
        this.updateClassSelect();
        
        // 반이 변경되었으므로 해당 반의 이력 드롭다운 업데이트
        this.updateHistoryDropdown();

        // 저장된 자리 배치도 불러오기 (비동기)
        this.classManager.loadLayout(classId).then((loaded) => {
            if (!loaded) {
                // 저장된 배치도가 없으면 현재 배치도 유지
                this.outputModule.showInfo('저장된 자리 배치도가 없습니다. 새로 배치를 생성해주세요.');
            }
        });
    }

    /**
     * 새 반 추가 처리
     */
    private handleAddClass(): void {
        const className = prompt('반 이름을 입력하세요:');
        if (!className) {
            return;
        }

        // 비동기 처리
        this.classManager.addClass(className).then((classId) => {
            if (classId) {
                // 반 목록 업데이트
                this.updateClassSelect();
                
                // 새로 추가된 반 선택
                const classSelect = document.getElementById('class-select') as HTMLSelectElement;
                if (classSelect) {
                    classSelect.value = classId;
                    this.handleClassSelectChange(classId);
                }
                
                // 방문 기록 저장 (하이라이트는 updateClassSelect에서 자동으로 제거됨)
                this.storageManager.safeSetItem('hasVisitedBefore', 'true');
                
                // 사용자에게 안내 메시지 표시
                this.outputModule.showSuccess(`"${className}" 반이 생성되었습니다! 이제 좌측 사이드바에서 학생 정보를 입력하고 자리 배치를 실행하세요.`);
            }
        });
    }

    /**
     * 반 삭제 처리
     */
    private handleDeleteClass(): void {
        const currentClassId = this.classManager.getCurrentClassId();
        if (!currentClassId) {
            this.outputModule.showError('삭제할 반이 선택되지 않았습니다.');
            return;
        }

        const className = this.classManager.getClassName(currentClassId);
        if (!className) {
            this.outputModule.showError('반 정보를 찾을 수 없습니다.');
            return;
        }

        if (confirm(`"${className}" 반을 삭제하시겠습니까?\n저장된 자리 배치도도 함께 삭제됩니다.`)) {
            // 비동기 처리
            this.classManager.deleteClass(currentClassId).then((deleted) => {
                if (deleted) {
                    // 반 목록 업데이트
                    this.updateClassSelect();
                    
                    // 현재 배치도 초기화
                    this.seats = [];
                    this.students = [];
                    const seatsArea = document.getElementById('seats-area');
                    if (seatsArea) {
                        seatsArea.innerHTML = '';
                    }
                }
            });
        }
    }

    /**
     * 현재 반의 자리 배치도 저장 처리
     */
    private handleSaveClassLayout(): void {
        // 비동기 처리
        this.classManager.saveCurrentLayout().then((saved) => {
            // 저장 성공 메시지는 ClassManager에서 표시됨
        });
    }

    /**
     * Firebase 로그인 처리 (로그인 페이지 표시)
     */
    private handleFirebaseLogin(): void {
        this.loginPageModule.show();
    }

    /**
     * Firebase 로그아웃 처리
     */
    private async handleFirebaseLogout(): Promise<void> {
        await this.firebaseStorageManager.signOut();
        this.updateFirebaseStatus();
    }

    /**
     * Firebase 상태 업데이트
     */
    private updateFirebaseStatus(): void {
        const loginBtn = document.getElementById('firebase-login-btn') as HTMLButtonElement;
        const statusSpan = document.getElementById('firebase-status') as HTMLSpanElement;
        
        if (!loginBtn || !statusSpan) return;

        const isAuthenticated = this.firebaseStorageManager.getIsAuthenticated();
        const currentUser = this.firebaseStorageManager.getCurrentUser();

        if (isAuthenticated && currentUser) {
            loginBtn.textContent = '🚪 로그아웃';
            loginBtn.title = 'Firebase 로그아웃';
            loginBtn.onclick = () => this.handleFirebaseLogout();
            
            // 사용자 이름 또는 이메일 표시
            const displayName = currentUser.displayName || currentUser.email || '사용자';
            statusSpan.textContent = `안녕하세요. ${displayName}님!`;
            statusSpan.style.display = 'inline-block';
            statusSpan.style.color = '#ffeb3b'; // 노란색
            statusSpan.style.fontWeight = '500';
        } else {
            loginBtn.textContent = '🔐 로그인';
            loginBtn.title = '로그인 (클라우드 동기화)';
            loginBtn.onclick = () => this.handleFirebaseLogin();
            statusSpan.textContent = '로그인 필요';
            statusSpan.style.display = 'none';
        }
    }
}
