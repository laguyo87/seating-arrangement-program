#!/bin/bash

# 브라우저 테스트용 HTTP 서버 시작 스크립트

echo "🔨 프로젝트 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

echo "✅ 빌드 완료"
echo ""
echo "🚀 HTTP 서버 시작 중..."
echo "📌 브라우저에서 http://localhost:8000 접속하세요"
echo ""
echo "서버를 중지하려면 Ctrl+C를 누르세요"
echo ""

# HTTP 서버 시작
python3 -m http.server 8000

