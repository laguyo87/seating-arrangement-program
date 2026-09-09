/**
 * 클라우드 저장 종료 안내 및 데이터 이전
 *
 * 이 프로그램은 로그인 기반 클라우드 저장에서 '기기 저장 + 파일 백업' 방식으로 바뀌었다.
 * 예전에 로그인해서 쓰던 교사는 클라우드에 반과 자리 배치가 남아 있으므로,
 * 한 번 로그인해서 그것을 이 기기로 가져오고 백업 파일로 내려받을 수 있어야 한다.
 *
 * Firebase는 이 경로에서만, 사용자가 '가져오기'를 눌렀을 때만 동적으로 불러온다.
 * 새로 쓰는 교사는 Firebase를 한 바이트도 내려받지 않는다.
 */

import { OutputModule } from './OutputModule.js';
import { StorageManager } from '../managers/StorageManager.js';
import { BackupService } from '../services/BackupService.js';
import { logger } from '../utils/logger.js';

export interface CloudMigrationDependencies {
    outputModule: OutputModule;
    storageManager: StorageManager;
    /** 데이터를 가져온 뒤 화면을 갱신하기 위한 콜백 */
    onDataImported: () => void;
}

/** 안내를 이미 봤는지 기록하는 키 */
const NOTICE_SEEN_KEY = 'localFirstNoticeSeen';

export class CloudMigrationModule {
    private deps: CloudMigrationDependencies;
    private modal: HTMLElement | null = null;
    private previouslyFocused: HTMLElement | null = null;

    constructor(dependencies: CloudMigrationDependencies) {
        this.deps = dependencies;
    }

    /**
     * 아직 안내를 보지 않았다면 안내를 띄운다.
     */
    public showNoticeIfNeeded(): void {
        try {
            if (localStorage.getItem(NOTICE_SEEN_KEY) === 'true') return;
        } catch {
            // 저장소를 읽을 수 없으면 안내를 띄우지 않는다 (매번 뜨는 것을 막는다)
            return;
        }

        this.showNotice();
    }

    /**
     * 안내를 강제로 띄운다 (사용설명서 등에서 다시 볼 때)
     */
    public showNotice(): void {
        if (this.modal) return;

        this.previouslyFocused = document.activeElement as HTMLElement | null;

        const modal = document.createElement('div');
        modal.className = 'cloud-migration-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'cloud-migration-title');
        modal.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:10001',
            'background:rgba(0,0,0,0.5)',
            'display:flex', 'align-items:center', 'justify-content:center', 'padding:20px'
        ].join(';');

        const content = document.createElement('div');
        content.style.cssText = [
            'background:#fff', 'border-radius:12px', 'padding:28px',
            'max-width:620px', 'width:100%', 'max-height:85vh', 'overflow-y:auto',
            'box-shadow:0 8px 32px rgba(0,0,0,0.25)', 'line-height:1.7'
        ].join(';');

        const title = document.createElement('h2');
        title.id = 'cloud-migration-title';
        title.textContent = '저장 방식이 바뀌었습니다';
        title.style.cssText = 'margin:0 0 16px;font-size:1.4em;color:#333;';
        content.appendChild(title);

        const intro = document.createElement('p');
        intro.textContent =
            '이제 로그인 없이 바로 사용합니다. 반과 학생 명단은 이 컴퓨터의 브라우저에 저장됩니다.';
        intro.style.cssText = 'margin:0 0 18px;color:#333;';
        content.appendChild(intro);

        content.appendChild(this.buildSection('무엇이 좋아졌나요?', [
            '로그인할 필요가 없습니다.',
            '학생 이름이 외부 서버로 전송되지 않습니다.',
            '첫 화면이 이전보다 두 배 가까이 빨리 열립니다.'
        ]));

