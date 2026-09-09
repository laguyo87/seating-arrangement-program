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
     * 배치를 모두 담기 위해 필요한 영역 높이.
     * 카드를 아래로 옮기면 영역도 함께 늘어나야 한다.
     */
    public static requiredHeight(positions: SeatPosition[]): number {
        if (positions.length === 0) return MIN_AREA_HEIGHT;

        const lowest = positions.reduce((max, p) => Math.max(max, p.y), 0);
        return Math.max(MIN_AREA_HEIGHT, lowest + CARD_SIZE + DEFAULT_GAP);
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
