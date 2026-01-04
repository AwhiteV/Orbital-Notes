const { app, BrowserWindow, ipcMain, screen, globalShortcut, dialog, shell, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { Document, Paragraph, TextRun, HeadingLevel, Packer } = require('docx');
const puppeteer = require('puppeteer-core');
const { marked } = require('marked');
const { execSync } = require('child_process');
require('dotenv').config();

// Config store to hold the data path preference
const configStore = new Store({
    name: 'config',
    // We stick to default user data for the config itself
});

// Determine data path
const defaultDataPath = path.join(__dirname, 'data');
let currentDataPath = configStore.get('dataPath', defaultDataPath);
let currentImagesPath;

// Initialize data store
let store;
function initStore() {
    store = new Store({
        name: 'notes-data',
        cwd: currentDataPath,
        defaults: {
            notes: [],
            settings: {
                globalShortcut: 'Alt+1', // Default shortcut
                floatingBallSize: 120, // Default size
                difyBaseUrl: '', // Dify base URL (empty means use .env)
                difyApiKey: '', // Dify API key (empty means use .env)
                autoLaunch: false // Auto launch on system startup
            }
        }
    });

    // Ensure data directories exist
    ensureDataDirs(currentDataPath);
}

// Ensure data directories exist
function ensureDataDirs(basePath) {
    currentImagesPath = path.join(basePath, 'images');
    if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
    }
    if (!fs.existsSync(currentImagesPath)) {
        fs.mkdirSync(currentImagesPath, { recursive: true });
    }
}

// Initialize immediately
initStore();

// Window references
let floatingBallWindow = null;
let quickNoteWindow = null;
let noteManagerWindow = null;
let tray = null;

// Create system tray
function createTray() {
    const { nativeImage } = require('electron');
    const iconPath = path.join(__dirname, 'icon_256.png');

    // Create nativeImage and resize for tray
    let icon = nativeImage.createFromPath(iconPath);
    // Resize to standard tray size (16x16 or 32x32 depending on DPI)
    // Electron's Tray usually handles this better when given a NativeImage
    const trayIcon = icon.resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Manager',
            click: () => createNoteManagerWindow()
        },
        {
            label: 'Show/Hide Floating Ball',
            click: () => {
                if (floatingBallWindow) {
                    if (floatingBallWindow.isVisible()) {
                        floatingBallWindow.hide();
                    } else {
                        floatingBallWindow.show();
                    }
                } else {
                    createFloatingBallWindow();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => app.quit()
        }
    ]);

    tray.setToolTip('Orbital Notes');
    tray.setContextMenu(contextMenu);

    // Left click to toggle floating ball
    tray.on('click', () => {
        if (floatingBallWindow) {
            if (floatingBallWindow.isVisible()) {
                floatingBallWindow.hide();
            } else {
                floatingBallWindow.show();
            }
        } else {
            createFloatingBallWindow();
        }
    });
}

