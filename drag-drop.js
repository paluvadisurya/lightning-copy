// Lightning Copy - Drag & Drop Manager
// Handles smooth, intuitive drag-and-drop reordering for tiles

class DragDropManager {
    constructor(extensionInstance) {
        this.extension = extensionInstance;
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedData = null;
        this.dragType = null; // 'project' or 'snippet'
        this.dropIndicator = null;
        this.dropGap = null;
        this.initialPointer = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.currentDropZone = null;
        this.currentDropIndex = -1;
        this.boundEvents = new Map();
        
        // Animation frame for smooth updates
        this.animationFrame = null;
        
        // Threshold for starting drag (prevents accidental drags)
        this.dragThreshold = 3;
        this.dragStarted = false;
        this.clickPrevented = false;
        
        // Animation frame IDs for smooth updates
        this.rafId = null;
        this.dropAnimationId = null;
        
        this.init();
    }

    init() {
        this.createDropIndicators();
        this.setupGlobalEventListeners();
    }

    // No drop indicators needed - pure tile interaction
    createDropIndicators() {
        // Remove drop indicators completely for clean experience
    }

    // Setup global event listeners
    setupGlobalEventListeners() {
        // Use bound functions to ensure proper cleanup
        this.boundPointerMove = this.handlePointerMove.bind(this);
        this.boundPointerUp = this.handlePointerUp.bind(this);
        this.boundKeyDown = this.handleKeyDown.bind(this);
        
        document.addEventListener('keydown', this.boundKeyDown);
    }

