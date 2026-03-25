/**
 * 옵션 설정 타입 정의
 */

/**
 * 레이아웃 타입
 */
export type LayoutType = 'single-uniform' | 'pair-uniform' | 'group' | 'custom';

/**
 * 모둠 크기
 */
export type GroupSize = 'group-3' | 'group-4' | 'group-5' | 'group-6';

/**
 * 짝꿍 모드
 */
export type PairMode = 'gender-pair' | 'same-gender-pair';

/**
 * 커스텀 모드 1
 */
export type CustomMode1 = 'partition' | 'no-partition';

/**
 * 커스텀 모드 2
 */
export type CustomMode2 = 'fixed-random' | 'random';

/**
 * 옵션 설정 인터페이스
 */
export interface Options {
    layoutType?: LayoutType;
    groupSize?: GroupSize;
    pairMode?: PairMode;
    customMode1?: CustomMode1;
    customMode2?: CustomMode2;
    numberOfPartitions?: number;
    genderMix?: boolean;
    [key: string]: string | number | boolean | undefined;
}

