'use client';

import { useAppStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/types';

export function Timeline() {
  const reports = useAppStore((state) => state.reports);
  if (!reports.length) return <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.025] p-6 text-sm text-slate-400">Todavía no hay eventos para mostrar.</div>;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {reports.slice(0, 30).map((report) => {
      const category = CATEGORIES.find((item) => item.id === report.category);
      return <button key={report.id} onClick={() => useAppStore.getState().select(report)} className="group flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-[#0d1521] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-[#111e2e]">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.035]"><span className="text-xl">{category?.icon}</span></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-cyan-200">{category?.label || 'Evento'}</span><span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (report.status === 'verificado' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-200')}>{report.status === 'verificado' ? 'confirmado' : 'en revisión'}</span></div>
          <p className="mt-2 line-clamp-2 font-bold text-slate-100">{report.description || 'Evento ciudadano'}</p>
          <p className="mt-2 text-[11px] text-slate-500">{new Date(report.created_at).toLocaleString('es-AR')} · M{report.magnitude} · + {report.corroborations}</p>
        </div>
      </button>;
    })}
  </div>;
}
