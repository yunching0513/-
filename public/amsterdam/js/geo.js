/**
 * 幾何運算工具：距離、代表點、點是否落在多邊形內。
 *
 * 全部以 WGS84 經緯度為輸入。阿姆斯特丹位於 52.37°N，這個緯度下用等距圓筒投影
 * 的近似誤差在數公里的尺度內小於 0.1%，對步行圈分析而言可以忽略；需要精確
 * 距離的地方（圈內外判定）一律走 haversine。
 */
window.AMS = window.AMS || {};
(function (AMS) {
  'use strict';

  const R = 6371008.8; // 地球平均半徑（公尺，IUGG）
  const rad = (d) => (d * Math.PI) / 180;

  /** 兩點大圓距離（公尺）。座標一律 [lng, lat]。 */
  function haversine(a, b) {
    const dLat = rad(b[1] - a[1]);
    const dLng = rad(b[0] - a[0]);
    const lat1 = rad(a[1]);
    const lat2 = rad(b[1]);
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** 把巢狀座標陣列攤平成 [lng, lat] 的列表 */
  function flattenCoords(geometry, out) {
    out = out || [];
    if (!geometry) return out;
    const walk = (c) => {
      if (typeof c[0] === 'number') { out.push(c); return; }
      for (const item of c) walk(item);
    };
    if (geometry.type === 'GeometryCollection') {
      (geometry.geometries || []).forEach((g) => flattenCoords(g, out));
    } else if (geometry.coordinates) {
      walk(geometry.coordinates);
    }
    return out;
  }

  /**
   * 圖徵的代表點。
   * 點：自身；線：中點；面：外環的面積重心（落在凹多邊形外時退回頂點平均）。
   */
  function representativePoint(feature) {
    const g = feature.geometry;
    if (!g) return null;
    if (g.type === 'Point') return g.coordinates;
    if (g.type === 'MultiPoint') return g.coordinates[0] || null;

    if (g.type === 'LineString' || g.type === 'MultiLineString') {
      const pts = flattenCoords(g);
      return pts.length ? pts[Math.floor(pts.length / 2)] : null;
    }

    const rings = ringsOf(g);
    if (!rings.length) {
      const pts = flattenCoords(g);
      return pts.length ? pts[0] : null;
    }
    const outer = rings.reduce((a, b) => (Math.abs(shoelace(b)) > Math.abs(shoelace(a)) ? b : a));
    const c = polygonCentroid(outer);
    if (c && pointInRing(c, outer)) return c;
    return averagePoint(outer);
  }

  /** 取出多邊形的所有環（Polygon 與 MultiPolygon 通用） */
  function ringsOf(g) {
    if (!g) return [];
    if (g.type === 'Polygon') return g.coordinates || [];
    if (g.type === 'MultiPolygon') return (g.coordinates || []).flat();
    return [];
  }

  function shoelace(ring) {
    let s = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    }
    return s / 2;
  }

  function polygonCentroid(ring) {
    let x = 0, y = 0, a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += f;
      x += (ring[j][0] + ring[i][0]) * f;
      y += (ring[j][1] + ring[i][1]) * f;
    }
    if (a === 0) return averagePoint(ring);
    return [x / (3 * a), y / (3 * a)];
  }

  function averagePoint(pts) {
    if (!pts.length) return null;
    let x = 0, y = 0;
    for (const p of pts) { x += p[0]; y += p[1]; }
    return [x / pts.length, y / pts.length];
  }

  /** 射線法：點是否在單一環內 */
  function pointInRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const hit = (yi > pt[1]) !== (yj > pt[1]) &&
                  pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
      if (hit) inside = !inside;
    }
    return inside;
  }

  /** 點是否落在 Polygon / MultiPolygon 內（含內環扣除） */
  function pointInPolygon(pt, geometry) {
    if (!pt || !geometry) return false;
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates]
                : geometry.type === 'MultiPolygon' ? geometry.coordinates
                : [];
    for (const poly of polys) {
      if (!poly.length) continue;
      if (!pointInRing(pt, poly[0])) continue;
      let inHole = false;
      for (let h = 1; h < poly.length; h++) {
        if (pointInRing(pt, poly[h])) { inHole = true; break; }
      }
      if (!inHole) return true;
    }
    return false;
  }

  /** 圖徵的外接框 [minLng, minLat, maxLng, maxLat] */
  function bbox(feature) {
    const pts = flattenCoords(feature.geometry);
    if (!pts.length) return null;
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const p of pts) {
      if (p[0] < a) a = p[0];
      if (p[1] < b) b = p[1];
      if (p[0] > c) c = p[0];
      if (p[1] > d) d = p[1];
    }
    return [a, b, c, d];
  }

  /**
   * 圖徵是否進入以 center 為心、radius 公尺為半徑的圓。
   * 點與線用實際座標判定；面同時檢查「圓心在面內」與「面的頂點進入圓」，
   * 因此大面積公園即使重心很遠也會被算進來。
   */
  function featureWithinRadius(feature, center, radius) {
    const g = feature.geometry;
    if (!g) return false;
    if (pointInPolygon(center, g)) return true;
    const pts = flattenCoords(g);
    for (const p of pts) {
      if (haversine(center, p) <= radius) return true;
    }
    return false;
  }

  AMS.geo = {
    haversine, representativePoint, pointInPolygon, pointInRing,
    featureWithinRadius, flattenCoords, ringsOf, bbox,
  };
})(window.AMS);
