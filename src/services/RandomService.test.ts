import { describe, it, expect } from 'vitest';
import { RandomService } from './RandomService';
import { Student } from '../models/Student';
import { Seat, SeatModel } from '../models/Seat';

/** 테스트용 학생 목록 생성 헬퍼 */
function createStudents(count: number, gender: 'M' | 'F' = 'M'): Student[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `학생${i + 1}`,
        gender,
    }));
}

/** 테스트용 좌석 목록 생성 헬퍼 */
function createSeats(count: number): Seat[] {
    return Array.from({ length: count }, (_, i) =>
        SeatModel.create({ x: i * 80, y: 100 })
    );
}

describe('RandomService', () => {
    describe('shuffle', () => {
        it('배열 길이가 유지된다', () => {
            const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const shuffled = RandomService.shuffle(arr);
            expect(shuffled).toHaveLength(arr.length);
        });

        it('원본 배열을 변경하지 않는다', () => {
            const arr = [1, 2, 3, 4, 5];
            const original = [...arr];
            RandomService.shuffle(arr);
            expect(arr).toEqual(original);
        });

        it('모든 원소가 포함된다', () => {
            const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const shuffled = RandomService.shuffle(arr);
            expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
        });

        it('빈 배열을 셔플하면 빈 배열이 반환된다', () => {
            expect(RandomService.shuffle([])).toEqual([]);
        });

        it('1개 원소 배열은 그대로 반환된다', () => {
            expect(RandomService.shuffle([42])).toEqual([42]);
        });

        it('충분히 큰 배열에서 순서가 바뀐다 (확률적)', () => {
            const arr = Array.from({ length: 100 }, (_, i) => i);
            const shuffled = RandomService.shuffle(arr);
            // 100개 중 완전히 동일할 확률은 거의 0에 수렴
            const sameCount = arr.filter((v, i) => v === shuffled[i]).length;
            expect(sameCount).toBeLessThan(arr.length);
        });
    });

    describe('assignRandomly', () => {
        it('학생을 좌석에 랜덤 배치한다', () => {
            const students = createStudents(5);
            const seats = createSeats(5);

            RandomService.assignRandomly(students, seats);

            // 모든 좌석에 학생이 배정되어야 함
            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats).toHaveLength(5);
        });

        it('학생 수가 좌석 수보다 적으면 일부 좌석만 배정된다', () => {
            const students = createStudents(3);
            const seats = createSeats(5);

            RandomService.assignRandomly(students, seats);

            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats).toHaveLength(3);
        });

        it('좌석 수가 학생 수보다 적으면 좌석 수만큼만 배정된다', () => {
            const students = createStudents(5);
            const seats = createSeats(3);

            RandomService.assignRandomly(students, seats);

            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats).toHaveLength(3);
        });

        it('고정된 좌석은 건너뛴다', () => {
            const students = createStudents(3);
            const seats = createSeats(5);
            seats[0].isFixed = true;
            SeatModel.assignStudent(seats[0], 99, '고정학생');

            RandomService.assignRandomly(students, seats);

            // 고정 좌석은 변경되지 않아야 함
            expect(seats[0].studentId).toBe(99);
            expect(seats[0].studentName).toBe('고정학생');
        });

        it('배정된 학생 이름이 모두 유효하다', () => {
            const students = createStudents(5);
            const seats = createSeats(5);

            RandomService.assignRandomly(students, seats);

            const assignedNames = seats
                .filter(s => s.studentName)
                .map(s => s.studentName);
            const studentNames = students.map(s => s.name);

            assignedNames.forEach(name => {
                expect(studentNames).toContain(name);
            });
        });
    });

    describe('assignGenderPairs', () => {
        it('pair 모드에서 남녀 짝꿍 배치를 수행한다', () => {
            const males = createStudents(3, 'M');
            const females = createStudents(3, 'F').map((s, i) => ({
                ...s,
                id: 100 + i,
                name: `여학생${i + 1}`,
            }));
            const students = [...males, ...females];

            const seats = createSeats(6);
            // 짝꿍 연결 설정
            for (let i = 0; i < seats.length; i += 2) {
                if (i + 1 < seats.length) {
                    seats[i].pairSeatId = seats[i + 1].id;
                    seats[i + 1].pairSeatId = seats[i].id;
                }
            }

            RandomService.assignGenderPairs(students, seats, 'pair');

            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats.length).toBeGreaterThan(0);
        });

        it('single 모드에서도 동작한다', () => {
            const students = [
                ...createStudents(3, 'M'),
                ...createStudents(3, 'F').map((s, i) => ({
                    ...s, id: 100 + i, name: `여${i + 1}`,
                })),
            ];
            const seats = createSeats(6);

            RandomService.assignGenderPairs(students, seats, 'single');

            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats.length).toBeGreaterThan(0);
        });
    });

    describe('assignWithFixedSeats', () => {
        it('고정 좌석 학생을 먼저 배치하고 나머지를 랜덤 배치한다', () => {
            const seats = createSeats(5);

            const students: Student[] = [
                { id: 1, name: '고정학생', gender: 'M', fixedSeatId: seats[2].id },
                { id: 2, name: '랜덤1', gender: 'F' },
                { id: 3, name: '랜덤2', gender: 'M' },
            ];

            RandomService.assignWithFixedSeats(students, seats);

            // 고정 학생이 지정된 좌석에 배치되어야 함
            expect(seats[2].studentId).toBe(1);
            expect(seats[2].studentName).toBe('고정학생');
            expect(seats[2].isFixed).toBe(true);

            // 나머지 학생들도 배치되어야 함
            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats).toHaveLength(3);
        });

        it('고정 좌석이 없는 경우 전체 랜덤 배치', () => {
            const students = createStudents(4);
            const seats = createSeats(4);

            RandomService.assignWithFixedSeats(students, seats);

            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats).toHaveLength(4);
        });
    });

    describe('reshuffleAssignments', () => {
        it('배정된 학생들의 좌석을 재배치한다', () => {
            const seats = createSeats(5);
            const students = createStudents(5);
            RandomService.assignRandomly(students, seats);

            // 원래 배정 기록
            const originalAssignments = seats.map(s => ({
                seatId: s.id,
                studentId: s.studentId,
            }));

            RandomService.reshuffleAssignments(seats);

            // 모든 좌석에 여전히 학생이 배정되어 있어야 함
            const assignedSeats = seats.filter(s => s.studentId !== undefined);
            expect(assignedSeats).toHaveLength(5);

            // 학생 ID 집합이 동일해야 함 (같은 학생들이 재배치)
            const originalIds = new Set(originalAssignments.map(a => a.studentId));
            const newIds = new Set(seats.map(s => s.studentId));
            expect(newIds).toEqual(originalIds);
        });

        it('학생이 없는 좌석은 재배치 후에도 비어있다', () => {
            const seats = createSeats(5);
            const students = createStudents(3);
            RandomService.assignRandomly(students, seats);

            RandomService.reshuffleAssignments(seats);

            const assignedCount = seats.filter(s => s.studentId !== undefined).length;
            expect(assignedCount).toBe(3);
        });

        it('빈 좌석 배열에서도 오류가 발생하지 않는다', () => {
            const seats: Seat[] = [];
            expect(() => RandomService.reshuffleAssignments(seats)).not.toThrow();
        });
    });
});

