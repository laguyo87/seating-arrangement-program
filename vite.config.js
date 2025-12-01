import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
  // 개발 모드에서는 base를 '/'로, 빌드 모드에서는 '/seating-arrangement-program/'로 설정
  const base = command === 'build' ? '/seating-arrangement-program/' : '/';
  
  return {
    base: base,
  server: {
      port: 8001,
      open: true,
      hmr: {
        overlay: true // 에러 오버레이 표시
        // clientPort를 제거하여 서버 포트를 자동으로 사용하도록 함
      },
      watch: {
        // dist 폴더 변경 감지 제외 (빌드 파일 변경으로 인한 불필요한 새로고침 방지)
        ignored: ['**/dist/**', '**/node_modules/**']
      }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: './index.html'
    },
    // 의존성을 번들에 포함
    commonjsOptions: {
      include: [/xlsx/, /node_modules/]
    },
    // 정적 파일 복사
    copyPublicDir: false
  },
    // 정적 파일 복사 설정
    publicDir: false,
    // xlsx 같은 외부 의존성을 번들에 포함
    optimizeDeps: {
      include: ['xlsx']
  }
  };
});

