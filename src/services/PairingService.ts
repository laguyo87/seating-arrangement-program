/**
 * 짝꿍 배치 규칙
 *
 * 짝꿍 배치 로직은 원래 DOM 조작 코드 안에 섞여 있어 검증이 불가능했고,
 * 그 결과 "한쪽 성별이 먼저 소진되면 남은 학생이 자리를 못 받는" 버그가
 * 오래 발견되지 않았다. 순수 규칙만 여기로 분리해 테스트로 고정한다.
 */

import { Student } from '../models/Student.js';

/** 짝꿍 한 쌍. 자리가 하나만 차는 경우 second가 null이 된다. */
export interface StudentPair {
    first: Student | null;
    second: Student | null;
}

export class PairingService {
    /**
     * 성별에 맞는 학생 풀을 고른다.
     * 해당 성별이 모두 배치되었으면 다른 성별 풀을 사용한다.
     *
     * 성별이 맞지 않는다고 자리를 비워두면, 남은 학생은 앉을 곳이 없는데
     * 좌석은 비어 있는 상태가 된다. 학생 수와 좌석 수가 같으면
     * 인원 초과 경고도 뜨지 않아 교사가 알아챌 수단이 없다.
     *
     * 반환되는 배열은 원본 참조다. 호출부가 splice로 직접 소모한다.
     */
    public static selectPool<T>(preferMale: boolean, males: T[], females: T[]): T[] {
        const preferred = preferMale ? males : females;
        if (preferred.length > 0) {
            return preferred;
        }
        return preferMale ? females : males;
    }

    /**
     * 남녀 짝꿍을 만들고, 짝을 이루지 못한 나머지 학생도 모두 자리를 받도록 묶는다.
     *
     * 1) 남녀 한 명씩 짝을 짓는다.
     * 2) 남은 남학생끼리 짝을 짓고, 홀수면 한 명은 혼자 앉는다.
     * 3) 남은 여학생에 대해서도 같은 처리를 한다.
     *
     * 3)이 빠지면 여학생이 더 많은 학급에서 남는 여학생의 책상이 아예
     * 만들어지지 않는다. 실제 학급의 상당수가 여기에 해당한다.
     */
    public static buildPairs(males: Student[], females: Student[]): StudentPair[] {
        const pairs: StudentPair[] = [];
        const genderPairs = Math.min(males.length, females.length);

        let maleIndex = 0;
        let femaleIndex = 0;

        // 1) 남녀 짝꿍
        for (let i = 0; i < genderPairs; i++) {
            pairs.push({ first: males[maleIndex++], second: females[femaleIndex++] });
        }

        // 2) 남은 남학생
        const remainingMales = males.length - genderPairs;
        for (let i = 0; i < Math.floor(remainingMales / 2); i++) {
            pairs.push({ first: males[maleIndex++], second: males[maleIndex++] });
        }
        if (remainingMales % 2 === 1) {
            pairs.push({ first: males[maleIndex++], second: null });
        }

        // 3) 남은 여학생
        const remainingFemales = females.length - genderPairs;
        for (let i = 0; i < Math.floor(remainingFemales / 2); i++) {
            pairs.push({ first: females[femaleIndex++], second: females[femaleIndex++] });
        }
        if (remainingFemales % 2 === 1) {
            pairs.push({ first: females[femaleIndex++], second: null });
        }

        return pairs;
    }
}
