import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { DEFAULT_MAP_CENTER, averageCenter, normalizeLatLng } from '../utils/map';

const LEAFLET_VERSION = '1.9.4';
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const normalizeMarker = (marker) => {
  const position = normalizeLatLng(marker?.position);
  if (!marker?.id || !position) return null;

  return {
    id: String(marker.id),
    position,
    title: marker?.title ? String(marker.title) : '',
    description: marker?.description ? String(marker.description) : '',
    icon: marker?.icon ? String(marker.icon) : '',
  };
};

const buildLeafletHtml = ({ markers, center, userLocation, zoom }) => {
  const payload = JSON.stringify({
    markers,
    center,
    userLocation,
    zoom,
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" />
    <style>
      html, body, #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #f5f7fb;
      }

      .leaflet-control-attribution {
        font-size: 10px;
      }

      .sporhive-pin-wrap {
        background: transparent;
        border: none;
      }

      .sporhive-pin {
        width: 16px;
        height: 16px;
        border-radius: 8px;
        background: #f97316;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.32);
      }

      .sporhive-user-dot {
        width: 14px;
        height: 14px;
        border-radius: 7px;
        background: #2563eb;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
    <script>
      (function () {
        var config = ${payload};

        function send(type, payload) {
          if (!window.ReactNativeWebView || typeof window.ReactNativeWebView.postMessage !== 'function') {
            return;
          }

          var message = { type: type };
          if (payload && typeof payload === 'object') {
            Object.keys(payload).forEach(function (key) {
              message[key] = payload[key];
            });
          }
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }

        function toNumber(value) {
          var parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : null;
        }

        function escapeHtml(value) {
          return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function createMarkerIcon(marker) {
          if (marker && marker.icon) {
            return L.icon({
              iconUrl: marker.icon,
              iconSize: [26, 38],
              iconAnchor: [13, 38],
              popupAnchor: [0, -32]
            });
          }

          return L.divIcon({
            className: 'sporhive-pin-wrap',
            html: '<div class="sporhive-pin"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
        }

        try {
          var mapCenter = config.center || { lat: 31.9539, lng: 35.9106 };
          var zoom = Number.isFinite(config.zoom) ? config.zoom : 12;

          var map = L.map('map', { zoomControl: true }).setView([mapCenter.lat, mapCenter.lng], zoom);
          L.tileLayer('${OSM_TILE_URL}', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          var bounds = [];
          var markers = Array.isArray(config.markers) ? config.markers : [];

          markers.forEach(function (marker) {
            var lat = toNumber(marker && marker.position && marker.position.lat);
            var lng = toNumber(marker && marker.position && marker.position.lng);
            if (lat === null || lng === null) return;

            var leafletMarker = L.marker([lat, lng], { icon: createMarkerIcon(marker) }).addTo(map);
            var popupTitle = escapeHtml(marker && marker.title);
            var popupDescription = escapeHtml(marker && marker.description);

            if (popupTitle || popupDescription) {
              var popupHtml = popupTitle;
              if (popupDescription) {
                popupHtml += (popupTitle ? '<br />' : '') + popupDescription;
              }
              leafletMarker.bindPopup(popupHtml);
            }

            leafletMarker.on('click', function () {
              send('onMapMarkerClicked', {
                mapMarkerID: marker.id,
                id: marker.id
              });
            });

            bounds.push([lat, lng]);
          });

          if (config.userLocation && toNumber(config.userLocation.lat) !== null && toNumber(config.userLocation.lng) !== null) {
            var userLat = toNumber(config.userLocation.lat);
            var userLng = toNumber(config.userLocation.lng);

            L.circle([userLat, userLng], {
              radius: 90,
              color: '#2563eb',
              fillColor: '#2563eb',
              fillOpacity: 0.16,
              weight: 1
            }).addTo(map);

            L.marker([userLat, userLng], {
              icon: L.divIcon({
                className: 'sporhive-pin-wrap',
                html: '<div class="sporhive-user-dot"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })
            }).addTo(map);

            bounds.push([userLat, userLng]);
          }

          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [40, 40] });
          } else if (bounds.length === 1) {
            map.setView(bounds[0], Math.max(zoom, 13));
          } else {
            map.setView([mapCenter.lat, mapCenter.lng], zoom);
          }

          send('onMapReady', {});
        } catch (error) {
          send('onMapError', {
            message: error && error.message ? error.message : String(error)
          });
        }
      })();
    </script>
  </body>
</html>`;
};

export function LeafletMap({
  markers = [],
  center = null,
  onMarkerPress,
  userLocation = null,
  zoom = 12,
  style,
}) {
  const [ready, setReady] = useState(false);

  const normalizedMarkers = useMemo(
    () => markers.map(normalizeMarker).filter(Boolean),
    [markers]
  );

  const normalizedUserLocation = useMemo(
    () => normalizeLatLng(userLocation),
    [userLocation]
  );

  const mapCenter = useMemo(() => {
    const explicit = normalizeLatLng(center);
    if (explicit) return explicit;

    const markerPoints = normalizedMarkers.map((marker) => marker.position);
    if (markerPoints.length) return averageCenter(markerPoints, DEFAULT_MAP_CENTER);

    if (normalizedUserLocation) return normalizedUserLocation;
    return DEFAULT_MAP_CENTER;
  }, [center, normalizedMarkers, normalizedUserLocation]);

  const html = useMemo(
    () =>
      buildLeafletHtml({
        markers: normalizedMarkers,
        center: mapCenter,
        userLocation: normalizedUserLocation,
        zoom,
      }),
    [mapCenter, normalizedMarkers, normalizedUserLocation, zoom]
  );

  const handleMessage = useCallback(
    (event) => {
      const raw = event?.nativeEvent?.data;
      if (!raw) return;

      let payload = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      if (payload?.type === 'onMapReady') {
        setReady(true);
        return;
      }

      if (payload?.type === 'onMapMarkerClicked') {
        const markerId = payload?.mapMarkerID ?? payload?.id;
        if (markerId !== null && markerId !== undefined) {
          onMarkerPress?.(String(markerId));
        }
      }
    },
    [onMarkerPress]
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadStart={() => setReady(false)}
        onLoadEnd={() => setReady(true)}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />

      {!ready ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#f97316" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});

