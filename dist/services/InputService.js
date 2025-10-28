/**
 * 입력 데이터 관리 및 검증을 담당하는 서비스
 */
export class InputService {
    /**
     * 학생 이름이 유효한지 검증합니다.
     * @param name 학생 이름
     * @returns 검증 결과
     */
    static validateName(name) {
        if (!name || name.trim().length === 0) {
            return { isValid: false, errorMessage: '학생 이름을 입력해주세요.' };
        }
        if (name.trim().length > 20) {
            return { isValid: false, errorMessage: '학생 이름은 20자 이하여야 합니다.' };
        }
        return { isValid: true };
    }
    /**
     * 학생 인원수가 유효한지 검증합니다.
     * @param count 학생 인원수
     * @returns 검증 결과
     */
    static validateStudentCount(count) {
        if (count <= 0) {
            return { isValid: false, errorMessage: '학생 인원수는 1 이상이어야 합니다.' };
        }
        if (count > 100) {
            return { isValid: false, errorMessage: '학생 인원수는 100명 이하여야 합니다.' };
        }
        return { isValid: true };
    }
    /**
     * 학생 목록이 유효한지 검증합니다.
     * @param students 학생 배열
     * @param expectedCount 예상 학생 수
     * @returns 검증 결과
     */
    static validateStudentList(students, expectedCount) {
        if (students.length !== expectedCount) {
            return {
                isValid: false,
                errorMessage: `학생 수가 일치하지 않습니다. (입력: ${students.length}, 예상: ${expectedCount})`
            };
        }
        // 중복 이름 체크
        const names = students.map(s => s.name.trim().toLowerCase());
        const uniqueNames = new Set(names);
        if (names.length !== uniqueNames.size) {
            return { isValid: false, errorMessage: '중복된 학생 이름이 있습니다.' };
        }
        // 빈 이름 체크
        for (const student of students) {
            if (!student.name || student.name.trim().length === 0) {
                return { isValid: false, errorMessage: '모든 학생의 이름을 입력해주세요.' };
            }
        }
        return { isValid: true };
    }
    /**
     * 성비를 계산합니다.
     * @param students 학생 배열
     * @returns 성별 분포 객체
     */
    static calculateGenderRatio(students) {
        const male = students.filter(s => s.gender === 'M').length;
        const female = students.filter(s => s.gender === 'F').length;
        return {
            male,
            female,
            total: students.length
        };
    }
    /**
     * 성비가 균형잡혔는지 확인합니다.
     * @param students 학생 배열
     * @param maxDifference 허용되는 최대 차이 (기본값: 3)
     * @returns 균형잡혔는지 여부
     */
    static isGenderRatioBalanced(students, maxDifference = 3) {
        const ratio = this.calculateGenderRatio(students);
        const difference = Math.abs(ratio.male - ratio.female);
        return difference <= maxDifference;
    }
    /**
     * 사용자 입력으로부터 Student 객체를 생성합니다.
     * @param name 학생 이름
     * @param gender 학생 성별
     * @returns 생성된 Student 객체 또는 에러 메시지
     */
    static createStudentFromInput(name, gender) {
        const nameValidation = this.validateName(name);
        if (!nameValidation.isValid) {
            return nameValidation.errorMessage;
        }
        if (gender !== 'M' && gender !== 'F') {
            return '올바른 성별을 선택해주세요.';
        }
        // StudentModel을 동적으로 import
        const { StudentModel } = require('../models/Student');
        return StudentModel.create(name.trim(), gender);
    }
    /**
     * 2열 배치시 남녀 짝꿍 배치가 가능한지 확인합니다.
     * @param students 학생 배열
     * @returns 가능 여부 및 메시지
     */
    static canCreateGenderPairs(students) {
        const ratio = this.calculateGenderRatio(students);
        if (ratio.male === 0 || ratio.female === 0) {
            return {
                canPair: false,
                message: '남학생 또는 여학생이 없어 짝꿍 배치가 불가능합니다.'
            };
        }
        const pairsPossible = Math.min(ratio.male, ratio.female);
        if (pairsPossible * 2 < students.length * 0.7) {
            return {
                canPair: true,
                message: `약 ${pairsPossible}쌍의 짝꿍 배치가 가능합니다. 나머지 ${students.length - pairsPossible * 2}명은 개별 좌석에 배치됩니다.`
            };
        }
        return {
            canPair: true,
            message: `${pairsPossible}쌍의 짝꿍 배치가 가능합니다.`
        };
    }
}
//# sourceMappingURL=InputService.js.map