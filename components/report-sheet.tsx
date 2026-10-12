'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, Plus, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CATEGORIES, magnitudeFromVotes, Report } from '@/lib/types';
import { Button } from '@/components/ui/button';

export function ReportSheet() {
  const selected = useAppStore((state) => state.selected);
  const select = useAppStore((state) => state.select);
  const category = selected && CATEGORIES.find((item) => item.id === selected.category);

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => select(null)}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="safe-bottom sheet-scroll max-h-[82vh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-5 py-4">
              <div>
                <p className="text-[10px] font-black tracking-[.2em] text-aqua">HISTÓRICO DEL EVENTO</p>
                <h2 className="text-xl font-black text-ink">
                  {category?.icon} {category?.label || 'Evento ciudadano'}
                </h2>
              </div>
              <button aria-label="Cerrar histórico" onClick={() => select(null)} className="rounded-full bg-slate-100 p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-lg font-bold">{selected.description || 'Evento ciudadano'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-bold">Magnitud {selected.magnitude}/5</span>
                  <span className="rounded-full bg-white px-3 py-1 font-bold">+ {selected.corroborations} apoyos</span>
                  <span className="rounded-full bg-white px-3 py-1 font-bold">
                    {selected.status === 'verificado' ? 'Confirmado por la comunidad' : 'En revisión'}
                  </span>
                </div>
              </div>

              <div className="relative mt-7 space-y-6 pl-8 before:absolute before:bottom-0 before:left-3 before:top-1 before:w-px before:bg-slate-200">
                <div className="relative">
                  <span className="absolute -left-[25px] top-1 grid h-6 w-6 place-items-center rounded-full bg-aqua text-white">
                    <Clock3 className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-bold text-slate-400">{new Date(selected.created_at).toLocaleString('es-AR')}</p>
                  <p className="font-semibold">Evento publicado</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[25px] top-1 grid h-6 w-6 place-items-center rounded-full bg-volt text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <p className="font-semibold">{selected.corroborations} usuarios sumaron su +</p>
                  <p className="text-sm text-slate-500">La magnitud aumenta automáticamente con la participación.</p>
                </div>
              </div>

              <Corroborate report={selected} />
              <p className="mt-3 text-center text-xs text-slate-400">
                Magnitud: M1 (0–1 +) · M2 (2–4) · M3 (5–9) · M4 (10–24) · M5 (25 o más)
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Corroborate({ report }: { report: Report }) {
  const [busy, setBusy] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { getSupabase } = await import('@/lib/supabase-browser');
        const supabase = getSupabase();
        if (!supabase) return;
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;
        const { data } = await supabase
          .from('corroborations')
          .select('report_id')
          .eq('report_id', report.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (alive && data) setHasVoted(true);
      } catch {
        // The vote action below reports actionable errors.
      }
    })();
    return () => { alive = false; };
  }, [report.id]);

  async function addSupport() {
    if (busy || hasVoted) return;
    setBusy(true);
    setMessage('');

    try {
      const { getSupabase } = await import('@/lib/supabase-browser');
      const supabase = getSupabase();

      // Demo points are local samples, not records in the database.
      if (!supabase || report.id.startsWith('demo-')) {
        const state = useAppStore.getState();
        const current = state.reports.find((item) => item.id === report.id) || report;
        const votes = current.corroborations + 1;
        const updated: Report = {
          ...current,
          corroborations: votes,
          magnitude: magnitudeFromVotes(votes),
          status: votes >= 3 ? 'verificado' : current.status,
        };
        state.setReports(state.reports.map((item) => item.id === report.id ? updated : item));
        state.select(updated);
        setHasVoted(true);
        setMessage(supabase ? 'Punto de demostración: el + solo dura en esta sesión.' : 'Modo demostración: el + no se guarda en una base real.');
        return;
      }

      let user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        await supabase.auth.signInAnonymously();
        user = (await supabase.auth.getUser()).data.user;
      }
      if (!user) throw new Error('No se pudo preparar tu sesión para votar.');

      const { error: voteError } = await supabase
        .from('corroborations')
        .insert({ report_id: report.id, user_id: user.id });

      if (voteError) {
        if (voteError.code === '23505' || /duplicate|already/i.test(voteError.message)) {
          setHasVoted(true);
          setMessage('Ya sumaste tu + a este evento.');
          return;
        }
        throw voteError;
      }

      const { data, error } = await supabase.from('reports_geo').select('*').eq('id', report.id).single();
      if (error) throw error;
      if (data) {
        const state = useAppStore.getState();
        state.setReports(state.reports.map((item) => item.id === report.id ? data as Report : item));
        state.select(data as Report);
      }
      setHasVoted(true);
      setMessage('Tu + quedó registrado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el +. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <Button
        disabled={busy || hasVoted}
        onClick={addSupport}
        className="w-full bg-volt text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="mr-2 h-4 w-4" />
        {busy ? 'Registrando…' : hasVoted ? 'Ya sumaste tu +' : '+ Confirmar evento'}
      </Button>
      {message && <p role="status" className="mt-3 rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-600">{message}</p>}
    </div>
  );
}
