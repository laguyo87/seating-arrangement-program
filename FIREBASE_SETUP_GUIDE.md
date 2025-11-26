# Firebase Firestore 설정 가이드

## 🎯 목표
자리 배치 프로그램의 데이터를 Firebase에 저장하여 여러 기기에서 사용할 수 있게 만들기

---

## 📋 1단계: Firebase 프로젝트 만들기

### 🎓 초등학생도 이해할 수 있는 설명
Firebase는 Google이 만든 무료 저장소입니다. 여기에 우리 프로그램의 데이터를 저장하면, 다른 컴퓨터나 스마트폰에서도 같은 데이터를 볼 수 있어요!

### 📝 단계별 가이드

#### 1-1. Firebase 웹사이트 접속
1. 브라우저를 엽니다 (Chrome, Safari 등)
2. 주소창에 다음 주소를 입력합니다:
   ```
   https://console.firebase.google.com/
   ```
3. Enter 키를 누릅니다

#### 1-2. Google 계정으로 로그인
1. 화면 오른쪽 위에 "시작하기" 또는 "Get started" 버튼이 보입니다
2. 클릭합니다
3. Google 계정으로 로그인합니다 (Gmail 계정이 있으면 됩니다)
   - Gmail 계정이 없으면 먼저 만들어야 합니다

#### 1-3. 프로젝트 추가
1. 로그인 후 화면에 "프로젝트 추가" 또는 "Add project" 버튼이 보입니다
2. 클릭합니다

#### 1-4. 프로젝트 이름 입력
1. "프로젝트 이름" 또는 "Project name" 입력창이 나타납니다
2. 원하는 이름을 입력합니다 (예: "자리배치프로그램" 또는 "seating-arrangement")
3. "계속" 또는 "Continue" 버튼을 클릭합니다

#### 1-5. Google Analytics 설정 (선택사항)
1. "Google Analytics 사용 설정" 화면이 나타납니다
2. **체크박스를 해제**합니다 (필수는 아닙니다)
3. "프로젝트 만들기" 또는 "Create project" 버튼을 클릭합니다

#### 1-6. 프로젝트 생성 완료
1. 잠시 기다리면 "프로젝트 준비 완료" 또는 "Your project is ready" 메시지가 나타납니다
2. "계속" 또는 "Continue" 버튼을 클릭합니다

### ✅ 확인 사항
- [ ] Firebase Console에 로그인했습니다
- [ ] 프로젝트를 만들었습니다
- [ ] 프로젝트 이름을 확인했습니다

---

## 📋 2단계: Firestore Database 활성화하기

### 🎓 초등학생도 이해할 수 있는 설명
Firestore는 데이터를 저장하는 창고입니다. 이 창고를 열어야 데이터를 넣을 수 있어요!

### 📝 단계별 가이드

#### 2-1. Firestore Database 메뉴 찾기
1. Firebase Console 왼쪽 메뉴를 봅니다
2. "빌드" 또는 "Build" 섹션을 찾습니다
3. 그 아래에 "Firestore Database" 또는 "Firestore Database"를 클릭합니다

#### 2-2. 데이터베이스 만들기
1. "데이터베이스 만들기" 또는 "Create database" 버튼을 클릭합니다

#### 2-3. 보안 규칙 선택
1. "프로덕션 모드에서 시작" 또는 "Start in production mode"를 선택합니다
2. "다음" 또는 "Next" 버튼을 클릭합니다

#### 2-4. 위치 선택
1. "위치" 또는 "Location" 드롭다운 메뉴가 나타납니다
2. **"asia-northeast3 (Seoul)"** 또는 **"asia-northeast1 (Tokyo)"**를 선택합니다
   - 한국에서 사용하므로 가까운 위치를 선택하는 것이 좋습니다
3. "사용 설정" 또는 "Enable" 버튼을 클릭합니다

#### 2-5. 데이터베이스 생성 완료
1. 잠시 기다리면 데이터베이스가 생성됩니다
2. "완료" 또는 "Done" 버튼이 나타나면 클릭합니다

### ✅ 확인 사항
- [ ] Firestore Database가 생성되었습니다
- [ ] 데이터베이스 화면이 보입니다 (빈 화면이 정상입니다)

---

## 📋 3단계: Authentication (인증) 활성화하기

### 🎓 초등학생도 이해할 수 있는 설명
Authentication은 문지기 같은 역할입니다. Google 계정으로 로그인한 사람만 데이터를 볼 수 있게 해줍니다!

### 📝 단계별 가이드

#### 3-1. Authentication 메뉴 찾기
1. Firebase Console 왼쪽 메뉴를 봅니다
2. "빌드" 또는 "Build" 섹션을 찾습니다
3. 그 아래에 "Authentication" 또는 "인증"을 클릭합니다

