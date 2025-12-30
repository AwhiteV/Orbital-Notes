const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('noteAPI', {
    // Window controls
    openQuickNote: (noteId = null) => ipcRenderer.send('open-quick-note', noteId),
    openNoteManager: () => ipcRenderer.send('open-note-manager'),
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    moveFloatingBall: (x, y) => ipcRenderer.send('move-floating-ball', { x, y }),
    getFloatingBallPosition: () => ipcRenderer.invoke('get-floating-ball-position'),
    openExternal: (url) => ipcRenderer.send('open-external', url),

    // Notes CRUD
    getNotes: () => ipcRenderer.invoke('get-notes'),
    getNote: (noteId) => ipcRenderer.invoke('get-note', noteId),
    createNote: (noteData) => ipcRenderer.invoke('create-note', noteData),
    updateNote: (noteId, noteData) => ipcRenderer.invoke('update-note', noteId, noteData),
    deleteNote: (noteId) => ipcRenderer.invoke('delete-note', noteId),
    togglePin: (noteId) => ipcRenderer.invoke('toggle-pin', noteId),

    // Search and filter
    searchNotes: (query) => ipcRenderer.invoke('search-notes', query),
    filterByTag: (tag) => ipcRenderer.invoke('filter-by-tag', tag),
    getAllTags: () => ipcRenderer.invoke('get-all-tags'),

    // Image handling
    saveImage: (imageBuffer, extension) => ipcRenderer.invoke('save-image', imageBuffer, extension),
    getImagePath: (fileName) => ipcRenderer.invoke('get-image-path', fileName),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    checkShortcutConflict: (shortcut) => ipcRenderer.invoke('check-shortcut-conflict', shortcut),

    // Event listeners
    onNotesUpdated: (callback) => {
        ipcRenderer.on('notes-updated', callback);
        return () => ipcRenderer.removeListener('notes-updated', callback);
    },
    onLoadNote: (callback) => {
        ipcRenderer.on('load-note', (event, noteId) => callback(noteId));
        return () => ipcRenderer.removeListener('load-note', callback);
    }
});
