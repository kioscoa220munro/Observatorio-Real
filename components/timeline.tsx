'use client';

import { useAppStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/types';

export function Timeline() {
  const reports = useAppStore((state) => state.reports);

  if (!reports.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">Todavía no hay eventos para mostrar.</div>;
  }

  return (
    <div className="space-y-3">
      {reports.slice(0, 12).map((report) => {
        const category = CATEGORIES.find((item) => item.id === report.category);
        return (
          <button
            key={report.id}
            onClick={() => useAppStore.getState().select(report)}
            className="group flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-50">
              <span className="text-xl">{category?.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{category?.label || 'Evento'}</span>
                <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (report.status === 'verificado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {report.status === 'verificado' ? 'confirmado' : 'en revisión'}
                </span>
              </div>
              <p className="mt-1 font-bold text-ink">{report.description || 'Evento ciudadano'}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(report.created_at).toLocaleString('es-AR')} · M{report.magnitude} · + {report.corroborations}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
