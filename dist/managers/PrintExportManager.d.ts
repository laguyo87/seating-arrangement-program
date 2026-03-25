/**
 * 인쇄 및 내보내기 관리자
 * 자리 배치도 인쇄, 텍스트 내보내기, 이미지 내보내기 등 담당
 */
import { OutputModule } from '../modules/OutputModule.js';
import { Seat } from '../models/Seat.js';
/**
 * PrintExportManager가 필요로 하는 의존성 인터페이스
 */
export interface PrintExportManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    getSeats: () => Seat[];
}
/**
 * 인쇄 및 내보내기 관리자 클래스
 */
export declare class PrintExportManager {
    private deps;
    constructor(dependencies: PrintExportManagerDependencies);
    /**
     * 자리 배치도 인쇄 처리
     */
    printLayout(): void;
    /**
     * 교탁용 자리 배치도 인쇄 처리 (180도 회전)
     */
    printLayoutForTeacher(): void;
    /**
     * 결과 내보내기 처리 (텍스트 파일로 다운로드)
     */
    exportAsText(): void;
    /**
     * 자리 배치도 HTML 파일로 저장
     */
    saveLayoutAsHtml(): void;
}
//# sourceMappingURL=PrintExportManager.d.ts.map