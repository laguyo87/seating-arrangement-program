import { describe, it, expect } from 'vitest';
import { PairingService } from './PairingService';
import type { Student } from '../models/Student';

function makeStudents(count: number, gender: 'M' | 'F', prefix: string): Student[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `${prefix}${i + 1}`,
        gender,
    }));
}

/** 짝 목록에 실제로 자리를 받은 학생 이름 */
function seatedNames(pairs: ReturnType<typeof PairingService.buildPairs>): string[] {
    return pairs.flatMap(p => [p.first, p.second]).filter(Boolean).map(s => s!.name);
}

describe('PairingService.buildPairs - 모든 학생이 자리를 받는다', () => {
    const cases: Array<[number, number]> = [
        [11, 13], [10, 14], [4, 16], [15, 10], [16, 4],
        [12, 12], [1, 19], [0, 20], [20, 0], [1, 0], [0, 1], [0, 0],
        [13, 12], [7, 8],
    ];

    cases.forEach(([maleCount, femaleCount]) => {
        it(`남${maleCount}/여${femaleCount} → ${maleCount + femaleCount}명 모두 배치된다`, () => {
            const males = makeStudents(maleCount, 'M', '남');
            const females = makeStudents(femaleCount, 'F', '여');

            const seated = seatedNames(PairingService.buildPairs(males, females));

            expect(seated).toHaveLength(maleCount + femaleCount);
            expect(new Set(seated).size).toBe(maleCount + femaleCount);
        });
    });

    it('여학생이 더 많아도 남는 여학생의 자리가 만들어진다', () => {
        // 이 경우가 원래 버그였다: 11남/13여 → 24명 중 22명분의 책상만 생성됨
        const males = makeStudents(11, 'M', '남');
        const females = makeStudents(13, 'F', '여');

        const pairs = PairingService.buildPairs(males, females);
        const seated = seatedNames(pairs);

        expect(seated).toContain('여12');
        expect(seated).toContain('여13');
    });

    it('남녀 짝꿍을 최대한 많이 만든다', () => {
        const pairs = PairingService.buildPairs(makeStudents(11, 'M', '남'), makeStudents(13, 'F', '여'));

        const mixedPairs = pairs.filter(
            p => p.first && p.second && p.first.gender !== p.second.gender
        );

        expect(mixedPairs).toHaveLength(11);
    });

    it('혼자 앉는 학생은 최대 한 명이다 (인원이 짝수일 때는 없다)', () => {
        const evenPairs = PairingService.buildPairs(makeStudents(11, 'M', '남'), makeStudents(13, 'F', '여'));
        expect(evenPairs.filter(p => !p.first || !p.second)).toHaveLength(0);

        const oddPairs = PairingService.buildPairs(makeStudents(11, 'M', '남'), makeStudents(12, 'F', '여'));
        expect(oddPairs.filter(p => !p.first || !p.second)).toHaveLength(1);
    });

    it('같은 학생이 두 번 배치되지 않는다', () => {
        const seated = seatedNames(PairingService.buildPairs(makeStudents(9, 'M', '남'), makeStudents(17, 'F', '여')));
        expect(new Set(seated).size).toBe(seated.length);
    });
});

describe('PairingService.selectPool - 성별 풀 소진 처리', () => {
    it('성별에 맞는 풀이 있으면 그대로 사용한다', () => {
        const males = ['남1', '남2'];
        const females = ['여1'];

        expect(PairingService.selectPool(true, males, females)).toBe(males);
        expect(PairingService.selectPool(false, males, females)).toBe(females);
    });

    it('남학생이 모두 배치되었으면 여학생 풀을 사용한다', () => {
        const males: string[] = [];
        const females = ['여1', '여2'];

        // 남자 자리라도 남은 여학생을 앉힌다. 비워두면 그 학생은 앉을 곳이 없다.
        expect(PairingService.selectPool(true, males, females)).toBe(females);
    });

    it('여학생이 모두 배치되었으면 남학생 풀을 사용한다', () => {
        const males = ['남1'];
        const females: string[] = [];

        expect(PairingService.selectPool(false, males, females)).toBe(males);
    });

    it('양쪽 모두 비었으면 빈 배열을 반환한다', () => {
        expect(PairingService.selectPool(true, [], [])).toEqual([]);
        expect(PairingService.selectPool(false, [], [])).toEqual([]);
    });

    it('반환된 배열을 소모하면 남은 학생 수가 실제로 줄어든다', () => {
        const males: string[] = [];
        const females = ['여1', '여2'];

        const pool = PairingService.selectPool(true, males, females);
        pool.splice(0, 1);

        expect(females).toEqual(['여2']);
    });
});
