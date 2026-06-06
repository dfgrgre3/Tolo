/**
 * Lightweight Performance Detection - Inline Script
 * Runs BEFORE React hydrates to apply the right performance mode ASAP
 * Avoids FOUC and unnecessary heavy rendering on weak devices
 *
 * Detection capabilities (in order of execution):
 *  1. Network Connection API (effective type, saveData, RTT, downlink)
 *  2. Navigator deviceMemory, hardwareConcurrency
 *  3. WebGL renderer/performance hint
 *  4. Battery API
 *  5. prefers-reduced-data / prefers-reduced-motion media queries
 *  6. Real CPU benchmark (small loop timing)
 *  7. UA-based device class detection
 *
 * Modes:
 *  - 'performance': full effects (no class, high-end devices)
 *  - 'balanced':    some effects reduced (no class, default for mid-range)
 *  - 'lite':        light mode (adds 'lite-mode' class)
 *  - 'saver':       saver mode (adds 'efficiency-mode' class)
 *  - 'ultra-lite':  ultra-light mode (adds 'efficiency-mode' + 'ultra-lite-mode' classes)
 */
(function () {
  'use strict';
  try {
    var ROOT = document.documentElement;
    var nav = navigator;
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    var score = 50;
    var signals = {};

    // ===== Memory =====
    var mem = nav.deviceMemory;
    signals.deviceMemory = typeof mem === 'number' ? mem : null;
    if (typeof mem === 'number') {
      if (mem >= 8) score += 25;
      else if (mem >= 4) score += 10;
      else if (mem >= 2) score -= 5;
      else score -= 25;
    }

    // ===== CPU cores =====
    var cores = nav.hardwareConcurrency;
    signals.hardwareConcurrency = typeof cores === 'number' ? cores : null;
    if (typeof cores === 'number') {
      if (cores >= 8) score += 20;
      else if (cores >= 4) score += 5;
      else if (cores >= 2) score -= 10;
      else score -= 25;
    }

    // ===== Network =====
    var connType = (conn && conn.effectiveType) || '4g';
    var downlink = (conn && conn.downlink) || null;
    var rtt = (conn && conn.rtt) || null;
    signals.effectiveType = connType;
    signals.downlink = downlink;
    signals.rtt = rtt;
    signals.saveData = !!(conn && conn.saveData);

    if (connType === '4g') score += 10;
    else if (connType === '3g') score -= 15;
    else if (connType === '2g') score -= 30;
    else if (connType === 'slow-2g') score -= 40;

    if (signals.saveData) score -= 30;
    if (downlink && downlink < 1.5) score -= 15;
    if (rtt && rtt > 500) score -= 10;

    // ===== WebGL renderer detection =====
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          var renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
          signals.gpuRenderer = String(renderer).slice(0, 120);
          if (/SwiftShader|Software|llvmpipe|Microsoft Basic/i.test(renderer)) {
            score -= 30;
            signals.gpuType = 'software';
          } else if (/Mali-4|Adreno \(TM\) [12]\d\d|PowerVR SGX/i.test(renderer)) {
            score -= 10;
            signals.gpuType = 'weak';
          } else {
            signals.gpuType = 'hardware';
          }
        }
      } else {
        score -= 15;
        signals.gpuType = 'none';
      }
    } catch (e) {
      signals.gpuType = 'unknown';
    }

    // ===== Battery =====
    try {
      if (nav.getBattery) {
        nav.getBattery().then(function (bat) {
          try {
            if (bat.level <= 0.15 && !bat.charging) {
              ROOT.setAttribute('data-low-battery', '1');
              var currentMode = ROOT.getAttribute('data-perf-mode');
              if (currentMode === 'performance' || currentMode === 'balanced') {
                applyMode('saver');
              }
            }
          } catch (e) {}
        }).catch(function () {});
      }
    } catch (e) {}

    // ===== Media queries =====
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) {
        score -= 25;
        signals.reducedData = true;
      }
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        signals.reducedMotion = true;
      }
    } catch (e) {}

    // ===== Real CPU benchmark =====
    try {
      var t0 = performance.now();
      var acc = 0;
      for (var i = 0; i < 200000; i++) {
        acc += Math.sqrt(i) * Math.sin(i);
      }
      var dt = performance.now() - t0;
      signals.cpuBenchMs = Math.round(dt);
      if (dt > 35) score -= 25;
      else if (dt > 20) score -= 12;
      else if (dt < 6) score += 5;
    } catch (e) {}

    // ===== UA-based device class =====
    var ua = nav.userAgent || '';
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    var isTablet = /iPad|Android(?!.*Mobile)/i.test(ua) || (nav.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    signals.isMobile = isMobile;
    signals.isTablet = isTablet;

    if (isMobile && typeof cores === 'number' && cores < 4) score -= 15;
    if (isMobile && typeof cores === 'number' && cores <= 2) score -= 10;
    if (isTablet) score += 5;

    // Clamp
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    signals.score = score;

    // ===== Decide mode =====
    var mode;
    if (signals.saveData) mode = 'ultra-lite';
    else if (connType === 'slow-2g' || connType === '2g') mode = 'ultra-lite';
    else if (score < 20) mode = 'ultra-lite';
    else if (score < 35) mode = 'saver';
    else if (score < 50) mode = 'lite';
    else if (score < 75) mode = 'balanced';
    else mode = 'performance';

    applyMode(mode);

    // Persist detection signals for client hooks (lightweight)
    try {
      localStorage.setItem('tolo-device-signals', JSON.stringify(signals));
    } catch (e) {}

    function applyMode(m) {
      ROOT.classList.remove('efficiency-mode', 'lite-mode', 'ultra-lite-mode');
      if (m === 'saver') ROOT.classList.add('efficiency-mode');
      else if (m === 'lite') ROOT.classList.add('lite-mode');
      else if (m === 'ultra-lite') {
        ROOT.classList.add('efficiency-mode');
        ROOT.classList.add('ultra-lite-mode');
      }
      ROOT.setAttribute('data-perf-mode', m);
      ROOT.setAttribute('data-perf-ready', '1');
    }
  } catch (e) {
    // Fail silently - never break the page
    try { document.documentElement.setAttribute('data-perf-mode', 'balanced'); } catch (e2) {}
  }
})();
