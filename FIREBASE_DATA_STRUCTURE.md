# Firebase에 저장되는 데이터 구조

## 📊 저장되는 데이터 종류

### 1. 반 목록 (Class List)
- **경로**: `users/{userId}`
- **필드**:
  - `classList`: 반 정보 배열 (ClassInfo[])
    - `id`: 반 ID
    - `name`: 반 이름
    - `createdAt`: 생성 날짜
    - `lastModified`: 마지막 수정 날짜
  - `lastUpdated`: 마지막 업데이트 시간 (Timestamp)

### 2. 반별 자리 배치도 (Class Layout)
- **경로**: `users/{userId}/classes/{classId}`
- **필드**:
  - `seats`: 좌석 배열 (Seat[])
    - `id`: 좌석 ID
    - `position`: 좌석 위치 (x, y)
    - `isActive`: 활성화 여부
    - `isFixed`: 고정 좌석 여부
    - `studentId`: 학생 ID
    - `studentName`: 학생 이름
  - `students`: 학생 배열 (Student[])
    - `id`: 학생 ID
    - `name`: 학생 이름
    - `gender`: 성별 ('M' | 'F')
  - `timestamp`: 저장 시간 (ISO 문자열)
  - `className`: 반 이름
  - `lastUpdated`: 마지막 업데이트 시간 (Timestamp)

### 3. 반별 확정된 자리 이력 (Seat History)
- **경로**: `users/{userId}/classes/{classId}/seatHistory/history`
- **필드**:
  - `history`: 확정된 자리 이력 배열
    - 각 이력 항목:
      - `id`: 이력 ID
      - `date`: 날짜 (yy-mm-dd 형식)
      - `layout`: 좌석 배치 배열
        - `seatId`: 좌석 ID
        - `studentName`: 학생 이름
        - `gender`: 성별 ('M' | 'F')
      - `pairInfo`: 짝꿍 정보 배열 (선택적)
        - `student1`: 학생1 이름
        - `student2`: 학생2 이름
      - `timestamp`: 타임스탬프 (밀리초)
      - `layoutType`: 배치 형태 ('single-uniform' | 'pair-uniform' | 'group')
      - `singleMode`: 1명씩 배치 모드 ('basic-row' | 'gender-row' | 'gender-symmetric-row') (선택적)
      - `pairMode`: 짝꿍 배치 모드 ('gender-pair' | 'same-gender-pair') (선택적)
      - `partitionCount`: 분단 수 (선택적)
      - `groupSize`: 모둠 크기 ('group-3' | 'group-4' | 'group-5' | 'group-6') (선택적)
      - `classId`: 반 ID (선택적)
  - `lastUpdated`: 마지막 업데이트 시간 (Timestamp)

### 4. 전역 방문자 수 (Global Visitor Count)
- **경로**: `globalStats/visitorCount`
- **필드**:
  - `count`: 총 방문자 수 (number)
  - `lastUpdated`: 마지막 업데이트 시간 (Timestamp)

## 📁 Firestore 데이터베이스 구조

```
users/
  └── {userId}/
      ├── classList: ClassInfo[]
      ├── lastUpdated: Timestamp
      └── classes/
          └── {classId}/
              ├── seats: Seat[]
              ├── students: Student[]
              ├── timestamp: string
              ├── className: string
              ├── lastUpdated: Timestamp
              └── seatHistory/
                  └── history/
                      ├── history: SeatHistoryItem[]
                      └── lastUpdated: Timestamp

globalStats/
  └── visitorCount/
      ├── count: number
      └── lastUpdated: Timestamp
```

## 🔄 저장 시점

1. **반 목록**: 반 추가/수정/삭제 시
2. **자리 배치도**: '자리 확정하기(저장) 💾' 버튼 클릭 시
3. **확정된 자리 이력**: '자리 확정하기(저장) 💾' 버튼 클릭 시
4. **방문자 수**: 페이지 로드 시 자동 증가

## 🔐 접근 권한

- 모든 데이터는 사용자별로 분리되어 저장됨 (`users/{userId}`)
- 각 사용자는 자신의 데이터만 접근 가능
- 방문자 수는 전역 데이터로 모든 사용자가 공유

