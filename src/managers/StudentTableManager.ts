/**
 * 학생 테이블 관리자
 * 학생 테이블 생성, 관리 및 관련 작업 담당
 */

import { OutputModule } from '../modules/OutputModule.js';
import { StorageManager } from './StorageManager.js';
import { CSVFileHandler } from './CSVFileHandler.js';
import { UIManager } from './UIManager.js';
import { Student } from '../models/Student.js';
import { logger } from '../utils/logger.js';

/**
 * StudentTableManager가 필요로 하는 의존성 인터페이스
 */
export interface StudentTableManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    storageManager: StorageManager;
    csvFileHandler: CSVFileHandler;
    uiManager: UIManager;
    // Student 및 고정 좌석 관리
    getFixedSeatIds: () => Set<number>;
    getStudents: () => Student[];
    setStudents: (students: Student[]) => void;
    // MainController 메서드들
    handleDeleteStudentRow: (row: HTMLTableRowElement) => void;
    moveToCell: (tbody: HTMLTableSectionElement, currentRow: number, columnName: 'name' | 'gender', direction: 'up' | 'down') => void;
    updateRowNumbers: () => void;
    syncSidebarToTable: (maleCount: number, femaleCount: number) => void;
    updatePreviewForGenderCounts: () => void;
}

/**
 * 학생 테이블 관리자 클래스
 */
export class StudentTableManager {
    private deps: StudentTableManagerDependencies;

    constructor(dependencies: StudentTableManagerDependencies) {
        this.deps = dependencies;
    }

    /**
     * 학생 테이블 생성
     */
    public createStudentTable(count?: number): void {
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
            this.deps.outputModule.showError('학생 수를 입력해주세요.');
            return;
        }

        // 기존 캔버스 숨기기
        const canvasContainer = outputSection.querySelector('#canvas-container');
        if (canvasContainer) {
            (canvasContainer as HTMLElement).style.display = 'none';
        }

