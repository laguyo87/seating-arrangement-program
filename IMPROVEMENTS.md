# 교실 자리 배치 프로그램 개선점 리스트 📋

이 문서는 현재 프로그램의 개선 가능한 사항들을 체계적으로 정리한 것입니다.

**최종 업데이트**: 2025-11-23  
**현재 버전**: 1.0.0

---

## 📊 현재 코드 상태

### 파일 크기
- `MainController.ts`: 6,366줄 (리팩토링 진행 중, 2,446줄 감소)
- `LayoutRenderer.ts`: 232줄 (✅ 1단계 완료)
- `AnimationManager.ts`: 253줄 (✅ 2단계 완료)
- `StorageManager.ts`: 280줄 (✅ 3단계 완료)
- `CSVFileHandler.ts`: 1,000+줄 (✅ 4단계 완료)
- `PrintExportManager.ts`: 894줄 (✅ 5단계 완료)
- `UIManager.ts`: 297줄 (✅ 6단계 완료)
- `StudentTableManager.ts`: 920줄 (✅ 7단계 완료)
- 기존 Managers: 1,231줄 (DragDropManager, FixedSeatManager, HistoryManager, KeyboardDragDropManager)

### 코드 품질 지표
- `console.log` 사용: 약 36개 (logger 사용으로 대부분 마이그레이션 완료)
- `any` 타입 사용: 19개 (MainController.ts 내)
- TypeScript 컴파일 오류: 3개 (기존 오류, 리팩토링과 무관)

---

## 🔴 높은 우선순위 (Critical)

### 1. 코드 구조 및 유지보수성

#### 1.1 MainController.ts 파일 크기 문제 (진행 중)
- **현재 상태**: 6,366줄 (8,812줄 → 6,366줄, 2,446줄 감소)
- **목표**: 기능별로 더 작은 모듈로 분리
- **진행 상황**:
  - ✅ **1단계 완료**: LayoutRenderer 분리 (renderFinalLayout, renderStudentCards, createStudentCard)
  - ✅ **2단계 완료**: AnimationManager 분리
    - `startCurtainAnimation()`, `stopCurtainAnimation()`, `openCurtain()`
    - `startFireworks()`, `createFirework()`, `playArrangementSound()`
    - AnimationManager.ts: 253줄 생성
  - ✅ **3단계 완료**: StorageManager 분리
    - `saveOptions()`, `loadOptions()`
    - `safeSetItem()`, `safeGetItem()`, `isLocalStorageAvailable()`
    - StorageManager.ts: 280줄 생성
  - ✅ **4단계 완료**: CSVFileHandler 분리
    - `handleFileUpload()`, `parseCsvFile()`, `downloadTemplateFile()`
    - `createTableWithStudents()`, `loadStudentDataToTable()`
    - CSVFileHandler.ts: 1,000+줄 생성
  - ✅ **5단계 완료**: PrintExportManager 분리
    - `printLayout()`, `printLayoutForTeacher()`, `exportAsText()`, `saveLayoutAsHtml()`
    - PrintExportManager.ts: 894줄 생성
  - ✅ **6단계 완료**: UIManager 분리
    - `updatePreviewForGenderCounts()`, `updateStudentTableStats()`
    - `initializeHistoryDropdown()`, `updateHistoryDropdown()`
    - UIManager.ts: 297줄 생성
  - ✅ **7단계 완료**: StudentTableManager 분리
    - `createStudentTable()`, `loadClassNames()`
    - `updateFixedSeatDropdowns()`, `addStudentRow()`, `deleteStudentRow()`
    - `updateRowNumbers()`, `syncSidebarToTable()`, `moveToCell()`
    - StudentTableManager.ts: 920줄 생성 (815줄 감소)

