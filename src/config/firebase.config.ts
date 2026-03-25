/**
 * Firebase 설정 파일
 *
 * ⚠️ 중요: .env 파일에 Firebase 프로젝트 설정 정보를 입력해야 합니다!
 * .env.example 파일을 참고하여 .env 파일을 생성하세요.
 */

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

/**
 * Firebase 설정이 올바른지 확인하는 함수
 */
export function isFirebaseConfigValid(): boolean {
  return (
    firebaseConfig.apiKey.length > 0 &&
    firebaseConfig.authDomain.length > 0 &&
    firebaseConfig.projectId.length > 0
  );
}

