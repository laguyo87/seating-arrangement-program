/**
 * 좌석 재배치 규칙
 *
 * 자리 번호(data-seat-id)는 '위치'에 속한다. 카드를 옮길 때 카드 요소 자체를
 * 이동시키면 자리 번호가 학생을 따라다니게 되어, 화면에 보이는 배치와
 * 저장되는 배치가 어긋난다(자리 확정 → 이력 불러오기에서 드러난다).
 *
 * 그래서 위치는 그대로 두고 '내용'만 옮긴다.
 * 카드 위에 떨어뜨리는 교환(swap)과 빈 곳에 떨어뜨리는 이동(rotate) 모두
 * 이 규칙을 따른다.
 */

export class SeatReorderService {
    /**
     * fromIndex의 항목을 toIndex 자리로 옮기고, 사이의 항목들을 한 칸씩 민다.
     *
     * 예) ['A','B','C','D'] 에서 0 → 2 : ['B','C','A','D']
     *     ['A','B','C','D'] 에서 2 → 0 : ['C','A','B','D']
     *
     * 원본 배열은 변경하지 않는다. 인덱스가 범위를 벗어나면 원본 복사본을 그대로 반환한다.
     */
    public static rotate<T>(items: T[], fromIndex: number, toIndex: number): T[] {
        const result = [...items];

        if (
            fromIndex === toIndex ||
            fromIndex < 0 || fromIndex >= items.length ||
            toIndex < 0 || toIndex >= items.length
        ) {
            return result;
        }

        const moving = result[fromIndex];

        if (fromIndex < toIndex) {
            // 뒤로 이동: 사이 항목들을 앞으로 한 칸씩 당긴다
            for (let i = fromIndex; i < toIndex; i++) {
                result[i] = result[i + 1];
            }
        } else {
            // 앞으로 이동: 사이 항목들을 뒤로 한 칸씩 민다
            for (let i = fromIndex; i > toIndex; i--) {
                result[i] = result[i - 1];
            }
        }

        result[toIndex] = moving;
        return result;
    }

    /**
     * 두 위치의 내용을 맞바꾼다. 원본 배열은 변경하지 않는다.
     */
    public static swap<T>(items: T[], indexA: number, indexB: number): T[] {
        const result = [...items];

        if (
            indexA === indexB ||
            indexA < 0 || indexA >= items.length ||
            indexB < 0 || indexB >= items.length
        ) {
            return result;
        }

        [result[indexA], result[indexB]] = [result[indexB], result[indexA]];
        return result;
    }

    /**
     * 가장 가까운 카드와 삽입 방향으로부터 목적지 인덱스를 계산한다.
     *
     * @param closestIndex   드롭 지점에서 가장 가까운 카드의 인덱스
     * @param insertBefore   그 카드의 앞에 넣을지 여부
     * @param sourceIndex    옮기려는 카드의 현재 인덱스
     */
    public static resolveTargetIndex(
        closestIndex: number,
        insertBefore: boolean,
        sourceIndex: number
    ): number {
        let target = insertBefore ? closestIndex : closestIndex + 1;

        // 원래 자리가 목적지보다 앞이면, 빠져나간 만큼 한 칸 당겨진다
        if (sourceIndex < target) {
            target -= 1;
        }

        return target;
    }
}