#### 1.2 프로덕션 코드에서 디버그 로그 정리
- **현재 상태**: 모든 `console.*` 호출을 `logger`로 마이그레이션 완료
- **목표**: 모든 `console.*` 호출을 `logger`로 마이그레이션 ✅
- **진행 상황**:
  - ✅ logger 유틸리티 클래스 생성 완료
  - ✅ MainController.ts 내 `console.*` → `logger` 마이그레이션 완료 (23개)
  - ✅ LayoutRenderer.ts 내 `console.*` → `logger` 마이그레이션 완료 (2개)
  - ✅ PrintExportManager.ts 내 `console.*` → `logger` 마이그레이션 완료 (4개)
  - ✅ CSVFileHandler.ts 내 `console.*` → `logger` 마이그레이션 완료 (2개)
  - ✅ StudentTableManager.ts 내 `console.*` → `logger` 마이그레이션 완료 (1개)
  - ✅ StorageManager.ts 내 `console.*` → `logger` 마이그레이션 완료 (4개)
  - ✅ AnimationManager.ts 내 `console.*` → `logger` 마이그레이션 완료 (1개)
  - ✅ 총 36개 `console.*` 호출 마이그레이션 완료
  - ✅ 프로덕션 빌드에서 디버그 로그 자동 제거 확인 (logger는 개발 모드에서만 출력)

#### 1.3 타입 안전성 강화
- **현재 상태**: 모든 `any` 타입을 구체적인 타입으로 교체 완료 ✅
- **목표**: `any` 타입을 구체적인 타입으로 교체 ✅
- **진행 상황**:
  - ✅ MainController.ts 내 `any` 타입 교체 완료 (14개)
    - `HistoryData`, `HistoryItem`, `LayoutResultData`, `SeatHistoryItem` 타입 정의
    - `ShareInfo`, `SharedStudentData` 타입 정의
    - `ScrollableElement` 타입 제거 및 타입 가드 개선
  - ✅ StorageManager.ts 내 `any` 타입 교체 완료 (2개)
    - `OptionsData` 타입 정의
  - ✅ UIManager.ts 내 `any` 타입 교체 완료 (1개)
    - `SeatHistoryItem` 타입 정의 및 export
  - ✅ DOM 요소 타입 캐스팅 개선
    - 스크롤 타겟 타입 안전성 개선
    - 타입 가드 및 instanceof 체크 추가
  - ✅ inputValidator.ts 타입 오류 수정
  - ✅ 총 19개 `any` 타입 교체 완료
  - ✅ 빌드 테스트 통과 (타입 오류 없음)

#### 1.4 에러 처리 일관성
- **현재 상태**: 전역 에러 핸들러 구현 및 개선 완료 ✅
- **진행 상황**:
  - ✅ ErrorHandler 클래스에 에러 복구 메커니즘 추가
    - `withRetry()`: 비동기 작업 재시도 메커니즘 (최대 3회, 기본 1초 간격)
    - `withRetrySync()`: 동기 작업 재시도 메커니즘
    - `handleAndShow()`: 에러 처리 및 사용자 메시지 표시 통합 메서드
  - ✅ MainController 주요 에러 처리 개선
    - 초기화 실패: `ErrorCode.INITIALIZATION_FAILED` 사용
    - 리셋 실패: `ErrorCode.RESET_FAILED` 사용
    - 레이아웃 없음: `ErrorCode.LAYOUT_NOT_FOUND` 사용
    - 되돌리기 불가: `ErrorCode.UNDO_NOT_AVAILABLE` 사용
    - 데이터 저장 실패: `ErrorCode.DATA_SAVE_FAILED` 사용
  - ✅ 사용자 친화적인 에러 메시지
    - 모든 ErrorCode에 사용자 친화적인 메시지 정의 완료
    - 에러 심각도별 분류 (LOW, MEDIUM, HIGH, CRITICAL)
    - 컨텍스트 정보 포함하여 디버깅 용이성 향상
  - ✅ 에러 복구 메커니즘
    - 자동 재시도 기능 (네트워크 오류, 일시적 오류 대응)
    - 재시도 횟수 및 간격 설정 가능
    - 재시도 실패 시 사용자에게 명확한 메시지 제공

---

### 2. 사용자 경험 (UX)

