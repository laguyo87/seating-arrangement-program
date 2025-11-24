/**
 * CSV 파일 핸들러
 * CSV/엑셀 파일 업로드, 다운로드, 파싱 및 학생 테이블 생성 담당
 */

import { OutputModule } from '../modules/OutputModule.js';
import { logger } from '../utils/logger.js';
import * as XLSX from 'xlsx';

/**
 * CSVFileHandler가 필요로 하는 의존성 인터페이스
 */
export interface CSVFileHandlerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    handleCreateStudentTable: (count: number) => void;
    handleLoadClassNames: () => void;
    handleDeleteStudentRow: (row: HTMLTableRowElement) => void;
    updateStudentTableStats: () => void;
    getFixedSeatIds: () => Set<number>;
    getStudents: () => Array<{name: string, gender: 'M' | 'F', fixedSeatId?: number}>;
    setStudents: (students: Array<{name: string, gender: 'M' | 'F', fixedSeatId?: number}>) => void;
    syncSidebarToTable: (maleCount: number, femaleCount: number) => void;
    moveToCell: (tbody: HTMLTableSectionElement, currentRow: number, columnName: 'name' | 'gender', direction: 'up' | 'down') => void;
}

/**
 * CSV 파일 핸들러 클래스
 */
export class CSVFileHandler {
    private deps: CSVFileHandlerDependencies;

    constructor(dependencies: CSVFileHandlerDependencies) {
        this.deps = dependencies;
    }

    /**
     * 템플릿 파일 다운로드
     */
    public downloadTemplateFile(): void {
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
        
        this.deps.outputModule.showSuccess('양식 파일이 다운로드되었습니다. 엑셀로 열어서 학생 정보를 입력하세요.');
    }

    /**
     * 파일 형식 자동 감지
     */
    private detectFileType(file: File): 'csv' | 'xlsx' | 'xls' | 'unknown' {
        const fileName = file.name.toLowerCase();
        const mimeType = file.type;
        
        // MIME 타입으로 먼저 확인
        if (mimeType === 'text/csv' || mimeType === 'application/csv') {
            return 'csv';
        }
        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return 'xlsx';
        }
        if (mimeType === 'application/vnd.ms-excel') {
            return 'xls';
        }
        
        // 확장자로 확인
        if (fileName.endsWith('.csv')) {
            return 'csv';
        }
        if (fileName.endsWith('.xlsx')) {
            return 'xlsx';
        }
        if (fileName.endsWith('.xls')) {
            return 'xls';
        }
        
