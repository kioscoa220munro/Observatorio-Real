'use client';

import { useEffect } from 'react';
import { Activity, ArrowDownRight, Database, MapPin, PlusCircle, Radio, Search, ShieldCheck, Share2 } from 'lucide-react';
import { MapCanvas } from '@/components/map-canvas';
import { VortexSwitcher } from '@/components/vortex-switcher';
import { ReportForm } from '@/components/report-form';
import { Timeline } from '@/components/timeline';
import { ReportSheet } from '@/components/report-sheet';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const reports = useAppStore((state) => state.reports);
  useEffect(() => {
    (async () => {
      const { getSupabase } = await import('@/lib/supabase-browser');
      const supabase = getSupabase();
      if (supabase && !(await supabase.auth.getUser()).data.user) await supabase.auth.signInAnonymously();
    })();
  }, []);

  return (
    <main className="dark-app nazer-reveal min-h-screen overflow-x-clip">
      <header className="nazer-header fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7">
          <a href="#inicio" className="flex min-w-0 items-center gap-3">
            <div className="or-mark grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black">OR</div>
            <div className="min-w-0">
              <div className="nazer-wordmark truncate text-lg font-black tracking-[.12em] sm:text-xl"><span className="nazer-red">NAZER</span></div>
              <div className="nazer-subtitle text-xs font-bold sm:text-sm">Observatorio Real</div>
              <div className="nazer-expansion hidden text-[9px] font-semibold tracking-[.08em] sm:block">Núcleo Administrativo Zonal y Estratégico Regional</div>
            </div>
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-[11px] font-semibold text-slate-300 md:flex"><span className="live-dot" /> DATOS REALES · TRAZABLES · ABIERTOS</div>
          <nav className="flex shrink-0 items-center gap-2">
            <a href="#mapa" className="nav-link hidden sm:inline-flex"><MapPin size={15}/> Mapa</a>
            <a href="#publicar" className="nav-link"><PlusCircle size={15}/> <span className="hidden sm:inline">Reportar</span><span className="sm:hidden">+</span></a>
          </nav>
        </div>
      </header>

      <section id="inicio" className="dark-intro px-4 pb-5 pt-[100px] sm:px-7">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-5">
          <div>
            <div className="eyebrow"><Radio size={13}/> OBSERVATORIO TERRITORIAL · VICENTE LÓPEZ</div>
            <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight tracking-[-.04em] text-white sm:text-5xl">La realidad, <span className="text-cyan-300">punto por punto.</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Un mapa vivo de hechos ciudadanos, con ubicación, evidencia y seguimiento comunitario.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="metric"><span>REPORTES</span><strong>{reports.length.toLocaleString('es-AR')}</strong></div>
            <div className="metric"><span>VISTA</span><strong>EN VIVO</strong></div>
            <div className="metric"><span>ÁREA</span><strong>VL / MUNRO</strong></div>
          </div>
        </div>
      </section>

      <section id="mapa" className="map-section px-3 sm:px-6">
        <div className="map-toolbar mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><span className="toolbar-icon"><MapPin size={16}/></span> Mapa territorial <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-bold text-cyan-200">CARTOGRAFÍA ACTIVA</span></div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><Search size={14}/> Tocá el mapa para elegir ubicación · tocá un punto para ver su histórico</div>
        </div>
        <div className="map-frame mx-auto max-w-[1600px]">
          <MapCanvas />
          <VortexSwitcher views={[{ id: 'points', label: 'Puntos' }, { id: 'heat', label: 'Calor' }, { id: 'network', label: 'Red' }]} />
        </div>
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-2 py-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-2"><span className="live-dot"/> Mapa interactivo · reportes agrupados por zona</span>
          <span>La información de demostración se identifica en el detalle del evento.</span>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1600px] gap-5 px-4 py-10 sm:px-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.75fr)]">
        <div id="publicar" className="scroll-mt-28">
          <div className="section-kicker"><PlusCircle size={14}/> PARTICIPACIÓN CIUDADANA</div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Registrar un hecho</h2>
          <p className="mb-5 mt-2 max-w-xl text-sm leading-6 text-slate-400">Elegí un punto en el mapa, describí qué sucede y adjuntá evidencia si la tenés.</p>
          <ReportForm />
        </div>
        <aside className="side-info space-y-4">
          <div className="info-card">
            <div className="flex items-center gap-3"><div className="info-icon"><ShieldCheck size={19}/></div><div><h3 className="font-bold text-white">Confirmación comunitaria</h3><p className="mt-1 text-sm leading-5 text-slate-400">Los apoyos ayudan a medir la magnitud de cada evento.</p></div></div>
          </div>
          <div className="info-card">
            <div className="flex items-center gap-3"><div className="info-icon"><Database size={19}/></div><div><h3 className="font-bold text-white">Datos trazables</h3><p className="mt-1 text-sm leading-5 text-slate-400">Cada reporte conserva su ubicación, fecha y estado.</p></div></div>
          </div>
          <div className="info-card">
            <div className="flex items-center gap-3"><div className="info-icon"><Activity size={19}/></div><div><h3 className="font-bold text-white">Magnitud colectiva</h3><p className="mt-1 text-sm leading-5 text-slate-400">Los eventos pueden ganar relevancia a medida que la comunidad los confirma.</p></div></div>
          </div>
          <a href="#historico" className="history-jump flex items-center justify-between rounded-2xl p-4"><span><span className="block text-xs font-bold tracking-widest text-cyan-200">SEGUIMIENTO</span><span className="mt-1 block font-bold text-white">Ver histórico completo</span></span><ArrowDownRight size={20}/></a>
        </aside>
      </section>

      <section id="historico" className="history-section scroll-mt-24 px-4 py-12 sm:px-7">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><div className="section-kicker"><Activity size={14}/> REGISTRO CRONOLÓGICO</div><h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Histórico de eventos</h2><p className="mt-2 text-sm text-slate-400">Los reportes registrados, desde el más reciente hasta su origen.</p></div>
            <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-slate-300">{reports.length} eventos visibles</span>
          </div>
          <div className="mt-6"><Timeline /></div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-7 text-xs text-slate-500">
        <span><strong className="nazer-red">NAZER</strong> · Núcleo Administrativo Zonal y Estratégico Regional</span>
        <span className="flex items-center gap-2"><Share2 size={13}/> Datos reales · trazables · abiertos</span>
      </footer>
      <ReportSheet />
    </main>
  );
}
