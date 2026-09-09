/**
 * 좌석에 앉을 학생을 결정하는 규칙
 *
 * 저장된 배치를 복원할 때 좌석에 기록된 배정 정보(studentId/studentName)를 무시하고
 * 명단 순서대로 다시 그리면, 교사가 조정해 저장한 자리가 전혀 다른 배치로 바뀐다.
 * 저장은 배정 정보를 제대로 기록하고 있었으므로 읽는 쪽만 고치면 된다.
 */

import { Seat } from '../models/Seat.js';
import { Student } from '../models/Student.js';

export class SeatOccupancyService {
    /**
     * 각 좌석에 앉을 학생을 순서대로 반환한다. (좌석 배열과 같은 길이)
     *
     * 결정 순서:
     *  1) 좌석에 studentId가 있으면 그 학생
     *  2) 없으면 좌석에 기록된 studentName과 일치하는 학생
     *  3) 그래도 못 정하면 아직 배정되지 않은 학생을 순서대로 채운다
     *
     * 3)은 아직 배정 정보가 없는 새 배치(미리보기 좌석 등)를 위한 것이다.
     * 이 단계가 없으면 배정 정보가 없는 좌석이 모두 빈칸으로 렌더링된다.
     *
     * 한 학생이 두 좌석에 앉는 일이 없도록 이미 배정된 학생은 제외한다.
     */
    public static resolveOccupants(seats: Seat[], students: Student[]): Array<Student | undefined> {
        const result: Array<Student | undefined> = new Array(seats.length).fill(undefined);
        const used = new Set<Student>();

        const byId = new Map<number, Student>();
        students.forEach(student => {
            if (!byId.has(student.id)) {
                byId.set(student.id, student);
            }
        });

        // 1) 좌석에 기록된 학생 ID로 배정
        seats.forEach((seat, index) => {
            if (seat.studentId === undefined) return;
            const student = byId.get(seat.studentId);
            if (student && !used.has(student)) {
                result[index] = student;
                used.add(student);
            }
        });

        // 2) 이름으로 배정 (ID가 없거나 맞지 않는 경우)
        seats.forEach((seat, index) => {
            if (result[index] !== undefined) return;
            const name = seat.studentName;
            if (!name) return;
            const student = students.find(candidate => candidate.name === name && !used.has(candidate));
            if (student) {
                result[index] = student;
                used.add(student);
            }
        });

        // 3) 남은 좌석은 아직 배정되지 않은 학생으로 순서대로 채운다
        const remaining = students.filter(student => !used.has(student));
        let next = 0;
        for (let index = 0; index < seats.length && next < remaining.length; index++) {
            if (result[index] === undefined) {
                result[index] = remaining[next++];
            }
        }

        return result;
    }

    /**
     * 화면에서 읽은 배치로 명단을 갱신한다.
     *
     * 이름을 키로 학생을 새로 만들면 세 가지가 한꺼번에 망가진다.
     *  - 동명이인이 한 명으로 합쳐진다 (30명 학급이 29명으로 저장된다)
     *  - 학생 ID가 매번 새로 발급되어 좌석의 studentId와 어긋난다
     *  - 고정석 지정(fixedSeatId)이 사라진다
     *
     * 그래서 기존 명단의 학생을 이름으로 찾아 재사용하고,
     * 자리를 받지 못한 학생도 명단에는 남긴다. (반에서 사라지는 것이 아니다)
     *
     * @returns students 갱신된 명단 / studentBySeatId 좌석 번호별 배정 학생
     */
    public static mergeRosterFromLayout(
        existingStudents: Student[],
        layout: Array<{ seatId: number; studentName: string; gender: 'M' | 'F' }>,
        createStudent: (name: string, gender: 'M' | 'F') => Student
    ): { students: Student[]; studentBySeatId: Map<number, Student> } {
        const unusedExisting: Student[] = Array.isArray(existingStudents) ? [...existingStudents] : [];

        const takeExisting = (name: string): Student | undefined => {
            const index = unusedExisting.findIndex(candidate => candidate.name === name);
            return index === -1 ? undefined : unusedExisting.splice(index, 1)[0];
        };

        const seatedStudents: Student[] = [];
        const studentBySeatId = new Map<number, Student>();

        layout.forEach(item => {
            if (!item.studentName) return;

            const existing = takeExisting(item.studentName);
            if (existing) {
                // 화면에서 성별이 바뀌었을 수 있으므로 반영한다
                existing.gender = item.gender;
            }
            const student = existing ?? createStudent(item.studentName, item.gender);

            seatedStudents.push(student);
            studentBySeatId.set(item.seatId, student);
        });

        return {
            students: [...seatedStudents, ...unusedExisting],
            studentBySeatId
        };
    }
}
