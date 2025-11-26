# 자리 배치 프로그램에 적합한 데이터베이스 추천

## 📊 프로그램 특성 분석

### 현재 프로그램 구조
- **배포 방식**: GitHub Pages (정적 사이트)
- **아키텍처**: 클라이언트 사이드만 (서버 없음)
- **현재 저장소**: localStorage (브라우저 로컬)
- **데이터 크기**: 수 KB ~ 수 MB (반별 자리 배치도, 학생 정보)
- **사용자 수**: 개별 사용자 (교사 1명이 여러 반 관리)
- **동시성**: 낮음 (1명이 사용)
- **실시간 동기화**: 불필요 (개인 도구)

### 저장되는 데이터 구조
```typescript
// 반 정보
{
  id: string,
  name: string,
  createdAt: string,
  lastModified: string
}

// 반별 자리 배치도
{
  seats: Seat[],
  students: Student[],
  timestamp: string,
  className: string
}

// 학생 정보
{
  id: number,
  name: string,
  gender: 'M' | 'F',
  fixedSeatId?: number
}

// 히스토리
{
  id: string,
  date: string,
  layout: Array<{seatId, studentName, gender}>,
  timestamp: number
}
```

---

## 🎯 데이터베이스 선택 기준

### 필수 요구사항
1. ✅ **서버리스**: 백엔드 서버 없이 클라이언트에서 직접 접근
2. ✅ **무료 플랜**: 개인 프로젝트이므로 무료 할당량 필요
3. ✅ **간단한 설정**: 복잡한 인프라 관리 불필요
4. ✅ **브라우저 호환**: JavaScript/TypeScript에서 직접 사용 가능
5. ✅ **보안**: 사용자 인증 및 데이터 보호

### 선택적 요구사항
- 🌟 다중 기기 동기화
- 🌟 자동 백업
- 🌟 오프라인 지원
- 🌟 실시간 업데이트 (필수 아님)

---

## 🏆 추천 순위

### 🥇 1순위: Firebase Firestore (강력 추천)

#### 왜 추천하는가?
- ✅ **완벽한 서버리스**: 백엔드 서버 불필요
- ✅ **무료 할당량 충분**: 
  - 읽기: 50,000/일
  - 쓰기: 20,000/일
  - 저장: 1GB
  - 현재 사용량으로는 충분
- ✅ **Google 인증 통합**: Firebase Authentication으로 간단한 로그인
- ✅ **실시간 동기화**: 여러 기기에서 자동 동기화
- ✅ **오프라인 지원**: 오프라인에서도 작동, 온라인 시 자동 동기화
- ✅ **쉬운 설정**: Firebase Console에서 간단히 설정

#### 데이터 구조 예시
```typescript
// Firestore 컬렉션 구조
users/{userId}/
  ├── classes/
  │   ├── {classId}/
  │   │   ├── name: string
  │   │   ├── createdAt: timestamp
  │   │   ├── layout: {
  │   │   │   seats: Seat[]
  │   │   │   students: Student[]
  │   │   │   timestamp: timestamp
  │   │   │ }
  │   │   └── history/
  │   │       └── {historyId}/
  │   └── ...
  └── settings/
      └── options: OptionsData
```

#### 구현 예시
```typescript
// Firebase 초기화
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 데이터 저장
async function saveClassLayout(userId: string, classId: string, layout: ClassLayoutData) {
  const classRef = doc(db, `users/${userId}/classes/${classId}`);
  await setDoc(classRef, {
    name: layout.className,
    layout: layout,
    lastModified: new Date()
  });
}

// 데이터 불러오기
async function loadClassLayout(userId: string, classId: string) {
  const classRef = doc(db, `users/${userId}/classes/${classId}`);
  const docSnap = await getDoc(classRef);
  return docSnap.exists() ? docSnap.data() : null;
}
```

#### 비용
- **무료 플랜 (Spark)**: 
  - Firestore: 1GB 저장, 50K 읽기/일, 20K 쓰기/일
  - Authentication: 무제한
  - **현재 사용량으로는 완전 무료**

#### 장점
- ✅ Google 인증 통합 (한 번의 로그인으로 모든 Google 서비스 사용)
- ✅ 실시간 동기화 (여러 기기에서 자동 업데이트)
- ✅ 오프라인 지원 (인터넷 없어도 작동)
- ✅ 자동 백업 (Firebase가 자동으로 관리)
- ✅ 보안 규칙 (Firestore Security Rules로 데이터 보호)

#### 단점
- ⚠️ Google에 의존 (하지만 신뢰할 수 있는 서비스)
- ⚠️ 초기 설정 필요 (하지만 매우 간단)

---

### 🥈 2순위: Supabase (PostgreSQL 기반)

#### 왜 추천하는가?
- ✅ **오픈소스**: 자체 호스팅 가능 (나중에)
- ✅ **PostgreSQL**: 강력한 관계형 데이터베이스
- ✅ **무료 플랜**: 
  - 500MB 데이터베이스
  - 2GB 파일 저장
  - 무제한 API 요청
