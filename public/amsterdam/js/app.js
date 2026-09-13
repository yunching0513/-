/**
 * 主程式：把圖層目錄、資料取用、分析與介面接到 Leaflet 地圖上。
 *
 * 一個刻意的區分：「資料已載入」與「圖層顯示在地圖上」是兩件事。
 * 15分鐘分析需要十幾個圖層的資料，但把它們全部畫上地圖只會一團亂，
 * 所以分析只確保資料進了快取，可見性仍由使用者在圖層分頁決定。
 */
(function (AMS) {
  'use strict';

  const { ui, api, geo, analysis, catalog, symbols } = AMS;
  const el = ui.el;

  const AMSTERDAM = { center: [52.3676, 4.9041], zoom: 12 };
  const DAM_SQUARE = [4.8932, 52.3731]; // [lng, lat]

  const BASEMAPS = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };
  const ATTRIBUTION =
    '地理資料 <a href="https://maps.amsterdam.nl/open_geodata/" target="_blank" rel="noopener">Gemeente Amsterdam</a>｜' +
    '底圖 &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 貢獻者、&copy; CARTO';

  const state = {
    active: new Set(),            // 顯示中的圖層 id
    activeBoundaries: new Set(),  // 顯示中的界線 id
    loading: new Set(),
    errors: new Map(),
    filters: {},                  // layerId → Set(值) 或 undefined
    picking: false,
    center: null,                 // [lng, lat]
    statsAreas: null,
    statsTable: false,
    statsUnitId: 'stadsdelen',
  };

  let map, tileLayer, canvasRenderer;
  const rendered = new Map();     // layerId → L.LayerGroup
  const boundaryLayers = new Map();
  let analysisGroup;

  const dom = {};

  // ── 主題 ────────────────────────────────────────────────────

  function currentMode() {
    const forced = document.documentElement.getAttribute('data-theme');
    if (forced) return forced;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function color(role) {
    return catalog.PALETTE[currentMode()][role];
  }

  function surfaceColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--surface-1').trim() || '#fcfcfb';
  }

  function applyTheme(mode) {
    if (mode) {
      document.documentElement.setAttribute('data-theme', mode);
      try { localStorage.setItem('ams-theme', mode); } catch (e) { /* 忽略 */ }
    }
    if (tileLayer) tileLayer.setUrl(BASEMAPS[currentMode()]);
    for (const id of state.active) restyleLayer(id);
    for (const id of state.activeBoundaries) restyleBoundary(id);
    if (state.center) drawBands();
  }

  // ── 地圖 ────────────────────────────────────────────────────

  function initMap() {
    map = L.map('map', {
      center: AMSTERDAM.center,
      zoom: AMSTERDAM.zoom,
      zoomControl: true,
      preferCanvas: false,
      worldCopyJump: false,
    });
    canvasRenderer = L.canvas({ padding: 0.3 });
    tileLayer = L.tileLayer(BASEMAPS[currentMode()], {
      attribution: ATTRIBUTION, maxZoom: 19, minZoom: 9, detectRetina: true,
    }).addTo(map);
    analysisGroup = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      if (!state.picking) return;
      setCenter([e.latlng.lng, e.latlng.lat]);
    });
  }

  // ── 圖層繪製 ────────────────────────────────────────────────

  function passesFilter(layerId, props) {
    const sel = state.filters[layerId];
    if (!sel || !sel.size) return true;
    const layer = catalog.layerById(layerId);
    return sel.has(props[layer.facet.key]);
  }

  function styleFor(layer) {
    const c = color(layer.theme);
    if (layer.render === 'line') return { color: c, weight: 2, opacity: .9, lineCap: 'round', lineJoin: 'round' };
    return { color: c, weight: 1.5, opacity: .85, fillColor: c, fillOpacity: .12 };
  }

  function buildLayer(layer, data) {
    const c = color(layer.theme);
    const surface = surfaceColor();

    return L.geoJSON(data, {
      renderer: layer.render === 'dot' ? canvasRenderer : undefined,
      filter: (f) => passesFilter(layer.id, f.properties || {}),
      style: () => styleFor(layer),
      pointToLayer: (f, latlng) => {
        if (layer.render === 'icon') {
          return L.marker(latlng, {
            keyboard: false,
            icon: L.divIcon({
              className: 'ams-icon',
              html: '<i style="color:' + c + '">' + symbols.svg(layer.icon, 13, 1.9) + '</i>',
              iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12],
            }),
          });
        }
        // 2px 表面環：重疊時仍看得出是兩個點
        return L.circleMarker(latlng, {
          renderer: canvasRenderer,
          radius: 4.5, weight: 2, color: surface, opacity: .9,
          fillColor: c, fillOpacity: .95,
        });
      },
      onEachFeature: (f, lyr) => {
        lyr.bindPopup(() => ui.popupHtml(layer, f.properties || {}), { maxWidth: 320, autoPan: true });
      },
    });
  }

  function restyleLayer(id) {
    const group = rendered.get(id);
    if (!group) return;
    map.removeLayer(group);
    rendered.delete(id);
    const data = api.peek(id);
    if (data) {
      const built = buildLayer(catalog.layerById(id), data);
      built.addTo(map);
      rendered.set(id, built);
    }
  }

  function restyleBoundary(id) {
    const group = boundaryLayers.get(id);
    if (!group) return;
    group.setStyle({ color: color('boundary') });
  }

  async function toggleLayer(id, on) {
    const layer = catalog.layerById(id);
    if (!on) {
      state.active.delete(id);
      const group = rendered.get(id);
      if (group) { map.removeLayer(group); rendered.delete(id); }
      refreshPanels();
      return;
    }

    state.active.add(id);
    state.errors.delete(id);
    refreshPanels();

    try {
      const data = await ensureData(layer);
      if (!state.active.has(id)) return; // 使用者在載入途中關掉了
      const built = buildLayer(layer, data);
      built.addTo(map);
      rendered.set(id, built);
      setStatus(layer.name + '已載入' + ui.fmt(data.features.length) + '筆。');
    } catch (err) {
      state.errors.set(id, err.message || String(err));
      state.active.delete(id);
      setStatus('無法載入' + layer.name + '：' + (err.message || err), 'bad');
    } finally {
      refreshPanels();
    }
  }

  async function ensureData(spec) {
    if (api.peek(spec.id)) return api.peek(spec.id);
    state.loading.add(spec.id);
    refreshPanels();
    try {
      return await api.fetchLayer(spec);
    } finally {
      state.loading.delete(spec.id);
      refreshPanels();
    }
  }

  async function toggleBoundary(id, on) {
    const spec = catalog.BOUNDARIES.find((b) => b.id === id);
    if (!on) {
      state.activeBoundaries.delete(id);
      const group = boundaryLayers.get(id);
      if (group) { map.removeLayer(group); boundaryLayers.delete(id); }
      refreshPanels();
      return;
    }
    state.activeBoundaries.add(id);
    refreshPanels();
    try {
      const data = await ensureData(spec);
      if (!state.activeBoundaries.has(id)) return;
      const group = L.geoJSON(data, {
        style: () => ({ color: color('boundary'), weight: 1, opacity: .85, fill: true, fillOpacity: 0 }),
        onEachFeature: (f, lyr) => lyr.bindPopup(() => ui.boundaryPopupHtml(spec, f.properties || {})),
      }).addTo(map);
      group.bringToBack();
      boundaryLayers.set(id, group);
    } catch (err) {
      state.activeBoundaries.delete(id);
      setStatus('無法載入' + spec.name + '：' + (err.message || err), 'bad');
    } finally {
      refreshPanels();
    }
  }

  function setFacet(layerId, value) {
    if (value === null) delete state.filters[layerId];
    else {
      const sel = state.filters[layerId] || new Set();
      if (sel.has(value)) sel.delete(value); else sel.add(value);
      if (sel.size) state.filters[layerId] = sel; else delete state.filters[layerId];
    }
    if (state.active.has(layerId)) restyleLayer(layerId);
    refreshPanels();
  }

  // ── 15分鐘分析 ──────────────────────────────────────────────

  function analysisOptions() {
    return {
      speed: Number(dom.speed.value),
      detour: Number(dom.detour.value),
      minutes: [5, 10, 15],
      filters: buildFilterFns(),
    };
  }

  function buildFilterFns() {
    const out = {};
    for (const [layerId, sel] of Object.entries(state.filters)) {
      if (!sel || !sel.size) continue;
      const layer = catalog.layerById(layerId);
      out[layerId] = (props) => sel.has(props[layer.facet.key]);
    }
    return out;
  }

  function drawBands() {
    analysisGroup.clearLayers();
    if (!state.center) return;
    const latlng = [state.center[1], state.center[0]];
    const opts = analysisOptions();
    const c = color('mobility');

    const bands = opts.minutes.map((m) => ({ minutes: m, radius: analysis.radiusFor(m, opts) }))
      .sort((a, b) => b.radius - a.radius);

    bands.forEach((band, i) => {
      L.circle(latlng, {
        radius: band.radius,
        color: c, weight: 1.5, opacity: i === 0 ? .5 : .8,
        fill: i === 0, fillColor: c, fillOpacity: .06,
        interactive: false,
      }).addTo(analysisGroup);
      L.marker([latlng[0] + band.radius / 111320, latlng[1]], {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'band-label', html: band.minutes + '分', iconSize: [null, null] }),
      }).addTo(analysisGroup);
    });

    L.marker(latlng, {
      keyboard: false,
      icon: L.divIcon({
        className: 'center-pin',
        html: symbols.svg('pin', 30, 1.6),
        iconSize: [30, 30], iconAnchor: [15, 28],
      }),
    }).addTo(analysisGroup);
  }

  async function setCenter(lngLat) {
    state.center = lngLat;
    state.picking = false;
    document.body.classList.remove('picking');
    map.getContainer().style.cursor = '';
    if (dom.pickHint) { dom.pickHint.remove(); dom.pickHint = null; }
    dom.pickPoint.setAttribute('aria-pressed', 'false');
    drawBands();
    switchTab('analysis');
    await runAnalysis();
  }

  async function runAnalysis() {
    if (!state.center) return;
    const needed = catalog.LAYERS.filter((l) => l.fn && !l.heavy);
    const missing = needed.filter((l) => !api.peek(l.id));

    if (missing.length) {
      dom.analysisOut.textContent = '';
      dom.analysisOut.appendChild(el('p', { class: 'hint', id: 'loadProgress',
        text: '正在取得分析所需的' + missing.length + '個圖層…' }));
      let done = 0;
      const results = await Promise.allSettled(missing.map((l) => ensureData(l).then((r) => {
        done++;
        const p = document.getElementById('loadProgress');
        if (p) p.textContent = '正在取得分析所需的圖層…（' + done + '／' + missing.length + '）';
        return r;
      })));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) setStatus(failed + '個圖層載入失敗，結果以其餘圖層計算。', 'bad');
    }

    const usable = catalog.LAYERS.filter((l) => api.peek(l.id));
    const result = analysis.analyze(state.center, usable, api.peek, analysisOptions());
    ui.renderAnalysis(dom.analysisOut, result);
    drawBands();
    setStatus('分析完成：' + result.score.covered + '／' + result.score.total + '項生活機能可及。', 'ok');
  }

  function startPicking() {
    state.picking = true;
    dom.pickPoint.setAttribute('aria-pressed', 'true');
    map.getContainer().style.cursor = 'crosshair';
    if (!dom.pickHint) {
      dom.pickHint = el('div', { class: 'pick-hint', text: '請在地圖上點一個位置' });
      document.querySelector('.map-wrap').appendChild(dom.pickHint);
    }
    setStatus('選點模式：在地圖上點一個位置。');
  }

  // ── 行政區統計 ──────────────────────────────────────────────

  async function runStats() {
    const layerId = dom.statsLayer.value;
    const layer = catalog.layerById(layerId);
    const unitId = dom.statsUnit.value;
    const boundarySpec = catalog.BOUNDARIES.find((b) => b.id === unitId);
    state.statsUnitId = unitId;

    dom.statsOut.textContent = '';
    dom.statsOut.appendChild(el('p', { class: 'hint', text: '計算中…' }));
    dom.runStats.disabled = true;

    try {
      const [boundary] = await Promise.all([ensureData(boundarySpec), ensureData(layer)]);
      boundary.__nameField = boundarySpec.nameField;
      boundary.__areaField = boundarySpec.areaField;
      // 讓瀏覽器先把「計算中」畫出來再進入同步計算
      await new Promise((r) => setTimeout(r, 0));
      const stats = analysis.districtStats(boundary, [layer], api.peek);
      state.statsAreas = { stats, layer, unitName: boundarySpec.name };
      ui.renderStats(dom.statsOut, stats, layer, dom.statsMode.value, state.statsTable);
      setStatus(boundarySpec.name + '：' + layer.name + '統計完成。', 'ok');
    } catch (err) {
      dom.statsOut.textContent = '';
      dom.statsOut.appendChild(el('p', { class: 'hint', text: '計算失敗：' + (err.message || err) }));
      setStatus('統計失敗：' + (err.message || err), 'bad');
    } finally {
      dom.runStats.disabled = false;
    }
  }

  function rerenderStats() {
    if (!state.statsAreas) return;
    ui.renderStats(dom.statsOut, state.statsAreas.stats, state.statsAreas.layer,
      dom.statsMode.value, state.statsTable);
  }

  // ── 介面更新 ────────────────────────────────────────────────

  function refreshPanels() {
    ui.renderLayerGroups(dom.layerGroups, state, { onToggle: toggleLayer, onFacet: setFacet });
    ui.renderBoundaryList(dom.boundaryList, state, { onBoundary: toggleBoundary });
    ui.renderLegend(dom.legend, state);
  }

  function setStatus(text, kind) {
    dom.status.textContent = '';
    dom.status.appendChild(el('span', { class: kind || '', text }));
  }

  function switchTab(name) {
    for (const key of ['layers', 'analysis', 'stats']) {
      const on = key === name;
      document.getElementById('tab-' + key).setAttribute('aria-selected', String(on));
      document.getElementById('panel-' + key).setAttribute('data-active', String(on));
    }
  }

  // ── 啟動 ────────────────────────────────────────────────────

  function cacheDom() {
    const ids = ['layerGroups', 'boundaryList', 'legend', 'status', 'themeToggle', 'clearLayers',
      'clearCache', 'pickPoint', 'pickDam', 'speed', 'speedVal', 'detour', 'detourVal',
      'analysisOut', 'statsUnit', 'statsLayer', 'statsMode', 'runStats', 'statsTableToggle',
      'statsCsv', 'statsOut'];
    for (const id of ids) dom[id] = document.getElementById(id);
  }

  function wireEvents() {
    for (const key of ['layers', 'analysis', 'stats']) {
      document.getElementById('tab-' + key).addEventListener('click', () => switchTab(key));
    }

    dom.themeToggle.addEventListener('click', () => {
      applyTheme(currentMode() === 'dark' ? 'light' : 'dark');
    });

    dom.clearLayers.addEventListener('click', () => {
      for (const id of [...state.active]) toggleLayer(id, false);
      for (const id of [...state.activeBoundaries]) toggleBoundary(id, false);
    });

    dom.clearCache.addEventListener('click', () => {
      const visible = [...state.active];
      const visibleBoundaries = [...state.activeBoundaries];
      visible.forEach((id) => toggleLayer(id, false));
      visibleBoundaries.forEach((id) => toggleBoundary(id, false));
      api.clearCache();
      state.statsAreas = null;
      dom.statsOut.textContent = '';
      setStatus('快取已清除，下次開啟圖層會重新向阿姆斯特丹取得資料。');
      refreshPanels();
    });

    dom.pickPoint.addEventListener('click', startPicking);
    dom.pickDam.addEventListener('click', () => {
      map.setView([DAM_SQUARE[1], DAM_SQUARE[0]], 14);
      setCenter(DAM_SQUARE.slice());
    });

    const onParam = () => {
      dom.speedVal.textContent = dom.speed.value;
      dom.detourVal.textContent = Number(dom.detour.value).toFixed(2);
    };
    dom.speed.addEventListener('input', onParam);
    dom.detour.addEventListener('input', onParam);
    dom.speed.addEventListener('change', () => { if (state.center) runAnalysis(); });
    dom.detour.addEventListener('change', () => { if (state.center) runAnalysis(); });
    onParam();

    dom.runStats.addEventListener('click', runStats);
    dom.statsMode.addEventListener('change', rerenderStats);
    dom.statsTableToggle.addEventListener('click', () => {
      state.statsTable = !state.statsTable;
      dom.statsTableToggle.setAttribute('aria-pressed', String(state.statsTable));
      rerenderStats();
    });
    dom.statsCsv.addEventListener('click', () => {
      if (!state.statsAreas) { setStatus('請先按「計算」產生統計結果。'); return; }
      const { stats, layer, unitName } = state.statsAreas;
      ui.download('amsterdam-' + layer.id + '-' + state.statsUnitId + '.csv',
        ui.statsCsv(stats, layer, unitName), 'text/csv');
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!document.documentElement.getAttribute('data-theme')) applyTheme(null);
    });
  }

  function fillStatsLayers() {
    for (const theme of catalog.THEMES) {
      const group = el('optgroup', { label: theme.label });
      for (const layer of catalog.LAYERS.filter((l) => l.theme === theme.id)) {
        group.appendChild(el('option', {
          value: layer.id,
          text: layer.name + '（' + ui.fmt(layer.count) + '筆' + (layer.heavy ? '，大檔' : '') + '）',
        }));
      }
      dom.statsLayer.appendChild(group);
    }
    dom.statsLayer.value = 'sport';
  }

  function start() {
    cacheDom();
    try {
      const saved = localStorage.getItem('ams-theme');
      if (saved === 'light' || saved === 'dark') document.documentElement.setAttribute('data-theme', saved);
    } catch (e) { /* 隱私模式：跟隨系統設定 */ }

    initMap();
    fillStatsLayers();
    wireEvents();
    refreshPanels();

    // 開場先給一組輕量圖層，讓地圖不是空的
    toggleBoundary('stadsdelen', true);
    toggleLayer('trammetro_punten', true);
    toggleLayer('parken', true);
    setStatus('資料由maps.amsterdam.nl即時取得。勾選圖層開始探索，或到「15分鐘分析」選一個位置。');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.AMS);
