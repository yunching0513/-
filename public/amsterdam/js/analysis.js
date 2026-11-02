/**
 * 15分鐘城市可及性分析。
 *
 * 方法與其限制（介面上也會如實說明）：
 * 這裡畫的是「直線緩衝區」，不是路網等時圈。實際步行必須沿街廓繞行，
 * 因此把直線半徑除以一個繞行係數（circuity / detour ratio）來近似：
 *
 *     有效半徑 = 分鐘數 × 步行速度(m/min) ÷ 繞行係數
 *
 * 預設步速 80 m/min（4.8 km/h，成人平地步行的常用值），繞行係數 1.3
 * （都市路網的實測 circuity 多落在 1.2–1.4）。兩者都可在介面上調整；
 * 係數設為 1.0 就退回單純的直線距離。要得到真正的路網等時圈，
 * 需要另接 OSRM／Valhalla 這類路徑服務，本頁不做這件事。
 */
window.AMS = window.AMS || {};
(function (AMS) {
  'use strict';

  const geo = AMS.geo;

  const DEFAULTS = { speed: 80, detour: 1.3, minutes: [5, 10, 15] };

  /** 某個分鐘數對應的有效直線半徑（公尺） */
  function radiusFor(minutes, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    return (minutes * o.speed) / o.detour;
  }

  /** bbox 是否可能與圓相交（粗篩，寧可放行不可誤殺） */
  function bboxNearby(bb, center, radius) {
    if (!bb) return true;
    const dLat = radius / 111320;
    const dLng = radius / (111320 * Math.cos((center[1] * Math.PI) / 180) || 1);
    return !(bb[2] < center[0] - dLng || bb[0] > center[0] + dLng ||
             bb[3] < center[1] - dLat || bb[1] > center[1] + dLat);
  }

  /**
   * 對單一圖層計算圈內圖徵。
   * @returns {{features: Array, byFunction: Object}}
   */
  function hitsInLayer(layer, data, center, radius, facetFilter) {
    const out = [];
    for (const f of data.features || []) {
      if (facetFilter && !facetFilter(f.properties || {})) continue;
      if (f.geometry && f.geometry.type === 'Point') {
        if (geo.haversine(center, f.geometry.coordinates) > radius) continue;
      } else {
        if (!bboxNearby(geo.bbox(f), center, radius)) continue;
        if (!geo.featureWithinRadius(f, center, radius)) continue;
      }
      out.push(f);
    }
    return out;
  }

  /**
   * 完整的可及性分析。
   * @param {[number,number]} center [lng, lat]
   * @param {Array} layers 要納入計算的圖層設定
   * @param {(id:string)=>object|null} getData 取得已載入資料
   * @param {object} opts { speed, detour, minutes, filters }
   */
  function analyze(center, layers, getData, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const bands = o.minutes.map((m) => ({ minutes: m, radius: radiusFor(m, o) }));
    const maxRadius = Math.max(...bands.map((b) => b.radius));

    const perLayer = [];
    for (const layer of layers) {
      const data = getData(layer.id);
      if (!data) continue;
      const filter = (o.filters && o.filters[layer.id]) || null;
      const within = hitsInLayer(layer, data, center, maxRadius, filter);

      // 逐圈統計：外圈已含內圈，所以由大到小逐一計數即可
      const counts = {};
      for (const band of bands) counts[band.minutes] = 0;
      const nearest = { distance: Infinity, feature: null };
      for (const f of within) {
        const rep = geo.representativePoint(f);
        const d = f.geometry && f.geometry.type === 'Point'
          ? geo.haversine(center, f.geometry.coordinates)
          : (geo.pointInPolygon(center, f.geometry) ? 0 : nearestVertexDistance(center, f));
        for (const band of bands) if (d <= band.radius) counts[band.minutes]++;
        if (d < nearest.distance) { nearest.distance = d; nearest.feature = f; }
        f.__rep = rep;
      }
      perLayer.push({ layer, features: within, counts, nearest });
    }

    // 機能領域覆蓋：每個領域在各圈內有幾個設施
    const byFunction = {};
    for (const fn of AMS.catalog.FUNCTIONS) {
      byFunction[fn.id] = { total: 0, counts: {}, layers: [] };
      for (const band of bands) byFunction[fn.id].counts[band.minutes] = 0;
    }
    for (const entry of perLayer) {
      const { layer } = entry;
      if (!layer.fn) continue;
      for (const f of entry.features) {
        const fnId = AMS.catalog.functionOf(layer, f.properties || {});
        if (!fnId || !byFunction[fnId]) continue;
        const d = f.geometry && f.geometry.type === 'Point'
          ? geo.haversine(center, f.geometry.coordinates)
          : (geo.pointInPolygon(center, f.geometry) ? 0 : nearestVertexDistance(center, f));
        for (const band of bands) if (d <= band.radius) byFunction[fnId].counts[band.minutes]++;
        byFunction[fnId].total++;
        if (!byFunction[fnId].layers.includes(layer.id)) byFunction[fnId].layers.push(layer.id);
      }
    }

    // 覆蓋分數：以最外圈為準，每個有設施的機能領域算 1 分
    const outer = bands[bands.length - 1].minutes;
    const covered = AMS.catalog.FUNCTIONS.filter((fn) => byFunction[fn.id].counts[outer] > 0);

    return {
      center, bands, perLayer, byFunction,
      score: { covered: covered.length, total: AMS.catalog.FUNCTIONS.length, outerMinutes: outer },
      options: o,
    };
  }

  function nearestVertexDistance(center, feature) {
    let best = Infinity;
    for (const p of geo.flattenCoords(feature.geometry)) {
      const d = geo.haversine(center, p);
      if (d < best) best = d;
    }
    return best;
  }

  /**
   * 各行政區的設施密度。
   * 面圖層計代表點所在的區；點圖層若屬性已帶 Stadsdeel 欄位，仍一律以空間判定，
   * 避免不同圖層的行政區欄位寫法不一致造成無法比較。
   */
  function districtStats(boundary, layers, getData) {
    const areas = (boundary.features || []).map((f) => ({
      feature: f,
      name: (f.properties || {})[boundary.__nameField] || '未命名',
      areaKm2: ((f.properties || {})[boundary.__areaField] || 0) / 1e6,
      bb: geo.bbox(f),
      counts: {},
      total: 0,
    }));

    let matched = 0;
    let total = 0;
    for (const layer of layers) {
      const data = getData(layer.id);
      if (!data) continue;
      for (const a of areas) a.counts[layer.id] = 0;
      for (const f of data.features || []) {
        const rep = geo.representativePoint(f);
        if (!rep) continue;
        total++;
        for (const a of areas) {
          if (!a.bb) continue;
          if (rep[0] < a.bb[0] || rep[0] > a.bb[2] || rep[1] < a.bb[1] || rep[1] > a.bb[3]) continue;
          if (geo.pointInPolygon(rep, a.feature.geometry)) {
            a.counts[layer.id]++;
            a.total++;
            matched++;
            break;
          }
        }
      }
    }
    // 界線用的是排除水域的版本，落在水面或市界外的圖徵歸不進任何一區，
    // 這個差額必須讓使用者看到，否則會誤以為各區加總等於圖層總數。
    return { areas, matched, total };
  }

  AMS.analysis = { DEFAULTS, radiusFor, analyze, districtStats };
})(window.AMS);
