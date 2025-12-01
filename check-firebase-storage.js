/**
 * Firebase 저장 상태 확인 스크립트
 * 브라우저 콘솔에서 실행하여 Firebase 저장 상태를 확인합니다.
 */

// 브라우저 콘솔에서 실행할 함수
window.checkFirebaseStorage = async function() {
    console.log('🔍 Firebase 저장 상태 확인 시작...\n');
    
    // MainController 인스턴스 찾기 (전역 변수에 접근)
    const mainController = window.mainController;
    
    if (!mainController) {
        console.error('❌ MainController를 찾을 수 없습니다.');
        console.log('💡 팁: 애플리케이션이 완전히 로드된 후 다시 시도하세요.');
        return;
    }
    
    // FirebaseStorageManager 확인
    const firebaseStorageManager = mainController.firebaseStorageManager;
    
    if (!firebaseStorageManager) {
        console.error('❌ FirebaseStorageManager를 찾을 수 없습니다.');
        return;
    }
    
    // 로그인 상태 확인
    const isAuthenticated = firebaseStorageManager.getIsAuthenticated();
    const currentUser = firebaseStorageManager.getCurrentUser();
    
    console.log('📊 인증 상태:');
    console.log('  - 로그인 여부:', isAuthenticated ? '✅ 로그인됨' : '❌ 로그인 안 됨');
    console.log('  - 사용자:', currentUser ? currentUser.email : '없음');
    console.log('  - 사용자 ID:', currentUser ? currentUser.uid : '없음');
    console.log('');
    
    if (!isAuthenticated || !currentUser) {
        console.warn('⚠️ 로그인이 필요합니다. Firebase에 저장하려면 먼저 로그인하세요.');
        return;
    }
    
    // ClassManager 확인
    const classManager = mainController.classManager;
    
    if (!classManager) {
        console.error('❌ ClassManager를 찾을 수 없습니다.');
        return;
    }
    
    // 반 목록 확인
    const classList = classManager.getClassList();
    const currentClassId = classManager.getCurrentClassId();
    
    console.log('📚 반 정보:');
    console.log('  - 반 개수:', classList.length);
    console.log('  - 현재 선택된 반:', currentClassId || '없음');
    console.log('  - 반 목록:', classList);
    console.log('');
    
    // Firebase에서 데이터 불러오기 시도
    try {
        console.log('🔄 Firebase에서 데이터 불러오기 시도...');
        
        const firebaseClassList = await firebaseStorageManager.loadClassList();
        console.log('  - Firebase 반 목록:', firebaseClassList);
        console.log('  - Firebase 반 개수:', firebaseClassList.length);
        console.log('');
        
        if (firebaseClassList.length === 0 && classList.length > 0) {
            console.warn('⚠️ Firebase에 반 목록이 없습니다. 저장이 필요합니다.');
        } else if (firebaseClassList.length > 0) {
            console.log('✅ Firebase에 반 목록이 저장되어 있습니다!');
        }
        
        // 현재 선택된 반의 자리 배치도 확인
        if (currentClassId) {
            console.log('🔄 현재 반의 자리 배치도 확인...');
            const layout = await firebaseStorageManager.loadClassLayout(currentClassId);
            
            if (layout) {
                console.log('✅ Firebase에 자리 배치도가 저장되어 있습니다!');
                console.log('  - 반 이름:', layout.className);
                console.log('  - 좌석 수:', layout.seats.length);
                console.log('  - 학생 수:', layout.students.length);
                console.log('  - 저장 시간:', layout.timestamp);
            } else {
                console.warn('⚠️ Firebase에 자리 배치도가 없습니다.');
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase 데이터 불러오기 실패:', error);
    }
    
    console.log('\n📝 저장 테스트 방법:');
    console.log('1. 반을 선택하세요');
    console.log('2. 자리 배치하기 버튼을 클릭하세요');
    console.log('3. 💾 저장하기 버튼을 클릭하세요');
    console.log('4. 콘솔에서 "✅ Firebase에" 로그를 확인하세요');
    console.log('\n🌐 Firebase Console에서 확인:');
    console.log('https://console.firebase.google.com/project/seating-arrangement-back-7ffa1/firestore/data');
    console.log(`경로: users/${currentUser.uid}/classes/`);
};

// 사용법 안내
console.log('📋 Firebase 저장 상태 확인 스크립트가 로드되었습니다.');
console.log('💡 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('   checkFirebaseStorage()');







 * Firebase 저장 상태 확인 스크립트
 * 브라우저 콘솔에서 실행하여 Firebase 저장 상태를 확인합니다.
 */

// 브라우저 콘솔에서 실행할 함수
window.checkFirebaseStorage = async function() {
    console.log('🔍 Firebase 저장 상태 확인 시작...\n');
    
    // MainController 인스턴스 찾기 (전역 변수에 접근)
    const mainController = window.mainController;
    
    if (!mainController) {
        console.error('❌ MainController를 찾을 수 없습니다.');
        console.log('💡 팁: 애플리케이션이 완전히 로드된 후 다시 시도하세요.');
        return;
    }
    
    // FirebaseStorageManager 확인
    const firebaseStorageManager = mainController.firebaseStorageManager;
    
    if (!firebaseStorageManager) {
        console.error('❌ FirebaseStorageManager를 찾을 수 없습니다.');
        return;
    }
    
    // 로그인 상태 확인
    const isAuthenticated = firebaseStorageManager.getIsAuthenticated();
    const currentUser = firebaseStorageManager.getCurrentUser();
    
    console.log('📊 인증 상태:');
    console.log('  - 로그인 여부:', isAuthenticated ? '✅ 로그인됨' : '❌ 로그인 안 됨');
    console.log('  - 사용자:', currentUser ? currentUser.email : '없음');
    console.log('  - 사용자 ID:', currentUser ? currentUser.uid : '없음');
    console.log('');
    
    if (!isAuthenticated || !currentUser) {
        console.warn('⚠️ 로그인이 필요합니다. Firebase에 저장하려면 먼저 로그인하세요.');
        return;
    }
    
    // ClassManager 확인
    const classManager = mainController.classManager;
    
    if (!classManager) {
        console.error('❌ ClassManager를 찾을 수 없습니다.');
        return;
    }
    
    // 반 목록 확인
    const classList = classManager.getClassList();
    const currentClassId = classManager.getCurrentClassId();
    
    console.log('📚 반 정보:');
    console.log('  - 반 개수:', classList.length);
    console.log('  - 현재 선택된 반:', currentClassId || '없음');
    console.log('  - 반 목록:', classList);
    console.log('');
    
    // Firebase에서 데이터 불러오기 시도
    try {
        console.log('🔄 Firebase에서 데이터 불러오기 시도...');
        
        const firebaseClassList = await firebaseStorageManager.loadClassList();
        console.log('  - Firebase 반 목록:', firebaseClassList);
        console.log('  - Firebase 반 개수:', firebaseClassList.length);
        console.log('');
        
        if (firebaseClassList.length === 0 && classList.length > 0) {
            console.warn('⚠️ Firebase에 반 목록이 없습니다. 저장이 필요합니다.');
        } else if (firebaseClassList.length > 0) {
            console.log('✅ Firebase에 반 목록이 저장되어 있습니다!');
        }
        
        // 현재 선택된 반의 자리 배치도 확인
        if (currentClassId) {
            console.log('🔄 현재 반의 자리 배치도 확인...');
            const layout = await firebaseStorageManager.loadClassLayout(currentClassId);
            
            if (layout) {
                console.log('✅ Firebase에 자리 배치도가 저장되어 있습니다!');
                console.log('  - 반 이름:', layout.className);
                console.log('  - 좌석 수:', layout.seats.length);
                console.log('  - 학생 수:', layout.students.length);
                console.log('  - 저장 시간:', layout.timestamp);
            } else {
                console.warn('⚠️ Firebase에 자리 배치도가 없습니다.');
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase 데이터 불러오기 실패:', error);
    }
    
    console.log('\n📝 저장 테스트 방법:');
    console.log('1. 반을 선택하세요');
    console.log('2. 자리 배치하기 버튼을 클릭하세요');
    console.log('3. 💾 저장하기 버튼을 클릭하세요');
    console.log('4. 콘솔에서 "✅ Firebase에" 로그를 확인하세요');
    console.log('\n🌐 Firebase Console에서 확인:');
    console.log('https://console.firebase.google.com/project/seating-arrangement-back-7ffa1/firestore/data');
    console.log(`경로: users/${currentUser.uid}/classes/`);
};

// 사용법 안내
console.log('📋 Firebase 저장 상태 확인 스크립트가 로드되었습니다.');
console.log('💡 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('   checkFirebaseStorage()');







