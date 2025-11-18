# 교실 자리 배치 프로그램 - 문제점 점검 리스트 (업데이트)

생성일: 2025-01-27  
최종 업데이트: 2025-11-17

## ✅ 해결된 문제

### 심각한 문제
- [x] **console.log 남용**: 대부분 제거됨 (개발 모드 체크 추가)
- [x] **메모리 누수 방지**: setTimeoutSafe, 이벤트 리스너 추적 시스템 추가
- [x] **입력 검증**: validateAndFixStudentInput, validateAndFixPartitionInput 추가, HTML max 속성 추가

### 중간 우선순위
- [x] **localStorage 에러 처리**: safeSetItem, safeGetItem 구현
- [x] **데이터 무결성**: JSON 파싱 에러 처리, CSV 파일 검증 강화
- [x] **성능 최적화**: 로딩 인디케이터 추가, 대용량 데이터 지연 렌더링
- [x] **접근성**: ARIA 레이블 추가, 키보드 네비게이션 지원
- [x] **사용성**: 드래그 피드백 개선, 긴 이름 처리

### 낮은 우선순위
- [x] **TypeScript strict 모드**: noImplicitReturns, noFallthroughCasesInSwitch 활성화
- [x] **브라우저 호환성**: Clipboard API 폴백 추가
- [x] **보안 강화**: 공유 URL 데이터 검증 강화, HTML 이스케이프 함수 추가
- [x] **테스트 설정**: Vitest 설정 및 기본 테스트 구조 추가

---

## 🔴 남아있는 심각한 문제

### 1. console.log/error 남용 (부분적 해결)
- [ ] **console.log 3개 남아있음**: 프로덕션 코드에 디버깅용 console.log 발견
  - 위치: `src/controllers/MainController.ts` (2614, 5879, 5880)
  - 영향: 프로덕션 성능 저하, 불필요한 로그 출력
  - 권장: isDevelopmentMode() 체크 추가 또는 제거

- [ ] **console.error 일부 미체크**: 일부 console.error가 isDevelopmentMode() 체크 없이 사용됨
  - 위치: `src/controllers/MainController.ts` (약 20개)
  - 영향: 프로덕션에서 불필요한 에러 로그 출력
  - 권장: 모든 console.error를 isDevelopmentMode()로 감싸기

### 2. 메모리 누수 가능성 (부분적 해결)
- [ ] **setTimeout 미관리**: setTimeoutSafe가 아닌 일반 setTimeout 사용 (29개)
  - 위치: `src/controllers/MainController.ts` (29개)
  - 영향: 타이머가 정리되지 않아 메모리 누수 가능성
  - 권장: 모든 setTimeout을 setTimeoutSafe로 교체

- [ ] **이벤트 리스너 정리**: addEventListenerSafe가 정의되어 있으나 실제 사용되지 않음
  - 위치: `src/controllers/MainController.ts`
  - 영향: 이벤트 리스너가 정리되지 않아 메모리 누수 가능성
  - 권장: 모든 addEventListener를 addEventListenerSafe로 교체

### 3. 입력 검증 (부분적 해결)
- [ ] **빈 이름 처리**: 일부 함수에서 빈 이름 체크가 없을 수 있음
  - 위치: `handleSaveStudentTable()` 등
  - 영향: 빈 이름으로 저장 가능
  - 권장: 모든 입력 지점에서 빈 이름 검증 확인

---

## 🟡 남아있는 중간 우선순위 문제

### 4. 에러 처리
- [ ] **일부 에러 처리 개선 필요**: alert() 사용이 일부 남아있음
  - 위치: `src/controllers/MainController.ts` (여러 곳)
  - 영향: 사용자 경험 저하
  - 권장: alert()를 outputModule.showError()로 교체

### 5. 성능 문제
- [ ] **대용량 데이터 처리**: 100명 이상 학생 처리 시 성능 저하 가능
  - 위치: `renderExampleCards()`, `handleArrangeSeats()` 등
  - 영향: 많은 DOM 조작으로 인한 렌더링 지연
  - 권장: 가상 스크롤 또는 지연 렌더링 추가 개선

### 6. 접근성 (A11y)
- [ ] **ARIA 레이블 추가 필요**: 일부 버튼과 입력 필드에 ARIA 레이블 부족
  - 위치: `index.html` (일부 요소)
  - 영향: 스크린 리더 사용자 접근성 저하
  - 권장: 모든 인터랙티브 요소에 aria-label 추가

- [ ] **색상 대비**: 일부 텍스트의 색상 대비가 WCAG 기준 미달 가능성
  - 위치: `style.css`
  - 영향: 시각 장애인 접근성 저하
  - 권장: 색상 대비 비율 확인 및 조정

