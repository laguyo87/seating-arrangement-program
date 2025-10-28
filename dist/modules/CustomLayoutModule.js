/**
 * 사용자 맞춤 배치 모듈
 * 드래그 앤 드롭으로 좌석을 직접 배치하는 기능 제공
 */
export class CustomLayoutModule {
    constructor(canvasId) {
        this.isCustomMode = false;
        this.placedItems = [];
        this.currentDragElement = null;
        this.currentDragOffset = { x: 0, y: 0 };
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas element not found: ${canvasId}`);
        }
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas context not available');
        }
        this.ctx = ctx;
        this.initializeEventListeners();
    }
    /**
     * 이벤트 리스너 초기화
     */
    initializeEventListeners() {
        // 드래그 가능한 블록들에 이벤트 리스너 추가
        const dragBlocks = document.querySelectorAll('.draggable-block');
        dragBlocks.forEach(block => {
            // HTML5 드래그 앤 드롭 지원
            block.draggable = true;
            block.addEventListener('dragstart', (e) => this.handleDragStartEvent(e));
        });
        // 캔버스에 드롭 이벤트 추가
        this.canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
        this.canvas.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        this.canvas.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        // 버튼 이벤트
        const startCustomBtn = document.getElementById('start-custom-layout');
        if (startCustomBtn) {
            startCustomBtn.addEventListener('click', () => this.startCustomMode());
        }
    }
    /**
     * 드래그 시작 이벤트 처리 (HTML5 API)
     */
    handleDragStartEvent(e) {
        const target = e.target;
        const block = target.closest('.draggable-block');
        if (!block)
            return;
        const blockType = block.getAttribute('data-block-type');
        if (blockType && e.dataTransfer) {
            e.dataTransfer.setData('text/plain', blockType);
            e.dataTransfer.effectAllowed = 'copy';
            // 드래그 이미지 설정
            const dragImage = document.createElement('div');
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            dragImage.innerHTML = block.innerHTML;
            dragImage.style.padding = '10px';
            dragImage.style.background = 'white';
            dragImage.style.border = '2px solid #667eea';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 0, 0);
            setTimeout(() => {
                document.body.removeChild(dragImage);
            }, 0);
        }
    }
    /**
     * 커스텀 모드 시작
     */
    startCustomMode() {
        this.isCustomMode = true;
        // 드래그 가능한 블록 컨테이너 표시
        const dragBlocksContainer = document.getElementById('drag-blocks-container');
        if (dragBlocksContainer) {
            dragBlocksContainer.style.display = 'block';
        }
        // 캔버스 표시
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.style.display = 'block';
        }
        // 캔버스 초기화
        this.clear();
        this.drawBackground();
    }
    /**
     * 드래그 오버 처리
     */
    handleDragOver(e) {
        e.preventDefault();
        if (this.canvas) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // 마우스 위치에 따라 미리보기 그리기
            this.drawDragPreview(x, y);
        }
    }
    /**
     * 드래그 엔터 처리
     */
    handleDragEnter(e) {
        e.preventDefault();
        this.canvas.classList.add('drag-over');
    }
    /**
     * 드래그 리브 처리
     */
    handleDragLeave(e) {
        this.canvas.classList.remove('drag-over');
    }
    /**
     * 드롭 처리
     */
    handleDrop(e) {
        e.preventDefault();
        this.canvas.classList.remove('drag-over');
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // 드래그된 항목 타입 가져오기
        const itemType = e.dataTransfer?.getData('text/plain');
        if (itemType) {
            this.placeItem(itemType, x, y);
        }
    }
    /**
     * 아이템 배치
     */
    placeItem(type, x, y) {
        const itemTypes = {
            'blackboard': { width: 200, height: 80 },
            'teacher-desk': { width: 100, height: 40 },
            'seat': { width: 50, height: 50 }
        };
        const size = itemTypes[type];
        if (!size)
            return;
        this.placedItems.push({
            type: type,
            x,
            y,
            width: size.width,
            height: size.height
        });
        this.render();
    }
    /**
     * 드래그 미리보기 그리기
     */
    drawDragPreview(x, y) {
        // 이전 프레임 클리어
        this.render();
        // 미리보기 그리기 (반투명)
        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        // 여기에 미리보기 그리기 로직 추가
        this.ctx.restore();
    }
    /**
     * 배경 그리기
     */
    drawBackground() {
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /**
     * 렌더링
     */
    render() {
        // 배경 다시 그리기
        this.drawBackground();
        // 배치된 아이템들 그리기
        this.placedItems.forEach(item => {
            this.drawItem(item);
        });
    }
    /**
     * 아이템 그리기
     */
    drawItem(item) {
        this.ctx.save();
        switch (item.type) {
            case 'blackboard':
                // 칠판 그리기
                this.ctx.fillStyle = '#2c3e50';
                this.ctx.fillRect(item.x, item.y, item.width, item.height);
                this.ctx.strokeStyle = '#1a252f';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(item.x, item.y, item.width, item.height);
                // 텍스트
                this.ctx.fillStyle = '#ecf0f1';
                this.ctx.font = 'bold 16px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('칠판', item.x + item.width / 2, item.y + item.height / 2 + 5);
                break;
            case 'teacher-desk':
                // 교탁 그리기
                this.ctx.fillStyle = '#95a5a6';
                this.ctx.fillRect(item.x, item.y, item.width, item.height);
                this.ctx.strokeStyle = '#7f8c8d';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(item.x, item.y, item.width, item.height);
                // 교탁 다리
                const legWidth = 5;
                const legHeight = 20;
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.fillRect(item.x + 10, item.y + item.height, legWidth, legHeight);
                this.ctx.fillRect(item.x + item.width - 10 - legWidth, item.y + item.height, legWidth, legHeight);
                break;
            case 'seat':
                // 책상 그리기
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(item.x, item.y, item.width, item.height);
                this.ctx.strokeStyle = '#667eea';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(item.x, item.y, item.width, item.height);
                // 책상 아이콘
                this.ctx.fillStyle = '#667eea';
                this.ctx.font = '24px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('🪑', item.x + item.width / 2, item.y + item.height / 2 + 8);
                break;
        }
        this.ctx.restore();
    }
    /**
     * 캔버스 초기화
     */
    clear() {
        this.placedItems = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /**
     * 커스텀 모드 활성화
     */
    enableCustomMode() {
        this.isCustomMode = true;
    }
    /**
     * 커스텀 모드 비활성화
     */
    disableCustomMode() {
        this.isCustomMode = false;
        const dragBlocksContainer = document.getElementById('drag-blocks-container');
        if (dragBlocksContainer) {
            dragBlocksContainer.style.display = 'none';
        }
    }
    /**
     * 커스텀 모드 상태 반환
     */
    getCustomMode() {
        return this.isCustomMode;
    }
}
//# sourceMappingURL=CustomLayoutModule.js.map