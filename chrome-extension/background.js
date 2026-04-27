// ResumeForge background service worker
// Kept minimal — the popup owns the UI and API logic.

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["rf_backend"], (data) => {
        if (!data.rf_backend) {
            chrome.storage.local.set({
                rf_backend: "https://instant-cover-gen.preview.emergentagent.com",
                rf_dashboard: "https://instant-cover-gen.preview.emergentagent.com",
            });
        }
    });
});

// Optional: message passing between popup/content scripts could live here later.
