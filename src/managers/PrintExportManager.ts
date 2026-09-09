/**
 * 인쇄 및 내보내기 관리자
 * 자리 배치도 인쇄, 텍스트 내보내기, 이미지 내보내기 등 담당
 */

import { OutputModule } from '../modules/OutputModule.js';
import { Seat } from '../models/Seat.js';
import { logger } from '../utils/logger.js';
import { CustomLayoutService, SeatPosition } from '../services/CustomLayoutService.js';

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
export class PrintExportManager {
    /** 화면에 보이는 좌석 카드 한 변의 크기(px) */
    private static readonly SCREEN_CARD_SIZE = 120;
    /** 인쇄물의 좌석 카드 한 변의 크기(px) */
    private static readonly PRINT_CARD_SIZE = 60;

    private deps: PrintExportManagerDependencies;

    constructor(dependencies: PrintExportManagerDependencies) {
        this.deps = dependencies;
    }

    /**
     * 자리 배치도 인쇄 처리
     */
    /**
     * 인쇄용 좌석 영역 HTML과 덧붙일 스타일을 만든다.
     *
     * 사용자 구성 배치는 카드가 좌표(left/top)로 놓이기 때문에
     * 인쇄 템플릿의 `.seats-area { display: grid }` 로는 배치가 재현되지 않는다.
     * 교사가 만든 교실 모양 그대로 인쇄되어야 하므로 좌표를 그대로 옮기되,
     * 인쇄용 카드가 화면의 절반 크기이므로 좌표도 같은 비율로 줄인다.
     */
    private buildSeatsAreaMarkup(seatsArea: HTMLElement): { html: string; extraStyle: string } {
        if (!seatsArea.classList.contains('custom-layout')) {
            return { html: seatsArea.innerHTML, extraStyle: '' };
        }

        const scale = PrintExportManager.PRINT_CARD_SIZE / PrintExportManager.SCREEN_CARD_SIZE;

        const originalCards = Array.from(seatsArea.querySelectorAll('.student-seat-card')) as HTMLElement[];
        const clone = seatsArea.cloneNode(true) as HTMLElement;

        // 드래그 중에만 쓰는 안내선은 인쇄물에 나오면 안 된다
        clone.querySelectorAll('.desk-guide').forEach(guide => guide.remove());

        const clonedCards = Array.from(clone.querySelectorAll('.student-seat-card')) as HTMLElement[];

        const rawPositions: SeatPosition[] = originalCards.map((card, index) => ({
            seatId: index + 1,
            x: parseFloat(card.style.left || '0') || 0,
            y: parseFloat(card.style.top || '0') || 0
        }));

        // 화면 한쪽에 몰아 둔 배치라면 반대편 여백이 인쇄물에 그대로 남는다.
        // 모양은 유지한 채 원점으로 당겨 여백만 걷어낸다.
        const positions = CustomLayoutService.normalizeToOrigin(rawPositions);

        positions.forEach((position, index) => {
            const target = clonedCards[index];
            if (target) {
                target.style.left = `${Math.round(position.x * scale)}px`;
                target.style.top = `${Math.round(position.y * scale)}px`;
            }
        });

        const bounds = CustomLayoutService.boundingSize(positions);
        const width = Math.max(1, Math.round(bounds.width * scale));
        const height = Math.max(1, Math.round(bounds.height * scale));

        const extraStyle = `
                        /* 사용자 구성 배치: 좌표로 놓인 책상을 그대로 인쇄한다.
                           좌석 영역 자체를 flex로 두고 그 안에 고정 크기 캔버스를 넣어 가운데 정렬한다.
                           부모(.classroom-layout)를 건드리면 스스로 가운데 정렬하는 칠판이 함께 밀린다. */
                        .seats-area {
                            display: block !important;
                            grid-template-columns: none !important;
                            margin-top: 10px !important;
                        }
                        .custom-layout-canvas {
                            position: relative !important;
                            display: block !important;
                            width: ${width}px !important;
                            height: ${height}px !important;
                            margin: 0 auto !important;
                            /* 교탁용 템플릿은 '.seats-area > div(카드가 아닌 것)'을 180도 돌린다.
                               이 캔버스가 거기 걸리면 좌석 블록이 두 번 회전해
                               이름과 번호가 거꾸로 인쇄된다. */
                            transform: none !important;
                        }
                        .custom-layout-canvas .student-seat-card {
                            position: absolute !important;
                            width: ${PrintExportManager.PRINT_CARD_SIZE}px !important;
                            min-width: ${PrintExportManager.PRINT_CARD_SIZE}px !important;
                            height: ${PrintExportManager.PRINT_CARD_SIZE}px !important;
                            margin: 0 !important;
                        }
                        @media print {
                            /* 인쇄 전용 규칙이 좌석 영역을 다시 그리드로 되돌리지 못하게 한다 */
                            .seats-area {
                                display: block !important;
                                grid-template-columns: none !important;
                            }
                            .custom-layout-canvas {
                                margin: 0 auto !important;
                                transform: none !important;
                            }
                        }`;

        // 카드를 고정 크기 캔버스로 감싸면, 좌석 영역이 그 캔버스를 가운데 놓기만 하면 된다
        const html = `<div class="custom-layout-canvas">${clone.innerHTML}</div>`;

        return { html, extraStyle };
    }

