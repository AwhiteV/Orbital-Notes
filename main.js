const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Initialize data store - save to project directory instead of AppData
const store = new Store({
    name: 'notes-data',
    cwd: path.join(__dirname, 'data'), // Save to project/data folder
    defaults: {
        notes: [],
        settings: {
            floatingBallPosition: null
        }
    }
});

// Window references
let floatingBallWindow = null;
let quickNoteWindow = null;
let noteManagerWindow = null;

// Ensure data directories exist in project folder
const dataPath = path.join(__dirname, 'data');
const imagesPath = path.join(dataPath, 'images');
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}
if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
}

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

    // Save position when window is moved
    floatingBallWindow.on('moved', () => {
        const [x, y] = floatingBallWindow.getPosition();
        store.set('settings.floatingBallPosition', { x, y });
    });

    floatingBallWindow.on('closed', () => {
        floatingBallWindow = null;
    });
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

    noteManagerWindow.on('closed', () => {
        noteManagerWindow = null;
    });
}

// App ready
app.whenReady().then(() => {
    createFloatingBallWindow();

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

// ==================== IPC Handlers ====================

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
            const fullPath = path.join(imagesPath, path.basename(imagePath));
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
    const filePath = path.join(imagesPath, fileName);

    // Convert array buffer to Buffer
    const buffer = Buffer.from(imageBuffer);
    fs.writeFileSync(filePath, buffer);

    return fileName;
});

ipcMain.handle('get-image-path', (event, fileName) => {
    return path.join(imagesPath, fileName);
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
