/*
 * panic.js — Null's Arcade
 * A single, reusable "panic key" handler. It is loaded on the hub itself and
 * injected into every game's iframe, so the key works whether you are browsing
 * the hub or playing a game.
 *
 * How it works:
 *   - Reads the saved settings from localStorage (same-origin as the hub):
 *       nullhub_panic_enabled  -> "1" when the panic key is switched on
 *       nullhub_panic_key      -> the KeyboardEvent.key value to watch for
 *   - Listens for that key (capture phase, so it fires before the game's own
 *     key handlers can swallow it).
 *   - When pressed, it navigates to Google.com. It tries to replace the whole
 *     top-level tab first, so you leave the game entirely.
 */
(function () {
    'use strict';

    var PANIC_URL = 'https://www.google.com';
    var ENABLED_KEY = 'nullhub_panic_enabled';
    var KEY_KEY = 'nullhub_panic_key';

    function read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function isEnabled() { return read(ENABLED_KEY) === '1'; }
    function getKey() { return read(KEY_KEY) || ''; }

    function goToGoogle() {
        // Prefer navigating the top-level tab so the game tab is replaced.
        try {
            if (window.top && window.top !== window) {
                window.top.location.replace(PANIC_URL);
                return;
            }
        } catch (e) { /* cross-origin or blocked — fall through */ }
        try {
            window.location.replace(PANIC_URL);
        } catch (e) {
            window.location.href = PANIC_URL;
        }
    }

    document.addEventListener('keydown', function (event) {
        if (!isEnabled()) return;
        var key = getKey();
        if (!key) return;
        if (event.key === key) {
            event.preventDefault();
            event.stopPropagation();
            goToGoogle();
        }
    }, true);
})();
