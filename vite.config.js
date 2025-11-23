import { defineConfig } from 'vite';

export default defineConfig({
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
    sourcemap: true
  }
});

