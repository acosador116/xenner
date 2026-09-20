# AGENTS.md — Espacio de trabajo IA del proyecto xenner

> Regla del repo: **no alucinar**. Toda afirmación sobre APIs/frameworks debe
> verificarse en docs oficiales o en código ejecutado (`pnpm build`, `cargo check`).
> Si algo no se puede verificar, se escribe como hipótesis marcada con `?`.

## Qué es xenner

Creador de notas desktop (Tauri v2 + SolidJS + TypeScript + Rust) con interfaz
**100% modificable por skins basadas en archivos TXT** que el usuario edita.

## Mapa del proyecto

```
xenner/                  # app Tauri (código real)
  src/                   # frontend SolidJS
    skin/                # SkinEngine: parse TXT -> CSS vars, fallback embebido
    notes/               # CRUD de notas (fase 1: localStorage)
    App.tsx              # desktop de notas
  src-tauri/src/         # backend Rust
    skin.rs              # scan_skins + lectura TXT (nunca falla: [] / fallback)
  skins/                 # skins de usuario (editables, con ejemplos)
    config.txt           # skinPath="..." selecciona skin activa
    glass-default/       # ejemplo + referencia (el default real va EMBEBIDO en código)
    webcore/             # segunda skin de ejemplo
  docs/
    SKIN_SPEC.md         # especificación del formato TXT (fuente de verdad)
  public/                # assets estáticos
web/                     # (vacío, reservado para futura versión web)
```

## Sistema de skins (resumen; detalle en `xenner/docs/SKIN_SPEC.md`)

- Cada skin = carpeta en `xenner/skins/<nombre>/` con `skin.txt` (manifiesto)
  + un TXT por componente: `background.txt`, `button.txt`, `note.txt`,
  `sidebar.txt`, `input.txt`, `toolbar.txt`.
- Formato: una variable por línea, `clave="valor"`, `#` = comentario.
- Selección: `xenner/skins/config.txt` → `skinPath="webcore"`.
  Vacío/inexistente/carpeta ausente → **skin default glassmorphism EMBEBIDA
  en el código** (la app jamás se cuelga: todo I/O de skins tiene fallback).
- Resolución por clave: skin activa → default embebida. Valores desconocidos
  se ignoran, última definición gana.

## Flujo de trabajo con la IA

1. Todo cambio empieza revisando `xenner/docs/SKIN_SPEC.md` si toca skins.
2. Verificar con ejecución real: `pnpm build` (frontend), `cargo check` (Rust).
   `cargo build` / Tauri completo solo cuando se pida (lento).
3. **Commit + push tras cada tarea/función terminada** (petición explícita
   del dueño). Mensajes en español, formato:
   `xenner: <tarea> — <detalle corto>`.
4. No crear archivos fuera de `xenner/` salvo `AGENTS.md`/README raíz.
5. Transparencia real: `tauri.conf.json → "transparent": true` + CSS
   `html,body{background:transparent}` (fuente: docs Tauri v2 window-customization
   + README de `tauri-apps/window-vibrancy`). `backdrop-filter` solo blurea el DOM;
   el blur nativo de lo que hay detrás lo pone el SO/compositor (Linux) o el
   crate `window-vibrancy` (Windows/macOS, fase futura). Riesgo conocido:
   `transparent:true` + Nvidia en Linux puede fallar (issue #14924) → documentado,
   conmutador previsto `transparent:false`.

## Comandos

```bash
cd xenner
pnpm install        # dependencias frontend
pnpm dev            # vite dev (http://localhost:1420)
pnpm build          # verificación frontend
cargo check -p xenner_lib  # verificación Rust (desde xenner/src-tauri)
```
