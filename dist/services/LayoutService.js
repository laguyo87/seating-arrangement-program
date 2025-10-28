/**
 * 좌석 배치 알고리즘 서비스
 */
import { SeatModel, LayoutType } from '../models/Seat.js';
/**
 * 배치 알고리즘을 담당하는 서비스
 */
export class LayoutService {
    /**
     * 1열 균등 배치를 생성합니다.
     * 학생 총 인원수를 분단 수로 나눈 숫자만큼의 좌석을 일렬로 균등하게 배치
     * @param totalSeats 전체 좌석 수
     * @param partitionCount 분단 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @returns 배치된 좌석 배열
     */
    static createSingleUniformLayout(totalSeats, canvasWidth = 800, canvasHeight = 600, partitionCount = 1) {
        const seats = [];
        // 분단별 좌석 수 계산
        const seatsPerPartition = Math.ceil(totalSeats / partitionCount);
        // 좌석 간격 설정
        const seatWidth = 60;
        const seatHeight = 60;
        const horizontalSpacing = 80;
        const verticalSpacing = 100;
        // 좌석 생성
        let seatIndex = 0;
        for (let partition = 0; partition < partitionCount && seatIndex < totalSeats; partition++) {
            // 분단별 Y 위치 계산
            const startY = 150 + partition * (verticalSpacing * (Math.ceil(seatsPerPartition / 4) - 1) + 100);
            // 분단 내 좌석을 4열로 배치
            for (let i = 0; i < seatsPerPartition && seatIndex < totalSeats; i++) {
                const row = Math.floor(i / 4);
                const col = i % 4;
                const position = {
                    x: (canvasWidth / 2) - (1.5 * horizontalSpacing) + (col * horizontalSpacing),
                    y: startY + row * verticalSpacing
                };
                const seat = SeatModel.create(position);
                seats.push(seat);
                seatIndex++;
            }
        }
        return seats;
    }
    /**
     * 2열 균등 배치(짝꿍 책상)를 생성합니다.
     * 두 명의 좌석을 나란히 붙여서 배치하고, 분단 수만큼 나누어서 배치
     * @param totalSeats 전체 좌석 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @param partitionCount 분단 수
     * @returns 배치된 좌석 배열
     */
    static createPairUniformLayout(totalSeats, canvasWidth = 800, canvasHeight = 600, partitionCount = 1) {
        const seats = [];
        // 짝꿍 책상 쌍의 수
        const pairCount = Math.ceil(totalSeats / 2);
        const pairsPerPartition = Math.ceil(pairCount / partitionCount);
        const seatWidth = 60;
        const seatHeight = 60;
        const pairSpacing = 20; // 짝꿍 사이 간격
        const horizontalSpacing = 140; // 다음 쌍까지의 가로 간격
        const verticalSpacing = 80;
        const partitionGap = 150; // 분단 사이 간격
        // 좌석 생성
        let pairIndex = 0;
        for (let partition = 0; partition < partitionCount && pairIndex < pairCount; partition++) {
            // 분단별 Y 위치 계산
            const startY = 150 + partition * (verticalSpacing * (Math.ceil(pairsPerPartition / 4) - 1) + partitionGap);
            // 분단 내 짝꿍 배치 (4열로)
            for (let i = 0; i < pairsPerPartition && pairIndex < pairCount; i++) {
                const row = Math.floor(i / 4);
                const col = i % 4;
                // 짝꿍 쌍의 시작 X 위치
                const baseX = (canvasWidth / 2) - (1.5 * horizontalSpacing) + (col * horizontalSpacing);
                const y = startY + row * verticalSpacing;
                // 왼쪽 좌석
                const seat1 = SeatModel.create({ x: baseX, y });
                // 오른쪽 좌석
                const seat2 = SeatModel.create({
                    x: baseX + seatWidth + pairSpacing,
                    y
                });
                // 짝꿍 연결
                seat1.pairSeatId = seat2.id;
                seat2.pairSeatId = seat1.id;
                seats.push(seat1, seat2);
                pairIndex++;
            }
        }
        // 실제 좌석 수만큼만 반환
        return seats.slice(0, totalSeats);
    }
    /**
     * 모둠 배치를 생성합니다.
     * @param totalSeats 전체 좌석 수
     * @param groupSize 모둠 크기 (기본값: 4)
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @returns 배치된 좌석 배열
     */
    static createGroupLayout(totalSeats, groupSize = 4, canvasWidth = 800, canvasHeight = 600) {
        const seats = [];
        const groupCount = Math.ceil(totalSeats / groupSize);
        // 모둠을 2열로 배치
        const cols = Math.ceil(Math.sqrt(groupCount));
        const rows = Math.ceil(groupCount / cols);
        const seatWidth = 60;
        const seatHeight = 60;
        const withinGroupSpacing = 20;
        const groupSpacing = 180;
        const totalWidth = (cols - 1) * groupSpacing + (Math.sqrt(groupSize) - 1) * withinGroupSpacing + seatWidth;
        const totalHeight = (rows - 1) * groupSpacing + (Math.sqrt(groupSize) - 1) * withinGroupSpacing + seatHeight;
        const startX = (canvasWidth - totalWidth) / 2;
        const startY = (canvasHeight - totalHeight) / 2;
        let seatIndex = 0;
        for (let groupRow = 0; groupRow < rows && seatIndex < totalSeats; groupRow++) {
            for (let groupCol = 0; groupCol < cols && seatIndex < totalSeats; groupCol++) {
                const groupStartX = startX + groupCol * groupSpacing;
                const groupStartY = startY + groupRow * groupSpacing;
                // 모둠 내 좌석 배치 (2x2 또는 적절한 형태)
                const seatsPerRow = Math.ceil(Math.sqrt(groupSize));
                for (let i = 0; i < groupSize && seatIndex < totalSeats; i++) {
                    const row = Math.floor(i / seatsPerRow);
                    const col = i % seatsPerRow;
                    const position = {
                        x: groupStartX + col * (seatWidth + withinGroupSpacing),
                        y: groupStartY + row * (seatHeight + withinGroupSpacing)
                    };
                    const seat = SeatModel.create(position);
                    seats.push(seat);
                    seatIndex++;
                }
            }
        }
        return seats;
    }
    /**
     * ㄷ자 배치를 생성합니다.
     * @param totalSeats 전체 좌석 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @returns 배치된 좌석 배열
     */
    static createUShapeLayout(totalSeats, canvasWidth = 800) {
        const seats = [];
        // ㄷ자 모양으로 배치 (앞, 양쪽 측면, 뒤쪽)
        const sideLength = Math.floor(totalSeats / 4);
        const frontLength = sideLength;
        const backLength = totalSeats - sideLength * 2 - frontLength;
        const spacing = 80;
        const startX = canvasWidth / 2 - (sideLength - 1) * spacing / 2;
        const startY = 80;
        let seatIndex = 0;
        // 앞쪽 좌석 (하단 중앙)
        for (let i = 0; i < frontLength && seatIndex < totalSeats; i++) {
            seats.push(SeatModel.create({
                x: startX + i * spacing,
                y: startY + sideLength * spacing
            }));
            seatIndex++;
        }
        // 오른쪽 측면
        for (let i = 0; i < sideLength && seatIndex < totalSeats; i++) {
            seats.push(SeatModel.create({
                x: startX + (sideLength - 1) * spacing,
                y: startY + i * spacing
            }));
            seatIndex++;
        }
        // 왼쪽 측면
        for (let i = 0; i < sideLength && seatIndex < totalSeats; i++) {
            seats.push(SeatModel.create({
                x: startX,
                y: startY + (sideLength - 1 - i) * spacing
            }));
            seatIndex++;
        }
        // 뒤쪽 좌석
        for (let i = 0; i < backLength && seatIndex < totalSeats; i++) {
            seats.push(SeatModel.create({
                x: startX - i * spacing,
                y: startY
            }));
            seatIndex++;
        }
        return seats;
    }
    /**
     * 특정 배치 유형에 맞는 좌석 배열을 생성합니다.
     * @param layoutType 배치 유형
     * @param totalSeats 전체 좌석 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @param partitionCount 분단 수
     * @returns 배치 결과
     */
    static createLayout(layoutType, totalSeats, canvasWidth = 800, canvasHeight = 600, partitionCount = 1) {
        try {
            let seats;
            switch (layoutType) {
                case LayoutType.SINGLE_UNIFORM:
                    seats = this.createSingleUniformLayout(totalSeats, canvasWidth, canvasHeight, partitionCount);
                    break;
                case LayoutType.PAIR_UNIFORM:
                    seats = this.createPairUniformLayout(totalSeats, canvasWidth, canvasHeight, partitionCount);
                    break;
                case LayoutType.GROUP:
                    seats = this.createGroupLayout(totalSeats, 4, canvasWidth, canvasHeight);
                    break;
                case LayoutType.GROUP_4:
                    seats = this.createGroupLayout(totalSeats, 4, canvasWidth, canvasHeight);
                    break;
                case LayoutType.GROUP_6:
                    seats = this.createGroupLayout(totalSeats, 6, canvasWidth, canvasHeight);
                    break;
                case LayoutType.USHAPE:
                    seats = this.createUShapeLayout(totalSeats, canvasWidth);
                    break;
                case LayoutType.CUSTOM:
                    // 사용자 임의 구성은 빈 배열 반환
                    seats = [];
                    break;
                default:
                    return {
                        seats: [],
                        success: false,
                        errorMessage: '알 수 없는 배치 유형입니다.'
                    };
            }
            return {
                seats,
                success: true
            };
        }
        catch (error) {
            return {
                seats: [],
                success: false,
                errorMessage: error instanceof Error ? error.message : '배치 생성 중 오류가 발생했습니다.'
            };
        }
    }
}
//# sourceMappingURL=LayoutService.js.map