        content.appendChild(this.buildSection('꼭 알아두실 점', [
            '브라우저의 "인터넷 사용 기록 삭제"에서 쿠키 및 사이트 데이터를 지우면 명단도 함께 사라집니다.',
            '다른 컴퓨터에서는 이 컴퓨터의 자료가 보이지 않습니다.',
            '그래서 상단의 💾 내보내기로 파일을 만들어 USB나 학교 드라이브에 보관해 두세요. 그 파일을 📂 불러오기 하면 다른 컴퓨터에서도 그대로 씁니다.'
        ], '#b45309', '#fffbeb'));

        content.appendChild(this.buildSection('예전에 로그인해서 쓰셨다면', [
            '클라우드에 저장해 둔 반과 자리 배치를 이 컴퓨터로 가져올 수 있습니다.',
            '아래 버튼을 누르면 한 번 로그인한 뒤 자료를 가져오고, 백업 파일도 함께 내려받습니다.',
            '가져오기는 지금 하지 않아도 되지만, 되도록 빨리 해두시길 권합니다.'
        ]));

        // 버튼
        const buttons = document.createElement('div');
        buttons.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:24px;';

        const migrateBtn = document.createElement('button');
        migrateBtn.type = 'button';
        migrateBtn.textContent = '☁️ 예전 클라우드 자료 가져오기';
        migrateBtn.style.cssText =
            'padding:10px 18px;border-radius:8px;border:1px solid #667eea;background:#fff;color:#667eea;cursor:pointer;font-size:1em;';
        migrateBtn.addEventListener('click', () => {
            migrateBtn.disabled = true;
            migrateBtn.textContent = '가져오는 중...';
            void this.runMigration().finally(() => {
                migrateBtn.disabled = false;
                migrateBtn.textContent = '☁️ 예전 클라우드 자료 가져오기';
            });
        });
        buttons.appendChild(migrateBtn);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '확인, 이대로 사용할게요';
        closeBtn.style.cssText =
            'padding:10px 18px;border-radius:8px;border:none;background:#667eea;color:#fff;cursor:pointer;font-size:1em;';
        closeBtn.addEventListener('click', () => this.close());
        buttons.appendChild(closeBtn);

        content.appendChild(buttons);
        modal.appendChild(content);

