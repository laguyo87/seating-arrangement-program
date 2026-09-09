/**
 * 사용자 구성 배치
 *
 * 교사가 책상(좌석 카드)을 원하는 위치로 직접 끌어다 놓아 교실 모양을 만드는 배치.
 * ㄷ자, 원형, 섬 모양 등 정해진 틀에 없는 형태를 만들 수 있다.
 *
 * 다른 배치 형태는 카드가 그리드에 놓이지만, 이 배치는 각 카드가 좌표를 가진다.
 * 좌표 계산 규칙만 여기 모아 테스트로 고정한다.
 */

/** 좌석 하나의 위치 */
export interface SeatPosition {
    seatId: number;
    x: number;
    y: number;
}

/** 카드 한 변의 크기(px). style.css의 .student-seat-card와 맞춘다. */
export const CARD_SIZE = 120;

/** 기본 배치에서 카드 사이의 간격(px) */
export const DEFAULT_GAP = 24;

/** 끌어다 놓을 때 좌표를 맞추는 격자 단위(px). 책상이 어긋나 보이지 않게 한다. */
export const SNAP_STEP = 12;

/** 배치 영역의 최소 높이(px) */
export const MIN_AREA_HEIGHT = 420;

/**
 * 다른 책상에 달라붙는 거리(px).
 * 격자 단위(SNAP_STEP)보다 커야 자석이 격자보다 우선한다.
 */
export const MAGNET_THRESHOLD = 18;

/** 책상을 나란히 붙일 때 쓰는 간격(px). 0은 딱 붙이기. */
export const ADJACENT_GAPS = [0, DEFAULT_GAP];

/** 자석 결과 */
export interface MagnetResult {
    x: number;
    y: number;
    /** 세로 안내선을 그릴 위치. 다른 책상과 세로줄이 맞았을 때만 값이 있다. */
    guideX: number | null;
    /** 가로 안내선을 그릴 위치. 다른 책상과 가로줄이 맞았을 때만 값이 있다. */
    guideY: number | null;
}

export class CustomLayoutService {
    /**
     * 처음 보여줄 기본 위치를 만든다.
     * 영역 폭에 맞춰 한 줄에 몇 개가 들어가는지 계산해 격자로 채운다.
     * 교사는 여기서부터 원하는 모양으로 옮기면 된다.
     */
    public static defaultPositions(count: number, areaWidth: number): SeatPosition[] {
        if (count <= 0) return [];

        const step = CARD_SIZE + DEFAULT_GAP;
        const usableWidth = Math.max(areaWidth, step);
        const perRow = Math.max(1, Math.floor(usableWidth / step));

        // 격자 전체를 가운데로 모으기 위한 왼쪽 여백
        const columns = Math.min(perRow, count);
        const gridWidth = columns * step - DEFAULT_GAP;
        const offsetX = Math.max(0, Math.round((areaWidth - gridWidth) / 2));

        return Array.from({ length: count }, (_, index) => ({
            seatId: index + 1,
            x: offsetX + (index % perRow) * step,
            y: DEFAULT_GAP + Math.floor(index / perRow) * step
        }));
    }

    /**
     * 값을 격자 단위로 맞춘다.
     */
    public static snap(value: number, step: number = SNAP_STEP): number {
        if (step <= 0) return Math.round(value);
        return Math.round(value / step) * step;
    }

    /**
     * 카드가 배치 영역 밖으로 나가지 않도록 좌표를 가둔다.
     * 나가면 화면에서 사라지거나 스크롤이 끝없이 늘어난다.
     */
    public static clampToArea(
        x: number,
        y: number,
        areaWidth: number,
        areaHeight: number
    ): { x: number; y: number } {
        const maxX = Math.max(0, areaWidth - CARD_SIZE);
        const maxY = Math.max(0, areaHeight - CARD_SIZE);

        return {
            x: Math.min(Math.max(0, x), maxX),
            y: Math.min(Math.max(0, y), maxY)
        };
    }

    /**
     * 끌어다 놓은 지점을 실제로 적용할 좌표로 바꾼다. (격자 맞춤 후 영역 안으로)
     */
    public static resolveDropPosition(
        x: number,
        y: number,
        areaWidth: number,
        areaHeight: number
    ): { x: number; y: number } {
        const snapped = { x: this.snap(x), y: this.snap(y) };
        return this.clampToArea(snapped.x, snapped.y, areaWidth, areaHeight);
    }

