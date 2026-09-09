/**
 * 학생 입력 UI 모듈
 * 명렬표에 입력된 학생 데이터를 읽는 역할을 담당한다.
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
    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
    }

    /**
     * 입력된 학생 데이터를 가져옵니다.
     * @returns 학생 입력 데이터 배열
     */
    public getStudentData(): StudentInputData[] {
        const students: StudentInputData[] = [];

        // 우측 명렬표에서 데이터 읽기
        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr');
        if (!rows) return students;

        rows.forEach((row) => {
            const nameInput = row.querySelector('.student-name-input') as HTMLInputElement | null;
            const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement | null;
            if (!nameInput || !genderSelect) return;

            const name = nameInput.value.trim();
            const gender = genderSelect.value as 'M' | 'F';

            if (name && gender) {
                students.push({ name, gender });
            }
        });

        return students;
    }
}
