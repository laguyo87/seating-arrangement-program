# 교실 좌석 배치 프로그램 (Classroom Seating Arrangement Program)

교실에서 학생들의 좌석을 체계적으로 배치할 수 있는 웹 애플리케이션입니다.

## 주요 기능

### 1. 학생 정보 관리
- 남학생/여학생 수 입력
- 학생 이름과 성별 입력 테이블 생성
- CSV 파일을 통한 학생 정보 일괄 업로드
- 양식 다운로드 기능

### 2. 좌석 배치 옵션
- **1명씩 한 줄로 배치**: 남녀가 교대로 배치
- **2명씩 짝꿍 배치**: 
  - 남녀 짝꿍 하기
  - 같은 성끼리 짝꿍하기
- 분단 수 설정 (1~10분단)

### 3. 맞춤 구성
- 랜덤 배치
- 고정 좌석 지정 후 랜덤 배치

### 4. 시각적 배치
- 실시간 미리보기
- 칠판, 교탁, 학생 좌석 카드 표시
- 성별별 색상 구분 (남학생: 파란색, 여학생: 분홍색)
- 분단별 레이블 표시

## 사용 방법

1. **학생 정보 입력**
   - 남학생 수와 여학생 수 입력
   - 각각의 ↵ 버튼을 클릭하여 미리보기 확인

2. **분단 개수 설정**
   - 원하는 분단 수 입력 (예: 3분단, 4분단)

3. **좌석 배치 형태 선택**
   - 1명씩 한 줄로 배치 또는 2명씩 짝꿍 배치 선택
   - 짝꿍 배치 시 남녀 짝꿍 또는 같은 성끼리 짝꿍 선택

4. **맞춤 구성**
   - 랜덤 배치 또는 고정 좌석 지정 후 랜덤 배치 선택

5. **학생 정보 입력 테이블 생성**
   - 학생 이름과 성별을 입력할 테이블 생성

6. **좌석 배치하기**
   - 테이블에 입력된 이름을 실제 좌석에 무작위 배치

## 기술 스택

- **Frontend**: HTML5, CSS3, TypeScript
- **Build Tool**: TypeScript Compiler
- **Package Manager**: npm

## 프로젝트 구조

```
├── index.html              # 메인 HTML 파일
├── style.css              # 스타일시트
├── src/
│   ├── main.ts            # 애플리케이션 진입점
│   ├── controllers/
│   │   └── MainController.ts  # 메인 컨트롤러
│   ├── models/
│   │   ├── Student.ts     # 학생 모델
│   │   └── Seat.ts        # 좌석 모델
│   ├── modules/
│   │   ├── InputModule.ts      # 입력 모듈
│   │   ├── LayoutSelectorModule.ts  # 레이아웃 선택 모듈
│   │   ├── OutputModule.ts     # 출력 모듈
│   │   ├── SeatCanvasModule.ts # 좌석 캔버스 모듈
│   │   └── CustomLayoutModule.ts # 커스텀 레이아웃 모듈
│   └── services/
│       ├── InputService.ts     # 입력 서비스
│       ├── LayoutService.ts    # 레이아웃 서비스
│       └── RandomService.ts    # 랜덤 서비스
├── dist/                  # 컴파일된 JavaScript 파일들
├── package.json           # 프로젝트 설정
└── tsconfig.json         # TypeScript 설정
```

## 설치 및 실행

1. 저장소 클론
```bash
git clone https://github.com/laguyo87/classroom-seating-arrangement.git
cd classroom-seating-arrangement
```

2. 의존성 설치
```bash
npm install
```

3. TypeScript 컴파일
```bash
npm run build
```

4. 웹 서버에서 실행
   - `index.html` 파일을 웹 브라우저에서 열거나
   - 로컬 웹 서버를 사용하여 실행

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 연락처

프로젝트 링크: [https://github.com/laguyo87/classroom-seating-arrangement](https://github.com/laguyo87/classroom-seating-arrangement)