- ✅ **실시간 구독**: 실시간 데이터 변경 감지
- ✅ **Row Level Security**: 세밀한 보안 제어

#### 데이터 구조 예시
```sql
-- Supabase 테이블 구조
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW()
);

CREATE TABLE class_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id),
  seats JSONB NOT NULL,
  students JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### 구현 예시
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// 데이터 저장
async function saveClassLayout(classId: string, layout: ClassLayoutData) {
  const { data, error } = await supabase
    .from('class_layouts')
    .upsert({
      class_id: classId,
      seats: layout.seats,
      students: layout.students,
      timestamp: new Date().toISOString()
    });
}

// 실시간 구독
supabase
  .channel('class-layouts')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'class_layouts' },
    (payload) => {
      console.log('Layout updated!', payload.new);
    }
  )
  .subscribe();
```

#### 비용
- **무료 플랜**: 
  - 500MB 데이터베이스
  - 2GB 파일 저장
  - 무제한 API 요청
  - **현재 사용량으로는 완전 무료**

#### 장점
- ✅ 오픈소스 (자체 호스팅 가능)
- ✅ PostgreSQL (강력한 쿼리 기능)
- ✅ 실시간 구독
- ✅ Row Level Security

#### 단점
- ⚠️ Firebase보다 설정이 약간 복잡
- ⚠️ PostgreSQL 지식 필요 (하지만 간단한 사용은 쉬움)

---

### 🥉 3순위: IndexedDB (브라우저 내장)

#### 왜 추천하는가?
- ✅ **완전 무료**: 추가 비용 없음
- ✅ **대용량 저장**: localStorage보다 훨씬 큼 (수 GB)
- ✅ **비동기**: UI 블로킹 없음
- ✅ **구조화된 데이터**: 객체 저장소로 복잡한 데이터 구조 지원
- ✅ **오프라인**: 인터넷 불필요

#### 데이터 구조 예시
```typescript
// IndexedDB 스키마
interface DB {
  classes: {
    key: string; // classId
    value: ClassInfo;
  };
  layouts: {
    key: string; // classId
    value: ClassLayoutData;
  };
  history: {
    key: string; // historyId
    value: SeatHistoryItem;
  };
}
```

#### 구현 예시
```typescript
// IndexedDB 초기화
const dbName = 'seating-arrangement-db';
const dbVersion = 1;

const request = indexedDB.open(dbName, dbVersion);

request.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;
  
  // 객체 저장소 생성
  if (!db.objectStoreNames.contains('classes')) {
    db.createObjectStore('classes', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('layouts')) {
    db.createObjectStore('layouts', { keyPath: 'classId' });
  }
};

// 데이터 저장
function saveClassLayout(layout: ClassLayoutData) {
  const transaction = db.transaction(['layouts'], 'readwrite');
  const store = transaction.objectStore('layouts');
  store.put({
    classId: layout.className,
    ...layout
  });
}
```

#### 비용
- **완전 무료**: 브라우저 내장 기능

#### 장점
- ✅ 완전 무료
- ✅ 오프라인 지원
- ✅ 대용량 저장
- ✅ 외부 서비스 불필요

#### 단점
- ❌ **기기 간 동기화 불가** (가장 큰 단점)
- ❌ 브라우저별 호환성 차이
- ❌ 복잡한 쿼리 어려움

---

### 4순위: Google Drive API (파일 기반)

#### 왜 고려하는가?
- ✅ 사용자가 이미 Google 계정 보유
- ✅ 무료 15GB 저장 공간
- ✅ 파일 형식으로 저장 (JSON)

#### 단점
- ❌ 데이터베이스가 아님 (파일 시스템)
- ❌ 쿼리 불가
- ❌ 실시간 동기화 어려움
- ❌ OAuth 설정 필요

#### 추천도
- **데이터베이스로는 부적합**, 하지만 **백업 용도로는 좋음**

---

### 5순위: MongoDB Atlas

#### 왜 고려하는가?
- ✅ NoSQL 데이터베이스
- ✅ 무료 플랜: 512MB

#### 단점
- ❌ 서버리스 접근이 복잡 (REST API 필요)
- ❌ Firebase/Supabase보다 설정 복잡
- ❌ 현재 사용 사례에 과함

#### 추천도
- **현재 프로젝트에는 과함**, 더 복잡한 프로젝트에 적합

---

## 🎯 최종 추천

### 시나리오별 추천

#### 시나리오 1: 다중 기기 동기화가 필요한 경우
**→ Firebase Firestore (1순위)**
- 여러 기기에서 동일한 데이터 접근
- 자동 동기화
- Google 인증 통합

#### 시나리오 2: 단일 기기 사용, 오프라인 중요
**→ IndexedDB (3순위)**
- 인터넷 없이도 작동
- 완전 무료
- 대용량 저장