    /**
     * 주어진 값에 가장 가까운 후보를 고른다. 기준 거리 밖이면 null.
     */
    private static nearestCandidate(value: number, candidates: number[], threshold: number): number | null {
        let best: number | null = null;
        let bestDistance = threshold;

        for (const candidate of candidates) {
            const distance = Math.abs(candidate - value);
            if (distance <= bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        }

        return best;
    }

    /**
     * 다른 책상에 자석처럼 달라붙는 위치를 계산한다.
     *
     * 두 가지로 붙는다.
     *  - 줄 맞추기: 다른 책상과 같은 세로줄/가로줄에 맞춘다. (교실은 줄이 맞아야 보기 좋다)
     *  - 나란히 붙이기: 다른 책상 바로 옆/위아래에 정해진 간격으로 붙인다.
     *
     * 줄이 맞은 경우에만 안내선 위치를 함께 돌려준다.
     * 나란히 붙인 것은 눈으로 바로 확인되지만, 멀리 떨어진 책상과 줄이 맞은 것은
     * 선으로 보여주지 않으면 알아채기 어렵기 때문이다.
     *
     * 가까운 책상이 없으면 격자 맞춤으로 되돌아간다.
     */
    public static magnetize(
        x: number,
        y: number,
        others: SeatPosition[],
        threshold: number = MAGNET_THRESHOLD
    ): MagnetResult {
        const alignX = others.map(o => o.x);
        const alignY = others.map(o => o.y);

        const adjacentX = others.flatMap(o =>
            ADJACENT_GAPS.flatMap(gap => [o.x + CARD_SIZE + gap, o.x - CARD_SIZE - gap])
        );
        const adjacentY = others.flatMap(o =>
            ADJACENT_GAPS.flatMap(gap => [o.y + CARD_SIZE + gap, o.y - CARD_SIZE - gap])
        );

        const resolveAxis = (
            value: number,
            alignCandidates: number[],
            adjacentCandidates: number[]
        ): { value: number; guide: number | null } => {
            const aligned = this.nearestCandidate(value, alignCandidates, threshold);
            const adjacent = this.nearestCandidate(value, adjacentCandidates, threshold);

            if (aligned !== null && adjacent !== null) {
                // 둘 다 가능하면 더 가까운 쪽을 따른다
                const alignedIsCloser = Math.abs(aligned - value) <= Math.abs(adjacent - value);
                return alignedIsCloser
                    ? { value: aligned, guide: aligned }
                    : { value: adjacent, guide: null };
            }
            if (aligned !== null) return { value: aligned, guide: aligned };
            if (adjacent !== null) return { value: adjacent, guide: null };

            // 붙일 책상이 없으면 격자에 맞춘다
            return { value: this.snap(value), guide: null };
        };

        const resolvedX = resolveAxis(x, alignX, adjacentX);
        const resolvedY = resolveAxis(y, alignY, adjacentY);

        return {
            x: resolvedX.value,
            y: resolvedY.value,
            guideX: resolvedX.guide,
            guideY: resolvedY.guide
        };
    }

    /**
     * 배치를 모두 담기 위해 필요한 영역 높이.
     * 카드를 아래로 옮기면 영역도 함께 늘어나야 한다.
     */
    public static requiredHeight(positions: SeatPosition[]): number {
        if (positions.length === 0) return MIN_AREA_HEIGHT;

        const lowest = positions.reduce((max, p) => Math.max(max, p.y), 0);
        return Math.max(MIN_AREA_HEIGHT, lowest + CARD_SIZE + DEFAULT_GAP);
    }

    /**
     * 배치 전체를 감싸는 크기를 구한다.
     *
     * 인쇄물처럼 좌석 영역의 크기를 직접 지정해야 하는 곳에서 쓴다.
     * 가장 오른쪽/아래쪽 책상의 '끝'까지 포함해야 하므로 카드 크기를 더한다.
     * 이를 빠뜨리면 마지막 줄의 책상이 잘려 인쇄된다.
     */
    public static boundingSize(positions: SeatPosition[]): { width: number; height: number } {
        if (positions.length === 0) return { width: 0, height: 0 };

        let right = 0;
        let bottom = 0;

        for (const position of positions) {
            right = Math.max(right, position.x + CARD_SIZE);
            bottom = Math.max(bottom, position.y + CARD_SIZE);
        }

        return { width: right, height: bottom };
    }

    /**
     * 배치를 원점(0,0)에 맞춰 옮긴다.
     *
     * 교사가 화면 오른쪽이나 아래쪽에 책상을 몰아 두면 왼쪽·위쪽에 빈 공간이 생긴다.
     * 인쇄물에서는 그 빈 공간까지 배치의 일부로 잡혀 종이 한쪽이 비어 보인다.
     * 배치 모양은 그대로 두고 전체를 원점으로 당겨 여백만 걷어낸다.
     */
    public static normalizeToOrigin(positions: SeatPosition[]): SeatPosition[] {
        if (positions.length === 0) return [];

        const minX = positions.reduce((min, p) => Math.min(min, p.x), Infinity);
        const minY = positions.reduce((min, p) => Math.min(min, p.y), Infinity);

        return positions.map(p => ({
            seatId: p.seatId,
            x: p.x - minX,
            y: p.y - minY
        }));
    }

    /**
     * 저장된 값이 쓸 수 있는 위치 목록인지 확인한다.
     * 손상된 값을 그대로 적용하면 카드가 화면 밖으로 사라진다.
     */
    public static parsePositions(value: unknown): SeatPosition[] | null {
        if (!Array.isArray(value)) return null;

        const positions: SeatPosition[] = [];
        for (const entry of value) {
            if (!entry || typeof entry !== 'object') return null;

            const { seatId, x, y } = entry as Partial<SeatPosition>;
            if (
                typeof seatId !== 'number' || !Number.isFinite(seatId) ||
                typeof x !== 'number' || !Number.isFinite(x) ||
                typeof y !== 'number' || !Number.isFinite(y)
            ) {
                return null;
            }

            positions.push({ seatId, x: Math.max(0, x), y: Math.max(0, y) });
        }

        return positions;
    }

    /**
     * 저장된 위치를 현재 좌석 수에 맞춘다.
     *
     * 학생 수가 바뀌면 저장된 위치와 개수가 어긋난다.
     * 남는 좌석은 기본 위치로 채우고, 넘치는 위치는 버린다.
     * 이렇게 하지 않으면 인원을 늘렸을 때 새 책상이 (0,0)에 겹쳐 쌓인다.
     */
    public static fitToCount(
        stored: SeatPosition[],
        count: number,
        areaWidth: number
    ): SeatPosition[] {
        const defaults = this.defaultPositions(count, areaWidth);
        const byId = new Map(stored.map(p => [p.seatId, p]));

        return defaults.map(fallback => {
            const saved = byId.get(fallback.seatId);
            return saved ? { seatId: fallback.seatId, x: saved.x, y: saved.y } : fallback;
        });
    }
}