    // Enable drag and drop for a container
    enableDragDrop(containerSelector, itemSelector, type) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const items = container.querySelectorAll(itemSelector);
        items.forEach(item => {
            this.makeDraggable(item, type);
        });
    }

    // Make an element draggable
    makeDraggable(element, type) {
        element.classList.add('draggable', 'drop-target');
        element.setAttribute('draggable', 'false'); // Disable native drag to use custom
        
        // Store the drag type on the element
        element.dataset.dragType = type;
        
        // Remove any existing listeners to prevent duplicates
        this.removeElementListeners(element);
        
        // Add pointer events - only pointerdown, let normal clicks work
        const pointerDown = this.handlePointerDown.bind(this, element, type);
        element.addEventListener('pointerdown', pointerDown);
        
        // Store bound events for cleanup
        this.boundEvents.set(element, { pointerDown });
    }

    // Remove event listeners from an element
    removeElementListeners(element) {
        const events = this.boundEvents.get(element);
        if (events) {
            element.removeEventListener('pointerdown', events.pointerDown);
            this.boundEvents.delete(element);
        }
    }

    // Handle pointer down (potential drag start)
    handlePointerDown(element, type, event) {
        // Ignore if clicking on action buttons
        if (event.target.closest('.project-card-actions') || 
            event.target.closest('.snippet-card-actions')) {
            return;
        }

        // Store event info but don't prevent clicks yet
        this.initialPointer = { x: event.clientX, y: event.clientY };
        this.draggedElement = element;
        this.dragType = type;
        this.dragStarted = false;
        this.clickPrevented = false;
        
        // Get element data for reordering
        this.draggedData = this.getElementData(element, type);
        if (!this.draggedData) return;

        // Add global move and up listeners
        document.addEventListener('pointermove', this.boundPointerMove);
        document.addEventListener('pointerup', this.boundPointerUp);
        
        // Add class to indicate potential drag
        element.classList.add('drag-potential');
        
        // Set pointer capture for better tracking
        element.setPointerCapture(event.pointerId);
    }

    // Handle pointer move (drag in progress)
    handlePointerMove(event) {
        if (!this.draggedElement) return;

        const deltaX = event.clientX - this.initialPointer.x;
        const deltaY = event.clientY - this.initialPointer.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Check if we've moved enough to start dragging
        if (!this.dragStarted && distance > this.dragThreshold) {
            this.startDrag(event);
        }

        if (this.isDragging) {
            this.updateDrag(event);
        }
    }

    // Start the drag operation
    startDrag(event) {
        this.dragStarted = true;
        this.isDragging = true;
        this.clickPrevented = true;
        
        // Now prevent the click since we're actually dragging
        event.preventDefault();
        event.stopPropagation();
        
        const element = this.draggedElement;
        
        // Calculate initial offset
        const rect = element.getBoundingClientRect();
        this.offset = {
            x: this.initialPointer.x - rect.left,
            y: this.initialPointer.y - rect.top
        };

        // Create a visual copy for dragging
        this.createDragGhost(element);
        
        // Mark original element as ghost
        element.classList.remove('drag-potential');
        element.classList.add('drag-ghost');
        
        // Add drag start animation
        this.draggedElement.classList.add('drag-start');
        
        // Mark container as drag active
        const container = this.getContainer(this.dragType);
        if (container) {
            container.classList.add('drag-active');
        }

        // Position the dragged element
        this.updateDragPosition(event);
        
        // Prevent text selection during drag
        document.body.classList.add('no-select');
    }

    // Create visual copy of the element for dragging
    createDragGhost(originalElement) {
        const ghost = originalElement.cloneNode(true);
        
        // Remove any IDs to avoid duplicates
        ghost.removeAttribute('id');
        ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        
        // Apply dragging styles
        ghost.classList.remove('drag-potential', 'drag-ghost');
        ghost.classList.add('dragging');
        
        // Position the ghost
        const rect = originalElement.getBoundingClientRect();
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        
        // Add to document
        document.body.appendChild(ghost);
        this.draggedElement = ghost;
    }

    // Update drag position
    updateDrag(event) {
        this.updateDragPosition(event);
        this.updateDropIndicators(event);
    }

    // Update the position of the dragged element
    updateDragPosition(event) {
        if (!this.draggedElement.classList.contains('dragging')) return;
        
        const x = event.clientX - this.offset.x;
        const y = event.clientY - this.offset.y;
        
        this.draggedElement.style.left = x + 'px';
        this.draggedElement.style.top = y + 'px';
    }

    // Update drop indicators based on current position
    updateDropIndicators(event) {
        const container = this.getContainer(this.dragType);
        if (!container) return;

        const items = this.getDropTargets(container);
        const dropZone = this.findDropZone(event, items);
        
        // Compare drop zones more carefully
        const dropZoneChanged = this.hasDropZoneChanged(dropZone, this.currentDropZone);
        
        if (dropZoneChanged) {
            this.currentDropZone = dropZone;
            
            // Debounce tile shifting to prevent flicker
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            
            this.animationFrame = requestAnimationFrame(() => {
                this.animateTileShifting(dropZone, items);
                this.animationFrame = null;
            });
        }
    }
    
    // Check if drop zone has actually changed
    hasDropZoneChanged(newZone, oldZone) {
        if (!newZone && !oldZone) return false;
        if (!newZone || !oldZone) return true;
        
        return newZone.index !== oldZone.index || 
               newZone.position !== oldZone.position;
    }

    // Animate tiles like water displacement - smart batched updates
    animateTileShifting(dropZone, items) {
        if (!dropZone || dropZone.index === undefined) {
            // Reset all tiles when no drop zone
            items.forEach(item => {
                if (!item.classList.contains('drag-ghost')) {
                    this.resetTilePosition(item);
                }
            });
            return;
        }

        const originalGhostIndex = this.draggedData.index;
        
        // Calculate all transformations first - no DOM manipulation yet
        const transformations = new Map();
        
        items.forEach((item, itemIndex) => {
            // Skip the ghost element for positioning
            if (item.classList.contains('drag-ghost')) {
                return;
            }
            
            let shift = 0;
            const targetIndex = dropZone.index;
            const currentGhostIndex = originalGhostIndex;
            
            if (targetIndex < currentGhostIndex) {
                // Dragging upward - items in the target zone push down
                if (itemIndex >= targetIndex && itemIndex < currentGhostIndex) {
                    shift = 1; // Push down like water displacement
                }
            } else if (targetIndex > currentGhostIndex) {
                // Dragging downward - items between current and target move up
                const finalTargetIndex = targetIndex - 1;
                if (itemIndex > currentGhostIndex && itemIndex <= finalTargetIndex) {
                    shift = -1; // Move up to fill the gap left by dragged item
                }
            }
            
            transformations.set(item, shift);
        });
        
        // Apply all transformations in a single batch
        transformations.forEach((shift, item) => {
            if (shift !== 0) {
                // Only add transition class if item doesn't have it
                if (!item.classList.contains('tile-shifting')) {
                    item.classList.add('tile-shifting');
                }
                
                const rect = item.getBoundingClientRect();
                const itemHeight = rect.height + 16; // Include gap
                const translateY = shift * itemHeight;
                const newTransform = `translateY(${translateY}px)`;
                
                // Only update if transform actually changed
                if (item.style.transform !== newTransform) {
                    item.style.transform = newTransform;
                }
            } else {
                this.resetTilePosition(item);
            }
        });
    }
    
    // Smart tile position reset - avoid unnecessary style changes
    resetTilePosition(item) {
        // Only remove transform if it exists
        if (item.style.transform) {
            item.style.transform = '';
        }
        // Only remove class if it exists
        if (item.classList.contains('tile-shifting')) {
            item.classList.remove('tile-shifting');
        }
    }

    // Find the appropriate drop zone
    findDropZone(event, items) {
        const container = this.getContainer(this.dragType);
        const containerRect = container.getBoundingClientRect();
        
        // Expand the container bounds to allow dropping slightly outside
        const margin = 20;
        const expandedBounds = {
            left: containerRect.left - margin,
            right: containerRect.right + margin,
            top: containerRect.top - margin,
            bottom: containerRect.bottom + margin
        };
        
        // Check if we're within the expanded container area
        if (event.clientX < expandedBounds.left || event.clientX > expandedBounds.right ||
            event.clientY < expandedBounds.top || event.clientY > expandedBounds.bottom) {
            return null;
        }

        // Filter out ghost items for calculations
        const validItems = items.filter(item => !item.classList.contains('drag-ghost'));
        
        if (validItems.length === 0) {
            // No valid items (only ghost), drop at position 0
            this.currentDropIndex = 0;
            return {
                element: null,
                position: 'start',
                index: 0
            };
        }

        let closestItem = null;
        let closestDistance = Infinity;
        let insertPosition = 'after';

        validItems.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            const distance = Math.abs(event.clientY - centerY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestItem = item;
                insertPosition = event.clientY < centerY ? 'before' : 'after';
            }
        });

        if (closestItem) {
            // Use consistent indexing - always reference the full items array
            const originalIndex = Array.from(items).indexOf(closestItem);
            this.currentDropIndex = insertPosition === 'before' ? originalIndex : originalIndex + 1;
            
            return {
                element: closestItem,
                position: insertPosition,
                index: this.currentDropIndex
            };
        }

        // If mouse is below all items, drop at the end
        const lastValidItem = validItems[validItems.length - 1];
        if (lastValidItem) {
            const lastRect = lastValidItem.getBoundingClientRect();
            if (event.clientY > lastRect.bottom) {
                // Use full items array length for consistent indexing
                this.currentDropIndex = items.length;
                return {
                    element: null,
                    position: 'end',
                    index: this.currentDropIndex
                };
            }
        }

        // Default to end position
        this.currentDropIndex = items.length;
        return {
            element: null,
            position: 'end',
            index: this.currentDropIndex
        };
    }

    // No drop indicators needed - clean tile interaction only
    showDropIndicator(dropZone) {
        // Removed for clean experience
    }

    // Reset tile positions only
    hideDropIndicators() {
        const container = this.getContainer(this.dragType);
        if (container) {
            const items = this.getDropTargets(container);
            items.forEach(item => {
                this.resetTilePosition(item);
            });
        }
    }

    // Handle pointer up (drag end)
    handlePointerUp(event) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('drag-potential');
            
            if (this.isDragging) {
                // Prevent any click events from firing after drag
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                this.completeDrag(event);
                
                // Strong click prevention for drag operations
                this.preventClicksTemporarily();
            } else {
                // Was just a click, handle normally - don't prevent
                this.handleClick(event);
            }
        }

        this.cleanup();
    }

    // Temporarily prevent clicks after drag operations
    preventClicksTemporarily() {
        this.clickPrevented = true;
        
        // Add a global click catcher to intercept any clicks
        const clickCatcher = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        };
        
        document.addEventListener('click', clickCatcher, true);
        
        setTimeout(() => {
            this.clickPrevented = false;
            document.removeEventListener('click', clickCatcher, true);
        }, 150); // Strong prevention window
    }

    // Complete the drag operation
    completeDrag(event) {
        const originalElement = this.getOriginalElement();
        const dropSuccessful = this.executeReorder();

        if (dropSuccessful) {
            // Animate the dragged element to its final position
            this.animateDropComplete(originalElement);
        } else {
            // Animate back to original position
            this.animateDropCancel(originalElement);
        }

        this.hideDropIndicators();
    }

    // Execute the reordering logic
    executeReorder() {
        if (this.currentDropIndex === -1 || !this.draggedData) {
            return false;
        }

        const currentIndex = this.draggedData.index;
        let newIndex = this.currentDropIndex;

        // Adjust index if moving item down
        if (newIndex > currentIndex) {
            newIndex--;
        }

        // Don't move if it's the same position
        if (newIndex === currentIndex) {
            return false;
        }

        // Update the data model
        if (this.dragType === 'project') {
            this.reorderProjects(currentIndex, newIndex);
        } else if (this.dragType === 'snippet') {
            this.reorderSnippets(currentIndex, newIndex);
        }

        return true;
    }

    // Reorder projects in the data model
    reorderProjects(fromIndex, toIndex) {
        const projects = this.extension.projects;
        const projectToMove = projects[fromIndex];
        
        // Remove from current position
        projects.splice(fromIndex, 1);
        
        // Insert at new position
        projects.splice(toIndex, 0, projectToMove);
        
        // Save and re-render
        this.extension.storage.saveData();
        this.extension.render();
    }

    // Reorder snippets in the data model
    reorderSnippets(fromIndex, toIndex) {
        if (!this.extension.currentProject) return;
        
        const snippets = this.extension.currentProject.snippets;
        const snippetToMove = snippets[fromIndex];
        
        // Remove from current position
        snippets.splice(fromIndex, 1);
        
        // Insert at new position
        snippets.splice(toIndex, 0, snippetToMove);
        
        // Update project timestamp
        this.extension.currentProject.updatedAt = new Date().toISOString();
        
        // Save and re-render
        this.extension.storage.saveData();
        this.extension.renderProject();
    }

    // Animate successful drop
    animateDropComplete(originalElement) {
        const draggedEl = this.draggedElement;
        
        if (originalElement && draggedEl.classList.contains('dragging')) {
            const targetRect = originalElement.getBoundingClientRect();
            
            // Animate to final position
            draggedEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            draggedEl.style.left = targetRect.left + 'px';
            draggedEl.style.top = targetRect.top + 'px';
            draggedEl.style.transform = 'scale(1) rotate(0deg)';
            draggedEl.style.opacity = '1';
            
            setTimeout(() => {
                // Add completion animation to original element
                if (originalElement) {
                    originalElement.classList.add('drop-complete');
                    setTimeout(() => {
                        originalElement.classList.remove('drop-complete');
                    }, 400);
                }
                
                // Remove dragged element
                if (draggedEl.parentNode) {
                    draggedEl.parentNode.removeChild(draggedEl);
                }
            }, 300);
        }
    }

    // Animate cancelled drop
    animateDropCancel(originalElement) {
        const draggedEl = this.draggedElement;
        
        if (originalElement && draggedEl.classList.contains('dragging')) {
            const originalRect = originalElement.getBoundingClientRect();
            
            // Animate back to original position
            draggedEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            draggedEl.style.left = originalRect.left + 'px';
            draggedEl.style.top = originalRect.top + 'px';
            draggedEl.style.transform = 'scale(1) rotate(0deg)';
            draggedEl.style.opacity = '0.8';
            
            setTimeout(() => {
                if (draggedEl.parentNode) {
                    draggedEl.parentNode.removeChild(draggedEl);
                }
            }, 300);
        }
    }

    // Handle click when drag threshold wasn't met
    handleClick(event) {
        // If we didn't drag, allow normal click behavior
        // This will naturally work since we don't prevent events unless dragging
    }

    // Handle keyboard events
    handleKeyDown(event) {
        if (this.isDragging && event.key === 'Escape') {
            event.preventDefault();
            this.cancelDrag();
        }
    }

    // Cancel the current drag operation
    cancelDrag() {
        if (this.isDragging) {
            const originalElement = this.getOriginalElement();
            this.animateDropCancel(originalElement);
            this.hideDropIndicators();
        }
        this.cleanup();
    }

    // Get element data for reordering
    getElementData(element, type) {
        if (type === 'project') {
            const projectId = element.dataset.projectId;
            const index = Array.from(element.parentNode.children).indexOf(element);
            return { id: projectId, index, type: 'project' };
        } else if (type === 'snippet') {
            const snippetId = element.dataset.snippetId;
            const index = Array.from(element.parentNode.children).indexOf(element);
            return { id: snippetId, index, type: 'snippet' };
        }
        return null;
    }

    // Get the appropriate container for the drag type
    getContainer(type) {
        if (type === 'project') {
            return document.querySelector('.projects-grid');
        } else if (type === 'snippet') {
            return document.querySelector('.snippets-container');
        }
        return null;
    }

    // Get drop target elements
    getDropTargets(container) {
        const selector = this.dragType === 'project' ? '.project-card' : '.snippet-card';
        return Array.from(container.querySelectorAll(selector));
    }

    // Get the original element (ghost element)
    getOriginalElement() {
        const container = this.getContainer(this.dragType);
        if (!container || !this.draggedData) return null;
        
        const selector = this.dragType === 'project' 
            ? `[data-project-id="${this.draggedData.id}"]`
            : `[data-snippet-id="${this.draggedData.id}"]`;
        
        return container.querySelector(selector + '.drag-ghost');
    }

    // Cleanup after drag operation
    cleanup() {
        // Cancel pending animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Remove global event listeners
        document.removeEventListener('pointermove', this.boundPointerMove);
        document.removeEventListener('pointerup', this.boundPointerUp);
        
        // Remove drag classes
        document.body.classList.remove('no-select');
        
        // Remove container active state
        const container = this.getContainer(this.dragType);
        if (container) {
            container.classList.remove('drag-active');
            
            // Reset all tile positions using smart reset
            const items = this.getDropTargets(container);
            items.forEach(item => {
                this.resetTilePosition(item);
            });
        }
        
        // Clean up ghost element
        const originalElement = this.getOriginalElement();
        if (originalElement) {
            originalElement.classList.remove('drag-ghost', 'drag-start');
        }
        
        // Remove dragged element if it still exists
        if (this.draggedElement && this.draggedElement.classList.contains('dragging')) {
            if (this.draggedElement.parentNode) {
                this.draggedElement.parentNode.removeChild(this.draggedElement);
            }
        }
        
        // Hide drop indicators
        this.hideDropIndicators();
        
        // Reset state
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedData = null;
        this.dragType = null;
        this.currentDropZone = null;
        this.currentDropIndex = -1;
        this.dragStarted = false;
        this.clickPrevented = false;
        
        // Cancel any ongoing animations
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.dropAnimationId) {
            cancelAnimationFrame(this.dropAnimationId);
            this.dropAnimationId = null;
        }
    }

    // Initialize drag and drop for current view
    initializeCurrentView() {
        // Enable for projects if in home view
        if (!this.extension.currentProject) {
            this.enableDragDrop('.projects-grid', '.project-card', 'project');
        } 
        // Enable for snippets if in project view
        else {
            this.enableDragDrop('.snippets-container', '.snippet-card', 'snippet');
        }
    }

    // Cleanup when switching views
    cleanupCurrentView() {
        // Remove all element listeners
        this.boundEvents.forEach((events, element) => {
            this.removeElementListeners(element);
        });
        this.boundEvents.clear();
        
        // Cancel any active drag
        if (this.isDragging) {
            this.cancelDrag();
        }
    }

    // Public method to refresh drag and drop after DOM updates
    refresh() {
        this.cleanupCurrentView();
        this.initializeCurrentView();
    }

    // Destroy the drag and drop manager
    destroy() {
        this.cleanupCurrentView();
        document.removeEventListener('keydown', this.boundKeyDown);
        
        // Remove drop indicators from DOM
        if (this.dropIndicator.parentNode) {
            this.dropIndicator.parentNode.removeChild(this.dropIndicator);
        }
        if (this.dropGap.parentNode) {
            this.dropGap.parentNode.removeChild(this.dropGap);
        }
    }
}

// Export for use in main extension
window.DragDropManager = DragDropManager; 