#### 시나리오 3: 오픈소스 선호, 자체 호스팅 가능성
**→ Supabase (2순위)**
- 오픈소스
- PostgreSQL의 강력함
- 나중에 자체 호스팅 가능

#### 시나리오 4: 현재 상태 유지 + 백업만
**→ localStorage + Google Drive API**
- 기존 localStorage 유지
- Google Drive에 백업만
- 가장 간단한 구현

---

## 💡 구체적 추천: Firebase Firestore

### 이유
1. **프로그램 특성과 완벽히 일치**
   - 서버리스 ✅
   - 클라이언트 사이드만 ✅
   - 무료 할당량 충분 ✅
   - 간단한 설정 ✅

2. **사용자 경험 향상**
   - 여러 기기에서 동일한 데이터 접근
   - 자동 동기화로 데이터 손실 방지
   - Google 로그인으로 간편한 인증

3. **개발자 경험**
   - Firebase SDK가 잘 문서화됨
   - TypeScript 지원 우수
   - 실시간 기능 내장

### 구현 난이도
- **쉬움** ⭐⭐☆☆☆
- Firebase Console 설정: 10분
- 코드 구현: 1-2일
- 테스트: 1일

### 예상 비용
- **무료** (현재 사용량 기준)
- 무료 플랜으로 수년간 사용 가능

---

## 📋 마이그레이션 계획

### 현재 → Firebase Firestore

#### 1단계: Firebase 프로젝트 설정 (30분)
1. Firebase Console에서 프로젝트 생성
2. Firestore Database 활성화
3. Authentication 활성화 (Google 로그인)
4. 웹 앱 등록 및 설정

#### 2단계: 코드 통합 (1-2일)
1. Firebase SDK 설치
   ```bash
   npm install firebase
   ```
2. Firebase 초기화 코드 추가
3. StorageManager 확장
   - localStorage와 Firestore 이중 저장
   - 점진적 마이그레이션

#### 3단계: 데이터 마이그레이션 (1일)
1. 기존 localStorage 데이터 읽기
2. Firestore로 업로드
3. 검증 및 테스트

#### 4단계: UI 추가 (1일)
1. 로그인 버튼 추가
2. 동기화 상태 표시
3. 설정 메뉴에 클라우드 옵션 추가

---

## 🔄 하이브리드 접근 (권장)

### localStorage + Firebase Firestore

**전략**: 
- localStorage를 **1차 저장소**로 사용 (빠른 응답)
- Firestore를 **백업 및 동기화**로 사용

**장점**:
- ✅ 오프라인에서도 즉시 작동
- ✅ 온라인 시 자동 동기화
- ✅ 빠른 로컬 응답
- ✅ 클라우드 백업

**구현**:
```typescript
class HybridStorageManager {
  // 1. localStorage에 먼저 저장 (빠른 응답)
  saveLocal(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  
  // 2. 백그라운드에서 Firestore에 저장
  async saveCloud(key: string, value: string) {
    if (this.isOnline() && this.isAuthenticated()) {
      await firestore.collection('data').doc(key).set({ value });
    }
  }
  
  // 3. 동기화
  async sync() {
    const localData = this.getAllLocalData();
    await this.uploadToFirestore(localData);
  }
}
```

---

## 📊 비교표

| 기능 | Firebase Firestore | Supabase | IndexedDB | Google Drive |
|------|-------------------|----------|-----------|-------------|
| **서버리스** | ✅ | ✅ | ✅ | ✅ |
| **무료 플랜** | ✅ (충분) | ✅ (충분) | ✅ (무제한) | ✅ (15GB) |
| **다중 기기 동기화** | ✅ | ✅ | ❌ | ⚠️ (수동) |
| **실시간 업데이트** | ✅ | ✅ | ❌ | ❌ |
| **오프라인 지원** | ✅ | ⚠️ | ✅ | ❌ |
| **설정 난이도** | 쉬움 | 보통 | 쉬움 | 보통 |
| **인증** | ✅ (통합) | ✅ (통합) | ❌ | ⚠️ (OAuth) |
| **쿼리 기능** | ✅ | ✅✅ | ⚠️ | ❌ |
| **추천도** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 🎯 최종 결론

### **Firebase Firestore를 강력 추천합니다!**

**이유**:
1. 프로그램 특성과 완벽히 일치
2. 사용자 경험 크게 향상 (다중 기기 동기화)
3. 구현 난이도 낮음
4. 무료 플랜으로 충분
5. Google 인증 통합으로 간편

**다음 단계**:
1. Firebase Console에서 프로젝트 생성
2. Firestore 및 Authentication 활성화
3. 코드에 Firebase SDK 통합
4. 하이브리드 접근 (localStorage + Firestore)

이렇게 하면 기존 기능을 유지하면서 클라우드 동기화의 이점을 얻을 수 있습니다!

