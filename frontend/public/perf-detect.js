/**
 * Centralized Performance Detection
 * Synchronously checks device signals on page load to prevent FOUC.
 * Heavier operations (CPU benchmarks, GPU/WebGL details) are deferred to requestIdleCallback.
 */
(function () {
  'use strict';
  try {
    var ROOT = document.documentElement;
    // Fast path: restore from cached device signals to prevent heavy re-calculation
    try {
      var cached = localStorage.getItem('tolo-device-signals');
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.score !== undefined) {
          var m = parsed.saveData ? 'ultra-lite' : (parsed.score < 20 ? 'ultra-lite' : (parsed.score < 35 ? 'saver' : (parsed.score < 50 ? 'lite' : (parsed.score < 75 ? 'balanced' : 'performance'))));
          ROOT.setAttribute('data-perf-mode', m);
          ROOT.setAttribute('data-perf-ready', '1');
          ROOT.classList.remove('efficiency-mode', 'lite-mode', 'ultra-lite-mode');
          if (m === 'saver') ROOT.classList.add('efficiency-mode');
          else if (m === 'lite') ROOT.classList.add('lite-mode');
          else if (m === 'ultra-lite') ROOT.classList.add('efficiency-mode', 'ultra-lite-mode');
          return;
        }
      }
    } catch (_e) { /* intentionally empty — localStorage may be unavailable */ }

    var nav = navigator;
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    var score = 50;
    var signals = {};

    // ── Memory ──────────────────────────────────────────────
    var mem = nav.deviceMemory;
    signals.deviceMemory = typeof mem === 'number' ? mem : null;
    if (typeof mem === 'number') {
      if (mem >= 8) score += 25;
      else if (mem >= 4) score += 10;
      else if (mem >= 2) score -= 5;
      else score -= 25;
    }

    // ── CPU cores ───────────────────────────────────────────
    var cores = nav.hardwareConcurrency;
    signals.hardwareConcurrency = typeof cores === 'number' ? cores : null;
    if (typeof cores === 'number') {
      if (cores >= 8) score += 20;
      else if (cores >= 4) score += 5;
      else if (cores >= 2) score -= 10;
      else score -= 25;
    }

    // ── Network ─────────────────────────────────────────────
    var connType = (conn && conn.effectiveType) || '4g';
    var downlink = (conn && conn.downlink) || null;
    var rtt     = (conn && conn.rtt)      || null;
    signals.effectiveType = connType;
    signals.downlink      = downlink;
    signals.rtt           = rtt;
    signals.saveData      = !!(conn && conn.saveData);

    if (connType === '4g')      score += 10;
    else if (connType === '3g')      score -= 15;
    else if (connType === '2g')      score -= 30;
    else if (connType === 'slow-2g') score -= 40;

    if (signals.saveData)          score -= 30;
    if (downlink && downlink < 1.5) score -= 15;
    if (rtt      && rtt      > 500) score -= 10;

    // ── UA-based device class ───────────────────────────────
    var ua       = nav.userAgent || '';
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    var isTablet = /iPad|Android(?!.*Mobile)/i.test(ua) ||
                   (nav.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    signals.isMobile = isMobile;
    signals.isTablet = isTablet;

    if (isMobile && typeof cores === 'number' && cores < 4)  score -= 15;
    if (isMobile && typeof cores === 'number' && cores <= 2)  score -= 10;
    if (isTablet)                                              score += 5;

    // ── Media queries ───────────────────────────────────────
    try {
      if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
        score -= 25; signals.reducedData = true;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        signals.reducedMotion = true;
      }
    } catch (_e) { /* matchMedia may not be available */ }

    // ── Clamp & decide ──────────────────────────────────────
    score = Math.max(0, Math.min(100, score));
    signals.score = score;

    var mode;
    if (signals.saveData)                       mode = 'ultra-lite';
    else if (connType === 'slow-2g' || connType === '2g') mode = 'ultra-lite';
    else if (score < 20)                        mode = 'ultra-lite';
    else if (score < 35)                        mode = 'saver';
    else if (score < 50)                        mode = 'lite';
    else if (score < 75)                        mode = 'balanced';
    else                                        mode = 'performance';

    applyMode(mode);

    try { localStorage.setItem('tolo-device-signals', JSON.stringify(signals)); } catch (_e) { /* storage quota may be exceeded */ }

    function applyMode(m) {
      ROOT.classList.remove('efficiency-mode', 'lite-mode', 'ultra-lite-mode');
      if (m === 'saver')      ROOT.classList.add('efficiency-mode');
      else if (m === 'lite')  ROOT.classList.add('lite-mode');
      else if (m === 'ultra-lite') {
        ROOT.classList.add('efficiency-mode', 'ultra-lite-mode');
      }
      ROOT.setAttribute('data-perf-mode', m);
      ROOT.setAttribute('data-perf-ready', '1');
    }

    // ── DEFERRED: heavy CPU benchmark + WebGL GPU detection ──
    // Runs AFTER paint so it never blocks First Contentful Paint.
    var deferHeavy = function () {
      try {
        // CPU benchmark
        var t0 = performance.now();
        var acc = 0;
        for (var i = 0; i < 50000; i++) { acc += Math.sqrt(i) * Math.sin(i); }
        var dt = performance.now() - t0;
        signals.cpuBenchMs = Math.round(dt);
        var cpuAdj = 0;
        if (dt > 9) cpuAdj = -25;
        else if (dt > 5) cpuAdj = -12;
        else if (dt < 1.5)  cpuAdj =   5;
        // WebGL GPU detection
        try {
          var canvas = document.createElement('canvas');
          var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl) {
            var ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
              var renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
              signals.gpuRenderer = String(renderer).slice(0, 120);
              if (/SwiftShader|Software|llvmpipe|Microsoft Basic/i.test(renderer)) {
                cpuAdj -= 30; signals.gpuType = 'software';
              } else if (/Mali-4|Adreno \(TM\) [12]\d\d|PowerVR SGX/i.test(renderer)) {
                cpuAdj -= 10; signals.gpuType = 'weak';
              } else {
                signals.gpuType = 'hardware';
              }
            }
          } else {
            cpuAdj -= 15; signals.gpuType = 'none';
          }
        } catch (_e) { signals.gpuType = 'unknown'; }
        // Re-evaluate mode with refined score
        var refined = Math.max(0, Math.min(100, score + cpuAdj));
        signals.score = refined;
        var refined_mode;
        if (signals.saveData || connType === 'slow-2g' || connType === '2g') {
          refined_mode = 'ultra-lite';
        } else if (refined < 20 || signals.gpuType === 'software') {
          refined_mode = 'ultra-lite';
        } else if (refined < 35) { refined_mode = 'saver'; }
        else if (refined < 50)   { refined_mode = 'lite'; }
        else if (refined < 75)   { refined_mode = 'balanced'; }
        else                     { refined_mode = 'performance'; }
        // Only downgrade, never upgrade after the fact
        var order = ['performance','balanced','lite','saver','ultra-lite'];
        var cur_idx = order.indexOf(ROOT.getAttribute('data-perf-mode') || 'balanced');
        var new_idx = order.indexOf(refined_mode);
        if (new_idx > cur_idx) applyMode(refined_mode);
        try { localStorage.setItem('tolo-device-signals', JSON.stringify(signals)); } catch(_e) { /* storage quota may be exceeded */ }
      } catch (_e) { /* benchmark or GPU detection failed silently */ }
    };

    // Battery check (async, never blocking)
    try {
      if (nav.getBattery) {
        nav.getBattery().then(function (bat) {
          if (bat.level <= 0.15 && !bat.charging) {
            ROOT.setAttribute('data-low-battery', '1');
            var cur = ROOT.getAttribute('data-perf-mode');
            if (cur === 'performance' || cur === 'balanced') applyMode('saver');
          }
        }).catch(function () {});
      }
    } catch (e) {}

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(deferHeavy, { timeout: 3000 });
    } else {
      // Fallback: run after first paint (~100ms)
      setTimeout(deferHeavy, 100);
    }

  } catch (_e) {
    try { document.documentElement.setAttribute('data-perf-mode', 'balanced'); } catch (_e2) { /* DOM may not be ready */ }
  }
})();
