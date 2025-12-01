/**
 * 애니메이션 매니저
 * 커튼, 폭죽 애니메이션 및 사운드 효과 담당
 */

import { logger } from '../utils/logger.js';

/**
 * AnimationManager가 필요로 하는 의존성 인터페이스
 */
export interface AnimationManagerDependencies {
    setTimeoutSafe: (callback: () => void, delay: number) => void;
    isDevelopmentMode: () => boolean;
}

/**
 * 애니메이션 매니저 클래스
 */
export class AnimationManager {
    private deps: AnimationManagerDependencies;

    constructor(dependencies: AnimationManagerDependencies) {
        this.deps = dependencies;
    }

    /**
     * 커튼 애니메이션 시작
     */
    public startCurtainAnimation(): void {
        const curtainOverlay = document.getElementById('curtain-overlay');
        if (!curtainOverlay) return;

        // 커튼 오버레이 활성화
        curtainOverlay.classList.add('active');
        curtainOverlay.classList.remove('opening');
        
        // 약간의 지연 후 닫기 애니메이션 시작 (렌더링 보장)
        this.deps.setTimeoutSafe(() => {
            curtainOverlay.classList.add('closing');
        }, 10);
    }

    /**
     * 커튼 애니메이션 종료 (열기)
     */
    public openCurtain(): void {
        const curtainOverlay = document.getElementById('curtain-overlay');
        if (!curtainOverlay) return;

        // 열기 애니메이션 시작
        curtainOverlay.classList.remove('closing');
        curtainOverlay.classList.add('opening');

        // 애니메이션 완료 후 오버레이 숨기기
        this.deps.setTimeoutSafe(() => {
            curtainOverlay.classList.remove('active', 'opening');
        }, 600); // transition 시간과 동일 (0.6s)
    }

    /**
     * 커튼 애니메이션 즉시 종료 (에러 시)
     */
    public stopCurtainAnimation(): void {
        const curtainOverlay = document.getElementById('curtain-overlay');
        if (!curtainOverlay) return;

        curtainOverlay.classList.remove('active', 'closing', 'opening');
    }

    /**
     * 폭죽 애니메이션 시작
     */
    public startFireworks(): void {
        const container = document.getElementById('fireworks-container');
        if (!container) return;

        // 컨테이너 활성화 및 초기화
        container.classList.add('active');
        container.innerHTML = '';

        // 화면 중앙 위치 계산
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // 여러 폭죽 동시 발사 (8-12개로 증가)
        const fireworkCount = 8 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < fireworkCount; i++) {
            // 각 폭죽의 위치를 화면 중앙 주변에 랜덤 배치 (범위 확대)
            const offsetX = (Math.random() - 0.5) * (rect.width * 0.8);
            const offsetY = (Math.random() - 0.5) * (rect.height * 0.8);
            const x = centerX + offsetX;
            const y = centerY + offsetY;

            // 약간의 지연을 주어 순차적으로 터지게 (간격 단축)
            this.deps.setTimeoutSafe(() => {
                this.createFirework(container, x, y);
            }, i * 100);
        }

