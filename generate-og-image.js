// Node.js script to generate OG image using node-canvas
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 1200x630 is the standard OG image size
const width = 1200;
const height = 630;

// Create canvas
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// 배경 그라데이션
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// 텍스트 설정
ctx.fillStyle = 'white';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// 메인 제목 (아이콘과 텍스트)
ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
const mainText = '🪑 교실 자리 배치 프로그램';
ctx.fillText(mainText, width / 2, 280);

// 부제목
ctx.font = '32px "Segoe UI", Arial, sans-serif';
ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
ctx.fillText('좌석 랜덤 배치 • 고정 좌석 • 인쇄/저장/공유', width / 2, 380);

// 버전 정보
ctx.font = '24px "Segoe UI", Arial, sans-serif';
ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
ctx.fillText('Version 1.0.0', width / 2, 450);

// Save as PNG
const outputPath = path.join(__dirname, 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`✅ OG 이미지가 성공적으로 생성되었습니다: ${outputPath}`);