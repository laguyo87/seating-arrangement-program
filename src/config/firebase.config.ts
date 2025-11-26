/**
 * Firebase 설정 파일
 * 
 * ⚠️ 중요: 이 파일에 Firebase 프로젝트 설정 정보를 입력해야 합니다!
 * 
 * Firebase Console에서 설정 정보를 가져오는 방법:
 * 1. Firebase Console 접속: https://console.firebase.google.com/
 * 2. 프로젝트 선택
 * 3. 왼쪽 위 톱니바퀴 아이콘(⚙️) 클릭 → "프로젝트 설정"
 * 4. "내 앱" 섹션에서 웹 앱 선택
 * 5. "SDK 설정 및 구성" → "구성" 탭
 * 6. firebaseConfig 객체를 복사하여 아래에 붙여넣기
 */

export const firebaseConfig = {
    apiKey: "AIzaSyAccTCaHd2Dh8d6GmI1-C6T8pUBWI3m5-o",
    authDomain: "seating-arrangement-back-7ffa1.firebaseapp.com",
    projectId: "seating-arrangement-back-7ffa1",
    storageBucket: "seating-arrangement-back-7ffa1.firebasestorage.app",
    messagingSenderId: "4980454742",
    appId: "1:4980454742:web:f032f4eace9ca38c8292f7",
    measurementId: "G-79W5F2S3KR"
};

/**
 * Firebase 설정이 올바른지 확인하는 함수
 */
export function isFirebaseConfigValid(): boolean {
  return (
    firebaseConfig.apiKey !== "여기에_apiKey_입력" &&
    firebaseConfig.apiKey.length > 0 &&
    firebaseConfig.authDomain !== "여기에_authDomain_입력" &&
    firebaseConfig.authDomain.length > 0 &&
    firebaseConfig.projectId !== "여기에_projectId_입력" &&
    firebaseConfig.projectId.length > 0
  );
}

