import { describe, it, expect } from 'vitest';
import { SeatModel, Seat, LayoutType } from './Seat';

describe('SeatModel', () => {
    describe('create', () => {
        it('좌석을 생성하면 위치가 올바르게 설정된다', () => {
            const seat = SeatModel.create({ x: 100, y: 200 });
            expect(seat.position.x).toBe(100);
            expect(seat.position.y).toBe(200);
            expect(seat.id).toBeGreaterThan(0);
        });

        it('기본값으로 isFixed=false, isActive=true이다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            expect(seat.isFixed).toBe(false);
            expect(seat.isActive).toBe(true);
        });

        it('고정 좌석으로 생성할 수 있다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 }, true);
            expect(seat.isFixed).toBe(true);
        });

        it('비활성 좌석으로 생성할 수 있다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 }, false, false);
            expect(seat.isActive).toBe(false);
        });

        it('생성 시 학생이 배정되어 있지 않다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            expect(seat.studentId).toBeUndefined();
            expect(seat.studentName).toBeUndefined();
        });

        it('생성할 때마다 고유한 ID가 부여된다', () => {
            const s1 = SeatModel.create({ x: 0, y: 0 });
            const s2 = SeatModel.create({ x: 10, y: 10 });
            expect(s1.id).not.toBe(s2.id);
        });
    });

    describe('assignStudent / removeStudent', () => {
        it('학생을 좌석에 배정한다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            SeatModel.assignStudent(seat, 1, '김철수');
            expect(seat.studentId).toBe(1);
            expect(seat.studentName).toBe('김철수');
        });

        it('학생을 좌석에서 제거한다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            SeatModel.assignStudent(seat, 1, '김철수');
            SeatModel.removeStudent(seat);
            expect(seat.studentId).toBeUndefined();
            expect(seat.studentName).toBeUndefined();
        });
    });

    describe('isEmpty', () => {
        it('학생이 없으면 비어있다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            expect(SeatModel.isEmpty(seat)).toBe(true);
        });

        it('학생이 배정되면 비어있지 않다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            SeatModel.assignStudent(seat, 1, '학생');
            expect(SeatModel.isEmpty(seat)).toBe(false);
        });
    });

    describe('isAvailable', () => {
        it('활성화되고, 고정되지 않고, 비어있으면 사용 가능하다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            expect(SeatModel.isAvailable(seat)).toBe(true);
        });

        it('고정된 좌석은 사용 불가능하다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 }, true);
            expect(SeatModel.isAvailable(seat)).toBe(false);
        });

        it('비활성 좌석은 사용 불가능하다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 }, false, false);
            expect(SeatModel.isAvailable(seat)).toBe(false);
        });

        it('학생이 배정된 좌석은 사용 불가능하다', () => {
            const seat = SeatModel.create({ x: 0, y: 0 });
            SeatModel.assignStudent(seat, 1, '학생');
            expect(SeatModel.isAvailable(seat)).toBe(false);
        });
    });

    describe('getEmptySeats', () => {
        it('비어있는 좌석만 반환한다', () => {
            const seats = [
                SeatModel.create({ x: 0, y: 0 }),
                SeatModel.create({ x: 10, y: 0 }),
                SeatModel.create({ x: 20, y: 0 }),
            ];
            SeatModel.assignStudent(seats[1], 1, '학생');
            const empty = SeatModel.getEmptySeats(seats);
            expect(empty).toHaveLength(2);
        });
    });

    describe('getAssignedSeats', () => {
        it('배정된 좌석만 반환한다', () => {
            const seats = [
                SeatModel.create({ x: 0, y: 0 }),
                SeatModel.create({ x: 10, y: 0 }),
                SeatModel.create({ x: 20, y: 0 }),
            ];
            SeatModel.assignStudent(seats[0], 1, '학생1');
            SeatModel.assignStudent(seats[2], 2, '학생2');
            const assigned = SeatModel.getAssignedSeats(seats);
            expect(assigned).toHaveLength(2);
        });
    });

    describe('getAvailableSeats', () => {
        it('사용 가능한 좌석만 반환한다 (고정/비활성/배정된 좌석 제외)', () => {
            const seat1 = SeatModel.create({ x: 0, y: 0 }); // 사용 가능
            const seat2 = SeatModel.create({ x: 10, y: 0 }, true); // 고정됨
            const seat3 = SeatModel.create({ x: 20, y: 0 }); // 배정됨
            const seat4 = SeatModel.create({ x: 30, y: 0 }, false, false); // 비활성
            const seat5 = SeatModel.create({ x: 40, y: 0 }); // 사용 가능

            SeatModel.assignStudent(seat3, 1, '학생');

            const available = SeatModel.getAvailableSeats([seat1, seat2, seat3, seat4, seat5]);
            expect(available).toHaveLength(2);
            expect(available[0].id).toBe(seat1.id);
            expect(available[1].id).toBe(seat5.id);
        });
    });
});

describe('LayoutType', () => {
    it('모든 모둠 크기 타입이 존재한다', () => {
        expect(LayoutType.GROUP_3).toBe('group-3');
        expect(LayoutType.GROUP_4).toBe('group-4');
        expect(LayoutType.GROUP_5).toBe('group-5');
        expect(LayoutType.GROUP_6).toBe('group-6');
    });
});
