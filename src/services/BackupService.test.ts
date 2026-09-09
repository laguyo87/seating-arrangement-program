import { describe, it, expect } from 'vitest';
import { BackupService, BACKUP_FORMAT, BACKUP_VERSION } from './BackupService';
import type { BackupStorage, BackupFile } from './BackupService';

/** 메모리 기반 저장소 대역 */
function createStorage(seed: Record<string, string> = {}, opts: { full?: boolean } = {}): BackupStorage & { data: Map<string, string> } {
    const data = new Map<string, string>(Object.entries(seed));
    return {
        data,
        read: (key) => (data.has(key) ? data.get(key)! : null),
        write: (key, value) => {
            if (opts.full) return false;
            data.set(key, value);
            return true;
        },
    };
}

const CLASS_1 = { id: 'class_1', name: '3학년 1반', createdAt: '2026-01-01', lastModified: '2026-01-01' };
const CLASS_2 = { id: 'class_2', name: '3학년 2반', createdAt: '2026-01-02', lastModified: '2026-01-02' };

const LAYOUT_1 = { seats: [{ id: 1 }], students: [{ id: 1, name: '민준', gender: 'M' }], timestamp: '2026-01-01', className: '3학년 1반' };
const HISTORY_1 = [{ id: 'history_1', date: '26-01-01', layout: [{ seatId: 1, studentName: '민준', gender: 'M' }] }];

function seededStorage() {
    return createStorage({
        classList: JSON.stringify([CLASS_1, CLASS_2]),
        classLayout_class_1: JSON.stringify(LAYOUT_1),
        seatHistory_class_1: JSON.stringify(HISTORY_1),
        classStudentData: JSON.stringify([{ name: '민준', gender: 'M' }]),
        savedOptions: JSON.stringify({ layoutType: 'single-uniform' }),
    });
}

describe('BackupService.buildBackup - 내보내기', () => {
    it('모든 반과 딸린 데이터를 모은다', () => {
        const backup = BackupService.buildBackup(seededStorage(), '2026-09-09T00:00:00.000Z');

        expect(backup.format).toBe(BACKUP_FORMAT);
        expect(backup.version).toBe(BACKUP_VERSION);
        expect(backup.classes).toHaveLength(2);
        expect(backup.classes[0].info.name).toBe('3학년 1반');
        expect(backup.classes[0].layout).toEqual(LAYOUT_1);
        expect(backup.classes[0].history).toEqual(HISTORY_1);
    });

    it('배치도나 이력이 없는 반도 포함한다', () => {
        const backup = BackupService.buildBackup(seededStorage(), '2026-09-09T00:00:00.000Z');

        const second = backup.classes[1];
        expect(second.info.id).toBe('class_2');
        expect(second.layout).toBeNull();
        expect(second.history).toEqual([]);
    });

    it('명단과 옵션도 함께 담는다', () => {
        const backup = BackupService.buildBackup(seededStorage(), '2026-09-09T00:00:00.000Z');

        expect(backup.studentRoster).toEqual([{ name: '민준', gender: 'M' }]);
        expect(backup.options).toEqual({ layoutType: 'single-uniform' });
    });

    it('반이 하나도 없어도 안전하게 동작한다', () => {
        const backup = BackupService.buildBackup(createStorage(), '2026-09-09T00:00:00.000Z');

        expect(backup.classes).toEqual([]);
        expect(backup.studentRoster).toBeNull();
    });

    it('저장된 반 목록이 손상되어 있으면 빈 목록으로 처리한다', () => {
        const backup = BackupService.buildBackup(createStorage({ classList: '{망가진' }), '2026-09-09T00:00:00.000Z');

        expect(backup.classes).toEqual([]);
    });
});

describe('BackupService.parseBackup - 파일 검사', () => {
    function validBackupText() {
        return JSON.stringify(BackupService.buildBackup(seededStorage(), '2026-09-09T00:00:00.000Z'));
    }

    it('정상 백업 파일을 읽는다', () => {
        const result = BackupService.parseBackup(validBackupText());

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.backup.classes).toHaveLength(2);
    });

    it('JSON이 아니면 이유와 함께 거부한다', () => {
        const result = BackupService.parseBackup('이건 JSON이 아닙니다');

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errorMessage).toContain('읽을 수 없습니다');
    });

    it('다른 프로그램의 JSON은 거부한다', () => {
        const result = BackupService.parseBackup(JSON.stringify({ foo: 'bar' }));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errorMessage).toContain('백업 파일이 아닙니다');
    });

    it('학생 명단 CSV를 잘못 올린 경우 안내한다', () => {
        // 형식 식별자가 없으므로 거부되며, 어디서 불러야 하는지 알려준다
        const result = BackupService.parseBackup(JSON.stringify([{ name: '민준', gender: 'M' }]));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errorMessage).toContain('학생 이름 입력하기');
    });

    it('더 새로운 버전의 백업은 거부한다', () => {
        const result = BackupService.parseBackup(
            JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, classes: [] })
        );

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errorMessage).toContain('새로운 버전');
    });

    it('반 정보가 깨진 항목은 걸러낸다', () => {
        const result = BackupService.parseBackup(JSON.stringify({
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            classes: [{ info: CLASS_1, layout: null, history: [] }, { info: null }, {}],
        }));

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.backup.classes).toHaveLength(1);
    });
});

