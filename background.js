chrome.runtime.onInstalled.addListener(function () {
    // Initialize storage
    chrome.storage.sync.get(['groups', 'papers'], function (result) {
        if (!result.groups) {
            chrome.storage.sync.set({ groups: [] });
        }

        if (!result.papers) {
            chrome.storage.sync.set({ papers: [] });
        }
    });
});