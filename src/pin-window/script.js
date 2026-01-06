// Use window.noteAPI (exposed by preload.js)

const img = document.getElementById('pinned-image');
const btnClose = document.getElementById('btn-close');
const container = document.getElementById('container');

// Load image from main process
if (window.noteAPI && window.noteAPI.onSetImage) {
    window.noteAPI.onSetImage((dataUrl) => {
        console.log('Received image data for pin window');
        img.src = dataUrl;

        // Auto-resize window to fit image (with max constraints)
        img.onload = () => {
            const maxWidth = window.screen.width * 0.5; // Max 50% of screen width
            const maxHeight = window.screen.height * 0.5; // Max 50% of screen height

            let width = img.naturalWidth;
            let height = img.naturalHeight;

            // Scale down if too large
            if (width > maxWidth || height > maxHeight) {
                const scale = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }

            // Ensure minimum size
            width = Math.max(width, 100);
            height = Math.max(height, 100);

            // Resize window
            const currentWindow = require('electron').remote?.getCurrentWindow();
            if (currentWindow) {
                currentWindow.setSize(width, height);
            } else if (window.noteAPI && window.noteAPI.resizeWindow) {
                // If remote is not available, use IPC
                window.noteAPI.resizeWindow(width, height);
            }
        };
    });
} else {
    console.error('window.noteAPI.onSetImage not available');
}

// Close button
if (btnClose) {
    btnClose.addEventListener('click', () => {
        if (window.noteAPI && window.noteAPI.closeWindow) {
            window.noteAPI.closeWindow();
        } else {
            window.close();
        }
    });
}

// Make window draggable by container
// Note: -webkit-app-region: drag is set in CSS, so this is just for reference
console.log('Pin window script loaded');
