/**
 * 명단·배치 내보내기 / 불러오기
 *
 * 이 앱은 모든 데이터를 브라우저의 localStorage에 저장한다.
 * localStorage는 영구 저장소가 아니다. 브라우저의 "인터넷 사용 기록 삭제"에
 * 사이트 데이터를 포함하거나, 학교 PC가 재부팅 시 초기화되도록 설정되어 있거나,
 * Safari가 오래 쓰지 않은 사이트의 데이터를 정리하면 명단이 사라진다.
 *
 * 그래서 교사가 파일 하나로 전체 데이터를 내보내고 되돌릴 수 있어야 한다.
 * 이 파일을 USB나 학교 드라이브에 두면 백업과 기기 간 이동이 동시에 해결된다.
 */

import { ClassInfo, ClassLayoutData } from '../managers/ClassManager.js';

/** 백업 파일 형식 식별자 (다른 JSON 파일을 잘못 불러오는 것을 막는다) */
export const BACKUP_FORMAT = 'seating-arrangement-backup';

/** 백업 형식 버전. 구조가 바뀌면 올린다. */
export const BACKUP_VERSION = 1;

/** 반 하나에 딸린 모든 데이터 */
export interface ClassBackup {
    info: ClassInfo;
    /** 저장된 자리 배치도 (없을 수 있음) */
    layout: ClassLayoutData | null;
    /** 확정된 자리 이력 */
    history: unknown[];
}

/** 백업 파일 전체 구조 */
export interface BackupFile {
    format: string;
    version: number;
    exportedAt: string;
    classes: ClassBackup[];
    /** 반에 속하지 않은, 화면에 입력해 둔 학생 명단 */
    studentRoster: unknown;
    /** 좌석 배치 옵션 설정 */
    options: unknown;
}

/** 백업이 읽고 쓰는 저장소 (테스트에서 대역으로 바꿀 수 있도록 분리) */
export interface BackupStorage {
    read(key: string): string | null;
    write(key: string, value: string): boolean;
}

export interface ImportResult {
    ok: boolean;
    /** 새로 추가된 반 수 */
    added: number;
    /** 같은 반이 있어 덮어쓴 수 */
    replaced: number;
    /** 백업에 없어서 그대로 둔 기존 반 수 */
    kept: number;
    errorMessage?: string;
}

const KEY_CLASS_LIST = 'classList';
const KEY_LAYOUT_PREFIX = 'classLayout_';
const KEY_HISTORY_PREFIX = 'seatHistory_';
const KEY_STUDENT_ROSTER = 'classStudentData';
const KEY_OPTIONS = 'savedOptions';