        return 'unknown';
    }

    /**
     * 파일 업로드 처리
     */
    public handleFileUpload(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        
        if (!file) return;
        
        // 파일 형식 자동 감지
        const fileType = this.detectFileType(file);
        
        if (fileType === 'unknown') {
            this.deps.outputModule.showError('CSV 또는 엑셀 파일(.csv, .xlsx, .xls)만 업로드 가능합니다.');
            return;
        }
        
        // 파일 크기 확인 (최대 5MB)
        const fileSize = file.size;
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (fileSize > maxSize) {
            this.deps.outputModule.showError(`파일 크기가 너무 큽니다. 최대 5MB까지 지원됩니다. (현재: ${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
            return;
        }
        
        // 파일 크기에 따라 프로그레스 바 사용 여부 결정
        const useProgress = fileSize > 100000; // 100KB 이상일 때 프로그레스 바 사용
        
        let updateProgress: ((progress: number, statusMessage?: string) => void) | null = null;
        
        if (useProgress) {
            updateProgress = this.deps.outputModule.showProgress('파일을 읽는 중입니다...', 0);
        } else {
            this.deps.outputModule.showInfo('파일을 읽는 중입니다...');
        }
        
        // 파일 형식에 따라 처리
        if (fileType === 'csv') {
            this.readCsvFile(file, updateProgress);
        } else if (fileType === 'xlsx' || fileType === 'xls') {
            this.readExcelFile(file, updateProgress);
        }
    }

    /**
     * CSV 파일 읽기
     */
    private readCsvFile(file: File, updateProgress: ((progress: number, statusMessage?: string) => void) | null): void {
        const reader = new FileReader();
        const fileSize = file.size;
        
        // 진행률 업데이트 (FileReader API는 진행률을 직접 제공하지 않으므로 추정)
        if (updateProgress) {
            let loadedBytes = 0;
            const totalBytes = fileSize;
            
            // 파일 읽기 시작
            updateProgress(10, 'CSV 파일 읽기 시작...');
            
            // 주기적으로 진행률 업데이트 (추정)
            const progressInterval = setInterval(() => {
                if (loadedBytes < totalBytes) {
                    loadedBytes = Math.min(loadedBytes + totalBytes / 20, totalBytes * 0.9);
                    const progress = 10 + (loadedBytes / totalBytes) * 80;
                    updateProgress!(progress, `파일 읽는 중... (${Math.round(progress)}%)`);
                }
            }, 100);
            
            reader.onload = (e) => {
                clearInterval(progressInterval);
                if (updateProgress) {
                    updateProgress(100, '파일 읽기 완료');
                    setTimeout(() => {
                        this.deps.outputModule.hideProgress();
                    }, 500);
                }
                
                try {
                    const text = e.target?.result as string;
                    const students = this.parseCsvFile(text);
                    if (students) {
                        this.showPreviewAndConfirm(students, file.name);
                    }
                } catch (error) {
                    logger.error('CSV 파일 읽기 오류:', error);
                    this.deps.outputModule.showError('파일을 읽는 중 오류가 발생했습니다.');
                }
            };
        } else {
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const students = this.parseCsvFile(text);
                    if (students) {
                        this.showPreviewAndConfirm(students, file.name);
                    }
                } catch (error) {
                    logger.error('CSV 파일 읽기 오류:', error);
                    this.deps.outputModule.showError('파일을 읽는 중 오류가 발생했습니다.');
                }
            };
        }
        
        reader.onerror = () => {
            if (updateProgress) {
                this.deps.outputModule.hideProgress();
            }
            this.deps.outputModule.showError('파일을 읽는 중 오류가 발생했습니다.');
        };
        
        reader.readAsText(file, 'UTF-8');
    }

    /**
     * 엑셀 파일 읽기
     */
    private readExcelFile(file: File, updateProgress: ((progress: number, statusMessage?: string) => void) | null): void {
        const reader = new FileReader();
        
        if (updateProgress) {
            updateProgress(20, '엑셀 파일 읽기 시작...');
        }
        
        reader.onload = (e) => {
            try {
                if (updateProgress) {
                    updateProgress(50, '엑셀 파일 파싱 중...');
                }
                
                const data = e.target?.result;
                if (!data) {
                    throw new Error('파일 데이터를 읽을 수 없습니다.');
                }
                
                // XLSX 라이브러리로 엑셀 파일 읽기
                const workbook = XLSX.read(data, { type: 'binary' });
                
                if (updateProgress) {
                    updateProgress(70, '데이터 변환 중...');
                }
                
                // 첫 번째 시트 사용
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // JSON으로 변환
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
                
                if (updateProgress) {
                    updateProgress(90, '데이터 검증 중...');
                }
                
                // 엑셀 데이터를 학생 배열로 변환
                const students = this.parseExcelData(jsonData);
                
                if (updateProgress) {
                    updateProgress(100, '파일 읽기 완료');
                    setTimeout(() => {
                        this.deps.outputModule.hideProgress();
                    }, 500);
                }
                
                if (students && students.length > 0) {
                    this.showPreviewAndConfirm(students, file.name);
                } else {
                    this.deps.outputModule.showError('엑셀 파일에서 유효한 학생 정보를 읽을 수 없습니다.');
                }
            } catch (error) {
                logger.error('엑셀 파일 읽기 오류:', error);
                if (updateProgress) {
                    this.deps.outputModule.hideProgress();
                }
                this.deps.outputModule.showError('엑셀 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
            }
        };
        
        reader.onerror = () => {
            if (updateProgress) {
                this.deps.outputModule.hideProgress();
            }
            this.deps.outputModule.showError('파일을 읽는 중 오류가 발생했습니다.');
        };
        
        // 엑셀 파일은 바이너리로 읽기
        reader.readAsBinaryString(file);
    }

    /**
     * 엑셀 데이터 파싱
     */
    private parseExcelData(jsonData: any[][]): Array<{name: string, gender: 'M' | 'F'}> | null {
        try {
            if (!jsonData || jsonData.length < 2) {
                return null;
            }
            
            const students: Array<{name: string, gender: 'M' | 'F'}> = [];
            const errors: string[] = [];
            
            // 첫 번째 행은 헤더로 간주하고 건너뛰기
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length < 3) {
                    continue;
                }
                
                // 번호, 이름, 성별 순서로 가정
                const name = String(row[1] || '').trim();
                const gender = String(row[2] || '').trim();
                
                // 이름 검증
                if (!name || name.length === 0) {
                    continue; // 빈 행은 건너뛰기
                }
                
                if (name.length > 20) {
                    errors.push(`${i + 1}번째 줄: 이름이 너무 깁니다 (최대 20자).`);
                    continue;
                }
                
                // 성별 검증
                if (!gender || (gender !== '남' && gender !== '여' && gender !== 'M' && gender !== 'F')) {
                    errors.push(`${i + 1}번째 줄: 성별이 올바르지 않습니다 (남/여 또는 M/F).`);
                    continue;
                }
                
                const normalizedGender = (gender === '남' || gender === 'M') ? 'M' : 'F';
                students.push({ name, gender: normalizedGender });
            }
            
            // 에러가 있으면 일부만 표시
            if (errors.length > 0) {
                const errorMsg = errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... 외 ${errors.length - 5}개 오류` : '');
                this.deps.outputModule.showInfo(`엑셀 파일에 일부 오류가 있습니다:\n${errorMsg}`);
            }
            
            if (students.length === 0) {
                return null;
            }
            
            // 중복 이름 체크
            const names = students.map(s => s.name.toLowerCase());
            const uniqueNames = new Set(names);
            if (names.length !== uniqueNames.size) {
                this.deps.outputModule.showError('엑셀 파일에 중복된 이름이 있습니다. 모든 이름은 고유해야 합니다.');
                return null;
            }
            
            return students;
        } catch (error) {
            logger.error('엑셀 데이터 파싱 오류:', error);
            return null;
        }
    }

    /**
     * 미리보기 및 확인 다이얼로그 표시
     */
    private showPreviewAndConfirm(students: Array<{name: string, gender: 'M' | 'F'}>, fileName: string): void {
        // 미리보기 모달 생성
        const modal = document.createElement('div');
        modal.className = 'file-preview-modal';
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
            border-radius: 12px;
            padding: 24px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        const title = document.createElement('h3');
        title.textContent = `파일 미리보기: ${fileName}`;
        title.style.cssText = 'margin: 0 0 16px 0; font-size: 1.2em; color: #333;';
        modalContent.appendChild(title);
        
        const info = document.createElement('p');
        info.textContent = `총 ${students.length}명의 학생 정보를 찾았습니다.`;
        info.style.cssText = 'margin: 0 0 16px 0; color: #666;';
        modalContent.appendChild(info);
        
        // 미리보기 테이블
        const previewTable = document.createElement('table');
        previewTable.style.cssText = 'width: 100%; border-collapse: collapse; margin-bottom: 16px;';
        
        // 헤더
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = 'background: #f5f5f5;';
        ['번호', '이름', '성별'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.cssText = 'padding: 8px; text-align: left; border: 1px solid #ddd;';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        previewTable.appendChild(thead);
        
        // 본문 (최대 10개만 표시)
        const tbody = document.createElement('tbody');
        const previewCount = Math.min(students.length, 10);
        for (let i = 0; i < previewCount; i++) {
            const student = students[i];
            const tr = document.createElement('tr');
            [i + 1, student.name, student.gender === 'M' ? '남' : '여'].forEach((text, idx) => {
                const td = document.createElement('td');
                td.textContent = String(text);
                td.style.cssText = 'padding: 8px; border: 1px solid #ddd;';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
        previewTable.appendChild(tbody);
        modalContent.appendChild(previewTable);
        
        if (students.length > 10) {
            const moreInfo = document.createElement('p');
            moreInfo.textContent = `... 외 ${students.length - 10}명`;
            moreInfo.style.cssText = 'margin: 0 0 16px 0; color: #999; font-style: italic;';
            modalContent.appendChild(moreInfo);
        }
        
        // 버튼 컨테이너
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '취소';
        cancelBtn.className = 'secondary-btn';
        cancelBtn.style.cssText = 'padding: 8px 16px;';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        buttonContainer.appendChild(cancelBtn);
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '확인 및 적용';
        confirmBtn.className = 'primary-btn';
        confirmBtn.style.cssText = 'padding: 8px 16px;';
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.applyStudentData(students);
        });
        buttonContainer.appendChild(confirmBtn);
        
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        
        // 모달 배경 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
    }

    /**
     * 학생 데이터 적용
     */
    private applyStudentData(students: Array<{name: string, gender: 'M' | 'F'}>): void {
        // 대용량 데이터 처리 개선: 청크 단위로 처리
        if (students.length > 100) {
            // 100명 이상일 때는 청크 단위로 비동기 처리
            this.deps.outputModule.showInfo(`대용량 파일 처리 중... (${students.length}명)`);
            this.deps.setTimeoutSafe(() => {
                this.createTableWithStudentsAsync(students);
                this.updateStudentCounts(students);
            }, 50);
        } else if (students.length > 50) {
            // 50명 이상일 때는 짧은 지연 후 처리
            this.deps.setTimeoutSafe(() => {
                this.createTableWithStudents(students);
                this.updateStudentCounts(students);
            }, 50);
        } else {
            // 50명 이하는 즉시 처리
            this.createTableWithStudents(students);
            this.updateStudentCounts(students);
        }
        
        // 파일 input 초기화
        const uploadInput = document.getElementById('upload-file-input') as HTMLInputElement;
        if (uploadInput) {
            uploadInput.value = '';
        }
        
        this.deps.outputModule.showSuccess(`${students.length}명의 학생 정보가 성공적으로 불러와졌습니다.`);
    }

    /**
     * 대용량 데이터를 위한 비동기 테이블 생성
     */
    private createTableWithStudentsAsync(students: Array<{name: string, gender: 'M' | 'F'}>): void {
        const chunkSize = 50;
        let currentIndex = 0;
        
        const processChunk = () => {
            const chunk = students.slice(currentIndex, currentIndex + chunkSize);
            if (chunk.length > 0) {
                if (currentIndex === 0) {
                    // 첫 번째 청크는 테이블 생성
                    this.createTableWithStudents(chunk);
                } else {
                    // 이후 청크는 테이블에 추가
                    this.appendStudentsToTable(chunk);
                }
                currentIndex += chunkSize;
                
                // 다음 청크 처리
                if (currentIndex < students.length) {
                    this.deps.setTimeoutSafe(processChunk, 10);
                } else {
                    this.deps.outputModule.hideProgress();
                }
            }
        };
        
        processChunk();
    }

    /**
     * 테이블에 학생 데이터 추가 (대용량 파일용)
     */
    private appendStudentsToTable(students: Array<{name: string, gender: 'M' | 'F'}>): void {
        const outputSection = document.getElementById('output-section');
        if (!outputSection) return;
        
        const studentTableContainer = outputSection.querySelector('.student-table-container') as HTMLElement | null;
        if (!studentTableContainer) return;
        
        // 모든 테이블의 tbody 찾기
        const allTbodies = studentTableContainer.querySelectorAll('tbody');
        if (allTbodies.length === 0) return;
        
        // 마지막 테이블의 tbody 사용
        const lastTbody = allTbodies[allTbodies.length - 1] as HTMLTableSectionElement;
        
        // 기존 학생 수 확인
        const existingRows = lastTbody.querySelectorAll('tr');
        const startIndex = existingRows.length;
        
        students.forEach((student, index) => {
            const globalIndex = startIndex + index + 1;
            const row = this.createStudentTableRow(student, globalIndex, lastTbody);
            lastTbody.appendChild(row);
        });
        
        // 통계 업데이트
        this.deps.updateStudentTableStats();
    }

    /**
     * 학생 테이블 행 생성
     */
    private createStudentTableRow(student: {name: string, gender: 'M' | 'F'}, globalIndex: number, tbody: HTMLTableSectionElement): HTMLTableRowElement {
        const row = document.createElement('tr');
        row.dataset.studentIndex = (globalIndex - 1).toString();
        
        // 고정 좌석 모드인지 확인
        const fixedRandomMode = document.querySelector('input[name="custom-mode-2"][value="fixed-random"]:checked') as HTMLInputElement;
        
        // 번호 열
        const numCell = document.createElement('td');
        numCell.textContent = globalIndex.toString();
        numCell.style.textAlign = 'center';
        numCell.style.padding = '10px';
        numCell.style.background = '#f8f9fa';
        row.appendChild(numCell);

        // 이름 입력 열
        const nameCell = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'student-name-input';
        nameInput.id = `student-name-${globalIndex}`;
        nameInput.value = student.name;
        nameInput.placeholder = '학생 이름';
        nameCell.appendChild(nameInput);
        row.appendChild(nameCell);

        // 성별 선택 열
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

        // 고정 좌석 선택 열 (고정 좌석 모드인 경우)
        if (fixedRandomMode) {
            const fixedSeatCell = document.createElement('td');
            const fixedSeatSelect = document.createElement('select');
            fixedSeatSelect.className = 'fixed-seat-select';
            fixedSeatSelect.id = `fixed-seat-${globalIndex}`;
            fixedSeatSelect.innerHTML = '<option value="">없음</option>';
            
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
            
            this.deps.addEventListenerSafe(fixedSeatSelect, 'change', () => {
                const selectedSeatId = fixedSeatSelect.value;
                const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                
                const currentStudents = this.deps.getStudents();
                if (currentStudents[studentIndex]) {
                    if (selectedSeatId) {
                        currentStudents[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                    } else {
                        delete currentStudents[studentIndex].fixedSeatId;
                    }
                    this.deps.setStudents([...currentStudents]);
                }
                
                // 번호 셀 배경색 변경
                const numCell = row.querySelector('td:first-child') as HTMLElement;
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
            
            fixedSeatCell.appendChild(fixedSeatSelect);
            row.appendChild(fixedSeatCell);
        }
        
        // 작업 열 (삭제 버튼)
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        actionCell.style.padding = '8px';
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-row-btn';
        deleteBtn.title = '삭제';
        deleteBtn.onclick = () => this.deps.handleDeleteStudentRow(row);
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        // 키보드 이벤트 추가
        const localIndex = Array.from(tbody.querySelectorAll('tr')).length + 1;
        this.deps.addEventListenerSafe(nameInput, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter') {
                const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
                if (genderSelect) {
                    genderSelect.focus();
                }
            } else if (ke.key === 'ArrowDown') {
                this.deps.moveToCell(tbody, localIndex, 'name', 'down');
            } else if (ke.key === 'ArrowUp') {
                this.deps.moveToCell(tbody, localIndex, 'name', 'up');
            }
        });

        this.deps.addEventListenerSafe(genderSelect, 'keydown', (e: Event) => {
            const ke = e as KeyboardEvent;
            if (ke.key === 'Enter' || ke.key === 'Tab') {
                const nextRow = tbody.querySelector(`tr:nth-child(${localIndex + 1})`);
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

        return row;
    }

    /**
     * CSV 파일 파싱 및 학생 배열 반환
     */
    private parseCsvFile(csvText: string): Array<{name: string, gender: 'M' | 'F'}> | null {
        try {
            // 파일 크기 검증 (최대 5MB)
            if (csvText.length > 5 * 1024 * 1024) {
                this.deps.outputModule.showError('파일 크기가 너무 큽니다. 최대 5MB까지 지원됩니다.');
                return null;
            }
            
            // BOM 제거
            csvText = csvText.replace(/^\uFEFF/, '');
            
            // 줄바꿈 정리
            csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            
            const lines = csvText.split('\n').filter(line => line.trim().length > 0);
            
            // 최소 2줄 필요 (헤더 + 데이터 1줄)
            if (lines.length < 2) {
                this.deps.outputModule.showError('CSV 파일 형식이 올바르지 않습니다. 최소한 헤더와 데이터 1줄이 필요합니다.');
                return null;
            }
            
            // 헤더 검증 (헤더가 없어도 동작하도록 유연하게 처리)
            const headerLine = lines[0].trim();
            const headerColumns = headerLine.split(',').map(col => col.trim());
            const hasHeader = headerColumns.length >= 3 && 
                             (headerColumns[0].includes('번호') || headerColumns[0].includes('번호') || 
                              headerColumns[1].includes('이름') || headerColumns[2].includes('성별'));
            
            const startIndex = hasHeader ? 1 : 0;
            
            const students: Array<{name: string, gender: 'M' | 'F'}> = [];
            const errors: string[] = [];
            
            // 데이터 파싱 (헤더가 있으면 제외)
            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // CSV 파싱 (쉼표로 구분, 따옴표 처리)
                const columns = this.parseCsvLine(line);
                
                if (columns.length < 3) {
                    errors.push(`${i + 1}번째 줄: 열 수가 부족합니다.`);
                    continue;
                }
                
                const name = columns[1]?.trim() || '';
                const gender = columns[2]?.trim() || '';
                
                // 이름 검증
                if (!name || name.length === 0) {
                    errors.push(`${i + 1}번째 줄: 이름이 비어있습니다.`);
                    continue;
                }
                
                if (name.length > 20) {
                    errors.push(`${i + 1}번째 줄: 이름이 너무 깁니다 (최대 20자).`);
                    continue;
                }
                
                // 성별 검증
                if (!gender || (gender !== '남' && gender !== '여' && gender !== 'M' && gender !== 'F')) {
                    errors.push(`${i + 1}번째 줄: 성별이 올바르지 않습니다 (남/여 또는 M/F).`);
                    continue;
                }
                
                const normalizedGender = (gender === '남' || gender === 'M') ? 'M' : 'F';
                students.push({ name, gender: normalizedGender });
            }
            
            // 에러가 있으면 일부만 표시
            if (errors.length > 0) {
                const errorMsg = errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... 외 ${errors.length - 5}개 오류` : '');
                this.deps.outputModule.showError(`CSV 파일에 오류가 있습니다:\n${errorMsg}`);
            }
            
            if (students.length === 0) {
                this.deps.outputModule.showError('파일에서 유효한 학생 정보를 읽을 수 없습니다. 양식을 확인해주세요.');
                return null;
            }
            
            // 중복 이름 체크
            const names = students.map(s => s.name.toLowerCase());
            const uniqueNames = new Set(names);
            if (names.length !== uniqueNames.size) {
                this.deps.outputModule.showError('CSV 파일에 중복된 이름이 있습니다. 모든 이름은 고유해야 합니다.');
                return null;
            }
            
            return students;
        } catch (error) {
            logger.error('CSV 파싱 오류:', error);
            this.deps.outputModule.showError('CSV 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
            return null;
        }
    }

    /**
     * CSV 라인 파싱 (따옴표 처리)
     */
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // 이스케이프된 따옴표
                    current += '"';
                    i++;
                } else {
                    // 따옴표 시작/끝
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // 쉼표로 구분
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // 마지막 열 추가
        result.push(current);
        
        return result;
    }

    /**
     * 학생 데이터로 테이블 생성
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
        this.deps.addEventListenerSafe(downloadBtn, 'click', () => this.downloadTemplateFile());
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
        this.deps.addEventListenerSafe(fileInput, 'change', (e) => this.handleFileUpload(e));
        
        this.deps.addEventListenerSafe(uploadBtn, 'click', () => {
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
        this.deps.addEventListenerSafe(loadClassBtn3, 'click', () => this.deps.handleLoadClassNames());
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
                min-width: 0;
                overflow-x: auto;
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
                const globalIndex = i + 1;
                const localIndex = i - startIndex + 1;
                
                const row = document.createElement('tr');
                row.dataset.studentIndex = i.toString();
                
                // 번호 열
                const numCell = document.createElement('td');
                numCell.textContent = globalIndex.toString();
                numCell.style.textAlign = 'center';
                numCell.style.padding = '10px';
                numCell.style.background = '#f8f9fa';
                row.appendChild(numCell);

                // 이름 입력 열
                const nameCell = document.createElement('td');
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'student-name-input';
                nameInput.id = `student-name-${globalIndex}`;
                nameInput.value = student.name;
                nameInput.placeholder = '학생 이름';
                nameCell.appendChild(nameInput);
                row.appendChild(nameCell);

                // 성별 선택 열
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

                // 고정 좌석 선택 열 (고정 좌석 모드인지 확인)
                if (fixedRandomMode) {
                    const fixedSeatCell = document.createElement('td');
                    const fixedSeatSelect = document.createElement('select');
                    fixedSeatSelect.className = 'fixed-seat-select';
                    fixedSeatSelect.id = `fixed-seat-${globalIndex}`;
                    fixedSeatSelect.innerHTML = '<option value="">없음</option>';
                    
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
                    
                    this.deps.addEventListenerSafe(fixedSeatSelect, 'change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        
                        const currentStudents = this.deps.getStudents();
                        if (currentStudents[studentIndex]) {
                            if (selectedSeatId) {
                                currentStudents[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            } else {
                                delete currentStudents[studentIndex].fixedSeatId;
                            }
                            this.deps.setStudents([...currentStudents]);
                        }
                        
                        // 번호 셀 배경색 변경
                        const numCell = row.querySelector('td:first-child') as HTMLElement;
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
                    
                    fixedSeatCell.appendChild(fixedSeatSelect);
                    row.appendChild(fixedSeatCell);
                }
                
                // 작업 열 (삭제 버튼)
                const actionCell = document.createElement('td');
                actionCell.style.textAlign = 'center';
                actionCell.style.padding = '8px';
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.title = '삭제';
                deleteBtn.onclick = () => this.deps.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);
                row.appendChild(actionCell);

                // 키보드 이벤트 추가 (이름 입력 필드)
                this.deps.addEventListenerSafe(nameInput, 'keydown', (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key === 'Enter') {
                        const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
                        if (genderSelect) {
                            genderSelect.focus();
                        }
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

                tbody.appendChild(row);
            }
            
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            studentTableContainer.appendChild(tableWrapper);
        }
        
        // 통계 및 버튼 컨테이너
        const statsAndButtonsWrapper = document.createElement('div');
        statsAndButtonsWrapper.style.cssText = `
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            gap: 15px;
            margin-top: 10px;
            flex-wrap: wrap;
        `;
        
        // 통계 표시를 위한 컨테이너 추가
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
        this.deps.updateStudentTableStats();
        
        // 통계 업데이트를 위한 이벤트 리스너 추가
        const allTbodies = studentTableContainer.querySelectorAll('tbody');
        allTbodies.forEach(tbody => {
            this.deps.addEventListenerSafe(tbody, 'input', () => {
                this.deps.updateStudentTableStats();
            });
            this.deps.addEventListenerSafe(tbody, 'change', () => {
                this.deps.updateStudentTableStats();
            });
        });
        
        this.deps.outputModule.showSuccess(`${students.length}명의 학생 정보가 업로드되었습니다.`);
    }

    /**
     * 저장된 학생 데이터를 테이블에 로드
     */
    public loadStudentDataToTable(studentData: Array<{name: string, gender: 'M' | 'F', fixedSeatId?: number}>, retryCount: number = 0): void {
        const MAX_RETRIES = 5;
        const outputSection = document.getElementById('output-section');
        
        if (!outputSection) {
            if (retryCount < MAX_RETRIES) {
                this.deps.setTimeoutSafe(() => {
                    this.loadStudentDataToTable(studentData, retryCount + 1);
                }, 100);
            } else {
                this.deps.outputModule.showError('출력 영역을 찾을 수 없습니다.');
            }
            return;
        }

        // 기존 테이블이 없으면 새로 생성
        let studentTableContainer = outputSection.querySelector('.student-table-container') as HTMLElement | null;
        if (!studentTableContainer) {
            this.deps.handleCreateStudentTable(studentData.length);
            // 테이블이 생성될 때까지 잠시 대기
            if (retryCount < MAX_RETRIES) {
                this.deps.setTimeoutSafe(() => {
                    this.loadStudentDataToTable(studentData, retryCount + 1);
                }, 100);
            } else {
                this.deps.outputModule.showError('학생 테이블을 생성할 수 없습니다.');
            }
            return;
        }

        // 모든 테이블의 tbody 가져오기
        const allTbodies = outputSection.querySelectorAll('.student-input-table tbody');
        if (allTbodies.length === 0) {
            // 테이블이 없으면 새로 생성
            this.deps.handleCreateStudentTable(studentData.length);
            if (retryCount < MAX_RETRIES) {
                this.deps.setTimeoutSafe(() => {
                    this.loadStudentDataToTable(studentData, retryCount + 1);
                }, 100);
            } else {
                this.deps.outputModule.showError('학생 테이블의 tbody를 찾을 수 없습니다.');
            }
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
                const globalIndex = i + 1;

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
                    const fixedSeatIds = this.deps.getFixedSeatIds();
                    if (fixedSeatIds.size > 0) {
                        fixedSeatIds.forEach(seatId => {
                            const option = document.createElement('option');
                            option.value = seatId.toString();
                            option.textContent = `좌석 #${seatId}`;
                            if (student.fixedSeatId === seatId) {
                                option.selected = true;
                            }
                            fixedSeatSelect.appendChild(option);
                        });
                    }
                    
                    this.deps.addEventListenerSafe(fixedSeatSelect, 'change', () => {
                        const selectedSeatId = fixedSeatSelect.value;
                        const studentIndex = parseInt(row.dataset.studentIndex || '0', 10);
                        
                        const currentStudents = this.deps.getStudents();
                        if (currentStudents[studentIndex]) {
                            if (selectedSeatId) {
                                currentStudents[studentIndex].fixedSeatId = parseInt(selectedSeatId, 10);
                            } else {
                                delete currentStudents[studentIndex].fixedSeatId;
                            }
                            this.deps.setStudents([...currentStudents]);
                        }
                        
                        // 번호 셀 배경색 변경
                        const numCell = row.querySelector('td:first-child') as HTMLElement;
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
                    
                    fixedSeatCell.appendChild(fixedSeatSelect);
                    row.appendChild(fixedSeatCell);
                }
                
                // 작업 열 (삭제 버튼)
                const actionCell = document.createElement('td');
                actionCell.style.textAlign = 'center';
                actionCell.style.padding = '8px';
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.title = '삭제';
                deleteBtn.onclick = () => this.deps.handleDeleteStudentRow(row);
                actionCell.appendChild(deleteBtn);
                row.appendChild(actionCell);

                tbody.appendChild(row);
            }
        });
        
        // 통계 업데이트
        this.deps.updateStudentTableStats();
    }

    /**
     * 학생 수 입력 필드 업데이트
     */
    private updateStudentCounts(students: Array<{name: string, gender: 'M' | 'F'}>): void {
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        
        if (maleCountInput && femaleCountInput) {
            const maleStudents = students.filter(s => s.gender === 'M').length;
            const femaleStudents = students.filter(s => s.gender === 'F').length;
            
            maleCountInput.value = maleStudents.toString();
            femaleCountInput.value = femaleStudents.toString();
        }
    }
}

