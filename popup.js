// FastCopy Extension - Main JavaScript
class FastCopyExtension {
    constructor() {
        // Initialize managers
        this.storage = new StorageManager();
        // Notification system removed (no more tooltips/guidance)
        
        // UI state
        this.currentProject = null;
        this.editingProject = null;
        this.editingSnippet = null;
        this.isImporting = false; // Flag to track import state
        
        // Use external project configuration
        this.projectIcons = ProjectConfig.icons;
        this.projectColors = ProjectConfig.colors;

        // UI components
        this.undoStacks = {
            projects: [],
            snippets: []
        };
        this.confirmCallback = null;
        
        // Settings event listeners tracking
        this.settingsEventListeners = [];
        
        // Initialize drag and drop manager
        this.dragDropManager = null;
    }

    // Proxy methods to storage manager
    get projects() { return this.storage.projects; }
    set projects(value) { this.storage.projects = value; }
    get currentTheme() { return this.storage.currentTheme; }
    set currentTheme(value) { this.storage.currentTheme = value; }
    get defaultScreen() { return this.storage.defaultScreen; }
    set defaultScreen(value) { this.storage.defaultScreen = value; }
    get deleteWarnings() { return this.storage.deleteWarnings; }
    set deleteWarnings(value) { this.storage.deleteWarnings = value; }
    get totalCopyCount() { return this.storage.totalCopyCount; }
    set totalCopyCount(value) { this.storage.totalCopyCount = value; }
    get lastOpenedProjectId() { return this.storage.lastOpenedProjectId; }
    set lastOpenedProjectId(value) { this.storage.lastOpenedProjectId = value; }
    get rememberLastSelection() { return this.storage.rememberLastSelection; }
    set rememberLastSelection(value) { this.storage.rememberLastSelection = value; }

    // Toast functionality removed per user request

    async init() {
        try {
            await this.storage.init();
            this.applyTheme();
            this.setupEventListeners();
            
            // Initialize drag and drop manager after DOM is ready
            this.initializeDragDrop();
            
            // Show default screen based on user preference
            if (this.defaultScreen === 'snippets' && this.projects.length > 0) {
                let targetProject = null;
                
                // If "Remember Last Selection" is enabled, try to load the last opened project
                if (this.rememberLastSelection && this.lastOpenedProjectId) {
                    targetProject = this.projects.find(p => p.id === this.lastOpenedProjectId);
                }
                
                // If no remembered project or it doesn't exist, fall back to most recent
                if (!targetProject) {
                    targetProject = this.projects.reduce((recent, project) => {
                        return new Date(project.updatedAt) > new Date(recent.updatedAt) ? project : recent;
                    }, this.projects[0]);
                }
                
                this.currentProject = targetProject;
                this.showProjectView(this.currentProject);
            } else {
                // Default to projects view
                this.showHomeView();
            }
        } catch (error) {
            console.error('Error initializing extension:', error);
            // Fallback to basic view
            this.showHomeView();
        }
    }

