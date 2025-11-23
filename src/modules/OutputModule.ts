/**
 * 결과 출력 모듈
 * 배치 결과 표시 및 내보내기 기능 담당
 */

/**
 * 출력 모듈
 */
export class OutputModule {
    private container: HTMLElement;

    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        this.container = container;
    }

    /**
     * 성공 메시지를 표시합니다.
     * @param message 메시지
     */
    public showSuccess(message: string): void {
        this.showMessage(message, 'success');
    }

    /**
     * 에러 메시지를 표시합니다.
     * @param message 메시지
     */
    public showError(message: string): void {
        this.showMessage(message, 'error');
    }

    /**
     * 정보 메시지를 표시합니다.
     * @param message 메시지
     */
    public showInfo(message: string): void {
        this.showMessage(message, 'info');
    }

    /**
     * 메시지를 표시합니다.
     * @param message 메시지
     * @param type 메시지 타입
     */
    private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
        // 기존 메시지와 로딩 요소 제거 (card-layout-container는 보존)
        const existingMessage = this.container.querySelector('.output-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        const existingLoading = this.container.querySelector('.loading');
        if (existingLoading) {
            existingLoading.remove();
        }

        // 새 메시지 생성
        const messageElement = document.createElement('div');
        messageElement.className = `output-message ${type}`;
        messageElement.textContent = message;
        
        // 타입별 스타일
        messageElement.style.padding = '15px';
        messageElement.style.margin = '20px 0';
        messageElement.style.borderRadius = '5px';
        messageElement.style.fontWeight = 'bold';
        
        if (type === 'success') {
            messageElement.style.background = '#d4edda';
            messageElement.style.color = '#155724';
            messageElement.style.border = '1px solid #c3e6cb';
        } else if (type === 'error') {
            messageElement.style.background = '#f8d7da';
            messageElement.style.color = '#721c24';
            messageElement.style.border = '1px solid #f5c6cb';
        } else {
            messageElement.style.background = '#d1ecf1';
            messageElement.style.color = '#0c5460';
            messageElement.style.border = '1px solid #bee5eb';
        }
        
        this.container.appendChild(messageElement);
        
        // 5초 후 자동 제거 (에러는 클릭으로만 제거)
        if (type !== 'error') {
            setTimeout(() => {
                messageElement.remove();
            }, 5000);
        } else {
            messageElement.onclick = () => messageElement.remove();
        }
    }

    /**
     * 배치 통계를 표시합니다.
     * @param totalSeats 전체 좌석 수
     * @param assignedSeats 배정된 좌석 수
     * @param fixedSeats 고정 좌석 수
     */
    public showStatistics(totalSeats: number, assignedSeats: number, fixedSeats: number): void {
        const statsElement = document.createElement('div');
        statsElement.className = 'statistics';
        statsElement.innerHTML = `
            <h3>배치 통계</h3>
            <ul>
                <li>전체 좌석: ${totalSeats}개</li>
                <li>배정된 좌석: ${assignedSeats}개</li>
                <li>고정 좌석: ${fixedSeats}개</li>
                <li>비어있는 좌석: ${totalSeats - assignedSeats}개</li>
            </ul>
        `;
        
        statsElement.style.padding = '20px';
        statsElement.style.margin = '20px 0';
        statsElement.style.background = '#f8f9fa';
        statsElement.style.borderRadius = '5px';
        statsElement.style.border = '1px solid #dee2e6';
        
        // 기존 통계 제거
        const existingStats = this.container.querySelector('.statistics');
        if (existingStats) {
            existingStats.remove();
        }
        
        this.container.appendChild(statsElement);
    }

    /**
     * 배치 결과를 텍스트로 내보냅니다.
     * @param seats 좌석 배열
     * @returns 텍스트 결과
     */
    public exportAsText(seats: import('../models/Seat').Seat[]): string {
        const { SeatModel } = require('../models/Seat');
        const assignedSeats = SeatModel.getAssignedSeats(seats);
        
        let text = '=== 교실 자리 배치 결과 ===\n\n';
        
        // 배치 통계
        text += `전체 좌석: ${seats.length}개\n`;
        text += `배정된 좌석: ${assignedSeats.length}개\n`;
        text += `비어있는 좌석: ${seats.length - assignedSeats.length}개\n\n`;
        
        // 좌석별 배치 정보
        text += '좌석별 배치:\n';
        text += '-'.repeat(50) + '\n';
        
        for (const seat of seats) {
            if (!seat.isActive) continue;
            
            const status = seat.studentName || '(비어있음)';
            const fixed = seat.isFixed ? ' [고정]' : '';
            
            text += `좌석 #${seat.id}: ${status}${fixed}\n`;
        }
        
        return text;
    }

    /**
     * 배치 결과를 다운로드합니다.
     * @param content 파일 내용
     * @param filename 파일 이름
     * @param mimeType MIME 타입
     */
    public downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * 결과를 초기화합니다.
     */
    public clear(): void {
        // card-layout-container는 보존하고 메시지만 제거
        const cardContainer = this.container.querySelector('#card-layout-container');
        const studentTableContainer = this.container.querySelector('.student-table-container');
        
        // 메시지와 로딩 요소만 제거
        const messages = this.container.querySelectorAll('.output-message, .loading, .statistics');
        messages.forEach(msg => msg.remove());
        
        // card-layout-container와 student-table-container가 없으면 전체 초기화
        if (!cardContainer && !studentTableContainer) {
            this.container.innerHTML = '';
        }
    }

    /**
     * 로딩 인디케이터를 표시합니다.
     */
    public showLoading(): void {
        // 기존 메시지와 로딩 요소만 제거 (card-layout-container는 보존)
        const existingMessage = this.container.querySelector('.output-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        const existingLoading = this.container.querySelector('.loading');
        if (existingLoading) {
            existingLoading.remove();
        }
        
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading';
        loadingElement.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 20px; color: #666;">자리 배치를 생성하는 중...</p>
            </div>
        `;
        
        // CSS 애니메이션 추가 (한 번만)
        if (!document.querySelector('#loadingStyle')) {
            const style = document.createElement('style');
            style.id = 'loadingStyle';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // card-layout-container 앞에 로딩 요소 추가
        const cardContainer = this.container.querySelector('#card-layout-container');
        if (cardContainer && cardContainer.parentNode) {
            cardContainer.parentNode.insertBefore(loadingElement, cardContainer);
        } else {
            // card-layout-container가 없으면 컨테이너에 직접 추가
            this.container.appendChild(loadingElement);
        }
    }

    /**
     * 통계를 숨깁니다.
     */
    public hideStatistics(): void {
        const statsElement = this.container.querySelector('.statistics');
        if (statsElement) {
            statsElement.remove();
        }
    }
}

