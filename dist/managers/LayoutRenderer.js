/**
 * 레이아웃 렌더러
 * 학생 카드 및 좌석 배치 렌더링 담당
 */
import { logger } from '../utils/logger.js';
/**
 * 레이아웃 렌더러 클래스
 */
export class LayoutRenderer {
    constructor(dependencies) {
        this.deps = dependencies;
    }
    /**
     * 최종 자리 배치도 렌더링
     */
    renderFinalLayout(seats) {
        // 카드 컨테이너 표시
        const cardContainer = document.getElementById('card-layout-container');
        if (!cardContainer) {
            logger.error('카드 컨테이너를 찾을 수 없습니다.');
            return;
        }
        cardContainer.style.display = 'block';
        // 헤더 제목 변경
        const mainHeader = document.querySelector('.main-header h2');
        if (mainHeader) {
            mainHeader.textContent = '자리 배치도';
        }
        // 실제 학생 데이터로 카드 렌더링
        this.renderStudentCards(seats);
    }
    /**
     * 학생 데이터로 카드 렌더링
     */
    renderStudentCards(seats) {
        const seatsArea = document.getElementById('seats-area');
        if (!seatsArea)
            return;
        // 기존 카드 제거
        seatsArea.innerHTML = '';
        // 좌석 번호를 1부터 시작하도록 초기화
        this.deps.setNextSeatId(1);
        // 현재 선택된 배치 형태 확인
        const layoutTypeInput = document.querySelector('input[name="layout-type"]:checked');
        const layoutType = layoutTypeInput ? layoutTypeInput.value : '';
        const groupSizeInput = document.querySelector('input[name="group-size"]:checked');
        const groupSize = groupSizeInput ? groupSizeInput.value : '';
        // 모둠 배치인지 확인
        const isGroupLayout = layoutType === 'group' && (groupSize === 'group-3' || groupSize === 'group-4' || groupSize === 'group-5' || groupSize === 'group-6');
        const groupSizeNumber = groupSize === 'group-3' ? 3 : groupSize === 'group-4' ? 4 : groupSize === 'group-5' ? 5 : groupSize === 'group-6' ? 6 : 0;
        if (isGroupLayout && groupSizeNumber > 0) {
            // 모둠 배치: 카드를 그룹으로 묶어서 표시
            this.renderGroupCards(seats, groupSizeNumber, seatsArea);
        }
        else {
            // 일반 배치: 기존 방식대로 표시
            const students = this.deps.getStudents();
            // 학생 수에 따라 그리드 열 수 결정
            const columnCount = students.length <= 20 ? 4 : 6;
            seatsArea.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
            seatsArea.style.gap = '10px';
            seatsArea.style.display = 'grid';
            seats.forEach((seat, index) => {
                if (index >= students.length)
                    return;
                const student = students[index];
                const card = this.createStudentCard(student, index);
                seatsArea.appendChild(card);
            });
        }
        // 렌더 후 드래그&드롭 스왑 핸들러 보장
        this.deps.enableSeatSwapDragAndDrop();
        // 초기 렌더링 후 첫 번째 상태를 히스토리에 저장
        this.deps.setTimeoutSafe(() => {
            this.deps.saveLayoutToHistory();
        }, 100);
    }
    /**
     * 모둠 배치로 카드 렌더링 (그룹으로 묶어서 표시)
     */
    renderGroupCards(seats, groupSize, seatsArea) {
        const students = this.deps.getStudents();
        // students가 비어있으면 임시 학생 데이터 생성
        let studentsToUse = [];
        if (students.length === 0) {
            const maleCount = parseInt(document.getElementById('male-students')?.value || '0', 10);
            const femaleCount = parseInt(document.getElementById('female-students')?.value || '0', 10);
            const totalCount = maleCount + femaleCount;
            // 임시 학생 데이터 생성
            const tempStudents = [];
            for (let i = 0; i < totalCount; i++) {
                const gender = i < maleCount ? 'M' : 'F';
                tempStudents.push({
                    id: i + 1,
                    name: gender === 'M' ? `남학생${i + 1}` : `여학생${i - maleCount + 1}`,
                    gender: gender
                });
            }
            studentsToUse = tempStudents;
        }
        else {
            studentsToUse = [...students];
        }
        // 남녀 섞기 옵션 확인
        const genderMixCheckbox = document.getElementById('group-gender-mix');
        const shouldMixGender = genderMixCheckbox ? genderMixCheckbox.checked : false;
        // 남녀 섞기 옵션이 체크되어 있으면 각 모둠에 남녀가 균등하게 섞이도록 배치
        if (shouldMixGender && students.length > 0) {
            // 남학생과 여학생 분리
            const maleStudents = studentsToUse.filter(s => s.gender === 'M');
            const femaleStudents = studentsToUse.filter(s => s.gender === 'F');
            // 각 그룹에 배치할 남녀 수 계산
            const totalStudents = studentsToUse.length;
            const groupCount = Math.ceil(totalStudents / groupSize);
            const malesPerGroup = Math.floor(maleStudents.length / groupCount);
            const femalesPerGroup = Math.floor(femaleStudents.length / groupCount);
            const remainingMales = maleStudents.length % groupCount;
            const remainingFemales = femaleStudents.length % groupCount;
            // 각 그룹별로 남녀를 균등하게 배치
            let maleIndex = 0;
            let femaleIndex = 0;
            const mixedStudents = [];
            for (let groupIdx = 0; groupIdx < groupCount; groupIdx++) {
                // 현재 그룹에 배치할 남녀 수 (남은 학생들을 앞 그룹에 배치)
                const currentMales = malesPerGroup + (groupIdx < remainingMales ? 1 : 0);
                const currentFemales = femalesPerGroup + (groupIdx < remainingFemales ? 1 : 0);
                // 남학생 추가
                for (let i = 0; i < currentMales && maleIndex < maleStudents.length; i++) {
                    mixedStudents.push(maleStudents[maleIndex++]);
                }
                // 여학생 추가
                for (let i = 0; i < currentFemales && femaleIndex < femaleStudents.length; i++) {
                    mixedStudents.push(femaleStudents[femaleIndex++]);
                }
            }
            // 각 그룹 내에서 남녀를 섞기
            for (let groupIdx = 0; groupIdx < groupCount; groupIdx++) {
                const startIdx = groupIdx * groupSize;
                const endIdx = Math.min(startIdx + groupSize, mixedStudents.length);
                // 그룹 내에서만 섞기
                for (let i = endIdx - 1; i > startIdx; i--) {
                    const j = startIdx + Math.floor(Math.random() * (i - startIdx + 1));
                    [mixedStudents[i], mixedStudents[j]] = [mixedStudents[j], mixedStudents[i]];
                }
            }
            studentsToUse = mixedStudents;
        }
        // 분단 수 가져오기
        const partitionInput = document.getElementById('number-of-partitions');
        const partitionCount = partitionInput ? parseInt(partitionInput.value || '3', 10) : 3;
        // 그리드 레이아웃 설정 (모둠별로 배치)
        seatsArea.style.display = 'grid';
        seatsArea.style.gap = '20px 40px'; // 모둠 간 간격 (세로 20px, 가로 40px - 모둠 간 넓은 간격)
        seatsArea.style.gridTemplateColumns = `repeat(${partitionCount}, 1fr)`;
        seatsArea.style.justifyContent = 'center';
        seatsArea.style.justifyItems = 'center'; // 각 모둠 컨테이너를 중앙 정렬
        // 그룹 내 그리드 설정 (3명: 2x2, 4명: 2x2, 5명: 2x3, 6명: 2x3)
        let colsPerGroup;
        let rowsPerGroup;
        if (groupSize === 3) {
            colsPerGroup = 2; // 3명: 가로 2개
            rowsPerGroup = 2; // 3명: 세로 2개
        }
        else if (groupSize === 4) {
            colsPerGroup = 2; // 4명: 가로 2개
            rowsPerGroup = 2; // 4명: 세로 2개
        }
        else if (groupSize === 5) {
            colsPerGroup = 2; // 5명: 가로 2개
            rowsPerGroup = 3; // 5명: 세로 3개
        }
        else { // groupSize === 6
            colsPerGroup = 2; // 6명: 가로 2개
            rowsPerGroup = 3; // 6명: 세로 3개
        }
        // 학생들을 그룹으로 나누기 (섞인 학생 배열 사용)
        const totalStudents = studentsToUse.length;
        const groupCount = Math.ceil(totalStudents / groupSize);
        // 모둠별 그룹 수 계산
        const groupsPerPartition = Math.ceil(groupCount / partitionCount);
        // 모둠별로 그룹 배치
        for (let partitionIndex = 0; partitionIndex < partitionCount; partitionIndex++) {
            const partitionStartGroup = partitionIndex * groupsPerPartition;
            const partitionEndGroup = Math.min(partitionStartGroup + groupsPerPartition, groupCount);
            // 모둠 컨테이너 생성 (레이블과 그룹들을 함께 묶음)
            const partitionContainer = document.createElement('div');
            partitionContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                width: 100%;
            `;
            // 분단 레이블 추가 (모둠 컨테이너 내부에)
            const label = document.createElement('div');
            label.textContent = `${partitionIndex + 1}분단`;
            label.style.textAlign = 'center';
            label.style.fontWeight = 'bold';
            label.style.color = '#667eea';
            label.style.fontSize = '0.9em';
            label.style.width = '100%';
            partitionContainer.appendChild(label);
            // 각 모둠 내의 그룹들을 담을 컨테이너
            const groupsContainer = document.createElement('div');
            groupsContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                width: 100%;
            `;
            // 각 모둠 내의 그룹들
            for (let groupIndex = partitionStartGroup; groupIndex < partitionEndGroup; groupIndex++) {
                // 그룹 컨테이너 생성
                const groupContainer = document.createElement('div');
                groupContainer.className = 'seat-group-container';
                // 그리드 행 수도 명시적으로 설정
                const gridTemplateRows = groupSize === 3 ? 'repeat(2, 1fr)' :
                    groupSize === 4 ? 'repeat(2, 1fr)' :
                        groupSize === 5 ? 'repeat(3, 1fr)' :
                            'repeat(3, 1fr)'; // 6명
                groupContainer.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(${colsPerGroup}, 1fr);
                    grid-template-rows: ${gridTemplateRows};
                    gap: 0;
                    border: 3px solid #667eea;
                    border-radius: 12px;
                    padding: 5px;
                    background: #f8f9fa;
                    width: fit-content;
                    min-width: 250px;
                    box-sizing: border-box;
                `;
                // 그룹 내 카드 생성
                const startIndex = groupIndex * groupSize;
                const endIndex = Math.min(startIndex + groupSize, totalStudents);
                for (let i = startIndex; i < endIndex; i++) {
                    if (!studentsToUse[i]) {
                        logger.warn(`학생 데이터 없음 - index: ${i}`);
                        continue;
                    }
                    const student = studentsToUse[i];
                    const card = this.createStudentCard(student, i);
                    // 그룹 내 카드는 gap 없이 붙여서 표시
                    card.style.margin = '0';
                    card.style.borderRadius = '0';
                    card.style.width = '100%';
                    card.style.height = '100%';
                    card.style.minWidth = '0';
                    card.style.maxWidth = 'none';
                    card.style.boxSizing = 'border-box';
                    card.style.position = 'relative';
                    const positionInGroup = i - startIndex;
                    const row = Math.floor(positionInGroup / colsPerGroup);
                    const col = positionInGroup % colsPerGroup;
                    const isLastRow = row === rowsPerGroup - 1 || i === endIndex - 1 || (i + 1 - startIndex) > (row + 1) * colsPerGroup;
                    const isFirstRow = row === 0;
                    const isFirstCol = col === 0;
                    const isLastCol = col === colsPerGroup - 1 || (i === endIndex - 1 && (i - startIndex) % colsPerGroup === (endIndex - startIndex - 1) % colsPerGroup);
                    // 모서리 둥글게 처리
                    if (isFirstRow && isFirstCol) {
                        card.style.borderTopLeftRadius = '8px';
                    }
                    if (isFirstRow && isLastCol) {
                        card.style.borderTopRightRadius = '8px';
                    }
                    if (isLastRow && isFirstCol) {
                        card.style.borderBottomLeftRadius = '8px';
                    }
                    if (isLastRow && isLastCol) {
                        card.style.borderBottomRightRadius = '8px';
                    }
                    groupContainer.appendChild(card);
                }
                groupsContainer.appendChild(groupContainer);
            }
            // groupsContainer를 partitionContainer에 추가
            partitionContainer.appendChild(groupsContainer);
            // partitionContainer를 seatsArea에 추가
            seatsArea.appendChild(partitionContainer);
        }
    }
    /**
     * 학생 카드 생성
     */
    createStudentCard(student, index) {
        const card = document.createElement('div');
        card.className = 'student-seat-card';
        card.setAttribute('draggable', 'true');
        // 좌석 고유 ID 부여
        const seatId = this.deps.incrementNextSeatId();
        card.setAttribute('data-seat-id', seatId.toString());
        // 접근성 개선: ARIA 레이블 추가
        card.setAttribute('role', 'button');
        // 성별 아이콘 정보 포함
        const genderLabel = student.gender === 'M' ? '남학생 ♂' : '여학생 ♀';
        card.setAttribute('aria-label', `좌석 ${seatId}: ${student.name} (${genderLabel})`);
        card.setAttribute('tabindex', '0');
        // 좌석 번호 표시 (좌측 상단)
        const seatNumberDiv = document.createElement('div');
        seatNumberDiv.className = 'seat-number-label';
        seatNumberDiv.textContent = `#${seatId}`;
        seatNumberDiv.setAttribute('aria-hidden', 'true');
        seatNumberDiv.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            font-size: 0.8em;
            font-weight: bold;
            color: #667eea;
            background: rgba(255, 255, 255, 0.9);
            padding: 2px 6px;
            border-radius: 4px;
            z-index: 5;
        `;
        card.appendChild(seatNumberDiv);
        const nameDiv = document.createElement('div');
        nameDiv.className = 'student-name';
        // 긴 이름 처리: 20자 이상이면 말줄임표 표시 및 툴팁 추가
        const displayName = student.name.length > 20 ? student.name.substring(0, 20) + '...' : student.name;
        nameDiv.textContent = displayName;
        if (student.name.length > 20) {
            nameDiv.setAttribute('title', student.name);
            nameDiv.setAttribute('aria-label', student.name);
        }
        nameDiv.style.display = 'flex';
        nameDiv.style.alignItems = 'center';
        nameDiv.style.justifyContent = 'center';
        nameDiv.style.height = '100%';
        nameDiv.style.width = '100%';
        nameDiv.style.overflow = 'hidden';
        nameDiv.style.textOverflow = 'ellipsis';
        nameDiv.style.whiteSpace = 'nowrap';
        nameDiv.style.padding = '0 5px';
        // 성별에 따라 클래스 추가
        if (student.gender === 'M') {
            card.classList.add('gender-m');
        }
        else {
            card.classList.add('gender-f');
        }
        card.appendChild(nameDiv);
        // 이미 고정된 좌석인 경우 시각적 표시
        const fixedSeatIds = this.deps.getFixedSeatIds();
        if (fixedSeatIds.has(seatId)) {
            card.classList.add('fixed-seat');
            card.setAttribute('aria-label', `고정 좌석 ${seatId}: ${student.name} (${student.gender === 'M' ? '남학생' : '여학생'}) - 클릭하여 해제`);
            card.title = '고정 좌석 (클릭하여 해제)';
            // 🔒 아이콘 추가
            const lockIcon = document.createElement('div');
            lockIcon.className = 'fixed-seat-lock';
            lockIcon.textContent = '🔒';
            lockIcon.setAttribute('aria-hidden', 'true');
            lockIcon.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10; pointer-events: none;';
            card.appendChild(lockIcon);
        }
        // 키보드 네비게이션 지원
        this.deps.addEventListenerSafe(card, 'keydown', (e) => {
            const ke = e;
            if (ke.key === 'Enter' || ke.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
        // 고정 좌석 모드일 때 클릭 이벤트 추가
        this.deps.setupFixedSeatClickHandler(card, seatId);
        return card;
    }
}
//# sourceMappingURL=LayoutRenderer.js.map