#### 3-2. 인증 시작하기
1. "시작하기" 또는 "Get started" 버튼을 클릭합니다

#### 3-3. 로그인 방법 선택
1. "Sign-in method" 또는 "로그인 방법" 탭을 클릭합니다
2. "Google" 항목을 찾아서 클릭합니다
3. "사용 설정" 또는 "Enable" 토글을 켭니다 (ON으로 변경)
4. "프로젝트 지원 이메일" 또는 "Project support email"에 이메일 주소가 자동으로 입력됩니다
5. "저장" 또는 "Save" 버튼을 클릭합니다

### ✅ 확인 사항
- [ ] Authentication이 활성화되었습니다
- [ ] Google 로그인 방법이 사용 설정되었습니다

---

## 📋 4단계: 웹 앱 등록하기

### 🎓 초등학생도 이해할 수 있는 설명
우리 프로그램이 Firebase를 사용할 수 있도록 연결하는 작업입니다. 마치 전화번호를 등록하는 것과 같아요!

### 📝 단계별 가이드

#### 4-1. 웹 앱 추가
1. Firebase Console 왼쪽 위에 있는 톱니바퀴 아이콘(⚙️)을 클릭합니다
2. "프로젝트 설정" 또는 "Project settings"를 클릭합니다
3. 화면 아래쪽으로 스크롤합니다
4. "내 앱" 또는 "Your apps" 섹션을 찾습니다
5. 웹 아이콘(</>)을 클릭합니다

#### 4-2. 앱 닉네임 입력
1. "앱 닉네임" 또는 "App nickname" 입력창이 나타납니다
2. 원하는 이름을 입력합니다 (예: "자리배치웹앱")
3. "앱 등록" 또는 "Register app" 버튼을 클릭합니다

#### 4-3. Firebase 설정 정보 복사
1. 화면에 코드가 나타납니다 (firebaseConfig 객체)
2. 이 정보를 복사해야 합니다
3. **중요**: 이 정보는 나중에 프로그램에 넣을 것입니다
4. 일단 "다음" 또는 "Next" 버튼을 클릭합니다

#### 4-4. SDK 설정 (건너뛰기)
1. "이 단계는 나중에" 또는 "Skip this step"을 클릭합니다
2. 또는 "다음" 버튼을 여러 번 클릭하여 완료합니다

### ✅ 확인 사항
- [ ] 웹 앱이 등록되었습니다
- [ ] 프로젝트 설정 화면에서 firebaseConfig 정보를 볼 수 있습니다

---

## 📋 5단계: Firebase 설정 정보 확인하기

### 🎓 초등학생도 이해할 수 있는 설명
프로그램에 넣을 "주소"와 "열쇠"를 확인하는 단계입니다!

### 📝 단계별 가이드

#### 5-1. 프로젝트 설정 열기
1. Firebase Console 왼쪽 위 톱니바퀴 아이콘(⚙️) 클릭
2. "프로젝트 설정" 또는 "Project settings" 클릭

#### 5-2. Firebase 설정 정보 찾기
1. "내 앱" 또는 "Your apps" 섹션에서 방금 만든 웹 앱을 찾습니다
2. "SDK 설정 및 구성" 또는 "SDK setup and configuration" 섹션을 찾습니다
3. "구성" 또는 "Config" 탭을 클릭합니다

#### 5-3. 설정 정보 확인
다음과 같은 정보가 보입니다:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### ✅ 확인 사항
- [ ] firebaseConfig 정보를 볼 수 있습니다
- [ ] apiKey, authDomain, projectId가 보입니다

---

## 🎉 1단계 완료!

이제 Firebase 프로젝트가 준비되었습니다!

**다음 단계**: 이 정보를 프로그램에 넣어서 연결하는 작업을 할 예정입니다.

---

## ❓ 문제 해결

### Q: Firebase Console에 접속이 안 돼요
A: 
- 인터넷 연결을 확인하세요
- Google 계정으로 로그인했는지 확인하세요
- 브라우저를 새로고침(F5) 해보세요

### Q: 프로젝트를 만들 수 없어요
A:
- Google 계정이 제대로 로그인되어 있는지 확인하세요
- 다른 브라우저에서 시도해보세요
- 잠시 후 다시 시도해보세요

### Q: Firestore Database가 보이지 않아요
A:
- 왼쪽 메뉴에서 "빌드" 또는 "Build" 섹션을 찾아보세요
- 프로젝트가 제대로 생성되었는지 확인하세요

---

**준비되셨으면 알려주세요! 다음 단계로 진행하겠습니다!** 🚀

