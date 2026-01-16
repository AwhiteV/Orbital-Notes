// Orbital Notes - Multi-language Support
// Supports: English (en), Simplified Chinese (zh)

const languages = {
    en: {
        // Common
        save: 'Save',
        saveChanges: 'Save Changes',
        cancel: 'Cancel',
        close: 'Close',
        delete: 'Delete',
        copy: 'Copy',
        export: 'Export',
        browse: 'Browse',
        keep: 'Keep',
        discard: 'Discard',

        // App Title
        appTitle: 'Orbital Notes',
        quickNote: 'Quick Note',

        // Settings Modal
        settings: 'Settings',
        general: 'General',
        shortcuts: 'Shortcuts',
        tags: 'Tags',
        dify: 'Dify',
        aiModel: 'AI Model',

        // General Tab
        language: 'Language',
        languageDesc: 'Choose your preferred display language',
        dataStoragePath: 'Data Storage Path',
        dataPathDesc: 'Requires restart to apply changes.',
        floatingBallSize: 'Floating Ball Size',
        floatingBallTheme: 'Floating Ball Theme',
        classicTheme: 'Classic Brown',
        sakuraTheme: 'Sakura Pink',
        autoLaunch: 'Auto Launch',
        autoLaunchDesc: 'Start Orbital Notes when you log in',
        hoverToShowTodoList: 'Hover to Show Todo List',
        hoverToShowTodoListDesc: 'Display Todo List panel when hovering over the floating ball',
        small: 'Small',
        large: 'Large',

        // Shortcuts Tab
        toggleFloatingBall: 'Toggle Floating Ball',
        screenshotShortcut: 'Screenshot (Capture Screen)',
        pinClipboardImage: 'Pin Clipboard Image',
        defaultShortcut: 'Default',

        // Tags Tab
        existingTags: 'Existing Tags',
        noTagsFound: 'No tags found.',
        tagsDesc: 'Click X to delete a tag from the system (removes from filter list only).',

        // Dify Tab
        difyWorkflowConfig: 'Dify Workflow Configuration',
        baseUrl: 'Base URL',
        baseUrlDesc: 'Dify API base URL (leave empty to use .env)',
        workflowApiKey: 'Workflow API Key',
        apiKeyDesc: 'Workflow API key (leave empty to use .env)',
        difyNote: 'Note: These settings are used for the AI Daily News feature. You can find your API key in the Dify Workflow "API Access" section.',

        // AI Model Tab
        aiModelConfig: 'AI Model Configuration (Modelscope)',
        modelscopeApiKey: 'Modelscope API Key',
        modelscopeApiKeyDesc: 'Used for OCR and Image Translation. (Leave empty to use .env)',
        modelscopeNote: 'Note: This key is used for advanced AI features like OCR and Translation. You can get your key from the Modelscope platform.',

        // Note Manager
        notes: 'notes',
        searchNotes: 'Search notes...',
        allNotes: 'All Notes',
        newNote: 'New Note',
        aiDailyNews: 'AI Daily News',
        aiProductTrends: 'AI Product Trends',
        selectNoteToView: 'Select a note to view',
        orCreateNewOne: 'or create a new one',
        lastEdited: 'Last edited',
        words: 'words',
        saved: 'Saved',
        pinNote: 'Pin Note',
        copyToClipboard: 'Copy to Clipboard',
        exportNote: 'Export Note',
        exportAsMarkdown: 'Export as Markdown',
        exportAsWord: 'Export as Word',
        exportAsPdf: 'Export as PDF',
        editNote: 'Edit Note',
        translateNote: 'Translate to Chinese',
        deleteNote: 'Delete Note',
        cancelEdit: 'Cancel',
        noteTitle: 'Note Title',
        tagsPlaceholder: 'Tags (comma separated)',
        startWriting: 'Start writing...',
        deleteNoteConfirm: 'Delete Note',
        deleteNoteMessage: 'Are you sure you want to delete this note? This action cannot be undone.',
        batchMode: 'Batch operations',
        selected: 'selected',
        exportNotes: 'Export Notes',
        deleteNotes: 'Delete Notes',
        deleteNotesWarning: 'Warning: This action cannot be undone. All selected notes and their associated images will be permanently deleted.',
        deleteAll: 'Delete All',
        markdown: 'Markdown (.md)',
        markdownDesc: 'Plain text, preserves formatting',
        word: 'Word (.docx)',
        wordDesc: 'Editable document format',
        pdf: 'PDF (.pdf)',
        pdfDesc: 'Best for sharing and printing',

        // Quick Note
        unsaved: 'Unsaved',
        pinToTop: 'Pin to top',
        minimize: 'Minimize',
        doubleClickToRename: 'Double click to rename',
        typeSomething: 'Type something, paste an image, or drop a link...',
        bold: 'Bold',
        italic: 'Italic',
        list: 'List',
        color: 'Color',
        textSize: 'Text Size',
        togglePreview: 'Toggle Preview',
        editMode: 'Edit Mode',
        previewMode: 'Preview Mode',
        unsavedChanges: 'Unsaved Changes',
        unsavedChangesMessage: 'You have unsaved changes. Are you sure you want to discard them?',
        tag: 'Tag',
        tagPlaceholder: 'Tag...',

        // Floating Ball / Todo List
        todoList: 'Todo List',
        todoPlaceholder: 'Write something...',
        exportToNote: 'Export to Note',
        task: 'Task',
        exported: 'Exported!',
        completedTasks: 'Completed Tasks',
        taskList: 'Task List',

        // OCR Result
        screenshot: 'Screenshot',
        recognizedText: 'Recognized Text',
        translate: 'Translate',
        note: 'Note',
        chineseTranslation: 'Chinese Translation',
        recognizing: 'Recognizing...',
        translating: 'Translating...',

        // Toast Messages
        settingsSaved: 'Settings saved.',
        settingsSavedRestart: 'Settings saved. Restarting application...',
        copiedToClipboard: 'Copied to clipboard',
        noteCreated: 'Note created',
        noteUpdated: 'Note updated',
        noteDeleted: 'Note deleted',
        exportSuccess: 'Export successful'
    },

    zh: {
        // Common
        save: '保存',
        saveChanges: '保存更改',
        cancel: '取消',
        close: '关闭',
        delete: '删除',
        copy: '复制',
        export: '导出',
        browse: '浏览',
        keep: '保留',
        discard: '丢弃',

        // App Title
        appTitle: 'Orbital Notes',
        quickNote: '快速笔记',

        // Settings Modal
        settings: '设置',
        general: '通用',
        shortcuts: '快捷键',
        tags: '标签',
        dify: 'Dify',
        aiModel: 'AI 模型',

        // General Tab
        language: '语言',
        languageDesc: '选择您偏好的显示语言',
        dataStoragePath: '数据存储路径',
        dataPathDesc: '需要重启应用以生效。',
        floatingBallSize: '悬浮球大小',
        floatingBallTheme: '悬浮球主题',
        classicTheme: '经典棕色',
        sakuraTheme: '樱花粉',
        autoLaunch: '开机自启',
        autoLaunchDesc: '登录时自动启动 Orbital Notes',
        hoverToShowTodoList: '悬停显示待办列表',
        hoverToShowTodoListDesc: '鼠标悬停在悬浮球上时显示待办列表面板',
        small: '小',
        large: '大',

        // Shortcuts Tab
        toggleFloatingBall: '切换悬浮球',
        screenshotShortcut: '截图（屏幕捕获）',
        pinClipboardImage: '贴图（剪贴板图片）',
        defaultShortcut: '默认',

        // Tags Tab
        existingTags: '现有标签',
        noTagsFound: '未找到标签。',
        tagsDesc: '点击 X 从系统中删除标签（仅从筛选列表中移除）。',

        // Dify Tab
        difyWorkflowConfig: 'Dify 工作流配置',
        baseUrl: '基础 URL',
        baseUrlDesc: 'Dify API 基础 URL（留空则使用 .env）',
        workflowApiKey: '工作流 API 密钥',
        apiKeyDesc: '工作流 API 密钥（留空则使用 .env）',
        difyNote: '注意：这些设置用于 AI 每日新闻功能。您可以在 Dify 工作流的"API 访问"部分找到您的 API 密钥。',

        // AI Model Tab
        aiModelConfig: 'AI 模型配置（Modelscope）',
        modelscopeApiKey: 'Modelscope API 密钥',
        modelscopeApiKeyDesc: '用于 OCR 和图片翻译。（留空则使用 .env）',
        modelscopeNote: '注意：此密钥用于高级 AI 功能，如 OCR 和翻译。您可以从 Modelscope 平台获取密钥。',

        // Note Manager
        notes: '条笔记',
        searchNotes: '搜索笔记...',
        allNotes: '全部笔记',
        newNote: '新建笔记',
        aiDailyNews: 'AI 每日新闻',
        aiProductTrends: 'AI 产品新趋势',
        selectNoteToView: '选择一条笔记查看',
        orCreateNewOne: '或创建新笔记',
        lastEdited: '最后编辑',
        words: '字',
        saved: '已保存',
        pinNote: '置顶笔记',
        copyToClipboard: '复制到剪贴板',
        exportNote: '导出笔记',
        exportAsMarkdown: '导出为 Markdown',
        exportAsWord: '导出为 Word',
        exportAsPdf: '导出为 PDF',
        editNote: '编辑笔记',
        translateNote: '翻译为中文',
        deleteNote: '删除笔记',
        cancelEdit: '取消',
        noteTitle: '笔记标题',
        tagsPlaceholder: '标签（逗号分隔）',
        startWriting: '开始写作...',
        deleteNoteConfirm: '删除笔记',
        deleteNoteMessage: '确定要删除这条笔记吗？此操作无法撤销。',
        batchMode: '批量操作',
        selected: '已选择',
        exportNotes: '导出笔记',
        deleteNotes: '删除笔记',
        deleteNotesWarning: '警告：此操作无法撤销。所有选中的笔记及其关联的图片将被永久删除。',
        deleteAll: '全部删除',
        markdown: 'Markdown (.md)',
        markdownDesc: '纯文本，保留格式',
        word: 'Word (.docx)',
        wordDesc: '可编辑文档格式',
        pdf: 'PDF (.pdf)',
        pdfDesc: '最适合分享和打印',

        // Quick Note
        unsaved: '未保存',
        pinToTop: '置顶',
        minimize: '最小化',
        doubleClickToRename: '双击重命名',
        typeSomething: '输入内容、粘贴图片或拖放链接...',
        bold: '粗体',
        italic: '斜体',
        list: '列表',
        color: '颜色',
        textSize: '字号',
        togglePreview: '切换预览',
        editMode: '编辑模式',
        previewMode: '预览模式',
        unsavedChanges: '未保存的更改',
        unsavedChangesMessage: '您有未保存的更改。确定要丢弃吗？',
        tag: '标签',
        tagPlaceholder: '标签...',

        // Floating Ball / Todo List
        todoList: '待办列表',
        todoPlaceholder: '写点什么...',
        exportToNote: '导出为笔记',
        task: '任务',
        exported: '已导出!',
        completedTasks: '完成的任务',
        taskList: '任务清单',

        // OCR Result
        screenshot: '截图',
        recognizedText: '识别文本',
        translate: '翻译',
        note: '笔记',
        chineseTranslation: '中文翻译',
        recognizing: '识别中...',
        translating: '翻译中...',

        // Toast Messages
        settingsSaved: '设置已保存。',
        settingsSavedRestart: '设置已保存，正在重启应用...',
        copiedToClipboard: '已复制到剪贴板',
        noteCreated: '笔记已创建',
        noteUpdated: '笔记已更新',
        noteDeleted: '笔记已删除',
        exportSuccess: '导出成功'
    }
};

// Helper function to get translation
function t(key, lang = 'en') {
    return languages[lang]?.[key] || languages['en']?.[key] || key;
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { languages, t };
}
