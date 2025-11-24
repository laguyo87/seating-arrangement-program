/**
 * 스토리지 매니저
 * localStorage 관련 작업 담당
 */

import { OutputModule } from '../modules/OutputModule.js';
import { logger } from '../utils/logger.js';

/**
 * StorageManager가 필요로 하는 의존성 인터페이스
 */
export interface StorageManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
}

/**
 * 스토리지 매니저 클래스
 */
export class StorageManager {
    private deps: StorageManagerDependencies;

    constructor(dependencies: StorageManagerDependencies) {
        this.deps = dependencies;
    }

    /**
     * localStorage 사용 가능 여부 확인
     */
    public isLocalStorageAvailable(): boolean {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 안전한 localStorage 저장
     */
    public safeSetItem(key: string, value: string): boolean {
        if (!this.isLocalStorageAvailable()) {
            this.deps.outputModule.showError('브라우저의 저장소 기능이 비활성화되어 있습니다. 설정에서 쿠키 및 사이트 데이터를 허용해주세요.');
            return false;
        }
        
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            if (error instanceof DOMException && error.code === 22) {
                // 저장소 용량 초과
                this.deps.outputModule.showError('저장소 용량이 부족합니다. 브라우저 설정에서 저장된 데이터를 삭제해주세요.');
            } else {
                this.deps.outputModule.showError('데이터 저장에 실패했습니다. 브라우저 설정을 확인해주세요.');
            }
            logger.error('localStorage 저장 실패:', error);
            return false;
        }
    }

    /**
     * 안전한 localStorage 읽기
     */
    public safeGetItem(key: string): string | null {
        if (!this.isLocalStorageAvailable()) {
            return null;
        }
        
        try {
            return localStorage.getItem(key);
        } catch (error) {
            logger.error('localStorage 읽기 실패:', error);
            return null;
        }
    }

    /**
     * 옵션 설정 저장
     */
    public saveOptions(): void {
        try {
            const options: any = {};

            // 옵션1: 좌석 배치 형태
            const layoutType = document.querySelector('input[name="layout-type"]:checked') as HTMLInputElement;
            if (layoutType) {
                options.layoutType = layoutType.value;
            }

            const pairMode = document.querySelector('input[name="pair-mode"]:checked') as HTMLInputElement;
            if (pairMode) {
                options.pairMode = pairMode.value;
            }

            const groupSize = document.querySelector('input[name="group-size"]:checked') as HTMLInputElement;
            if (groupSize) {
                options.groupSize = groupSize.value;
            }

            const groupGenderMix = document.getElementById('group-gender-mix') as HTMLInputElement;
            if (groupGenderMix) {
                options.groupGenderMix = groupGenderMix.checked;
            }

            // 옵션2: 학생 자리 수
            const maleStudents = document.getElementById('male-students') as HTMLInputElement;
            if (maleStudents) {
                options.maleStudents = maleStudents.value;
            }

            const femaleStudents = document.getElementById('female-students') as HTMLInputElement;
            if (femaleStudents) {
                options.femaleStudents = femaleStudents.value;
            }

            // 옵션3: 분단 개수
            const numberOfPartitions = document.getElementById('number-of-partitions') as HTMLInputElement;
            if (numberOfPartitions) {
                options.numberOfPartitions = numberOfPartitions.value;
            }

            // 옵션4: 맞춤 구성
            const customMode2 = document.querySelector('input[name="custom-mode-2"]:checked') as HTMLInputElement;
            if (customMode2) {
                options.customMode2 = customMode2.value;
            }

            // localStorage에 저장
            const success = this.safeSetItem('savedOptions', JSON.stringify(options));
            if (success) {
                this.deps.outputModule.showSuccess('옵션 설정이 기억되었습니다.');
            }
        } catch (error) {
            logger.error('옵션 설정 저장 중 오류:', error);
            this.deps.outputModule.showError('옵션 설정 저장 중 오류가 발생했습니다.');
        }
    }

