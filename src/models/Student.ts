/**
 * 학생 데이터 모델
 * @interface Student 학생 정보를 담는 인터페이스
 */
export interface Student {
    /** 학생 고유 번호 */
    id: number;
    /** 학생 이름 */
    name: string;
    /** 학생 성별 ('M': 남학생, 'F': 여학생) */
    gender: 'M' | 'F';
    /** 고정된 좌석 위치 (없으면 undefined) */
    fixedSeatId?: number;
}

/**
 * 학생 생성 클래스
 */
export class StudentModel {
    private static nextId: number = 1;

    /**
     * 새로운 학생 객체를 생성합니다.
     * @param name 학생 이름
     * @param gender 학생 성별
     * @returns 생성된 Student 객체
     */
    public static create(name: string, gender: 'M' | 'F'): Student {
        return {
            id: StudentModel.nextId++,
            name,
            gender
        };
    }

    /**
     * 여러 학생을 한 번에 생성합니다.
     * @param studentsData 학생 데이터 배열 (이름과 성별)
     * @returns 생성된 Student 배열
     */
    public static createMultiple(studentsData: Array<{name: string, gender: 'M' | 'F'}>): Student[] {
        return studentsData.map(data => StudentModel.create(data.name, data.gender));
    }

    /**
     * 학생 목록을 성별로 분리합니다.
     * @param students 학생 배열
     * @returns 성별별로 분리된 학생 객체
     */
    public static separateByGender(students: Student[]): {male: Student[], female: Student[]} {
        return {
            male: students.filter(s => s.gender === 'M'),
            female: students.filter(s => s.gender === 'F')
        };
    }

    /**
     * 학생 목록에서 고정 좌석이 없는 학생만 필터링합니다.
     * @param students 학생 배열
     * @returns 고정 좌석이 없는 학생 배열
     */
    public static getUnassignedStudents(students: Student[]): Student[] {
        return students.filter(s => !s.fixedSeatId);
    }

    /**
     * 학생 목록에서 고정 좌석이 있는 학생만 필터링합니다.
     * @param students 학생 배열
     * @returns 고정 좌석이 있는 학생 배열
     */
    public static getAssignedStudents(students: Student[]): Student[] {
        return students.filter(s => s.fixedSeatId !== undefined);
    }
}

