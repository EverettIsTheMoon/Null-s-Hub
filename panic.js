/*
 * panic.js — Null's Hub
 * A single reusable panic handler plus a floating "Null's Hub" bubble.
 * Includes about:blank cloaking for the back button, fullscreen support,
 * and touch/mobile controls.
 */

(function () {
  'use strict';

  var PANIC_URL = 'https://www.google.com';
  var ENABLED_KEY = 'nullhub_panic_enabled';
  var KEY_KEY = 'nullhub_panic_key';

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function isEnabled() {
    return read(ENABLED_KEY) === '1';
  }

  function getKey() {
    return read(KEY_KEY) || '';
  }

  function setEnabled(value) {
    write(ENABLED_KEY, value ? '1' : '0');
  }

  function setKey(key) {
    write(KEY_KEY, key || '');
  }

  function goToGoogle() {
    try {
      if (window.top && window.top !== window) {
        window.top.location.replace(PANIC_URL);
        return;
      }
    } catch (e) {}

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

  window.nullHubPanic = {
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    getKey: getKey,
    setKey: setKey,
    goToGoogle: goToGoogle
  };
})();

(function () {
  'use strict';

  var BUBBLE_ID = 'nhb-bubble';
  if (document.getElementById(BUBBLE_ID)) return;

  var hubUrl = '/';

  try {
    var src = document.currentScript && document.currentScript.src;
    if (src) {
      hubUrl = new URL('./', src).href;
    } else {
      hubUrl = new URL('./', window.location.href).href;
    }
  } catch (e) {}

  function goHomeAboutBlank() {
    try {
      var win = window.open('about:blank', '_blank', 'noopener,noreferrer');
      if (win) {
        win.document.write(
          '<!DOCTYPE html>' +
          '<html><head><meta charset="utf-8"><title>Dashboard</title></head>' +
          '<body style="margin:0;padding:0;overflow:hidden;background:#000;">' +
          '<iframe src="' + hubUrl + '" style="border:none;width:100vw;height:100vh;position:absolute;top:0;left:0;"></iframe>' +
          '</body></html>'
        );
        win.document.close();
        return;
      }
    } catch (e) {}

    try {
      if (window.top && window.top !== window) {
        window.top.location.replace(hubUrl);
        return;
      }
    } catch (e) {}

    window.location.href = hubUrl;
  }

  var isTouchScreen = (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    window.matchMedia('(pointer: coarse)').matches
  );

  var style = document.createElement('style');
  style.textContent = [
    '#' + BUBBLE_ID + '{',
    'position:fixed;left:16px;top:16px;z-index:2147483647;',
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;',
    '-webkit-user-select:none;user-select:none;',
    'display:flex;align-items:center;gap:8px;',
    '}',
    '@property --nhb-angle{syntax:"<angle>";inherits:false;initial-value:0deg;}',
    '.nhb-ring{',
    'position:absolute;inset:0;border-radius:999px;',
    'background:conic-gradient(from var(--nhb-angle),#ff2d55,#ff9500,#ffcc00,#34c759,#00c7be,#0a84ff,#5e5ce6,#bf5af2,#ff2d55);',
    'animation:nhb-spin 7s linear infinite;z-index:-1;',
    '}',
    '@keyframes nhb-spin{to{--nhb-angle:360deg;}}',
    '.nhb-core{',
    'position:relative;border-radius:999px;background:rgba(10,12,20,0.94);',
    'display:flex;align-items:center;justify-content:space-between;gap:8px;',
    'color:#fff;padding:6px 12px;min-height:50px;box-sizing:border-box;',
    'box-shadow:0 8px 24px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);',
    '}',
    '.nhb-title{font-size:13px;font-weight:800;white-space:nowrap;letter-spacing:0.02em;}',
    '.nhb-btn{',
    'border:0;cursor:pointer;background:rgba(255,255,255,0.12);color:#fff;',
    'font:600 11px/1 system-ui,-apple-system,"Segoe UI",sans-serif;',
    'padding:6px 10px;border-radius:999px;transition:background .15s ease;',
    '}',
    '.nhb-btn:hover{background:rgba(255,255,255,0.28);}',
    '#nhb-mobile-controls{',
    'position:fixed;bottom:20px;left:0;width:100%;pointer-events:none;z-index:2147483646;',
    'display:flex;justify-content:space-between;align-items:flex-end;padding:0 20px;box-sizing:border-box;',
    '}',
    '.nhb-joystick-base{',
    'pointer-events:auto;position:relative;width:120px;height:120px;border-radius:50%;',
    'background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.25);',
    'touch-action:none;overflow:hidden;',
    '}',
    '.nhb-joystick-stick{',
    'position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;',
    'background:rgba(255,255,255,0.42);border:1px solid rgba(255,255,255,0.5);',
    'box-shadow:0 3px 12px rgba(0,0,0,0.3);',
    '}',
    '.nhb-action-group{pointer-events:auto;display:flex;align-items:flex-end;gap:10px;}',
    '.nhb-action-btn{',
    'width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);',
    'background:rgba(255,255,255,0.12);color:#fff;font-weight:700;font-size:12px;',
    'display:flex;align-items:center;justify-content:center;touch-action:none;',
    'padding:0;',
    '}',
    '@media (max-width: 480px){',
    '  #nhb-bubble{left:10px;top:10px;}',
    '  .nhb-title{font-size:11px;}',
    '  .nhb-btn{padding:5px 8px;font-size:10px;}',
    '}'
  ].join('');

  (document.head || document.documentElement).appendChild(style);

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
  back.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    goHomeAboutBlank();
  });

  var fsBtn = document.createElement('button');
  fsBtn.type = 'button';
  fsBtn.className = 'nhb-btn';
  fsBtn.textContent = '⛶ Fullscreen';
  fsBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  core.appendChild(title);
  core.appendChild(back);
  core.appendChild(fsBtn);

  bubble.appendChild(ring);
  bubble.appendChild(core);

  function createActionButton(label, keyName) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'nhb-action-btn';
    button.textContent = label;

    var active = false;

    function press() {
      if (active) return;
      active = true;
      button.style.opacity = '0.9';
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: keyName,
        code: keyName,
        bubbles: true
      }));
    }

    function release() {
      if (!active) return;
      active = false;
      button.style.opacity = '1';
      window.dispatchEvent(new KeyboardEvent('keyup', {
        key: keyName,
        code: keyName,
        bubbles: true
      }));
    }

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);

    return button;
  }

  function mount() {
    var targetRoot = document.body || document.documentElement;
    targetRoot.appendChild(bubble);

    if (isTouchScreen) {
      var controls = document.createElement('div');
      controls.id = 'nhb-mobile-controls';

      var joystickBase = document.createElement('div');
      joystickBase.className = 'nhb-joystick-base';

      var joystickStick = document.createElement('div');
      joystickStick.className = 'nhb-joystick-stick';

      joystickBase.appendChild(joystickStick);
      controls.appendChild(joystickBase);

      var actionGroup = document.createElement('div');
      actionGroup.className = 'nhb-action-group';

      actionGroup.appendChild(createActionButton('L', 'KeyZ'));
      actionGroup.appendChild(createActionButton('R', 'KeyX'));
      actionGroup.appendChild(createActionButton('J', 'Space'));

      controls.appendChild(actionGroup);
      targetRoot.appendChild(controls);

      var activeKeys = {
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false
      };

      function emitKey(keyName, down) {
        if (down) {
          if (!activeKeys[keyName]) {
            activeKeys[keyName] = true;
            window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
              key: keyName,
              code: keyName,
              bubbles: true
            }));
          }
        } else if (activeKeys[keyName]) {
          activeKeys[keyName] = false;
          window.dispatchEvent(new KeyboardEvent('keyup', {
            key: keyName,
            code: keyName,
            bubbles: true
          }));
        }
      }

      var touchId = null;

      joystickBase.addEventListener('touchstart', function (event) {
        if (touchId === null && event.changedTouches && event.changedTouches.length) {
          touchId = event.changedTouches[0].identifier;
        }
      }, { passive: true });

      joystickBase.addEventListener('touchmove', function (event) {
        if (touchId === null || !event.changedTouches) return;

        for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          if (touch.identifier !== touchId) continue;

          var rect = joystickBase.getBoundingClientRect();
          var centerX = rect.left + rect.width / 2;
          var centerY = rect.top + rect.height / 2;
          var dx = touch.clientX - centerX;
          var dy = touch.clientY - centerY;
          var maxDist = 36;

          if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) {
            var angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxDist;
            dy = Math.sin(angle) * maxDist;
          }

          joystickStick.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';

          emitKey('KeyW', dy < -16);
          emitKey('KeyS', dy > 16);
          emitKey('KeyA', dx < -16);
          emitKey('KeyD', dx > 16);

          if (dy >= -16 && dy <= 16) {
            emitKey('KeyW', false);
            emitKey('KeyS', false);
          }
          if (dx >= -16 && dx <= 16) {
            emitKey('KeyA', false);
            emitKey('KeyD', false);
          }
        }
      }, { passive: true });

      function releaseJoystick() {
        if (touchId === null) return;
        touchId = null;
        joystickStick.style.transform = 'translate(0px, 0px)';
        emitKey('KeyW', false);
        emitKey('KeyS', false);
        emitKey('KeyA', false);
        emitKey('KeyD', false);
      }

      window.addEventListener('touchend', releaseJoystick, { passive: true });
      window.addEventListener('touchcancel', releaseJoystick, { passive: true });
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