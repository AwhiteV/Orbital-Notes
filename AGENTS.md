# Agent Guidelines for Orbital Notes

This document provides guidelines for AI agents working on the Orbital Notes codebase.

## Project Overview

Orbital Notes is a Windows desktop note-taking application built with Electron. It features a floating ball interface, note management, screenshot capture with OCR, image pinning, and AI integration for translations and news.

## Build & Run Commands

```bash
# Start development server
npm start                    # Runs: electron .

# Build for Windows (NSIS installer)
npm run build               # Runs: electron-builder --win

# Build directory only (no installer)
npm run pack               # Runs: electron-builder --dir
```

## Code Style Guidelines

### General Principles

- Write self-documenting code with clear, descriptive function and variable names
- Keep functions focused and under 100 lines when possible
- Use early returns to reduce nesting
- Avoid deep indentation levels (prefer guard clauses)

### Imports & Modules

- Use CommonJS `require()` for all modules (this is an Electron app)
- Group imports logically:
  1. Electron modules
  2. Node.js built-ins
  3. Third-party dependencies
  4. Local modules
- Example (main.js):
```javascript
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');
const { Document, Packer } = require('docx');
const { marked } = require('marked');
require('dotenv').config();
```

### Naming Conventions

- **Variables & Functions**: camelCase (`createFloatingBallWindow`, `currentDataPath`)
- **Constants**: SCREAMING_SNAKE_CASE for configuration constants
- **IPC Handler Names**: kebab-case in renderer, converted in preload (`open-quick-note` → `openQuickNote`)
- **Note**: No existing tests or linting configuration; ensure code is clean and consistent

### Error Handling

- Wrap async operations in try/catch blocks
- Log errors with `console.error()` including context
- Return structured error objects from IPC handlers:
```javascript
return { success: false, error: 'Descriptive message' };
```
- Validate inputs before processing
- Use meaningful error messages for user-facing errors

### IPC Communication Pattern

- Main process: Use `ipcMain.handle()` for request-response, `ipcMain.on()` for one-way
- Renderer: Use contextBridge in preload.js to expose APIs
- Always validate data from renderer before processing
- Example pattern:
```javascript
// Main process
ipcMain.handle('get-note', (event, noteId) => {
    const notes = store.get('notes') || [];
    return notes.find(note => note.id === noteId) || null;
});

// Preload
getNote: (noteId) => ipcRenderer.invoke('get-note', noteId),
```

### File Organization

- **main.js**: ~1900 lines - IPC handlers, window creation, core business logic
- **preload.js**: Bridge between main and renderer processes
- **src/**: Contains window modules (floating-ball, note-manager, quick-note, etc.)
- **src/{module}/index.html**: Renderer HTML for each window
- Each window feature has its own directory under src/

### Data Store

- Uses `electron-store` for persistent storage
- Store file: `notes-data.json` in data path
- Structure: `{ notes: [], settings: {...} }`
- Notes have: `id`, `title`, `content`, `tags`, `images`, `createdAt`, `updatedAt`, `pinned`

### BrowserWindow Configuration

- Use `frame: false` for custom window chrome
- Set `alwaysOnTop: true` for floating UI elements
- Configure `webPreferences` with `contextIsolation: true`, `nodeIntegration: false`
- Always set `skipTaskbar: true` for overlay/floating windows

### Code Patterns

- Use `app.whenReady()` for initialization
- Handle `window-all-closed` and `will-quit` events
- Clean up global shortcuts on quit
- Use `path.join(__dirname, ...)` for file paths
- Prefer `fs.existsSync()` checks before file operations

### API Keys & Secrets

- Never commit API keys; use `.env` file
- Check `.env` first, then fall back to settings store
- Example pattern:
```javascript
const settingsApiKey = store.get('settings.modelscopeApiKey', '');
const apiKey = settingsApiKey || process.env.MODELSCOPE_API_KEY;
```

### Renderer Process

- Access main APIs via `window.noteAPI` (exposed via contextBridge)
- Use event listeners pattern for async responses:
```javascript
const cleanup = window.noteAPI.onNotesUpdated(() => { /* refresh */ });
return cleanup; // Call to remove listener
```

## Common Tasks

### Adding a New Window Type

1. Create directory: `src/{window-name}/`
2. Create `index.html` in that directory
3. Add window creation function in main.js
4. Add IPC handlers as needed
5. Expose APIs in preload.js

### Adding New IPC Handler

1. Add handler in main.js using `ipcMain.handle()`
2. Expose in preload.js `contextBridge.exposeInMainWorld()`
3. Call from renderer via `window.noteAPI.{methodName}()`

### Modifying Settings Schema

1. Update default settings in `initStore()` function (main.js:36-52)
2. Add corresponding IPC handler if needed
3. Update preload.js getter/setter
4. Update renderer code to use new setting
