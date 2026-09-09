import { describe, it, expect } from 'vitest';
import { LayoutService } from './LayoutService';
import { LayoutType } from '../models/Seat';
import type { Seat } from '../models/Seat';

describe('LayoutService', () => {
    describe('createSingleUniformLayout', () => {
        it('요청한 수만큼 좌석을 생성한다', () => {
            const seats = LayoutService.createSingleUniformLayout(20);
            expect(seats).toHaveLength(20);
        });

        it('0개 좌석을 생성할 수 있다', () => {
            const seats = LayoutService.createSingleUniformLayout(0);
            expect(seats).toHaveLength(0);
        });

        it('1개 좌석도 정상적으로 생성된다', () => {
            const seats = LayoutService.createSingleUniformLayout(1);
            expect(seats).toHaveLength(1);
            expect(seats[0].position.x).toBeGreaterThan(0);
            expect(seats[0].position.y).toBeGreaterThan(0);
        });

        it('분단 수가 2이면 좌석이 올바르게 분배된다', () => {
            const seats = LayoutService.createSingleUniformLayout(10, 800, 600, 2);
            expect(seats).toHaveLength(10);
        });

        it('모든 좌석의 위치가 양수이다', () => {
            const seats = LayoutService.createSingleUniformLayout(30, 800, 600, 3);
            seats.forEach(seat => {
                expect(seat.position.x).toBeGreaterThanOrEqual(0);
                expect(seat.position.y).toBeGreaterThanOrEqual(0);
            });
        });

        it('좌석 ID가 모두 고유하다', () => {
            const seats = LayoutService.createSingleUniformLayout(20);
            const ids = seats.map(s => s.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('createPairUniformLayout', () => {
        it('요청한 수만큼 좌석을 생성한다', () => {
            const seats = LayoutService.createPairUniformLayout(20);
            expect(seats).toHaveLength(20);
        });

        it('홀수 좌석도 정상 처리된다', () => {
            const seats = LayoutService.createPairUniformLayout(11);
            expect(seats).toHaveLength(11);
        });

        it('짝꿍 연결이 올바르게 설정된다', () => {
            const seats = LayoutService.createPairUniformLayout(10);
            // 짝수 인덱스의 좌석은 다음 좌석과 짝꿍이어야 함
            for (let i = 0; i < seats.length - 1; i += 2) {
                const seat1 = seats[i];
                const seat2 = seats[i + 1];
                expect(seat1.pairSeatId).toBe(seat2.id);
                expect(seat2.pairSeatId).toBe(seat1.id);
            }
        });

        it('짝꿍 좌석은 가까이 위치한다', () => {
            const seats = LayoutService.createPairUniformLayout(10);
            for (let i = 0; i < seats.length - 1; i += 2) {
                const seat1 = seats[i];
                const seat2 = seats[i + 1];
                // 같은 행에 있어야 함 (y 좌표 동일)
                expect(seat1.position.y).toBe(seat2.position.y);
                // x 좌표 차이가 합리적인 범위 (20~100px)
                const xDiff = Math.abs(seat2.position.x - seat1.position.x);
                expect(xDiff).toBeGreaterThan(0);
                expect(xDiff).toBeLessThan(200);
            }
        });
    });

    describe('createGroupLayout', () => {
        it('3명 모둠 배치를 생성한다', () => {
            const seats = LayoutService.createGroupLayout(12, 3);
            expect(seats).toHaveLength(12);
        });

        it('4명 모둠 배치를 생성한다', () => {
            const seats = LayoutService.createGroupLayout(20, 4);
            expect(seats).toHaveLength(20);
        });

        it('5명 모둠 배치를 생성한다', () => {
            const seats = LayoutService.createGroupLayout(15, 5);
            expect(seats).toHaveLength(15);
        });

        it('6명 모둠 배치를 생성한다', () => {
            const seats = LayoutService.createGroupLayout(18, 6);
            expect(seats).toHaveLength(18);
        });

        it('학생 수가 모둠 크기로 나누어 떨어지지 않아도 정상 동작한다', () => {
            const seats = LayoutService.createGroupLayout(13, 4); // 4명*3모둠 + 1명
            expect(seats).toHaveLength(13);
        });

        it('모든 좌석 ID가 고유하다', () => {
            const seats = LayoutService.createGroupLayout(24, 4);
            const ids = seats.map(s => s.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('createUShapeLayout', () => {
        it('ㄷ자 배치를 생성한다', () => {
            const seats = LayoutService.createUShapeLayout(15);
            expect(seats).toHaveLength(15);
        });

        it('0개 좌석이면 빈 배열을 반환한다', () => {
            const seats = LayoutService.createUShapeLayout(0);
            expect(seats).toHaveLength(0);
        });

        it('좌석이 캔버스 너비 안에 위치한다', () => {
            const canvasWidth = 800;
            const seats = LayoutService.createUShapeLayout(20, canvasWidth);
            seats.forEach(seat => {
                expect(seat.position.x).toBeGreaterThanOrEqual(0);
                expect(seat.position.x).toBeLessThan(canvasWidth);
            });
        });

        it('적은 수의 학생에서도 좌석이 겹치지 않는다', () => {
            const seats = LayoutService.createUShapeLayout(4);
            for (let i = 0; i < seats.length; i++) {
                for (let j = i + 1; j < seats.length; j++) {
                    const samePosition =
                        seats[i].position.x === seats[j].position.x &&
                        seats[i].position.y === seats[j].position.y;
                    expect(samePosition).toBe(false);
                }
            }
        });
    });

    describe('createLayout (통합)', () => {
        it('SINGLE_UNIFORM 타입으로 생성한다', () => {
            const result = LayoutService.createLayout(LayoutType.SINGLE_UNIFORM, 20);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(20);
        });

        it('PAIR_UNIFORM 타입으로 생성한다', () => {
            const result = LayoutService.createLayout(LayoutType.PAIR_UNIFORM, 16);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(16);
        });

        it('GROUP_3 타입으로 3명 모둠을 생성한다', () => {
            const result = LayoutService.createLayout(LayoutType.GROUP_3, 12);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(12);
        });

        it('GROUP_4 타입으로 4명 모둠을 생성한다', () => {
            const result = LayoutService.createLayout(LayoutType.GROUP_4, 20);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(20);
        });

        it('GROUP_5 타입으로 5명 모둠을 생성한다', () => {
            const result = LayoutService.createLayout(LayoutType.GROUP_5, 15);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(15);
        });

        it('GROUP_6 타입으로 6명 모둠을 생성한다', () => {
            const result = LayoutService.createLayout(LayoutType.GROUP_6, 18);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(18);
        });

        it('USHAPE 타입으로 생성한다', () => {
            const result = LayoutService.createLayout(LayoutType.USHAPE, 15);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(15);
        });

        it('CUSTOM 타입은 미지원을 실패로 알린다', () => {
            // 좌석 0개를 success: true로 돌려주면 호출부가 정상 배치로 취급한다
            const result = LayoutService.createLayout(LayoutType.CUSTOM, 20);
            expect(result.success).toBe(false);
            expect(result.seats).toHaveLength(0);
            expect(result.errorMessage).toBeTruthy();
        });

        it('알 수 없는 타입은 실패를 반환한다', () => {
            const result = LayoutService.createLayout('unknown' as LayoutType, 20);
            expect(result.success).toBe(false);
            expect(result.errorMessage).toBeDefined();
        });
    });
});

describe('LayoutService - 모둠 배치 좌석 겹침', () => {
    const SEAT_SIZE = 60;

    /** 두 좌석이 물리적으로 겹치는지 (좌석은 60x60 사각형) */
    function overlaps(a: Seat, b: Seat): boolean {
        return (
            Math.abs(a.position.x - b.position.x) < SEAT_SIZE &&
            Math.abs(a.position.y - b.position.y) < SEAT_SIZE
        );
    }

    function countOverlaps(seats: Seat[]): number {
        let count = 0;
        for (let i = 0; i < seats.length; i++) {
            for (let j = i + 1; j < seats.length; j++) {
                if (overlaps(seats[i], seats[j])) count++;
            }
        }
        return count;
    }

    [3, 4, 5, 6].forEach(groupSize => {
        it(`모둠 ${groupSize}명 배치에서 좌석이 겹치지 않는다`, () => {
            // 모둠 간격이 고정값(180px)이던 시절, 모둠 폭이 220px가 되는
            // 5명은 3쌍, 6명은 4쌍의 좌석이 물리적으로 겹쳤다
            const seats = LayoutService.createGroupLayout(24, groupSize);

            expect(seats).toHaveLength(24);
            expect(countOverlaps(seats)).toBe(0);
        });
    });

    it('학생 수가 달라져도 겹치지 않는다', () => {
        [6, 12, 18, 20, 24, 30, 36].forEach(totalSeats => {
            [3, 4, 5, 6].forEach(groupSize => {
                const seats = LayoutService.createGroupLayout(totalSeats, groupSize);

                expect(seats).toHaveLength(totalSeats);
                expect(countOverlaps(seats)).toBe(0);
            });
        });
    });

    it('createLayout을 통해 만든 모둠 배치도 겹치지 않는다', () => {
        [LayoutType.GROUP_3, LayoutType.GROUP_4, LayoutType.GROUP_5, LayoutType.GROUP_6].forEach(type => {
            const result = LayoutService.createLayout(type, 24);

            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(24);
            expect(countOverlaps(result.seats)).toBe(0);
        });
    });
});

describe('LayoutService.createLayout - 좌석을 만들지 못하면 실패로 알린다', () => {
    it('좌석 수가 0 이하이면 실패를 반환한다', () => {
        // 좌석 0개를 success: true로 돌려주면 호출부가 정상 배치로 취급한다
        expect(LayoutService.createLayout(LayoutType.SINGLE_UNIFORM, 0).success).toBe(false);
        expect(LayoutService.createLayout(LayoutType.SINGLE_UNIFORM, -5).success).toBe(false);
    });

    it('좌석이 하나도 만들어지지 않으면 실패를 반환한다', () => {
        const result = LayoutService.createLayout(LayoutType.SINGLE_UNIFORM, 24, 800, 600, 0);

        if (result.seats.length === 0) {
            expect(result.success).toBe(false);
        } else {
            expect(result.success).toBe(true);
        }
    });
});
