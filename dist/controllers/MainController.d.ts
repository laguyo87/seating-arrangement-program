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
    constructor();
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
    private initializeEventListeners;
    /**
     * 라디오 버튼 이벤트 리스너 초기화
     */
    private initializeRadioListeners;
    /**
     * 고정 좌석 모드 활성화
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
     * 학생 행 추가 처리
     */
    private handleAddStudentRow;
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
     * 프로그램 실행
     */
    run(): void;
    /**
     * 좌석 배치하기 처리
     */
    private handleArrangeSeats;
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
     * 간단한 공유 코드 생성
     */
    private generateShareCode;
    /**
     * 모달 창으로 자리 배치도 공유하기
     */
    private showShareModal;
}
//# sourceMappingURL=MainController.d.ts.map