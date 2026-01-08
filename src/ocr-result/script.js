// OCR Result Window Script

const screenshotImg = document.getElementById('screenshot-img');
const ocrText = document.getElementById('ocr-text');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const btnCopy = document.getElementById('btn-copy');
const btnExport = document.getElementById('btn-export');
const btnClose = document.getElementById('btn-close');

// Translation elements
const btnTranslate = document.getElementById('btn-translate');
const translatePanel = document.getElementById('translate-panel');
const translateText = document.getElementById('translate-text');
const translateLoading = document.getElementById('translate-loading');
const translateError = document.getElementById('translate-error');
const btnCopyTranslate = document.getElementById('btn-copy-translate');

// Receive OCR data from main process
if (window.noteAPI && window.noteAPI.onOcrResult) {
    window.noteAPI.onOcrResult((data) => {
        // Set screenshot image
        if (data.imageDataUrl) {
            screenshotImg.src = data.imageDataUrl;
        }

        // Handle OCR result
        if (data.loading) {
            loadingEl.classList.remove('hidden');
            ocrText.textContent = '';
            errorEl.classList.add('hidden');
        } else if (data.error) {
            loadingEl.classList.add('hidden');
            errorEl.textContent = data.error;
            errorEl.classList.remove('hidden');
        } else if (data.text) {
            loadingEl.classList.add('hidden');
            errorEl.classList.add('hidden');
            ocrText.textContent = data.text;
        }
    });
}

// Listen for translation results
if (window.noteAPI && window.noteAPI.onTranslateResult) {
    window.noteAPI.onTranslateResult((data) => {
        if (data.loading) {
            translateLoading.classList.remove('hidden');
            translateText.textContent = '';
            translateError.classList.add('hidden');
        } else if (data.error) {
            translateLoading.classList.add('hidden');
            translateError.textContent = data.error;
            translateError.classList.remove('hidden');
        } else if (data.text) {
            translateLoading.classList.add('hidden');
            translateError.classList.add('hidden');
            translateText.textContent = data.text;
        }
    });
}

// Copy button
btnCopy.addEventListener('click', () => {
    const text = ocrText.textContent;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        btnCopy.textContent = 'Copied!';
        btnCopy.classList.add('copied');
        setTimeout(() => {
            btnCopy.textContent = 'Copy';
            btnCopy.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
});

// Translate button
btnTranslate.addEventListener('click', async () => {
    const text = ocrText.textContent;
    if (!text) return;

    // Show translate panel
    translatePanel.classList.remove('hidden');
    translateLoading.classList.remove('hidden');
    translateText.textContent = '';
    translateError.classList.add('hidden');

    // Call translate API
    if (window.noteAPI && window.noteAPI.translateText) {
        window.noteAPI.translateText(text);
    }
});

// Copy translation button
btnCopyTranslate.addEventListener('click', () => {
    const text = translateText.textContent;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        btnCopyTranslate.textContent = 'Copied!';
        btnCopyTranslate.classList.add('copied');
        setTimeout(() => {
            btnCopyTranslate.textContent = 'Copy';
            btnCopyTranslate.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
});

// Export to Note button
btnExport.addEventListener('click', async () => {
    const text = ocrText.textContent;
    if (!text) return;

    if (window.noteAPI && window.noteAPI.exportOcrToNote) {
        await window.noteAPI.exportOcrToNote(text);
        // Close OCR window after export
        if (window.noteAPI.closeWindow) {
            window.noteAPI.closeWindow();
        }
    }
});

// Close button
btnClose.addEventListener('click', () => {
    if (window.noteAPI && window.noteAPI.closeWindow) {
        window.noteAPI.closeWindow();
    }
});

// ESC to close
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (window.noteAPI && window.noteAPI.closeWindow) {
            window.noteAPI.closeWindow();
        }
    }
});
