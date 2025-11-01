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
            const today = getTodayString();
            const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
            
            let visitorCount = parseInt(localStorage.getItem(VISITOR_COUNT_KEY) || '0', 10);
            
            // 오늘 첫 방문인 경우에만 카운트 증가
            if (lastVisit !== today) {
                visitorCount++;
                localStorage.setItem(VISITOR_COUNT_KEY, visitorCount.toString());
                localStorage.setItem(LAST_VISIT_KEY, today);
            }
            
            // 화면에 표시
            const visitorNumberElement = document.getElementById('visitor-number');
            if (visitorNumberElement) {
                // 숫자에 천 단위 구분 기호 추가
                visitorNumberElement.textContent = visitorCount.toLocaleString('ko-KR');
            }
            
            console.log(`방문자 수: ${visitorCount.toLocaleString('ko-KR')}명`);
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
        // DOM이 로드된 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateVisitorCount);
        } else {
            updateVisitorCount();
        }
    }

    // 초기화 실행
    init();
})();