    /**
     * 저장된 옵션 설정 불러오기
     */
    public loadOptions(setTimeoutSafe: (callback: () => void, delay: number) => void): void {
        try {
            const savedOptionsStr = this.safeGetItem('savedOptions');
            if (!savedOptionsStr) {
                return; // 저장된 설정이 없으면 기본값 유지
            }

            // JSON 파싱 시도 (데이터 손상 처리)
            let options: any;
            try {
                options = JSON.parse(savedOptionsStr);
            } catch (parseError) {
                // 데이터 손상 시 저장소에서 제거하고 기본값으로 복구
                try {
                    localStorage.removeItem('savedOptions');
                } catch {}
                return;
            }
            
            // 데이터 구조 검증
            if (!options || typeof options !== 'object') {
                try {
                    localStorage.removeItem('savedOptions');
                } catch {}
                return;
            }

            // 옵션1: 좌석 배치 형태
            if (options.layoutType) {
                const layoutTypeInput = document.querySelector(`input[name="layout-type"][value="${options.layoutType}"]`) as HTMLInputElement;
                if (layoutTypeInput) {
                    layoutTypeInput.checked = true;
                    layoutTypeInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // pair-mode는 layout-type이 pair-uniform일 때만 적용
            if (options.pairMode && options.layoutType === 'pair-uniform') {
                setTimeoutSafe(() => {
                    const pairModeInput = document.querySelector(`input[name="pair-mode"][value="${options.pairMode}"]`) as HTMLInputElement;
                    if (pairModeInput) {
                        pairModeInput.checked = true;
                        pairModeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, 100);
            }

            // group-size는 layout-type이 group일 때만 적용
            if (options.groupSize && options.layoutType === 'group') {
                setTimeoutSafe(() => {
                    const groupSizeInput = document.querySelector(`input[name="group-size"][value="${options.groupSize}"]`) as HTMLInputElement;
                    if (groupSizeInput) {
                        groupSizeInput.checked = true;
                        groupSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    // group-gender-mix는 group-size가 선택된 후에 적용
                    if (options.groupGenderMix !== undefined) {
                        setTimeoutSafe(() => {
                            const groupGenderMixInput = document.getElementById('group-gender-mix') as HTMLInputElement;
                            if (groupGenderMixInput) {
                                groupGenderMixInput.checked = options.groupGenderMix;
                                groupGenderMixInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, 200);
                    }
                }, 100);
            }

            // 옵션2: 학생 자리 수
            if (options.maleStudents !== undefined) {
                const maleStudentsInput = document.getElementById('male-students') as HTMLInputElement;
                if (maleStudentsInput) {
                    maleStudentsInput.value = options.maleStudents.toString();
                    maleStudentsInput.dispatchEvent(new Event('input', { bubbles: true }));
                    maleStudentsInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            if (options.femaleStudents !== undefined) {
                const femaleStudentsInput = document.getElementById('female-students') as HTMLInputElement;
                if (femaleStudentsInput) {
                    femaleStudentsInput.value = options.femaleStudents.toString();
                    femaleStudentsInput.dispatchEvent(new Event('input', { bubbles: true }));
                    femaleStudentsInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // 옵션3: 분단 개수
            if (options.numberOfPartitions !== undefined) {
                const numberOfPartitionsInput = document.getElementById('number-of-partitions') as HTMLInputElement;
                if (numberOfPartitionsInput) {
                    numberOfPartitionsInput.value = options.numberOfPartitions;
                    numberOfPartitionsInput.dispatchEvent(new Event('input', { bubbles: true }));
                    numberOfPartitionsInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // 옵션4: 맞춤 구성
            if (options.customMode2) {
                const customMode2Input = document.querySelector(`input[name="custom-mode-2"][value="${options.customMode2}"]`) as HTMLInputElement;
                if (customMode2Input) {
                    customMode2Input.checked = true;
                    customMode2Input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        } catch (error) {
            logger.error('옵션 설정 불러오기 중 오류:', error);
            // 오류가 발생해도 기본값으로 진행
        }
    }
}



