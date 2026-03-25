import { describe, it, expect } from 'vitest';
import { LayoutService } from './LayoutService';
import { LayoutType } from '../models/Seat';

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

        it('CUSTOM 타입은 빈 배열을 반환한다', () => {
            const result = LayoutService.createLayout(LayoutType.CUSTOM, 20);
            expect(result.success).toBe(true);
            expect(result.seats).toHaveLength(0);
        });

        it('알 수 없는 타입은 실패를 반환한다', () => {
            const result = LayoutService.createLayout('unknown' as LayoutType, 20);
            expect(result.success).toBe(false);
            expect(result.errorMessage).toBeDefined();
        });
    });
});
