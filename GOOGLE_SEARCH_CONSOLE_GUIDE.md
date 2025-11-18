# 구글 서치 콘솔 등록 가이드

## 📋 현재 상태

✅ **이미 설정된 항목:**
- Google 사이트 인증 메타 태그: `index.html`에 포함됨
- sitemap.xml: 사이트맵 파일 존재
- robots.txt: 검색 엔진 크롤링 설정 파일 존재
- Canonical URL: `index.html`에 설정됨

## 🔧 구글 서치 콘솔 등록 단계

### 1단계: Google Search Console 접속
1. https://search.google.com/search-console 접속
2. Google 계정으로 로그인

### 2단계: 속성 추가
1. 왼쪽 상단의 **"속성 추가"** 버튼 클릭
2. **"URL 접두어"** 방식 선택
3. 사이트 URL 입력:
   ```
   https://laguyo87.github.io/seating-arrangement-program
   ```
4. **"계속"** 버튼 클릭

### 3단계: 소유권 확인
현재 `index.html`에 이미 Google 사이트 인증 메타 태그가 포함되어 있습니다:

```html
<meta name="google-site-verification" content="xNE5LVH11OXsGxQ9RspfZlH-SF3M45DFMVU6_9oP174" />
```

**방법 1: HTML 태그 방법 (권장)**
1. Google Search Console에서 **"HTML 태그"** 방법 선택
2. 제공된 메타 태그의 `content` 값을 확인
3. 현재 `index.html`의 메타 태그와 일치하는지 확인
4. 일치하면 **"확인"** 버튼 클릭

**방법 2: HTML 파일 업로드**
- Google에서 제공하는 HTML 파일을 다운로드하여 사이트 루트에 업로드

**방법 3: Google Analytics**
- Google Analytics가 연결되어 있다면 자동으로 확인 가능

### 4단계: 사이트맵 제출
1. 왼쪽 메뉴에서 **"사이트맵"** 클릭
2. **"새 사이트맵 추가"** 클릭
3. 사이트맵 URL 입력:
   ```
   https://laguyo87.github.io/seating-arrangement-program/sitemap.xml
   ```
4. **"제출"** 버튼 클릭

### 5단계: URL 검사 (선택사항)
1. 왼쪽 메뉴에서 **"URL 검사"** 클릭
2. 메인 페이지 URL 입력:
   ```
   https://laguyo87.github.io/seating-arrangement-program/
   ```
3. **"색인 생성 요청"** 클릭 (선택사항)

## ✅ 확인 사항

### 현재 설정 확인
- ✅ Google 사이트 인증 메타 태그: `index.html` 26번째 줄
- ✅ sitemap.xml: 루트 디렉토리에 존재
- ✅ robots.txt: 루트 디렉토리에 존재
- ✅ Canonical URL: `index.html`에 설정됨

### 추가 권장 사항

1. **구조화된 데이터 (Schema.org)**
   - 웹사이트 정보를 구조화된 데이터로 추가하면 검색 결과에 더 나은 정보 표시 가능

2. **Google Analytics 연동**
   - Google Analytics와 연동하면 더 상세한 분석 가능

3. **모바일 사용성 테스트**
   - Google Search Console의 "모바일 사용성" 도구로 모바일 최적화 확인

## 📝 참고사항

- 사이트맵 제출 후 Google이 크롤링하는 데 며칠이 걸릴 수 있습니다
- 색인 생성은 보통 1-2주 정도 소요됩니다
- 정기적으로 Google Search Console을 확인하여 색인 상태를 모니터링하세요

## 🔗 유용한 링크

- Google Search Console: https://search.google.com/search-console
- 사이트맵 생성기: https://www.xml-sitemaps.com/
- Google 검색 센터: https://developers.google.com/search

