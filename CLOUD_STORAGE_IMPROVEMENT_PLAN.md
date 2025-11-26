# 클라우드 저장소 연동 개선 계획

## 📋 개요

현재 애플리케이션은 브라우저의 `localStorage`를 사용하여 데이터를 저장하고 있습니다. 클라우드 저장소 연동을 통해 다음과 같은 이점을 제공할 수 있습니다:

1. **다중 기기 접근**: 다른 컴퓨터나 모바일에서도 동일한 데이터에 접근 가능
2. **데이터 백업**: 브라우저 데이터 삭제 시에도 안전하게 보관
3. **데이터 동기화**: 여러 기기에서 작업 시 자동 동기화
4. **용량 확장**: localStorage의 5-10MB 제한을 넘어서는 대용량 데이터 저장

---

## 🎯 구현 목표

### 1. Google Drive 연동
- Google Drive API를 사용하여 파일 저장/불러오기
- OAuth 2.0 인증을 통한 안전한 접근
- 파일 형식: JSON 파일로 저장

### 2. Dropbox 연동
- Dropbox API를 사용하여 파일 저장/불러오기
- OAuth 2.0 인증을 통한 안전한 접근
- 파일 형식: JSON 파일로 저장

### 3. 자동 백업 기능
- 주기적 자동 백업 (예: 5분마다)
- 변경사항 감지 시 자동 저장
- 백업 이력 관리

---

## 🏗️ 아키텍처 설계

### 현재 구조
```
StorageManager (localStorage)
  ├── 옵션 설정 저장
  ├── 자리 배치도 저장
  ├── 반별 데이터 저장
  └── 히스토리 저장
```

### 개선된 구조
```
StorageManager (추상화 레이어)
  ├── LocalStorageAdapter (기존 localStorage)
  ├── CloudStorageAdapter (인터페이스)
  │   ├── GoogleDriveAdapter
  │   ├── DropboxAdapter
  │   └── (향후 추가 가능)
  └── SyncManager (동기화 관리)
      ├── 자동 백업 스케줄러
      ├── 충돌 해결 로직
      └── 변경사항 추적
```

---

## 📦 저장할 데이터 구조

### 1. 전체 백업 파일 (전체 데이터)
```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "options": { /* 옵션 설정 */ },
    "classes": [
      {
        "id": "class_123",
        "name": "1학년 1반",
        "layout": { /* 자리 배치도 */ },
        "students": [ /* 학생 정보 */ ]
      }
    ],
    "history": [ /* 확정된 자리 이력 */ ],
    "classStudentData": [ /* 우리반 학생 데이터 */ ]
  }
}
```

### 2. 개별 반 데이터 파일 (반별 저장)
```
seating-arrangement-{classId}.json
```

---

## 🔧 구현 방법

### 1단계: CloudStorageAdapter 인터페이스 생성

```typescript
// src/managers/cloud/CloudStorageAdapter.ts
export interface CloudStorageAdapter {
  // 인증
  authenticate(): Promise<boolean>;
  isAuthenticated(): boolean;
  logout(): Promise<void>;
  
  // 파일 작업
  saveFile(filename: string, data: string): Promise<boolean>;
  loadFile(filename: string): Promise<string | null>;
  listFiles(): Promise<string[]>;
  deleteFile(filename: string): Promise<boolean>;
  
  // 메타데이터
  getFileMetadata(filename: string): Promise<FileMetadata | null>;
}
```

### 2단계: Google Drive Adapter 구현

#### 필요한 라이브러리
```bash
npm install googleapis
```

#### 구현 예시
```typescript
// src/managers/cloud/GoogleDriveAdapter.ts
import { google } from 'googleapis';

export class GoogleDriveAdapter implements CloudStorageAdapter {
  private oauth2Client: OAuth2Client | null = null;
  private accessToken: string | null = null;
  
  async authenticate(): Promise<boolean> {
    // OAuth 2.0 인증 플로우
    // 1. 사용자에게 Google 로그인 요청
    // 2. 인증 코드 받기
    // 3. 액세스 토큰 교환
    // 4. 토큰 저장 (localStorage 또는 sessionStorage)
  }
  
  async saveFile(filename: string, data: string): Promise<boolean> {
    // Google Drive API를 사용하여 파일 저장
    // 기존 파일이 있으면 업데이트, 없으면 생성
  }
  
  async loadFile(filename: string): Promise<string | null> {
    // Google Drive에서 파일 읽기
  }
}
```

#### Google Cloud Console 설정 필요사항
1. Google Cloud 프로젝트 생성
2. Google Drive API 활성화
3. OAuth 2.0 클라이언트 ID 생성
4. 승인된 리디렉션 URI 설정 (예: `https://laguyo87.github.io/seating-arrangement-program/oauth/callback`)

