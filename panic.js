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

/*
 * ---------------------------------------------------------------------------
 * Floating "Null's Hub" bubble — injected into every game alongside the panic
 * key. It is a rounded, translucent bubble with a slowly rotating rainbow
 * outline at 50% opacity. It carries a "Back" button that returns to the hub.
 *
 * Works whether panic.js runs inside a game iframe (window.self !== window.top)
 * or directly on the hub. All styles are scoped with an "nhb-" prefix and
 * injected via a <style> tag so it never collides with the host page's CSS.
 * ---------------------------------------------------------------------------
 */
(function () {
    'use strict';

    var BUBBLE_ID = 'nhb-bubble';
    if (document.getElementById(BUBBLE_ID)) return; // don't build it twice

    // Figure out where "home" is. panic.js is served from the hub origin, so
    // its own script src tells us the hub URL even when a game is proxied.
    var hubUrl = '/';
    try {
        var src = document.currentScript && document.currentScript.src;
        if (src) hubUrl = new URL('./', src).href;
        else hubUrl = new URL('./', window.location.href).href;
    } catch (e) { /* keep default */ }

    function goHome() {
        // Prefer replacing the whole top-level tab (the about:blank wrapper),
        // so you leave the game entirely. Fall back to navigating this frame.
        try {
            if (window.top && window.top !== window) {
                window.top.location.replace(hubUrl);
                return;
            }
        } catch (e) { /* cross-origin — fall through */ }
        try {
            window.location.replace(hubUrl);
        } catch (e) {
            window.location.href = hubUrl;
        }
    }

    // ---- inject scoped styles ----
    var style = document.createElement('style');
    style.textContent = [
        '#' + BUBBLE_ID + '{',
        'position:fixed;left:16px;top:16px;width:210px;height:70px;',
        'z-index:2147483647;',
        'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;',
        '-webkit-user-select:none;user-select:none;',
        '}',
        '.nhb-ring{',
        'position:absolute;inset:0;border-radius:999px;',
        'background:conic-gradient(#ff2d55,#ff9500,#ffcc00,#34c759,#00c7be,#0a84ff,#5e5ce6,#bf5af2,#ff2d55);',
        'animation:nhb-spin 7s linear infinite;',
        '}',
        '@keyframes nhb-spin{to{transform:rotate(1turn);}}',
        '.nhb-core{',
        'position:absolute;inset:4px;border-radius:999px;opacity:.5;',
        'background:rgba(10,12,20,.75);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
        'display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;',
        'color:#fff;padding:0 16px;box-sizing:border-box;',
        '}',
        '.nhb-title{font-size:14px;font-weight:800;letter-spacing:.02em;line-height:1.1;white-space:nowrap;}',
        '.nhb-back{',
        'border:0;cursor:pointer;background:rgba(255,255,255,.18);color:#fff;flex-shrink:0;',
        'font:600 11px/1 system-ui,-apple-system,"Segoe UI",sans-serif;',
        'padding:7px 13px;border-radius:999px;transition:background .15s ease;',
        '}',
        '.nhb-back:hover{background:rgba(255,255,255,.34);}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);

    // ---- build the bubble ----
    var bubble = document.createElement('div');
    bubble.id = BUBBLE_ID;

    var ring = document.createElement('div');
    ring.className = 'nhb-ring';

    var core = document.createElement('div');
    core.className = 'nhb-core';

    var title = document.createElement('div');
    title.className = 'nhb-title';
    title.textContent = "Null's Hub";

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'nhb-back';
    back.textContent = '← Back';
    back.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        goHome();
    });

    core.appendChild(title);
    core.appendChild(back);
    bubble.appendChild(ring);
    bubble.appendChild(core);

    function mount() {
        (document.body || document.documentElement).appendChild(bubble);
    }
    if (document.body) {
        mount();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();

