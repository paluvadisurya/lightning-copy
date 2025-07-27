// FastCopy Extension - Background Service Worker

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        
        // Set default data
        chrome.storage.sync.set({
            fastcopy_projects: [],
            fastcopy_theme: 'light'
        });
        
        // Open options page on first install (will redirect to popup settings)
        // chrome.tabs.create({
        //     url: chrome.runtime.getURL('options.html')
        // });
    }
    
    // Create context menu on install/update
    try {
        chrome.contextMenus.create({
            id: 'fastcopy-open',
            title: 'Open LightningCopy Extension',
            contexts: ['all']
        });
            } catch (error) {
            // Context menus not available
        }
});

if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'fastcopy-open') {
            chrome.action.openPopup();
        }
    });
}

// Keyboard shortcuts removed - not needed since extension uses popup

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
    }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
    chrome.action.openPopup();
}); 