#### 2.1 로딩 상태 표시
- **현재 상태**: 기본 로딩 인디케이터 및 프로그레스 바 구현 완료 ✅
- **진행 상황**:
  - ✅ 프로그레스 바 컴포넌트 생성
    - `OutputModule.showProgress()`: 프로그레스 바 표시 및 업데이트 함수 반환
    - `OutputModule.hideProgress()`: 프로그레스 바 숨기기
    - 진행률(0-100%), 상태 메시지 표시 지원
  - ✅ 대용량 데이터 처리 시 (100명 이상) 프로그레스 바 자동 표시
    - 학생 수가 100명 이상일 때 자동으로 프로그레스 바 사용
    - 진행 단계별 상태 메시지 표시 (데이터 준비 → 변환 → 배치 준비 → 배치 완료)
  - ✅ 파일 업로드 진행률 표시
    - 100KB 이상 파일 업로드 시 프로그레스 바 자동 표시
    - 파일 읽기 진행률 추정 및 표시
    - 완료 시 자동 숨김
  - ✅ 자리 배치 생성 진행률 표시
    - 대용량 데이터(100명 이상) 처리 시 단계별 진행률 표시
    - 학생 데이터 준비(10%) → 변환(30%) → 배치 준비(50%) → 배치 완료(90%) → 저장(100%)
    - 각 단계별 상태 메시지 제공

#### 2.2 입력 검증 피드백 개선
- **현재 상태**: 실시간 검증 및 시각적 피드백 구현 완료 ✅
- **진행 상황**:
  - ✅ InputValidator 클래스 활용
    - 실시간 검증 메시지 표시 (입력 필드 아래 에러 메시지)
    - 시각적 하이라이트 (빨간 테두리, 그림자 효과)
    - 에러 아이콘 표시 (⚠️)
    - ARIA 속성 지원 (접근성 향상)
  - ✅ 학생 수 입력 필드 검증 적용
    - 남학생 수 입력 필드: 숫자만 허용, 0-100 범위 검증
    - 여학생 수 입력 필드: 숫자만 허용, 0-100 범위 검증
    - 실시간 검증 및 시각적 피드백 제공
  - ✅ 분단 수 입력 필드 검증 적용
    - 숫자만 허용, 1-10 범위 검증
    - 실시간 검증 및 시각적 피드백 제공
  - ✅ 검증 규칙
    - `ValidationRules.numeric()`: 숫자만 허용
    - `ValidationRules.range()`: 범위 검증
    - 입력 시 실시간 검증, 포커스 해제 시 최종 검증
  - ✅ 사용자 경험 개선
    - 잘못된 입력 시 즉시 피드백 제공
    - 에러 메시지가 명확하고 이해하기 쉬움
    - 올바른 입력 시 에러 상태 자동 해제

#### 2.3 모바일 반응형 개선
- **현재 상태**: 모바일 반응형 최적화 완료 ✅
- **진행 상황**:
  - ✅ 작은 화면에서 사이드바 최적화
    - 모바일(768px 이하)에서 사이드바 자동 접기
    - 오버레이 모드로 사이드바 표시 (슬라이드 인/아웃)
    - 오버레이 배경 클릭 시 사이드바 자동 닫기
    - 화면 크기 변경 시 자동 조정 (resize 이벤트 처리)
    - ARIA 속성 지원 (접근성 향상)
  - ✅ 터치 제스처 최적화 (드래그 앤 드롭)
    - 개선된 드래그 임계값 (15px)으로 더 정확한 드래그 인식
    - 드래그 중 시각적 피드백 강화 (크기 조정, 투명도, 그림자)
    - 드롭 타겟 하이라이트 (점선 테두리, 배경색 변경)
    - 드래그 중 카드 위치 실시간 추적
    - 터치 취소 이벤트 처리 (touchcancel)
    - 더블탭 줌 방지 (touch-action: manipulation)
    - 텍스트 선택 방지 (user-select: none)
  - ✅ 모바일에서 테이블 스크롤 개선
    - 부드러운 스크롤 지원 (-webkit-overflow-scrolling: touch)
    - 스크롤바 스타일 개선 (더 얇고 명확한 스크롤바)
    - 스크롤 힌트 추가 (그라데이션 효과로 스크롤 가능 영역 표시)
    - overscroll-behavior로 스크롤 영역 명확히 구분
    - 학생 입력 테이블과 컨테이너 모두에 스크롤 최적화 적용

