/**
 * 메인 컨트롤러 클래스
 * 전체 프로그램의 흐름을 제어하고 모듈들을 조율합니다.
 */
export declare class MainController {
    private inputModule;
    private layoutSelectorModule;
    private canvasModule;
    private outputModule;
    private customLayoutModule;
    private layoutRenderer;
    private animationManager;
    private storageManager;
    private csvFileHandler;
    private printExportManager;
    private uiManager;
    private studentTableManager;
    private inputValidator;
    private keyboardDragDropManager;
    private students;
    private seats;
    private isInitialized;
    private fixedSeatIds;
    private nextSeatId;
    private dragSourceCard;
    private dragOverIndicator;
    private touchStartCard;
    private touchStartPosition;
    private isSyncing;
    private layoutHistory;
    private historyIndex;
    private eventListeners;
    private timers;
    constructor();
    /**
     * 초기화 시 이력 드롭다운 업데이트
     */
    /**
     * 앱 초기 상태로 되돌리기
     */
    private resetApp;
    /**
     * 초기 캔버스에 칠판과 교탁 그리기
     */
    private drawInitialCanvas;
    /**
     * 이벤트 리스너 초기화
     */
    /**
     * 입력 필드 검증 설정
     */
    private setupInputValidation;
    private initializeEventListeners;
    /**
     * 라디오 버튼 이벤트 리스너 초기화
     */
    private initializeRadioListeners;
    /**
     * 고정 좌석 모드 활성화
     * 기존 좌석 카드들에 클릭 이벤트를 다시 설정
     */
    private enableFixedSeatMode;
    /**
     * 고정 좌석 모드 비활성화
     */
    private disableFixedSeatMode;
    /**
     * 좌석 카드 클릭 이벤트 핸들러
     */
    private handleSeatCardClick;
    /**
     * 최종 자리 배치도 렌더링
     */
    private renderFinalLayout;
    /**
     * 초기 예시 레이아웃 렌더링
     */
    private renderInitialExampleLayout;
    /**
     * 예시 카드 렌더링
     */
    private renderExampleCards;
    /**
     * 학생 카드 생성 헬퍼 메서드
     */
    private createStudentCard;
    /**
     * 좌석 카드 드래그&드롭 스왑 기능 활성화 (이벤트 위임)
     */
    private enableSeatSwapDragAndDrop;
    /**
     * 모바일 터치 드래그&드롭 지원
     */
    private enableTouchDragAndDrop;
    /**
     * 드롭 위치 삽입 인디케이터 표시
     */
    private showInsertIndicator;
    /**
     * 현재 상태를 히스토리에 저장 (통합 히스토리 시스템)
     */
    private saveToHistory;
    /**
     * 현재 자리 배치 상태를 히스토리에 저장
     */
    private saveLayoutToHistory;
    /**
     * 되돌리기 기능 실행 (모든 액션에 대해 작동)
     */
    private handleUndoLayout;
    /**
     * 다시 실행하기 기능 실행
     */
    private handleRedoLayout;
    /**
     * 되돌리기/다시 실행하기 버튼 활성화/비활성화 상태 업데이트
     */
    private updateUndoRedoButtonState;
    /**
     * 되돌리기 버튼 활성화/비활성화 상태 업데이트 (하위 호환성)
     */
    private updateUndoButtonState;
    /**
     * 히스토리 초기화
     */
    private resetHistory;
    /**
     * 고정 좌석 클릭 핸들러 설정
     */
    private setupFixedSeatClickHandler;
    /**
     * 고정 좌석 토글
     */
    private toggleFixedSeat;
    /**
     * 테이블의 고정 좌석 드롭다운 업데이트
     */
    private updateFixedSeatDropdowns;
    /**
     * 입력 값 검증 및 수정 (음수, 0, 큰 숫자 처리)
     * InputValidator가 실시간 검증을 처리하므로, 여기서는 값 정규화만 수행
     */
    private validateAndFixStudentInput;
    /**
     * 분단 수 입력 값 검증 및 수정
     * InputValidator가 실시간 검증을 처리하므로, 여기서는 값 정규화만 수행
     */
    private validateAndFixPartitionInput;
    /**
     * 성별별 학생 수에 따라 미리보기 업데이트
     */
    private updatePreviewForGenderCounts;
    /**
     * 학생 수에 따라 미리보기 업데이트
     */
    private updatePreviewForStudentCount;
    /**
     * 학생 데이터로 카드 렌더링
     */
    private renderStudentCards;
    /**
     * localStorage 사용 가능 여부 확인
     */
    private isLocalStorageAvailable;
    /**
     * 안전한 localStorage 저장
     */
    private safeSetItem;
    /**
     * 안전한 localStorage 읽기
     */
    private safeGetItem;
    /**
     * 좌석 배치 결과를 localStorage에 저장
     */
    private saveLayoutResult;
    /**
     * 저장된 좌석 배치 결과 불러오기
     */
    private loadSavedLayoutResult;
    /**
     * 나머지 랜덤 배치 처리
     */
    private handleRandomizeRemaining;
    /**
     * 결과 내보내기 처리
     */
    private handleExport;
    /**
     * 배치 미리보기 처리
     * @param layoutType 배치 유형
     * @param groupSize 모둠 크기 (선택적)
     */
    private handleLayoutPreview;
    /**
     * 카드 형태로 미리보기 렌더링
     * @param seats 좌석 배열
     */
    private renderPreviewCards;
    /**
     * 학생 명렬표 테이블 생성
     * @param count 학생 수 (선택적)
     */
    private handleCreateStudentTable;
    /**
     * 학생 행 삭제 처리
     * @param row 삭제할 행
     */
    private handleDeleteStudentRow;
    /**
     * 학생 행 추가 처리 (마지막 행 뒤에 추가)
     */
    private handleAddStudentRow;
    /**
     * 학생 테이블 통계 업데이트
     */
    private updateStudentTableStats;
    /**
     * 학생 정보 입력 테이블 저장 처리
     * 테이블의 학생 수를 계산하여 1단계 사이드바에 반영하고 미리보기를 업데이트
     * 그리고 localStorage에 학생 데이터를 저장
     */
    private handleSaveStudentTable;
    /**
     * 테이블의 숫자를 1단계 사이드바로 동기화
     * 테이블에 실제 입력된 학생 수를 1단계 입력 필드에 반영하고 미리보기를 업데이트
     */
    private syncSidebarToTable;
    /**
     * 우리 반 이름 불러오기 처리
     * localStorage에 저장된 학생 데이터를 테이블에 로드
     */
    private handleLoadClassNames;
    /**
     * 저장된 학생 데이터를 테이블에 로드
     */
    private loadStudentDataToTable;
    /**
     * 1단계 사이드바 값을 테이블로 동기화
     * 1단계에 입력된 숫자에 맞춰 테이블에 행을 추가하거나 삭제
     */
    private syncTableToSidebar;
    /**
     * 행 번호 업데이트
     */
    private updateRowNumbers;
    /**
     * 배치 결과 섹션 생성
     */
    private createLayoutResultSection;
    /**
     * 학생 배치 미리보기 렌더링
     */
    private renderStudentLayout;
    /**
     * 학생 정보와 함께 좌석 그리기
     */
    private drawSeatWithStudent;
    /**
     * 셀 간 이동 처리
     * @param tbody tbody 요소
     * @param currentRow 현재 행 번호 (1부터 시작)
     * @param columnName 열 이름 ('name' 또는 'gender')
     * @param direction 이동 방향 ('up' 또는 'down')
     */
    private moveToCell;
    /**
     * 학생 데이터로 테이블 생성 (handleCreateStudentTable에서 사용)
     * @param students 학생 배열
     */
    private createTableWithStudents;
    /**
     * 교탁과 칠판 그리기
     */
    private drawTeacherDeskAndBoard;
    /**
     * 커스텀 모드 1 토글 (4단계 활성화/비활성화)
     */
    private toggleCustomMode1;
    /**
     * 1명씩 한 줄로 배치 서브 메뉴 토글
     */
    private toggleSingleSubmenu;
    private togglePairSubmenu;
    /**
     * 모둠 배치 서브 메뉴 토글
     */
    private toggleGroupSubmenu;
    /**
     * 모둠 배치 남녀 섞기 옵션 토글
     */
    private toggleGroupGenderMixOption;
    /**
     * 모둠 배치 선택 시 분단 개수 제한 적용
     */
    private updatePartitionLimitForGroup;
    /**
     * 1명씩 한줄로 배치 선택 시 분단 개수 제한 적용 (3, 4, 5, 6만 허용)
     */
    private updatePartitionLimitForSingleUniform;
    /**
     * 짝꿍 배치 선택 시 분단 개수 제한 적용 (3, 4, 5만 허용)
     */
    private updatePartitionLimitForPair;
    /**
     * 분단 개수 제한 해제 (기본값으로 복원)
     */
    private resetPartitionLimit;
    /**
     * 프로그램 실행
     */
    run(): void;
    /**
     * 개발 모드 확인 (로컬호스트 또는 개발 환경)
     */
    private isDevelopmentMode;
    /**
     * 안전한 클립보드 복사 (브라우저 호환성 개선)
     */
    private copyToClipboard;
    /**
     * HTML 이스케이프 (XSS 방지)
     * 향후 사용자 입력이 포함된 HTML 생성 시 사용
     */
    private escapeHtml;
    /**
     * 안전한 innerHTML 설정 (XSS 방지)
     * 향후 사용자 입력이 포함된 HTML 생성 시 사용
     */
    private setSafeInnerHTML;
    /**
     * 안전한 이벤트 리스너 추가 (메모리 누수 방지)
     * 향후 사용 예정
     */
    private addEventListenerSafe;
    /**
     * 안전한 setTimeout (메모리 누수 방지)
     */
    private setTimeoutSafe;
    /**
     * 모든 타이머 정리
     */
    private clearAllTimers;
    /**
     * 모든 이벤트 리스너 정리
     */
    private removeAllEventListeners;
    /**
     * 정리 메서드 (컨트롤러 종료 시 호출)
     */
    cleanup(): void;
    /**
     * 좌석 배치하기 처리
     */
    private handleArrangeSeats;
    /**
     * 좌석 배치 처리 (내부 메서드)
     */
    private processArrangeSeats;
    /**
     * 자리 확정 처리
     */
    private handleConfirmSeats;
    /**
     * 좌석 이력 가져오기 (최신순으로 정렬)
     */
    private getSeatHistory;
    /**
     * 확정된 자리 이력에서 이전 좌석 및 짝꿍 제약 조건 추출
     */
    private extractHistoryConstraints;
    /**
     * 이력 드롭다운 메뉴 업데이트
     */
    private updateHistoryDropdown;
    /**
     * 이력 항목 삭제
     */
    private deleteHistoryItem;
    /**
     * 이력 항목 불러오기
     */
    private loadHistoryItem;
    /**
     * 남녀 짝꿍 배치 렌더링
     */
    private renderGenderPairs;
    /**
     * 같은 성끼리 짝꿍 배치 렌더링
     */
    private renderSameGenderPairs;
    /**
     * 학생 이름만 표시하는 카드 생성
     */
    private createStudentNameCard;
    /**
     * 자리 배치도 저장 처리
     */
    private handleSaveLayout;
    /**
     * 자리 배치도 공유하기
     */
    private handleShareLayout;
    /**
     * 뷰어 모드 활성화 (자리 배치도만 표시)
     */
    private enableViewerMode;
    /**
     * 뷰어 모드 UI 설정 (사이드바, 헤더 버튼 숨기기)
     */
    private setupViewerModeUI;
    /**
     * 공유된 배치 데이터 검증
     */
    private validateSharedData;
    /**
     * 공유된 배치 데이터 로드
     */
    private loadSharedLayout;
    /**
     * 간단한 공유 주소(URL) 생성 (압축된 형식, 뷰어 모드)
     */
    private generateShareUrl;
    /**
     * 모달 창으로 자리 배치도 공유하기
     */
    private showShareModal;
    /**
     * 사용설명서 모달 표시
     */
    private showUserManual;
    /**
     * 사이드바 토글
     */
    private toggleSidebar;
    /**
     * 모바일 반응형 초기화
     */
    private initializeMobileResponsive;
    /**
     * 화면 크기 변경 처리
     */
    private handleResize;
    /**
     * 키보드 네비게이션 초기화
     */
    private initializeKeyboardNavigation;
    /**
     * Tab 순서 최적화
     */
    private optimizeTabOrder;
    /**
     * 포커스 표시 개선
     */
    private enhanceFocusStyles;
    /**
     * 키보드 드래그&드롭 설정
     */
    private setupKeyboardDragDrop;
    /**
     * 키보드로 좌석 이동 처리
     */
    private handleKeyboardSeatMove;
    /**
     * 인접한 좌석 찾기
     */
    private findAdjacentSeat;
    /**
     * 좌석 교환
     */
    private swapSeats;
}
//# sourceMappingURL=MainController.d.ts.map