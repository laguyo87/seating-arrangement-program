import { describe, it, expect } from 'vitest';
import { SeatOccupancyService } from './SeatOccupancyService';
import type { Seat } from '../models/Seat';
import type { Student } from '../models/Student';

function seat(id: number, assigned?: { studentId?: number; studentName?: string }): Seat {
    return {
        id,
        position: { x: 0, y: 0 },
        isFixed: false,
        isActive: true,
        ...assigned,
    };
}

const STUDENTS: Student[] = [
    { id: 1, name: '민준', gender: 'M' },
    { id: 2, name: '서연', gender: 'F' },
    { id: 3, name: '지호', gender: 'M' },
    { id: 4, name: '하윤', gender: 'F' },
];

function names(result: Array<Student | undefined>): Array<string | null> {
    return result.map(s => s?.name ?? null);
}

describe('SeatOccupancyService.resolveOccupants - 저장된 배치 복원', () => {
    it('좌석에 기록된 학생 ID대로 복원한다', () => {
        // 교사가 조정해 저장한 배치: 명단 순서(민준, 서연, 지호, 하윤)와 다르다
        const seats = [
            seat(1, { studentId: 4 }),
            seat(2, { studentId: 2 }),
            seat(3, { studentId: 1 }),
            seat(4, { studentId: 3 }),
        ];

        expect(names(SeatOccupancyService.resolveOccupants(seats, STUDENTS)))
            .toEqual(['하윤', '서연', '민준', '지호']);
    });

    it('명단 순서로 되돌아가지 않는다', () => {
        const seats = [
            seat(1, { studentId: 3 }),
            seat(2, { studentId: 4 }),
            seat(3, { studentId: 1 }),
            seat(4, { studentId: 2 }),
        ];

        const resolved = names(SeatOccupancyService.resolveOccupants(seats, STUDENTS));

        expect(resolved).not.toEqual(['민준', '서연', '지호', '하윤']);
        expect(resolved).toEqual(['지호', '하윤', '민준', '서연']);
    });

    it('ID가 없으면 좌석에 기록된 이름으로 복원한다', () => {
        const seats = [
            seat(1, { studentName: '하윤' }),
            seat(2, { studentName: '민준' }),
            seat(3, { studentName: '서연' }),
            seat(4, { studentName: '지호' }),
        ];

        expect(names(SeatOccupancyService.resolveOccupants(seats, STUDENTS)))
            .toEqual(['하윤', '민준', '서연', '지호']);
    });

    it('ID가 이름보다 우선한다', () => {
        const seats = [seat(1, { studentId: 3, studentName: '민준' })];

        expect(names(SeatOccupancyService.resolveOccupants(seats, STUDENTS))[0]).toBe('지호');
    });

    it('배정 정보가 전혀 없으면 명단 순서대로 채운다', () => {
        // 아직 배치하지 않은 새 좌석. 여기서 빈칸이 되면 미리보기가 사라진다.
        const seats = [seat(1), seat(2), seat(3), seat(4)];

        expect(names(SeatOccupancyService.resolveOccupants(seats, STUDENTS)))
            .toEqual(['민준', '서연', '지호', '하윤']);
    });

    it('일부만 배정되어 있으면 나머지는 남은 학생으로 채운다', () => {
        const seats = [seat(1), seat(2, { studentId: 1 }), seat(3), seat(4)];

        const resolved = names(SeatOccupancyService.resolveOccupants(seats, STUDENTS));

        expect(resolved[1]).toBe('민준');
        // 민준은 이미 앉았으므로 다른 자리에 다시 나타나면 안 된다
        expect(resolved.filter(n => n === '민준')).toHaveLength(1);
        expect(new Set(resolved.filter(Boolean)).size).toBe(4);
    });

    it('같은 학생을 두 좌석에 앉히지 않는다', () => {
        const seats = [
            seat(1, { studentId: 1 }),
            seat(2, { studentId: 1 }),
            seat(3, { studentId: 2 }),
        ];

        const resolved = names(SeatOccupancyService.resolveOccupants(seats, STUDENTS));

        expect(resolved.filter(n => n === '민준')).toHaveLength(1);
        expect(new Set(resolved.filter(Boolean)).size).toBe(resolved.filter(Boolean).length);
    });

    it('동명이인은 서로 다른 좌석에 각각 배정된다', () => {
        const twins: Student[] = [
            { id: 1, name: '민준', gender: 'M' },
            { id: 2, name: '민준', gender: 'M' },
        ];
        const seats = [seat(1, { studentName: '민준' }), seat(2, { studentName: '민준' })];

        const resolved = SeatOccupancyService.resolveOccupants(seats, twins);

        expect(resolved.map(s => s?.id)).toEqual([1, 2]);
    });

    it('좌석이 학생보다 많으면 남는 좌석은 비어 있다', () => {
        const seats = [seat(1), seat(2), seat(3), seat(4), seat(5), seat(6)];

        expect(names(SeatOccupancyService.resolveOccupants(seats, STUDENTS)))
            .toEqual(['민준', '서연', '지호', '하윤', null, null]);
    });

    it('학생이 좌석보다 많으면 좌석 수만큼만 배정된다', () => {
        const seats = [seat(1), seat(2)];

        expect(names(SeatOccupancyService.resolveOccupants(seats, STUDENTS)))
            .toEqual(['민준', '서연']);
    });

    it('명단에 없는 학생 ID가 기록되어 있으면 남은 학생으로 채운다', () => {
        // 명단이 바뀐 뒤 예전 배치를 불러온 경우
        const seats = [seat(1, { studentId: 999 }), seat(2, { studentId: 2 })];

        const resolved = names(SeatOccupancyService.resolveOccupants(seats, STUDENTS));

        expect(resolved[1]).toBe('서연');
        expect(resolved[0]).not.toBeNull();
        expect(resolved[0]).not.toBe('서연');
    });

    it('빈 입력에서도 안전하다', () => {
        expect(SeatOccupancyService.resolveOccupants([], STUDENTS)).toEqual([]);
        expect(SeatOccupancyService.resolveOccupants([seat(1)], [])).toEqual([undefined]);
    });
});
