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
    console.log('교실 자리 배치 프로그램 초기화 중...');
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
        console.log('교실 자리 배치 프로그램이 성공적으로 시작되었습니다.');
    }
    catch (error) {
        console.error('프로그램 시작 중 오류 발생:', error);
        alert('프로그램을 시작할 수 없습니다. 콘솔을 확인해주세요.');
    }
}
// 프로그램 시작
init();
// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    console.error('전역 오류 발생:', event.error);
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('처리되지 않은 Promise 거부:', event.reason);
});
//# sourceMappingURL=main.js.map