// Create floating ball window
function createFloatingBallWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    // Get saved position or use default
    const savedPosition = store.get('settings.floatingBallPosition');
    const defaultX = screenWidth - 150;
    const defaultY = screenHeight / 2 - 60;

    const size = store.get('settings.floatingBallSize', 120);
    floatingBallWindow = new BrowserWindow({
        width: size,
        height: size,
        x: savedPosition?.x || defaultX,
        y: savedPosition?.y || defaultY,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        minWidth: 1,
        minHeight: 1,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    floatingBallWindow.loadFile(path.join(__dirname, 'src', 'floating-ball', 'index.html'));

    // Handle external links (window.open)
    floatingBallWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Handle internal navigation (a href click)
    floatingBallWindow.webContents.on('will-navigate', (event, url) => {
        const isSelf = url.startsWith('file://') && (url.endsWith('index.html') || url.includes('/src/'));
        if (!isSelf) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Save position when window moves
    floatingBallWindow.on('moved', () => {
        const [x, y] = floatingBallWindow.getPosition();
        store.set('settings.floatingBallPosition', { x, y });
    });

    floatingBallWindow.on('closed', () => {
        floatingBallWindow = null;
    });
}

// Global Shortcut Handler
function registerGlobalShortcut() {
    // Unregister all first
    globalShortcut.unregisterAll();

    const shortcut = store.get('settings.globalShortcut', 'Alt+1');
    if (!shortcut) return;

    try {
        // Electron accelerator for "Alt+Num1" depends on platform/keyboard
        // We'll trust the user/default string.
        const ret = globalShortcut.register(shortcut, () => {
            // Toggle floating ball visibility
            if (floatingBallWindow) {
                if (floatingBallWindow.isVisible()) {
                    floatingBallWindow.hide();
                } else {
                    floatingBallWindow.show();
                }
            } else {
                createFloatingBallWindow();
            }
        });

        if (!ret) {
            console.warn('Registration failed for shortcut:', shortcut);
        }
    } catch (error) {
        console.error('Error registering shortcut:', error);
    }
}

// Create quick note window
function createQuickNoteWindow(noteId = null) {
    if (quickNoteWindow) {
        quickNoteWindow.focus();
        if (noteId) {
            quickNoteWindow.webContents.send('load-note', noteId);
        }
        return;
    }

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    quickNoteWindow = new BrowserWindow({
        width: 520,
        height: 500,
        x: Math.floor((screenWidth - 520) / 2),
        y: Math.floor((screenHeight - 500) / 2),
        frame: false,
        transparent: false,
        resizable: true,
        minimizable: true,
        maximizable: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'icon_256.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    quickNoteWindow.loadFile(path.join(__dirname, 'src', 'quick-note', 'index.html'));

    // Handle external links (window.open)
    quickNoteWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Handle internal navigation (a href click)
    quickNoteWindow.webContents.on('will-navigate', (event, url) => {
        const isSelf = url.startsWith('file://') && (url.endsWith('index.html') || url.includes('/src/'));
        if (!isSelf) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    quickNoteWindow.on('closed', () => {
        quickNoteWindow = null;
    });

    // Send note data if editing existing note
    if (noteId) {
        quickNoteWindow.webContents.on('did-finish-load', () => {
            quickNoteWindow.webContents.send('load-note', noteId);
        });
    }
}

// Create note manager window
function createNoteManagerWindow() {
    if (noteManagerWindow) {
        noteManagerWindow.focus();
        return;
    }

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    noteManagerWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        x: Math.floor((screenWidth - 1100) / 2),
        y: Math.floor((screenHeight - 750) / 2),
        frame: false,
        transparent: false,
        resizable: true,
        minimizable: true,
        maximizable: true,
        icon: path.join(__dirname, 'icon_256.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    noteManagerWindow.loadFile(path.join(__dirname, 'src', 'note-manager', 'index.html'));

    // Handle external links (window.open)
    noteManagerWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Handle internal navigation (a href click)
    noteManagerWindow.webContents.on('will-navigate', (event, url) => {
        const isSelf = url.startsWith('file://') && (url.endsWith('index.html') || url.includes('/src/'));
        if (!isSelf) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    noteManagerWindow.on('closed', () => {
        noteManagerWindow = null;
    });
}

// App ready
app.whenReady().then(() => {
    createTray();
    createFloatingBallWindow();
    registerGlobalShortcut();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createFloatingBallWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Clean up shortcuts
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});


// ==================== IPC Handlers ====================

// Settings Handlers
ipcMain.handle('get-settings', () => {
    return {
        dataPath: currentDataPath,
        globalShortcut: store.get('settings.globalShortcut', 'Alt+1'),
        floatingBallSize: store.get('settings.floatingBallSize', 120),
        difyBaseUrl: store.get('settings.difyBaseUrl', ''),
        difyApiKey: store.get('settings.difyApiKey', ''),
        autoLaunch: store.get('settings.autoLaunch', false)
    };
});

ipcMain.handle('save-settings', (event, newSettings) => {
    let restartRequired = false;

    // Handle Floating Ball Size
    const oldSize = store.get('settings.floatingBallSize');
    if (newSettings.floatingBallSize && newSettings.floatingBallSize !== oldSize) {
        store.set('settings.floatingBallSize', newSettings.floatingBallSize);
        if (floatingBallWindow) {
            // Toggle resizable to ensure OS allows the change, then lock it again to prevent square shadow
            floatingBallWindow.setResizable(true);
            floatingBallWindow.setSize(newSettings.floatingBallSize, newSettings.floatingBallSize);
            floatingBallWindow.setResizable(false);
        }
    }

    // Handle Shortcut
    const oldShortcut = store.get('settings.globalShortcut');
    if (newSettings.globalShortcut && newSettings.globalShortcut !== oldShortcut) {
        store.set('settings.globalShortcut', newSettings.globalShortcut);
        registerGlobalShortcut();
    }

    // Handle Dify Configuration
    if (newSettings.difyBaseUrl !== undefined) {
        store.set('settings.difyBaseUrl', newSettings.difyBaseUrl);
    }
    if (newSettings.difyApiKey !== undefined) {
        store.set('settings.difyApiKey', newSettings.difyApiKey);
    }

    // Handle Data Path
    if (newSettings.dataPath && newSettings.dataPath !== currentDataPath) {
        configStore.set('dataPath', newSettings.dataPath);
        currentDataPath = newSettings.dataPath;

        // Re-init store
        initStore();

        // Notify windows to reload data
        if (noteManagerWindow) {
            noteManagerWindow.webContents.send('notes-updated');
        }
        restartRequired = true;
    }

    // Handle Auto Launch
    if (newSettings.autoLaunch !== undefined) {
        const currentAutoLaunch = store.get('settings.autoLaunch', false);
        if (newSettings.autoLaunch !== currentAutoLaunch) {
            store.set('settings.autoLaunch', newSettings.autoLaunch);
            app.setLoginItemSettings({
                openAtLogin: newSettings.autoLaunch,
                path: process.execPath,
                args: []
            });
        }
    }

    return { success: true, restartRequired };
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(noteManagerWindow, {
        properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('check-shortcut-conflict', (event, shortcut) => {
    const current = store.get('settings.globalShortcut');
    if (shortcut === current) return false;
    return globalShortcut.isRegistered(shortcut);
});


// Window controls
ipcMain.on('open-quick-note', (event, noteId) => {
    createQuickNoteWindow(noteId);
});

ipcMain.on('open-note-manager', () => {
    createNoteManagerWindow();
});

ipcMain.on('close-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.close();
    }
});

ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

ipcMain.on('minimize-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.minimize();
    }
});

ipcMain.on('toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        if (window.isMaximized()) {
            window.unmaximize();
        } else {
            window.maximize();
        }
    }
});

ipcMain.on('move-floating-ball', (event, data) => {
    if (floatingBallWindow && data && typeof data.x === 'number' && typeof data.y === 'number') {
        const x = Math.round(data.x);
        const y = Math.round(data.y);
        if (isFinite(x) && isFinite(y)) {
            floatingBallWindow.setPosition(x, y);
        }
    }
});

// Get floating ball window position
ipcMain.handle('get-floating-ball-position', () => {
    if (floatingBallWindow) {
        const [x, y] = floatingBallWindow.getPosition();
        return { x, y };
    }
    return null;
});

// Notes CRUD operations
ipcMain.handle('get-notes', () => {
    return store.get('notes') || [];
});

ipcMain.handle('get-note', (event, noteId) => {
    const notes = store.get('notes') || [];
    return notes.find(note => note.id === noteId) || null;
});

ipcMain.handle('create-note', (event, noteData) => {
    const notes = store.get('notes') || [];
    const newNote = {
        id: uuidv4(),
        title: noteData.title || 'Untitled',
        content: noteData.content || '',
        tags: noteData.tags || [],
        images: noteData.images || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: false
    };
    notes.unshift(newNote);
    store.set('notes', notes);

    // Notify note manager to refresh
    if (noteManagerWindow) {
        noteManagerWindow.webContents.send('notes-updated');
    }

    return newNote;
});

ipcMain.handle('update-note', (event, noteId, noteData) => {
    const notes = store.get('notes') || [];
    const index = notes.findIndex(note => note.id === noteId);
    if (index !== -1) {
        notes[index] = {
            ...notes[index],
            ...noteData,
            updatedAt: new Date().toISOString()
        };
        store.set('notes', notes);

        // Notify note manager to refresh
        if (noteManagerWindow) {
            noteManagerWindow.webContents.send('notes-updated');
        }

        return notes[index];
    }
    return null;
});

ipcMain.handle('delete-note', (event, noteId) => {
    const notes = store.get('notes') || [];
    const noteToDelete = notes.find(note => note.id === noteId);

    // Delete associated images
    if (noteToDelete && noteToDelete.images) {
        noteToDelete.images.forEach(imagePath => {
            const fullPath = path.join(currentImagesPath, path.basename(imagePath));
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });
    }

    const filteredNotes = notes.filter(note => note.id !== noteId);
    store.set('notes', filteredNotes);

    // Notify note manager to refresh
    if (noteManagerWindow) {
        noteManagerWindow.webContents.send('notes-updated');
    }

    return true;
});

ipcMain.handle('toggle-pin', (event, noteId) => {
    const notes = store.get('notes') || [];
    const index = notes.findIndex(note => note.id === noteId);
    if (index !== -1) {
        notes[index].pinned = !notes[index].pinned;
        store.set('notes', notes);

        // Notify note manager to refresh
        if (noteManagerWindow) {
            noteManagerWindow.webContents.send('notes-updated');
        }

        return notes[index];
    }
    return null;
});

// Image handling
ipcMain.handle('save-image', async (event, imageBuffer, extension = 'png') => {
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(currentImagesPath, fileName);

    // Convert array buffer to Buffer
    const buffer = Buffer.from(imageBuffer);
    fs.writeFileSync(filePath, buffer);

    return fileName;
});

ipcMain.handle('get-image-path', (event, fileName) => {
    return path.join(currentImagesPath, fileName);
});

// Search notes
ipcMain.handle('search-notes', (event, query) => {
    const notes = store.get('notes') || [];
    const lowerQuery = query.toLowerCase();
    return notes.filter(note =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery) ||
        note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
});

// Filter by tag
ipcMain.handle('filter-by-tag', (event, tag) => {
    const notes = store.get('notes') || [];
    if (!tag || tag === 'all') {
        return notes;
    }
    return notes.filter(note => note.tags.includes(tag));
});

// Get all tags
ipcMain.handle('get-all-tags', () => {
    const notes = store.get('notes') || [];
    const tagSet = new Set();
    notes.forEach(note => {
        note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
});

// Fetch AI News from Dify
ipcMain.handle('fetch-ai-news', async () => {
    return new Promise((resolve, reject) => {
        // Get settings first, fallback to .env
        const settingsBaseUrl = store.get('settings.difyBaseUrl', '');
        const settingsApiKey = store.get('settings.difyApiKey', '');

        const baseUrl = settingsBaseUrl || process.env.DIFY_BASE_URL || 'http://192.168.3.189:8087/v1';
        const apiKey = settingsApiKey || process.env.DIFY_WORKFLOW_API_KEY;

        if (!apiKey) {
            return reject(new Error('DIFY_WORKFLOW_API_KEY not configured in settings or .env'));
        }

        // Parse URL
        const url = new URL(`${baseUrl}/workflows/run`);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const postData = JSON.stringify({
            inputs: {},
            response_mode: 'blocking',
            user: 'orbital-notes'
        });

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = httpModule.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);

                    // Check for API errors
                    if (res.statusCode !== 200) {
                        return reject(new Error(`API Error: ${response.message || 'Unknown error'}`));
                    }

                    // Extract text from response
                    const newsContent = response?.data?.outputs?.text;

                    if (!newsContent) {
                        return reject(new Error('No content found in API response'));
                    }

                    // Create note automatically
                    const notes = store.get('notes') || [];
                    const today = new Date();
                    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

                    const newNote = {
                        id: uuidv4(),
                        title: `每日AI新闻 - ${dateStr}`,
                        content: newsContent,
                        tags: ['AI新闻'],
                        images: [],
                        createdAt: today.toISOString(),
                        updatedAt: today.toISOString(),
                        pinned: false
                    };

                    notes.unshift(newNote);
                    store.set('notes', notes);

                    // Notify note manager to refresh
                    if (noteManagerWindow) {
                        noteManagerWindow.webContents.send('notes-updated');
                    }

                    resolve(newNote);
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Network error: ${error.message}`));
        });

        req.write(postData);
        req.end();
    });
});


// ==================== Export Handlers ====================


// Helper: Sanitize filename
function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
}

// Helper: Format note to Markdown
function formatNoteToMarkdown(note) {
    const tags = note.tags.map(t => `#${t}`).join(', ');
    const createdDate = new Date(note.createdAt).toLocaleDateString('zh-CN');
    const updatedDate = new Date(note.updatedAt).toLocaleDateString('zh-CN');

    return `<!-- 
Created: ${createdDate}
Updated: ${updatedDate}
Tags: ${tags}
-->

${note.content}
`;
}

// Helper: Parse inline Markdown formatting (bold, italic, code, links)
function parseInlineMarkdown(text) {
    const runs = [];
    let remaining = text;

    // 正则匹配模式
    const boldRegex = /\*\*(.+?)\*\*/;
    const italicRegex = /\*(.+?)\*/;
    const codeRegex = /`(.+?)`/;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;

    while (remaining.length > 0) {
        // 查找最近的匹配
        const boldMatch = remaining.match(boldRegex);
        const italicMatch = remaining.match(italicRegex);
        const codeMatch = remaining.match(codeRegex);
        const linkMatch = remaining.match(linkRegex);

        // 找出最先出现的匹配
        let firstMatch = null;
        let firstIndex = remaining.length;
        let matchType = null;

        if (boldMatch && boldMatch.index < firstIndex) {
            firstMatch = boldMatch;
            firstIndex = boldMatch.index;
            matchType = 'bold';
        }
        if (italicMatch && italicMatch.index < firstIndex && (!boldMatch || italicMatch.index < boldMatch.index)) {
            // 确保不是粗体的一部分
            if (!boldMatch || italicMatch.index !== boldMatch.index) {
                firstMatch = italicMatch;
                firstIndex = italicMatch.index;
                matchType = 'italic';
            }
        }
        if (codeMatch && codeMatch.index < firstIndex) {
            firstMatch = codeMatch;
            firstIndex = codeMatch.index;
            matchType = 'code';
        }
        if (linkMatch && linkMatch.index < firstIndex) {
            firstMatch = linkMatch;
            firstIndex = linkMatch.index;
            matchType = 'link';
        }

        if (!firstMatch) {
            // 没有更多匹配，添加剩余文本
            if (remaining) {
                runs.push(new TextRun({ text: remaining }));
            }
            break;
        }

        // 添加匹配之前的普通文本
        if (firstIndex > 0) {
            runs.push(new TextRun({ text: remaining.substring(0, firstIndex) }));
        }

        // 添加格式化文本
        if (matchType === 'bold') {
            runs.push(new TextRun({ text: firstMatch[1], bold: true }));
        } else if (matchType === 'italic') {
            runs.push(new TextRun({ text: firstMatch[1], italics: true }));
        } else if (matchType === 'code') {
            runs.push(new TextRun({ text: firstMatch[1], font: 'Consolas' }));
        } else if (matchType === 'link') {
            runs.push(new TextRun({ text: firstMatch[1], color: '0066CC', underline: {} }));
        }

        // 更新剩余文本
        remaining = remaining.substring(firstIndex + firstMatch[0].length);
    }

    return runs.length > 0 ? runs : [new TextRun({ text: text })];
}

// Helper: Parse Markdown to Word paragraphs (simplified)
function parseMarkdownToParagraphs(content) {
    const lines = content.split('\n');
    const paragraphs = [];

    for (const line of lines) {
        if (line.startsWith('# ')) {
            paragraphs.push(new Paragraph({ children: parseInlineMarkdown(line.substring(2)), heading: HeadingLevel.HEADING_1, }));
        } else if (line.startsWith('## ')) {
            paragraphs.push(new Paragraph({ children: parseInlineMarkdown(line.substring(3)), heading: HeadingLevel.HEADING_2, }));
        } else if (line.startsWith('### ')) {
            paragraphs.push(new Paragraph({ children: parseInlineMarkdown(line.substring(4)), heading: HeadingLevel.HEADING_3, }));
        } else if (line.trim()) {
            paragraphs.push(new Paragraph({ children: parseInlineMarkdown(line) }));
        } else {
            paragraphs.push(new Paragraph({ text: '' }));
        }
    }

    return paragraphs;
}

// Helper: Format note to Word
function formatNoteToWord(note) {
    const tagText = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : '';

    const children = [
        new Paragraph({
            text: note.title,
            heading: HeadingLevel.HEADING_1,
        }),
    ];

    if (tagText) {
        children.push(new Paragraph({
            children: [
                new TextRun({
                    text: tagText,
                    italics: true,
                    size: 20,
                }),
            ],
        }));
        children.push(new Paragraph({ text: '' }));
    }

    children.push(...parseMarkdownToParagraphs(note.content));

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    return doc;
}



// Helper: Export note to PDF
async function exportNoteToPDF(note, outputPath) {
    const tagText = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : '';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: "Microsoft YaHei", "Noto Sans", sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    h1 {
      color: #D0BB95;
      margin-bottom: 0.5em;
    }
    .tags {
      color: #666;
      font-size: 14px;
      margin-bottom: 2em;
      font-style: italic;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: "Consolas", "Courier New", monospace;
    }
    pre {
      background: #f5f5f5;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #D0BB95;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
    }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  ${tagText ? `<p class="tags">${tagText}</p>` : ''}
  ${marked.parse(note.content)}
</body>
</html>
`;

    try {
        // Try to find Chrome or Edge
        const possiblePaths = [
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
            'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        ];

        let executablePath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                executablePath = p;
                break;
            }
        }

        if (!executablePath) {
            throw new Error('Chrome or Edge not found. Please install Chrome or Edge to export PDF.');
        }

        const browser = await puppeteer.launch({
            executablePath: executablePath,
            headless: true,
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({
            path: outputPath,
            format: 'A4',
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm',
            },
        });

        await browser.close();
    } catch (error) {
        throw new Error(`PDF export failed: ${error.message}`);
    }
}

// Single note export
ipcMain.handle('export-note', async (event, noteId, format) => {
    const notes = store.get('notes') || [];
    const note = notes.find(n => n.id === noteId);

    if (!note) {
        return { success: false, error: 'Note not found' };
    }

    const filters = {
        markdown: [{ name: 'Markdown', extensions: ['md'] }],
        word: [{ name: 'Word Document', extensions: ['docx'] }],
        pdf: [{ name: 'PDF Document', extensions: ['pdf'] }]
    };

    const extensions = {
        markdown: 'md',
        word: 'docx',
        pdf: 'pdf'
    };

    const result = await dialog.showSaveDialog(noteManagerWindow, {
        title: 'Export Note',
        defaultPath: `${sanitizeFilename(note.title)}.${extensions[format]}`,
        filters: filters[format]
    });

    if (result.canceled) {
        return { success: false, canceled: true };
    }

    try {
        if (format === 'markdown') {
            fs.writeFileSync(result.filePath, formatNoteToMarkdown(note));
        } else if (format === 'word') {
            const doc = formatNoteToWord(note);
            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(result.filePath, buffer);
        } else if (format === 'pdf') {
            await exportNoteToPDF(note, result.filePath);
        }

        return { success: true, path: result.filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Batch export
ipcMain.handle('export-notes-batch', async (event, noteIds, format) => {
    const result = await dialog.showOpenDialog(noteManagerWindow, {
        title: 'Select Export Folder',
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return { success: false, canceled: true };
    }

    const exportPath = result.filePaths[0];
    const notes = store.get('notes') || [];
    const selectedNotes = notes.filter(n => noteIds.includes(n.id));

    const extensions = {
        markdown: 'md',
        word: 'docx',
        pdf: 'pdf'
    };

    let exportedCount = 0;
    const errors = [];

    for (const note of selectedNotes) {
        try {
            const baseFilename = sanitizeFilename(note.title);
            const date = new Date(note.updatedAt).toISOString().split('T')[0];
            let filename = `${baseFilename}_${date}.${extensions[format]}`;
            let filePath = path.join(exportPath, filename);

            // Handle duplicate filenames
            let counter = 1;
            while (fs.existsSync(filePath)) {
                filename = `${baseFilename}_${date}_${counter}.${extensions[format]}`;
                filePath = path.join(exportPath, filename);
                counter++;
            }

            if (format === 'markdown') {
                fs.writeFileSync(filePath, formatNoteToMarkdown(note));
            } else if (format === 'word') {
                const doc = formatNoteToWord(note);
                const buffer = await Packer.toBuffer(doc);
                fs.writeFileSync(filePath, buffer);
            } else if (format === 'pdf') {
                await exportNoteToPDF(note, filePath);
            }

            exportedCount++;
        } catch (error) {
            errors.push({ title: note.title, error: error.message });
        }
    }

    return {
        success: true,
        count: exportedCount,
        total: selectedNotes.length,
        errors: errors
    };
});
