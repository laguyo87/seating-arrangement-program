/**
 * Firebase 설정 파일
 *
 * ⚠️ 중요: .env 파일에 Firebase 프로젝트 설정 정보를 입력해야 합니다!
 * .env.example 파일을 참고하여 .env 파일을 생성하세요.
 */
export declare const firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
};
/**
 * Firebase 설정이 올바른지 확인하는 함수
 */
export declare function isFirebaseConfigValid(): boolean;
//# sourceMappingURL=firebase.config.d.ts.map