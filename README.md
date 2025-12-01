# 교실 자리 배치 프로그램 🎓

교실에서 학생들의 좌석을 체계적으로 배치하고 관리할 수 있는 웹 애플리케이션입니다.

## 🌟 주요 기능

### 🏫 반 관리 및 클라우드 저장
- 반별 자리 배치도 관리
- Firebase 클라우드 저장 (로그인 필요)
- 반별 확정된 자리 이력 관리
- 여러 반의 자리 배치도 독립적으로 저장

### 🔐 로그인 및 인증
- Google 로그인 지원
- 이메일/비밀번호 회원가입 및 로그인
- 클라우드 동기화를 통한 다기기 접근

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
- **고정 좌석 지정 후 랜덤 배치**: 특정 좌석을 고정하고 나머지만 랜덤 배치
  - 미리보기 화면에서 좌석 카드 클릭으로 고정 좌석 지정
  - 학생 정보 테이블에서 고정 좌석 드롭다운으로 학생-좌석 연결

### 📤 공유 및 출력 기능
- **간단한 공유 코드**: 짧은 코드로 자리 배치도 공유
- **인쇄하기**: 한 페이지에 맞춘 인쇄 최적화
- **저장하기**: HTML 파일로 자리 배치도 저장

## 🚀 사용 방법

### 1단계: 반 만들기 (필수)
1. 상단 바의 "반 만들기" 셀렉트 메뉴 옆 ➕ 버튼을 클릭하여 새 반을 추가하세요
2. 반 이름을 입력하세요
3. 반이 없으면 프로그램이 하이라이트로 알려줍니다

### 2단계: 로그인 (선택, 클라우드 저장 시 필요)
1. 상단 바의 "🔐 로그인" 버튼을 클릭하세요
2. Google 계정으로 로그인하거나 이메일/비밀번호로 회원가입하세요
3. 로그인 후 상단 바에 "안녕하세요. [이름/이메일]님!"이 표시됩니다

### 3단계: 학생 정보 입력
1. 남학생 수와 여학생 수를 입력하세요
2. "학생 정보 입력 테이블 생성" 버튼을 클릭하세요
3. 학생 이름과 성별을 입력하거나 엑셀 파일을 업로드하세요

### 4단계: 분단 개수 설정
- 원하는 분단 수를 입력하세요 (예: 3분단, 4분단)

### 5단계: 좌석 배치 형태 선택
- **1명씩 한 줄로 배치**: 개별 좌석 배치
- **2명씩 짝꿍 배치**: 짝꿍 좌석 배치
  - 남녀 짝꿍하기
  - 같은 성끼리 짝꿍하기

### 6단계: 맞춤 구성
- **랜덤 배치**: 완전 랜덤으로 좌석 배치
- **고정 좌석 지정 후 랜덤 배치**: 
  1. 미리보기 화면의 좌석 카드를 클릭하여 고정 좌석 지정 (🔒 아이콘 표시)
  2. 학생 정보 테이블의 "고정 좌석" 드롭다운에서 각 학생에게 고정 좌석 할당
  3. 자리 배치 시 고정 좌석에 지정된 학생이 먼저 배치되고, 나머지는 랜덤 배치

### 7단계: 자리 배치하기
1. "자리 배치하기" 버튼을 클릭하세요
2. 학생 이름이 좌석에 랜덤하게 배치됩니다
3. "✅ 자리 확정하기" 버튼을 클릭하면 해당 반의 이력에 저장됩니다
4. "📤 공유하기", "🖨️ 인쇄하기" 버튼이 나타납니다

### 8단계: 클라우드 저장 (선택)
1. 로그인한 상태에서 반을 선택하세요
2. 상단 바의 💾 버튼을 클릭하면 Firebase 클라우드에 저장됩니다
3. 다른 기기에서도 같은 계정으로 로그인하면 저장된 자리 배치도를 불러올 수 있습니다

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, TypeScript
- **Build Tool**: Vite
- **Module System**: ES Modules
- **Styling**: CSS Grid, Flexbox
- **Browser APIs**: Clipboard API, File API
- **Cloud Storage**: Firebase Firestore
- **Authentication**: Firebase Authentication (Google Sign-In, Email/Password)

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

### OG 이미지 생성
```bash
# Open Graph 이미지 생성 (1200x630)
# 소셜 미디어 공유 시 사용되는 썸네일 이미지 생성
npm run generate:og-image

# 또는 직접 실행
node generate-og-image.js
```

생성된 `og-image.png` 파일은 프로젝트 루트에 저장되며, `index.html`의 메타 태그에서 자동으로 참조됩니다.

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

## 🎯 최근 업데이트

- ✅ 반별 자리 배치도 관리
- ✅ Firebase 클라우드 저장 기능
- ✅ Google 로그인 및 이메일 회원가입
- ✅ 반별 확정된 자리 이력 관리
- ✅ 반 만들기 하이라이트 가이드

## 🎯 향후 계획

- [ ] 모둠 배치 기능 완성
- [ ] ㄷ자 2명 짝꿍 배치 기능 완성
- [ ] 다국어 지원

---

**교실 자리 배치 프로그램**으로 더 체계적이고 효율적인 교실 환경을 만들어보세요! 🎓✨
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

## 🎯 최근 업데이트

- ✅ 반별 자리 배치도 관리
- ✅ Firebase 클라우드 저장 기능
- ✅ Google 로그인 및 이메일 회원가입
- ✅ 반별 확정된 자리 이력 관리
- ✅ 반 만들기 하이라이트 가이드

## 🎯 향후 계획

- [ ] 모둠 배치 기능 완성
- [ ] ㄷ자 2명 짝꿍 배치 기능 완성
- [ ] 다국어 지원

---

**교실 자리 배치 프로그램**으로 더 체계적이고 효율적인 교실 환경을 만들어보세요! 🎓✨