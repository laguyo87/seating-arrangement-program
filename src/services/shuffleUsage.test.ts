import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 편향된 셔플이 다시 들어오는 것을 막는 가드.
 *
 * `array.sort(() => Math.random() - 0.5)`는 셔플처럼 보이지만 결과가 균등하지 않다.
 * 이 저장소에는 올바른 Fisher-Yates 구현(RandomService.shuffle)이 이미 있으므로
 * 자리 배치 경로에서는 반드시 그것을 사용해야 한다.
 *
 * 실제 배치 로직은 DOM에 직접 붙어 있어 단위 테스트로 감싸기 어렵다.
 * 그래서 알고리즘 자체의 균등성은 RandomService.test.ts가 검증하고,
 * '올바른 구현을 실제로 쓰고 있는지'는 이 가드가 검증한다.
 */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            collectSourceFiles(full, acc);
        } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.d.ts')) {
            acc.push(full);
        }
    }
    return acc;
}

describe('셔플 사용 가드', () => {
    it('비교 함수 기반의 편향된 셔플을 사용하지 않는다', () => {
        // sort 비교 함수가 Math.random을 쓰는 모든 형태를 잡는다
        const biasedSort = /\.sort\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>[^)]*Math\.random/;

        const offenders = collectSourceFiles('src')
            .map(file => ({ file, source: readFileSync(file, 'utf-8') }))
            .filter(({ source }) => biasedSort.test(source))
            .map(({ file }) => file);

        expect(offenders).toEqual([]);
    });

    it('RandomService.shuffle이 Fisher-Yates 형태를 유지한다', () => {
        const source = readFileSync('src/services/RandomService.ts', 'utf-8');

        // 뒤에서 앞으로 순회하며 [0, i] 범위에서 교환 대상을 뽑아야 한다
        expect(source).toMatch(/for\s*\(\s*let\s+i\s*=\s*shuffled\.length\s*-\s*1;\s*i\s*>\s*0;\s*i--\s*\)/);
        expect(source).toMatch(/Math\.floor\(Math\.random\(\)\s*\*\s*\(i\s*\+\s*1\)\)/);
    });
});
