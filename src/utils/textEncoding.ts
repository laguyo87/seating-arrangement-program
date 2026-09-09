/**
 * 텍스트 파일 인코딩 처리
 *
 * 한국어 Windows의 Excel은 CSV를 CP949(EUC-KR 확장)로 저장한다.
 * UTF-8로 고정해 읽으면 한글이 전부 깨지고, 그 뒤 성별 열 검증이 실패해
 * "파일에서 유효한 학생 정보를 읽을 수 없습니다" 라는 엉뚱한 메시지가 나온다.
 * 이 앱이 내려준 템플릿을 Excel에서 편집해 다시 올리는 가장 흔한 경로가 여기서 막힌다.
 */

/** UTF-8 BOM (EF BB BF) */
const UTF8_BOM = [0xef, 0xbb, 0xbf];

/** 한국어 Windows Excel이 쓰는 인코딩 */
const KOREAN_LEGACY_ENCODING = 'euc-kr';

/**
 * 바이트 배열에 UTF-8 BOM이 있는지 확인한다.
 * BOM이 있으면 UTF-8임이 확실하므로 추측할 필요가 없다.
 */
export function hasUtf8Bom(bytes: Uint8Array): boolean {
    return bytes.length >= 3 &&
        bytes[0] === UTF8_BOM[0] &&
        bytes[1] === UTF8_BOM[1] &&
        bytes[2] === UTF8_BOM[2];
}

/**
 * 바이트 배열을 적절한 인코딩으로 디코딩한다.
 *
 * 판단 순서:
 *  1) UTF-8 BOM이 있으면 UTF-8
 *  2) UTF-8로 엄격하게(fatal) 디코딩해서 성공하면 UTF-8
 *     — CP949 한글 바이트는 유효한 UTF-8 시퀀스가 아니라서 여기서 걸러진다
 *  3) 실패하면 EUC-KR(CP949)로 디코딩
 *  4) 그것도 불가능한 환경이면 UTF-8 관대 모드로 디코딩
 */
export function decodeTextBytes(bytes: Uint8Array): string {
    if (hasUtf8Bom(bytes)) {
        return new TextDecoder('utf-8').decode(bytes);
    }

    try {
        // fatal: true — 유효하지 않은 바이트가 하나라도 있으면 예외를 던진다
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        // UTF-8이 아니다. 한국어 레거시 인코딩으로 시도한다.
    }

    try {
        return new TextDecoder(KOREAN_LEGACY_ENCODING).decode(bytes);
    } catch {
        // 이 인코딩을 지원하지 않는 환경 — 마지막 수단
        return new TextDecoder('utf-8').decode(bytes);
    }
}
