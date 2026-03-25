/**
 * UI 관리자
 * UI 업데이트 관련 작업 담당 (미리보기, 통계, 히스토리 드롭다운 등)
 */

import { OutputModule } from '../modules/OutputModule.js';
import { StudentModel } from '../models/Student.js';
import { Student } from '../models/Student.js';
import { Seat } from '../models/Seat.js';
import { StorageManager } from './StorageManager.js';

/**
 * 좌석 이력 항목 타입
 */
export interface SeatHistoryItem {
    id: string;
    date: string;
    layout: Array<{seatId: number, studentName: string, gender: 'M' | 'F'}>;
    pairInfo?: Array<{student1: string, student2: string}>;
    timestamp: number;
    // 배치 형태 정보 (복원을 위해 필요)
    layoutType?: string; // 'single-uniform' | 'pair-uniform' | 'group' | 'custom'
    singleMode?: string; // 'basic-row' | 'gender-row' | 'gender-symmetric-row'
    pairMode?: string; // 'gender-pair' | 'same-gender-pair'
    partitionCount?: number; // 분단 수
    groupSize?: string; // 'group-3' | 'group-4' | 'group-5' | 'group-6'
    classId?: string; // 반 ID (검증을 위해 저장)
}

/**
 * UIManager가 필요로 하는 의존성 인터페이스
 */
export interface UIManagerDependencies {
    outputModule: OutputModule;
    isDevelopmentMode: () => boolean;
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    addEventListenerSafe: (element: EventTarget, event: string, handler: EventListener | ((e: Event) => void), options?: boolean | AddEventListenerOptions) => void;
    storageManager: StorageManager;
    // Student 및 Seat 관리
    getStudents: () => Student[];
    setStudents: (students: Student[]) => void;
    getSeats: () => Seat[];
    setSeats: (seats: Seat[]) => void;
    // MainController 메서드들
    validateAndFixStudentInput: (input: HTMLInputElement, inputType: 'male' | 'female') => void;
    renderExampleCards: () => void;
    getSeatHistory: () => SeatHistoryItem[];
    deleteHistoryItem: (historyId: string) => void;
    loadHistoryItem: (historyId: string) => void;
}

/**
 * UI 관리자 클래스
 */
export class UIManager {
    private deps: UIManagerDependencies;

    constructor(dependencies: UIManagerDependencies) {
        this.deps = dependencies;
    }

    /**
     * 성별별 학생 수에 따라 미리보기 업데이트
     */
    public updatePreviewForGenderCounts(): void {
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        
        // 입력 검증
        if (maleCountInput) {
            this.deps.validateAndFixStudentInput(maleCountInput, 'male');
        }
        if (femaleCountInput) {
            this.deps.validateAndFixStudentInput(femaleCountInput, 'female');
        }
        
        const maleCount = maleCountInput ? parseInt(maleCountInput.value || '0', 10) : 0;
        const femaleCount = femaleCountInput ? parseInt(femaleCountInput.value || '0', 10) : 0;
        
        // 0명 체크
        if (maleCount === 0 && femaleCount === 0) {
            // 0명인 경우 빈 레이아웃 표시
            const seatsArea = document.getElementById('seats-area');
            if (seatsArea) {
                seatsArea.innerHTML = '';
            }
            this.deps.setStudents([]);
            this.deps.setSeats([]);
            return;
        }
        
        // 학생 및 좌석 배열 초기화
        const students: Student[] = [];
        const seats: Seat[] = [];
        
        let studentIndex = 0;
        
        // 남학생 생성
        for (let i = 0; i < maleCount && i < 100; i++) {
            const student = StudentModel.create(
                `남학생${i + 1}`,
                'M'
            );
            students.push(student);
            
            // 좌석 생성 (더미)
            const seat = {
                id: studentIndex + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            } as Seat;
            seats.push(seat);
            studentIndex++;
        }
        
        // 여학생 생성
        for (let i = 0; i < femaleCount && i < 100; i++) {
            const student = StudentModel.create(
                `여학생${i + 1}`,
                'F'
            );
            students.push(student);
            
            // 좌석 생성 (더미)
            const seat = {
                id: studentIndex + 1,
                position: { x: 0, y: 0 },
                isActive: true,
                isFixed: false,
                studentId: student.id,
                studentName: student.name
            } as Seat;
            seats.push(seat);
            studentIndex++;
        }
        
        // 학생 및 좌석 설정
        this.deps.setStudents(students);
        this.deps.setSeats(seats);
        
        // 미리보기 렌더링
        this.deps.renderExampleCards();
    }

