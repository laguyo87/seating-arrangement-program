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

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    // 브라우저 확장 프로그램 에러는 무시
    if (event.filename && (event.filename.includes('content.js') || event.filename.includes('extension'))) {
        return;
    }
    logger.error('전역 오류 발생:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    // 메시지 포트 관련 에러는 브라우저 확장 프로그램에서 발생하는 것으로 무시
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    if (errorMessage.includes('message port') || errorMessage.includes('chrome-extension')) {
        event.preventDefault(); // 기본 에러 처리 방지
        return;
    }
    logger.error('처리되지 않은 Promise 거부:', event.reason);
    event.preventDefault(); // 에러가 콘솔에 표시되지 않도록
});