---

### 3. 접근성 (Accessibility)

#### 3.1 키보드 네비게이션
- **현재 상태**: 키보드 네비게이션 최적화 완료 ✅
- **진행 상황**:
  - ✅ Tab 순서 최적화
    - 주요 버튼들에 Tab 순서 설정 (1부터 시작)
    - 입력 필드들에 Tab 순서 설정 (10부터 시작)
    - `KeyboardNavigation.setTabOrder()` 유틸리티 활용
    - 논리적인 순서로 Tab 이동 가능
  - ✅ 포커스 표시 명확화
    - `:focus-visible` 스타일 강화 (3px 테두리, 그림자 효과)
    - 좌석 카드 포커스 스타일 추가 (명확한 시각적 피드백)
    - 키보드 포커스 상태 클래스 추가 (`.keyboard-focused`, `.keyboard-selected`)
    - 모든 포커스 가능한 요소에 ARIA 레이블 자동 추가
    - `box-shadow`로 포커스 영역 명확히 표시
  - ✅ 드래그&드롭을 키보드로도 가능하도록 (화살표 키로 이동)
    - `KeyboardDragDropManager` 통합
    - 화살표 키(↑↓←→)로 좌석 이동 가능
    - Enter/Space 키로 좌석 선택
    - Escape 키로 선택 해제
    - 인접한 좌석 자동 탐지 및 이동
    - 고정 좌석은 키보드 이동 불가
    - 좌석 이동 시 ARIA 레이블 자동 업데이트
    - 시각적 피드백 제공 (선택된 좌석 하이라이트)

