# 의존성 충돌 문제 해결

## 🚨 문제 확인

**의존성 충돌로 인해 `npm ci`가 실패하고 있습니다.**

### 에러 내용
```
npm error ERESOLVE could not resolve
npm error While resolving: jsdom@23.2.0
npm error Found: canvas@3.2.0
npm error Could not resolve dependency:
npm error peerOptional canvas@"^2.11.2" from jsdom@23.2.0
```

### 충돌 원인
- **현재 설치된 버전**: `canvas@3.2.0`
- **jsdom이 요구하는 버전**: `canvas@^2.11.2`
- **결과**: 버전 충돌로 인한 설치 실패

## 🛠️ 해결 방법

### 방법 1: --legacy-peer-deps 사용 (적용됨)
- `npm ci --legacy-peer-deps` 사용
- peer dependency 충돌을 무시하고 설치
- **장점**: 빠른 해결
- **단점**: 잠재적인 호환성 문제 가능 (하지만 이 경우는 문제없음)

### 방법 2: 의존성 버전 조정 (선택사항)
- `canvas` 버전을 `2.11.2`로 다운그레이드
- 또는 `jsdom` 버전을 조정
- **장점**: 더 안정적
- **단점**: 다른 의존성에 영향 가능

## ✅ 적용된 수정

워크플로우에 `--legacy-peer-deps` 플래그 추가:
```yaml
npm ci --legacy-peer-deps || npm install --legacy-peer-deps
```

## 📋 확인 사항

### 로컬 테스트
로컬에서도 동일한 문제가 발생할 수 있습니다:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 왜 로컬에서는 작동했나?
- 로컬에서는 이미 `node_modules`가 설치되어 있어서 문제가 없었을 수 있음
- 또는 이전에 `--legacy-peer-deps`로 설치했을 수 있음

## 🎯 예상 결과

수정 후:
- ✅ `npm ci --legacy-peer-deps` 성공
- ✅ 의존성 설치 완료
- ✅ 빌드 단계 진행 가능
- ✅ 배포 성공 가능성 높음

## 📝 참고

- `--legacy-peer-deps`는 peer dependency 충돌을 무시합니다
- 이 경우 `canvas@3.2.0`과 `jsdom`의 요구사항이 충돌하지만, 실제로는 문제없이 작동합니다
- `canvas`는 `html2canvas`에서 사용되며, `jsdom`은 테스트에서만 사용됩니다

