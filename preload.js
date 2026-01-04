const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('noteAPI', {
    // Window controls
    openQuickNote: (noteId = null) => ipcRenderer.send('open-quick-note', noteId),
    openNoteManager: () => ipcRenderer.send('open-note-manager'),
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    toggleMaximize: () => ipcRenderer.send('toggle-maximize'),
    moveFloatingBall: (x, y) => ipcRenderer.send('move-floating-ball', { x, y }),
    getFloatingBallPosition: () => ipcRenderer.invoke('get-floating-ball-position'),
    expandFloatingBall: () => ipcRenderer.invoke('expand-floating-ball'),
    shrinkFloatingBall: () => ipcRenderer.invoke('shrink-floating-ball'),
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

    // AI News
    fetchAINews: () => ipcRenderer.invoke('fetch-ai-news'),

    // Export
    exportNote: (noteId, format) => ipcRenderer.invoke('export-note', noteId, format),
    exportNotesBatch: (noteIds, format) => ipcRenderer.invoke('export-notes-batch', noteIds, format),

    // Event listeners
    onNotesUpdated: (callback) => {
        ipcRenderer.on('notes-updated', callback);
        return () => ipcRenderer.removeListener('notes-updated', callback);
    },
    onLoadNote: (callback) => {
        ipcRenderer.on('load-note', (event, noteId) => callback(noteId));
        return () => ipcRenderer.removeListener('load-note', callback);
    },
    onSettingsUpdated: (callback) => {
        ipcRenderer.on('settings-updated', (event, settings) => callback(settings));
        return () => ipcRenderer.removeListener('settings-updated', callback);
    }
});