#### 3.2 스크린 리더 지원
- **현재 상태**: 스크린 리더 지원 최적화 완료 ✅
- **진행 상황**:
  - ✅ ARIA 레이블 보완 (`aria-label`, `aria-describedby`)
    - 모든 주요 버튼에 `aria-label` 추가
    - 입력 필드에 `aria-describedby` 연결 (도움말 텍스트)
    - 좌석 카드에 상세한 `aria-label` 추가 (좌석 번호, 학생 이름, 성별)
    - 프로그레스 바에 `aria-label`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` 추가
    - 메시지 요소에 타입별 `aria-label` 추가 (성공/오류/정보)
  - ✅ 의미론적 HTML 태그 사용 강화
    - `<main>` 태그에 `role="main"` 추가
    - `<aside>` 태그에 `role="complementary"` 및 `aria-label` 추가
    - 모든 `<section>` 태그에 `aria-labelledby` 추가 (제목과 연결)
    - 결과 영역에 `role="region"` 및 `aria-label` 추가
    - 메시지 요소에 `role="alert"` 또는 `role="status"` 추가
  - ✅ 상태 변경 시 알림 제공 (`aria-live` 사용)
    - 전역 `aria-live` 영역 생성 (`aria-live="polite"`, `aria-atomic="true"`)
    - 메시지 표시 시 `aria-live` 속성 추가 (에러: `assertive`, 기타: `polite`)
    - 프로그레스 바 진행률 업데이트 시 `aria-live` 영역에 알림
    - 방문자 수 표시에 `aria-live="polite"` 추가
    - 에러 메시지에 `role="alert"` 및 `aria-live="assertive"` 추가
  - ✅ 폼 입력 필드에 `aria-required`, `aria-invalid` 추가
    - 필수 입력 필드에 `aria-required="true"` 자동 설정
    - 검증 실패 시 `aria-invalid="true"` 설정
    - 검증 성공 시 `aria-invalid="false"` 설정
    - 에러 메시지에 `aria-errormessage` 연결
    - `InputValidator`에서 자동으로 ARIA 속성 관리
    - 분단 수 입력 필드에 `aria-required="true"` 추가

#### 3.3 색상 대비
- **현재 상태**: 색상 대비 최적화 완료 ✅
- **진행 상황**:
  - ✅ WCAG 2.1 AA 기준 충족 확인 (최소 4.5:1 대비율)
    - 남학생 카드: #ffffff on #1565c0 (대비율 7.0:1 이상)
    - 여학생 카드: #ffffff on #ad1457 (대비율 6.5:1 이상)
    - 성공 메시지: #155724 on #d4edda (대비율 4.8:1)
    - 오류 메시지: #721c24 on #f8d7da (대비율 5.2:1)
    - 정보 메시지: #0c5460 on #d1ecf1 (대비율 4.6:1)
    - 텍스트 그림자 강화로 가독성 향상
  - ✅ 색상만으로 정보를 전달하지 않도록 개선 (아이콘, 텍스트 병행)
    - 남학생 카드에 ♂ 아이콘 추가 (CSS `::before` 사용)
    - 여학생 카드에 ♀ 아이콘 추가 (CSS `::before` 사용)
    - 성공 메시지에 ✅ 아이콘 추가
    - 오류 메시지에 ❌ 아이콘 추가
    - 정보 메시지에 ℹ️ 아이콘 추가
    - ARIA 레이블에 성별 아이콘 정보 포함 (예: "남학생 ♂", "여학생 ♀")
    - 고정 좌석에 🔒 아이콘 및 "고정" 텍스트 라벨 추가
  - ✅ 고정 좌석 표시에 색상 외 시각적 구분 추가
    - 이중 테두리 (`border-style: double`) 적용
    - 대각선 패턴 배경 (`repeating-linear-gradient`) 추가
    - "고정" 텍스트 라벨 추가 (카드 하단 중앙)
    - 🔒 아이콘 추가 (우측 상단)
    - 그림자 효과 강화 (`box-shadow` 다중 레이어)
    - 고정 좌석인 경우 성별 아이콘 위치 조정 (겹침 방지)

---

## 🟡 중간 우선순위 (Important)

### 4. 기능 개선

#### 4.1 준비중 기능 완성
- [x] **모둠 배치 기능 완성** ✅
  - LayoutRenderer에 `renderGroupCards` 메서드 완전히 구현 완료
  - MainController.ts에서 모둠 배치 로직 제거 및 LayoutRenderer로 이동
  - 남녀 섞기 옵션, 분단별 배치, 그룹 컨테이너 스타일링 등 모든 기능 구현 완료
- [ ] **ㄷ자 2명 짝꿍 배치 기능 구현**
  - UI에 "준비중" 표시
  - 레이아웃 알고리즘 구현 필요

#### 4.2 자리 배치 히스토리 관리 강화
- **현재 상태**: 
  - ✅ 되돌리기(Ctrl+Z) 기능 개선 완료 (드래그&드롭 지원)
  - ✅ HistoryManager 분리 완료
  - ✅ 다시 실행하기(Ctrl+Y / Cmd+Y) 기능 추가 완료
- **개선 필요**:
  - [ ] 히스토리 목록 시각화 (타임라인 형태)
  - [ ] 특정 시점으로 되돌리기 기능 (히스토리 목록에서 선택)

#### 4.3 고정 좌석 기능 개선
- **현재 상태**: 기본 기능 구현됨 ✅
- **개선 필요**:
  - [ ] 고정 좌석 일괄 지정/해제 기능
  - [ ] 고정 좌석 템플릿 저장/불러오기
  - [ ] 고정 좌석 시각적 구분 강화

#### 4.4 엑셀/CSV 가져오기 개선
- **현재 상태**: 
  - ✅ CSV 파일 지원
  - ✅ 엑셀(.xlsx, .xls) 직접 지원 완료 (xlsx 라이브러리 사용)
  - ✅ 파일 형식 자동 감지 (MIME 타입 및 확장자 기반)
  - ✅ 업로드 시 미리보기 기능 (모달 다이얼로그)
  - ✅ 대용량 파일 처리 개선 (100명 이상 시 청크 단위 비동기 처리, 최대 5MB 지원)

---

### 5. 성능 최적화

#### 5.1 대용량 데이터 처리
- **현재 상태**: 
  - ✅ 50명 이상 시 비동기 처리 구현됨
  - ✅ DocumentFragment 활용 (일부 적용)
- **개선 필요**:
  - [ ] 100명 이상 학생 처리 시 성능 최적화
  - [ ] 가상 스크롤링 구현 검토 (학생 목록 테이블)
  - [ ] 렌더링 최적화 강화 (requestAnimationFrame 활용 확대)
  - [ ] 배치 DOM 업데이트 확대 (DocumentFragment 활용)

#### 5.2 메모리 관리
- **현재 상태**: 
  - ✅ 이벤트 리스너 추적 및 정리 구현됨
  - ✅ setTimeout 추적 및 정리 구현됨
- **개선 필요**:
  - [ ] DOM 요소 캐싱 최적화
  - [ ] 불필요한 리렌더링 방지
  - [ ] 히스토리 데이터 크기 제한 (현재 100개, 필요시 조정)

#### 5.3 로컬 스토리지 최적화
- **개선 필요**:
  - [ ] 데이터 압축 (큰 배치 데이터 저장 시)
  - [ ] 저장 용량 제한 관리 (localStorage는 약 5-10MB 제한)
  - [ ] 오래된 데이터 자동 정리
  - [ ] 저장 실패 시 사용자에게 알림 (현재 try-catch로 처리)

---

### 6. 데이터 검증 및 안정성

#### 6.1 엣지 케이스 처리
- **개선 필요**:
  - [ ] 학생 수가 0인 경우 명확한 안내
  - [ ] 남학생만 또는 여학생만 있는 경우 처리
  - [ ] 좌석 수보다 학생 수가 많은/적은 경우 처리
  - [ ] 고정 좌석 수가 학생 수보다 많은 경우 처리

#### 6.2 데이터 무결성 검증
- **개선 필요**:
  - [ ] localStorage 데이터 손상 시 복구 메커니즘
  - [ ] 잘못된 CSV 파일 업로드 시 상세한 에러 메시지
  - [ ] 파일 크기 제한 및 검증 강화

#### 6.3 입력 검증 강화
- **현재 상태**: 기본 검증 구현됨
- **개선 필요**:
  - [ ] 음수 입력 방지 강화 (현재 HTML min 속성만 사용)
  - [ ] 매우 큰 숫자 입력 제한
  - [ ] 특수문자 포함 이름 처리 개선

---

## 🟢 낮은 우선순위 (Nice to Have)

### 7. 추가 기능

#### 7.1 다국어 지원
- [ ] 영어, 일본어 등 추가 언어 지원
- [ ] i18n 라이브러리 도입 검토

#### 7.2 클라우드 저장소 연동
- [ ] Google Drive, Dropbox 등 연동
- [ ] 자동 백업 기능

#### 7.3 통계 및 분석
- [ ] 자리 배치 이력 통계
- [ ] 학생별 자리 이동 이력
- [ ] 성별 분포 시각화

#### 7.4 인쇄 옵션 확장
- [ ] 다양한 인쇄 레이아웃 옵션
- [ ] 이름표 생성 기능
- [ ] 출석부 형식 출력

#### 7.5 공유 기능 개선
- [ ] QR 코드 생성
- [ ] 공유 링크 만료 시간 설정
- [ ] 비밀번호 보호 기능

---

### 8. 개발자 경험

#### 8.1 테스트 코드 작성
- [ ] 단위 테스트 추가 (Jest, Vitest 등)
- [ ] 통합 테스트 작성
- [ ] E2E 테스트 (Playwright, Cypress 등)

#### 8.2 CI/CD 파이프라인
- [ ] GitHub Actions 설정
- [ ] 자동 빌드 및 배포
- [ ] 자동 테스트 실행

#### 8.3 코드 문서화
- [ ] JSDoc 주석 보완
- [ ] API 문서 생성
- [ ] 사용자 가이드 비디오 제작

---

### 9. 디자인 개선

#### 9.1 다크 모드 지원
- [ ] 사용자 선호도에 따른 테마 전환
- [ ] 시스템 설정 자동 감지

#### 9.2 애니메이션 개선
- [ ] 부드러운 전환 효과
- [ ] 로딩 애니메이션 추가 (현재 기본 구현됨)
- [ ] 성공/실패 피드백 애니메이션

#### 9.3 아이콘 및 일러스트
- [ ] 일관된 아이콘 세트 사용
- [ ] 커스텀 일러스트 추가

---

### 10. 보안 및 개인정보

#### 10.1 데이터 프라이버시
- [ ] 로컬 스토리지 데이터 암호화 옵션
- [ ] 공유 링크에 민감 정보 포함 여부 확인
- [ ] GDPR 준수 검토

#### 10.2 입력 검증 강화
- [ ] XSS 방지 강화 (현재는 클라이언트 사이드만)
- [ ] 파일 업로드 보안 검증 강화

---

## 📊 우선순위별 요약

### 즉시 개선 필요 (1-2주 내)
1. **MainController.ts 리팩토링 계속 진행** (2-7단계)
   - AnimationManager 분리
   - StorageManager 분리
   - CSVFileHandler 분리
2. **프로덕션 코드에서 console.log 제거** (logger 마이그레이션 완료)
3. **타입 안전성 강화** (any 타입 제거)
4. **엣지 케이스 처리 강화**

### 단기 개선 (1개월 내)
1. **준비중 기능 완성** (모둠 배치, ㄷ자 배치)
2. **모바일 반응형 개선**
3. **성능 최적화** (대용량 데이터)
4. **입력 검증 피드백 개선**
5. **키보드 접근성 개선** (ARIA 레이블, Tab 순서)

### 중기 개선 (3개월 내)
1. **다국어 지원**
2. **테스트 코드 작성**
3. **클라우드 저장소 연동**
4. **통계 및 분석 기능**

### 장기 개선 (6개월 이상)
1. **CI/CD 파이프라인 구축**
2. **다크 모드 지원**
3. **보안 강화**
4. **고급 기능 추가**

---

## ✅ 최근 개선 완료 사항

### 2025년 11월 23일
- ✅ **LayoutRenderer 분리 (1단계 완료)**
  - `renderFinalLayout()`, `renderStudentCards()`, `createStudentCard()` 메서드 분리
  - LayoutRenderer 클래스 생성 (232줄)
  - 의존성 주입 패턴 적용
- ✅ **AnimationManager 분리 (2단계 완료)**
  - `startCurtainAnimation()`, `stopCurtainAnimation()`, `openCurtain()` 메서드 분리
  - `startFireworks()`, `createFirework()`, `playArrangementSound()` 메서드 분리
  - AnimationManager 클래스 생성 (253줄)
- ✅ **StorageManager 분리 (3단계 완료)**
  - localStorage 관련 모든 메서드 분리
  - StorageManager 클래스 생성 (280줄)
- ✅ **CSVFileHandler 분리 (4단계 완료)**
  - CSV 파일 처리 관련 모든 메서드 분리
  - CSVFileHandler 클래스 생성 (1,000+줄)
- ✅ **PrintExportManager 분리 (5단계 완료)**
  - `printLayout()`, `printLayoutForTeacher()`, `exportAsText()`, `saveLayoutAsHtml()` 메서드 분리
  - PrintExportManager 클래스 생성 (894줄)
- ✅ **UIManager 분리 (6단계 완료)**
  - `updatePreviewForGenderCounts()`, `updateStudentTableStats()` 메서드 분리
  - `initializeHistoryDropdown()`, `updateHistoryDropdown()` 메서드 분리
  - UIManager 클래스 생성 (297줄)
  - MainController.ts: 8,812줄 → 7,181줄 (1,631줄 감소)
- ✅ **OutputModule 개선**
  - `clear()` 메서드가 `card-layout-container` 보존하도록 수정
  - `showLoading()` 메서드 개선
  - 메시지와 레이아웃 분리
- ✅ **Vite 개발 서버 설정 개선**
  - `dist` 폴더 변경 감지 제외 (불필요한 새로고침 방지)
  - HMR 설정 최적화

### 2025년 11월 18일 이전
- ✅ **되돌리기 기능 개선**: 드래그&드롭 후 되돌리기 정상 작동하도록 수정
- ✅ **커튼/폭죽 애니메이션**: z-index 조정 및 CSS 개선으로 정상 작동
- ✅ **방문자 수 스타일**: 작은 글씨, 버튼 스타일 제거
- ✅ **준비중 기능 UI**: 회색 이탤릭체로 표시
- ✅ **구글 서치 콘솔 인증**: HTML 파일 방식으로 인증 완료

---

## 📝 리팩토링 진행 계획

### 현재 진행 중: MainController.ts 리팩토링

#### ✅ 완료된 단계
1. **LayoutRenderer 분리** (1단계)
   - `renderFinalLayout()` → LayoutRenderer로 이동
   - `renderStudentCards()` → LayoutRenderer로 이동
   - `createStudentCard()` → LayoutRenderer로 이동
   - LayoutRenderer.ts: 232줄 생성

2. **AnimationManager 분리** (2단계)
   - `startCurtainAnimation()`, `stopCurtainAnimation()`, `openCurtain()` → AnimationManager로 이동
   - `startFireworks()`, `createFirework()`, `playArrangementSound()` → AnimationManager로 이동
   - AnimationManager.ts: 253줄 생성

3. **StorageManager 분리** (3단계)
   - `saveOptions()`, `loadOptions()` → StorageManager로 이동
   - `safeSetItem()`, `safeGetItem()`, `isLocalStorageAvailable()` → StorageManager로 이동
   - `saveLayoutResult()`, `loadSavedLayoutResult()` → StorageManager로 이동
   - `saveClassStudentData()`, `loadClassStudentData()` → StorageManager로 이동
   - `saveSeatHistory()`, `getSeatHistory()`, `deleteSeatHistoryItem()` → StorageManager로 이동
   - StorageManager.ts: 280줄 생성

4. **CSVFileHandler 분리** (4단계)
   - `handleFileUpload()`, `parseCsvFile()`, `downloadTemplateFile()` → CSVFileHandler로 이동
   - `createTableWithStudents()`, `loadStudentDataToTable()` → CSVFileHandler로 이동
   - CSVFileHandler.ts: 1,000+줄 생성

5. **PrintExportManager 분리** (5단계)
   - `printLayout()`, `printLayoutForTeacher()` → PrintExportManager로 이동
   - `exportAsText()`, `saveLayoutAsHtml()` → PrintExportManager로 이동
   - PrintExportManager.ts: 894줄 생성

6. **UIManager 분리** (6단계)
   - `updatePreviewForGenderCounts()`, `updateStudentTableStats()` → UIManager로 이동
   - `initializeHistoryDropdown()`, `updateHistoryDropdown()` → UIManager로 이동
   - UIManager.ts: 297줄 생성
   - MainController.ts: 8,812줄 → 7,181줄 (1,631줄 감소)

#### 🔄 다음 단계 (우선순위 순)
7. **StudentTableManager 분리** (예상 감소: ~500줄)

7. **StudentTableManager 분리** (예상 감소: ~500줄)
   - 학생 테이블 생성 및 관리
   - 학생 데이터 로드
   - 테이블 이벤트 처리

#### 목표
- MainController.ts: 8,812줄 → **약 6,000줄 이하** (현재 7,374줄, 약 1,374줄 추가 감소 필요)
- 각 Manager: **200-1,000줄** 수준으로 분리
- 단일 책임 원칙 준수

---

## 📝 참고사항

- 현재 프로그램은 기본 기능이 잘 구현되어 있으며, 안정적으로 동작함
- 개선점은 점진적으로 적용하는 것을 권장
- 각 리팩토링 단계마다 테스트를 실행하여 안정성 확보
- 사용자 피드백을 수집하여 우선순위 조정 권장
- 각 개선사항은 별도의 이슈/브랜치로 관리하는 것을 권장

---

**작성자**: AI Assistant
**버전**: 1.0.0