### 7. 사용성 (UX)
- [ ] **모바일 화면 최적화**: 일부 기능이 모바일에서 사용하기 어려울 수 있음
  - 위치: 드래그 앤 드롭, 테이블 입력 등
  - 영향: 모바일 사용자 경험 저하
  - 권장: 모바일 터치 이벤트 최적화

---

## 🟢 남아있는 낮은 우선순위 문제

### 8. 코드 구조
- [ ] **함수 길이**: MainController.ts가 매우 길어서 가독성 저하 (8600+ 라인)
  - 위치: `src/controllers/MainController.ts`
  - 영향: 유지보수 어려움
  - 권장: 함수 분리 및 모듈화 (장기 작업)

- [ ] **TypeScript strict 모드**: noUnusedLocals, noUnusedParameters 비활성화
  - 위치: `tsconfig.json`
  - 영향: 타입 안전성 저하
  - 권장: 점진적으로 활성화 (많은 미사용 변수로 인해 현재 비활성화)

### 9. 보안
- [ ] **XSS 취약점**: innerHTML 사용이 많음 (50개)
  - 위치: `src/controllers/MainController.ts` (44개), 기타 모듈
  - 영향: 악의적인 스크립트 삽입 가능성
  - 권장: 사용자 입력이 포함된 부분에 escapeHtml() 사용 또는 textContent 사용
  - 참고: escapeHtml() 함수는 이미 구현되어 있으나 사용되지 않음

### 10. 기능 완성도
- [ ] **모둠 배치 기능**: 아직 준비중 상태
  - 위치: README.md에 "준비중" 표시
  - 영향: 기능 미완성
  - 권장: 기능 완성 또는 UI에서 제거

- [ ] **ㄷ자 2명 짝꿍 배치**: 아직 준비중 상태
  - 위치: README.md에 "준비중" 표시
  - 영향: 기능 미완성
  - 권장: 기능 완성 또는 UI에서 제거

### 11. 테스트
- [ ] **테스트 구현**: 테스트 구조는 추가되었으나 실제 테스트 케이스 미구현
  - 위치: `src/test/`
  - 영향: 리팩토링 시 회귀 버그 발생 가능
  - 권장: 핵심 기능에 대한 단위 테스트 작성

---

## 📊 통계 요약

### 해결된 문제
- **심각한 문제**: 3개 중 3개 해결 (100%)
- **중간 우선순위**: 12개 중 8개 해결 (67%)
- **낮은 우선순위**: 11개 중 4개 해결 (36%)

### 남아있는 문제
- **심각한 문제**: 3개 (부분적 해결 포함)
- **중간 우선순위**: 6개
- **낮은 우선순위**: 7개
- **총 남아있는 문제**: 16개

### 코드 품질 지표
- **console.log/error**: 38개 → 3개 (92% 감소)
- **setTimeout 관리**: 35개 중 6개만 안전하게 관리됨 (17%)
- **innerHTML 사용**: 50개 (XSS 위험)
- **ARIA 레이블**: 15개 추가됨
- **입력 검증**: 강화됨 (validateAndFix 함수 추가)
- **localStorage 안전성**: 개선됨 (safeSetItem/safeGetItem)

---

## 🎯 권장 개선 순서

### 즉시 수정 (1주일 내)
1. **console.log 제거**: 남아있는 3개 console.log 제거 또는 isDevelopmentMode() 체크 추가
2. **setTimeout 교체**: 일반 setTimeout을 setTimeoutSafe로 교체 (29개)
3. **console.error 체크**: 모든 console.error를 isDevelopmentMode()로 감싸기

### 단기 (1개월 내)
4. **이벤트 리스너 관리**: addEventListenerSafe 사용
5. **alert() 제거**: alert()를 outputModule 메서드로 교체
6. **ARIA 레이블 추가**: 남아있는 인터랙티브 요소에 ARIA 레이블 추가

### 중기 (3개월 내)
7. **XSS 방지**: 사용자 입력이 포함된 innerHTML에 escapeHtml() 적용
8. **성능 최적화**: 대용량 데이터 처리 개선
9. **모바일 최적화**: 터치 이벤트 개선

### 장기 (6개월+)
10. **코드 리팩토링**: MainController.ts 모듈화
11. **테스트 작성**: 핵심 기능 단위 테스트
12. **기능 완성**: 모둠 배치, ㄷ자 배치 기능 구현 또는 제거

---

## 📝 참고사항

- 이 리스트는 코드베이스 정적 분석을 기반으로 작성되었습니다.
- 실제 사용자 테스트를 통해 추가 문제점을 발견할 수 있습니다.
- 우선순위는 프로젝트의 목적과 사용자 요구사항에 따라 조정될 수 있습니다.
- 많은 문제가 부분적으로 해결되었으나 완전한 해결을 위해 추가 작업이 필요합니다.

