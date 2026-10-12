/*
 * panic.js — Null's Arcade
 * A single, reusable "panic key" handler and floating bubble with touch-based
 * mobile controls (joystick + WASD, mouse clicks, jump), fullscreen support,
 * and about:blank cloaking for the back button.
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
        try {
            if (window.top && window.top !== window) {
                window.top.location.replace(PANIC_URL);
                return;
            }
        } catch (e) { }
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

(function () {
    'use strict';

    var BUBBLE_ID = 'nhb-bubble';
    if (document.getElementById(BUBBLE_ID)) return;

    var hubUrl = '/';
    try {
        var src = document.currentScript && document.currentScript.src;
        if (src) hubUrl = new URL('./', src).href;
        else hubUrl = new URL('./', window.location.href).href;
    } catch (e) { }

    // Open hub inside an about:blank tab cloak
    fn goHomeAboutBlank() {
        try {
            var win = window.open('about:blank', '_blank');
            if (win) {
                win.document.write(
                    '<!DOCTYPE html><html><head><title>Dashboard</title></head>' +
                    '<body style="margin:0;padding:0;overflow:hidden;background:#000;">' +
                    '<iframe src="' + hubUrl + '" style="border:none;width:100vw;height:100vh;position:absolute;top:0;left:0;"></iframe>' +
                    '</body></html>'
                );
                win.document.close();
                // Optionally close current frame/tab or leave it
                return;
            }
        } catch (e) { }
        
        // Fallback standard navigation
        try {
            if (window.top && window.top !== window) {
                window.top.location.replace(hubUrl);
                return;
            }
        } catch (e) { }
        window.location.href = hubUrl;
    }

    // Touch screen detection
    var isTouchScreen = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches);

    // ---- Inject Scoped Styles ----
    var style = document.createElement('style');
    style.textContent = [
        '#' + BUBBLE_ID + '{',
        'position:fixed;left:16px;top:16px;width:auto;height:50px;',
        'z-index:2147483647;',
        'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;',
        '-webkit-user-select:none;user-select:none;display:flex;align-items:center;gap:8px;',
        '}',
        '@property --nhb-angle{syntax:"<angle>";inherits:false;initial-value:0deg;}',
        '.nhb-ring{',
        'position:absolute;inset:0;border-radius:999px;',
        'background:conic-gradient(from var(--nhb-angle),#ff2d55,#ff9500,#ffcc00,#34c759,#00c7be,#0a84ff,#5e5ce6,#bf5af2,#ff2d55);',
        'animation:nhb-spin 7s linear infinite;z-index:-1;',
        '}',
        '@keyframes nhb-spin{to{--nhb-angle:360deg;}}',
        '.nhb-core{',
        'border-radius:999px;',
        'background:rgb(10,12,20);',
        'display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:8px;',
        'color:#fff;padding:6px 12px;box-sizing:border-box;height:100%;',
        '}',
        '.nhb-title{font-size:13px;font-weight:800;white-space:nowrap;}',
        '.nhb-btn{',
        'border:0;cursor:pointer;background:rgba(255,255,255,.18);color:#fff;',
        'font:600 11px/1 system-ui,-apple-system,"Segoe UI",sans-serif;',
        'padding:6px 10px;border-radius:999px;transition:background .15s ease;',
        '}',
        '.nhb-btn:hover{background:rgba(255,255,255,.34);}',

        /* Mobile Controls Styling */
        '#nhb-mobile-controls{position:fixed;bottom:20px;left:0;width:100%;pointer-events:none;z-index:2147483646;display:flex;justify-content:space-between;padding:0 20px;box-sizing:border-box;}',
        '.nhb-joystick-base{pointer-events:auto;width:120px;height:120px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.3);border-radius:50%;position:relative;touch-action:none;}',
        '.nhb-joystick-stick{width:50px;height:50px;background:rgba(255,255,255,0.5);border-radius:50%;position:absolute;top:35px;left:35px;pointer-events:none;}',
        '.nhb-action-group{pointer-events:auto;display:flex;gap:10px;align-items:flex-end;}',
        '.nhb-action-btn{width:60px;height:60px;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);border-radius:50%;color:#fff;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;touch-action:manipulation;cursor:pointer;}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);

    // ---- Build Bubble Navbar ----
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
    back.className = 'nhb-btn';
    back.textContent = '← Back';
    back.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        goHomeAboutBlank();
    });

    var fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'nhb-btn';
    fsBtn.textContent = '⛶ Fullscreen';
    fsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    core.appendChild(title);
    core.appendChild(back);
    core.appendChild(fsBtn);
    bubble.appendChild(ring);
    bubble.appendChild(core);

    function mount() {
        var targetRoot = document.body || document.documentElement;
        targetRoot.appendChild(bubble);

        // ---- Inject Mobile Controls if Touch Screen ----
        if (isTouchScreen) {
            var controlsContainer = document.createElement('div');
            controlsContainer.id = 'nhb-mobile-controls';

            // Joystick for WASD
            var joystickBase = document.createElement('div');
            joystickBase.className = 'nhb-joystick-base';
            var joystickStick = document.createElement('div');
            joystickStick.className = 'nhb-joystick-stick';
            joystickBase.appendChild(joystickStick);
            controlsContainer.appendChild(joystickBase);

            // Action Buttons (Left Click, Right Click, Jump)
            var actionGroup = document.createElement('div');
            actionGroup.className = 'nhb-action-group';

            function createActionButton(label, mAction, keyCode) {
                var btn = document.createElement('button');
                btn.className = 'nhb-action-btn';
                btn.textContent = label;
                
                let active = false;
                function triggerDown(e) {
                    e.preventDefault();
                    if (!active) {
                        active = true;
                        window.dispatchEvent(new KeyboardEvent('keydown', { key: keyCode, bubbles: true }));
                    }
                }
                function triggerUp(e) {
                    e.preventDefault();
                    if (active) {
                        active = false;
                        window.dispatchEvent(new KeyboardEvent('keyup', { key: keyCode, bubbles: true }));
                    }
                }

                btn.addEventListener('touchstart', triggerDown);
                btn.addEventListener('touchend', triggerUp);
                btn.addEventListener('mousedown', triggerDown);
                btn.addEventListener('mouseup', triggerUp);
                return btn;
            }

            actionGroup.appendChild(createActionButton('L-Click', 'left', 'KeyZ')); // or click simulation
            actionGroup.appendChild(createActionButton('R-Click', 'right', 'KeyX'));
            actionGroup.appendChild(createActionButton('Jump', 'jump', ' ")); // Spacebar

            controlsContainer.appendChild(actionGroup);
            targetRoot.appendChild(controlsContainer);

            // Simple Joystick logic mapping to WASD
            let activeKeys = {};
            function pressKey(k) {
                if (!activeKeys[k]) {
                    activeKeys[k] = true;
                    window.dispatchEvent(new KeyboardEvent('keydown', { code: k, bubbles: true }));
                }
            }
            function releaseKey(k) {
                if (activeKeys[k]) {
                    activeKeys[k] = false;
                    window.dispatchEvent(new KeyboardEvent('keyup', { code: k, bubbles: true }));
                }
            }

            let touchId = null;
            joystickBase.addEventListener('touchstart', function(e) {
                if (touchId === null) {
                    touchId = e.changedTouches[0].identifier;
                }
            });

            window.addEventListener('touchmove', function(e) {
                if (touchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    let t = e.changedTouches[i];
                    if (t.identifier === touchId) {
                        let rect = joystickBase.getBoundingClientRect();
                        let centerX = rect.left + rect.width / 2;
                        let centerY = rect.top + rect.height / 2;
                        let dx = t.clientX - centerX;
                        let dy = t.clientY - centerY;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        let maxDist = 40;

                        if (dist > maxDist) {
                            dx = (dx / dist) * maxDist;
                            dy = (dy / dist) * maxDist;
                        }

                        joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;

                        // Thresholds for WASD
                        pressKey('KeyW', dy < -15);
                        pressKey('KeyS', dy > 15);
                        pressKey('KeyA', dx < -15);
                        pressKey('KeyD', dx > 15);
                    }
                }
            }, { passive: true });

            function handleTouchEnd(e) {
                if (touchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === touchId) {
                        touchId = null;
                        joystickStick.style.transform = 'translate(0px, 0px)';
                        releaseKey('KeyW');
                        releaseKey('KeyS');
                        releaseKey('KeyA');
                        releaseKey('KeyD');
                    }
                }
            }
            window.addEventListener('touchend', handleTouchEnd);
            window.addEventListener('touchcancel', handleTouchEnd);
        }
    }

    if (document.body) {
        mount();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
