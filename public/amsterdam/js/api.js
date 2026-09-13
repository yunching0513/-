/**
 * 阿姆斯特丹開放地理資料的取用層。
 *
 * 端點回應標頭帶有 access-control-allow-origin: *，因此瀏覽器可直接跨域取用，
 * 不需要自架 proxy。取回的 GeoJSON 會存進記憶體與 sessionStorage（小於 1.5 MB 者），
 * 同一個瀏覽分頁重複切換圖層時不會重打伺服器。
 */
window.AMS = window.AMS || {};
(function (AMS) {
  'use strict';

  const BASE = 'https://maps.amsterdam.nl/open_geodata/geojson_lnglat.php';
  const EXCEL = 'https://maps.amsterdam.nl/open_geodata/excel.php';
  const SS_PREFIX = 'ams-geo:';
  const SS_MAX_BYTES = 1_500_000;

  const memory = new Map();   // id → GeoJSON
  const inflight = new Map(); // id → Promise

  function url(spec) {
    return BASE + '?KAARTLAAG=' + encodeURIComponent(spec.kaartlaag) +
           '&THEMA=' + encodeURIComponent(spec.thema);
  }

  function excelUrl(spec) {
    return EXCEL + '?KAARTLAAG=' + encodeURIComponent(spec.kaartlaag) +
           '&THEMA=' + encodeURIComponent(spec.thema);
  }

  function readSession(id) {
    try {
      const raw = sessionStorage.getItem(SS_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null; // 隱私模式或配額用盡：當作沒有快取
    }
  }

  function writeSession(id, text) {
    if (text.length > SS_MAX_BYTES) return;
    try {
      sessionStorage.setItem(SS_PREFIX + id, text);
    } catch (e) {
      /* 配額滿了就放棄快取，不影響功能 */
    }
  }

  /**
   * 取得一個圖層的 GeoJSON。同一圖層併發呼叫只會送出一次請求。
   * @param {object} spec 圖層設定（需有 id / kaartlaag / thema）
   * @returns {Promise<object>} FeatureCollection
   */
  function fetchLayer(spec) {
    if (memory.has(spec.id)) return Promise.resolve(memory.get(spec.id));
    if (inflight.has(spec.id)) return inflight.get(spec.id);

    const cached = readSession(spec.id);
    if (cached) {
      memory.set(spec.id, cached);
      return Promise.resolve(cached);
    }

    const p = fetch(url(spec), { mode: 'cors', credentials: 'omit' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status + '（' + spec.kaartlaag + '）');
        return res.text();
      })
      .then((text) => {
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('回傳的不是有效JSON（' + spec.kaartlaag + '）');
        }
        if (!data || data.type !== 'FeatureCollection') {
          throw new Error('回傳的不是FeatureCollection（' + spec.kaartlaag + '）');
        }
        data.features = (data.features || []).filter((f) => f && f.geometry);
        memory.set(spec.id, data);
        writeSession(spec.id, text);
        return data;
      })
      .finally(() => inflight.delete(spec.id));

    inflight.set(spec.id, p);
    return p;
  }

  /** 已在記憶體中的圖層（不觸發請求） */
  function peek(id) {
    return memory.get(id) || null;
  }

  function clearCache() {
    memory.clear();
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(SS_PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch (e) { /* 忽略 */ }
  }

  AMS.api = { fetchLayer, peek, clearCache, url, excelUrl };
})(window.AMS);