### 3단계: Dropbox Adapter 구현

#### 필요한 라이브러리
```bash
npm install dropbox
```

#### 구현 예시
```typescript
// src/managers/cloud/DropboxAdapter.ts
import { Dropbox } from 'dropbox';

export class DropboxAdapter implements CloudStorageAdapter {
  private dbx: Dropbox | null = null;
  private accessToken: string | null = null;
  
  async authenticate(): Promise<boolean> {
    // Dropbox OAuth 2.0 인증 플로우
  }
  
  async saveFile(filename: string, data: string): Promise<boolean> {
    // Dropbox API를 사용하여 파일 저장
  }
}
```

#### Dropbox App 설정 필요사항
1. Dropbox App Console에서 앱 생성
2. OAuth 2.0 설정
3. 리디렉션 URI 설정

### 4단계: StorageManager 확장

```typescript
// src/managers/StorageManager.ts 확장
export class StorageManager {
  private localAdapter: LocalStorageAdapter;
  private cloudAdapter: CloudStorageAdapter | null = null;
  private syncManager: SyncManager;
  
  // 이중 저장: localStorage + 클라우드
  async saveWithCloud(key: string, value: string): Promise<boolean> {
    // 1. localStorage에 먼저 저장 (빠른 응답)
    const localSuccess = this.localAdapter.setItem(key, value);
    
    // 2. 백그라운드에서 클라우드에 저장
    if (this.cloudAdapter && this.cloudAdapter.isAuthenticated()) {
      this.syncManager.queueSync(key, value);
    }
    
    return localSuccess;
  }
}
```

### 5단계: SyncManager 구현 (자동 백업)

```typescript
// src/managers/SyncManager.ts
export class SyncManager {
  private syncQueue: SyncTask[] = [];
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;
  private syncInterval: number = 5 * 60 * 1000; // 5분
  
  constructor() {
    // 주기적 자동 동기화
    setInterval(() => {
      this.autoSync();
    }, this.syncInterval);
    
    // 페이지 언로드 시 마지막 동기화
    window.addEventListener('beforeunload', () => {
      this.forceSync();
    });
  }
  
  async autoSync(): Promise<void> {
    if (this.isSyncing) return;
    
    // 변경사항이 있는 경우에만 동기화
    if (this.hasChanges()) {
      await this.syncAll();
    }
  }
  
  private hasChanges(): boolean {
    // localStorage의 마지막 수정 시간과 클라우드의 마지막 동기화 시간 비교
    return true; // 실제 구현 필요
  }
}
```

---

## 🎨 UI/UX 개선

### 1. 클라우드 연결 버튼 추가
```
상단 바에 "☁️ 클라우드 연결" 버튼 추가
  ├── Google Drive 연결
  ├── Dropbox 연결
  └── 연결 해제
```

### 2. 동기화 상태 표시
```
상단 바에 동기화 상태 아이콘
  ├── ✅ 동기화 완료
  ├── 🔄 동기화 중...
  ├── ⚠️ 동기화 오류
  └── 📴 클라우드 미연결
```

### 3. 백업 설정 모달
```
설정 메뉴에 "클라우드 백업" 섹션 추가
  ├── 자동 백업 간격 설정 (1분, 5분, 15분, 수동)
  ├── 백업 이력 보기
  └── 백업 복원
```

---

## 🔒 보안 고려사항

### 1. OAuth 2.0 인증
- **액세스 토큰**: sessionStorage에 저장 (브라우저 닫으면 만료)
- **리프레시 토큰**: 암호화하여 localStorage에 저장 (선택사항)
- **토큰 만료 처리**: 자동 갱신 또는 재인증 요청

### 2. 데이터 암호화 (선택사항)
- 민감한 학생 정보는 클라이언트 측 암호화 고려
- AES-256 암호화 라이브러리 사용 (예: `crypto-js`)

### 3. CORS 및 리디렉션 URI
- GitHub Pages 도메인에 맞는 리디렉션 URI 설정
- 개발 환경과 프로덕션 환경 분리

---

## ⚠️ 제약사항 및 고려사항

### 1. API 할당량
- **Google Drive API**: 
  - 무료: 초당 1,000 요청
  - 일일 할당량: 1,000,000,000 요청
- **Dropbox API**:
  - 무료: 초당 600 요청
  - 일일 할당량: 제한 없음

### 2. 파일 크기 제한
- **Google Drive**: 파일당 5TB
- **Dropbox**: 파일당 350GB (무료 플랜은 2GB)
- 현재 애플리케이션 데이터는 수 KB ~ 수 MB 수준이므로 문제 없음

