'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Search, Plus, UploadCloud } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ReportForm() {
  const draft = useAppStore((s) => s.draft);
  const setDraft = useAppStore((s) => s.setDraft);
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);

  async function searchAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = address.trim();
    if (!query) return;
    setSearchingAddress(true);
    setMessage('');
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'ar');
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('El buscador de direcciones no respondió. Probá de nuevo.');
      const results = await response.json();
      if (!results?.length) throw new Error('No encontré esa dirección. Probá con calle y localidad.');
      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('La dirección no devolvió una ubicación válida.');
      setDraft({ lat, lng });
      setAddress(results[0].display_name || query);
      setMessage('Ubicación seleccionada. Ya podés registrar el hecho.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo buscar la dirección.');
    } finally {
      setSearchingAddress(false);
    }
  }

  async function submit() {
    if (!draft) {
      setMessage('Elegí un punto tocando el mapa o buscá una dirección.');
      return;
    }
    if (!description.trim()) {
      setMessage('Contá brevemente qué pasó.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const { getSupabase } = await import('@/lib/supabase-browser');
      const supabase = getSupabase();
      if (!supabase) {
        setMessage('Modo demostración: falta conectar la base de datos para guardar eventos.');
        return;
      }

      let user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        await supabase.auth.signInAnonymously();
        user = (await supabase.auth.getUser()).data.user;
      }
      if (!user) throw new Error('No se pudo preparar la sesión para publicar.');

      const evidenceUrls: string[] = [];
      for (const file of files.slice(0, 3)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
        const upload = await supabase.storage.from('evidence').upload(path, file, { upsert: false });
        if (upload.error) throw upload.error;
        evidenceUrls.push(supabase.storage.from('evidence').getPublicUrl(path).data.publicUrl);
      }

      const { data, error } = await supabase.rpc('create_report', {
        p_lng: draft.lng,
        p_lat: draft.lat,
        p_category: category,
        p_magnitude: 1,
        p_description: description.trim(),
        p_evidence_urls: evidenceUrls,
      });
      if (error) throw error;

      const { data: row, error: readError } = await supabase
        .from('reports_geo')
        .select('*')
        .eq('id', data)
        .single();
      if (readError) throw readError;

      if (row) {
        const state = useAppStore.getState();
        state.setReports([row as any, ...state.reports.filter((report) => report.id !== row.id)]);
      }
      setDescription('');
      setFiles([]);
      setMessage('Evento publicado. La magnitud crecerá con los + de otros usuarios.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar el evento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-ink text-white">
        <p className="text-[10px] font-black tracking-[.2em] text-aqua">PUBLICAR EVENTO</p>
        <CardTitle className="mt-1 text-2xl text-white">¿Qué está pasando?</CardTitle>
        <p className="mt-2 text-sm text-slate-300">
          Tres datos y listo. La magnitud se calcula con los + de la comunidad.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <form onSubmit={searchAddress} className="space-y-2 rounded-2xl border border-slate-200 p-3">
          <label htmlFor="event-address" className="block text-xs font-bold">¿Dónde ocurrió?</label>
          <div className="flex gap-2">
            <input
              id="event-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Buscá calle, esquina o dirección"
              autoComplete="street-address"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-aqua"
            />
            <Button type="submit" disabled={searchingAddress || !address.trim()} className="shrink-0 gap-2 bg-aqua text-white">
              <Search className="h-4 w-4" />
              {searchingAddress ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">{draft ? 'Ubicación elegida. Podés tocar otra parte del mapa para cambiarla.' : 'Elegí un punto tocando el mapa o buscá una dirección.'}</p>
        </form>

        <div>
          <label htmlFor="event-category" className="mb-1.5 block text-sm font-bold">
            Tipo de evento
          </label>
          <select
            id="event-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm outline-none focus:border-aqua"
          >
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icon} {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="event-description" className="mb-1.5 block text-sm font-bold">
            ¿Qué pasó?
          </label>
          <textarea
            id="event-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ej.: bache grande en la esquina de..."
            className="w-full rounded-2xl border border-slate-200 p-3.5 outline-none focus:border-aqua"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{description.length}/500</p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-3">
          <UploadCloud className="h-5 w-5 shrink-0 text-aqua" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Foto o video (opcional)</span>
            <span className="block text-xs text-slate-500">{files.length ? `${files.length} archivo(s) seleccionado(s)` : 'Podés adjuntar hasta 3 evidencias'}</span>
          </span>
          <input
            className="hidden"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 3))}
          />
        </label>

        <Button disabled={busy} onClick={submit} className="w-full bg-aqua text-white hover:bg-cyan-600">
          <Plus className="mr-2 h-4 w-4" />
          {busy ? 'Publicando…' : 'Publicar evento'}
        </Button>

        {message && <p role="status" className="rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-600">{message}</p>}
      </CardContent>
    </Card>
  );
}
