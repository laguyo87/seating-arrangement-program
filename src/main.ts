/**
 * 교실 자리 배치 프로그램 - 메인 엔트리 포인트
 * 
 * 이 파일은 전체 프로그램의 시작점입니다.
 * MainController를 초기화하고 프로그램을 실행합니다.
 * 
 * 사용 방법:
 * 1. 학생 인원수를 입력하고 설정합니다.
 * 2. 명렬표를 입력합니다 (이름, 성별).
 * 3. 좌석 배치 옵션을 선택합니다 (1열/2열).
 * 4. 기본 배치 유형을 선택합니다.
 * 5. 필요시 고급 옵션을 설정합니다.
 * 6. 자리 배치를 생성합니다.
 */

import { MainController } from './controllers/MainController.js';
import { logger } from './utils/logger.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { ErrorCode } from './types/errors.js';

/**
 * 프로그램 초기화 및 실행
 */
function init(): void {
    
    
    // DOM이 로드될 때까지 대기
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            startApplication();
        });
    } else {
        startApplication();
    }
}

/**
 * 애플리케이션 시작
 */
function startApplication(): void {
    try {
        const controller = new MainController();
        controller.run();
        
        // 디버깅을 위해 전역 변수로 노출 (개발 모드에서만)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            (window as any).mainController = controller;
            console.log('💡 디버깅: MainController가 window.mainController로 노출되었습니다.');
            console.log('💡 Firebase 저장 상태 확인: checkFirebaseStorage() 실행');
        }
        
    } catch (error) {
        const userMessage = ErrorHandler.safeHandle(error, ErrorCode.INITIALIZATION_FAILED);
        alert(userMessage);
    }
}

// 프로그램 시작
init();

/**
 * 전역 오류를 사용자에게 알리는 배너
 *
 * 전역 핸들러가 콘솔에만 기록하면, 배포 빌드에서는 앱이 반쯤 망가진 상태가 되어도
 * 화면에는 아무 표시가 없다. 교사는 무엇이 잘못됐는지 알 방법이 없다.
 */
function showGlobalErrorBanner(message: string): void {
    try {
        const existing = document.getElementById('global-error-banner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'global-error-banner';
        banner.setAttribute('role', 'alert');
        banner.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
            'padding:12px 16px', 'background:#f8d7da', 'color:#721c24',
            'border-bottom:1px solid #f5c6cb', 'font-size:14px', 'line-height:1.5',
            'display:flex', 'align-items:center', 'gap:12px'
        ].join(';');

        const text = document.createElement('span');
        text.style.flex = '1';
        text.textContent = message;
        banner.appendChild(text);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '닫기';
        closeBtn.setAttribute('aria-label', '오류 알림 닫기');
        closeBtn.style.cssText = 'padding:4px 12px;cursor:pointer;border:1px solid #721c24;background:transparent;color:#721c24;border-radius:4px;';
        closeBtn.addEventListener('click', () => banner.remove());
        banner.appendChild(closeBtn);

        document.body.appendChild(banner);
    } catch {
        // 배너조차 표시할 수 없는 상태라면 더 할 수 있는 일이 없다
    }
}

// 콘솔 경고 필터링 (Firebase 인증 관련 경고 무시)
const originalWarn = console.warn;
console.warn = function(...args: any[]) {
    const message = args.join(' ');
    // Firebase 인증 관련 Cross-Origin-Opener-Policy 경고는 무시 (기능에 영향 없음)
    // 'window.close'만으로 거르면 무관한 경고까지 함께 사라지므로 COOP 경고에 한정한다
    if (message.includes('Cross-Origin-Opener-Policy')) {
        return;
    }
    originalWarn.apply(console, args);
};

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    // 브라우저 확장 프로그램 에러는 무시
    if (event.filename && (
        event.filename.includes('content.js') || 
        event.filename.includes('content_script.js') ||
        event.filename.includes('extension') ||
        event.filename.includes('chrome-extension://') ||
        event.filename.includes('moz-extension://')
    )) {
        return;
    }
    
    // 에러 메시지에서도 확장 프로그램 관련 에러 필터링
    const errorMessage = event.message || event.error?.message || '';
    if (errorMessage.includes('content_script') || 
        errorMessage.includes('shouldOfferCompletionListForField') ||
        errorMessage.includes('elementWasFocused') ||
        errorMessage.includes('processInputEvent')) {
        return;
    }
    
    // Firebase 인증 관련 Cross-Origin-Opener-Policy 경고는 무시 (기능에 영향 없음)
    if (errorMessage.includes('Cross-Origin-Opener-Policy') || errorMessage.includes('window.close')) {
        return;
    }
    
    logger.error('전역 오류 발생:', event.error);
    showGlobalErrorBanner('오류가 발생하여 일부 기능이 정상 동작하지 않을 수 있습니다. 저장되지 않은 작업이 있다면 페이지를 새로고침하기 전에 확인해주세요.');
});

window.addEventListener('unhandledrejection', (event) => {
    // 메시지 포트 관련 에러는 브라우저 확장 프로그램에서 발생하는 것으로 무시
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    if (errorMessage.includes('message port') || 
        errorMessage.includes('chrome-extension') ||
        errorMessage.includes('content_script') ||
        errorMessage.includes('shouldOfferCompletionListForField') ||
        errorMessage.includes('elementWasFocused') ||
        errorMessage.includes('processInputEvent') ||
        errorMessage.includes('Cannot read properties of undefined (reading \'control\')')) {
        event.preventDefault(); // 기본 에러 처리 방지
        return;
    }
    logger.error('처리되지 않은 Promise 거부:', event.reason);
    showGlobalErrorBanner('작업 처리 중 오류가 발생했습니다. 최근 작업이 저장되지 않았을 수 있으니 확인해주세요.');
    event.preventDefault(); // 에러가 콘솔에 표시되지 않도록
});

