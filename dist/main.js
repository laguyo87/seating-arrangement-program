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
/**
 * 프로그램 초기화 및 실행
 */
function init() {
    // DOM이 로드될 때까지 대기
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            startApplication();
        });
    }
    else {
        startApplication();
    }
}
/**
 * 애플리케이션 시작
 */
function startApplication() {
    try {
        const controller = new MainController();
        controller.run();
    }
    catch (error) {
        console.error('프로그램 시작 중 오류 발생:', error);
        // DOM에 에러 메시지 표시
        showErrorInDOM('프로그램을 시작할 수 없습니다. 콘솔을 확인해주세요.');
    }
}
/**
 * DOM에 에러 메시지를 표시합니다.
 */
function showErrorInDOM(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 5px;
        border: 1px solid #f5c6cb;
        font-weight: bold;
        z-index: 10000;
        max-width: 90%;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'assertive');
    document.body.appendChild(errorDiv);
    // 10초 후 자동 제거 또는 클릭으로 제거
    errorDiv.onclick = () => errorDiv.remove();
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}
// 프로그램 시작
init();
// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    // 브라우저 확장 프로그램 에러는 무시
    if (event.filename && (event.filename.includes('content.js') || event.filename.includes('extension'))) {
        return;
    }
    console.error('전역 오류 발생:', event.error);
});
window.addEventListener('unhandledrejection', (event) => {
    // 메시지 포트 관련 에러는 브라우저 확장 프로그램에서 발생하는 것으로 무시
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    if (errorMessage.includes('message port') || errorMessage.includes('chrome-extension')) {
        event.preventDefault(); // 기본 에러 처리 방지
        return;
    }
    console.error('처리되지 않은 Promise 거부:', event.reason);
    event.preventDefault(); // 에러가 콘솔에 표시되지 않도록
});
//# sourceMappingURL=main.js.map