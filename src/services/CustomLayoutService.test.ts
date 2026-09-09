import { describe, it, expect } from 'vitest';
import {
    CustomLayoutService,
    CARD_SIZE,
    DEFAULT_GAP,
    SNAP_STEP,
    MIN_AREA_HEIGHT,
} from './CustomLayoutService';
import type { SeatPosition } from './CustomLayoutService';

const AREA_WIDTH = 1000;

describe('CustomLayoutService.defaultPositions - 처음 보여줄 배치', () => {
    it('좌석 수만큼 위치를 만든다', () => {
        expect(CustomLayoutService.defaultPositions(24, AREA_WIDTH)).toHaveLength(24);
    });

    it('좌석 번호는 1부터 차례로 매긴다', () => {
        const positions = CustomLayoutService.defaultPositions(5, AREA_WIDTH);
        expect(positions.map(p => p.seatId)).toEqual([1, 2, 3, 4, 5]);
    });

    it('카드가 서로 겹치지 않는다', () => {
        const positions = CustomLayoutService.defaultPositions(24, AREA_WIDTH);

        let overlaps = 0;
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const a = positions[i];
                const b = positions[j];
                if (Math.abs(a.x - b.x) < CARD_SIZE && Math.abs(a.y - b.y) < CARD_SIZE) overlaps++;
            }
        }

        expect(overlaps).toBe(0);
    });

    it('영역 폭을 넘어가지 않는다', () => {
        const positions = CustomLayoutService.defaultPositions(30, AREA_WIDTH);

        positions.forEach(p => {
            expect(p.x + CARD_SIZE).toBeLessThanOrEqual(AREA_WIDTH);
        });
    });

    it('좁은 영역에서는 한 줄에 하나씩 놓는다', () => {
        const positions = CustomLayoutService.defaultPositions(3, 100);

        expect(new Set(positions.map(p => p.x)).size).toBe(1);
        expect(new Set(positions.map(p => p.y)).size).toBe(3);
    });

    it('좌석이 없으면 빈 목록을 반환한다', () => {
        expect(CustomLayoutService.defaultPositions(0, AREA_WIDTH)).toEqual([]);
        expect(CustomLayoutService.defaultPositions(-3, AREA_WIDTH)).toEqual([]);
    });
});

describe('CustomLayoutService.snap - 격자 맞춤', () => {
    it('가까운 격자 지점으로 맞춘다', () => {
        expect(CustomLayoutService.snap(0)).toBe(0);
        // 절반 미만이면 가까운 쪽인 0으로 내려간다
        expect(CustomLayoutService.snap(SNAP_STEP / 2 - 1)).toBe(0);
        // 절반을 넘으면 다음 격자로 올라간다
        expect(CustomLayoutService.snap(SNAP_STEP / 2 + 1)).toBe(SNAP_STEP);
        expect(CustomLayoutService.snap(SNAP_STEP * 3 + 1)).toBe(SNAP_STEP * 3);
    });

    it('격자 단위가 0 이하이면 반올림만 한다', () => {
        expect(CustomLayoutService.snap(7.4, 0)).toBe(7);
    });
});

describe('CustomLayoutService.clampToArea - 영역 밖으로 나가지 않게', () => {
    it('왼쪽·위로 넘어가면 0으로 되돌린다', () => {
        expect(CustomLayoutService.clampToArea(-50, -30, AREA_WIDTH, 600)).toEqual({ x: 0, y: 0 });
    });

    it('오른쪽·아래로 넘어가면 카드가 들어가는 최대 좌표로 맞춘다', () => {
        const result = CustomLayoutService.clampToArea(9999, 9999, AREA_WIDTH, 600);

        expect(result).toEqual({ x: AREA_WIDTH - CARD_SIZE, y: 600 - CARD_SIZE });
    });

    it('영역이 카드보다 작아도 음수가 되지 않는다', () => {
        const result = CustomLayoutService.clampToArea(50, 50, 60, 60);

        expect(result).toEqual({ x: 0, y: 0 });
    });

    it('영역 안의 좌표는 그대로 둔다', () => {
        expect(CustomLayoutService.clampToArea(240, 120, AREA_WIDTH, 600)).toEqual({ x: 240, y: 120 });
    });
});

