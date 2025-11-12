/**
 * 학생 입력 UI 모듈
 * 1단계: 학생 인원수 및 명렬표 입력 기능 담당
 */

/**
 * 학생 입력 데이터
 */
export interface StudentInputData {
    name: string;
    gender: 'M' | 'F';
}

/**
 * 학생 입력 모듈
 */
export class InputModule {
    private studentInputs: Map<number, { nameInput: HTMLInputElement, genderSelect: HTMLSelectElement }>;
    
    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        this.studentInputs = new Map();
        this.initializeEventListeners();
    }

    /**
     * 이벤트 리스너 초기화
     */
    private initializeEventListeners(): void {
        // 인원수 입력 필드 변경 이벤트는 MainController에서 처리
    }



    /**
     * 학생 행을 추가합니다.
     */
    public addStudentRow(): void {
        this.addStudentRowToContainer();
    }

    /**
     * 컨테이너에 학생 행 추가 (내부 메서드)
     */
    private addStudentRowToContainer(): void {
        const container = document.getElementById('student-list-container');
        if (!container) return;

        const rowIndex = this.studentInputs.size;
        const row = document.createElement('div');
        row.className = 'student-row';
        row.dataset.index = rowIndex.toString();

        // 번호 표시
        const numberSpan = document.createElement('span');
        numberSpan.textContent = `${rowIndex + 1}. `;
        numberSpan.style.minWidth = '40px';
        
        // 이름 입력 필드
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '학생 이름';
        nameInput.id = `student-name-${rowIndex}`;
        
        // 성별 선택 필드
        const genderSelect = document.createElement('select');
        genderSelect.id = `student-gender-${rowIndex}`;
        genderSelect.innerHTML = `
            <option value="M">남학생</option>
            <option value="F">여학생</option>
        `;
        
        // 삭제 버튼
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.type = 'button';
        deleteBtn.onclick = () => this.removeStudentRow(rowIndex);

        row.appendChild(numberSpan);
        row.appendChild(nameInput);
        row.appendChild(genderSelect);
        row.appendChild(deleteBtn);

        container.appendChild(row);

        // 입력 필드 참조 저장
        this.studentInputs.set(rowIndex, { nameInput, genderSelect });
    }

    /**
     * 학생 행을 제거합니다.
     * @param rowIndex 제거할 행 인덱스
     */
    private removeStudentRow(rowIndex: number): void {
        const row = document.querySelector(`[data-index="${rowIndex}"]`);
        if (row) {
            row.remove();
        }
        this.studentInputs.delete(rowIndex);
        
        // 인덱스 재정렬
        this.reindexRows();
    }

    /**
     * 학생 행의 인덱스를 재정렬합니다.
     */
    private reindexRows(): void {
        const container = document.getElementById('student-list-container');
        if (!container) return;

        const rows = container.querySelectorAll('.student-row');
        let index = 0;
        rows.forEach((row) => {
            const span = row.querySelector('span');
            if (span) {
                span.textContent = `${index + 1}. `;
            }
            row.setAttribute('data-index', index.toString());
            index++;
        });
    }

    /**
     * 입력된 학생 데이터를 가져옵니다.
     * @returns 학생 입력 데이터 배열
     */
    public getStudentData(): StudentInputData[] {
        const students: StudentInputData[] = [];
        
        // 우측 테이블에서 데이터 읽기
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr');
        
        if (rows && rows.length > 0) {
            rows.forEach((row) => {
                const nameInput = row.querySelector('.student-name-input') as HTMLInputElement;
                const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
                
                if (nameInput && genderSelect) {
                    const name = nameInput.value.trim();
                    const gender = genderSelect.value as 'M' | 'F';
                    
                    if (name && gender) {
                        students.push({ name, gender });
                    }
                }
            });
        } else {
            // fallback: 기존 studentInputs에서 읽기
            this.studentInputs.forEach((input) => {
                const name = input.nameInput.value.trim();
                const gender = input.genderSelect.value as 'M' | 'F';
                
                if (name) {
                    students.push({ name, gender });
                }
            });
        }
        
        return students;
    }

    /**
     * 학생 데이터를 설정합니다 (되돌리기 기능용)
     * @param students 설정할 학생 데이터 배열
     */
    public setStudentData(students: StudentInputData[]): void {
        // 기존 테이블 제거
        const outputSection = document.getElementById('output-section');
        const existingTable = outputSection?.querySelector('.student-input-table');
        if (existingTable) {
            existingTable.remove();
        }
        
        // 새 테이블 생성
        if (students.length > 0) {
            // MainController의 createStudentTable 메서드를 호출하거나 직접 테이블 생성
            // 여기서는 간단히 데이터만 저장하고, MainController에서 테이블을 다시 생성하도록 함
            // 실제로는 MainController의 createStudentTable을 호출해야 함
            console.log('학생 데이터 설정:', students);
        }
    }

    /**
     * 학생 인원수를 가져옵니다.
     * @returns 학생 인원수
     */
    public getStudentCount(): number {
        const input = document.getElementById('total-students') as HTMLInputElement;
        return parseInt(input?.value || '0', 10);
    }

    /**
     * 입력 데이터를 검증합니다.
     * @returns 검증 성공 여부 및 에러 메시지
     */
    public validateInput(): { isValid: boolean, errorMessage?: string } {
        const countInput = document.getElementById('total-students') as HTMLInputElement;
        const expectedCount = parseInt(countInput?.value || '0', 10);
        
        if (expectedCount <= 0) {
            return { isValid: false, errorMessage: '학생 인원수를 입력해주세요.' };
        }
        
        const studentData = this.getStudentData();
        
        if (studentData.length !== expectedCount) {
            return { 
                isValid: false, 
                errorMessage: `학생 수가 일치하지 않습니다. (입력: ${studentData.length}, 예상: ${expectedCount})` 
            };
        }
        
        // 빈 이름 체크
        const hasEmptyName = studentData.some(s => !s.name);
        if (hasEmptyName) {
            return { isValid: false, errorMessage: '모든 학생의 이름을 입력해주세요.' };
        }
        
        // 중복 이름 체크
        const names = studentData.map(s => s.name.toLowerCase());
        const uniqueNames = new Set(names);
        if (names.length !== uniqueNames.size) {
            return { isValid: false, errorMessage: '중복된 학생 이름이 있습니다.' };
        }
        
        return { isValid: true };
    }


    /**
     * 입력을 초기화합니다.
     */
    public reset(): void {
        this.studentInputs.clear();
        const container = document.getElementById('student-list-container');
        if (container) {
            container.innerHTML = '';
        }
        this.addStudentRow();
    }
}