describe('RandomService.shuffle - 배치 공정성', () => {
    /**
     * 자리 배치 프로그램에서 셔플의 균등성은 타협할 수 없는 요구사항이다.
     * `array.sort(() => Math.random() - 0.5)` 같은 비교 함수 기반 셔플은
     * 결과가 균등하지 않아 명단 앞쪽 학생이 앞자리에 반복해서 앉게 된다.
     * 교사가 눈으로 확인할 수 없는 종류의 편향이므로 테스트로 고정한다.
     */
    const TRIALS = 20000;

    /** 각 원소가 각 위치에 온 횟수를 세어 카이제곱 통계량을 계산한다 */
    function positionChiSquare(n: number, trials: number): number {
        const counts: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
        const base = Array.from({ length: n }, (_, i) => i);

        for (let t = 0; t < trials; t++) {
            const shuffled = RandomService.shuffle(base);
            shuffled.forEach((value, position) => {
                counts[value][position]++;
            });
        }

        const expected = trials / n;
        let chi2 = 0;
        for (let value = 0; value < n; value++) {
            for (let position = 0; position < n; position++) {
                const diff = counts[value][position] - expected;
                chi2 += (diff * diff) / expected;
            }
        }
        return chi2;
    }

    it('모든 학생이 모든 자리에 고르게 배정된다', () => {
        const n = 8;
        const chi2 = positionChiSquare(n, TRIALS);

        // 자유도 (8-1)^2 = 49. 올바른 셔플이면 대략 49 근처에 머문다.
        // 편향된 비교 함수 셔플은 이 값이 1000을 훌쩍 넘는다.
        expect(chi2).toBeLessThan(200);
    });

    it('명단 첫 학생이 첫 자리에 앉을 확률이 다른 학생과 같다', () => {
        const n = 10;
        const base = Array.from({ length: n }, (_, i) => i);
        let firstStaysFirst = 0;

        for (let t = 0; t < TRIALS; t++) {
            if (RandomService.shuffle(base)[0] === 0) firstStaysFirst++;
        }

        const rate = firstStaysFirst / TRIALS;
        const ideal = 1 / n;
        // 편향된 셔플에서는 이 값이 이상치의 2배를 넘는다 (10명 기준 약 19%).
        expect(rate).toBeGreaterThan(ideal * 0.8);
        expect(rate).toBeLessThan(ideal * 1.2);
    });

    it('학생이 원래 순번 자리에 머무는 비율이 이상치와 같다', () => {
        const n = 10;
        const base = Array.from({ length: n }, (_, i) => i);
        let fixedPoints = 0;

        for (let t = 0; t < TRIALS; t++) {
            const shuffled = RandomService.shuffle(base);
            for (let i = 0; i < n; i++) {
                if (shuffled[i] === i) fixedPoints++;
            }
        }

        // 균등 셔플에서 고정점의 기댓값은 순열당 정확히 1개다.
        const perShuffle = fixedPoints / TRIALS;
        expect(perShuffle).toBeGreaterThan(0.85);
        expect(perShuffle).toBeLessThan(1.15);
    });
});