/** JSON을 조용히 파싱한다. 실패하면 null. */
function parseJson<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export class BackupService {
    /**
     * 현재 저장된 모든 데이터를 백업 구조로 모은다.
     */
    public static buildBackup(storage: BackupStorage, exportedAt: string): BackupFile {
        const classList = parseJson<ClassInfo[]>(storage.read(KEY_CLASS_LIST)) ?? [];

        const classes: ClassBackup[] = (Array.isArray(classList) ? classList : [])
            .filter(info => info && typeof info.id === 'string')
            .map(info => ({
                info,
                layout: parseJson<ClassLayoutData>(storage.read(`${KEY_LAYOUT_PREFIX}${info.id}`)),
                history: parseJson<unknown[]>(storage.read(`${KEY_HISTORY_PREFIX}${info.id}`)) ?? []
            }));

        return {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exportedAt,
            classes,
            studentRoster: parseJson(storage.read(KEY_STUDENT_ROSTER)),
            options: parseJson(storage.read(KEY_OPTIONS))
        };
    }

    /**
     * 백업 파일 텍스트를 검사하고 구조를 돌려준다.
     * 형식이 맞지 않으면 사용자에게 보여줄 이유와 함께 실패를 알린다.
     */
    public static parseBackup(text: string): { ok: true; backup: BackupFile } | { ok: false; errorMessage: string } {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            return { ok: false, errorMessage: '백업 파일을 읽을 수 없습니다. 파일이 손상되었을 수 있습니다.' };
        }

        if (!parsed || typeof parsed !== 'object') {
            return { ok: false, errorMessage: '백업 파일의 형식이 올바르지 않습니다.' };
        }

        const candidate = parsed as Partial<BackupFile>;

        if (candidate.format !== BACKUP_FORMAT) {
            return {
                ok: false,
                errorMessage: '이 프로그램에서 내보낸 백업 파일이 아닙니다. 학생 명단(CSV/엑셀)은 "학생 이름 입력하기"에서 불러오세요.'
            };
        }

        if (typeof candidate.version !== 'number' || candidate.version > BACKUP_VERSION) {
            return {
                ok: false,
                errorMessage: '더 새로운 버전에서 만든 백업 파일입니다. 프로그램을 새로고침한 뒤 다시 시도해주세요.'
            };
        }

        if (!Array.isArray(candidate.classes)) {
            return { ok: false, errorMessage: '백업 파일에 반 정보가 없습니다.' };
        }

        const validClasses = candidate.classes.filter(
            entry => entry && entry.info && typeof entry.info.id === 'string' && typeof entry.info.name === 'string'
        );

        return {
            ok: true,
            backup: {
                format: BACKUP_FORMAT,
                version: candidate.version,
                exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : '',
                classes: validClasses,
                studentRoster: candidate.studentRoster ?? null,
                options: candidate.options ?? null
            }
        };
    }

    /**
     * 백업을 저장소에 적용한다.
     *
     * 같은 id의 반은 백업 내용으로 덮어쓰고, 백업에 없는 기존 반은 그대로 둔다.
     * 불러오기가 기존 데이터를 지우지 않도록 하기 위해서다.
     * (덮어쓰기 방식이면 실수로 예전 백업을 불러왔을 때 최근 작업이 사라진다)
     */
    public static applyBackup(storage: BackupStorage, backup: BackupFile): ImportResult {
        const existingList = parseJson<ClassInfo[]>(storage.read(KEY_CLASS_LIST)) ?? [];
        const existing = Array.isArray(existingList) ? existingList : [];

        const merged: ClassInfo[] = [...existing];
        let added = 0;
        let replaced = 0;

        for (const entry of backup.classes) {
            const index = merged.findIndex(info => info.id === entry.info.id);
            if (index === -1) {
                merged.push(entry.info);
                added++;
            } else {
                merged[index] = entry.info;
                replaced++;
            }

            if (entry.layout) {
                if (!storage.write(`${KEY_LAYOUT_PREFIX}${entry.info.id}`, JSON.stringify(entry.layout))) {
                    return { ok: false, added, replaced, kept: 0, errorMessage: '저장 공간이 부족하여 불러오기를 완료하지 못했습니다.' };
                }
            }

            if (Array.isArray(entry.history) && entry.history.length > 0) {
                if (!storage.write(`${KEY_HISTORY_PREFIX}${entry.info.id}`, JSON.stringify(entry.history))) {
                    return { ok: false, added, replaced, kept: 0, errorMessage: '저장 공간이 부족하여 불러오기를 완료하지 못했습니다.' };
                }
            }
        }

        if (!storage.write(KEY_CLASS_LIST, JSON.stringify(merged))) {
            return { ok: false, added, replaced, kept: 0, errorMessage: '저장 공간이 부족하여 불러오기를 완료하지 못했습니다.' };
        }

        // 명단과 옵션은 반에 속하지 않으므로 백업에 있을 때만 덮어쓴다
        if (backup.studentRoster) {
            storage.write(KEY_STUDENT_ROSTER, JSON.stringify(backup.studentRoster));
        }
        if (backup.options) {
            storage.write(KEY_OPTIONS, JSON.stringify(backup.options));
        }

        return {
            ok: true,
            added,
            replaced,
            kept: existing.length - replaced
        };
    }

    /**
     * 내려받을 파일 이름 (예: 자리배치_백업_2026-09-09.json)
     */
    public static buildFileName(exportedAt: string): string {
        const datePart = exportedAt.slice(0, 10) || 'backup';
        return `자리배치_백업_${datePart}.json`;
    }
}
