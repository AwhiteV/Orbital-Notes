// Use window.noteAPI exposed by preload.js

const canvas = document.getElementById('screenshot-canvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const sizeInfo = document.getElementById('size-info');
const btnPin = document.getElementById('btn-pin');
const btnOcr = document.getElementById('btn-ocr');
const btnCopy = document.getElementById('btn-copy');
const btnClose = document.getElementById('btn-close');

let isDrawing = false;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;
let screenSourceId = null;
let scaleFactor = 1;
let fullScreenImage = null;
let captureStatus = 'waiting'; // 'waiting', 'loading', 'ready', 'error'
let isResizing = false;
let resizeAnchor = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
const ANCHOR_SIZE = 8; // Size of anchor points

function normalizeSelection() {
    const x1 = Math.min(startX, endX);
    const y1 = Math.min(startY, endY);
    const x2 = Math.max(startX, endX);
    const y2 = Math.max(startY, endY);
    startX = x1;
    startY = y1;
    endX = x2;
    endY = y2;
}

function getAnchorRects(x, y, w, h) {
    const half = ANCHOR_SIZE / 2;
    return {
        nw: { x: x - half, y: y - half },
        n: { x: x + w / 2 - half, y: y - half },
        ne: { x: x + w - half, y: y - half },
        e: { x: x + w - half, y: y + h / 2 - half },
        se: { x: x + w - half, y: y + h - half },
        s: { x: x + w / 2 - half, y: y + h - half },
        sw: { x: x - half, y: y + h - half },
        w: { x: x - half, y: y + h / 2 - half }
    };
}

function getAnchorUnderMouse(mx, my) {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    if (w < 5 || h < 5) return null;

    const anchors = getAnchorRects(x, y, w, h);
    const hitSize = ANCHOR_SIZE + 4; // Larger hit area

    for (const [key, rect] of Object.entries(anchors)) {
        if (mx >= rect.x - 2 && mx <= rect.x + ANCHOR_SIZE + 2 &&
            my >= rect.y - 2 && my <= rect.y + ANCHOR_SIZE + 2) {
            return key;
        }
    }
    return null;
}

// Initialize canvas with proper dimensions (no loading text)
function initCanvas() {
    const w = window.innerWidth || window.screen.width || 1920;
    const h = window.innerHeight || window.screen.height || 1080;

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    // Don't draw anything - window is hidden initially
}

// Wait for DOM to be ready
if (document.readyState === 'complete') {
    initCanvas();
} else {
    window.addEventListener('load', initCanvas);
}

// Debug: Check if noteAPI exists
if (!window.noteAPI) {
    console.error('noteAPI is not available!');
    // Show error on canvas
    setTimeout(() => {
        const w = window.innerWidth || 1920;
        const h = window.innerHeight || 1080;
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'red';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ERROR: noteAPI not available', w / 2, h / 2);
        ctx.fillText('Press Esc to close', w / 2, h / 2 + 40);
    }, 100);
}

// Initialize - listen for capture-screen event
if (window.noteAPI && window.noteAPI.onCaptureScreen) {
    window.noteAPI.onCaptureScreen(async (imageDataURL, displayInfo) => {
        console.log('capture-screen event received, image data length:', imageDataURL.length);
        captureStatus = 'loading';
        scaleFactor = displayInfo.scaleFactor || 1;

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Set canvas size with scale factor
        canvas.width = w * scaleFactor;
        canvas.height = h * scaleFactor;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        // Reset and scale context
        ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);

        try {
            // Create image from dataURL
            const img = new Image();

            img.onload = () => {
                // Create an offscreen canvas to store the image
                const offCanvas = document.createElement('canvas');
                offCanvas.width = img.width;
                offCanvas.height = img.height;
                const offCtx = offCanvas.getContext('2d');
                offCtx.drawImage(img, 0, 0);

                fullScreenImage = offCanvas;
                captureStatus = 'ready';

                console.log('Screenshot loaded:', offCanvas.width, 'x', offCanvas.height);
                render();

                // Now show the window
                if (window.noteAPI && window.noteAPI.showWindow) {
                    window.noteAPI.showWindow();
                }
            };

            img.onerror = (err) => {
                console.error('Image load error:', err);
                captureStatus = 'error';
                showError('Failed to load screenshot');
                // Show window even on error so user can close it
                if (window.noteAPI && window.noteAPI.showWindow) {
                    window.noteAPI.showWindow();
                }
            };

            img.src = imageDataURL;
        } catch (e) {
            console.error('Error loading screenshot:', e);
            captureStatus = 'error';
            showError('Screenshot load failed: ' + e.message);
            if (window.noteAPI && window.noteAPI.showWindow) {
                window.noteAPI.showWindow();
            }
        }
    });
} else {
    console.error('window.noteAPI.onCaptureScreen not available');
}

