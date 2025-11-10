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
    private students;
    private seats;
    private isInitialized;
    private fixedSeatIds;
    private nextSeatId;
    private dragSourceCard;
    private isSyncing;
    constructor();
    /**
     * 초기화 시 이력 드롭다운 업데이트
     */
    private initializeHistoryDropdown;
    /**
     * 앱 초기 상태로 되돌리기
     */
    private resetApp;
    /**
     * 옵션 설정 저장
     */
    private saveOptions;
    /**
     * 저장된 옵션 설정 불러오기
     */
    private loadOptions;
    /**
     * 초기 캔버스에 칠판과 교탁 그리기
     */
    private drawInitialCanvas;
    /**
     * 이벤트 리스너 초기화
     */
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
     * 모둠 배치로 카드 렌더링 (그룹으로 묶어서 표시)
     */
    private renderGroupCards;
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
     * 양식 파일 다운로드
     */
    private downloadTemplateFile;
    /**
     * 파일 업로드 처리
     * @param event 파일 선택 이벤트
     */
    private handleFileUpload;
    /**
     * CSV 파일 파싱 및 테이블에 데이터 입력
     * @param csvText CSV 파일 내용
     */
    private parseCsvFile;
    /**
     * 학생 데이터로 테이블 생성
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
     * 2명씩 짝꿍 배치 서브 메뉴 토글
     */
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
     * 좌석 배치하기 처리
     */
    private handleArrangeSeats;
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
     * 자리 배치도 인쇄 처리
     */
    private handlePrintLayout;
    /**
     * 자리 배치도 저장 처리
     */
    private handleSaveLayout;
    /**
     * 자리 배치도 공유하기
     */
    private handleShareLayout;
    /**
     * 공유된 배치 데이터 로드
     */
    private loadSharedLayout;
    /**
     * 간단한 공유 주소(URL) 생성
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
     * 커튼 애니메이션 시작 (닫기)
     */
    private startCurtainAnimation;
    /**
     * 커튼 애니메이션 종료 (열기)
     */
    private openCurtain;
    /**
     * 커튼 애니메이션 즉시 종료 (에러 시)
     */
    private stopCurtainAnimation;
    /**
     * 폭죽 애니메이션 시작
     */
    private startFireworks;
    /**
     * 개별 폭죽 생성 및 파티클 애니메이션
     */
    private createFirework;
}
//# sourceMappingURL=MainController.d.ts.map