/**
 * RouteRenderer - Leaflet地図上に経路（GeoJSON）を描画する
 *
 * - GeoJSONレイヤーの作成と追加
 * - 経路スタイルの適用
 * - レイヤー参照の管理
 * - 経路の削除/全消去
 */

class RouteRenderer {
  constructor(map, config = {}) {
    this.map = map;
    this.routeLayers = new Map(); // routeId -> L.GeoJSON
    this.routeStyles = new Map(); // routeId -> style
    this.visible = true;
    this.style = config.style || {
      color: '#2196F3',
      weight: 4,
      opacity: 0.7
    };
  }

  hasRoute(routeId) {
    return this.routeLayers.has(routeId);
  }

  drawRoute(routeId, geojson, options = {}) {
    if (!this.map) {
      throw new Error('Leaflet map instance が未設定です');
    }
    if (typeof L === 'undefined') {
      throw new Error('Leaflet (L) が利用できません');
    }

    // 既存を削除
    this.removeRoute(routeId);

    const style = { ...this.style, ...(options.style || {}) };
    const layer = L.geoJSON(geojson, {
      style,
      onEachFeature: (feature, featureLayer) => {
        if (options.popup) {
          featureLayer.bindPopup(options.popup);
        }
      }
    });

    layer.addTo(this.map);
    this.routeLayers.set(routeId, layer);
    this.routeStyles.set(routeId, style);

    // ズーム連動で非表示状態なら即反映
    if (!this.visible && typeof layer.setStyle === 'function') {
      layer.setStyle({ ...style, opacity: 0, weight: 0 });
    }

    if (options.fitBounds && typeof layer.getBounds === 'function') {
      this.map.fitBounds(layer.getBounds());
    }
  }

  removeRoute(routeId) {
    const layer = this.routeLayers.get(routeId);
    if (layer) {
      this.map.removeLayer(layer);
      this.routeLayers.delete(routeId);
      this.routeStyles.delete(routeId);
    }
  }

  clearAllRoutes() {
    this.routeLayers.forEach((layer) => {
      this.map.removeLayer(layer);
    });
    this.routeLayers.clear();
    this.routeStyles.clear();
  }

  /**
   * ズーム連動などで経路をまとめて表示/非表示
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.visible = !!visible;
    this.routeLayers.forEach((layer, routeId) => {
      if (typeof layer.setStyle === 'function') {
        const style = this.routeStyles.get(routeId) || this.style;
        if (this.visible) {
          layer.setStyle(style);
        } else {
          layer.setStyle({ ...style, opacity: 0, weight: 0 });
        }
      }
    });
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RouteRenderer;
}

// ブラウザ環境での公開
if (typeof window !== 'undefined') {
  window.RouteRenderer = RouteRenderer;
}