    // Theme Management
    applyTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        // Also set class for backward compatibility
        document.body.className = this.currentTheme === 'dark' ? 'dark-theme' : 'light-theme';
    }

    toggleTheme() {
        // Add theme switching animation class
        document.body.classList.add('theme-switching');
        
        // Change theme immediately for instant color variables update
        const previousTheme = this.currentTheme;
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        this.storage.saveData();
        
        // Theme change feedback removed (toast functionality removed)
        
        // Update content immediately for consistent theming
        this.render();
        
        // Remove animation class after unified transition completes
        setTimeout(() => {
            document.body.classList.remove('theme-switching');
        }, 500);
    }

    // Project Management - using StorageManager

    getRandomProjectIcon(projectId) {
        // Use project ID as seed for consistent icon per project with better distribution
        let hash = 0;
        const seedString = projectId + '_icon_variant'; // Different seed from colors
        for (let i = 0; i < seedString.length; i++) {
            const char = seedString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Use a different prime number for icon distribution
        const distributedHash = (Math.abs(hash) * 1103515245) % (2 ** 32);
        const index = distributedHash % this.projectIcons.length;
        return this.projectIcons[index];
    }

    getRandomProjectColor(projectId) {
        // Use project ID as seed for consistent color per project with better distribution
        let hash = 0;
        const seedString = projectId + '_color_variant'; // Different seed to ensure different distribution
        for (let i = 0; i < seedString.length; i++) {
            const char = seedString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Use a larger prime number for better distribution across colors
        const distributedHash = (Math.abs(hash) * 2654435761) % (2 ** 32);
        const index = distributedHash % this.projectColors.length;
        return this.projectColors[index];
    }

    createProject(name) {
        const project = this.storage.createProject(name);
        if (project) {
            this.storage.saveData();
            
            // Project creation feedback removed (toast functionality removed)
        }
        return project;
    }

    updateProject(id, updates) {
        const updated = this.storage.updateProject(id, updates);
        if (updated) {
            this.storage.saveData();
        }
        return updated;
    }

    deleteProject(id) {
        const project = this.projects.find(p => p.id === id);
        const projectName = project ? project.name : 'Project';
        const snippetCount = project ? project.snippets.length : 0;
        
        const deleted = this.storage.deleteProject(id);
        if (deleted) {
            if (this.currentProject && this.currentProject.id === id) {
                this.currentProject = null;
            }
            this.storage.saveData();
            
            // Project deletion feedback removed (toast functionality removed)
        }
    }

    // Snippet Management - using StorageManager
    createSnippet(projectId, content) {
        const snippet = this.storage.createSnippet(projectId, content);
        if (snippet) {
            this.storage.saveData();
            
            // Snippet creation feedback removed (toast functionality removed)
        }
        return snippet;
    }

    updateSnippet(projectId, snippetId, updates) {
        const updated = this.storage.updateSnippet(projectId, snippetId, updates);
        if (updated) {
            this.storage.saveData();
        }
        return updated;
    }

    deleteSnippet(projectId, snippetId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const snippet = project.snippets.find(s => s.id === snippetId);
        const snippetContent = snippet ? snippet.content : 'Snippet';
        const snippetPreview = snippetContent.length > 30 ? snippetContent.substring(0, 30) + '...' : snippetContent;
        const snippetIndex = project.snippets.findIndex(s => s.id === snippetId);

        const deleted = this.storage.deleteSnippet(projectId, snippetId);
        if (deleted) {
            this.storage.saveData();

            // Snippet deletion feedback removed (toast functionality removed)
        }
    }

    // Copy Functionality
    async copyToClipboard(text, element = null) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopySuccess(element);
        } catch (error) {
            console.error('Failed to copy text:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showCopySuccess(element);
        }
    }

    // Minimalistic Copy Animation
    createMinimalistCopyFeedback(element, event) {
        // Add gentle scale and background color animation
        element.classList.add('copy-feedback');
        
        // Create floating "Copied" message
        const copiedMessage = document.createElement('div');
        copiedMessage.className = 'copied-message';
        copiedMessage.textContent = 'Copied';
        copiedMessage.setAttribute('aria-live', 'polite');
        copiedMessage.setAttribute('role', 'status');
        
        // Position the message relative to the viewport (not inside the card)
        const rect = element.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        
        copiedMessage.style.position = 'fixed';
        copiedMessage.style.left = `${x}px`;
        copiedMessage.style.top = `${y - 10}px`;
        copiedMessage.style.zIndex = '10000';
        
        // Append to body instead of element to avoid overflow clipping
        document.body.appendChild(copiedMessage);
        
        // Trigger animations
        requestAnimationFrame(() => {
            copiedMessage.classList.add('show');
        });
        
        // Clean up animations
        setTimeout(() => {
            element.classList.remove('copy-feedback');
            copiedMessage.classList.remove('show');
            copiedMessage.classList.add('hide');
            
            setTimeout(() => {
                if (copiedMessage.parentNode) {
                    copiedMessage.parentNode.removeChild(copiedMessage);
                }
            }, 300);
        }, 1200);
    }

    // Ripple animation removed per user request

    // Copy snippet with count tracking
    async copySnippet(snippet, element = null, event = null) {
        try {
            // Copy to clipboard
            await navigator.clipboard.writeText(snippet.content);
            
            // Increment copy count
            this.incrementSnippetCopyCount(snippet.id);
            
            // Show visual feedback
            if (element && element.classList.contains('snippet-card') && event) {
                this.createMinimalistCopyFeedback(element, event);
            }
            
            // Copy feedback is handled by the existing animation - no toast needed
            
        } catch (error) {
            console.error('Failed to copy snippet:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = snippet.content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Still increment count on fallback
            this.incrementSnippetCopyCount(snippet.id);
            
            // Show feedback even on fallback
            if (element && element.classList.contains('snippet-card') && event) {
                this.createMinimalistCopyFeedback(element, event);
            }
        }
    }

    // Increment copy count for a specific snippet
    incrementSnippetCopyCount(snippetId) {
        if (!this.currentProject) return;
        
        const updated = this.storage.incrementSnippetCopyCount(this.currentProject.id, snippetId);
        if (updated) {
            this.storage.saveData();
            
            // Refresh current project data from storage
            this.currentProject = this.projects.find(p => p.id === this.currentProject.id);
            
            // Update UI to reflect new counts
            this.updateSnippetCopyCountDisplay(snippetId);
            this.updateGlobalCopyCountDisplay();
        }
    }

    // Update copy count display for a specific snippet
    updateSnippetCopyCountDisplay(snippetId) {
        const snippet = this.currentProject?.snippets.find(s => s.id === snippetId);
        if (!snippet) return;
        
        const snippetElement = document.querySelector(`[data-snippet-id="${snippetId}"]`);
        if (snippetElement) {
            const countWrapper = snippetElement.querySelector('.snippet-copy-count-wrapper');
            const countElement = snippetElement.querySelector('.snippet-copy-count');
            if (countElement && countWrapper) {
                const copyCount = snippet.copyCount || 0;
                countElement.textContent = copyCount;
                countWrapper.setAttribute('data-count', copyCount);
                countWrapper.setAttribute('title', `Times copied: ${copyCount}`);
                
                // Add a subtle animation to highlight the count update
                countElement.classList.add('count-updated');
                setTimeout(() => {
                    countElement.classList.remove('count-updated');
                }, 300);
            }
        }
    }

    // Update global copy count display
    updateGlobalCopyCountDisplay() {
        const globalCountElement = document.querySelector('.global-copy-count');
        if (globalCountElement) {
            globalCountElement.textContent = this.totalCopyCount;
            // Add a subtle animation to highlight the count update
            globalCountElement.classList.add('count-updated');
            setTimeout(() => {
                globalCountElement.classList.remove('count-updated');
            }, 300);
        }
    }

    // Reset copy count for a specific snippet - independent reset
    resetSnippetCopyCount(snippetId) {
        if (!this.currentProject) return false;
        
        const updated = this.storage.resetSnippetCopyCount(this.currentProject.id, snippetId);
        if (updated) {
            this.storage.saveData();
            
            // Update UI - only update snippet display, NOT global count
            // Individual snippet resets are independent of global count
            this.updateSnippetCopyCountDisplay(snippetId);
            
            return true;
        }
        return false;
    }

    // Reset copy counts for all snippets in current project - independent reset
    resetProjectCopyCounts() {
        if (!this.currentProject) return false;
        
        const resetCount = this.storage.resetProjectCopyCounts(this.currentProject.id);
        if (resetCount > 0) {
            this.storage.saveData();
            // Re-render project to update snippet displays
            // Project-level reset is independent of global count
            this.renderProject();
            return resetCount;
        }
        return false;
    }

    // Reset copy counts for all snippets in all projects
    resetAllCopyCounts() {
        const totalReset = this.storage.resetAllCopyCounts();
        if (totalReset > 0) {
            this.storage.saveData();
            // Re-render current view to update displays
            this.render();
            return totalReset;
        }
        return false;
    }

    // Reset global copy count - hierarchical reset (resets everything)
    resetGlobalCopyCount() {
        // Global reset should reset BOTH global count AND all snippet counts
        const totalReset = this.storage.resetAllCopyCounts();
        this.storage.saveData();
        
        // Update all displays to reflect the reset
        this.updateGlobalCopyCountDisplay();
        
        // If we're in a project view, re-render to update snippet count displays
        if (this.currentProject) {
            this.renderProject();
        }
        
        // Count reset feedback removed (toast functionality removed)
        return totalReset;
    }

    // Show context menu for snippet copy count reset
    showSnippetContextMenu(event, snippetId, copyCount) {
        // Remove any existing context menu
        this.hideSnippetContextMenu();

        const contextMenu = document.createElement('div');
        contextMenu.className = 'snippet-context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="reset-count">
                <img src="icons/delete.svg" alt="Reset" class="context-menu-icon">
                <span>Reset copy count (${copyCount})</span>
            </div>
        `;

        // Position the context menu
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.zIndex = '10000';

        document.body.appendChild(contextMenu);

        // Add event listeners
        const resetItem = contextMenu.querySelector('[data-action="reset-count"]');
        resetItem.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetSnippetCopyCount(snippetId);
            this.hideSnippetContextMenu();
        });

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', this.hideSnippetContextMenu.bind(this), { once: true });
        
        // Hide context menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSnippetContextMenu();
            }
        }, { once: true });

        // Store reference for cleanup
        this.activeContextMenu = contextMenu;
    }

    // Hide snippet context menu
    hideSnippetContextMenu() {
        if (this.activeContextMenu) {
            this.activeContextMenu.remove();
            this.activeContextMenu = null;
        }
    }

    // Enhanced copy method with minimalistic animation
    async copyToClipboardMinimalist(text, element = null, event = null) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Use minimalistic animation for snippet cards
            if (element && element.classList.contains('snippet-card') && event) {
                this.createMinimalistCopyFeedback(element, event);
            }
            
        } catch (error) {
            console.error('Failed to copy text:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Show feedback even on fallback
            if (element && element.classList.contains('snippet-card') && event) {
                this.createMinimalistCopyFeedback(element, event);
            }
        }
    }

    // Guidance system removed per user request

    // Event Listeners
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                this.toggleTheme();
            });
        }

        // Navigation
        const navAddProject = document.getElementById('nav-add-project');
        if (navAddProject) {
            navAddProject.addEventListener('click', (e) => {
                this.showProjectModal();
            });
        }

        const navBackBtn = document.getElementById('nav-back-btn');
        if (navBackBtn) {
            navBackBtn.addEventListener('click', (e) => {
                this.showHomeView();
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                this.openOptionsPage();
            });
        }

        // Project management
        const addProjectBtn = document.getElementById('add-project-btn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', (e) => {
                this.showProjectModal();
            });
        }

        // Header add project button
        const headerAddProjectBtn = document.getElementById('header-add-project-btn');
        if (headerAddProjectBtn) {
            headerAddProjectBtn.addEventListener('click', (e) => {
                this.showProjectModal();
            });
        }

        const addSnippetBtn = document.getElementById('add-snippet-btn');
        if (addSnippetBtn) {
            addSnippetBtn.addEventListener('click', (e) => {
                this.showSnippetModal();
            });
        }

        // Modals
        this.setupModalListeners();
        
        // Add escape key listener to close popup
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close any open modals first
                this.hideProjectModal();
                this.hideSnippetModal();
                this.hideConfirmModal();
                
                // Then close the popup
                window.close();
            }
        });
        
        // Add blur event listener to ensure popup closes when losing focus
        // This helps with the "click outside to close" behavior
        window.addEventListener('blur', () => {
            // Small delay to prevent closing during internal navigation
            setTimeout(() => {
                // Only close if no modals are open and not importing data
                const hasOpenModal = document.querySelector('.modal.show');
                if (!hasOpenModal && !this.isImporting) {
                    window.close();
                }
            }, 100);
        });
    }

    // Ripple effects removed per user request



    setupModalListeners() {
        // Project modal
        const projectModal = document.getElementById('project-modal');
        const projectModalClose = document.getElementById('project-modal-close');
        const projectModalCancel = document.getElementById('project-modal-cancel');
        const projectModalSave = document.getElementById('project-modal-save');

        if (projectModalClose) projectModalClose.addEventListener('click', (e) => {
            this.hideProjectModal();
        });
        if (projectModalCancel) projectModalCancel.addEventListener('click', (e) => {
            this.hideProjectModal();
        });
        if (projectModalSave) projectModalSave.addEventListener('click', (e) => {
            this.saveProject();
        });

        if (projectModal) {
            projectModal.addEventListener('click', (e) => {
                if (e.target === projectModal) this.hideProjectModal();
            });
        }

        // Snippet modal
        const snippetModal = document.getElementById('snippet-modal');
        const snippetModalClose = document.getElementById('snippet-modal-close');
        const snippetModalCancel = document.getElementById('snippet-modal-cancel');
        const snippetModalSave = document.getElementById('snippet-modal-save');

        if (snippetModalClose) snippetModalClose.addEventListener('click', (e) => {
            this.hideSnippetModal();
        });
        if (snippetModalCancel) snippetModalCancel.addEventListener('click', (e) => {
            this.hideSnippetModal();
        });
        if (snippetModalSave) snippetModalSave.addEventListener('click', (e) => {
            this.saveSnippet();
        });

        if (snippetModal) {
            snippetModal.addEventListener('click', (e) => {
                if (e.target === snippetModal) this.hideSnippetModal();
            });
        }

        // Enter key handling
        const projectNameInput = document.getElementById('project-name-input');
        if (projectNameInput) {
            projectNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveProject();
            });
        }

        const snippetContentInput = document.getElementById('snippet-content-input');
        if (snippetContentInput) {
            snippetContentInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveSnippet();
            });
        }

        // Confirmation modal
        const confirmModal = document.getElementById('confirm-modal');
        const confirmModalClose = document.getElementById('confirm-modal-close');
        const confirmModalCancel = document.getElementById('confirm-modal-cancel');
        const confirmModalConfirm = document.getElementById('confirm-modal-confirm');

        if (confirmModalClose) confirmModalClose.addEventListener('click', (e) => {
            this.hideConfirmModal();
        });
        if (confirmModalCancel) confirmModalCancel.addEventListener('click', (e) => {
            this.hideConfirmModal();
        });
        if (confirmModalConfirm) confirmModalConfirm.addEventListener('click', (e) => {
            this.handleConfirmAction();
        });

        if (confirmModal) {
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) this.hideConfirmModal();
            });
        }

    }

    // Modal Management
    showProjectModal(project = null) {
        this.editingProject = project;
        const modal = document.getElementById('project-modal');
        const title = document.getElementById('project-modal-title');
        const nameInput = document.getElementById('project-name-input');

        title.textContent = project ? 'Edit Project' : 'Add New Project';
        nameInput.value = project ? project.name : '';

        modal.classList.add('show');
        nameInput.focus();
    }

    hideProjectModal() {
        document.getElementById('project-modal').classList.remove('show');
        this.editingProject = null;
    }

    showSnippetModal(snippet = null) {
        this.editingSnippet = snippet;
        const modal = document.getElementById('snippet-modal');
        const title = document.getElementById('snippet-modal-title');
        const contentInput = document.getElementById('snippet-content-input');

        title.textContent = snippet ? 'Edit Snippet' : 'Add New Snippet';
        contentInput.value = snippet ? snippet.content : '';

        modal.classList.add('show');
        contentInput.focus();
    }

    hideSnippetModal() {
        document.getElementById('snippet-modal').classList.remove('show');
        this.editingSnippet = null;
    }

    // Confirmation Modal
    showConfirmModal(title, message, confirmText = 'Delete', onConfirm = null, context = {}) {
        const modal = document.getElementById('confirm-modal');
        const titleElement = document.getElementById('confirm-modal-title');
        const messageElement = document.getElementById('confirm-modal-message');
        const confirmButton = document.getElementById('confirm-modal-confirm');
        const cancelButton = document.getElementById('confirm-modal-cancel');

        // Update modal content for new design based on action type and context
        if (title.includes('Delete the Project') || title.includes('Delete Project')) {
            const projectName = context.projectName || 'this project';
            const snippetCount = context.snippetCount || 0;
            titleElement.textContent = 'Delete Project';
            messageElement.textContent = `You're about to delete "${projectName}" with ${snippetCount} snippet${snippetCount !== 1 ? 's' : ''}. This action cannot be undone.`;
            confirmButton.textContent = 'Yes, Delete!';
            cancelButton.textContent = 'No, Keep It.';
        } else if (title.includes('Delete Snippet')) {
            const snippetPreview = context.snippetPreview || 'this snippet';
            titleElement.textContent = 'Delete Snippet';
            messageElement.textContent = `You're about to delete: "${snippetPreview}". This action cannot be undone.`;
            confirmButton.textContent = 'Yes, Delete!';
            cancelButton.textContent = 'No, Keep It.';
        } else if (title.includes('Reset All Data')) {
            const projectCount = context.projectCount || 0;
            const totalSnippets = context.totalSnippets || 0;
            titleElement.textContent = 'Reset All Data';
            messageElement.textContent = `You're about to permanently delete ${projectCount} project${projectCount !== 1 ? 's' : ''} and ${totalSnippets} snippet${totalSnippets !== 1 ? 's' : ''}. This cannot be undone!`;
            confirmButton.textContent = 'Yes, Reset!';
            cancelButton.textContent = 'No, Keep It.';
        } else {
            titleElement.textContent = title;
            messageElement.textContent = message || "Are you sure you want to proceed?";
            confirmButton.textContent = confirmText;
            cancelButton.textContent = 'Cancel';
        }

        // Store the callback function
        this.confirmCallback = onConfirm;

        modal.classList.add('show');

        // Ensure modal is properly centered
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                // Reset any positioning overrides and ensure centering
                modalContent.style.position = '';
                modalContent.style.top = '';
                modalContent.style.left = '';
                modalContent.style.transform = '';
                modalContent.style.margin = 'auto';
            }
        }, 10);
        
        // Focus the cancel button by default for safety
        if (cancelButton) {
            cancelButton.focus();
        }
    }

    hideConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('show');
        this.confirmCallback = null;
    }

    handleConfirmAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
        this.hideConfirmModal();
    }

    // Save Functions
    saveProject() {
        const nameInput = document.getElementById('project-name-input');
        const name = nameInput.value.trim();

        if (!name) {
            nameInput.focus();
            // Form validation feedback removed (toast functionality removed)
            return;
        }

        // Check for duplicate project names
        const existingProject = this.projects.find(p => p.name.toLowerCase() === name.toLowerCase() && (!this.editingProject || p.id !== this.editingProject.id));
        if (existingProject) {
            nameInput.focus();
            // Duplicate validation feedback removed (toast functionality removed)
            return;
        }

        if (this.editingProject) {
            this.updateProject(this.editingProject.id, { name });
            // Project rename feedback removed (toast functionality removed)
        } else {
            this.createProject(name);
        }

        this.hideProjectModal();
        this.render();
    }

    saveSnippet() {
        const contentInput = document.getElementById('snippet-content-input');
        const content = contentInput.value.trim();

        if (!content) {
            contentInput.focus();
            // Form validation feedback removed (toast functionality removed)
            return;
        }

        // Check for duplicate snippet content within the project
        const existingSnippet = this.currentProject.snippets.find(s => s.content.toLowerCase() === content.toLowerCase() && (!this.editingSnippet || s.id !== this.editingSnippet.id));
        if (existingSnippet) {
            contentInput.focus();
            // Duplicate validation feedback removed (toast functionality removed)
            return;
        }

        if (this.editingSnippet) {
            this.updateSnippet(this.currentProject.id, this.editingSnippet.id, { content });
            const contentPreview = content.length > 30 ? content.substring(0, 30) + '...' : content;
            // Update feedback removed (toast functionality removed)
        } else {
            this.createSnippet(this.currentProject.id, content);
        }

        this.hideSnippetModal();
        this.renderProject();
    }

    // View Management
    showHomeView() {
        const homeView = document.getElementById('home-view');
        const projectView = document.getElementById('project-view');
        const settingsView = document.getElementById('settings-view');
        const projectNav = document.getElementById('project-nav');
        const addProjectBtn = document.getElementById('add-project-btn');
        const navBackBtn = document.getElementById('nav-back-btn');
        const addSnippetBtn = document.getElementById('add-snippet-btn');
        
        // Start transition for current view if it exists
        const currentView = document.querySelector('.view[style*="display: block"], .view.active');
        if (currentView && currentView !== homeView) {
            currentView.classList.add('transitioning-out');
        }
        
        // Prepare home view for transition
        if (homeView) {
            homeView.style.display = 'block';
            homeView.classList.add('transitioning-in');
            homeView.classList.remove('active');
        }
        
        // Add view switching class for performance
        document.body.classList.add('view-switching');
        
        // Use requestAnimationFrame for smooth transition
        requestAnimationFrame(() => {
            // Hide other views and UI elements
            if (projectView) projectView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'none';
            if (projectNav) projectNav.classList.remove('show');
            if (navBackBtn) navBackBtn.style.display = 'none';
            if (addSnippetBtn) addSnippetBtn.style.display = 'none';
            
            // Complete home view transition
            if (homeView) {
                homeView.classList.remove('transitioning-in');
                homeView.classList.add('active');
            }
            
            // Remove view switching class after transition
            setTimeout(() => {
                document.body.classList.remove('view-switching');
            }, 250);
            
            // Remove project view active class
            document.body.classList.remove('project-view-active');
            
            // Hide floating add project button (using header button instead)
            if (addProjectBtn) {
                addProjectBtn.classList.remove('show');
            }
            
            // Cleanup drag and drop before switching views
            if (this.dragDropManager) {
                this.dragDropManager.cleanupCurrentView();
            }
            
            this.currentProject = null;
            this.render();
        });
    }

    showProjectView(project) {
        // Cleanup drag and drop before switching views
        if (this.dragDropManager) {
            this.dragDropManager.cleanupCurrentView();
        }
        
        this.currentProject = project;
        
        // Remember last opened project if preference is enabled
        if (this.rememberLastSelection && project) {
            this.lastOpenedProjectId = project.id;
            this.storage.saveData();
        }
        const homeView = document.getElementById('home-view');
        const projectView = document.getElementById('project-view');
        const settingsView = document.getElementById('settings-view');
        const projectNav = document.getElementById('project-nav');
        const navBackBtn = document.getElementById('nav-back-btn');
        const addSnippetBtn = document.getElementById('add-snippet-btn');
        
        // Start transition for current view if it exists
        const currentView = document.querySelector('.view[style*="display: block"], .view.active');
        if (currentView && currentView !== projectView) {
            currentView.classList.add('transitioning-out');
        }
        
        // Prepare project view for transition
        if (projectView) {
            projectView.style.display = 'block';
            projectView.classList.add('transitioning-in');
            projectView.classList.remove('active');
        }
        
        // Add view switching class for performance
        document.body.classList.add('view-switching');
        
        // Use requestAnimationFrame for smooth transition
        requestAnimationFrame(() => {
            // Hide other views and show UI elements
            if (homeView) homeView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'none';
            if (projectNav) projectNav.classList.add('show');
            if (navBackBtn) navBackBtn.style.display = 'flex';
            if (addSnippetBtn) addSnippetBtn.style.display = 'flex';
            
            // Complete project view transition
            if (projectView) {
                projectView.classList.remove('transitioning-in');
                projectView.classList.add('active');
            }
            
            // Remove view switching class after transition
            setTimeout(() => {
                document.body.classList.remove('view-switching');
            }, 250);
            
            // Add project view active class to enable snippet button
            document.body.classList.add('project-view-active');
            
            // Hide floating add project button
            const addProjectBtn = document.getElementById('add-project-btn');
            if (addProjectBtn) {
                addProjectBtn.classList.remove('show');
            }
            
            this.renderProject();
            this.renderNavigation();
        });
    }

    // Initialize drag and drop functionality
    initializeDragDrop() {
        if (window.DragDropManager) {
            this.dragDropManager = new DragDropManager(this);
        }
    }

    // Refresh drag and drop after DOM updates
    refreshDragDrop() {
        if (this.dragDropManager) {
            // Use requestAnimationFrame to ensure DOM is fully updated
            requestAnimationFrame(() => {
                this.dragDropManager.refresh();
            });
        }
    }

    // Setup empty state creator card functionality
    setupEmptyStateCreatorCard() {
        const creatorCard = document.getElementById('empty-state-creator-card');
        const dismissBtn = document.getElementById('creator-card-dismiss');
        
        if (!creatorCard || !dismissBtn) {
            console.warn('Creator card elements not found');
            return;
        }
        
        // Check if user has permanently dismissed the card
        const isPermanentlyDismissed = localStorage.getItem('lightning-copy-creator-card-dismissed') === 'true';
        if (isPermanentlyDismissed) {
            creatorCard.style.display = 'none';
            return;
        }
        
        // Check if card was already shown this session (to avoid being intrusive)
        const currentSession = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute session blocks
        const lastShownSession = sessionStorage.getItem('lightning-copy-creator-card-shown');
        const shownThisSession = lastShownSession === currentSession.toString();
        
        if (shownThisSession) {
            creatorCard.style.display = 'none';
            return;
        }
        
        // Mark as shown this session
        sessionStorage.setItem('lightning-copy-creator-card-shown', currentSession.toString());
        
        // Manual dismiss functionality
        const dismissCard = () => {
            creatorCard.classList.add('dismissing');
            setTimeout(() => {
                creatorCard.style.display = 'none';
                creatorCard.classList.remove('visible', 'dismissing');
                // Remember user's preference permanently
                localStorage.setItem('lightning-copy-creator-card-dismissed', 'true');
            }, 300); // Match animation duration
        };
        
        dismissBtn.addEventListener('click', dismissCard);
        
        // Auto-dismiss after 10 seconds with fade out animation (optimal UX timing)
        setTimeout(() => {
            if (creatorCard && creatorCard.style.display !== 'none' && !creatorCard.classList.contains('dismissing')) {
                creatorCard.classList.add('auto-dismissing');
                setTimeout(() => {
                    if (creatorCard && !creatorCard.classList.contains('dismissing')) {
                        creatorCard.style.display = 'none';
                        creatorCard.classList.remove('visible', 'auto-dismissing');
                    }
                }, 1000); // Slower fade for auto-dismiss
            }
        }, 10000); // 10 seconds - optimal timing for reading without being intrusive
        
        // Show the card with slide-up animation (only on empty Projects screen)
        const homeView = document.getElementById('home-view');
        const projectsGrid = document.getElementById('projects-grid');
        const isEmpty = homeView && homeView.style.display !== 'none' && 
                       projectsGrid && projectsGrid.innerHTML.includes('empty-state');
        
        if (isEmpty) {
            // Show card and trigger animation
            creatorCard.style.display = 'block';
            setTimeout(() => {
                creatorCard.classList.add('visible');
            }, 500); // Small delay for initial load
        }
    }

    // Rendering
    render() {
        try {
            // Only render projects if we're in home view
            if (!this.currentProject) {
                this.renderProjects();
                // Ensure project-view-active class is removed for home view
                document.body.classList.remove('project-view-active');
            } else {
                this.renderProject();
                this.renderNavigation();
                // CRITICAL: Restore project-view-active class for snippet button visibility
                document.body.classList.add('project-view-active');
            }
        } catch (error) {
            console.error('Error during render:', error);
        }
        
        // Setup settings event listeners after DOM is updated
        this.setupSettingsEventListeners();
        
        // Refresh drag and drop functionality
        this.refreshDragDrop();
    }

    renderProjects() {
        const projectsGrid = document.getElementById('projects-grid');
        if (!projectsGrid) return;
        
        if (this.projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="empty-state">
                    <img src="icons/document.svg" alt="No projects" class="empty-state-icon" onerror="this.style.display='none'">
                    <h3>No projects yet</h3>
                    <p>Create your first project to get started with organizing your snippets.</p>
                </div>
            `;
            
            // Insert creator card outside all containers (like add-snippet button)
            const existingCard = document.getElementById('empty-state-creator-card');
            if (!existingCard) {
                const creatorCardHTML = `
                    <!-- Creator Card - COMPLETELY OUTSIDE ALL CONTAINERS (like add-snippet button) -->
                    <div class="empty-state-creator-card" id="empty-state-creator-card" style="display: none;">
                        <button class="creator-card-dismiss" id="creator-card-dismiss" title="Dismiss">
                            <img src="icons/close.svg" alt="Close" class="dismiss-icon">
                        </button>
                        <!-- Reuse existing profile card structure -->
                        <div class="profile-card">
                            <!-- Column 1: Avatar (center aligned vertically) -->
                            <div class="profile-avatar-column">
                                <img src="icons/paluvadisurya.png" alt="Paluvadi Surya" class="profile-avatar">
                            </div>
                            
                            <!-- Column 2: Name, Title, Social Buttons (stacked) -->
                            <div class="profile-content-column">
                                <!-- Name & Title Group with Crafted By -->
                                <div class="profile-info-group">
                                    <div class="creator-name-group">
                                        <span class="crafted-by-text">Crafted by</span>
                                        <h2 class="profile-name">Paluvadi Surya</h2>
                                    </div>
                                    <p class="profile-title">Senior Scientist at Uber</p>
                                </div>
                                
                                <!-- Social Buttons -->
                                <div class="profile-buttons-column">
                                    <div class="profile-social-buttons">
                                        <a href="https://www.linkedin.com/in/paluvadisurya/" target="_blank" class="social-button linkedin-btn" aria-label="Connect on LinkedIn">
                                            <img src="icons/linkedin.svg" alt="LinkedIn" class="social-icon">
                                            LinkedIn
                                        </a>
                                        <a href="https://github.com/paluvadisurya" target="_blank" class="social-button github-btn" aria-label="View GitHub Profile">
                                            <img src="icons/github.svg" alt="GitHub" class="social-icon">
                                            GitHub
                                        </a>
                                        <a href="https://brainfuelled.substack.com/" target="_blank" class="social-button substack-btn" aria-label="View Substack Articles">
                                            <img src="icons/substack-icon.svg" alt="Substack" class="social-icon">
                                            Substack
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', creatorCardHTML);
                
                // Setup creator card functionality after insertion
                this.setupEmptyStateCreatorCard();
            }
            
            return;
        }

        projectsGrid.innerHTML = this.projects.map(project => {
            const projectColor = this.getRandomProjectColor(project.id);
            
            return `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-icon" style="--project-icon-color: true; --project-hue: ${projectColor.hue}deg;">
                    <img src="project-icons/${this.getRandomProjectIcon(project.id)}" alt="Project icon" class="project-icon-img" onerror="this.style.display='none'">
                </div>
                <div class="project-content">
                    <div class="project-card-header">
                        <h3 class="project-card-title">${this.escapeHtml(project.name)}</h3>
                        <div class="project-card-actions">
                            <button class="project-card-action edit-project" data-project-id="${project.id}" title="Edit project">
                                <img src="icons/edit.svg" alt="Edit" class="button-icon">
                            </button>
                            <button class="project-card-action delete-project" data-project-id="${project.id}" title="Delete project">
                                <img src="icons/delete.svg" alt="Delete" class="button-icon">
                            </button>
                        </div>
                    </div>

                    <div class="project-card-stats">
                        <div class="project-card-stat">
                            <img src="icons/clipboard-text.svg" alt="Snippets" class="stat-icon" onerror="this.style.display='none'">
                            ${project.snippets.length} snippet${project.snippets.length !== 1 ? 's' : ''}
                        </div>
                        <div class="project-card-stat">
                            <img src="icons/calendar.svg" alt="Updated" class="stat-icon" onerror="this.style.display='none'">
                            ${this.formatDate(project.updatedAt)}
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Add event listeners
        projectsGrid.querySelectorAll('.project-card').forEach(card => {
            const projectId = card.dataset.projectId;
            const project = this.projects.find(p => p.id === projectId);
            
            card.addEventListener('click', (e) => {
                // Only handle click if not clicking on actions
                if (!e.target.closest('.project-card-actions')) {
                    // Immediate navigation with optimized rendering
                    this.showProjectView(project);
                    // Update sliding background after view switch
                    requestAnimationFrame(() => {
                        this.updateSlidingBackground();
                    });
                }
            });
        });

        projectsGrid.querySelectorAll('.edit-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                const project = this.projects.find(p => p.id === projectId);
                this.showProjectModal(project);
            });
        });

        projectsGrid.querySelectorAll('.delete-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                const project = this.projects.find(p => p.id === projectId);
                if (this.deleteWarnings.projects) {
                    this.showConfirmModal(
                        'Delete Project',
                        '',
                        'Delete',
                        () => {
                            this.deleteProject(projectId);
                            this.render();
                        },
                        {
                            projectName: project.name,
                            snippetCount: project.snippets.length
                        }
                    );
                } else {
                    this.deleteProject(projectId);
                    this.render();
                }
            });
        });

        // Refresh drag and drop for projects
        this.refreshDragDrop();
    }

    renderProject() {
        if (!this.currentProject) return;

        const snippetsContainer = document.getElementById('snippets-container');
        if (!snippetsContainer) return;

        if (this.currentProject.snippets.length === 0) {
            snippetsContainer.innerHTML = `
                <div class="empty-state">
                    <img src="icons/blank-menu.svg" alt="No snippets" class="empty-state-icon" onerror="this.style.display='none'">
                    <h3>No snippets yet</h3>
                    <p>Add your first snippet to start organizing your code.</p>
                </div>
            `;
            
            // Empty state is self-explanatory - no toast needed
            
            return;
        }

        // Filter snippets based on search query
        const filteredSnippets = this.searchQuery ? 
            this.currentProject.snippets.filter(snippet => 
                snippet.content.toLowerCase().includes(this.searchQuery)
            ) : this.currentProject.snippets;

        snippetsContainer.innerHTML = filteredSnippets.map(snippet => {
            const copyCount = snippet.copyCount || 0;
            return `
            <div class="snippet-card" data-snippet-id="${snippet.id}">
                <div class="snippet-card-content">${this.escapeHtml(snippet.content)}</div>
                <div class="snippet-card-actions">
                    <button class="snippet-card-action edit-snippet" data-snippet-id="${snippet.id}" title="Edit snippet">
                        <img src="icons/edit.svg" alt="Edit" class="button-icon">
                    </button>
                    <button class="snippet-card-action delete-snippet" data-snippet-id="${snippet.id}" title="Delete snippet">
                        <img src="icons/delete.svg" alt="Delete" class="button-icon">
                    </button>
                </div>
                <div class="snippet-copy-count-wrapper" data-count="${copyCount}" title="Times copied: ${copyCount}">
                    <span class="snippet-copy-count">${copyCount}</span>
                </div>
            </div>
            `;
        }).join('');

        // Add event listeners
        snippetsContainer.querySelectorAll('.snippet-card').forEach(card => {
            const snippetId = card.dataset.snippetId;
            const snippet = this.currentProject.snippets.find(s => s.id === snippetId);
            
            card.addEventListener('click', (e) => {
                // Only handle click if not clicking on actions
                if (!e.target.closest('.snippet-card-actions')) {
                    this.copySnippet(snippet, card, e);
                }
            });

            // Context menu for copy count reset
            card.addEventListener('contextmenu', (e) => {
                if (snippet.copyCount > 0) {
                    e.preventDefault();
                    this.showSnippetContextMenu(e, snippetId, snippet.copyCount);
                }
            });
        });

        // Refresh drag and drop for snippets
        this.refreshDragDrop();

        snippetsContainer.querySelectorAll('.edit-snippet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const snippetId = btn.dataset.snippetId;
                const snippet = this.currentProject.snippets.find(s => s.id === snippetId);
                this.showSnippetModal(snippet);
            });
        });

        snippetsContainer.querySelectorAll('.delete-snippet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const snippetId = btn.dataset.snippetId;
                const snippet = this.currentProject.snippets.find(s => s.id === snippetId);
                if (this.deleteWarnings.snippets) {
                    const snippetPreview = snippet.content.length > 50 ? snippet.content.substring(0, 50) + '...' : snippet.content;
                    this.showConfirmModal(
                        'Delete Snippet',
                        '',
                        'Delete',
                        () => {
                            this.deleteSnippet(this.currentProject.id, snippetId);
                            this.currentProject = this.projects.find(p => p.id === this.currentProject.id);
                            this.renderProject();
                        },
                        {
                            snippetPreview: snippetPreview
                        }
                    );
                } else {
                    this.deleteSnippet(this.currentProject.id, snippetId);
                    this.currentProject = this.projects.find(p => p.id === this.currentProject.id);
                    this.renderProject();
                }
            });
        });
    }

    renderNavigation() {
        const navProjects = document.getElementById('nav-projects');
        if (!navProjects) return;
        
        navProjects.innerHTML = this.projects.map((project, index) => {
            const projectColor = this.getRandomProjectColor(project.id);
            const projectIcon = this.getRandomProjectIcon(project.id);
            const isActive = project.id === this.currentProject?.id;
            
            return `
            <div class="nav-project ${isActive ? 'active' : ''}" 
                 data-project-id="${project.id}" 
                 style="--project-hue: ${projectColor.hue}deg;"
                 role="tab"
                 tabindex="${isActive ? '0' : '-1'}"
                 aria-selected="${isActive}"
                 aria-label="Switch to ${this.escapeHtml(project.name)} project">
                <div class="nav-project-icon">
                    <img src="project-icons/${projectIcon}" alt="" class="nav-project-icon-img" onerror="this.style.display='none'">
                </div>
                <span class="nav-project-name">${this.escapeHtml(project.name)}</span>
            </div>
            `;
        }).join('');

        // Add enhanced event listeners
        this.setupNavigationInteractions();
        
        // Update scroll shadows
        this.updateScrollShadows();
        
        // Update sliding background position
        this.updateSlidingBackground();
        
        // Auto-scroll active project into view with improved timing
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.scrollActiveProjectIntoView();
                // Ensure sliding background is positioned correctly after any scrolling
                this.updateSlidingBackground();
            }, 50);
        });
    }
    
    setupNavigationInteractions() {
        const navProjects = document.getElementById('nav-projects');
        const navProjectsWrapper = document.getElementById('nav-projects-wrapper');
        if (!navProjects) return;

        // Enhanced click and keyboard navigation
        navProjects.querySelectorAll('.nav-project').forEach((nav, index) => {
            nav.addEventListener('click', (e) => {
                this.selectProject(nav.dataset.projectId);
            });
            
            nav.addEventListener('keydown', (e) => {
                this.handleNavigationKeydown(e, index);
            });
        });

        // Scroll event listeners for shadows and sliding background
        navProjects.addEventListener('scroll', () => {
            this.updateScrollShadows();
            this.updateSlidingBackground();
        });

        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.updateScrollShadows();
            this.updateSlidingBackground();
        });
    }
    
    selectProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            // Update active class first
            const navProjects = document.getElementById('nav-projects');
            if (navProjects) {
                navProjects.querySelectorAll('.nav-project').forEach(nav => {
                    nav.classList.remove('active');
                    nav.setAttribute('aria-selected', 'false');
                    nav.tabIndex = -1;
                });
                
                const activeNav = navProjects.querySelector(`[data-project-id="${projectId}"]`);
                if (activeNav) {
                    activeNav.classList.add('active');
                    activeNav.setAttribute('aria-selected', 'true');
                    activeNav.tabIndex = 0;
                }
            }
            
            // Animate sliding background before switching project
            this.updateSlidingBackground();
            
            // Immediate project switch with optimized animations
            this.showProjectView(project);
            // Ensure smooth scrolling happens after the UI updates
            requestAnimationFrame(() => {
                this.scrollActiveProjectIntoView();
            });
        }
    }
    
    updateSlidingBackground() {
        const navProjects = document.getElementById('nav-projects');
        const activeProject = navProjects?.querySelector('.nav-project.active');
        
        if (!navProjects || !activeProject) {
            // Hide sliding background if no active project
            navProjects?.classList.remove('has-active');
            return;
        }
        
        // Show sliding background
        navProjects.classList.add('has-active');
        
        // Calculate position and dimensions relative to the container
        const containerRect = navProjects.getBoundingClientRect();
        const activeRect = activeProject.getBoundingClientRect();
        
        // Calculate relative position within the scrolling container
        const scrollLeft = navProjects.scrollLeft;
        const activeLeft = activeProject.offsetLeft;
        const activeWidth = activeProject.offsetWidth;
        
        // Update CSS custom properties for the sliding background
        navProjects.style.setProperty('--slide-left', `${activeLeft}px`);
        navProjects.style.setProperty('--slide-width', `${activeWidth}px`);
        
        // Update the ::before pseudo-element through CSS variables
        requestAnimationFrame(() => {
            navProjects.style.setProperty('--slide-transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');
        });
    }
    
    handleNavigationKeydown(e, currentIndex) {
        const navProjects = document.getElementById('nav-projects');
        const projects = navProjects.querySelectorAll('.nav-project');
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : projects.length - 1;
                this.focusProject(prevIndex);
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                const nextIndex = currentIndex < projects.length - 1 ? currentIndex + 1 : 0;
                this.focusProject(nextIndex);
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                const projectId = projects[currentIndex].dataset.projectId;
                this.selectProject(projectId);
                break;
                
            case 'Home':
                e.preventDefault();
                this.focusProject(0);
                break;
                
            case 'End':
                e.preventDefault();
                this.focusProject(projects.length - 1);
                break;
        }
    }
    
    focusProject(index) {
        const navProjects = document.getElementById('nav-projects');
        const projects = navProjects.querySelectorAll('.nav-project');
        
        // Update tabindex
        projects.forEach((project, i) => {
            project.tabIndex = i === index ? 0 : -1;
        });
        
        // Focus the project
        projects[index].focus();
        
        // Scroll into view if needed
        this.scrollProjectIntoView(projects[index]);
    }
    
    scrollActiveProjectIntoView() {
        const activeProject = document.querySelector('.nav-project.active');
        if (activeProject) {
            this.scrollProjectIntoView(activeProject);
        }
    }
    
    scrollProjectIntoView(projectElement) {
        const navProjects = document.getElementById('nav-projects');
        if (!navProjects || !projectElement) return;
        
        const allProjects = navProjects.querySelectorAll('.nav-project');
        const projectIndex = Array.from(allProjects).indexOf(projectElement);
        
        const containerRect = navProjects.getBoundingClientRect();
        const elementRect = projectElement.getBoundingClientRect();
        
        // Calculate if element is out of view or if we should center it regardless
        const isOutOfView = elementRect.left < containerRect.left || 
                           elementRect.right > containerRect.right;
        
        // Always scroll for active projects to ensure proper positioning
        const isActive = projectElement.classList.contains('active');
        
        if (isOutOfView || isActive) {
            // Always center the active project for consistent behavior
            const scrollLeft = projectElement.offsetLeft - (navProjects.clientWidth / 2) + (projectElement.clientWidth / 2);
            
            // Ensure scroll position is within valid bounds
            const maxScrollLeft = navProjects.scrollWidth - navProjects.clientWidth;
            const finalScrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft));
            
            navProjects.scrollTo({
                left: finalScrollLeft,
                behavior: 'smooth'
            });
        }
    }
    
    updateScrollShadows() {
        const navProjects = document.getElementById('nav-projects');
        const navProjectsWrapper = document.getElementById('nav-projects-wrapper');
        if (!navProjects || !navProjectsWrapper) return;
        
        const { scrollLeft, scrollWidth, clientWidth } = navProjects;
        
        // Check if we can scroll left
        const canScrollLeft = scrollLeft > 5;
        
        // Check if we can scroll right  
        const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
        
        navProjectsWrapper.classList.toggle('has-scroll-left', canScrollLeft);
        navProjectsWrapper.classList.toggle('has-scroll-right', canScrollRight);
    }
    


    // Utility Functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
        
        const weeks = Math.floor(days / 7);
        if (days < 30) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
        
        const months = Math.floor(days / 30);
        if (days < 365) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
        
        const years = Math.floor(days / 365);
        return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }



    // Icon loading utility
    async loadIcon(iconName) {
        try {
            const response = await fetch(chrome.runtime.getURL(`icons/${iconName}.svg`));
            if (response.ok) {
                return await response.text();
            }
        } catch (error) {

        }
        
        // Return empty string if icon not found - this will use CSS mask instead
        return '';
    }

    // Settings functionality
    openOptionsPage() {
        // Instead of opening new tab, show options within the extension
        this.showSettingsView();
    }
    
    showSettingsView() {
        // Cleanup drag and drop before switching views
        if (this.dragDropManager) {
            this.dragDropManager.cleanupCurrentView();
        }
        
        const homeView = document.getElementById('home-view');
        const projectView = document.getElementById('project-view');
        const projectNav = document.getElementById('project-nav');
        const settingsView = document.getElementById('settings-view');
        
        if (homeView) homeView.style.display = 'none';
        if (projectView) projectView.style.display = 'none';
        if (projectNav) projectNav.classList.remove('show');
        
        // Remove project view active class
        document.body.classList.remove('project-view-active');
        
        // Hide floating add project button
        const addProjectBtn = document.getElementById('add-project-btn');
        if (addProjectBtn) {
            addProjectBtn.classList.remove('show');
        }
        
        // Create settings view if it doesn't exist
        if (!settingsView) {
            this.createSettingsView();
            // Setup event listeners after creating settings DOM
            this.setupSettingsEventListeners();
        } else {
            // Update the global copy count display if settings view already exists
            this.updateGlobalCopyCountDisplay();
        }
        
        const settingsViewElement = document.getElementById('settings-view');
        if (settingsViewElement) {
            settingsViewElement.style.display = 'block';
        }
        
        this.currentProject = null;
    }


    
    createSettingsView() {
        const settingsHTML = `
            <div class="view" id="settings-view" style="display: none;">
                <div class="settings-header">
                    <button class="nav-back-btn" id="settings-back-btn" title="Back to projects">
                        <img src="icons/back.svg" alt="Back" class="button-icon">
                    </button>
                    <div class="settings-title-group">
                        <h2>Settings</h2>
                        <span class="version-badge">Lightning Copy v1.0.0</span>
                    </div>
                </div>
                
                <div class="settings-content">
                    <!-- 2-Column Profile Card -->
                    <div class="profile-card">
                        <!-- Column 1: Avatar (center aligned vertically) -->
                        <div class="profile-avatar-column">
                            <img src="icons/paluvadisurya.png" alt="Paluvadi Surya" class="profile-avatar">
                        </div>
                        
                        <!-- Column 2: Name, Title, Social Buttons (stacked) -->
                        <div class="profile-content-column">
                            <!-- Name & Title Group with Crafted By -->
                            <div class="profile-info-group">
                                <div class="creator-name-group">
                                    <span class="crafted-by-text">Crafted by</span>
                                    <h2 class="profile-name">Paluvadi Surya</h2>
                                </div>
                                <p class="profile-title">Senior Scientist at Uber</p>
                            </div>
                            
                            <!-- Social Buttons -->
                            <div class="profile-buttons-column">
                                <div class="profile-social-buttons">
                                    <a href="https://www.linkedin.com/in/paluvadisurya/" target="_blank" class="social-button linkedin-btn" aria-label="Connect on LinkedIn">
                                        <img src="icons/linkedin.svg" alt="LinkedIn" class="social-icon">
                                        LinkedIn
                                    </a>
                                    <a href="https://github.com/paluvadisurya" target="_blank" class="social-button github-btn" aria-label="View GitHub Profile">
                                        <img src="icons/github.svg" alt="GitHub" class="social-icon">
                                        GitHub
                                    </a>
                                    <a href="https://brainfuelled.substack.com/" target="_blank" class="social-button substack-btn" aria-label="View Substack Articles">
                                        <img src="icons/substack-icon.svg" alt="Substack" class="social-icon">
                                        Substack
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Usage Statistics Section -->
                    <div class="setting-section stats-section">
                        <div class="stats-single-line">
                            <div class="stats-header">
                                <span class="stats-title">Total Snippets Copied</span>
                            </div>
                            <div class="stats-content">
                                <span class="stat-value global-copy-count">${this.totalCopyCount}</span>
                            </div>
                            <button class="btn-orange-icon" id="reset-global-count-btn" title="Reset global copy count">
                                <img src="icons/refresh.svg" alt="Reset" class="reset-icon">
                            </button>
                        </div>
                    </div>

                    <!-- Preferences Section -->
                    <div class="preferences-section">
                        <h3 class="section-title">
                            <img src="icons/settings.svg" alt="Preferences" class="settings-icon">
                            Preferences
                            <div class="preferences-info-wrapper">
                                <img src="icons/info.svg" alt="Preferences Info" class="preferences-info-icon" id="preferences-info-icon">
                                <div class="preferences-info-popup">
                                    <div class="info-popup-content">
                                        <h4 class="info-popup-title">Preferences Guide</h4>
                                        <div class="info-popup-section">
                                            <div class="preference-item">
                                                <img src="icons/heart.svg" alt="" class="preference-icon">
                                                <div class="preference-text">
                                                    <strong>Default Screen:</strong> Choose which view opens when you launch the extension.
                                                </div>
                                            </div>
                                        </div>
                                        <div class="info-popup-section">
                                            <div class="preference-item">
                                                <img src="icons/check-circle.svg" alt="" class="preference-icon">
                                                <div class="preference-text">
                                                    <strong>Delete Warning:</strong> Enable confirmation dialogs before deleting. Recommended for safety.
                                                </div>
                                            </div>
                                        </div>
                                        <div class="info-popup-section">
                                            <div class="preference-item">
                                                <img src="icons/database.svg" alt="" class="preference-icon">
                                                <div class="preference-text">
                                                    <strong>Remember Last Selection:</strong> Extension remembers your last selected project.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </h3>
                        
                        <!-- 3x3 Settings Matrix UI -->
                        <div class="settings-matrix">
                            <!-- Pill 1: Label Row -->
                            <div class="matrix-pill label-pill">
                                <div class="pill-column label-column">
                                    <span class="pill-text label-text">Action</span>
                                </div>
                                <div class="pill-column header-column">
                                    <span class="pill-text header-text">Projects</span>
                                </div>
                                <div class="pill-column header-column">
                                    <span class="pill-text header-text">Snippets</span>
                                </div>
                            </div>
                            
                            <!-- Pill 2: Default Screen -->
                            <div class="matrix-pill default-screen-pill">
                                <div class="pill-column label-column">
                                    <span class="pill-text setting-label">Default Screen</span>
                                </div>
                                <div class="pill-column control-column">
                                    <label class="control-wrapper ${this.defaultScreen === 'projects' ? 'selected' : ''}">
                                        <input type="radio" name="default-screen" value="projects" ${this.defaultScreen === 'projects' ? 'checked' : ''}>
                                        <div class="radio-button"></div>
                                    </label>
                                </div>
                                <div class="pill-column control-column">
                                    <label class="control-wrapper ${this.defaultScreen === 'snippets' ? 'selected' : ''}">
                                        <input type="radio" name="default-screen" value="snippets" ${this.defaultScreen === 'snippets' ? 'checked' : ''}>
                                        <div class="radio-button"></div>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Pill 3: Delete Warning -->
                            <div class="matrix-pill delete-warning-pill">
                                <div class="pill-column label-column">
                                    <span class="pill-text setting-label">Delete Warning</span>
                                </div>
                                <div class="pill-column control-column">
                                    <label class="control-wrapper ${this.deleteWarnings.projects ? 'selected' : ''}">
                                        <input type="checkbox" name="delete-warning-projects" ${this.deleteWarnings.projects ? 'checked' : ''}>
                                        <div class="checkbox-button"></div>
                                    </label>
                                </div>
                                <div class="pill-column control-column">
                                    <label class="control-wrapper ${this.deleteWarnings.snippets ? 'selected' : ''}">
                                        <input type="checkbox" name="delete-warning-snippets" ${this.deleteWarnings.snippets ? 'checked' : ''}>
                                        <div class="checkbox-button"></div>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Pill 4: Remember Last Selection -->
                            <div class="matrix-pill remember-section-pill">
                                <div class="pill-column label-column">
                                    <span class="pill-text setting-label">Remember Last Selection</span>
                                </div>
                                <div class="pill-column control-column">
                                    <label class="control-wrapper disabled" title="Always disabled for Projects view">
                                        <input type="checkbox" name="remember-section-projects" disabled>
                                        <div class="checkbox-button disabled"></div>
                                    </label>
                                </div>
                                <div class="pill-column control-column">
                                    <label class="control-wrapper ${this.rememberLastSelection ? 'selected' : ''}">
                                        <input type="checkbox" name="remember-section-snippets" ${this.rememberLastSelection ? 'checked' : ''}>
                                        <div class="checkbox-button"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Management Section -->
                    <div class="setting-section">
                        <h3>
                            <img src="icons/export.svg" alt="Export" class="settings-icon">
                            Data Management
                        </h3>
                        <div class="setting-actions">
                            <div class="import-export-row">
                                <button class="btn-secondary" id="export-data-btn">
                                    <svg class="settings-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15.5907 8.00003L13.005 5.41428V15.0001C13.005 15.5523 12.5573 16.0001 12.005 16.0001C11.4527 16.0001 11.005 15.5523 11.005 15.0001L11.005 5.41428L8.41917 8.00009C8.02865 8.39062 7.39548 8.39062 7.00496 8.00009C6.95614 7.95128 6.91343 7.89867 6.87682 7.84322C6.62054 7.45507 6.66325 6.92759 7.00496 6.58588L11.2979 2.29295C11.4854 2.10542 11.7398 2.00006 12.005 2.00006C12.2702 2.00006 12.5246 2.10542 12.7121 2.29295L17.005 6.58582C17.3955 6.97634 17.3955 7.60951 17.005 8.00003C16.6144 8.39056 15.9813 8.39056 15.5907 8.00003Z" fill="currentColor"/>
                                        <path d="M4.00488 14.0001C4.55717 14.0001 5.00488 14.4478 5.00488 15.0001V19.0001L19.0049 19.0001V15.0001C19.0049 14.4478 19.4526 14.0001 20.0049 14.0001C20.5572 14.0001 21.0049 14.4478 21.0049 15.0001V19.0001C21.0049 20.1047 20.1095 21.0001 19.0049 21.0001H5.00488C3.90031 21.0001 3.00488 20.1047 3.00488 19.0001V15.0001C3.00488 14.4478 3.4526 14.0001 4.00488 14.0001Z" fill="currentColor"/>
                                    </svg>
                                    Export Data
                                </button>
                                <button class="btn-secondary" id="import-data-btn">
                                    <svg class="settings-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15.5907 10.0001L13.005 12.5858V3.00006C13.005 2.96554 13.0032 2.93143 12.9998 2.89782C12.9486 2.39356 12.5227 2.00006 12.005 2.00006C11.4527 2.00006 11.005 2.44778 11.005 3.00006V12.5858L8.41917 10C8.02865 9.60951 7.39548 9.60951 7.00496 10C6.61443 10.3906 6.61443 11.0237 7.00496 11.4143L11.2979 15.7072C11.4854 15.8947 11.7398 16.0001 12.005 16.0001C12.2702 16.0001 12.5245 15.8947 12.7121 15.7072L17.005 11.4143C17.0538 11.3655 17.0965 11.3129 17.1331 11.2574C17.3894 10.8693 17.3467 10.3418 17.005 10.0001C16.6144 9.60955 15.9813 9.60955 15.5907 10.0001Z" fill="currentColor"/>
                                        <path d="M4.00488 14.0001C4.55717 14.0001 5.00488 14.4478 5.00488 15.0001V19.0001H19.0049V15.0001C19.0049 14.4478 19.4526 14.0001 20.0049 14.0001C20.5572 14.0001 21.0049 14.4478 21.0049 15.0001V19.0001C21.0049 20.1047 20.1095 21.0001 19.0049 21.0001H5.00488C3.90031 21.0001 3.00488 20.1047 3.00488 19.0001V15.0001C3.00488 14.4478 3.4526 14.0001 4.00488 14.0001Z" fill="currentColor"/>
                                    </svg>
                                    Import Data
                                </button>
                            </div>
                            <button class="btn-danger" id="reset-data-btn">
                                <svg class="settings-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 9.99998C10.5523 9.99998 11 10.4477 11 11V16C11 16.5523 10.5523 17 10 17C9.44772 17 9 16.5523 9 16V11C9 10.4477 9.44772 9.99998 10 9.99998Z" fill="currentColor"/>
                                    <path d="M14 9.99998C14.5523 9.99998 15 10.4477 15 11V16C15 16.5523 14.5523 17 14 17C13.4477 17 13 16.5523 13 16V11C13 10.4477 13.4477 9.99998 14 9.99998Z" fill="currentColor"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M9 0.999977C7.89543 0.999977 7 1.89541 7 2.99998V4.99998H3C2.44772 4.99998 2 5.44769 2 5.99998C2 6.55226 2.44772 6.99998 3 6.99998H4.11765L4.88926 20.1174C4.95145 21.1746 5.82686 22 6.88581 22H17.1142C18.1731 22 19.0486 21.1746 19.1107 20.1174L19.8824 6.99998H21C21.5523 6.99998 22 6.55226 22 5.99998C22 5.44769 21.5523 4.99998 21 4.99998H17V2.99998C17 1.89541 16.1046 0.999977 15 0.999977H9ZM6.12111 6.99998L6.88581 20H17.1142L17.8789 6.99998H6.12111ZM9 2.99998H15V4.99998H9V2.99998Z" fill="currentColor"/>
                                </svg>
                                Reset All Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        
        mainContent.insertAdjacentHTML('beforeend', settingsHTML);
        
        // Add event listeners for settings
        const settingsBackBtn = document.getElementById('settings-back-btn');
        if (settingsBackBtn) {
            settingsBackBtn.addEventListener('click', () => {
                this.showHomeView();
            });
        }

        const exportDataBtn = document.getElementById('export-data-btn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
        
        const importDataBtn = document.getElementById('import-data-btn');
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                this.importData();
            });
        }
        
        const resetDataBtn = document.getElementById('reset-data-btn');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => {
                const projectCount = this.projects.length;
                const totalSnippets = this.projects.reduce((total, project) => total + project.snippets.length, 0);
                this.showConfirmModal(
                    'Reset All Data',
                    '',
                    'Reset',
                    () => {
                        this.resetAllData();
                    },
                    {
                        projectCount: projectCount,
                        totalSnippets: totalSnippets
                    }
                );
            });
        }

        const resetGlobalCountBtn = document.getElementById('reset-global-count-btn');
        if (resetGlobalCountBtn) {
            resetGlobalCountBtn.addEventListener('click', (e) => {
                this.showConfirmModal(
                    'Reset Global Copy Count',
                    `Reset the total copy count (${this.totalCopyCount}) back to zero?`,
                    'Reset',
                    () => {
                        this.resetGlobalCopyCount();
                    }
                );
            });
        }
        
        // Settings event listeners moved to setupSettingsEventListeners() 
        // to be called after render when elements exist
        
        // Update global copy count display
        this.updateGlobalCopyCountDisplay();
    }

    // Show visual feedback for settings changes
    showSettingFeedback(message) {
        // Create or get existing feedback element
        let feedback = document.getElementById('settings-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'settings-feedback';
            feedback.className = 'settings-feedback';
            document.body.appendChild(feedback);
        }

        feedback.textContent = message;
        feedback.classList.add('show');

        // Auto-hide after 2.5 seconds
        clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => {
            feedback.classList.remove('show');
        }, 2500);
    }

    // Setup settings-specific event listeners after render
    setupSettingsEventListeners() {
        // Remove existing listeners to prevent duplicates
        this.removeSettingsEventListeners();
        
        // Initialize the event listeners array
        this.settingsEventListeners = [];
        
        // Setup each pill functionality independently
        this.setupDefaultScreenPill();
        this.setupDeleteWarningsPill();
        this.setupRememberLastSelectionPill();
        
        // Setup preferences info tooltip positioning
        this.setupPreferencesInfoTooltip();
        
        // Initialize preference highlighting
        this.updatePreferenceHighlighting();
    }

    // Pill 1: Default Screen functionality
    setupDefaultScreenPill() {
        const pillElement = document.querySelector('.default-screen-pill');
        if (!pillElement) return;

        const radioInputs = pillElement.querySelectorAll('input[name="default-screen"]');
        const wrappers = pillElement.querySelectorAll('.control-wrapper');

        // Handle radio button changes
        radioInputs.forEach(radio => {
            const changeHandler = (e) => {
                if (e.target.checked) {
                    this.setDefaultScreen(e.target.value);
                    this.updateDefaultScreenHighlighting();
                    this.showSettingFeedback('Default screen updated');
                }
            };
            radio.addEventListener('change', changeHandler);
            this.settingsEventListeners.push({ element: radio, event: 'change', handler: changeHandler });
        });

        // Handle wrapper clicks for better UX
        wrappers.forEach((wrapper, index) => {
            const radio = wrapper.querySelector('input[name="default-screen"]');
            if (radio && !radio.disabled) {
                const clickHandler = () => {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                };
                wrapper.addEventListener('click', clickHandler);
                this.settingsEventListeners.push({ element: wrapper, event: 'click', handler: clickHandler });
            }
        });
    }

    // Pill 2: Delete Warnings functionality
    setupDeleteWarningsPill() {
        const pillElement = document.querySelector('.delete-warning-pill');
        if (!pillElement) {
            console.warn('Delete warning pill element not found');
            return;
        }

        const checkboxInputs = pillElement.querySelectorAll('input[type="checkbox"]');
        const wrappers = pillElement.querySelectorAll('.control-wrapper');

        // Handle checkbox changes - simplified to avoid conflicts
        checkboxInputs.forEach((checkbox, index) => {
            const changeHandler = (e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('Delete warning checkbox changed:', e.target.name, 'from', !e.target.checked, 'to', e.target.checked);
                
                // Update the data model
                this.updateDeleteWarnings(e.target.name, e.target.checked);
                
                // Update visual highlighting (but avoid checkbox conflicts)
                this.updateDeleteWarningsHighlighting();
                
                // Show user feedback
                const warningType = e.target.name.includes('projects') ? 'Projects' : 'Snippets';
                const status = e.target.checked ? 'enabled' : 'disabled';
                this.showSettingFeedback(`${warningType} delete warnings ${status}`);
                
                console.log('Updated deleteWarnings state:', this.deleteWarnings);
            };

            checkbox.addEventListener('change', changeHandler);
            this.settingsEventListeners.push({ element: checkbox, event: 'change', handler: changeHandler });
        });

        // Handle wrapper clicks for better UX - but avoid double-firing
        wrappers.forEach((wrapper, index) => {
            const checkbox = wrapper.querySelector('input[type="checkbox"]');
            if (checkbox && !checkbox.disabled) {
                const wrapperClickHandler = (e) => {
                    // CRITICAL: Only handle clicks NOT on the invisible checkbox input
                    // The invisible checkbox covers the wrapper, so we check if the target is the checkbox itself
                    if (e.target === checkbox) {
                        // User clicked on invisible checkbox - let it handle natively, don't interfere
                        return;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Toggle the checkbox state
                    checkbox.checked = !checkbox.checked;
                    
                    // Trigger the change event which will handle the rest
                    checkbox.dispatchEvent(new Event('change', { bubbles: false }));
                };
                wrapper.addEventListener('click', wrapperClickHandler);
                this.settingsEventListeners.push({ element: wrapper, event: 'click', handler: wrapperClickHandler });
            }
        });
    }

    // Pill 3: Remember Last Selection functionality
    setupRememberLastSelectionPill() {
        const pillElement = document.querySelector('.remember-section-pill');
        if (!pillElement) {
            console.warn('Remember Last Selection pill element not found');
            return;
        }

        const snippetsCheckbox = pillElement.querySelector('input[name="remember-section-snippets"]');
        const snippetsWrapper = pillElement.querySelectorAll('.control-wrapper')[1]; // Second wrapper (snippets)

        if (snippetsCheckbox && snippetsWrapper) {
            // Handle checkbox change - using same pattern as Delete Warning checkboxes
            const changeHandler = (e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('Remember Last Selection checkbox changed:', e.target.name, 'from', !e.target.checked, 'to', e.target.checked);
                
                // Update the data model (independent of Default Screen setting)
                this.updateRememberLastSelection(e.target.checked);
                
                // Update visual highlighting
                this.updateRememberLastSelectionHighlighting();
                
                // Show user feedback
                const status = e.target.checked ? 'enabled' : 'disabled';
                this.showSettingFeedback(`Remember selection ${status}`);
                
                console.log('Updated rememberLastSelection state:', this.rememberLastSelection);
            };
            
            snippetsCheckbox.addEventListener('change', changeHandler);
            this.settingsEventListeners.push({ element: snippetsCheckbox, event: 'change', handler: changeHandler });

            // Handle wrapper clicks for better UX - but avoid double-firing
            const wrapperClickHandler = (e) => {
                // CRITICAL: Only handle clicks NOT on the invisible checkbox input
                if (e.target === snippetsCheckbox) {
                    // User clicked on invisible checkbox - let it handle natively, don't interfere
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                // Only proceed if checkbox is not disabled
                if (!snippetsCheckbox.disabled) {
                    // Toggle the checkbox state
                    snippetsCheckbox.checked = !snippetsCheckbox.checked;
                    
                    // Trigger the change event which will handle the rest
                    snippetsCheckbox.dispatchEvent(new Event('change', { bubbles: false }));
                }
            };
            snippetsWrapper.addEventListener('click', wrapperClickHandler);
            this.settingsEventListeners.push({ element: snippetsWrapper, event: 'click', handler: wrapperClickHandler });
        }
    }

    // Setup preferences info tooltip - simplified CSS-based approach
    setupPreferencesInfoTooltip() {
        const infoIcon = document.getElementById('preferences-info-icon');
        const tooltip = document.querySelector('.preferences-info-popup');
        
        if (!infoIcon || !tooltip) {
            console.warn('Info icon or tooltip not found');
            return;
        }
        
        console.log('Preferences info tooltip setup completed - using CSS hover');
        
        // No JavaScript positioning needed - CSS handles the hover behavior
        // Just add some optional event listeners for debugging
        const showTooltip = () => {
            console.log('Tooltip should be visible via CSS hover');
        };
        
        const hideTooltip = () => {
            console.log('Tooltip should be hidden via CSS hover');
        };
        
        // Optional event listeners for debugging
        infoIcon.addEventListener('mouseenter', showTooltip);
        infoIcon.addEventListener('mouseleave', hideTooltip);
        
        // Store listeners for cleanup
        this.settingsEventListeners.push({ element: infoIcon, event: 'mouseenter', handler: showTooltip });
        this.settingsEventListeners.push({ element: infoIcon, event: 'mouseleave', handler: hideTooltip });
    }

    // Remove settings event listeners to prevent duplicates
    removeSettingsEventListeners() {
        // Store references to bound functions to properly remove them
        if (this.settingsEventListeners) {
            this.settingsEventListeners.forEach(({ element, event, handler }) => {
                if (element) {
                    element.removeEventListener(event, handler);
                }
            });
        }
        this.settingsEventListeners = [];
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = theme + '-theme';
        chrome.storage.sync.set({ fastcopy_theme: theme });
    }
    
    setDefaultScreen(screenType) {
        const previousScreen = this.defaultScreen;
        this.defaultScreen = screenType;
        this.storage.saveData();
        
        // Settings update feedback removed (toast functionality removed)
    }

    // Silent version without showing toast (for undo functionality)
    setDefaultScreenSilent(screenType) {
        this.defaultScreen = screenType;
        this.storage.saveData();
    }

    updateDeleteWarnings(type, enabled) {
        const warningType = type.replace('delete-warning-', '');
        const previousValue = this.deleteWarnings[warningType];
        this.deleteWarnings[warningType] = enabled;
        this.storage.saveData();
        
        // Settings update feedback removed (toast functionality removed)
    }

    // Silent version without showing toast (for undo functionality)
    updateDeleteWarningsSilent(type, enabled) {
        const warningType = type.replace('delete-warning-', '');
        this.deleteWarnings[warningType] = enabled;
        this.storage.saveData();
    }

    updateRememberLastSelection(enabled) {
        this.rememberLastSelection = enabled;
        this.storage.saveData();
        
        // If disabled, clear the last opened project
        if (!enabled) {
            this.lastOpenedProjectId = null;
            this.storage.saveData();
        }
    }

    // Update all preference highlighting
    updatePreferenceHighlighting() {
        this.updateDefaultScreenHighlighting();
        this.updateDeleteWarningsHighlighting();
        this.updateRememberLastSelectionHighlighting();
    }

    // Update Default Screen pill highlighting
    updateDefaultScreenHighlighting() {
        const pillElement = document.querySelector('.default-screen-pill');
        if (!pillElement) return;

        const wrappers = pillElement.querySelectorAll('.control-wrapper');
        wrappers.forEach((wrapper, index) => {
            const value = index === 0 ? 'projects' : 'snippets';
            const radio = wrapper.querySelector('input[name="default-screen"]');
            
            if (this.defaultScreen === value) {
                wrapper.classList.add('selected');
                if (radio) radio.checked = true;
            } else {
                wrapper.classList.remove('selected');
                if (radio) radio.checked = false;
            }
        });
    }

    // Update Delete Warnings pill highlighting
    updateDeleteWarningsHighlighting() {
        const pillElement = document.querySelector('.delete-warning-pill');
        if (!pillElement) return;

        const wrappers = pillElement.querySelectorAll('.control-wrapper');
        const projectsWrapper = wrappers[0];
        const snippetsWrapper = wrappers[1];
        
        // Update projects wrapper - only update visual state, not checkbox state
        if (projectsWrapper) {
            const checkbox = projectsWrapper.querySelector('input[name="delete-warning-projects"]');
            if (this.deleteWarnings.projects) {
                projectsWrapper.classList.add('selected');
                // Only set checkbox if it's not already correct (avoid interference)
                if (checkbox && checkbox.checked !== true) {
                    checkbox.checked = true;
                }
            } else {
                projectsWrapper.classList.remove('selected');
                // Only set checkbox if it's not already correct (avoid interference)
                if (checkbox && checkbox.checked !== false) {
                    checkbox.checked = false;
                }
            }
        }
        
        // Update snippets wrapper - only update visual state, not checkbox state
        if (snippetsWrapper) {
            const checkbox = snippetsWrapper.querySelector('input[name="delete-warning-snippets"]');
            if (this.deleteWarnings.snippets) {
                snippetsWrapper.classList.add('selected');
                // Only set checkbox if it's not already correct (avoid interference)
                if (checkbox && checkbox.checked !== true) {
                    checkbox.checked = true;
                }
            } else {
                snippetsWrapper.classList.remove('selected');
                // Only set checkbox if it's not already correct (avoid interference)
                if (checkbox && checkbox.checked !== false) {
                    checkbox.checked = false;
                }
            }
        }
    }

    // Update Remember Last Selection pill highlighting
    updateRememberLastSelectionHighlighting() {
        const pillElement = document.querySelector('.remember-section-pill');
        if (!pillElement) return;

        const wrappers = pillElement.querySelectorAll('.control-wrapper');
        const projectsWrapper = wrappers[0]; // Always disabled
        const snippetsWrapper = wrappers[1]; // Always enabled
        
        // Projects wrapper is always disabled
        if (projectsWrapper) {
            projectsWrapper.classList.add('disabled');
            projectsWrapper.classList.remove('selected');
            const checkbox = projectsWrapper.querySelector('input[name="remember-section-projects"]');
            if (checkbox) {
                checkbox.disabled = true;
                checkbox.checked = false;
            }
        }
        
        // Snippets wrapper: always enabled, independent of default screen
        if (snippetsWrapper) {
            const checkbox = snippetsWrapper.querySelector('input[name="remember-section-snippets"]');
            const checkboxButton = snippetsWrapper.querySelector('.checkbox-button');
            
            // Always enable the control (independent of Default Screen setting)
            snippetsWrapper.classList.remove('disabled');
            snippetsWrapper.title = '';
            if (checkbox) checkbox.disabled = false;
            if (checkboxButton) checkboxButton.classList.remove('disabled');
            
            // Update selection state based on rememberLastSelection - only update when necessary
            if (this.rememberLastSelection) {
                snippetsWrapper.classList.add('selected');
                // Only set checkbox if it's not already correct (avoid interference during user interaction)
                if (checkbox && checkbox.checked !== true) {
                    checkbox.checked = true;
                }
            } else {
                snippetsWrapper.classList.remove('selected');
                // Only set checkbox if it's not already correct (avoid interference during user interaction)
                if (checkbox && checkbox.checked !== false) {
                    checkbox.checked = false;
                }
            }
        }
    }
    
    exportData() {
        const data = {
            projects: this.projects,
            theme: this.currentTheme,
            defaultScreen: this.defaultScreen,
            exported: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lightningcopy-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Export success feedback removed (toast functionality removed)
    }
    
    importData() {
        // Set import flag to prevent popup from closing
        this.isImporting = true;
        
        // Create a hidden file input in the document
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        // Add the input to the document
        document.body.appendChild(input);
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.projects) {
                            this.projects = data.projects;
                            if (data.theme) {
                                this.currentTheme = data.theme;
                            }
                            if (data.defaultScreen) {
                                this.defaultScreen = data.defaultScreen;
                            }
                            this.storage.saveData();
                            this.applyTheme(); // Apply theme immediately after import
                            this.render();
                            
                            // Show success message without alert (which can cause popup to close)
                            this.showImportSuccess();
                        } else {
                            this.showImportError('Invalid backup file format.');
                        }
                    } catch (error) {
                        this.showImportError('Error importing data: ' + error.message);
                    }
                    
                    // Clean up the input element and reset import flag
                    document.body.removeChild(input);
                    this.isImporting = false;
                };
                reader.readAsText(file);
            } else {
                // Clean up if no file was selected and reset import flag
                document.body.removeChild(input);
                this.isImporting = false;
            }
        };
        
        // Trigger the file picker
        input.click();
        
        // Safety timeout to reset import flag if something goes wrong
        setTimeout(() => {
            if (this.isImporting) {
                this.isImporting = false;
                console.warn('Import timeout reached, resetting import flag');
            }
        }, 30000); // 30 second timeout
    }
    
    showImportSuccess() {
        // Calculate imported data stats
        const projectCount = this.projects.length;
        const totalSnippets = this.projects.reduce((total, project) => total + project.snippets.length, 0);
        
        // Import success feedback removed (toast functionality removed)
    }
    
    showImportError(message) {
        // Import error feedback removed (toast functionality removed)
    }
    
    resetAllData() {
        const projectCount = this.projects.length;
        const totalSnippets = this.projects.reduce((total, project) => total + project.snippets.length, 0);
        
        this.projects = [];
        this.storage.saveData();
        
        // Reset creator card dismiss preference so it appears again for new users
        localStorage.removeItem('lightning-copy-creator-card-dismissed');
        sessionStorage.removeItem('lightning-copy-creator-card-shown');
        
        // Navigate back to home view after reset
        this.showHomeView();
        
        // Data reset feedback removed (toast functionality removed)
    }


}

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
    try {
        const extension = new FastCopyExtension();
        extension.init();
    } catch (error) {
        // Failed to initialize extension
    }
});