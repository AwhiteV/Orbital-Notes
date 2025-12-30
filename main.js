const { app, BrowserWindow, ipcMain, screen, globalShortcut, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

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
                floatingBallPosition: null,
                globalShortcut: 'Alt+1' // Default shortcut
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

// Create floating ball window
function createFloatingBallWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    // Get saved position or use default
    const savedPosition = store.get('settings.floatingBallPosition');
    const defaultX = screenWidth - 150;
    const defaultY = screenHeight / 2 - 60;

    floatingBallWindow = new BrowserWindow({
        width: 120,
        height: 120,
        x: savedPosition?.x || defaultX,
        y: savedPosition?.y || defaultY,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
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
        if (url.startsWith('http:') || url.startsWith('https:')) {
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
        if (url.startsWith('http:') || url.startsWith('https:')) {
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
        width: 900,
        height: 600,
        x: Math.floor((screenWidth - 900) / 2),
        y: Math.floor((screenHeight - 600) / 2),
        frame: false,
        transparent: false,
        resizable: true,
        minimizable: true,
        maximizable: true,
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
        if (url.startsWith('http:') || url.startsWith('https:')) {
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
        globalShortcut: store.get('settings.globalShortcut', 'Alt+1')
    };
});

ipcMain.handle('save-settings', (event, newSettings) => {
    let restartRequired = false;

    // Handle Shortcut
    const oldShortcut = store.get('settings.globalShortcut');
    if (newSettings.globalShortcut && newSettings.globalShortcut !== oldShortcut) {
        store.set('settings.globalShortcut', newSettings.globalShortcut);
        registerGlobalShortcut();
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
