import { describe, it, expect, beforeEach } from 'vitest';
import { StudentModel, Student } from './Student';

describe('StudentModel', () => {
    describe('create', () => {
        it('학생을 생성하면 이름과 성별이 올바르게 설정된다', () => {
            const student = StudentModel.create('김철수', 'M');
            expect(student.name).toBe('김철수');
            expect(student.gender).toBe('M');
            expect(student.id).toBeGreaterThan(0);
        });

        it('여학생을 생성할 수 있다', () => {
            const student = StudentModel.create('김영희', 'F');
            expect(student.gender).toBe('F');
        });

        it('생성할 때마다 고유한 ID가 부여된다', () => {
            const s1 = StudentModel.create('학생1', 'M');
            const s2 = StudentModel.create('학생2', 'F');
            expect(s1.id).not.toBe(s2.id);
        });

        it('fixedSeatId는 기본값으로 undefined이다', () => {
            const student = StudentModel.create('학생', 'M');
            expect(student.fixedSeatId).toBeUndefined();
        });
    });

    describe('createMultiple', () => {
        it('여러 학생을 한번에 생성한다', () => {
            const students = StudentModel.createMultiple([
                { name: '학생1', gender: 'M' },
                { name: '학생2', gender: 'F' },
                { name: '학생3', gender: 'M' },
            ]);
            expect(students).toHaveLength(3);
            expect(students[0].name).toBe('학생1');
            expect(students[1].gender).toBe('F');
        });

        it('빈 배열을 전달하면 빈 배열을 반환한다', () => {
            const students = StudentModel.createMultiple([]);
            expect(students).toHaveLength(0);
        });
    });

    describe('separateByGender', () => {
        it('학생 목록을 남녀로 분리한다', () => {
            const students: Student[] = [
                { id: 1, name: '남1', gender: 'M' },
                { id: 2, name: '여1', gender: 'F' },
                { id: 3, name: '남2', gender: 'M' },
                { id: 4, name: '여2', gender: 'F' },
                { id: 5, name: '여3', gender: 'F' },
            ];
            const { male, female } = StudentModel.separateByGender(students);
            expect(male).toHaveLength(2);
            expect(female).toHaveLength(3);
            expect(male.every(s => s.gender === 'M')).toBe(true);
            expect(female.every(s => s.gender === 'F')).toBe(true);
        });

        it('한 성별만 있어도 동작한다', () => {
            const students: Student[] = [
                { id: 1, name: '남1', gender: 'M' },
                { id: 2, name: '남2', gender: 'M' },
            ];
            const { male, female } = StudentModel.separateByGender(students);
            expect(male).toHaveLength(2);
            expect(female).toHaveLength(0);
        });
    });

    describe('getUnassignedStudents', () => {
        it('고정 좌석이 없는 학생만 필터링한다', () => {
            const students: Student[] = [
                { id: 1, name: '학생1', gender: 'M', fixedSeatId: 5 },
                { id: 2, name: '학생2', gender: 'F' },
                { id: 3, name: '학생3', gender: 'M' },
            ];
            const unassigned = StudentModel.getUnassignedStudents(students);
            expect(unassigned).toHaveLength(2);
            expect(unassigned[0].name).toBe('학생2');
        });
    });

    describe('getAssignedStudents', () => {
        it('고정 좌석이 있는 학생만 필터링한다', () => {
            const students: Student[] = [
                { id: 1, name: '학생1', gender: 'M', fixedSeatId: 5 },
                { id: 2, name: '학생2', gender: 'F' },
                { id: 3, name: '학생3', gender: 'M', fixedSeatId: 10 },
            ];
            const assigned = StudentModel.getAssignedStudents(students);
            expect(assigned).toHaveLength(2);
            expect(assigned[0].fixedSeatId).toBe(5);
            expect(assigned[1].fixedSeatId).toBe(10);
        });
    });
});
