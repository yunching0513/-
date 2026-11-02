/**
 * 介面渲染：只負責把資料變成 DOM，不直接操作地圖。
 *
 * 圖表規格依 dataviz 規範：橫條 ≤24px 厚、資料端 4px 圓角而基線側方角、
 * 相鄰橫條之間留 2px 表面間隙、數值一律直接標在條旁（不靠讀者比對座標軸），
 * 每一組橫條都附帶可切換的表格檢視。
 */
window.AMS = window.AMS || {};
(function (AMS) {
  'use strict';

  const sym = () => AMS.symbols;
  const cat = () => AMS.catalog;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      // aria-* 的 false 是有意義的值，必須寫成字串；HTML 的布林屬性則是有無之分
      if (k.startsWith('aria-')) {
        if (v !== null && v !== undefined) node.setAttribute(k, String(v));
        continue;
      }
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of [].concat(children || [])) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  const nf = new Intl.NumberFormat('zh-Hant');
  const fmt = (n) => nf.format(Math.round(n));
  const fmt1 = (n) => nf.format(Math.round(n * 10) / 10);
  /** 密度用：>=1 給一位小數，0 到 1 之間給兩位，避免小值全被捨成 0 */
  const fmtDensity = (n) => {
    if (!n) return '0';
    if (n >= 1) return nf.format(Math.round(n * 10) / 10);
    return (Math.round(n * 100) / 100).toFixed(2);
  };

  function fmtBytes(b) {
    if (!b) return '';
    return b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';
  }

  function fmtDistance(m) {
    if (!isFinite(m)) return '無';
    return m < 950 ? fmt(m) + '公尺' : fmt1(m / 1000) + '公里';
  }

  /** 來源資料偶爾夾帶 HTML 標記（例如綠屋頂的 Daktype），顯示前一律剝掉 */
  function stripTags(value) {
    return String(value).replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  /**
   * 荷蘭文屬性值 → 中文。
   * 圖層設了 valueSplit 時，組合值（'Groen - Geel'）會逐段翻譯後以「＋」接起來。
   */
  function trShort(layer, value) {
    const raw = stripTags(value);
    const m = (layer && layer.valueMap) || null;
    if (!m) return raw;
    if (m[value]) return m[value];
    const sep = layer.valueSplit;
    if (sep && raw.includes(sep.trim())) {
      const parts = raw.split(sep).map((x) => x.trim());
      if (parts.every((x) => m[x])) return parts.map((x) => m[x]).join('＋');
    }
    return raw;
  }

  /** 翻譯後附上荷蘭文原文，讓讀者能回溯原始欄位值 */
  function tr(layer, value) {
    if (value === null || value === undefined || value === '') return '';
    const raw = stripTags(value);
    const zh = trShort(layer, value);
    return zh !== raw ? zh + '（' + raw + '）' : raw;
  }

  // ── 圖層清單 ────────────────────────────────────────────────

  /**
   * @param {HTMLElement} root
   * @param {object} state { active:Set, loading:Set, errors:Map, filters:Object }
   * @param {object} handlers { onToggle, onFacet }
   */
  function renderLayerGroups(root, state, handlers) {
    root.textContent = '';
    for (const theme of cat().THEMES) {
      const layers = cat().LAYERS.filter((l) => l.theme === theme.id);
      const group = el('div', { class: 'group' }, [
        el('div', { class: 'group-head' }, [
          el('span', { class: 'swatch', style: 'background: var(--series-' + theme.id + ')' }),
          el('span', { text: theme.label }),
          el('span', { class: 'nl', text: theme.nl }),
        ]),
      ]);
      for (const layer of layers) {
        group.appendChild(layerRow(layer, theme, state, handlers));
        if (state.active.has(layer.id) && layer.facet) {
          const facet = facetControl(layer, state, handlers);
          if (facet) group.appendChild(facet);
        }
      }
      root.appendChild(group);
    }
  }

  function layerRow(layer, theme, state, handlers) {
    const on = state.active.has(layer.id);
    const loading = state.loading.has(layer.id);
    const err = state.errors.get(layer.id);

    const label = el('label', { class: 'layer' }, [
      el('input', {
        type: 'checkbox', checked: on, 'data-layer': layer.id,
        onchange: (e) => handlers.onToggle(layer.id, e.target.checked),
      }),
      el('span', {
        class: 'sym',
        style: 'color: var(--series-' + theme.id + ')',
        html: sym().svg(layer.icon, 15),
      }),
      el('span', { class: 'meta' }, [
        el('span', { class: 'name' }, [
          layer.name,
          layer.heavy ? el('span', { class: 'badge', title: '資料量較大，載入需要一點時間', text: fmtBytes(layer.bytes) }) : null,
        ]),
        el('span', { class: 'nl', text: layer.nl }),
        el('span', { class: 'count', text: fmt(layer.count) + '筆' }),
        err ? el('span', { class: 'err', text: ' 載入失敗：' + err }) : null,
      ]),
      loading ? el('span', { class: 'spin', role: 'status', 'aria-label': '載入中' }) : null,
    ]);
    return label;
  }

  function facetControl(layer, state, handlers) {
    const data = AMS.api.peek(layer.id);
    if (!data) return null;
    const key = layer.facet.key;
    const counts = new Map();
    for (const f of data.features) {
      const v = (f.properties || {})[key];
      if (v === null || v === undefined || v === '') continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    if (counts.size < 2 || counts.size > 24) return null;

    const selected = state.filters[layer.id] || null; // null = 全部
    const values = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    return el('div', { class: 'facet' }, [
      el('div', { class: 'facet-label', text: layer.facet.label + '（點選以篩選）' }),
      el('div', { class: 'chips' }, [
        el('button', {
          type: 'button', class: 'chip', 'aria-pressed': !selected,
          onclick: () => handlers.onFacet(layer.id, null),
        }, ['全部', el('span', { class: 'n', text: fmt(data.features.length) })]),
        ...values.map(([v, n]) => el('button', {
          type: 'button', class: 'chip',
          'aria-pressed': !!(selected && selected.has(v)),
          title: String(v),
          onclick: () => handlers.onFacet(layer.id, v),
        }, [trShort(layer, v), el('span', { class: 'n', text: fmt(n) })])),
      ]),
    ]);
  }

  function renderBoundaryList(root, state, handlers) {
    root.textContent = '';
    for (const b of cat().BOUNDARIES) {
      root.appendChild(el('label', { class: 'layer' }, [
        el('input', {
          type: 'checkbox', checked: state.activeBoundaries.has(b.id),
          onchange: (e) => handlers.onBoundary(b.id, e.target.checked),
        }),
        el('span', { class: 'sym', style: 'color: var(--boundary)', html: sym().svg('boundary', 15) }),
        el('span', { class: 'meta' }, [
          el('span', { class: 'name', text: b.name }),
          el('span', { class: 'nl', text: b.nl }),
          el('span', { class: 'count', text: fmt(b.count) + '區' }),
        ]),
        state.loading.has(b.id) ? el('span', { class: 'spin', 'aria-label': '載入中' }) : null,
      ]));
    }
  }

  // ── 圖例 ────────────────────────────────────────────────────

  function renderLegend(root, state) {
    root.textContent = '';
    root.appendChild(el('h2', { text: '圖例' }));
    const active = cat().LAYERS.filter((l) => state.active.has(l.id));
    if (!active.length && !state.activeBoundaries.size) {
      root.appendChild(el('div', { class: 'empty', text: '尚未開啟圖層' }));
      return;
    }
    for (const layer of active) {
      root.appendChild(el('div', { class: 'legend-row' }, [
        el('span', { class: 'sym', style: 'color: var(--series-' + layer.theme + ')', html: sym().svg(layer.icon, 15) }),
        el('span', { class: 'nm', title: layer.name + '｜' + layer.nl, text: layer.name }),
      ]));
    }
    for (const b of cat().BOUNDARIES) {
      if (!state.activeBoundaries.has(b.id)) continue;
      root.appendChild(el('div', { class: 'legend-row' }, [
        el('span', { class: 'sym', style: 'color: var(--boundary)', html: sym().svg('boundary', 15) }),
        el('span', { class: 'nm', text: b.name }),
      ]));
    }
  }

  // ── popup ───────────────────────────────────────────────────

  function popupHtml(layer, props) {
    const title = (() => {
      try { return (layer.title && layer.title(props)) || layer.name; }
      catch (e) { return layer.name; }
    })();

    const rows = (layer.fields || [])
      .map(([key, label]) => [label, props[key]])
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([label, v]) => {
        const s = String(v);
        const cell = /^https?:\/\//i.test(s)
          ? '<a href="' + escapeAttr(s) + '" target="_blank" rel="noopener">開啟連結</a>'
          : escapeHtml(tr(layer, v));
        return '<tr><th>' + escapeHtml(label) + '</th><td>' + cell + '</td></tr>';
      })
      .join('');

    return '<div class="pop-head">' +
             '<span class="sym" style="color: var(--series-' + layer.theme + ')">' + sym().svg(layer.icon, 16) + '</span>' +
             '<span class="t">' + escapeHtml(String(title || layer.name)) + '</span>' +
           '</div>' +
           '<div class="pop-layer">' + escapeHtml(layer.name) + '｜' + escapeHtml(layer.nl) + '</div>' +
           (rows ? '<table class="pop">' + rows + '</table>' : '');
  }

  function boundaryPopupHtml(boundary, props) {
    const name = props[boundary.nameField] || '未命名';
    const area = props[boundary.areaField];
    return '<div class="pop-head">' +
             '<span class="sym" style="color: var(--boundary)">' + sym().svg('boundary', 16) + '</span>' +
             '<span class="t">' + escapeHtml(String(name)) + '</span>' +
           '</div>' +
           '<div class="pop-layer">' + escapeHtml(boundary.name) + '</div>' +
           (area ? '<table class="pop"><tr><th>面積</th><td>' + fmt1(area / 1e6) + '平方公里</td></tr></table>' : '');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const escapeAttr = escapeHtml;

  // ── 分析結果 ────────────────────────────────────────────────

  function renderAnalysis(root, result, opts) {
    root.textContent = '';
    const outer = result.score.outerMinutes;
    const bands = result.bands;

    // 主結論：一個數字，不做成圖表
    root.appendChild(el('div', { class: 'score' }, [
      el('div', {}, [
        el('div', { class: 'hero' }, [
          String(result.score.covered),
          el('span', { class: 'of', text: ' / ' + result.score.total }),
        ]),
      ]),
      el('div', { class: 'cap' }, [
        '步行' + outer + '分鐘（有效半徑' + fmt(bands[bands.length - 1].radius) + '公尺）內，',
        '六大生活機能中有' + result.score.covered + '項至少找得到一處設施。',
      ]),
    ]));

    // 機能領域：單一數列，所以用同一個色相，數值直接標在條旁
    const maxCount = Math.max(1, ...cat().FUNCTIONS.map((f) => result.byFunction[f.id].counts[outer]));
    const list = el('div', { class: 'fn-list' });
    for (const fn of cat().FUNCTIONS) {
      const n = result.byFunction[fn.id].counts[outer];
      const pct = Math.round((n / maxCount) * 100);
      list.appendChild(el('div', {
        class: 'fn-row',
        title: fn.label + '（' + fn.nl + '）：' + fmt(n) + '處｜' + fn.desc,
      }, [
        el('div', { class: 'fn-name' }, [el('b', { text: fn.label }), ' ' + fn.nl]),
        el('div', { class: 'bar-track' }, [
          el('div', { class: 'bar-fill' + (n === 0 ? ' zero' : ''), style: 'width: ' + (n === 0 ? 2 : Math.max(pct, 3)) + '%' }),
        ]),
        el('div', { class: 'fn-val', text: fmt(n) }),
      ]));
    }
    root.appendChild(el('div', {}, [
      el('div', { class: 'group-head', text: '各機能領域的設施數（' + outer + '分鐘圈內）' }),
      list,
    ]));

    // 分圈數字表：三個圈層的比較用表格最清楚
    const bandTable = el('table', { class: 'data' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: '機能領域' }),
        ...bands.map((b) => el('th', { class: 'num', text: b.minutes + '分' })),
      ])]),
      el('tbody', {}, cat().FUNCTIONS.map((fn) => el('tr', {}, [
        el('td', { text: fn.label }),
        ...bands.map((b) => el('td', { class: 'num', text: fmt(result.byFunction[fn.id].counts[b.minutes]) })),
      ]))),
    ]);
    root.appendChild(el('div', { class: 'table-wrap' }, [bandTable]));

    // 各圖層最近設施
    const withData = result.perLayer.filter((e) => e.features.length);
    if (withData.length) {
      withData.sort((a, b) => a.nearest.distance - b.nearest.distance);
      const rows = withData.map((entry) => {
        const l = entry.layer;
        let name = '';
        try { name = (l.title && l.title(entry.nearest.feature.properties || {})) || ''; } catch (e) { /* 無標題就留空 */ }
        return el('div', {
          class: 'dist-row',
          title: l.name + '：最近一處' + fmtDistance(entry.nearest.distance) + (name ? '（' + name + '）' : ''),
        }, [
          el('span', { class: 'sym', style: 'color: var(--series-' + l.theme + ')', html: sym().svg(l.icon, 14) }),
          el('span', { class: 'nm' }, [l.name, name ? el('span', { class: 'nl', text: '　' + name }) : null]),
          el('span', { class: 'dv', text: fmtDistance(entry.nearest.distance) + '　' + fmt(entry.counts[outer]) + '處' }),
        ]);
      });
      root.appendChild(el('div', {}, [
        el('div', { class: 'group-head', text: '各圖層最近的一處（直線距離）' }),
        el('div', { class: 'dist-list' }, rows),
      ]));
    }

    const missing = cat().LAYERS.filter((l) => l.fn && !result.perLayer.some((e) => e.layer.id === l.id));
    if (missing.length) {
      root.appendChild(el('p', { class: 'hint', text: '未納入計算（尚未載入）：' + missing.map((l) => l.name).join('、') }));
    }

    root.appendChild(el('div', { class: 'btn-row' }, [
      el('button', {
        type: 'button', class: 'btn', text: '下載結果CSV',
        onclick: () => download('amsterdam-15min-' + result.center[1].toFixed(5) + '_' + result.center[0].toFixed(5) + '.csv',
          analysisCsv(result), 'text/csv'),
      }),
    ]));
  }

  function analysisCsv(result) {
    const bands = result.bands;
    const head = ['type', 'name', 'name_nl', ...bands.map((b) => 'n_' + b.minutes + 'min'), 'nearest_m'];
    const lines = [head.join(',')];
    for (const fn of cat().FUNCTIONS) {
      lines.push(csvRow(['function', fn.label, fn.nl,
        ...bands.map((b) => result.byFunction[fn.id].counts[b.minutes]), '']));
    }
    for (const entry of result.perLayer) {
      lines.push(csvRow(['layer', entry.layer.name, entry.layer.nl,
        ...bands.map((b) => entry.counts[b.minutes]),
        isFinite(entry.nearest.distance) ? Math.round(entry.nearest.distance) : '']));
    }
    const meta = [
      '', '# 中心點lat,lng: ' + result.center[1].toFixed(6) + ',' + result.center[0].toFixed(6),
      '# 步行速度m/min: ' + result.options.speed,
      '# 繞行係數: ' + result.options.detour,
      '# 有效半徑m: ' + bands.map((b) => b.minutes + '分=' + Math.round(b.radius)).join(' '),
      '# 資料來源: Gemeente Amsterdam Maps Data (maps.amsterdam.nl/open_geodata/)',
      '# 說明: 直線緩衝區近似，非路網等時圈',
    ];
    return lines.concat(meta).join('\n');
  }

  // ── 行政區統計 ──────────────────────────────────────────────

  function renderStats(root, stats, layer, mode, showTable) {
    root.textContent = '';
    const areas = stats.areas;
    const valueOf = (a) => mode === 'density'
      ? (a.areaKm2 > 0 ? a.counts[layer.id] / a.areaKm2 : 0)
      : a.counts[layer.id];

    const rows = areas
      .map((a) => ({ name: a.name, count: a.counts[layer.id] || 0, areaKm2: a.areaKm2, value: valueOf(a) }))
      .sort((x, y) => y.value - x.value);

    const shown = rows.slice(0, 24);
    const unit = mode === 'density' ? '處／km²' : '處';
    const max = Math.max(1, ...shown.map((r) => r.value));

    root.appendChild(el('div', { class: 'group-head' }, [
      el('span', { class: 'swatch', style: 'background: var(--series-' + layer.theme + ')' }),
      el('span', { text: layer.name }),
      el('span', { class: 'nl', text: mode === 'density' ? '每平方公里' : '總數' }),
    ]));

    if (stats.total > stats.matched) {
      root.appendChild(el('p', { class: 'hint',
        text: '已歸類' + fmt(stats.matched) + '筆，共' + fmt(stats.total) + '筆。' +
              '差額的' + fmt(stats.total - stats.matched) + '筆落在水域或市界之外（界線用的是排除水域的版本），未計入任何一區。' }));
    }

    if (showTable) {
      root.appendChild(el('div', { class: 'table-wrap' }, [
        el('table', { class: 'data' }, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: '區域' }),
            el('th', { class: 'num', text: '設施數' }),
            el('th', { class: 'num', text: '面積km²' }),
            el('th', { class: 'num', text: '密度／km²' }),
          ])]),
          el('tbody', {}, rows.map((r) => el('tr', {}, [
            el('td', { text: r.name }),
            el('td', { class: 'num', text: fmt(r.count) }),
            el('td', { class: 'num', text: fmt1(r.areaKm2) }),
            el('td', { class: 'num', text: fmtDensity(r.areaKm2 > 0 ? r.count / r.areaKm2 : 0) }),
          ]))),
        ]),
      ]));
      return;
    }

    const list = el('div', { class: 'fn-list' });
    for (const r of shown) {
      list.appendChild(el('div', {
        class: 'fn-row',
        title: r.name + '：' + fmt(r.count) + '處，面積' + fmt1(r.areaKm2) + 'km²，密度' + fmtDensity(r.areaKm2 > 0 ? r.count / r.areaKm2 : 0) + '處／km²',
      }, [
        el('div', { class: 'fn-name', text: r.name }),
        el('div', { class: 'bar-track' }, [
          el('div', {
            class: 'bar-fill' + (r.value === 0 ? ' zero' : ''),
            style: 'width: ' + (r.value === 0 ? 2 : Math.max(Math.round((r.value / max) * 100), 3)) + '%',
          }),
        ]),
        el('div', { class: 'fn-val', text: mode === 'density' ? fmtDensity(r.value) : fmt(r.value) }),
      ]));
    }
    root.appendChild(list);
    root.appendChild(el('p', { class: 'hint', text: '單位：' + unit + (rows.length > shown.length ? '　僅顯示前24名，完整結果請切換表格檢視或下載CSV。' : '') }));
  }

  function statsCsv(stats, layer, unitName) {
    // 依密度由高到低輸出，接手的人開檔就能看出排名
    const areas = stats.areas.slice().sort((x, y) => {
      const dx = x.areaKm2 > 0 ? (x.counts[layer.id] || 0) / x.areaKm2 : 0;
      const dy = y.areaKm2 > 0 ? (y.counts[layer.id] || 0) / y.areaKm2 : 0;
      return dy - dx;
    });
    const lines = ['area,count,area_km2,density_per_km2'];
    for (const a of areas) {
      const n = a.counts[layer.id] || 0;
      lines.push(csvRow([a.name, n, a.areaKm2.toFixed(4), a.areaKm2 > 0 ? (n / a.areaKm2).toFixed(3) : '']));
    }
    lines.push('', '# 圖層: ' + layer.name + ' / ' + layer.nl + ' (' + layer.kaartlaag + ')');
    lines.push('# 統計單位: ' + unitName);
    lines.push('# 已歸類/總數: ' + stats.matched + '/' + stats.total + '（差額落在水域或市界外）');
    lines.push('# 資料來源: Gemeente Amsterdam Maps Data (maps.amsterdam.nl/open_geodata/)');
    return lines.join('\n');
  }

  function csvRow(values) {
    return values.map((v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }

  function download(filename, text, mime) {
    // BOM 讓 Excel 正確辨識 UTF-8
    const blob = new Blob(['﻿' + text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  AMS.ui = {
    el, fmt, fmt1, fmtDensity, fmtBytes, fmtDistance, tr, trShort, stripTags,
    renderLayerGroups, renderBoundaryList, renderLegend,
    popupHtml, boundaryPopupHtml,
    renderAnalysis, renderStats, statsCsv, download, escapeHtml,
  };
})(window.AMS);