        // 애니메이션 완료 후 컨테이너 비활성화 (시간 연장)
        this.deps.setTimeoutSafe(() => {
            container.classList.remove('active');
            container.innerHTML = '';
        }, 3000);
    }

    /**
     * 개별 폭죽 생성 및 파티클 애니메이션
     */
    private createFirework(container: HTMLElement, x: number, y: number): void {
        // 폭죽 색상 배열 (더 화려한 색상들 추가)
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
            '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8C471', '#82E0AA',
            '#FF6B9D', '#C44569', '#F8B500', '#00D2FF', '#FC6C85',
            '#A29BFE', '#FD79A8', '#FDCB6E', '#00B894', '#E17055'
        ];

        // 랜덤 색상 선택 (3-5개로 증가)
        const fireworkColors = [];
        const colorCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < colorCount; i++) {
            fireworkColors.push(colors[Math.floor(Math.random() * colors.length)]);
        }

        // 폭죽 중심점 생성 (더 크게)
        const center = document.createElement('div');
        center.className = 'firework';
        center.style.left = `${x}px`;
        center.style.top = `${y}px`;
        center.style.width = '8px';
        center.style.height = '8px';
        center.style.backgroundColor = fireworkColors[0];
        center.style.boxShadow = `0 0 20px ${fireworkColors[0]}, 0 0 40px ${fireworkColors[0]}`;
        container.appendChild(center);

        // 파티클 생성 (40-60개로 증가)
        const particleCount = 40 + Math.floor(Math.random() * 21);
        const angleStep = (Math.PI * 2) / particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = angleStep * i;
            // 거리 증가 (120-220px)
            const distance = 120 + Math.random() * 100;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;

            // 파티클 색상 (주기적으로 다른 색상 사용)
            const colorIndex = i % fireworkColors.length;
            const color = fireworkColors[colorIndex];

            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 12px ${color}, 0 0 24px ${color}`;
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            
            container.appendChild(particle);
        }

        // 추가: 별 모양 파티클 (더 화려하게)
        if (Math.random() > 0.5) {
            const starCount = 8 + Math.floor(Math.random() * 5);
            const starAngleStep = (Math.PI * 2) / starCount;
            for (let i = 0; i < starCount; i++) {
                const angle = starAngleStep * i;
                const starDistance = 160 + Math.random() * 80;
                const dx = Math.cos(angle) * starDistance;
                const dy = Math.sin(angle) * starDistance;
                const starColor = fireworkColors[i % fireworkColors.length];

                const star = document.createElement('div');
                star.className = 'firework-particle';
                star.style.left = `${x}px`;
                star.style.top = `${y}px`;
                star.style.width = '12px';
                star.style.height = '12px';
                star.style.borderRadius = '0';
                star.style.backgroundColor = starColor;
                star.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                star.style.boxShadow = `0 0 15px ${starColor}, 0 0 30px ${starColor}`;
                star.style.setProperty('--dx', `${dx}px`);
                star.style.setProperty('--dy', `${dy}px`);
                
                container.appendChild(star);
            }
        }

        // 폭죽 중심 제거 (애니메이션 후)
        this.deps.setTimeoutSafe(() => {
            if (center.parentNode) {
                center.remove();
            }
        }, 1000);
    }

    /**
     * 자리 배치 실행 시 음향 효과 재생 (3초)
     */
    public playArrangementSound(): void {
        try {
            // Web Audio API를 사용하여 음향 효과 생성
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const duration = 3.0; // 3초
            const sampleRate = audioContext.sampleRate;
            const frameCount = Math.floor(sampleRate * duration);
            const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
            const channelData = buffer.getChannelData(0);

            // 화려한 음향 효과 생성 (여러 주파수 혼합)
            for (let i = 0; i < frameCount; i++) {
                const t = i / sampleRate;
                
                // 기본 톤 (C major chord: C, E, G)
                const freq1 = 261.63; // C4
                const freq2 = 329.63; // E4
                const freq3 = 392.00; // G4
                
                // 감쇠 함수 (점점 작아지게)
                const envelope = Math.exp(-t * 0.5);
                
                // 여러 주파수 혼합
                const wave1 = Math.sin(2 * Math.PI * freq1 * t) * 0.3;
                const wave2 = Math.sin(2 * Math.PI * freq2 * t) * 0.2;
                const wave3 = Math.sin(2 * Math.PI * freq3 * t) * 0.2;
                
                // 하모닉 추가 (더 풍부한 소리)
                const harmonic1 = Math.sin(2 * Math.PI * freq1 * 2 * t) * 0.1;
                const harmonic2 = Math.sin(2 * Math.PI * freq2 * 2 * t) * 0.1;
                
                // 모든 파형 합성
                channelData[i] = (wave1 + wave2 + wave3 + harmonic1 + harmonic2) * envelope;
            }

            // 오디오 소스 생성 및 재생
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        } catch (error) {
            // 오디오 재생 실패 시 조용히 무시 (사용자 경험 방해 방지)
            logger.warn('음향 효과 재생 실패:', error);
        }
    }
}