    public printLayout(): void {
        try {
            // 인쇄용 스타일이 포함된 새 창 열기
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                this.deps.outputModule.showError('팝업이 차단되었습니다. 팝업을 허용해주세요.');
                return;
            }

            // 현재 자리 배치도 영역 가져오기
            const seatsArea = document.getElementById('seats-area');
            const classroomLayout = document.getElementById('classroom-layout');
            
            if (!seatsArea || !classroomLayout) {
                this.deps.outputModule.showError('인쇄할 자리 배치도를 찾을 수 없습니다.');
                return;
            }

            // 현재 그리드 설정 가져오기
            const currentGridTemplateColumns = seatsArea.style.gridTemplateColumns;
            
            // 현재 화면의 실제 HTML 구조를 그대로 사용
            const { html: seatsAreaHtml, extraStyle: customLayoutStyle } = this.buildSeatsAreaMarkup(seatsArea);

            // 현재 날짜와 시간
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            // 인쇄용 HTML 생성
            const printContent = `
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>자리 배치도 - ${dateString}</title>
                    <style>
                        body {
                            font-family: 'Malgun Gothic', sans-serif;
                            margin: 0;
                            padding: 10px;
                            background: white;
                            font-size: 12px;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 15px;
                            border-bottom: 1px solid #333;
                            padding-bottom: 8px;
                        }
                        .print-title {
                            font-size: 18px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .print-date {
                            font-size: 11px;
                            color: #666;
                        }
                        .classroom-layout {
                            background: #f8f9fa;
                            border: 1px dashed #ddd;
                            border-radius: 5px;
                            padding: 10px;
                            margin: 10px 0;
                        }
                        .blackboard-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 200px;
                            height: 50px;
                            background: #2c3e50;
                            border: 2px solid #1a252f;
                            border-radius: 3px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                            margin-bottom: 10px;
                        }
                        .seats-area {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            margin-top: 10px;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                        }
                        .student-seat-card {
                            min-width: 60px;
                            height: 60px;
                            background: white;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 5px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }
                        .student-seat-card.gender-m {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                        }
                        .student-seat-card.gender-f {
                            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
                        }
                        .student-name {
                            text-align: center;
                            font-size: 20px;
                            font-weight: bold;
                            color: #333;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            width: 100%;
                            line-height: 1;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        .seat-group-container {
                            display: grid !important;
                            gap: 0 !important;
                            border: 3px solid #667eea !important;
                            border-radius: 12px !important;
                            padding: 5px !important;
                            background: #f8f9fa !important;
                            width: fit-content !important;
                            min-width: 200px !important;
                            box-sizing: border-box !important;
                            position: relative !important;
                            overflow: visible !important;
                        }
                        .seat-group-container > * {
                            position: relative !important;
                            z-index: 1 !important;
                        }
                        .seat-group-container .student-seat-card {
                            width: 100% !important;
                            height: 100% !important;
                            min-width: 0 !important;
                            max-width: none !important;
                            margin: 0 !important;
                            border-radius: 0 !important;
                            box-sizing: border-box !important;
                            position: relative !important;
                            overflow: hidden !important;
                        }
                        .seats-area > div[style*="flex-direction: column"] {
                            display: flex !important;
                            flex-direction: column !important;
                            align-items: center !important;
                            gap: 10px !important;
                            width: 100% !important;
                        }
                        .partition-label {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                        }
                        .labels-row {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                            margin-bottom: 5px;
                        }
                        .labels-row > div {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                        }
                        @media print {
                            body { 
                                margin: 0; 
                                padding: 5px;
                                font-size: 10px;
                            }
                            .print-header { 
                                page-break-after: avoid; 
                                margin-bottom: 10px;
                            }
                            .classroom-layout { 
                                page-break-inside: avoid; 
                                margin: 5px 0;
                                padding: 5px;
                            }
                            .seats-area {
                                gap: 3px 15px !important;
                            }
                            .student-seat-card {
                                min-width: 50px;
                                height: 50px;
                                padding: 3px;
                            }
                            .student-name {
                                font-size: 18px;
                            }
                            .seat-group-container {
                                display: grid !important;
                                gap: 0 !important;
                                border: 3px solid #667eea !important;
                                border-radius: 12px !important;
                                padding: 3px !important;
                                background: #f8f9fa !important;
                                width: fit-content !important;
                                min-width: 180px !important;
                                box-sizing: border-box !important;
                                position: relative !important;
                                overflow: visible !important;
                            }
                            .seat-group-container > * {
                                position: relative !important;
                                z-index: 1 !important;
                            }
                            .seat-group-container .student-seat-card {
                                width: 100% !important;
                                height: 100% !important;
                                min-width: 0 !important;
                                max-width: none !important;
                                margin: 0 !important;
                                border-radius: 0 !important;
                                box-sizing: border-box !important;
                                min-width: 40px !important;
                                height: 40px !important;
                                padding: 2px !important;
                                position: relative !important;
                                overflow: hidden !important;
                                flex-shrink: 0 !important;
                            }
                            .seat-group-container[style*="grid-template-columns"],
                            .seat-group-container[style*="grid-template-rows"] {
                                display: grid !important;
                            }
                            .seats-area > div[style*="flex-direction: column"] {
                                display: flex !important;
                                flex-direction: column !important;
                                align-items: center !important;
                                gap: 8px !important;
                                width: 100% !important;
                            }
                        }
${customLayoutStyle}
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <div class="print-title">교실 자리 배치도</div>
                        <div class="print-date">생성일시: ${dateString}</div>
                    </div>
                    
                    <div class="classroom-layout">
                        <div class="blackboard-area">📝 칠판</div>
                        <div class="seats-area">
                            ${seatsAreaHtml}
                        </div>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // 인쇄 대화상자 열기
            this.deps.setTimeoutSafe(() => {
                printWindow.print();
            }, 500);

        } catch (error) {
            logger.error('인쇄 중 오류:', error);
            this.deps.outputModule.showError('인쇄 중 오류가 발생했습니다.');
        }
    }

    /**
     * 교탁용 자리 배치도 인쇄 처리 (180도 회전)
     */
    public printLayoutForTeacher(): void {
        try {
            // 인쇄용 스타일이 포함된 새 창 열기
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                this.deps.outputModule.showError('팝업이 차단되었습니다. 팝업을 허용해주세요.');
                return;
            }

            // 현재 자리 배치도 영역 가져오기
            const seatsArea = document.getElementById('seats-area');
            const classroomLayout = document.getElementById('classroom-layout');
            
            if (!seatsArea || !classroomLayout) {
                this.deps.outputModule.showError('인쇄할 자리 배치도를 찾을 수 없습니다.');
                return;
            }

            // 현재 그리드 설정 가져오기
            const currentGridTemplateColumns = seatsArea.style.gridTemplateColumns;
            
            // 현재 화면의 실제 HTML 구조를 그대로 사용
            const { html: seatsAreaHtml, extraStyle: customLayoutStyle } = this.buildSeatsAreaMarkup(seatsArea);

            // 현재 날짜와 시간
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            // 인쇄용 HTML 생성 (180도 회전)
            const printContent = `
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>교탁용 자리 배치도 - ${dateString}</title>
                    <style>
                        body {
                            font-family: 'Malgun Gothic', sans-serif;
                            margin: 0;
                            padding: 10px;
                            background: white;
                            font-size: 12px;
                        }
                        .print-container {
                            transform: rotate(180deg);
                            transform-origin: center center;
                            width: 100%;
                            min-height: 100vh;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 15px;
                            border-bottom: 1px solid #333;
                            padding-bottom: 8px;
                        }
                        .print-title {
                            font-size: 18px;
                            font-weight: bold;
                            margin-bottom: 5px;
                            transform: rotate(180deg);
                        }
                        .print-date {
                            font-size: 11px;
                            color: #666;
                            transform: rotate(180deg);
                        }
                        .classroom-layout {
                            background: #f8f9fa;
                            border: 1px dashed #ddd;
                            border-radius: 5px;
                            padding: 10px;
                            margin: 10px 0;
                        }
                        .blackboard-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 200px;
                            height: 50px;
                            background: #2c3e50;
                            border: 2px solid #1a252f;
                            border-radius: 3px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                            margin-bottom: 10px;
                        }
                        .blackboard-area span {
                            transform: rotate(180deg);
                        }
                        .seats-area {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            margin-top: 10px;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                        }
                        .seats-area > div[style*="display: flex"],
                        .seats-area > div[style*="display:flex"],
                        .seats-area > div[style*="display: flex;"],
                        .seats-area > div[style*="display:flex;"] {
                            transform: none !important;
                        }
                        .student-seat-card {
                            min-width: 60px;
                            height: 60px;
                            background: white;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 5px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                            transform: none !important;
                        }
                        .student-seat-card.gender-m {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                        }
                        .student-seat-card.gender-f {
                            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
                        }
                        .student-seat-card .student-name,
                        .seats-area .student-seat-card .student-name,
                        div[style*="display: flex"] .student-seat-card .student-name,
                        div[style*="display:flex"] .student-seat-card .student-name {
                            text-align: center;
                            font-size: 20px;
                            font-weight: bold;
                            color: #333;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            width: 100%;
                            line-height: 1;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            transform: rotate(180deg) !important;
                        }
                        .partition-label {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                            transform: rotate(180deg) !important;
                        }
                        /* 좌석 번호도 되돌리지 않으면 뒤집힌 채로 인쇄된다 */
                        .seat-number-label {
                            transform: rotate(180deg) !important;
                        }
                        .labels-row {
                            display: grid;
                            gap: 5px 20px !important;
                            justify-content: center !important;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                            margin-bottom: 5px;
                        }
                        .labels-row > div {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 8px;
                            margin-bottom: 3px;
                            transform: rotate(180deg) !important;
                        }
                        .seats-area > div:not(.student-seat-card):not(.labels-row):not(.student-name):not([style*="display: flex"]):not([style*="display:flex"]) {
                            transform: rotate(180deg) !important;
                        }
                        @media print {
                            @page {
                                margin: 3mm;
                            }
                            body { 
                                margin: 0; 
                                padding: 0;
                                font-size: 9px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                            }
                            .print-container {
                                width: 100%;
                                min-height: auto;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                            }
                            .print-header { 
                                page-break-after: avoid; 
                                margin-bottom: 5px;
                                padding-bottom: 3px;
                                border-bottom-width: 1px;
                                width: 100%;
                            }
                            .print-title {
                                font-size: 14px;
                                margin-bottom: 2px;
                            }
                            .print-date {
                                font-size: 8px;
                            }
                            .classroom-layout { 
                                page-break-inside: avoid; 
                                margin: 0 auto;
                                padding: 3px;
                                width: fit-content;
                            }
                            .blackboard-area {
                                width: 160px;
                                height: 40px;
                                font-size: 10px;
                                margin-bottom: 5px;
                            }
                                width: 60px;
                                height: 20px;
                                font-size: 8px;
                                margin-bottom: 8px;
                            }
                            .seats-area {
                                display: grid !important;
                                gap: 2px 25px !important;
                                margin-top: 5px;
                                grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'} !important;
                            }
                            .seats-area > div[style*="display: flex"],
                            .seats-area > div[style*="display:flex"],
                            .seats-area > div[style*="display: flex;"],
                            .seats-area > div[style*="display:flex;"] {
                                transform: none !important;
                            }
                            .student-seat-card {
                                min-width: 45px;
                                height: 45px;
                                padding: 2px;
                                transform: none !important;
                            }
                            .student-seat-card .student-name,
                            .seats-area .student-seat-card .student-name,
                            div[style*="display: flex"] .student-seat-card .student-name,
                            div[style*="display:flex"] .student-seat-card .student-name {
                                font-size: 16px;
                                transform: rotate(180deg) !important;
                            }
                            .seats-area > div:not(.student-seat-card):not(.labels-row):not(.student-name):not([style*="display: flex"]):not([style*="display:flex"]) {
                                transform: rotate(180deg) !important;
                            }
                            .partition-label {
                                font-size: 7px;
                                margin-bottom: 2px;
                            }
                            .labels-row {
                                display: grid !important;
                                gap: 2px 25px !important;
                                margin-bottom: 3px;
                                grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'} !important;
                            }
                            .labels-row > div {
                                font-size: 7px;
                                margin-bottom: 2px;
                            }
                        }
