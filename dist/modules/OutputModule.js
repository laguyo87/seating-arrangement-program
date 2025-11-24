/**
 * 결과 출력 모듈
 * 배치 결과 표시 및 내보내기 기능 담당
 */
/**
 * 출력 모듈
 */
export class OutputModule {
    constructor(containerId) {
        this.ariaLiveRegion = null;
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        this.container = container;
        // ARIA live region 초기화
        this.ariaLiveRegion = document.getElementById('aria-live-region');
        if (!this.ariaLiveRegion) {
            // aria-live region이 없으면 생성
            this.ariaLiveRegion = document.createElement('div');
            this.ariaLiveRegion.id = 'aria-live-region';
            this.ariaLiveRegion.setAttribute('aria-live', 'polite');
            this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
            this.ariaLiveRegion.className = 'sr-only';
            this.container.insertBefore(this.ariaLiveRegion, this.container.firstChild);
        }
    }
    /**
     * 성공 메시지를 표시합니다.
     * @param message 메시지
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    /**
     * 에러 메시지를 표시합니다.
     * @param message 메시지
     */
    showError(message) {
        this.showMessage(message, 'error');
    }
    /**
     * 정보 메시지를 표시합니다.
     * @param message 메시지
     */
    showInfo(message) {
        this.showMessage(message, 'info');
    }
    /**
     * 메시지를 표시합니다.
     * @param message 메시지
     * @param type 메시지 타입
     */
    showMessage(message, type) {
        // 기존 메시지와 로딩 요소 제거 (card-layout-container는 보존)
        const existingMessage = this.container.querySelector('.output-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        const existingLoading = this.container.querySelector('.loading');
        if (existingLoading) {
            existingLoading.remove();
        }
        // 새 메시지 생성 (의미론적 태그 사용)
        const messageElement = document.createElement(type === 'error' ? 'div' : 'div');
        messageElement.className = `output-message ${type}`;
        messageElement.textContent = message;
        // ARIA 속성 추가 (스크린 리더 지원)
        messageElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
        messageElement.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        messageElement.setAttribute('aria-atomic', 'true');
        // 타입별 스타일
        messageElement.style.padding = '15px';
        messageElement.style.margin = '20px 0';
        messageElement.style.borderRadius = '5px';
        messageElement.style.fontWeight = 'bold';
        if (type === 'success') {
            // WCAG 2.1 AA 기준 충족: #155724 on #d4edda (대비율 4.8:1)
            messageElement.style.background = '#d4edda';
            messageElement.style.color = '#155724';
            messageElement.style.border = '1px solid #c3e6cb';
            messageElement.setAttribute('aria-label', `성공: ${message}`);
            // 아이콘 추가 (색상 외 시각적 구분)
            messageElement.innerHTML = `✅ <span>${message}</span>`;
        }
        else if (type === 'error') {
            // WCAG 2.1 AA 기준 충족: #721c24 on #f8d7da (대비율 5.2:1)
            messageElement.style.background = '#f8d7da';
            messageElement.style.color = '#721c24';
            messageElement.style.border = '1px solid #f5c6cb';
            messageElement.setAttribute('aria-label', `오류: ${message}`);
            // 아이콘 추가 (색상 외 시각적 구분)
            messageElement.innerHTML = `❌ <span>${message}</span>`;
        }
        else {
            // WCAG 2.1 AA 기준 충족: #0c5460 on #d1ecf1 (대비율 4.6:1)
            messageElement.style.background = '#d1ecf1';
            messageElement.style.color = '#0c5460';
            messageElement.style.border = '1px solid #bee5eb';
            messageElement.setAttribute('aria-label', `정보: ${message}`);
            // 아이콘 추가 (색상 외 시각적 구분)
            messageElement.innerHTML = `ℹ️ <span>${message}</span>`;
        }
        this.container.appendChild(messageElement);
        // 스크린 리더를 위한 aria-live 영역 업데이트
        if (this.ariaLiveRegion) {
            this.ariaLiveRegion.textContent = message;
            // 메시지가 업데이트되었음을 알리기 위해 잠시 후 초기화
            setTimeout(() => {
                if (this.ariaLiveRegion) {
                    this.ariaLiveRegion.textContent = '';
                }
            }, 1000);
        }
        // 5초 후 자동 제거 (에러는 클릭으로만 제거)
        if (type !== 'error') {
            setTimeout(() => {
                messageElement.remove();
            }, 5000);
        }
        else {
            messageElement.onclick = () => messageElement.remove();
            messageElement.setAttribute('tabindex', '0');
            messageElement.setAttribute('role', 'alert');
            messageElement.style.cursor = 'pointer';
        }
    }
    /**
     * 배치 통계를 표시합니다.
     * @param totalSeats 전체 좌석 수
     * @param assignedSeats 배정된 좌석 수
     * @param fixedSeats 고정 좌석 수
     */
    showStatistics(totalSeats, assignedSeats, fixedSeats) {
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
    exportAsText(seats) {
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
            if (!seat.isActive)
                continue;
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
    downloadFile(content, filename, mimeType = 'text/plain') {
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
    clear() {
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
     * 통계를 숨깁니다.
     */
    hideStatistics() {
        const statsElement = this.container.querySelector('.statistics');
        if (statsElement) {
            statsElement.remove();
        }
    }
    /**
     * 프로그레스 바를 표시합니다.
     * @param message 진행 상황 메시지
     * @param initialProgress 초기 진행률 (0-100)
     * @returns 프로그레스 바 업데이트 함수
     */
    showProgress(message, initialProgress = 0) {
        // 기존 프로그레스 바 제거
        const existingProgress = this.container.querySelector('.progress-container');
        if (existingProgress) {
            existingProgress.remove();
        }
        // 프로그레스 바 컨테이너 생성
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.style.cssText = `
            padding: 30px;
            background: white;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;
        // 메시지 영역
        const messageElement = document.createElement('div');
        messageElement.className = 'progress-message';
        messageElement.textContent = message;
        messageElement.style.cssText = `
            margin-bottom: 15px;
            font-size: 16px;
            font-weight: 500;
            color: #333;
        `;
        // 프로그레스 바 영역
        const progressBarWrapper = document.createElement('div');
        progressBarWrapper.style.cssText = `
            width: 100%;
            height: 24px;
            background: #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
        `;
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            width: ${Math.max(0, Math.min(100, initialProgress))}%;
            transition: width 0.3s ease;
            position: relative;
        `;
        // 진행률 텍스트
        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        progressText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12px;
            font-weight: 600;
            color: #333;
            z-index: 1;
        `;
        progressText.textContent = `${Math.round(initialProgress)}%`;
        // 상태 메시지 영역
        const statusElement = document.createElement('div');
        statusElement.className = 'progress-status';
        statusElement.style.cssText = `
            margin-top: 10px;
            font-size: 14px;
            color: #666;
            min-height: 20px;
        `;
        progressBarWrapper.appendChild(progressBar);
        progressBarWrapper.appendChild(progressText);
        progressContainer.appendChild(messageElement);
        progressContainer.appendChild(progressBarWrapper);
        progressContainer.appendChild(statusElement);
        // card-layout-container 앞에 프로그레스 바 추가
        const cardContainer = this.container.querySelector('#card-layout-container');
        if (cardContainer && cardContainer.parentNode) {
            cardContainer.parentNode.insertBefore(progressContainer, cardContainer);
        }
        else {
            this.container.appendChild(progressContainer);
        }
        // 프로그레스 바 업데이트 함수 반환
        return (progress, statusMessage) => {
            const clampedProgress = Math.max(0, Math.min(100, progress));
            progressBar.style.width = `${clampedProgress}%`;
            progressText.textContent = `${Math.round(clampedProgress)}%`;
            // ARIA 속성 업데이트
            progressContainer.setAttribute('aria-valuenow', clampedProgress.toString());
            if (statusMessage) {
                statusElement.textContent = statusMessage;
                progressContainer.setAttribute('aria-label', `${message}: ${statusMessage}`);
            }
            // 스크린 리더를 위한 업데이트
            if (this.ariaLiveRegion && statusMessage) {
                this.ariaLiveRegion.textContent = `${message}: ${statusMessage} (${Math.round(clampedProgress)}%)`;
            }
        };
    }
    /**
     * 프로그레스 바를 숨깁니다.
     */
    hideProgress() {
        const progressContainer = this.container.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.remove();
        }
    }
    /**
     * 로딩 인디케이터를 표시합니다 (프로그레스 바 없이).
     * @param message 로딩 메시지
     */
    showLoading(message = '자리 배치를 생성하는 중...') {
        // 기존 메시지와 로딩 요소만 제거 (card-layout-container는 보존)
        const existingMessage = this.container.querySelector('.output-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        const existingLoading = this.container.querySelector('.loading');
        if (existingLoading) {
            existingLoading.remove();
        }
        const existingProgress = this.container.querySelector('.progress-container');
        if (existingProgress) {
            existingProgress.remove();
        }
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading';
        loadingElement.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 20px; color: #666;">${message}</p>
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
        }
        else {
            // card-layout-container가 없으면 컨테이너에 직접 추가
            this.container.appendChild(loadingElement);
        }
    }
}
//# sourceMappingURL=OutputModule.js.map