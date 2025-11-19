# 배포 실패 원인 분석 및 해결

## 🚨 현재 상황

**모든 "Deploy to GitHub Pages" 워크플로우가 실패하고 있습니다.**

### 실패 패턴 분석
- **실패 시간**: 10-27초 (매우 짧음)
- **의미**: 빌드가 시작되기 전에 실패하고 있음
- **가능한 원인**:
  1. GitHub Pages 설정 문제
  2. 워크플로우 권한 문제
  3. 빌드 아티팩트 경로 문제

## 🔍 문제 원인

### 1. GitHub Pages 설정 확인 필요
GitHub Pages가 "GitHub Actions"를 사용하도록 설정되어 있어야 합니다.

**확인 방법**:
1. GitHub 저장소 → Settings → Pages
2. "Source" 섹션 확인
3. "Deploy from a branch"가 아닌 "GitHub Actions"가 선택되어 있어야 함

### 2. 워크플로우 아티팩트 경로 문제
현재 `path: |` 형식이 제대로 작동하지 않을 수 있습니다.

### 3. 빌드 출력 디렉토리 문제
`npm run build`는 `dist/` 폴더에 파일을 생성하지만, `index.html`과 `style.css`는 루트에 있습니다.

## 🛠️ 해결 방법

### 방법 1: 워크플로우 수정 (권장)
배포에 필요한 파일들만 포함하도록 수정

### 방법 2: GitHub Pages 설정 변경
Settings → Pages에서 "GitHub Actions" 선택

### 방법 3: 간단한 워크플로우로 변경
더 단순한 구조로 변경

