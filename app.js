(() => {
  'use strict';

  const STORE_KEY = 'nazer-map-points-v1';
  const CENTER = [-34.532, -58.516];
  const MAX_LIST = 100;
  // viewbox de Vicente López para priorizar resultados de búsqueda: oeste,norte,este,sur
  const VIEWBOX = '-58.58,-34.47,-58.44,-34.58';

  const CATEGORIES = [
    { id: 'Tránsito', label: 'Tránsito / baches', color: '#f59e0b' },
    { id: 'Alumbrado', label: 'Alumbrado', color: '#facc15' },
    { id: 'Basura', label: 'Basura', color: '#22c55e' },
    { id: 'Árboles', label: 'Árboles', color: '#16a34a' },
    { id: 'Espacios verdes', label: 'Espacios verdes', color: '#10b981' },
    { id: 'Semáforos', label: 'Semáforos', color: '#ef4444' },
    { id: 'Accesibilidad', label: 'Accesibilidad', color: '#8b5cf6' },
    { id: 'Infraestructura', label: 'Infraestructura', color: '#06b6d4' },
    { id: 'Agua e inundación', label: 'Agua e inundación', color: '#3b82f6' },
    { id: 'Servicios municipales', label: 'Servicios municipales', color: '#ec4899' },
  ];
  const CAT = new Map(CATEGORIES.map(c => [c.id, c]));
  const DEFAULT_COLOR = '#54d8ed';

  const $ = id => document.getElementById(id);
  const fmtDate = iso => new Date(iso).toLocaleString('es-AR');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- Persistencia ----------
  const isValid = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && typeof p.id === 'string';

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(data) ? data.filter(isValid) : [];
    } catch { return []; }
  }

  let saveTimer = 0;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(points)); }
      catch { setStatus('No se pudo guardar en este navegador (almacenamiento lleno o bloqueado).'); }
    }, 250);
  }
  window.addEventListener('pagehide', () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(points)); } catch { /* sin acción */ }
  });

  // ---------- Estado ----------
  let points = load();
  let selected = null;
  let pointer = null;
  let filter = '';
  const markers = new Map(); // id -> circleMarker

  // ---------- UI estática ----------
  const optionHtml = CATEGORIES.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
  $('category').innerHTML = optionHtml;
  $('filter').innerHTML = '<option value="">Todas las categorías</option>' + optionHtml;

  function setStatus(s) { $('status').textContent = s; }

  // ---------- Mapa ----------
  const map = L.map('map', { zoomControl: true, preferCanvas: true }).setView(CENTER, 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);
  const savedLayer = L.layerGroup().addTo(map);

  const pointerIcon = L.divIcon({
    className: 'nazer-pointer-icon',
    html: '<span class="pin" aria-label="Puntero de ubicación"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  function choose(latlng, focus = true) {
    selected = L.latLng(latlng.lat, latlng.lng);
    $('selected').textContent = `Ubicación elegida: ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`;
    if (pointer) pointer.setLatLng(selected);
    else pointer = L.marker(selected, { icon: pointerIcon, keyboard: false, interactive: false, zIndexOffset: 1000 }).addTo(map);
    if (focus) $('description').focus();
  }
  map.on('click', e => choose(e.latlng));

  // ---------- Marcadores (incrementales) ----------
  function popupHtml(p) {
    return `<b>${esc(p.category)}</b><br>${esc(p.description || 'Sin descripción')}<br><small>${fmtDate(p.created)}</small>`;
  }

  function addMarker(p) {
    const color = (CAT.get(p.category) || {}).color || DEFAULT_COLOR;
    const m = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 })
      .bindPopup(() => popupHtml(p));
    markers.set(p.id, m);
    if (!filter || p.category === filter) m.addTo(savedLayer);
  }

  function removeMarker(id) {
    const m = markers.get(id);
    if (m) { savedLayer.removeLayer(m); markers.delete(id); }
  }

  function applyFilterToMarkers() {
    savedLayer.clearLayers();
    for (const p of points) {
      if (!filter || p.category === filter) markers.get(p.id)?.addTo(savedLayer);
    }
  }

  // ---------- Lista y estadísticas ----------
  function renderList() {
    $('total').textContent = points.length;
    $('types').textContent = new Set(points.map(p => p.category)).size;

    const visible = filter ? points.filter(p => p.category === filter) : points;
    if (!visible.length) {
      $('history').innerHTML = `<p class="hint">${points.length ? 'No hay puntos en esta categoría.' : 'Todavía no hay puntos guardados.'}</p>`;
      return;
    }
    const shown = visible.slice(-MAX_LIST).reverse();
    $('history').innerHTML = shown.map(p => {
      const color = (CAT.get(p.category) || {}).color || DEFAULT_COLOR;
      return `<div class="item"><strong><span class="dot" style="background:${color}"></span>${esc(p.category)}</strong>` +
        `<span>${esc(p.description || 'Sin descripción')}</span><div class="tag">${fmtDate(p.created)}</div>` +
        `<div class="row"><button class="btn secondary small" data-go="${esc(p.id)}">Ver en mapa</button>` +
        `<button class="btn secondary small" data-del="${esc(p.id)}" aria-label="Borrar este punto">Borrar</button></div></div>`;
    }).join('') + (visible.length > MAX_LIST ? `<p class="hint">Mostrando los últimos ${MAX_LIST} de ${visible.length}. Exportá para ver todos.</p>` : '');
  }

  // ---------- Acciones ----------
  $('save').addEventListener('click', () => {
    if (!selected) { setStatus('Primero tocá el mapa para elegir el lugar.'); return; }
    const p = {
      id: newId(),
      lat: selected.lat,
      lng: selected.lng,
      category: $('category').value,
      description: $('description').value.trim(),
      created: new Date().toISOString(),
    };
    points.push(p);
    addMarker(p);
    renderList();
    persist();
    $('description').value = '';
    setStatus('Punto guardado en este navegador.');
  });

  $('history').addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    const del = e.target.closest('[data-del]');
    if (go) {
      const m = markers.get(go.dataset.go);
      if (!m) return;
      if (!savedLayer.hasLayer(m)) m.addTo(savedLayer);
      map.setView(m.getLatLng(), 17);
      m.openPopup();
    } else if (del) {
      const id = del.dataset.del;
      if (!confirm('¿Borrar este punto?')) return;
      points = points.filter(p => p.id !== id);
      removeMarker(id);
      renderList();
      persist();
      setStatus('Punto borrado.');
    }
  });

  $('filter').addEventListener('change', e => {
    filter = e.target.value;
    applyFilterToMarkers();
    renderList();
  });

  $('clear').addEventListener('click', () => {
    if (!points.length || !confirm('¿Borrar todos los puntos guardados en este navegador?')) return;
    points = [];
    markers.clear();
    savedLayer.clearLayers();
    renderList();
    persist();
    setStatus('Histórico local borrado.');
  });

  // ---------- Exportar / importar GeoJSON ----------
  $('export').addEventListener('click', () => {
    if (!points.length) { setStatus('No hay puntos para exportar.'); return; }
    const geo = {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        id: p.id,
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { category: p.category, description: p.description, created: p.created },
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `nazer-puntos-${new Date().toISOString().slice(0, 10)}.geojson` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Exportados ${points.length} puntos.`);
  });

  $('import').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setStatus('El archivo es demasiado grande (máx. 5 MB).'); return; }
    try {
      const geo = JSON.parse(await file.text());
      const feats = geo.type === 'FeatureCollection' ? geo.features : [];
      const known = new Set(points.map(p => p.id));
      let added = 0;
      for (const f of feats) {
        const c = f?.geometry?.type === 'Point' && f.geometry.coordinates;
        if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
        const id = typeof f.id === 'string' ? f.id : newId();
        if (known.has(id)) continue;
        const pr = f.properties || {};
        const p = {
          id,
          lat: c[1],
          lng: c[0],
          category: CAT.has(pr.category) ? pr.category : 'Infraestructura',
          description: String(pr.description || '').slice(0, 500),
          created: Number.isNaN(Date.parse(pr.created)) ? new Date().toISOString() : pr.created,
        };
        points.push(p);
        known.add(id);
        addMarker(p);
        added++;
      }
      renderList();
      persist();
      setStatus(added ? `Importados ${added} puntos.` : 'No había puntos nuevos para importar.');
    } catch {
      setStatus('No se pudo leer el archivo. ¿Es un GeoJSON válido?');
    }
  });

  // ---------- Búsqueda (cancelable) ----------
  let searchCtl = null;
  async function searchPlace() {
    const q = $('search').value.trim();
    if (!q) return;
    searchCtl?.abort();
    searchCtl = new AbortController();
    setStatus('Buscando ubicación…');
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar' +
        '&viewbox=' + VIEWBOX + '&q=' + encodeURIComponent(q + ', Vicente López, Buenos Aires');
      const r = await fetch(url, { signal: searchCtl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      const a = await r.json();
      if (!a.length) { setStatus('No encontré ese lugar. Probá con otra dirección.'); return; }
      const ll = L.latLng(Number(a[0].lat), Number(a[0].lon));
      map.setView(ll, 16);
      choose(ll);
      setStatus('Ubicación encontrada.');
    } catch (err) {
      if (err.name !== 'AbortError') setStatus('No se pudo buscar. Revisá tu conexión y probá otra vez.');
    }
  }
  $('searchBtn').addEventListener('click', searchPlace);
  $('search').addEventListener('keydown', e => { if (e.key === 'Enter') searchPlace(); });

  // ---------- Geolocalización ----------
  $('locate').addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus('Este navegador no permite ubicación.'); return; }
    setStatus('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
      map.setView(ll, 16);
      choose(ll);
      setStatus('Ubicación encontrada.');
    }, () => setStatus('No se pudo obtener la ubicación. Revisá los permisos.'), { enableHighAccuracy: true, timeout: 10000 });
  });

  // ---------- Inicio ----------
  points.forEach(addMarker);
  renderList();
  map.whenReady(() => {
    map.invalidateSize(true);
    // puntero visible en el centro hasta que se elija un punto
    pointer = L.marker(map.getCenter(), { icon: pointerIcon, keyboard: false, interactive: false, zIndexOffset: 1000 }).addTo(map);
    $('selected').textContent = 'Tocá el mapa para elegir la ubicación. El puntero rojo permanece visible en el centro hasta que selecciones un punto.';
    setStatus('Mapa activo · Vicente López');
  });
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => map.invalidateSize(true), 150);
  });
})();