describe('CustomLayoutService.resolveDropPosition - 놓은 자리 확정', () => {
    it('격자에 맞추고 영역 안으로 넣는다', () => {
        const result = CustomLayoutService.resolveDropPosition(247, 5, AREA_WIDTH, 600);

        expect(result.x % SNAP_STEP).toBe(0);
        expect(result.y % SNAP_STEP).toBe(0);
        expect(result.x).toBeLessThanOrEqual(AREA_WIDTH - CARD_SIZE);
    });

    it('영역 밖에 놓아도 안쪽으로 들어온다', () => {
        const result = CustomLayoutService.resolveDropPosition(5000, -200, AREA_WIDTH, 600);

        expect(result.x).toBe(AREA_WIDTH - CARD_SIZE);
        expect(result.y).toBe(0);
    });
});

describe('CustomLayoutService.requiredHeight - 영역 높이', () => {
    it('배치가 없으면 최소 높이를 쓴다', () => {
        expect(CustomLayoutService.requiredHeight([])).toBe(MIN_AREA_HEIGHT);
    });

    it('가장 아래 카드가 다 보이도록 높이를 늘린다', () => {
        const positions: SeatPosition[] = [{ seatId: 1, x: 0, y: 800 }];

        expect(CustomLayoutService.requiredHeight(positions)).toBe(800 + CARD_SIZE + DEFAULT_GAP);
    });

    it('카드가 위쪽에만 있으면 최소 높이를 유지한다', () => {
        const positions: SeatPosition[] = [{ seatId: 1, x: 0, y: 0 }];

        expect(CustomLayoutService.requiredHeight(positions)).toBe(MIN_AREA_HEIGHT);
    });
});

describe('CustomLayoutService.parsePositions - 저장된 값 검사', () => {
    it('올바른 값을 읽는다', () => {
        const value = [{ seatId: 1, x: 10, y: 20 }];

        expect(CustomLayoutService.parsePositions(value)).toEqual(value);
    });

    it('배열이 아니면 거부한다', () => {
        expect(CustomLayoutService.parsePositions({ seatId: 1 })).toBeNull();
        expect(CustomLayoutService.parsePositions(null)).toBeNull();
        expect(CustomLayoutService.parsePositions('[]')).toBeNull();
    });

    it('숫자가 아닌 좌표는 거부한다', () => {
        expect(CustomLayoutService.parsePositions([{ seatId: 1, x: '10', y: 20 }])).toBeNull();
        expect(CustomLayoutService.parsePositions([{ seatId: 1, x: NaN, y: 20 }])).toBeNull();
        expect(CustomLayoutService.parsePositions([{ seatId: 1, y: 20 }])).toBeNull();
    });

    it('음수 좌표는 0으로 올린다', () => {
        expect(CustomLayoutService.parsePositions([{ seatId: 1, x: -5, y: -9 }]))
            .toEqual([{ seatId: 1, x: 0, y: 0 }]);
    });

    it('빈 배열은 그대로 허용한다', () => {
        expect(CustomLayoutService.parsePositions([])).toEqual([]);
    });
});

describe('CustomLayoutService.fitToCount - 인원이 바뀐 경우', () => {
    it('저장된 위치를 그대로 쓴다', () => {
        const stored: SeatPosition[] = [
            { seatId: 1, x: 300, y: 200 },
            { seatId: 2, x: 500, y: 200 },
        ];

        const result = CustomLayoutService.fitToCount(stored, 2, AREA_WIDTH);

        expect(result).toEqual(stored);
    });

    it('학생이 늘면 새 좌석은 기본 위치로 채운다', () => {
        // 채우지 않으면 새 책상이 모두 (0,0)에 겹쳐 쌓인다
        const stored: SeatPosition[] = [{ seatId: 1, x: 300, y: 200 }];

        const result = CustomLayoutService.fitToCount(stored, 4, AREA_WIDTH);

        expect(result).toHaveLength(4);
        expect(result[0]).toEqual({ seatId: 1, x: 300, y: 200 });
        const added = result.slice(1);
        expect(new Set(added.map(p => `${p.x},${p.y}`)).size).toBe(3);
    });

    it('학생이 줄면 넘치는 위치는 버린다', () => {
        const stored: SeatPosition[] = [
            { seatId: 1, x: 300, y: 200 },
            { seatId: 2, x: 500, y: 200 },
            { seatId: 3, x: 700, y: 200 },
        ];

        const result = CustomLayoutService.fitToCount(stored, 2, AREA_WIDTH);

        expect(result.map(p => p.seatId)).toEqual([1, 2]);
    });

    it('저장된 위치가 없으면 전부 기본 위치가 된다', () => {
        const result = CustomLayoutService.fitToCount([], 3, AREA_WIDTH);

        expect(result).toEqual(CustomLayoutService.defaultPositions(3, AREA_WIDTH));
    });
});
