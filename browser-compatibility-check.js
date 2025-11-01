/**
 * 브라우저 호환성 체크 스크립트
 * 페이지 로드 시 실행하여 필요한 브라우저 API 지원 여부를 확인합니다.
 */

(function() {
    'use strict';

    const checks = {
        localStorage: typeof Storage !== 'undefined',
        fileReader: typeof FileReader !== 'undefined',
        blob: typeof Blob !== 'undefined',
        url: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',
        canvas: (function() {
            const canvas = document.createElement('canvas');
            return !!canvas.getContext && !!canvas.getContext('2d');
        })(),
        esModules: 'noModule' in HTMLScriptElement.prototype,
        fetch: typeof fetch !== 'undefined',
        promise: typeof Promise !== 'undefined',
        arrayFrom: typeof Array.from !== 'undefined',
        objectAssign: typeof Object.assign !== 'undefined'
    };

    const unsupported = [];
    for (const [feature, supported] of Object.entries(checks)) {
        if (!supported) {
            unsupported.push(feature);
        }
    }

    if (unsupported.length > 0) {
        console.error('지원되지 않는 브라우저 기능:', unsupported);
        
        // 사용자에게 알림
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            font-family: Arial, sans-serif;
        `;
        message.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">⚠️ 브라우저 호환성 문제</h3>
            <p style="margin: 0 0 10px 0;">이 브라우저는 필요한 기능을 지원하지 않습니다.</p>
            <p style="margin: 0 0 10px 0; font-size: 0.9em;">지원되지 않는 기능: ${unsupported.join(', ')}</p>
            <p style="margin: 0; font-size: 0.85em;">Chrome, Firefox, Safari, Edge의 최신 버전을 사용해주세요.</p>
        `;
        document.body.appendChild(message);

        // 10초 후 자동 제거
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 10000);
    } else {
        console.log('✅ 모든 필수 브라우저 기능이 지원됩니다.');
    }

    // 브라우저 정보 출력
    const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        checks: checks
    };
    console.log('브라우저 정보:', browserInfo);
})();
