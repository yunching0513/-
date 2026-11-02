/**
 * 圖層符號集。
 *
 * 顏色只編碼三個主題群，個別圖層的識別由這裡的符號承擔：符號同時出現在
 * 圖例、地圖標記與 popup 標題，所以識別永遠不只靠顏色（符合無障礙要求，
 * 也讓色覺辨識障礙的讀者能區分同一主題色下的不同圖層）。
 *
 * 全部是 24×24 的線稿，描邊使用 currentColor。
 */
window.AMS = window.AMS || {};
(function (AMS) {
  'use strict';

  const P = {
    route:     'M4 18h4a4 4 0 0 0 4-4V10a4 4 0 0 1 4-4h4M4 18l2-2m-2 2 2 2M20 6l-2-2m2 2-2 2',
    tram:      'M7 4h10v11H7zM7 15l-2 5m12-5 2 5M9 20h6M12 4V2M8 8h8',
    community: 'M3 20v-6l5-3 5 3v6M13 20v-9l4-2 4 2v9M6 14.5h2M17 12.5h2M3 20h18',
    toilet:    'M8 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM4 20v-5H3l1.5-6h3L9 15H8v5zM18.5 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM14 20l1.5-5.5h-2L15 9h3l1.5 5.5h-2L19 20z',
    market:    'M4 9h16l-1 11H5zM4 9l2-5h12l2 5M9 13v3m6-3v3',
    food:      'M12 21a7 7 0 0 0 7-7H5a7 7 0 0 0 7 7zM12 7V4M9 7h6M7 11h10',
    culture:   'M4 20V9l8-5 8 5v11M9 20v-6h6v6M4 20h16',
    sport:     'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c-2.5 2.5-2.5 15.5 0 18M12 3c2.5 2.5 2.5 15.5 0 18',
    sportpark: 'M3 6h18v12H3zM12 6v12M3 10h3v4H3m18-4h-3v4h3M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
    play:      'M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM4 20l4-7h8l4 7M8 13l-1 7m10-7 1 7',
    farm:      'M3 20V11l9-6 9 6v9M9 20v-5h6v5M3 20h18M11 8.5h2',
    swim:      'M3 17c1.5 0 1.5 1.5 3 1.5S7.5 17 9 17s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5M6 13.5 12 10l3 2M16.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
    park:      'M12 20v-5M12 15l-4-3h8zM12 12 8.5 9h7zM12 9 9.5 5.5h5zM6 20h12',
    roof:      'M3 12 12 5l9 7M5 12v8h14v-8M9 20v-4h6v4M8.5 9.5c0 1 1 1.5 1.5 1.5M15.5 9.5c0 1-1 1.5-1.5 1.5',
    compost:   'M5 9h14l-1.2 11H6.2zM9 9V6a3 3 0 0 1 6 0v3M9.5 13.5c1 0 1.5.8 2.5.8s1.5-.8 2.5-.8',
    dog:       'M4 10.5 6 6l3 2h6l3-2 2 4.5V16a2 2 0 0 1-2 2h-3l-1 2h-4l-1-2H6a2 2 0 0 1-2-2zM9.5 12.5h.01M14.5 12.5h.01',
    tree:      'M12 21v-6M12 15a5 5 0 0 1-1-9.9 4 4 0 0 1 7.6 1.4A4 4 0 0 1 16 15zM8 21h8',
    pin:       'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    boundary:  'M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13m6-10v13',
  };

  /**
   * 產生 inline SVG 字串。
   * @param {string} name 符號名稱
   * @param {number} size 邊長（px）
   * @param {number} stroke 線寬
   */
  function svg(name, size, stroke) {
    const d = P[name] || P.pin;
    return '<svg viewBox="0 0 24 24" width="' + (size || 18) + '" height="' + (size || 18) +
           '" fill="none" stroke="currentColor" stroke-width="' + (stroke || 1.7) +
           '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
           '<path d="' + d + '"/></svg>';
  }

  AMS.symbols = { svg, has: (n) => Object.prototype.hasOwnProperty.call(P, n) };
})(window.AMS);