function showError(message) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'red';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, w / 2, h / 2);
    ctx.fillStyle = 'white';
    ctx.fillText('Press Esc to close', w / 2, h / 2 + 40);
}

function render() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply scale
    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);

    if (captureStatus !== 'ready' || !fullScreenImage) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial, sans-serif';
        ctx.textAlign = 'center';

        if (captureStatus === 'error') {
            ctx.fillStyle = 'red';
            ctx.fillText('Screen capture failed', w / 2, h / 2);
        } else if (captureStatus === 'loading') {
            ctx.fillText('Capturing screen...', w / 2, h / 2);
        } else {
            ctx.fillText('Waiting for screen capture...', w / 2, h / 2);
        }
        return;
    }

    // Draw full original image
    ctx.drawImage(fullScreenImage, 0, 0, w, h);

    // Draw global dim mask
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // Reset text align for size info
    ctx.textAlign = 'left';

    // If dragging or selected, draw the clear selection
    const hasSelection = (startX !== endX) || (startY !== endY);
    if (hasSelection || isDrawing) {
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const selW = Math.abs(endX - startX);
        const selH = Math.abs(endY - startY);

        if (selW > 0 && selH > 0) {
            // Draw the clear image part using clipping
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, selW, selH);
            ctx.clip();
            ctx.drawImage(fullScreenImage, 0, 0, w, h);
            ctx.restore();

            // Draw border
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, selW, selH);

            // Draw anchors
            const anchors = getAnchorRects(x, y, selW, selH);
            ctx.fillStyle = '#4CAF50';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;

            for (const rect of Object.values(anchors)) {
                ctx.fillRect(rect.x, rect.y, ANCHOR_SIZE, ANCHOR_SIZE);
                ctx.strokeRect(rect.x, rect.y, ANCHOR_SIZE, ANCHOR_SIZE);
            }

            // Show size info

            sizeInfo.textContent = Math.round(selW) + ' x ' + Math.round(selH);
            sizeInfo.style.left = x + 'px';
            sizeInfo.style.top = Math.max(0, y - 25) + 'px';
            sizeInfo.classList.remove('hidden');

            // Show toolbar when not dragging
            if (!isDrawing) {
                const toolbarH = toolbar.offsetHeight || 40;
                const toolbarW = toolbar.offsetWidth || 200;

                let tx = x + selW - toolbarW;
                let ty = y + selH + 10;

                if (tx < 0) tx = 0;
                if (ty + toolbarH > h) ty = y + selH - toolbarH - 10;
                if (ty > h - 30) ty = y + selH - 40;

                toolbar.style.left = tx + 'px';
                toolbar.style.top = ty + 'px';
                toolbar.classList.remove('hidden');
            } else {
                toolbar.classList.add('hidden');
            }
        }
    }
}