describe('BackupService.applyBackup - 불러오기', () => {
    function backupOf(...classes: Array<{ info: typeof CLASS_1; layout?: unknown; history?: unknown[] }>): BackupFile {
        return {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exportedAt: '2026-09-09T00:00:00.000Z',
            classes: classes.map(c => ({ info: c.info, layout: (c.layout ?? null) as any, history: c.history ?? [] })),
            studentRoster: null,
            options: null,
        };
    }

    it('빈 저장소에 반을 복원한다', () => {
        const storage = createStorage();

        const result = BackupService.applyBackup(storage, backupOf({ info: CLASS_1, layout: LAYOUT_1, history: HISTORY_1 }));

        expect(result.ok).toBe(true);
        expect(result.added).toBe(1);
        expect(JSON.parse(storage.data.get('classList')!)).toEqual([CLASS_1]);
        expect(JSON.parse(storage.data.get('classLayout_class_1')!)).toEqual(LAYOUT_1);
        expect(JSON.parse(storage.data.get('seatHistory_class_1')!)).toEqual(HISTORY_1);
    });

    it('백업에 없는 기존 반은 지우지 않는다', () => {
        // 실수로 예전 백업을 불러왔을 때 최근에 만든 반이 사라지면 안 된다
        const storage = createStorage({ classList: JSON.stringify([CLASS_2]) });

        const result = BackupService.applyBackup(storage, backupOf({ info: CLASS_1 }));

        expect(result.added).toBe(1);
        expect(result.kept).toBe(1);
        const names = JSON.parse(storage.data.get('classList')!).map((c: any) => c.name);
        expect(names).toEqual(['3학년 2반', '3학년 1반']);
    });

    it('같은 id의 반은 백업 내용으로 덮어쓴다', () => {
        const storage = createStorage({ classList: JSON.stringify([{ ...CLASS_1, name: '옛 이름' }]) });

        const result = BackupService.applyBackup(storage, backupOf({ info: CLASS_1 }));

        expect(result.replaced).toBe(1);
        expect(result.added).toBe(0);
        const list = JSON.parse(storage.data.get('classList')!);
        expect(list).toHaveLength(1);
        expect(list[0].name).toBe('3학년 1반');
    });

    it('저장 공간이 부족하면 실패를 알린다', () => {
        const storage = createStorage({}, { full: true });

        const result = BackupService.applyBackup(storage, backupOf({ info: CLASS_1, layout: LAYOUT_1 }));

        expect(result.ok).toBe(false);
        expect(result.errorMessage).toContain('저장 공간');
    });

    it('내보내고 다시 불러오면 내용이 같다', () => {
        const source = seededStorage();
        const backup = BackupService.buildBackup(source, '2026-09-09T00:00:00.000Z');

        const target = createStorage();
        const parsed = BackupService.parseBackup(JSON.stringify(backup));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        BackupService.applyBackup(target, parsed.backup);

        expect(JSON.parse(target.data.get('classList')!)).toEqual([CLASS_1, CLASS_2]);
        expect(JSON.parse(target.data.get('classLayout_class_1')!)).toEqual(LAYOUT_1);
        expect(JSON.parse(target.data.get('seatHistory_class_1')!)).toEqual(HISTORY_1);
        expect(JSON.parse(target.data.get('classStudentData')!)).toEqual([{ name: '민준', gender: 'M' }]);
    });

    it('한글 이름이 왕복해도 깨지지 않는다', () => {
        const source = createStorage({
            classList: JSON.stringify([CLASS_1]),
            classLayout_class_1: JSON.stringify({
                seats: [], students: [{ id: 1, name: '김민준', gender: 'M' }, { id: 2, name: '이서연', gender: 'F' }],
                timestamp: '', className: '3학년 1반',
            }),
        });
        const backup = BackupService.buildBackup(source, '2026-09-09T00:00:00.000Z');
        const target = createStorage();
        const parsed = BackupService.parseBackup(JSON.stringify(backup));
        if (!parsed.ok) throw new Error('파싱 실패');
        BackupService.applyBackup(target, parsed.backup);

        const restored = JSON.parse(target.data.get('classLayout_class_1')!);
        expect(restored.students.map((s: any) => s.name)).toEqual(['김민준', '이서연']);
    });
});

describe('BackupService.buildFileName', () => {
    it('날짜가 들어간 파일 이름을 만든다', () => {
        expect(BackupService.buildFileName('2026-09-09T12:34:56.000Z')).toBe('자리배치_백업_2026-09-09.json');
    });

    it('날짜가 없어도 이름을 만든다', () => {
        expect(BackupService.buildFileName('')).toBe('자리배치_백업_backup.json');
    });
});
