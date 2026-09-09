import { describe, it, expect } from 'vitest';
import { SeatReorderService } from './SeatReorderService';

describe('SeatReorderService.rotate', () => {
    it('뒤쪽으로 옮기면 사이 항목이 앞으로 당겨진다', () => {
        expect(SeatReorderService.rotate(['A', 'B', 'C', 'D'], 0, 2)).toEqual(['B', 'C', 'A', 'D']);
    });

    it('앞쪽으로 옮기면 사이 항목이 뒤로 밀린다', () => {
        expect(SeatReorderService.rotate(['A', 'B', 'C', 'D'], 2, 0)).toEqual(['C', 'A', 'B', 'D']);
    });

    it('바로 옆으로 옮기면 두 항목이 맞바뀐 것과 같다', () => {
        expect(SeatReorderService.rotate(['A', 'B', 'C'], 0, 1)).toEqual(['B', 'A', 'C']);
        expect(SeatReorderService.rotate(['A', 'B', 'C'], 2, 1)).toEqual(['A', 'C', 'B']);
    });

    it('같은 자리로 옮기면 변화가 없다', () => {
        expect(SeatReorderService.rotate(['A', 'B', 'C'], 1, 1)).toEqual(['A', 'B', 'C']);
    });

    it('항목이 사라지거나 늘어나지 않는다', () => {
        const items = ['A', 'B', 'C', 'D', 'E'];

        for (let from = 0; from < items.length; from++) {
            for (let to = 0; to < items.length; to++) {
                const result = SeatReorderService.rotate(items, from, to);
                expect(result).toHaveLength(items.length);
                expect([...result].sort()).toEqual([...items].sort());
            }
        }
    });

    it('원본 배열을 변경하지 않는다', () => {
        const items = ['A', 'B', 'C'];
        SeatReorderService.rotate(items, 0, 2);
        expect(items).toEqual(['A', 'B', 'C']);
    });

    it('범위를 벗어난 인덱스는 무시한다', () => {
        expect(SeatReorderService.rotate(['A', 'B'], -1, 1)).toEqual(['A', 'B']);
        expect(SeatReorderService.rotate(['A', 'B'], 0, 5)).toEqual(['A', 'B']);
        expect(SeatReorderService.rotate([], 0, 0)).toEqual([]);
    });

    it('맨 앞에서 맨 뒤로 옮길 수 있다', () => {
        expect(SeatReorderService.rotate(['A', 'B', 'C', 'D'], 0, 3)).toEqual(['B', 'C', 'D', 'A']);
    });

    it('맨 뒤에서 맨 앞으로 옮길 수 있다', () => {
        expect(SeatReorderService.rotate(['A', 'B', 'C', 'D'], 3, 0)).toEqual(['D', 'A', 'B', 'C']);
    });
});

describe('SeatReorderService.swap', () => {
    it('두 자리의 내용을 맞바꾼다', () => {
        expect(SeatReorderService.swap(['A', 'B', 'C'], 0, 2)).toEqual(['C', 'B', 'A']);
    });

    it('같은 자리끼리는 변화가 없다', () => {
        expect(SeatReorderService.swap(['A', 'B'], 1, 1)).toEqual(['A', 'B']);
    });

    it('범위를 벗어난 인덱스는 무시한다', () => {
        expect(SeatReorderService.swap(['A', 'B'], 0, 9)).toEqual(['A', 'B']);
    });

    it('원본 배열을 변경하지 않는다', () => {
        const items = ['A', 'B'];
        SeatReorderService.swap(items, 0, 1);
        expect(items).toEqual(['A', 'B']);
    });
});

describe('SeatReorderService.resolveTargetIndex', () => {
    it('앞에 삽입하면 그 카드의 인덱스가 목적지다', () => {
        // [A,B,C] 에서 C(2)를 B(1) 앞으로
        expect(SeatReorderService.resolveTargetIndex(1, true, 2)).toBe(1);
    });

    it('뒤에 삽입하면 그 다음 인덱스가 목적지다', () => {
        // [A,B,C] 에서 A(0)를 B(1) 뒤로 → 빠져나간 만큼 당겨져 1
        expect(SeatReorderService.resolveTargetIndex(1, false, 0)).toBe(1);
    });

    it('앞에서 뒤로 옮길 때 빠져나간 자리만큼 보정한다', () => {
        // [A,B,C,D] 에서 A(0)를 C(2) 뒤로 → 2
        expect(SeatReorderService.resolveTargetIndex(2, false, 0)).toBe(2);
    });

    it('뒤에서 앞으로 옮길 때는 보정하지 않는다', () => {
        // [A,B,C,D] 에서 D(3)를 B(1) 앞으로 → 1
        expect(SeatReorderService.resolveTargetIndex(1, true, 3)).toBe(1);
    });

    it('계산된 목적지로 회전하면 의도한 순서가 된다', () => {
        const items = ['A', 'B', 'C', 'D'];
        // A를 C 뒤로 옮기고 싶다
        const target = SeatReorderService.resolveTargetIndex(2, false, 0);

        expect(SeatReorderService.rotate(items, 0, target)).toEqual(['B', 'C', 'A', 'D']);
    });
});
