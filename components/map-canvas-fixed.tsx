'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/lib/store';
import { CATEGORIES, type Report } from '@/lib/types';

const demo: Report[] = [
  { id: 'demo-1', lng: -58.516, lat: -34.532, category: 'transito', magnitude: 4, description: 'Bache y calzada deteriorada', evidence_urls: [], status: 'verificado', corroborations: 5, created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'demo-2', lng: -58.520, lat: -34.535, category: 'agua', magnitude: 5, description: 'Pérdida de agua en calzada', evidence_urls: [], status: 'pendiente', corroborations: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'demo-3', lng: -58.513, lat: -34.538, category: 'alumbrado', magnitude: 2, description: 'Luminaria sin funcionamiento', evidence_urls: [], status: 'verificado', corroborations: 3, created_at: new Date(Date.now() - 345600000).toISOString() },
];
const categoryColor = (category: string) => CATEGORIES.find((c) => c.id === category)?.color || '#23b6c9';

export function MapCanvas() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [status, setStatus] = useState('Iniciando cartografía…');
  const { view, reports, draft, setReports, setDraft, select } = useAppStore();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { getSupabase } = await import('@/lib/supabase-browser');
        const supabase = getSupabase();
        if (supabase) {
          const { data, error } = await supabase.from('reports_geo').select('*').order('created_at', { ascending: false }).limit(5000);
          if (error) throw error;
          if (active) setReports(data?.length ? data as Report[] : demo);
        } else if (active) setReports(demo);
      } catch (error) {
        console.error('[NAZER] No se pudieron cargar reportes; se usan datos de demostración.', error);
        if (active) setReports(demo);
      }
    })();
    return () => { active = false; };
  }, [setReports]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      map = new maplibregl.Map({
        container: container.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
              maxzoom: 19,
            },
          },
          layers: [{ id: 'osm-base', type: 'raster', source: 'osm' }],
        },
        center: [-58.479, -34.526],
        zoom: 13,
        minZoom: 3,
        maxZoom: 19,
        attributionControl: { compact: true },
      });
    } catch (error) {
      console.error('[NAZER] No se pudo iniciar MapLibre:', error);
      setStatus('No se pudo iniciar el mapa. Recargá la página.');
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      map.addSource('reports', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 15,
      });
      map.addLayer({
        id: 'clusters', type: 'circle', source: 'reports', filter: ['has', 'point_count'],
        paint: { 'circle-color': ['step', ['get', 'point_count'], '#23b6c9', 8, '#258bd6', 25, '#102235'], 'circle-radius': ['step', ['get', 'point_count'], 18, 8, 25, 25, 34], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
      });
      map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'reports', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#fff' },
      });
      map.addLayer({
        id: 'points', type: 'circle', source: 'reports', filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['get', 'magnitude'], 1, 7, 5, 13], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
      });
      map.on('click', 'clusters', (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ['clusters'] })[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const source = map.getSource('reports') as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(Number(feature.properties?.cluster_id)).then((zoom) => {
          map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
        }).catch((error) => console.error('[NAZER] No se pudo ampliar el grupo:', error));
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
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'points', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'points', () => { map.getCanvas().style.cursor = ''; });
      setStatus('Mapa activo · Vicente López');
      map.resize();
    });
    map.on('error', (event) => {
      console.error('[NAZER map]', event.error || event);
      if (mapRef.current && !map.isStyleLoaded()) setStatus('Conectando con el mapa…');
    });
    const resize = () => map.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [select, setDraft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getSource('reports')) return;
    const features = reports.map((report) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [report.lng, report.lat] },
      properties: { id: report.id, magnitude: report.magnitude, color: categoryColor(report.category) },
    }));
    (map.getSource('reports') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
    const visible = (id: string, on: boolean) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    visible('clusters', view === 'points');
    visible('cluster-count', view === 'points');
    visible('points', view === 'points');
  }, [reports, view, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !draft || !Number.isFinite(draft.lng) || !Number.isFinite(draft.lat)) return;
    if (!markerRef.current) {
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'Ubicación elegida');
      el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#ff334f;border:3px solid white;box-shadow:0 0 0 8px rgba(255,51,79,.2),0 0 24px rgba(255,51,79,.8);';
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' });
    }
    const place = () => {
      markerRef.current?.setLngLat([draft.lng, draft.lat]).addTo(map);
      map.easeTo({ center: [draft.lng, draft.lat], zoom: Math.max(map.getZoom(), 15), duration: 450 });
    };
    if (map.isStyleLoaded()) place();
    else map.once('load', place);
  }, [draft, status]);

  return (
    <div className="relative h-[min(76vh,860px)] min-h-[560px] overflow-hidden bg-[#09111c]">
      <div ref={container} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[75%] rounded-xl border border-cyan-200/20 bg-[#07111de8] px-3 py-2 text-[10px] font-bold tracking-[.08em] text-cyan-100 shadow-lg sm:text-[11px]">
        NAZER · NÚCLEO ADMINISTRATIVO ZONAL Y ESTRATÉGICO REGIONAL
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[80%] rounded-xl border border-white/10 bg-[#07111de8] px-3 py-2 text-xs text-slate-200 shadow-lg">
        {status}. Tocá un punto para abrir su histórico; tocá el mapa para fijar ubicación.
      </div>
    </div>
  );
}
