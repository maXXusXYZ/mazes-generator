const STORAGE_KEY = 'mazeGenerator.settings';

export function loadSettings() {
    "use strict";
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    } catch (err) {
        return {};
    }
}

export function saveSettings(settings) {
    "use strict";
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
        // localStorage may be unavailable (e.g. private browsing); settings just won't persist
    }
}