        // 배경 클릭 및 Escape로 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
        modal.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Escape') this.close();
        });

        document.body.appendChild(modal);
        this.modal = modal;
        closeBtn.focus();
    }

    /**
     * 제목과 항목 목록으로 된 안내 구획을 만든다
     */
    private buildSection(heading: string, items: string[], color = '#333', background = '#f8f9fa'): HTMLElement {
        const section = document.createElement('section');
        section.style.cssText = `margin:0 0 16px;padding:14px 16px;border-radius:8px;background:${background};`;

        const title = document.createElement('h3');
        title.textContent = heading;
        title.style.cssText = `margin:0 0 8px;font-size:1.05em;color:${color};`;
        section.appendChild(title);

        const list = document.createElement('ul');
        list.style.cssText = 'margin:0;padding-left:20px;color:#333;';
        items.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            li.style.marginBottom = '4px';
            list.appendChild(li);
        });
        section.appendChild(list);

        return section;
    }

    /**
     * 안내를 닫고 다시 띄우지 않도록 기록한다
     */
    private close(): void {
        try {
            localStorage.setItem(NOTICE_SEEN_KEY, 'true');
        } catch (error) {
            logger.error('안내 표시 기록 저장 실패:', error);
        }

        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }

        this.previouslyFocused?.focus();
    }

    /**
     * 클라우드에 남아 있는 자료를 이 기기로 가져온다.
     *
     * Firebase는 여기서 처음 불러온다. 이 버튼을 누르지 않으면 내려받지 않는다.
     */
    private async runMigration(): Promise<void> {
        try {
            const [{ FirebaseStorageManager }, { LoginPageModule }] = await Promise.all([
                import('../managers/FirebaseStorageManager.js'),
                import('./LoginPageModule.js')
            ]);

            const firebase = new FirebaseStorageManager({
                outputModule: this.deps.outputModule,
                isDevelopmentMode: () => false
            });

            // 이미 로그인 상태가 복원되어 있을 수 있으므로 먼저 확인한다
            const authenticated = await new Promise<boolean>((resolve) => {
                let settled = false;
                firebase.onAuthStateResolved((isAuthed) => {
                    if (settled) return;
                    settled = true;
                    resolve(isAuthed);
                });
                // 인증 상태가 끝내 확정되지 않는 경우를 대비한 안전장치
                setTimeout(() => {
                    if (!settled) {
                        settled = true;
                        resolve(false);
                    }
                }, 8000);
            });

            if (!authenticated) {
                await new Promise<void>((resolve) => {
                    const loginPage = new LoginPageModule({
                        firebaseStorageManager: firebase,
                        outputModule: this.deps.outputModule,
                        onLoginSuccess: () => resolve(),
                        onClose: () => resolve()
                    });
                    loginPage.show();
                });
            }

            if (!firebase.getIsAuthenticated()) {
                this.deps.outputModule.showWarning('로그인하지 않아 클라우드 자료를 가져오지 못했습니다.');
                return;
            }

            await this.pullEverything(firebase);
        } catch (error) {
            logger.error('클라우드 자료 가져오기 실패:', error);
            this.deps.outputModule.showError('클라우드 자료를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
    }

    /**
     * 클라우드의 반 목록과 각 반의 배치도·이력을 이 기기에 저장한다.
     */
    private async pullEverything(firebase: import('../managers/FirebaseStorageManager.js').FirebaseStorageManager): Promise<void> {
        const classList = await firebase.loadClassList();

        if (!classList || classList.length === 0) {
            this.deps.outputModule.showInfo('클라우드에 저장된 반이 없습니다.');
            return;
        }

        const saved = this.deps.storageManager.safeSetItem('classList', JSON.stringify(classList));
        if (!saved) {
            this.deps.outputModule.showError('반 목록을 이 기기에 저장하지 못했습니다. 브라우저 저장소 설정을 확인해주세요.');
            return;
        }

        let layoutCount = 0;
        let historyCount = 0;

        for (const classInfo of classList) {
            const layout = await firebase.loadClassLayout(classInfo.id);
            if (layout) {
                if (this.deps.storageManager.safeSetItem(`classLayout_${classInfo.id}`, JSON.stringify(layout))) {
                    layoutCount++;
                }
            }

            const history = await firebase.loadSeatHistory(classInfo.id);
            if (history && history.length > 0) {
                if (this.deps.storageManager.safeSetItem(`seatHistory_${classInfo.id}`, JSON.stringify(history))) {
                    historyCount++;
                }
            }
        }

        this.deps.onDataImported();

        this.deps.outputModule.showSuccess(
            `클라우드에서 ${classList.length}개 반을 가져왔습니다. ` +
            `(자리 배치도 ${layoutCount}개, 확정 이력 ${historyCount}개) ` +
            '이어서 백업 파일을 내려받습니다. 안전한 곳에 보관해주세요.'
        );

        this.downloadBackup();
        this.close();
    }

    /**
     * 가져온 자료를 곧바로 백업 파일로 내려받는다.
     * 이 기기의 브라우저 데이터가 지워지면 자료가 사라지기 때문이다.
     */
    private downloadBackup(): void {
        try {
            const backup = BackupService.buildBackup(
                {
                    read: (key) => this.deps.storageManager.safeGetItem(key),
                    write: (key, value) => this.deps.storageManager.safeSetItem(key, value)
                },
                new Date().toISOString()
            );

            const fileName = BackupService.buildFileName(backup.exportedAt);
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            logger.error('이전 후 백업 내려받기 실패:', error);
            this.deps.outputModule.showWarning('자료는 가져왔지만 백업 파일 내려받기에 실패했습니다. 상단의 💾 내보내기를 눌러주세요.');
        }
    }
}
