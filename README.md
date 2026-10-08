# Nazer · Observatorio Real

Plataforma ciudadana geolocalizada construida con Next.js 14, TypeScript, Tailwind, shadcn/ui, Framer Motion, React Three Fiber/drei, MapLibre GL JS, Zustand y Supabase/PostGIS.

## Producción

1. En Supabase habilitá Anonymous Sign-Ins en Authentication > Sign In / Providers.
2. Ejecutá supabase/migrations/001_observatorio_real.sql.
3. Configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.
4. Desplegá la rama main.

Sin las variables de Supabase, la interfaz funciona en modo demo con datos de Munro para poder probar mapa, vistas, histórico y formulario.

## Mapa

MapLibre usa clustering GeoJSON nativo con radio 200 para la agrupación solicitada. OpenFreeMap Liberty aporta los tiles vectoriales.

## Vistas

Puntos: clusters y marcadores.
Calor: densidad ponderada por magnitud.
Red: conexiones entre reportes corroborados/verificados próximos.

## VortexSwitcher

Componente reutilizable de Framer Motion con rotateZ 720/-720, scale, blur, opacity, perspective 1200 y duración 700 ms.

## Evidencias

Hasta 3 archivos por reporte en Supabase Storage.

## Verificación

Un reporte pasa a verificado al llegar a 3 corroboraciones. La clave primaria report_id + user_id limita a una corroboración por usuario anónimo.
