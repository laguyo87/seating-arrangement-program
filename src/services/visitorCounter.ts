/**
 * 방문자 수 카운터
 *
 * 이 앱은 학생 데이터를 브라우저에만 저장한다. 서버가 필요한 기능은
 * 화면 구석의 방문자 수 하나뿐이다.
 *
 * 그 하나 때문에 Firebase SDK(약 466KB)를 내려받는 것은 값어치가 없어서
 * Firestore REST API를 fetch로 직접 호출한다. 앱에는 Firebase SDK가 들어가지 않는다.
 *
 * 실패해도 앱 사용에는 영향이 없어야 하므로 모든 오류는 조용히 삼키고 null을 반환한다.
 */

import { firebaseConfig, isFirebaseConfigValid } from '../config/firebase.config.js';
import { logger } from '../utils/logger.js';

const DOCUMENT_PATH = 'globalStats/visitorCount';
/** 네트워크가 느릴 때 화면을 붙잡지 않도록 하는 제한 시간 */
const TIMEOUT_MS = 8000;

function documentUrl(): string {
    const { projectId, apiKey } = firebaseConfig;
    return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${DOCUMENT_PATH}?key=${apiKey}`;
}

function commitUrl(): string {
    const { projectId, apiKey } = firebaseConfig;
    return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit?key=${apiKey}`;
}

/** Firestore REST 응답에서 count 값을 꺼낸다 */
function readCount(payload: unknown): number | null {
    const fields = (payload as { fields?: { count?: { integerValue?: string } } })?.fields;
    const raw = fields?.count?.integerValue;
    if (raw === undefined) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!response.ok) {
            logger.warn('방문자 수 요청 실패:', response.status);
            return null;
        }
        return await response.json();
    } catch (error) {
        logger.warn('방문자 수 요청 중 오류:', error);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 방문자 수를 1 증가시키고 증가한 값을 돌려준다. 실패하면 null.
 *
 * 서버 쪽 증가 연산(increment)을 쓰기 때문에, 여러 명이 동시에 접속해도
 * 값이 어긋나지 않는다. 보안 규칙이 '정확히 1만 증가'로 제한하고 있어
 * 임의의 값으로 덮어쓸 수도 없다.
 */
export async function incrementVisitorCount(): Promise<number | null> {
    if (!isFirebaseConfigValid()) return null;

    const { projectId } = firebaseConfig;
    const body = {
        writes: [
            {
                transform: {
                    document: `projects/${projectId}/databases/(default)/documents/${DOCUMENT_PATH}`,
                    fieldTransforms: [
                        { fieldPath: 'count', increment: { integerValue: '1' } }
                    ]
                }
            }
        ]
    };

    const result = await fetchJson(commitUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!result) return null;

    // 응답에 증가 후 값이 담겨 온다
    const transformResults = (result as { writeResults?: Array<{ transformResults?: Array<{ integerValue?: string }> }> })
        .writeResults?.[0]?.transformResults?.[0]?.integerValue;

    if (transformResults !== undefined) {
        const value = Number(transformResults);
        if (Number.isFinite(value)) return value;
    }

    // 응답 형식이 예상과 다르면 다시 읽어본다
    return getVisitorCount();
}

/**
 * 현재 방문자 수를 읽는다. 실패하면 null.
 */
export async function getVisitorCount(): Promise<number | null> {
    if (!isFirebaseConfigValid()) return null;

    const payload = await fetchJson(documentUrl());
    if (!payload) return null;

    return readCount(payload);
}