${customLayoutStyle}
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="print-header">
                            <div class="print-title">교탁용 자리 배치도</div>
                            <div class="print-date">생성일시: ${dateString}</div>
                        </div>
                        <div class="classroom-layout">
                            <div class="blackboard-area"><span>📝 칠판</span></div>
                            <div class="seats-area">
                                ${seatsAreaHtml}
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // 인쇄 대화상자 열기
            this.deps.setTimeoutSafe(() => {
                printWindow.print();
            }, 500);

        } catch (error) {
            logger.error('교탁용 인쇄 중 오류:', error);
            this.deps.outputModule.showError('교탁용 인쇄 중 오류가 발생했습니다.');
        }
    }

    /**
     * 결과 내보내기 처리 (텍스트 파일로 다운로드)
     */
    public exportAsText(): void {
        const seats = this.deps.getSeats();
        
        if (seats.length === 0) {
            this.deps.outputModule.showError('내보낼 배치 결과가 없습니다.');
            return;
        }

        try {
            // 텍스트로 내보내기
            const textContent = this.deps.outputModule.exportAsText(seats);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.deps.outputModule.downloadFile(textContent, `seating-arrangement-${timestamp}.txt`);

            this.deps.outputModule.showSuccess('결과가 다운로드되었습니다.');
        } catch (error) {
            logger.error('내보내기 중 오류:', error);
            this.deps.outputModule.showError('내보내기 중 오류가 발생했습니다.');
        }
    }

    /**
     * 자리 배치도 HTML 파일로 저장
     */
    public saveLayoutAsHtml(): void {
        try {
            // 현재 자리 배치도 영역 가져오기
            const seatsArea = document.getElementById('seats-area');
            const classroomLayout = document.getElementById('classroom-layout');
            
            if (!seatsArea || !classroomLayout) {
                this.deps.outputModule.showError('저장할 자리 배치도를 찾을 수 없습니다.');
                return;
            }

            // 현재 그리드 설정 가져오기
            const currentGridTemplateColumns = seatsArea.style.gridTemplateColumns;
            
            // 현재 화면의 실제 HTML 구조를 그대로 사용
            const { html: seatsAreaHtml, extraStyle: customLayoutStyle } = this.buildSeatsAreaMarkup(seatsArea);

            // 현재 날짜와 시간
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/\./g, '-').replace(/\s/g, '_');

            // HTML 내용 생성
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>자리 배치도 - ${dateString}</title>
                    <style>
                        body {
                            font-family: 'Malgun Gothic', sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        .print-header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #333;
                            padding-bottom: 15px;
                        }
                        .print-title {
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }
                        .print-date {
                            font-size: 14px;
                            color: #666;
                        }
                        .classroom-layout {
                            background: #f8f9fa;
                            border: 2px dashed #ddd;
                            border-radius: 10px;
                            padding: 20px;
                            margin: 20px 0;
                        }
                        .blackboard-area {
                            position: relative;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 300px;
                            height: 80px;
                            background: #2c3e50;
                            border: 3px solid #1a252f;
                            border-radius: 5px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 18px;
                            margin-bottom: 20px;
                        }
                        .seats-area {
                            display: grid;
                            gap: 10px 40px !important;
                            justify-content: center !important;
                            margin-top: 20px;
                            grid-template-columns: ${currentGridTemplateColumns || 'repeat(6, 1fr)'};
                        }
                        .student-seat-card {
                            min-width: 120px;
                            height: 120px;
                            background: white;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            padding: 15px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        }
                        .student-seat-card.gender-m {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                        }
                        .student-seat-card.gender-f {
                            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
                        }
                        .student-name {
                            text-align: center;
                            font-size: 1.8em;
                            font-weight: bold;
                            color: #333;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            width: 100%;
                        }
                        .partition-label {
                            text-align: center;
                            font-weight: bold;
                            color: #667eea;
                            font-size: 0.9em;
                            margin-bottom: 5px;
                        }
${customLayoutStyle}
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <div class="print-title">교실 자리 배치도</div>
                        <div class="print-date">생성일시: ${dateString}</div>
                    </div>
                    
                    <div class="classroom-layout">
                        <div class="blackboard-area">📝 칠판</div>
                        <div class="seats-area">
                            ${seatsAreaHtml}
                        </div>
                    </div>
                </body>
                </html>
            `;

            // 파일명 생성
            const fileName = `자리배치도_${dateString}.html`;

            // Blob 생성 및 다운로드
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);

            this.deps.outputModule.showSuccess(`자리 배치도가 "${fileName}"으로 저장되었습니다.`);

        } catch (error) {
            logger.error('저장 중 오류:', error);
            this.deps.outputModule.showError('저장 중 오류가 발생했습니다.');
        }
    }
}


