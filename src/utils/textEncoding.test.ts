import { describe, it, expect } from 'vitest';
import { decodeTextBytes, hasUtf8Bom } from './textEncoding';

/** 문자열을 지정한 인코딩의 바이트로 만든다 (테스트 입력 생성용) */
function encode(text: string, encoding: 'utf-8' | 'euc-kr'): Uint8Array {
    if (encoding === 'utf-8') {
        return new TextEncoder().encode(text);
    }
    // Node의 iconv 계열이 없으므로 CP949 바이트를 직접 구성한다
    const buf = Buffer.from(text, 'binary');
    return new Uint8Array(buf);
}

/** 한국어 Excel이 저장한 CSV의 실제 CP949 바이트 */
const CP949_HEADER = new Uint8Array([
    0xb9, 0xf8, 0xc8, 0xa3, 0x2c, // 번호,
    0xc0, 0xcc, 0xb8, 0xa7, 0x2c, // 이름,
    0xbc, 0xba, 0xba, 0xb0,       // 성별
    0x0a,
    0x31, 0x2c,                   // 1,
    0xb9, 0xce, 0xc1, 0xd8, 0x2c, // 민준,
    0xb3, 0xb2,                   // 남
]);

describe('decodeTextBytes - CSV 인코딩 자동 감지', () => {
    it('UTF-8 CSV를 읽는다', () => {
        const bytes = encode('번호,이름,성별\n1,민준,남', 'utf-8');

        expect(decodeTextBytes(bytes)).toBe('번호,이름,성별\n1,민준,남');
    });

    it('BOM이 붙은 UTF-8 CSV를 읽는다 (이 앱이 내보내는 형식)', () => {
        const body = new TextEncoder().encode('번호,이름,성별\n1,민준,남');
        const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...body]);

        // TextDecoder가 BOM을 자동으로 제거하므로 본문만 남는다
        expect(decodeTextBytes(bytes)).toBe('번호,이름,성별\n1,민준,남');
    });

    it('한국어 Excel이 저장한 CP949 CSV를 읽는다', () => {
        // UTF-8로 고정해 읽으면 "������,�̸�,����" 처럼 깨져서
        // 성별 열 검증이 실패하고 명단 전체가 거부된다.
        const decoded = decodeTextBytes(CP949_HEADER);

        expect(decoded).toContain('번호');
        expect(decoded).toContain('이름');
        expect(decoded).toContain('성별');
        expect(decoded).toContain('민준');
        expect(decoded).toContain('남');
    });

    it('CP949 파일이 깨진 문자로 디코딩되지 않는다', () => {
        const decoded = decodeTextBytes(CP949_HEADER);

        expect(decoded).not.toContain('�'); // 대체 문자(�)
    });

    it('영문/숫자만 있는 파일은 어느 인코딩이든 동일하게 읽힌다', () => {
        const bytes = encode('no,name,gender\n1,Minjun,M', 'utf-8');

        expect(decodeTextBytes(bytes)).toBe('no,name,gender\n1,Minjun,M');
    });

    it('빈 파일에서도 안전하다', () => {
        expect(decodeTextBytes(new Uint8Array([]))).toBe('');
    });
});

describe('hasUtf8Bom', () => {
    it('BOM이 있으면 true', () => {
        expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]))).toBe(true);
    });

    it('BOM이 없으면 false', () => {
        expect(hasUtf8Bom(new Uint8Array([0x41, 0x42]))).toBe(false);
    });

    it('3바이트보다 짧으면 false', () => {
        expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb]))).toBe(false);
        expect(hasUtf8Bom(new Uint8Array([]))).toBe(false);
    });
});
