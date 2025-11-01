/**
 * 방문자 수 카운터
 * localStorage를 사용하여 방문 횟수를 추적하고 표시합니다.
 */

(function() {
    'use strict';

    // 방문자 수를 저장할 키
    const VISITOR_COUNT_KEY = 'seating_arrangement_visitor_count';
    const LAST_VISIT_KEY = 'seating_arrangement_last_visit';

    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
     */
    function getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 방문자 수 업데이트
     */
    function updateVisitorCount() {
        try {
            // 요소를 찾을 때까지 재시도
            const visitorNumberElement = document.getElementById('visitor-number');
            if (!visitorNumberElement) {
                console.warn('visitor-number 요소를 찾을 수 없습니다. 재시도 중...');
                setTimeout(updateVisitorCount, 100);
                return;
            }

            // localStorage 사용 가능 여부 확인
            if (typeof(Storage) === 'undefined') {
                console.warn('localStorage를 사용할 수 없습니다.');
                visitorNumberElement.textContent = '?';
                return;
            }

            const today = getTodayString();
            const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
            
            let visitorCount = parseInt(localStorage.getItem(VISITOR_COUNT_KEY) || '0', 10);
            
            // 오늘 첫 방문인 경우에만 카운트 증가
            if (lastVisit !== today) {
                visitorCount++;
                try {
                    localStorage.setItem(VISITOR_COUNT_KEY, visitorCount.toString());
                    localStorage.setItem(LAST_VISIT_KEY, today);
                    console.log(`새 방문자! 총 방문자 수: ${visitorCount}`);
                } catch (e) {
                    console.error('localStorage 저장 실패:', e);
                    // localStorage 저장 실패 시에도 현재 값을 표시
                }
            } else {
                console.log(`오늘 이미 방문함. 총 방문자 수: ${visitorCount}`);
            }
            
            // 화면에 표시
            // 숫자에 천 단위 구분 기호 추가
            visitorNumberElement.textContent = visitorCount.toLocaleString('ko-KR');
            
            console.log(`방문자 수 업데이트 완료: ${visitorCount.toLocaleString('ko-KR')}명`);
        } catch (error) {
            console.error('방문자 수 업데이트 중 오류:', error);
            const visitorNumberElement = document.getElementById('visitor-number');
            if (visitorNumberElement) {
                visitorNumberElement.textContent = '?';
            }
        }
    }

    /**
     * 초기화
     */
    function init() {
        // DOM이 완전히 로드된 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                // 약간의 지연을 두어 요소가 완전히 렌더링될 때까지 대기
                setTimeout(updateVisitorCount, 50);
            });
        } else {
            // 이미 로드된 경우에도 약간의 지연을 두어 안전하게 처리
            setTimeout(updateVisitorCount, 50);
        }
    }

    // 초기화 실행
    init();
})();