        // 자리 배치도 숨기기 (학생 테이블 표시 시)
        const cardLayoutContainer = outputSection.querySelector('#card-layout-container');
        if (cardLayoutContainer) {
            (cardLayoutContainer as HTMLElement).style.display = 'none';
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
        studentTableContainer.id = 'student-table-container';
        // 가로 방향 2-3단 레이아웃을 위한 스타일 적용
        // 화면 크기에 따라 자동으로 2-3단으로 조정
        studentTableContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
            position: relative;
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
        this.deps.addEventListenerSafe(downloadBtn, 'click', () => this.deps.csvFileHandler.downloadTemplateFile());
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
        this.deps.addEventListenerSafe(fileInput, 'change', (e) => this.deps.csvFileHandler.handleFileUpload(e));
        
        this.deps.addEventListenerSafe(uploadBtn, 'click', () => {
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
        this.deps.addEventListenerSafe(loadClassBtn, 'click', () => this.loadClassNames());
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
                    const fixedSeatIds = this.deps.getFixedSeatIds();
                    if (fixedSeatIds.size > 0) {
                        fixedSeatIds.forEach(seatId => {
                            const option = document.createElement('option');
                            option.value = seatId.toString();
                            option.textContent = `좌석 #${seatId}`;
                            fixedSeatSelect.appendChild(option);
                        });
                    }
                    
                    // 학생 데이터에 저장된 고정 좌석이 있으면 선택
                    const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                    const students = this.deps.getStudents();
                    if (students[studentIndex] && students[studentIndex].fixedSeatId) {
                        fixedSeatSelect.value = students[studentIndex].fixedSeatId.toString();
                        // 번호 셀 배경색 설정 (초기 상태)
                        if (numCell) {
                            numCell.style.background = '#667eea';
                            numCell.style.color = 'white';
                            numCell.style.fontWeight = 'bold';
                        }
                    }
                    
                    // 고정 좌석 선택 변경 이벤트
                    this.deps.addEventListenerSafe(fixedSeatSelect, 'change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        
                        // 학생 데이터에 고정 좌석 ID 저장
                        const students = this.deps.getStudents();
                        if (students[studentIndex]) {
                            if (selectedSeatId) {
                                students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            } else {
                                delete students[studentIndex].fixedSeatId;
                            }
                            this.deps.setStudents(students);
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
                deleteBtn.onclick = () => this.deps.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);

                // 키보드 이벤트 추가 (이름 입력 필드)
                this.deps.addEventListenerSafe(nameInput, 'keydown', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Enter') {
                        genderSelect.focus();
                    } else if (ke.key === 'ArrowDown') {
                        this.deps.moveToCell(tbody, localIndex, 'name', 'down');
                    } else if (ke.key === 'ArrowUp') {
                        this.deps.moveToCell(tbody, localIndex, 'name', 'up');
                    }
                });

                // 키보드 이벤트 추가 (성별 선택 필드)
                this.deps.addEventListenerSafe(genderSelect, 'keydown', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Enter' || ke.key === 'Tab') {
                        const nextRow = tbody.querySelector(`tr:nth-child(${Math.min(localIndex + 1, studentsInThisTable)})`);
                        const nextNameInput = nextRow?.querySelector('.student-name-input') as HTMLInputElement;
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    } else if (ke.key === 'ArrowDown') {
                        this.deps.moveToCell(tbody, localIndex, 'gender', 'down');
                    } else if (ke.key === 'ArrowUp') {
                        this.deps.moveToCell(tbody, localIndex, 'gender', 'up');
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
        this.deps.uiManager.updateStudentTableStats();
        
        // 통계 업데이트를 위한 이벤트 리스너 추가 (이벤트 위임으로 모든 변경사항 감지)
        // 모든 테이블의 tbody에 이벤트 리스너 추가
        const allTbodies = studentTableContainer.querySelectorAll('tbody');
        allTbodies.forEach(tbody => {
            this.deps.addEventListenerSafe(tbody, 'input', () => {
                this.deps.uiManager.updateStudentTableStats();
            });
            this.deps.addEventListenerSafe(tbody, 'change', () => {
                this.deps.uiManager.updateStudentTableStats();
            });
            
            // 테이블이 동적으로 변경될 때를 대비한 MutationObserver 추가
            const observer = new MutationObserver(() => {
                this.deps.uiManager.updateStudentTableStats();
            });
            observer.observe(tbody, {
                childList: true,
                subtree: true,
                attributes: false
            });
        });

        // 테이블이 생성된 후 해당 위치로 스크롤
        this.deps.setTimeoutSafe(() => {
            studentTableContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);

        this.deps.outputModule.showInfo(`${count}명의 학생 명렬표가 생성되었습니다.`);
    }

    /**
     * 우리 반 이름 불러오기 처리
     * localStorage에 저장된 학생 데이터를 테이블에 로드
     */
    public loadClassNames(): void {
        try {
            const savedDataStr = this.deps.storageManager.safeGetItem('classStudentData');
            if (!savedDataStr) {
                this.deps.outputModule.showInfo('저장된 우리반 학생 데이터가 없습니다.');
                return;
            }

            // JSON 파싱 시도 (데이터 손상 처리)
            let savedData: Array<{name: string, gender: 'M' | 'F', fixedSeatId?: number}>;
            try {
                savedData = JSON.parse(savedDataStr);
                if (!Array.isArray(savedData)) {
                    throw new Error('Invalid data format');
                }
            } catch (parseError) {
                // 데이터 손상 시 저장소에서 제거하고 에러 메시지 표시
                try {
                    localStorage.removeItem('classStudentData');
                } catch {}
                this.deps.outputModule.showError('저장된 데이터가 손상되어 불러올 수 없습니다.');
                return;
            }
            
            if (!Array.isArray(savedData) || savedData.length === 0) {
                this.deps.outputModule.showInfo('저장된 우리반 학생 데이터가 없습니다.');
                return;
            }

            // 기존 테이블이 있는지 확인
            const outputSection = document.getElementById('output-section');
            if (!outputSection) {
                this.deps.outputModule.showError('테이블 영역을 찾을 수 없습니다.');
                return;
            }

            // 기존 테이블이 없으면 생성
            let existingTable = outputSection.querySelector('.student-input-table');
            if (!existingTable) {
                // 테이블이 없으면 먼저 테이블 생성
                this.createStudentTable(savedData.length);
                // 테이블이 생성될 때까지 잠시 대기
                this.deps.setTimeoutSafe(() => {
                    this.deps.csvFileHandler.loadStudentDataToTable(savedData);
                }, 100);
            } else {
                // 기존 테이블에 데이터 로드
                this.deps.csvFileHandler.loadStudentDataToTable(savedData);
            }
        } catch (error) {
            logger.error('우리반 학생 데이터 불러오기 중 오류:', error);
            this.deps.outputModule.showError('우리반 학생 데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 고정 좌석 드롭다운 업데이트
     */
    public updateFixedSeatDropdowns(): void {
        const fixedSeatSelects = document.querySelectorAll('.fixed-seat-select') as NodeListOf<HTMLSelectElement>;
        
        fixedSeatSelects.forEach(select => {
            const currentValue = select.value;
            const currentOption = select.querySelector(`option[value="${currentValue}"]`);
            
            // 기존 옵션 제거 (기본 옵션 제외)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild!);
            }
            
            // 고정 좌석 옵션 추가
            const fixedSeatIds = this.deps.getFixedSeatIds();
            if (fixedSeatIds.size > 0) {
                fixedSeatIds.forEach(seatId => {
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
            
            // 번호 셀 배경색 업데이트
            const row = select.closest('tr') as HTMLTableRowElement;
            if (row) {
                const numCell = row.querySelector('td:first-child') as HTMLElement;
                if (numCell) {
                    if (select.value) {
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
            }
        });
    }

    /**
     * 학생 행 추가 처리 (마지막 행 뒤에 추가)
     */
    public addStudentRow(): void {
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

                const newTbody = document.createElement('tbody');
                table.appendChild(newTbody);
                tableWrapper.appendChild(table);
                
                // 통계와 버튼 래퍼 앞에 삽입
                const statsAndButtonsWrapper = studentTableContainer.querySelector('div[style*="grid-column: 1 / -1"]') as HTMLElement | null;
                if (statsAndButtonsWrapper && statsAndButtonsWrapper.querySelector('#student-table-stats')) {
                    studentTableContainer.insertBefore(tableWrapper, statsAndButtonsWrapper);
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
            const fixedSeatIds = this.deps.getFixedSeatIds();
            if (fixedSeatIds.size > 0) {
                fixedSeatIds.forEach(seatId => {
                    const option = document.createElement('option');
                    option.value = seatId.toString();
                    option.textContent = `좌석 #${seatId}`;
                    fixedSeatSelect.appendChild(option);
                });
            }
            
            // 고정 좌석 선택 변경 이벤트
            this.deps.addEventListenerSafe(fixedSeatSelect, 'change', () => {
                const selectedSeatId = fixedSeatSelect.value;
                const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                
                // 학생 데이터에 고정 좌석 ID 저장
                const students = this.deps.getStudents();
                if (students[studentIndex]) {
                    if (selectedSeatId) {
                        students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                    } else {
                        delete students[studentIndex].fixedSeatId;
                    }
                    this.deps.setStudents(students);
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
        
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        actionCell.style.padding = '8px';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-row-btn';
        deleteBtn.onclick = () => this.deps.handleDeleteStudentRow(row);
        actionCell.appendChild(deleteBtn);

        // 키보드 이벤트 추가
        this.deps.addEventListenerSafe(nameInput, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter') {
                genderSelect.focus();
            }
        });

        this.deps.addEventListenerSafe(genderSelect, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter' || ke.key === 'Tab') {
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
        this.deps.updateRowNumbers();
        
        // 통계 업데이트
        this.deps.uiManager.updateStudentTableStats();
        
        // 새 행에 이벤트 리스너 추가
        if (nameInput) {
            this.deps.addEventListenerSafe(nameInput, 'input', () => this.deps.uiManager.updateStudentTableStats());
        }
        if (genderSelect) {
            this.deps.addEventListenerSafe(genderSelect, 'change', () => this.deps.uiManager.updateStudentTableStats());
        }
        // 고정 좌석 셀에서 select 요소 찾기
        if (fixedSeatCell) {
            const fixedSeatSelectInCell = fixedSeatCell.querySelector('.fixed-seat-select') as HTMLSelectElement;
            if (fixedSeatSelectInCell) {
                this.deps.addEventListenerSafe(fixedSeatSelectInCell, 'change', () => this.deps.uiManager.updateStudentTableStats());
            }
        }
        
        // 새로 추가된 입력 필드에 포커스
        this.deps.setTimeoutSafe(() => {
            nameInput.focus();
        }, 100);
    }
}




 * 학생 테이블 생성, 관리 및 관련 작업 담당
 */

import { OutputModule } from '../modules/OutputModule.js';
import { StorageManager } from './StorageManager.js';
import { CSVFileHandler } from './CSVFileHandler.js';
import { UIManager } from './UIManager.js';
import { Student } from '../models/Student.js';
import { logger } from '../utils/logger.js';

/**
 * StudentTableManager가 필요로 하는 의존성 인터페이스
 */
export interface StudentTableManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    storageManager: StorageManager;
    csvFileHandler: CSVFileHandler;
    uiManager: UIManager;
    // Student 및 고정 좌석 관리
    getFixedSeatIds: () => Set<number>;
    getStudents: () => Student[];
    setStudents: (students: Student[]) => void;
    // MainController 메서드들
    handleDeleteStudentRow: (row: HTMLTableRowElement) => void;
    moveToCell: (tbody: HTMLTableSectionElement, currentRow: number, columnName: 'name' | 'gender', direction: 'up' | 'down') => void;
    updateRowNumbers: () => void;
    syncSidebarToTable: (maleCount: number, femaleCount: number) => void;
    updatePreviewForGenderCounts: () => void;
}

/**
 * 학생 테이블 관리자 클래스
 */
export class StudentTableManager {
    private deps: StudentTableManagerDependencies;

    constructor(dependencies: StudentTableManagerDependencies) {
        this.deps = dependencies;
    }

    /**
     * 학생 테이블 생성
     */
    public createStudentTable(count?: number): void {
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
            this.deps.outputModule.showError('학생 수를 입력해주세요.');
            return;
        }

        // 기존 캔버스 숨기기
        const canvasContainer = outputSection.querySelector('#canvas-container');
        if (canvasContainer) {
            (canvasContainer as HTMLElement).style.display = 'none';
        }

        // 자리 배치도 숨기기 (학생 테이블 표시 시)
        const cardLayoutContainer = outputSection.querySelector('#card-layout-container');
        if (cardLayoutContainer) {
            (cardLayoutContainer as HTMLElement).style.display = 'none';
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
        studentTableContainer.id = 'student-table-container';
        // 가로 방향 2-3단 레이아웃을 위한 스타일 적용
        // 화면 크기에 따라 자동으로 2-3단으로 조정
        studentTableContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
            position: relative;
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
        this.deps.addEventListenerSafe(downloadBtn, 'click', () => this.deps.csvFileHandler.downloadTemplateFile());
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
        this.deps.addEventListenerSafe(fileInput, 'change', (e) => this.deps.csvFileHandler.handleFileUpload(e));
        
        this.deps.addEventListenerSafe(uploadBtn, 'click', () => {
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
        this.deps.addEventListenerSafe(loadClassBtn, 'click', () => this.loadClassNames());
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
                    const fixedSeatIds = this.deps.getFixedSeatIds();
                    if (fixedSeatIds.size > 0) {
                        fixedSeatIds.forEach(seatId => {
                            const option = document.createElement('option');
                            option.value = seatId.toString();
                            option.textContent = `좌석 #${seatId}`;
                            fixedSeatSelect.appendChild(option);
                        });
                    }
                    
                    // 학생 데이터에 저장된 고정 좌석이 있으면 선택
                    const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                    const students = this.deps.getStudents();
                    if (students[studentIndex] && students[studentIndex].fixedSeatId) {
                        fixedSeatSelect.value = students[studentIndex].fixedSeatId.toString();
                        // 번호 셀 배경색 설정 (초기 상태)
                        if (numCell) {
                            numCell.style.background = '#667eea';
                            numCell.style.color = 'white';
                            numCell.style.fontWeight = 'bold';
                        }
                    }
                    
                    // 고정 좌석 선택 변경 이벤트
                    this.deps.addEventListenerSafe(fixedSeatSelect, 'change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        
                        // 학생 데이터에 고정 좌석 ID 저장
                        const students = this.deps.getStudents();
                        if (students[studentIndex]) {
                            if (selectedSeatId) {
                                students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            } else {
                                delete students[studentIndex].fixedSeatId;
                            }
                            this.deps.setStudents(students);
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
                deleteBtn.onclick = () => this.deps.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);

                // 키보드 이벤트 추가 (이름 입력 필드)
                this.deps.addEventListenerSafe(nameInput, 'keydown', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Enter') {
                        genderSelect.focus();
                    } else if (ke.key === 'ArrowDown') {
                        this.deps.moveToCell(tbody, localIndex, 'name', 'down');
                    } else if (ke.key === 'ArrowUp') {
                        this.deps.moveToCell(tbody, localIndex, 'name', 'up');
                    }
                });

                // 키보드 이벤트 추가 (성별 선택 필드)
                this.deps.addEventListenerSafe(genderSelect, 'keydown', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Enter' || ke.key === 'Tab') {
                        const nextRow = tbody.querySelector(`tr:nth-child(${Math.min(localIndex + 1, studentsInThisTable)})`);
                        const nextNameInput = nextRow?.querySelector('.student-name-input') as HTMLInputElement;
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    } else if (ke.key === 'ArrowDown') {
                        this.deps.moveToCell(tbody, localIndex, 'gender', 'down');
                    } else if (ke.key === 'ArrowUp') {
                        this.deps.moveToCell(tbody, localIndex, 'gender', 'up');
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
        this.deps.uiManager.updateStudentTableStats();
        
        // 통계 업데이트를 위한 이벤트 리스너 추가 (이벤트 위임으로 모든 변경사항 감지)
        // 모든 테이블의 tbody에 이벤트 리스너 추가
        const allTbodies = studentTableContainer.querySelectorAll('tbody');
        allTbodies.forEach(tbody => {
            this.deps.addEventListenerSafe(tbody, 'input', () => {
                this.deps.uiManager.updateStudentTableStats();
            });
            this.deps.addEventListenerSafe(tbody, 'change', () => {
                this.deps.uiManager.updateStudentTableStats();
            });
            
            // 테이블이 동적으로 변경될 때를 대비한 MutationObserver 추가
            const observer = new MutationObserver(() => {
                this.deps.uiManager.updateStudentTableStats();
            });
            observer.observe(tbody, {
                childList: true,
                subtree: true,
                attributes: false
            });
        });

        // 테이블이 생성된 후 해당 위치로 스크롤
        this.deps.setTimeoutSafe(() => {
            studentTableContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);

        this.deps.outputModule.showInfo(`${count}명의 학생 명렬표가 생성되었습니다.`);
    }

    /**
     * 우리 반 이름 불러오기 처리
     * localStorage에 저장된 학생 데이터를 테이블에 로드
     */
    public loadClassNames(): void {
        try {
            const savedDataStr = this.deps.storageManager.safeGetItem('classStudentData');
            if (!savedDataStr) {
                this.deps.outputModule.showInfo('저장된 우리반 학생 데이터가 없습니다.');
                return;
            }

            // JSON 파싱 시도 (데이터 손상 처리)
            let savedData: Array<{name: string, gender: 'M' | 'F', fixedSeatId?: number}>;
            try {
                savedData = JSON.parse(savedDataStr);
                if (!Array.isArray(savedData)) {
                    throw new Error('Invalid data format');
                }
            } catch (parseError) {
                // 데이터 손상 시 저장소에서 제거하고 에러 메시지 표시
                try {
                    localStorage.removeItem('classStudentData');
                } catch {}
                this.deps.outputModule.showError('저장된 데이터가 손상되어 불러올 수 없습니다.');
                return;
            }
            
            if (!Array.isArray(savedData) || savedData.length === 0) {
                this.deps.outputModule.showInfo('저장된 우리반 학생 데이터가 없습니다.');
                return;
            }

            // 기존 테이블이 있는지 확인
            const outputSection = document.getElementById('output-section');
            if (!outputSection) {
                this.deps.outputModule.showError('테이블 영역을 찾을 수 없습니다.');
                return;
            }

            // 기존 테이블이 없으면 생성
            let existingTable = outputSection.querySelector('.student-input-table');
            if (!existingTable) {
                // 테이블이 없으면 먼저 테이블 생성
                this.createStudentTable(savedData.length);
                // 테이블이 생성될 때까지 잠시 대기
                this.deps.setTimeoutSafe(() => {
                    this.deps.csvFileHandler.loadStudentDataToTable(savedData);
                }, 100);
            } else {
                // 기존 테이블에 데이터 로드
                this.deps.csvFileHandler.loadStudentDataToTable(savedData);
            }
        } catch (error) {
            logger.error('우리반 학생 데이터 불러오기 중 오류:', error);
            this.deps.outputModule.showError('우리반 학생 데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 고정 좌석 드롭다운 업데이트
     */
    public updateFixedSeatDropdowns(): void {
        const fixedSeatSelects = document.querySelectorAll('.fixed-seat-select') as NodeListOf<HTMLSelectElement>;
        
        fixedSeatSelects.forEach(select => {
            const currentValue = select.value;
            const currentOption = select.querySelector(`option[value="${currentValue}"]`);
            
            // 기존 옵션 제거 (기본 옵션 제외)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild!);
            }
            
            // 고정 좌석 옵션 추가
            const fixedSeatIds = this.deps.getFixedSeatIds();
            if (fixedSeatIds.size > 0) {
                fixedSeatIds.forEach(seatId => {
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
            
            // 번호 셀 배경색 업데이트
            const row = select.closest('tr') as HTMLTableRowElement;
            if (row) {
                const numCell = row.querySelector('td:first-child') as HTMLElement;
                if (numCell) {
                    if (select.value) {
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
            }
        });
    }

    /**
     * 학생 행 추가 처리 (마지막 행 뒤에 추가)
     */
    public addStudentRow(): void {
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

                const newTbody = document.createElement('tbody');
                table.appendChild(newTbody);
                tableWrapper.appendChild(table);
                
                // 통계와 버튼 래퍼 앞에 삽입
                const statsAndButtonsWrapper = studentTableContainer.querySelector('div[style*="grid-column: 1 / -1"]') as HTMLElement | null;
                if (statsAndButtonsWrapper && statsAndButtonsWrapper.querySelector('#student-table-stats')) {
                    studentTableContainer.insertBefore(tableWrapper, statsAndButtonsWrapper);
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
            const fixedSeatIds = this.deps.getFixedSeatIds();
            if (fixedSeatIds.size > 0) {
                fixedSeatIds.forEach(seatId => {
                    const option = document.createElement('option');
                    option.value = seatId.toString();
                    option.textContent = `좌석 #${seatId}`;
                    fixedSeatSelect.appendChild(option);
                });
            }
            
            // 고정 좌석 선택 변경 이벤트
            this.deps.addEventListenerSafe(fixedSeatSelect, 'change', () => {
                const selectedSeatId = fixedSeatSelect.value;
                const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                
                // 학생 데이터에 고정 좌석 ID 저장
                const students = this.deps.getStudents();
                if (students[studentIndex]) {
                    if (selectedSeatId) {
                        students[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                    } else {
                        delete students[studentIndex].fixedSeatId;
                    }
                    this.deps.setStudents(students);
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
        
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        actionCell.style.padding = '8px';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-row-btn';
        deleteBtn.onclick = () => this.deps.handleDeleteStudentRow(row);
        actionCell.appendChild(deleteBtn);

        // 키보드 이벤트 추가
        this.deps.addEventListenerSafe(nameInput, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter') {
                genderSelect.focus();
            }
        });

        this.deps.addEventListenerSafe(genderSelect, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter' || ke.key === 'Tab') {
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
        this.deps.updateRowNumbers();
        
        // 통계 업데이트
        this.deps.uiManager.updateStudentTableStats();
        
        // 새 행에 이벤트 리스너 추가
        if (nameInput) {
            this.deps.addEventListenerSafe(nameInput, 'input', () => this.deps.uiManager.updateStudentTableStats());
        }
        if (genderSelect) {
            this.deps.addEventListenerSafe(genderSelect, 'change', () => this.deps.uiManager.updateStudentTableStats());
        }
        // 고정 좌석 셀에서 select 요소 찾기
        if (fixedSeatCell) {
            const fixedSeatSelectInCell = fixedSeatCell.querySelector('.fixed-seat-select') as HTMLSelectElement;
            if (fixedSeatSelectInCell) {
                this.deps.addEventListenerSafe(fixedSeatSelectInCell, 'change', () => this.deps.uiManager.updateStudentTableStats());
            }
        }
        
        // 새로 추가된 입력 필드에 포커스
        this.deps.setTimeoutSafe(() => {
            nameInput.focus();
        }, 100);
    }
}



