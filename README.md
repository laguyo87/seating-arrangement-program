# 교실 자리 배치 프로그램 🎓

교실에서 학생들의 좌석을 체계적으로 배치하고 관리할 수 있는 웹 애플리케이션입니다.

## 🌟 주요 기능

### 📝 학생 정보 관리
- 남학생/여학생 수 별도 입력
- 학생 이름과 성별 정보 입력
- 엑셀 파일에서 학생 정보 가져오기
- 양식 다운로드 기능

### 🪑 다양한 좌석 배치 형태
- **1명씩 한 줄로 배치**: 개별 좌석을 분단별로 배치
- **2명씩 짝꿍 배치**: 두 명이 나란히 앉는 형태
- **모둠 배치** (준비중)
- **ㄷ자 2명 짝꿍 배치** (준비중)

### 🎯 맞춤 배치 옵션
- **남녀 짝꿍하기**: 남학생과 여학생을 짝지어 배치
- **같은 성끼리 짝꿍하기**: 같은 성별끼리 짝지어 배치
- **분단별 배치**: 원하는 분단 수로 좌석 배치

### 🎲 자리 배치 기능
- **자리 배치하기**: 입력된 학생 이름을 좌석에 랜덤 배치
- **성별 고려**: 남학생은 남학생 좌석에, 여학생은 여학생 좌석에 배치
- **고정 좌석**: 이미 정해진 좌석 형태에 이름만 배치

### 📤 공유 및 출력 기능
- **간단한 공유 코드**: 짧은 코드로 자리 배치도 공유
- **인쇄하기**: 한 페이지에 맞춘 인쇄 최적화
- **저장하기**: HTML 파일로 자리 배치도 저장

## 🚀 사용 방법

### 1단계: 학생 정보 입력
1. 남학생 수와 여학생 수를 입력하세요
2. "학생 정보 입력 테이블 생성" 버튼을 클릭하세요
3. 학생 이름과 성별을 입력하거나 엑셀 파일을 업로드하세요

### 2단계: 분단 개수 설정
- 원하는 분단 수를 입력하세요 (예: 3분단, 4분단)

### 3단계: 좌석 배치 형태 선택
- **1명씩 한 줄로 배치**: 개별 좌석 배치
- **2명씩 짝꿍 배치**: 짝꿍 좌석 배치
  - 남녀 짝꿍하기
  - 같은 성끼리 짝꿍하기

### 4단계: 맞춤 구성
- 원하는 배치 옵션을 선택하세요

### 5단계: 자리 배치하기
1. "자리 배치하기" 버튼을 클릭하세요
2. 학생 이름이 좌석에 랜덤하게 배치됩니다
3. "📤 공유하기", "🖨️ 인쇄하기", "💾 저장하기" 버튼이 나타납니다

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, TypeScript
- **Build Tool**: Vite
- **Module System**: ES Modules
- **Styling**: CSS Grid, Flexbox
- **Browser APIs**: Clipboard API, File API

## 📁 프로젝트 구조

```
seating-arrangement-program/
├── src/
│   ├── controllers/
│   │   └── MainController.ts      # 메인 컨트롤러
│   ├── models/
│   │   ├── Student.ts            # 학생 모델
│   │   └── Seat.ts               # 좌석 모델
│   ├── modules/
│   │   ├── InputModule.ts        # 입력 모듈
│   │   ├── LayoutSelectorModule.ts # 레이아웃 선택 모듈
│   │   ├── OutputModule.ts       # 출력 모듈
│   │   └── SeatCanvasModule.ts   # 좌석 캔버스 모듈
│   ├── services/
│   │   ├── InputService.ts       # 입력 서비스
│   │   ├── LayoutService.ts      # 레이아웃 서비스
│   │   └── RandomService.ts      # 랜덤 서비스
│   └── main.ts                   # 진입점
├── index.html                    # 메인 HTML
├── style.css                     # 스타일시트
├── package.json                  # 프로젝트 설정
└── tsconfig.json                 # TypeScript 설정
```

## 🎨 주요 특징

### 반응형 디자인
- 다양한 화면 크기에 대응
- 모바일 친화적 인터페이스

### 사용자 친화적 UI
- 직관적인 단계별 진행
- 명확한 안내 메시지
- 시각적 피드백

### 데이터 관리
- 로컬 스토리지 활용
- 실시간 미리보기
- 데이터 검증

## 🔧 설치 및 실행

### 필요 조건
- Node.js 16.0 이상
- npm 또는 yarn

### 설치
```bash
# 저장소 클론
git clone https://github.com/laguyo87/seating-arrangement-program.git

# 프로젝트 디렉토리로 이동
cd seating-arrangement-program

# 의존성 설치
npm install
```

### 개발 서버 실행
```bash
# 개발 서버 시작
npm run dev
```

### 빌드
```bash
# 프로덕션 빌드
npm run build
```

## 📱 브라우저 지원

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이나 버그 리포트는 [Issues](https://github.com/laguyo87/seating-arrangement-program/issues)를 통해 제출해 주세요.

## 🎯 향후 계획

- [ ] 모둠 배치 기능 완성
- [ ] ㄷ자 2명 짝꿍 배치 기능 완성
- [ ] 자리 배치 히스토리 관리
- [ ] 다국어 지원
- [ ] 클라우드 저장소 연동

---

**교실 자리 배치 프로그램**으로 더 체계적이고 효율적인 교실 환경을 만들어보세요! 🎓✨