### 3. 네트워크 의존성
- 오프라인 환경에서는 localStorage만 사용
- 온라인 복구 시 자동 동기화

### 4. 비용
- **Google Drive**: 무료 15GB, 추가 저장공간 유료
- **Dropbox**: 무료 2GB, 추가 저장공간 유료
- 현재 애플리케이션 데이터 크기로는 무료 플랜으로 충분

---

## 📊 구현 우선순위

### Phase 1: 기본 인프라 (1-2주)
1. ✅ CloudStorageAdapter 인터페이스 정의
2. ✅ StorageManager 확장 (이중 저장 지원)
3. ✅ UI에 클라우드 연결 버튼 추가

### Phase 2: Google Drive 연동 (1-2주)
1. ✅ Google Cloud Console 설정
2. ✅ GoogleDriveAdapter 구현
3. ✅ OAuth 2.0 인증 플로우
4. ✅ 파일 저장/불러오기 기능

### Phase 3: Dropbox 연동 (1주)
1. ✅ Dropbox App 설정
2. ✅ DropboxAdapter 구현
3. ✅ OAuth 2.0 인증 플로우

### Phase 4: 자동 백업 (1주)
1. ✅ SyncManager 구현
2. ✅ 변경사항 감지
3. ✅ 주기적 자동 동기화
4. ✅ 충돌 해결 로직

### Phase 5: 고급 기능 (선택사항)
1. ⏳ 다중 기기 동기화
2. ⏳ 백업 이력 관리
3. ⏳ 데이터 암호화
4. ⏳ 오프라인 큐 관리

---

## 🧪 테스트 계획

### 1. 단위 테스트
- CloudStorageAdapter 인터페이스 구현 테스트
- 각 Adapter의 saveFile/loadFile 테스트
- SyncManager의 동기화 로직 테스트

### 2. 통합 테스트
- OAuth 2.0 인증 플로우 테스트
- 실제 Google Drive/Dropbox API 연동 테스트
- 오프라인/온라인 전환 시나리오 테스트

### 3. 사용자 테스트
- 다양한 브라우저에서 테스트
- 모바일 기기에서 테스트
- 네트워크 불안정 환경 테스트

---

## 📚 참고 자료

### Google Drive API
- [Google Drive API 문서](https://developers.google.com/drive/api)
- [OAuth 2.0 가이드](https://developers.google.com/identity/protocols/oauth2)
- [JavaScript 클라이언트 라이브러리](https://github.com/google/google-api-javascript-client)

### Dropbox API
- [Dropbox API 문서](https://www.dropbox.com/developers/documentation)
- [Dropbox JavaScript SDK](https://github.com/dropbox/dropbox-sdk-js)

### 일반 참고
- [OAuth 2.0 스펙](https://oauth.net/2/)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

---

## 💡 대안 및 간단한 구현 방법

### 대안 1: Export/Import 기능 강화
클라우드 연동 없이도 사용자가 수동으로 백업할 수 있도록:
- "전체 데이터 내보내기" 기능 (JSON 파일 다운로드)
- "전체 데이터 가져오기" 기능 (JSON 파일 업로드)
- **장점**: 구현 간단, 추가 인증 불필요
- **단점**: 자동화 없음, 사용자가 수동으로 관리

### 대안 2: Firebase 사용
Google의 Firebase를 사용하여:
- Firebase Authentication (Google 로그인)
- Cloud Firestore (데이터베이스)
- **장점**: Google 인증 통합, 실시간 동기화, 무료 할당량 충분
- **단점**: Firebase 프로젝트 설정 필요, Google에 의존

### 대안 3: IndexedDB + Service Worker
브라우저 내장 기술만 사용:
- IndexedDB (localStorage보다 큰 용량)
- Service Worker (백그라운드 동기화)
- **장점**: 외부 서비스 불필요, 완전 무료
- **단점**: 기기 간 동기화 불가, 브라우저 제한

---

## 🎯 권장 구현 방안

**단계적 접근**을 권장합니다:

1. **1단계**: Export/Import 기능 강화 (즉시 구현 가능)
   - 전체 데이터 백업/복원 기능
   - 사용자가 수동으로 Google Drive/Dropbox에 업로드 가능

2. **2단계**: Google Drive API 연동 (중기)
   - 가장 널리 사용되는 서비스
   - OAuth 2.0 인증 구현

3. **3단계**: 자동 백업 기능 (장기)
   - SyncManager 구현
   - 주기적 자동 동기화

이렇게 단계적으로 구현하면 각 단계에서 사용자 피드백을 받아 다음 단계를 개선할 수 있습니다.

