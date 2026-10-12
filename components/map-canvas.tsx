'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/lib/store';
import { CATEGORIES, Report } from '@/lib/types';

const demo: Report[] = [
  { id: 'demo-1', lng: -58.516, lat: -34.532, category: 'transito', magnitude: 4, description: 'Bache y calzada deteriorada', evidence_urls: [], status: 'verificado', corroborations: 5, created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'demo-2', lng: -58.520, lat: -34.535, category: 'agua', magnitude: 5, description: 'Pérdida de agua en calzada', evidence_urls: [], status: 'pendiente', corroborations: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'demo-3', lng: -58.513, lat: -34.538, category: 'alumbrado', magnitude: 2, description: 'Luminaria sin funcionamiento', evidence_urls: [], status: 'verificado', corroborations: 3, created_at: new Date(Date.now() - 345600000).toISOString() },
];

const color = (category: string) => CATEGORIES.find((item) => item.id === category)?.color || '#23b6c9';

export function MapCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const draftMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapStatus, setMapStatus] = useState('Preparando mapa…');
  const { view, reports, draft, setReports, setDraft, select } = useAppStore();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { getSupabase } = await import('@/lib/supabase-browser');
        const supabase = getSupabase();
        if (supabase) {
          const { data, error } = await supabase.from('reports_geo').select('*').order('created_at', { ascending: false }).limit(5000);
          if (error) throw error;
          if (alive && data?.length) setReports(data as Report[]);
          else if (alive) setReports(demo);
        } else if (alive) {
          setReports(demo);
        }
      } catch (error) {
        console.error('No se pudieron cargar reportes; se muestran datos de demostración.', error);
        if (alive) setReports(demo);
      }
    })();
    return () => { alive = false; };
  }, [setReports]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    // MapLibre GL v6 loads its worker as a separate ESM asset. In Next.js 14,
    // serve the worker and its shared module from public/ instead of a bundled chunk.
    maplibregl.setWorkerUrl(`/maplibre/maplibre-gl-worker.mjs?v=${maplibregl.getVersion()}`);

    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [{ id: 'osm-base', type: 'raster', source: 'osm' }],
      },
      center: [-58.479, -34.526],
      zoom: 13,
      minZoom: 3,
      maxZoom: 19,
      pitch: 0,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    let baseLoaded = false;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('load', () => {
      baseLoaded = true;
      if (!map.getSource('reports')) {
        map.addSource('reports', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 55,
          clusterMaxZoom: 15,
        });
        map.addLayer({
          id: 'clusters', type: 'circle', source: 'reports', filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#23b6c9', 8, '#258bd6', 25, '#102235'],
            'circle-radius': ['step', ['get', 'point_count'], 18, 8, 25, 25, 34],
            'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2,
          },
        });
        map.addLayer({
          id: 'cluster-count', type: 'symbol', source: 'reports', filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
          paint: { 'text-color': '#ffffff' },
        });
        map.addLayer({
          id: 'points', type: 'circle', source: 'reports', filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': ['interpolate', ['linear'], ['get', 'magnitude'], 1, 6, 5, 13],
            'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2,
          },
        });
        map.addLayer({
          id: 'heat', type: 'heatmap', source: 'reports', layout: { visibility: 'none' },
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'magnitude'], 1, 0.1, 5, 1],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 15, 34],
            'heatmap-opacity': 0.8,
          },
        });
        map.addSource('network', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'network', type: 'line', source: 'network', layout: { visibility: 'none' },
          paint: { 'line-color': '#35a66f', 'line-width': 2, 'line-opacity': 0.5 },
        });

        map.on('click', 'clusters', (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ['clusters'] })[0];
          if (!feature) return;
          const source = map.getSource('reports') as maplibregl.GeoJSONSource;
          const clusterId = Number(feature.properties?.cluster_id);
          const geometry = feature.geometry;
          if (geometry.type !== 'Point') return;

          source.getClusterExpansionZoom(clusterId)
            .then((zoom) => {
              map.easeTo({
                center: geometry.coordinates as [number, number],
                zoom,
              });
            })
            .catch((error) => {
              console.error('Error al ampliar el grupo:', error);
            });
        });
        map.on('click', 'points', (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ['points'] })[0];
          const id = feature?.properties?.id;
          const report = useAppStore.getState().reports.find((item) => item.id === id);
          if (report) select(report);
        });
        map.on('click', (event) => {
          if (!map.queryRenderedFeatures(event.point, { layers: ['clusters', 'points'] }).length) {
            setDraft({ lat: event.lngLat.lat, lng: event.lngLat.lng });
          }
        });
      }
      setMapStatus('Mapa activo · Vicente López');
      map.resize();
      // Apply reports after the style and source are ready.
      const current = useAppStore.getState();
      const source = map.getSource('reports') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData({
        type: 'FeatureCollection',
        features: current.reports.map((report) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [report.lng, report.lat] },
          properties: { id: report.id, magnitude: report.magnitude, color: color(report.category) },
        })),
      });
    });

    map.on('error', (event) => {
      // No reiniciar el estilo por el fallo de una sola tesela:
      // setStyle() elimina las fuentes/capas y los manejadores de reportes,
      // y la supuesta alternativa usaba exactamente los mismos servidores.
      console.error('[NAZER map] Error de MapLibre/tesela:', event.error || event);
      if (!baseLoaded) {
        setMapStatus('Cargando cartografía… hay errores de red; esperando respuesta del mapa.');
      }
    });

    return () => {
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [select, setDraft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !draft || !Number.isFinite(draft.lng) || !Number.isFinite(draft.lat)) return;
    const place = () => {
      if (!draftMarkerRef.current) {
        const el = document.createElement('div');
        el.setAttribute('aria-label', 'Ubicación elegida');
        el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#ff334f;border:3px solid white;box-shadow:0 0 0 8px rgba(255,51,79,.2),0 0 24px rgba(255,51,79,.8);cursor:pointer;';
        draftMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' });
      }
      draftMarkerRef.current.setLngLat([draft.lng, draft.lat]).addTo(map);
      map.easeTo({ center: [draft.lng, draft.lat], zoom: Math.max(map.getZoom(), 15), duration: 650 });
    };
    if (map.isStyleLoaded()) place();
    else map.once('load', place);
  }, [draft, mapStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('reports')) return;

    const features = reports.map((report) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [report.lng, report.lat] },
      properties: { id: report.id, magnitude: report.magnitude, color: color(report.category) },
    }));
    (map.getSource('reports') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features });

    const setVisibility = (id: string, visible: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    };
    setVisibility('clusters', view === 'points');
    setVisibility('cluster-count', view === 'points');
    setVisibility('points', view === 'points');
    setVisibility('heat', view === 'heat');
    setVisibility('network', view === 'network');

    if (view === 'network' && map.getSource('network')) {
      const confirmed = reports.filter((report) => report.corroborations > 0 || report.status === 'verificado');
      const lines: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      for (let i = 0; i < confirmed.length; i++) {
        for (let j = i + 1; j < confirmed.length; j++) {
          const a = confirmed[i], b = confirmed[j];
          const dx = (a.lng - b.lng) * 85000, dy = (a.lat - b.lat) * 111000;
          if (Math.hypot(dx, dy) < 600) lines.push({
            type: 'Feature', geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] }, properties: {},
          });
        }
      }
      (map.getSource('network') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: lines });
    }
  }, [reports, view, mapStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45 }}
      className="relative h-[min(76vh,860px)] min-h-[560px] overflow-hidden rounded-none border-0 bg-[#09111c] shadow-none sm:rounded-b-[18px]"
    >
      <div ref={ref} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 max-w-[75%] rounded-xl border border-cyan-200/20 bg-[#07111de8] px-3 py-2 text-[10px] font-bold tracking-[.08em] text-cyan-100 shadow-lg backdrop-blur sm:text-[11px]">
        NAZER · NÚCLEO ADMINISTRATIVO ZONAL Y ESTRATÉGICO REGIONAL
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 max-w-[80%] rounded-xl border border-white/10 bg-[#07111de8] px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur">
        {mapStatus}. Tocá un punto para abrir su histórico; tocá el mapa para fijar ubicación.
      </div>
    </motion.div>
  );
}
