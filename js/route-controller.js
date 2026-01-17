/**
 * RouteController - 経路描画のオーケストレーション
 *
 * - ユーザーアクションのハンドリング（呼び出し側で実施）
 * - ORSClient / CacheManager / RouteRenderer の調整
 * - デバウンス、冪等性、フォールバック
 */

class RouteController {
  constructor(orsClient, cacheManager, routeRenderer, config = {}) {
    this.orsClient = orsClient;
    this.cacheManager = cacheManager;
    this.routeRenderer = routeRenderer;

    // routeId -> { timeoutId, resolve, reject }
    this.pendingRequests = new Map();
    this.debounceDelay = config.debounceDelay !== undefined ? config.debounceDelay : 300;
    this.maxCoordinatesPerRequest =
      config.maxCoordinatesPerRequest !== undefined ? config.maxCoordinatesPerRequest : 50;
  }

  buildStraightLineGeoJSON(stops) {
    const coordinates = (stops || []).map((s) => {
      const lon = typeof s.lon === 'number' ? s.lon : s.lng;
      return [lon, s.lat];
    });

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          },
          properties: {
            fallback: true
          }
        }
      ]
    };
  }

  splitStops(stops) {
    const max = this.maxCoordinatesPerRequest;
    if (!Array.isArray(stops) || stops.length <= max) return [stops];

    // 連結のため、各チャンクの先頭に前チャンクの末尾を含める（重複1点）
    const chunks = [];
    let start = 0;
    while (start < stops.length) {
      const end = Math.min(start + max, stops.length);
      const chunk = stops.slice(start, end);
      if (chunks.length > 0) {
        // 前チャンク末尾を先頭に追加
        const prevLast = chunks[chunks.length - 1][chunks[chunks.length - 1].length - 1];
        chunk.unshift(prevLast);
      }
      chunks.push(chunk);
      start = end;
    }
    return chunks;
  }

  mergeGeoJSONSegments(segments) {
    if (!segments || segments.length === 0) return null;

    const mergedCoordinates = [];
    for (let i = 0; i < segments.length; i++) {
      const geojson = segments[i];
      const coords = geojson?.features?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coords)) continue;
      if (i === 0) {
        mergedCoordinates.push(...coords);
      } else {
        // 先頭点は重複するのでスキップ
        mergedCoordinates.push(...coords.slice(1));
      }
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: mergedCoordinates },
          properties: { merged: segments.length > 1 }
        }
      ]
    };
  }

  async drawBusRoute(routeId, stops, options = {}) {
    // デバウンス
    if (this.pendingRequests.has(routeId)) {
      const pending = this.pendingRequests.get(routeId);
      clearTimeout(pending.timeoutId);
      // 先行リクエストは「キャンセル扱い」で安全にresolve（未ハンドルrejection防止）
      if (typeof pending.resolve === 'function') {
        pending.resolve();
      }
      this.pendingRequests.delete(routeId);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        this.pendingRequests.delete(routeId);

        try {
          // 冪等性（要件9.2）
          if (this.routeRenderer.hasRoute(routeId) && !options.force) {
            resolve();
            return;
          }

          const coordPairs = this.orsClient.convertCoordinates(stops);

          // まず全体キャッシュを確認
          let geojson = this.cacheManager.get(coordPairs);

          if (!geojson) {
            // チャンク単位で取得（要件9.1, 9.5）
            const chunks = this.splitStops(stops);
            const segmentResults = [];

            for (const chunk of chunks) {
              const chunkPairs = this.orsClient.convertCoordinates(chunk);
              let segment = this.cacheManager.get(chunkPairs);
              if (!segment) {
                segment = await this.orsClient.getRoute(chunk);
                this.cacheManager.set(chunkPairs, segment);
              }
              segmentResults.push(segment);
            }

            geojson = chunks.length > 1 ? this.mergeGeoJSONSegments(segmentResults) : segmentResults[0];
            if (geojson) {
              this.cacheManager.set(coordPairs, geojson);
            }
          }

          if (!geojson) {
            throw new Error('経路GeoJSONの生成に失敗しました');
          }

          this.routeRenderer.drawRoute(routeId, geojson, options);
          resolve();
        } catch (error) {
          console.error('Route drawing error:', error);

          // フォールバック（要件6.1）
          if (options.fallback !== false) {
            const fallbackGeojson = this.buildStraightLineGeoJSON(stops);
            this.routeRenderer.drawRoute(routeId, fallbackGeojson, {
              ...options,
              style: { ...(options.style || {}), dashArray: '5, 10' }
            });
          }

          reject(error);
        }
      }, this.debounceDelay);

      this.pendingRequests.set(routeId, { timeoutId, resolve, reject });
    });
  }

  removeRoute(routeId) {
    if (this.pendingRequests.has(routeId)) {
      const pending = this.pendingRequests.get(routeId);
      clearTimeout(pending.timeoutId);
      if (typeof pending.resolve === 'function') pending.resolve();
      this.pendingRequests.delete(routeId);
    }
    this.routeRenderer.removeRoute(routeId);
  }

  clearAllRoutes() {
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      if (typeof pending.resolve === 'function') pending.resolve();
    });
    this.pendingRequests.clear();
    this.routeRenderer.clearAllRoutes();
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RouteController;
}

// ブラウザ環境での公開
if (typeof window !== 'undefined') {
  window.RouteController = RouteController;
}

