
/*
 * panic.js — Null's Hub
 * Floating hub, panic handler, fullscreen, configurable mobile controls.
 */
(function () {
  'use strict';

  var PANIC_URL = 'https://www.google.com';
  var ENABLED_KEY = 'nullhub_panic_enabled';
  var KEY_KEY = 'nullhub_panic_key';

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function isEnabled() { return read(ENABLED_KEY) === '1'; }
  function getKey() { return read(KEY_KEY) || ''; }
  function setEnabled(value) { write(ENABLED_KEY, value ? '1' : '0'); }
  function setKey(key) { write(KEY_KEY, key || ''); }

  function goToGoogle() {
    try {
      if (window.top && window.top !== window) {
        window.top.location.replace(PANIC_URL);
        return;
      }
    } catch (e) {}

    try { window.location.replace(PANIC_URL); }
    catch (e) { window.location.href = PANIC_URL; }
  }

  document.addEventListener('keydown', function (event) {
    if (!isEnabled()) return;
    var key = getKey();
    if (key && event.key === key) {
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

  var SETTINGS_KEY = 'nullhub_mobile_settings_v2';
  var hubUrl = '/';

  try {
    var src = document.currentScript && document.currentScript.src;
    hubUrl = new URL('./', src || window.location.href).href;
  } catch (e) {}

  function goHomeAboutBlank() {
    try {
      var win = window.open('about:blank', '_blank');
      if (win) {
        win.document.write(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard</title></head>' +
          '<body style="margin:0;padding:0;overflow:hidden;background:#000">' +
          '<iframe src="' + hubUrl + '" style="border:0;width:100vw;height:100vh;position:absolute;inset:0"></iframe>' +
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

  var coarsePointer = window.matchMedia &&
    window.matchMedia('(pointer: coarse)');

  var isMobile =
    ('ontouchstart' in window) ||
    navigator.maxTouchPoints > 0 ||
    !!(coarsePointer && coarsePointer.matches);

  var defaults = {
    controlsEnabled: true,
    joystickX: 24,
    joystickY: 24,
    buttonsX: 24,
    buttonsY: 24,
    invertX: false,
    invertY: false,
    deadzone: 16,
    directions: {
      up: 'KeyW',
      down: 'KeyS',
      left: 'KeyA',
      right: 'KeyD'
    }
  };

  function readStorage(key) {
    try { return localStorage.getItem(key); }
    catch (e) { return null; }
  }

  function loadSettings() {
    var result = {};

    try {
      result = JSON.parse(readStorage(SETTINGS_KEY) || '{}') || {};
    } catch (e) {}

    var s = {};
    Object.keys(defaults).forEach(function (key) {
      s[key] = defaults[key];
    });

    Object.keys(result).forEach(function (key) {
      if (key !== 'directions') s[key] = result[key];
    });

    s.directions = {};

    Object.keys(defaults.directions).forEach(function (key) {
      s.directions[key] =
        (result.directions && result.directions[key]) ||
        defaults.directions[key];
    });

    return s;
  }

  var settings = loadSettings();

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  var style = document.createElement('style');

  style.textContent = [
    '#nhb-bubble{position:fixed;left:16px;top:16px;z-index:2147483647;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;display:flex;align-items:center;gap:8px;color:#fff;}',
    '@property --nhb-angle{syntax:"<angle>";inherits:false;initial-value:0deg;}',
    '.nhb-ring{position:absolute;inset:0;border-radius:999px;background:conic-gradient(from var(--nhb-angle),#ff2d55,#ff9500,#ffcc00,#34c759,#00c7be,#0a84ff,#5e5ce6,#bf5af2,#ff2d55);animation:nhb-spin 7s linear infinite;z-index:-1;}',
    '@keyframes nhb-spin{to{--nhb-angle:360deg;}}',
    '.nhb-core{position:relative;border-radius:24px;background:rgba(10,12,20,.96);display:flex;align-items:center;gap:7px;color:#fff;padding:6px 10px;min-height:48px;box-sizing:border-box;box-shadow:0 8px 28px rgba(0,0,0,.4),0 0 14px rgba(10,132,255,.2);border:1px solid rgba(255,255,255,.14);}',
    '.nhb-title{font-size:13px;font-weight:800;white-space:nowrap;letter-spacing:.02em;}',
    '.nhb-btn{border:1px solid rgba(255,255,255,.12);cursor:pointer;background:rgba(255,255,255,.12);color:#fff;font:600 11px/1 system-ui,sans-serif;padding:8px 10px;border-radius:999px;white-space:nowrap;}',
    '.nhb-btn:hover,.nhb-btn:focus{background:rgba(10,132,255,.45);outline:none;}',
    '#nhb-bubble.nhb-minimized .nhb-ring,#nhb-bubble.nhb-minimized .nhb-title,#nhb-bubble.nhb-minimized #nhb-back,#nhb-bubble.nhb-minimized #nhb-fullscreen,#nhb-bubble.nhb-minimized #nhb-settings-button,#nhb-bubble.nhb-minimized #nhb-mobile-toggle{display:none;}',
    '#nhb-bubble.nhb-minimized .nhb-core{padding:5px;border-radius:50%;min-height:0;}',
    '#nhb-bubble.nhb-minimized #nhb-expand{width:42px;height:42px;padding:0;font-size:18px;}',
    '#nhb-mobile-toggle{display:none;}',
    '#nhb-mobile-controls{position:fixed;inset:0;pointer-events:none;z-index:2147483646;display:none;}',
    '#nhb-mobile-controls.nhb-visible{display:block;}',
    '.nhb-joystick-base{pointer-events:auto;position:absolute;left:24px;bottom:24px;width:120px;height:120px;border-radius:50%;background:rgba(12,18,32,.48);border:2px solid rgba(100,190,255,.65);box-shadow:0 0 20px rgba(10,132,255,.18),inset 0 0 20px rgba(10,132,255,.12);touch-action:none;box-sizing:border-box;}',
    '.nhb-joystick-stick{position:absolute;left:33px;top:33px;width:50px;height:50px;border-radius:50%;background:rgba(210,235,255,.55);border:1px solid rgba(255,255,255,.72);box-shadow:0 3px 14px rgba(0,0,0,.4);pointer-events:none;}',
    '.nhb-action-group{pointer-events:auto;position:absolute;right:24px;bottom:24px;display:flex;align-items:flex-end;gap:10px;}',
    '.nhb-action-btn{width:56px;height:56px;border-radius:50%;border:1px solid rgba(255,255,255,.45);background:rgba(18,28,48,.68);box-shadow:0 0 14px rgba(10,132,255,.18);color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;touch-action:none;padding:0;}',
    '#nhb-settings{display:none;position:fixed;top:68px;left:12px;z-index:2147483647;width:min(310px,calc(100vw - 24px));max-height:75vh;overflow:auto;box-sizing:border-box;padding:14px;border:1px solid rgba(120,190,255,.4);border-radius:16px;background:rgba(8,12,22,.97);color:#fff;font:13px/1.4 system-ui,sans-serif;box-shadow:0 12px 38px rgba(0,0,0,.5),0 0 22px rgba(10,132,255,.14);}',
    '#nhb-settings.nhb-open{display:block;}',
    '.nhb-settings-head{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:15px;margin-bottom:10px;}',
    '.nhb-setting-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0;}',
    '.nhb-setting-row label{flex:1;}',
    '#nhb-settings select,#nhb-settings input[type=number]{max-width:140px;background:#171e2d;color:#fff;border:1px solid #45536a;border-radius:7px;padding:6px;}',
    '.nhb-settings-note{opacity:.75;font-size:11px;margin:8px 0;}',
    '.nhb-settings-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;}',
    '@media (pointer:coarse),(max-width:700px){#nhb-mobile-toggle{display:inline-flex;}#nhb-bubble{left:10px;top:10px}.nhb-title{font-size:11px}.nhb-btn{padding:7px 8px;font-size:10px}}',
    '@media (max-width:380px){.nhb-core{gap:4px;padding:5px}.nhb-title{display:none!important}.nhb-btn{padding:7px;font-size:10px}}'
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

  function makeButton(id, label, handler) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.className = 'nhb-btn';
    b.textContent = label;

    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handler();
    });

    return b;
  }

  var settingsPanel;

  var back = makeButton('nhb-back', '← Back', goHomeAboutBlank);

  var fsBtn = makeButton('nhb-fullscreen', '⛶ Fullscreen', function () {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        var promise = document.documentElement.requestFullscreen();
        if (promise && promise.catch) promise.catch(function () {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  var mobileToggle = makeButton(
    'nhb-mobile-toggle',
    '☷ Controls: ' + (settings.controlsEnabled ? 'On' : 'Off'),
    function () {
      settings.controlsEnabled = !settings.controlsEnabled;
      saveSettings();
      updateControlsVisibility();
      mobileToggle.textContent =
        '☷ Controls: ' + (settings.controlsEnabled ? 'On' : 'Off');
    }
  );

  var settingsBtn = makeButton('nhb-settings-button', '⚙ Settings', function () {
    settingsPanel.classList.toggle('nhb-open');
  });

  var expandBtn = makeButton('nhb-expand', '−', function () {
    var minimized = bubble.classList.toggle('nhb-minimized');
    expandBtn.textContent = minimized ? '+' : '−';
    expandBtn.title = minimized ? 'Expand Null’s Hub' : 'Minimize Null’s Hub';
  });

  core.appendChild(title);
  core.appendChild(back);
  core.appendChild(fsBtn);
  core.appendChild(mobileToggle);
  core.appendChild(settingsBtn);
  core.appendChild(expandBtn);

  bubble.appendChild(ring);
  bubble.appendChild(core);

  settingsPanel = document.createElement('div');
  settingsPanel.id = 'nhb-settings';

  var keyOptions =
    '<option value="none">Disabled</option>' +
    '<option value="KeyW">W</option><option value="KeyA">A</option>' +
    '<option value="KeyS">S</option><option value="KeyD">D</option>' +
    '<option value="ArrowUp">Arrow Up</option><option value="ArrowDown">Arrow Down</option>' +
    '<option value="ArrowLeft">Arrow Left</option><option value="ArrowRight">Arrow Right</option>' +
    '<option value="Space">Space</option><option value="KeyZ">Z</option>' +
    '<option value="KeyX">X</option><option value="KeyE">E</option>' +
    '<option value="KeyQ">Q</option>';

  settingsPanel.innerHTML =
    '<div class="nhb-settings-head"><span>Mobile Controls</span>' +
    '<button type="button" class="nhb-btn" id="nhb-settings-close">✕</button></div>' +
    '<div class="nhb-setting-row"><label for="nhb-up">Joystick up / forward</label><select id="nhb-up">' + keyOptions + '</select></div>' +
    '<div class="nhb-setting-row"><label for="nhb-down">Joystick down / backward</label><select id="nhb-down">' + keyOptions + '</select></div>' +
    '<div class="nhb-setting-row"><label for="nhb-left">Joystick left</label><select id="nhb-left">' + keyOptions + '</select></div>' +
    '<div class="nhb-setting-row"><label for="nhb-right">Joystick right</label><select id="nhb-right">' + keyOptions + '</select></div>' +
    '<div class="nhb-setting-row"><label for="nhb-invert-x">Invert joystick X axis</label><input id="nhb-invert-x" type="checkbox"></div>' +
    '<div class="nhb-setting-row"><label for="nhb-invert-y">Invert joystick Y axis</label><input id="nhb-invert-y" type="checkbox"></div>' +
    '<div class="nhb-setting-row"><label for="nhb-deadzone">Joystick dead zone (px)</label><input id="nhb-deadzone" type="number" min="4" max="40" value="16"></div>' +
    '<div class="nhb-settings-actions"><button type="button" class="nhb-btn" id="nhb-reset">Reset layout/settings</button><button type="button" class="nhb-btn" id="nhb-drag">Move controls</button></div>' +
    '<div class="nhb-settings-note">Default: up=W, down=S, left=A, right=D. Settings save automatically.</div>' +
    '<div class="nhb-settings-note">When Move controls is active, drag the joystick or action buttons to reposition them.</div>';

  var controls = document.createElement('div');
  controls.id = 'nhb-mobile-controls';

  var joystickBase = document.createElement('div');
  joystickBase.className = 'nhb-joystick-base';
  joystickBase.setAttribute('aria-label', 'Movement joystick');

  var joystickStick = document.createElement('div');
  joystickStick.className = 'nhb-joystick-stick';
  joystickBase.appendChild(joystickStick);

  var actionGroup = document.createElement('div');
  actionGroup.className = 'nhb-action-group';

  function emitKey(code, down) {
    if (!code || code === 'none') return;

    var key = code.indexOf('Key') === 0
      ? code.slice(3).toLowerCase()
      : (code === 'Space' ? ' ' : code);

    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key: key,
      code: code,
      bubbles: true,
      cancelable: true
    }));
  }

  function createActionButton(label, code) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'nhb-action-btn';
    button.textContent = label;
    button.setAttribute('aria-label', label);

    var pointers = {};

    function down(e) {
      if (movingControls) return;
      e.preventDefault();
      if (pointers[e.pointerId]) return;
      pointers[e.pointerId] = true;
      button.style.transform = 'scale(.94)';
      emitKey(code, true);
    }

    function up(e) {
      if (!pointers[e.pointerId]) return;
      delete pointers[e.pointerId];
      button.style.transform = '';
      emitKey(code, false);
    }

    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('lostpointercapture', up);

    return button;
  }

  actionGroup.appendChild(createActionButton('Z', 'KeyZ'));
  actionGroup.appendChild(createActionButton('X', 'KeyX'));
  actionGroup.appendChild(createActionButton('JUMP', 'Space'));

  controls.appendChild(joystickBase);
  controls.appendChild(actionGroup);

  function updateControlsVisibility() {
    controls.classList.toggle('nhb-visible', isMobile && settings.controlsEnabled);
  }

  function updateLayout() {
    joystickBase.style.left = settings.joystickX + 'px';
    joystickBase.style.bottom = settings.joystickY + 'px';
    joystickBase.style.right = 'auto';

    actionGroup.style.right = settings.buttonsX + 'px';
    actionGroup.style.bottom = settings.buttonsY + 'px';
    actionGroup.style.left = 'auto';
  }

  function syncSettingsUI() {
    ['up', 'down', 'left', 'right'].forEach(function (dir) {
      var select = document.getElementById('nhb-' + dir);
      if (select) select.value = settings.directions[dir];
    });

    document.getElementById('nhb-invert-x').checked = !!settings.invertX;
    document.getElementById('nhb-invert-y').checked = !!settings.invertY;
    document.getElementById('nhb-deadzone').value = settings.deadzone;
  }

  function readSettingsUI() {
    ['up', 'down', 'left', 'right'].forEach(function (dir) {
      settings.directions[dir] =
        document.getElementById('nhb-' + dir).value;
    });

    settings.invertX = document.getElementById('nhb-invert-x').checked;
    settings.invertY = document.getElementById('nhb-invert-y').checked;

    settings.deadzone = Math.max(
      4,
      Math.min(40, Number(document.getElementById('nhb-deadzone').value) || 16)
    );

    saveSettings();
  }

  ['up', 'down', 'left', 'right'].forEach(function (dir) {
    document.getElementById('nhb-' + dir).addEventListener('change', readSettingsUI);
  });

  document.getElementById('nhb-invert-x').addEventListener('change', readSettingsUI);
  document.getElementById('nhb-invert-y').addEventListener('change', readSettingsUI);
  document.getElementById('nhb-deadzone').addEventListener('change', readSettingsUI);

  document.getElementById('nhb-settings-close').addEventListener('click', function () {
    settingsPanel.classList.remove('nhb-open');
  });

  document.getElementById('nhb-reset').addEventListener('click', function () {
    settings = JSON.parse(JSON.stringify(defaults));
    saveSettings();
    syncSettingsUI();
    updateLayout();
    updateControlsVisibility();
    mobileToggle.textContent =
      '☷ Controls: ' + (settings.controlsEnabled ? 'On' : 'Off');
  });

  var activeCodes = {};

  function setDirection(dir, down) {
    var code = settings.directions[dir];
    if (!code || code === 'none') return;

    if (down && !activeCodes[dir]) {
      activeCodes[dir] = code;
      emitKey(code, true);
    } else if (!down && activeCodes[dir]) {
      emitKey(activeCodes[dir], false);
      delete activeCodes[dir];
    }
  }

  function releaseAllDirections() {
    Object.keys(activeCodes).forEach(function (dir) {
      emitKey(activeCodes[dir], false);
      delete activeCodes[dir];
    });
  }

  var touchId = null;
  var movingControls = false;

  function updateJoystick(clientX, clientY) {
    var rect = joystickBase.getBoundingClientRect();
    var dx = clientX - (rect.left + rect.width / 2);
    var dy = clientY - (rect.top + rect.height / 2);

    var maxDist = Math.max(
      1,
      (rect.width - joystickStick.offsetWidth) / 2
    );

    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDist) {
      dx = dx / distance * maxDist;
      dy = dy / distance * maxDist;
    }

    joystickStick.style.transform =
      'translate(' + dx + 'px,' + dy + 'px)';

    var mappedX = settings.invertX ? -dx : dx;
    var mappedY = settings.invertY ? -dy : dy;
    var deadzone = Number(settings.deadzone) || 16;

    setDirection('up', mappedY < -deadzone);
    setDirection('down', mappedY > deadzone);
    setDirection('left', mappedX < -deadzone);
    setDirection('right', mappedX > deadzone);
  }

  joystickBase.addEventListener('pointerdown', function (event) {
    if (movingControls || !settings.controlsEnabled || touchId !== null) return;

    event.preventDefault();
    touchId = event.pointerId;

    try { joystickBase.setPointerCapture(touchId); } catch (e) {}

    updateJoystick(event.clientX, event.clientY);
  });

  joystickBase.addEventListener('pointermove', function (event) {
    if (touchId !== event.pointerId) return;
    event.preventDefault();
    updateJoystick(event.clientX, event.clientY);
  });

  function releaseJoystick(event) {
    if (touchId === null) return;

    if (
      event &&
      event.pointerId !== undefined &&
      touchId !== event.pointerId
    ) return;

    touchId = null;
    joystickStick.style.transform = 'translate(0,0)';
    releaseAllDirections();
  }

  joystickBase.addEventListener('pointerup', releaseJoystick);
  joystickBase.addEventListener('pointercancel', releaseJoystick);
  joystickBase.addEventListener('lostpointercapture', releaseJoystick);

  document.getElementById('nhb-drag').addEventListener('click', function () {
    movingControls = !movingControls;
    this.textContent = movingControls ? 'Finish moving' : 'Move controls';

    joystickBase.style.borderStyle = movingControls ? 'dashed' : 'solid';

    actionGroup.style.outline = movingControls
      ? '2px dashed rgba(100,190,255,.9)'
      : '';
  });

  function makeDraggable(element, which) {
    var drag = null;

    element.addEventListener('pointerdown', function (event) {
      if (!movingControls) return;

      event.preventDefault();
      event.stopPropagation();

      drag = { x: event.clientX, y: event.clientY };

      try { element.setPointerCapture(event.pointerId); } catch (e) {}
    });

    element.addEventListener('pointermove', function (event) {
      if (!drag || !movingControls) return;

      var dx = event.clientX - drag.x;
      var dy = event.clientY - drag.y;

      drag.x = event.clientX;
      drag.y = event.clientY;

      if (which === 'joystick') {
        settings.joystickX = Math.max(
          0,
          Math.min(window.innerWidth - 60, settings.joystickX + dx)
        );

        settings.joystickY = Math.max(
          0,
          Math.min(window.innerHeight - 60, settings.joystickY - dy)
        );
      } else {
        settings.buttonsX = Math.max(
          0,
          Math.min(window.innerWidth - 60, settings.buttonsX - dx)
        );

        settings.buttonsY = Math.max(
          0,
          Math.min(window.innerHeight - 60, settings.buttonsY - dy)
        );
      }

      updateLayout();
      saveSettings();
    });

    function done() { drag = null; }

    element.addEventListener('pointerup', done);
    element.addEventListener('pointercancel', done);
  }

  makeDraggable(joystickBase, 'joystick');
  makeDraggable(actionGroup, 'buttons');

  function mount() {
    var root = document.body || document.documentElement;

    if (!bubble.isConnected) root.appendChild(bubble);
    if (!controls.isConnected) root.appendChild(controls);
    if (!settingsPanel.isConnected) root.appendChild(settingsPanel);

    updateLayout();
    syncSettingsUI();
    updateControlsVisibility();
  }

  if (document.body) {
    mount();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.addEventListener('resize', function () {
    settings.joystickX = Math.max(
      0,
      Math.min(window.innerWidth - 60, settings.joystickX)
    );

    settings.buttonsX = Math.max(
      0,
      Math.min(window.innerWidth - 60, settings.buttonsX)
    );

    updateLayout();
    saveSettings();
  });
})();
