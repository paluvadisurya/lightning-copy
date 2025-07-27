// FastCopy Extension - Storage Management Module
// Handles Chrome Storage API interactions and data management

class StorageManager {
    constructor() {
        this.projects = [];
        this.currentTheme = 'light';
        this.defaultScreen = 'projects';
        this.deleteWarnings = {
            projects: true,
            snippets: true
        };
        this.totalCopyCount = 0;
        this.lastOpenedProjectId = null;
        this.rememberLastSelection = false;
    }

    // Initialize storage and load data
    async init() {
        try {
            await this.loadData();
            await this.migrateSnippetsCopyCount();
        } catch (error) {
            // Failed to initialize storage
        }
    }

    // Load all data from Chrome Storage
    async loadData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'fastcopy_projects',
                'fastcopy_theme',
                'fastcopy_default_screen',
                'fastcopy_delete_warnings',
                'fastcopy_total_copy_count',
                'fastcopy_last_opened_project',
                'fastcopy_remember_last_section'
            ], (result) => {
                this.projects = result.fastcopy_projects || [];
                this.currentTheme = result.fastcopy_theme || 'light';
                this.defaultScreen = result.fastcopy_default_screen || 'projects';
                this.deleteWarnings = result.fastcopy_delete_warnings || {
                    projects: true,
                    snippets: true
                };
                this.totalCopyCount = result.fastcopy_total_copy_count || 0;
                this.lastOpenedProjectId = result.fastcopy_last_opened_project || null;
                this.rememberLastSelection = result.fastcopy_remember_last_section || false;
                resolve();
            });
        });
    }

    // Save all data to Chrome Storage
    async saveData() {
        return new Promise((resolve) => {
            chrome.storage.sync.set({
                'fastcopy_projects': this.projects,
                'fastcopy_theme': this.currentTheme,
                'fastcopy_default_screen': this.defaultScreen,
                'fastcopy_delete_warnings': this.deleteWarnings,
                'fastcopy_total_copy_count': this.totalCopyCount,
                'fastcopy_last_opened_project': this.lastOpenedProjectId,
                'fastcopy_remember_last_section': this.rememberLastSelection
            }, () => {
                resolve();
            });
        });
    }

    // Save theme separately for quick updates
    async saveTheme(theme) {
        this.currentTheme = theme;
        return new Promise((resolve) => {
            chrome.storage.sync.set({
                'fastcopy_theme': theme
            }, () => {
                resolve();
            });
        });
    }

    // Save settings separately
    async saveSettings(settings) {
        if (settings.defaultScreen !== undefined) {
            this.defaultScreen = settings.defaultScreen;
        }
        if (settings.deleteWarnings !== undefined) {
            this.deleteWarnings = { ...this.deleteWarnings, ...settings.deleteWarnings };
        }
        
        return new Promise((resolve) => {
            chrome.storage.sync.set({
                'fastcopy_default_screen': this.defaultScreen,
                'fastcopy_delete_warnings': this.deleteWarnings
            }, () => {
                resolve();
            });
        });
    }

    // Migrate existing snippets to include copyCount field (backward compatibility)
    async migrateSnippetsCopyCount() {
        let needsMigration = false;
        
        this.projects.forEach(project => {
            if (project.snippets) {
                project.snippets.forEach(snippet => {
                    if (typeof snippet.copyCount !== 'number') {
                        snippet.copyCount = 0;
                        needsMigration = true;
                    }
                });
            }
        });
        
        if (needsMigration) {
            await this.saveData();
        }
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Project Management
    createProject(name) {
        const project = {
            id: this.generateId(),
            name: name.trim(),
            icon: this.getRandomProjectIcon(),
            color: this.getRandomProjectColor(),
            snippets: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.projects.unshift(project);
        return project;
    }

    updateProject(id, updates) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects[index] = {
                ...this.projects[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            return this.projects[index];
        }
        return null;
    }

    deleteProject(id) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            const deletedProject = this.projects.splice(index, 1)[0];
            return deletedProject;
        }
        return null;
    }

    getProject(id) {
        return this.projects.find(p => p.id === id);
    }

    // Snippet Management
    createSnippet(projectId, content) {
        const project = this.getProject(projectId);
        if (!project) return null;

        const snippet = {
            id: this.generateId(),
            content: content.trim(),
            copyCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        project.snippets.unshift(snippet);
        project.updatedAt = new Date().toISOString();
        
        return snippet;
    }

    updateSnippet(projectId, snippetId, updates) {
        const project = this.getProject(projectId);
        if (!project) return null;

        const index = project.snippets.findIndex(s => s.id === snippetId);
        if (index !== -1) {
            project.snippets[index] = {
                ...project.snippets[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            project.updatedAt = new Date().toISOString();
            return project.snippets[index];
        }
        return null;
    }

    deleteSnippet(projectId, snippetId) {
        const project = this.getProject(projectId);
        if (!project) return null;

        const index = project.snippets.findIndex(s => s.id === snippetId);
        if (index !== -1) {
            const deletedSnippet = project.snippets.splice(index, 1)[0];
            project.updatedAt = new Date().toISOString();
            return deletedSnippet;
        }
        return null;
    }

    getSnippet(projectId, snippetId) {
        const project = this.getProject(projectId);
        if (!project) return null;
        return project.snippets.find(s => s.id === snippetId);
    }

    // Copy Count Management
    incrementSnippetCopyCount(projectId, snippetId) {
        const project = this.getProject(projectId);
        if (!project) return null;
        
        const snippet = project.snippets.find(s => s.id === snippetId);
        if (snippet) {
            if (typeof snippet.copyCount !== 'number') {
                snippet.copyCount = 0;
            }
            snippet.copyCount++;
            this.totalCopyCount++;
            project.updatedAt = new Date().toISOString();
            snippet.updatedAt = new Date().toISOString();
            return snippet;
        }
        return null;
    }

    resetSnippetCopyCount(projectId, snippetId) {
        const project = this.getProject(projectId);
        if (!project) return null;
        
        const snippet = project.snippets.find(s => s.id === snippetId);
        if (snippet) {
            // Individual snippet reset does NOT affect global count
            // Only reset the specific snippet count
            snippet.copyCount = 0;
            project.updatedAt = new Date().toISOString();
            snippet.updatedAt = new Date().toISOString();
            return snippet;
        }
        return null;
    }

    resetProjectCopyCounts(projectId) {
        const project = this.getProject(projectId);
        if (!project) return 0;

        let resetCount = 0;
        project.snippets.forEach(snippet => {
            if (snippet.copyCount > 0) {
                // Project-level reset is also independent of global count
                // Only global reset button should affect global count
                resetCount += snippet.copyCount;
                snippet.copyCount = 0;
            }
        });

        if (resetCount > 0) {
            project.updatedAt = new Date().toISOString();
        }
        
        return resetCount;
    }

    resetAllCopyCounts() {
        let totalReset = 0;
        this.projects.forEach(project => {
            project.snippets.forEach(snippet => {
                if (snippet.copyCount > 0) {
                    totalReset += snippet.copyCount;
                    snippet.copyCount = 0;
                }
            });
            if (project.snippets.some(s => s.copyCount === 0)) {
                project.updatedAt = new Date().toISOString();
            }
        });
        
        this.totalCopyCount = 0;
        return totalReset;
    }

    // Utility functions for random selection
    getRandomProjectIcon(projectId = null) {
        const projectIcons = [
            'chat.svg', 'coffee.svg', 'compass.svg', 'copy.svg', 'crown.svg',
            'cube.svg', 'cursor.svg', 'database.svg', 'fire.svg', 'heart.svg',
            'hourglass.svg', 'house.svg', 'key.svg', 'map-pin-alt.svg', 'map-pin.svg',
            'menu.svg', 'message-circle.svg', 'mic.svg', 'mood-happy.svg', 'music-note.svg',
            'my-location.svg', 'playlist-video.svg', 'push-pin.svg', 'refresh.svg',
            'route.svg', 'scissors.svg', 'shield-check.svg', 'watch.svg'
        ];

        if (projectId) {
            let hash = 0;
            const seedString = projectId.toString();
            for (let i = 0; i < seedString.length; i++) {
                hash = ((hash << 5) - hash + seedString.charCodeAt(i)) & 0xffffffff;
            }
            const index = Math.abs(hash * 31) % projectIcons.length;
            return projectIcons[index];
        }
        
        return projectIcons[Math.floor(Math.random() * projectIcons.length)];
    }

    getRandomProjectColor(projectId = null) {
        const projectColors = [
            220, 200, 180, 160, 140, 120, 100, 80, 60, 40,
            240, 260, 280, 300, 320, 340, 20, 30, 50, 70
        ];

        if (projectId) {
            let hash = 0;
            const seedString = projectId.toString();
            for (let i = 0; i < seedString.length; i++) {
                hash = ((hash << 5) - hash + seedString.charCodeAt(i)) & 0xffffffff;
            }
            const index = Math.abs(hash * 97) % projectColors.length;
            return projectColors[index];
        }
        
        return projectColors[Math.floor(Math.random() * projectColors.length)];
    }

    // Export/Import functionality
    exportData() {
        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            projects: this.projects,
            settings: {
                defaultScreen: this.defaultScreen,
                deleteWarnings: this.deleteWarnings
            },
            totalCopyCount: this.totalCopyCount
        };
    }

    async importData(data) {
        try {
            if (data.projects && Array.isArray(data.projects)) {
                this.projects = data.projects;
            }
            if (data.settings) {
                if (data.settings.defaultScreen) {
                    this.defaultScreen = data.settings.defaultScreen;
                }
                if (data.settings.deleteWarnings) {
                    this.deleteWarnings = { ...this.deleteWarnings, ...data.settings.deleteWarnings };
                }
            }
            if (typeof data.totalCopyCount === 'number') {
                this.totalCopyCount = data.totalCopyCount;
            }
            
            await this.saveData();
            return true;
        } catch (error) {
            return false;
        }
    }

    // Clear all data
    async clearAllData() {
        this.projects = [];
        this.totalCopyCount = 0;
        this.defaultScreen = 'projects';
        this.deleteWarnings = {
            projects: true,
            snippets: true
        };
        await this.saveData();
    }
}

// Export for use in main extension
window.StorageManager = StorageManager; 