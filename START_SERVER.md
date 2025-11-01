# 서버 시작 가이드 🚀

## 서버 시작 방법

### 방법 1: npm 스크립트 사용 (권장)

```bash
# 프로젝트 디렉토리로 이동
cd "/Users/gimsinhoe/Library/CloudStorage/GoogleDrive-bruceksh@dosun.hs.kr/내 드라이브/my_project/seating arragement pgm"

# 빌드 확인
npm run build

# 서버 시작
npm run start
```

**성공 메시지:**
```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

### 방법 2: 자동 스크립트 사용

```bash
./start-test-server.sh
```

### 방법 3: Python 직접 실행

```bash
python3 -m http.server 8000
```

## 브라우저 접속

서버가 시작되면 브라우저에서 다음 주소로 접속:

```
http://localhost:8000
```

## 서버 중지

서버를 중지하려면 터미널에서 `Ctrl + C`를 누르세요.

## 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# 포트 8000을 사용하는 프로세스 확인
lsof -ti:8000

# 프로세스 종료
lsof -ti:8000 | xargs kill -9

# 다른 포트 사용 (예: 8001)
python3 -m http.server 8001
```

### 서버가 시작되지 않는 경우

1. Python이 설치되어 있는지 확인:
   ```bash
   python3 --version
   ```

2. 포트가 비어있는지 확인:
   ```bash
   lsof -ti:8000
   ```

3. 방화벽 설정 확인

---

**서버가 시작되면 브라우저에서 `http://localhost:8000`으로 접속하세요!** 🌐
