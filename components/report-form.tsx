'use client';

import { useEffect, useState } from 'react';
import { LocateFixed, Plus, UploadCloud } from 'lucide-react';
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

  useEffect(() => {
    if (!draft && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setDraft({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
      );
    }
  }, [draft, setDraft]);

  async function submit() {
    if (!draft) {
      setMessage('Elegí el lugar tocando el mapa o usá Mi ubicación.');
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
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400">UBICACIÓN</p>
            <p className="truncate font-semibold">
              {draft ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : 'Tocá el mapa para elegir el lugar'}
            </p>
          </div>
          <Button
            type="button"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition((position) =>
                setDraft({ lat: position.coords.latitude, lng: position.coords.longitude }),
              )
            }
            className="shrink-0 gap-2 bg-white text-ink shadow-sm"
          >
            <LocateFixed className="h-4 w-4" />
            Mi ubicación
          </Button>
        </div>

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
