/**
 * 좌석 배치 알고리즘 서비스
 */
import { Seat, LayoutType } from '../models/Seat.js';
/**
 * 배치 결과
 */
export interface LayoutResult {
    /** 배치된 좌석 배열 */
    seats: Seat[];
    /** 성공 여부 */
    success: boolean;
    /** 에러 메시지 (실패시) */
    errorMessage?: string;
}
/**
 * 배치 알고리즘을 담당하는 서비스
 */
export declare class LayoutService {
    /**
     * 1열 균등 배치를 생성합니다.
     * 학생 총 인원수를 분단 수로 나눈 숫자만큼의 좌석을 일렬로 균등하게 배치
     * @param totalSeats 전체 좌석 수
     * @param partitionCount 분단 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @returns 배치된 좌석 배열
     */
    static createSingleUniformLayout(totalSeats: number, canvasWidth?: number, canvasHeight?: number, partitionCount?: number): Seat[];
    /**
     * 2열 균등 배치(짝꿍 책상)를 생성합니다.
     * 두 명의 좌석을 나란히 붙여서 배치하고, 분단 수만큼 나누어서 배치
     * @param totalSeats 전체 좌석 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @param partitionCount 분단 수
     * @returns 배치된 좌석 배열
     */
    static createPairUniformLayout(totalSeats: number, canvasWidth?: number, canvasHeight?: number, partitionCount?: number): Seat[];
    /**
     * 모둠 배치를 생성합니다.
     * @param totalSeats 전체 좌석 수
     * @param groupSize 모둠 크기 (기본값: 4)
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @returns 배치된 좌석 배열
     */
    static createGroupLayout(totalSeats: number, groupSize?: number, canvasWidth?: number, canvasHeight?: number): Seat[];
    /**
     * ㄷ자 배치를 생성합니다.
     * @param totalSeats 전체 좌석 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @returns 배치된 좌석 배열
     */
    static createUShapeLayout(totalSeats: number, canvasWidth?: number): Seat[];
    /**
     * 특정 배치 유형에 맞는 좌석 배열을 생성합니다.
     * @param layoutType 배치 유형
     * @param totalSeats 전체 좌석 수
     * @param canvasWidth 캔버스 너비
     * @param canvasHeight 캔버스 높이
     * @param partitionCount 분단 수
     * @returns 배치 결과
     */
    static createLayout(layoutType: LayoutType, totalSeats: number, canvasWidth?: number, canvasHeight?: number, partitionCount?: number): LayoutResult;
}
//# sourceMappingURL=LayoutService.d.ts.map