    /**
     * 학생 테이블 통계 업데이트
     */
    public updateStudentTableStats(): void {
        const statsCell = document.getElementById('student-table-stats-cell');
        // 통계 셀이 없으면 테이블이 아직 생성되지 않았거나 제거된 상태
        if (!statsCell) return;

        const outputSection = document.getElementById('output-section');
        const rows = outputSection?.querySelectorAll('.student-input-table tbody tr') || [];
        
        // rows가 없어도 통계는 표시해야 함 (0명일 수도 있으므로)

        let maleCount = 0;
        let femaleCount = 0;
        let fixedSeatCount = 0;

        rows.forEach((row) => {
            const genderSelect = row.querySelector('.student-gender-select') as HTMLSelectElement;
            const fixedSeatSelect = row.querySelector('.fixed-seat-select') as HTMLSelectElement;
            
            if (genderSelect) {
                const gender = genderSelect.value;
                if (gender === 'M') {
                    maleCount++;
                } else if (gender === 'F') {
                    femaleCount++;
                }
            }

            if (fixedSeatSelect && fixedSeatSelect.value) {
                fixedSeatCount++;
            }
        });

        // 사이드바의 남녀 숫자 가져오기
        const maleCountInput = document.getElementById('male-students') as HTMLInputElement;
        const femaleCountInput = document.getElementById('female-students') as HTMLInputElement;
        
        const expectedMaleCount = maleCountInput ? parseInt(maleCountInput.value || '0', 10) : 0;
        const expectedFemaleCount = femaleCountInput ? parseInt(femaleCountInput.value || '0', 10) : 0;

        // 통계 표시
        let statsHTML = `
            <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                <span><strong>남자:</strong> <span id="stats-male-count">${maleCount}</span>명</span>
                <span><strong>여자:</strong> <span id="stats-female-count">${femaleCount}</span>명</span>
                <span><strong>고정 자리:</strong> <span id="stats-fixed-seat-count">${fixedSeatCount}</span>개</span>
            </div>
        `;

        statsCell.innerHTML = statsHTML;
        
        // 자동 동기화 제거: 사용자가 명시적으로 '저장' 버튼을 클릭할 때만 동기화
    }

    /**
     * 히스토리 드롭다운 초기화
     */
    public initializeHistoryDropdown(): void {
        // 드롭다운은 항상 표시되므로 내용만 업데이트
        this.updateHistoryDropdown();
    }

    /**
     * 히스토리 드롭다운 업데이트
     */
    public updateHistoryDropdown(): void {
        const historyContent = document.getElementById('history-dropdown-content');
        if (!historyContent) return;

        const history = this.deps.getSeatHistory();

        // 기존 내용 제거
        historyContent.innerHTML = '';

        if (history.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'history-empty';
            emptyDiv.id = 'history-empty';
            emptyDiv.textContent = '확정된 자리 이력이 없습니다.';
            historyContent.appendChild(emptyDiv);
            return;
        }

        // 최신 항목이 위에 오도록 timestamp 기준 내림차순 정렬
        const sortedHistory = [...history].sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });

        // 같은 날짜별로 그룹화하여 번호 매기기
        const dateGroups: {[key: string]: Array<typeof sortedHistory[0]>} = {};
        sortedHistory.forEach(item => {
            if (!dateGroups[item.date]) {
                dateGroups[item.date] = [];
            }
            dateGroups[item.date].push(item);
        });

        // 각 날짜별로 항목에 번호 부여 (최신 항목이 높은 번호를 받도록)
        const itemNumberMap: {[id: string]: number} = {};
        Object.keys(dateGroups).forEach(date => {
            const items = dateGroups[date];
            // 같은 날짜 내에서도 timestamp 기준으로 정렬 (최신이 앞)
            items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            // 최신 항목부터 높은 번호 부여 (3, 2, 1 순서)
            items.forEach((item, index) => {
                itemNumberMap[item.id] = items.length - index;
            });
        });

        // 이력 항목들 추가 (최신순으로)
        sortedHistory.forEach(item => {
            const historyItemContainer = document.createElement('div');
            historyItemContainer.className = 'history-item-container';
            historyItemContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 2px 8px; border-bottom: 1px solid #eee; transition: background 0.2s; writing-mode: horizontal-tb; text-orientation: mixed;';
            
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.historyId = item.id;
            historyItem.style.cssText = 'flex: 1; cursor: pointer; color: #333; font-size: 0.9em; writing-mode: horizontal-tb; text-orientation: mixed; white-space: nowrap;';
            
            // 같은 날짜가 여러 개인 경우 번호 추가 (최신 항목이 높은 번호)
            let displayText = `${item.date} 확정자리`;
            const itemCount = dateGroups[item.date]?.length || 0;
            if (itemCount > 1) {
                const itemNumber = itemNumberMap[item.id] || 1;
                displayText = `${item.date} 확정자리 (${itemNumber})`;
            }
            
            historyItem.textContent = displayText;
            historyItemContainer.appendChild(historyItem);
            
            // 삭제 버튼 추가
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = '삭제';
            deleteBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 1em; padding: 4px 8px; color: #dc3545; opacity: 0.7; transition: opacity 0.2s; margin-left: 8px;';
            this.deps.addEventListenerSafe(deleteBtn, 'click', (e) => {
                e.stopPropagation(); // 클릭 이벤트 전파 방지
                this.deps.deleteHistoryItem(item.id);
            });
            this.deps.addEventListenerSafe(deleteBtn, 'mouseenter', () => {
                deleteBtn.style.opacity = '1';
            });
            this.deps.addEventListenerSafe(deleteBtn, 'mouseleave', () => {
                deleteBtn.style.opacity = '0.7';
            });
            
            historyItemContainer.appendChild(deleteBtn);
            historyContent.appendChild(historyItemContainer);
            
            // 클릭 이벤트는 historyItem에만 추가
            this.deps.addEventListenerSafe(historyItem, 'click', () => {
                this.deps.loadHistoryItem(item.id);
            });
            
            this.deps.addEventListenerSafe(historyItem, 'mouseenter', () => {
                historyItemContainer.style.background = '#f0f0f0';
            });
            this.deps.addEventListenerSafe(historyItem, 'mouseleave', () => {
                historyItemContainer.style.background = '';
            });
        });
    }
}