// Mouse Events
canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (captureStatus !== 'ready') {
        console.log('mousedown ignored, status:', captureStatus);
        return;
    }

    const mx = e.offsetX;
    const my = e.offsetY;

    // Check if clicking resize anchor
    const anchor = getAnchorUnderMouse(mx, my);
    if (anchor) {
        // Start resizing
        isResizing = true;
        resizeAnchor = anchor;
        // Normalize coordinates to ensure start/end are consistently top-left/bottom-right relative to selection
        normalizeSelection();
        toolbar.classList.add('hidden');
        sizeInfo.classList.remove('hidden');
        return;
    }

    // New selection start
    isDrawing = true;
    startX = mx;
    startY = my;
    endX = mx;
    endY = my;
    toolbar.classList.add('hidden');
    sizeInfo.classList.remove('hidden');
    render();
});

canvas.addEventListener('mousemove', (e) => {
    const mx = e.offsetX;
    const my = e.offsetY;

    // Change cursor based on hover
    if (!isDrawing && !isResizing) {
        const anchor = getAnchorUnderMouse(mx, my);
        if (anchor) {
            const cursors = {
                nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
                e: 'e-resize', se: 'se-resize', s: 's-resize',
                sw: 'sw-resize', w: 'w-resize'
            };
            canvas.style.cursor = cursors[anchor];
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }

    if (isResizing) {
        // Handle resizing based on anchor
        if (resizeAnchor.includes('e')) endX = mx;
        if (resizeAnchor.includes('w')) startX = mx;
        if (resizeAnchor.includes('s')) endY = my;
        if (resizeAnchor.includes('n')) startY = my;
        render();
        return;
    }

    if (isDrawing) {
        endX = mx;
        endY = my;
        render();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        resizeAnchor = null;
        normalizeSelection(); // Ensure consistent rect after resize
        render();
    } else if (isDrawing) {
        isDrawing = false;
        render();
    }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (window.noteAPI && window.noteAPI.closeScreenshot) {
            window.noteAPI.closeScreenshot();
        }
    }
    if (e.key === 'F3') {
        finishScreenshot('pin');
    }
    if (e.key === 'Enter') {
        finishScreenshot('copy');
    }
});

// Toolbar buttons
if (btnPin) btnPin.addEventListener('click', () => finishScreenshot('pin'));
if (btnOcr) btnOcr.addEventListener('click', () => finishScreenshot('ocr'));
if (btnCopy) btnCopy.addEventListener('click', () => finishScreenshot('copy'));
if (btnClose) btnClose.addEventListener('click', () => {
    if (window.noteAPI && window.noteAPI.closeScreenshot) {
        window.noteAPI.closeScreenshot();
    }
});

function finishScreenshot(action) {
    if (!fullScreenImage) return;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const selW = Math.abs(endX - startX);
    const selH = Math.abs(endY - startY);

    if (selW < 5 || selH < 5) return;

    // Calculate scale based on actual image vs window
    const imgW = fullScreenImage.width;
    const imgH = fullScreenImage.height;
    const scaleX = imgW / window.innerWidth;
    const scaleY = imgH / window.innerHeight;

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = Math.round(selW * scaleX);
    resultCanvas.height = Math.round(selH * scaleY);
    const rCtx = resultCanvas.getContext('2d');

    rCtx.drawImage(fullScreenImage,
        Math.round(x * scaleX), Math.round(y * scaleY),
        Math.round(selW * scaleX), Math.round(selH * scaleY),
        0, 0, resultCanvas.width, resultCanvas.height
    );

    const dataURL = resultCanvas.toDataURL('image/png');

    if (window.noteAPI) {
        if (action === 'pin') {
            window.noteAPI.pinImage(dataURL);
            window.noteAPI.closeScreenshot();
        } else if (action === 'copy') {
            window.noteAPI.copyToClipboard(dataURL);
            window.noteAPI.closeScreenshot();
        } else if (action === 'ocr') {
            // OCR will close screenshot window after opening result window
            window.noteAPI.ocrImage(dataURL);
        }
    }
}
