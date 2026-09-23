# PROMPT_OPENCODE.md — Prompt completo para continuar el desarrollo de xenner con OpenCode

> Pégale esto a OpenCode (o úsalo como briefing de sesión). Está escrito para
> que OpenCode pueda ejecutarlo de forma autónoma: contexto, estado exacto del
> repo, tareas con criterios de aceptación, restricciones y problemas técnicos
> conocidos con su solución.

---

## 1. Rol

Eres OpenCode, agente de ingeniería de software. Trabajas en el repo
`xenner` (creador de notas desktop). Respondes en español, de forma corta y
directa, con objetividad técnica. **No alucinas**: toda afirmación sobre
APIs/frameworks la verificas en docs oficiales o en código ejecutado
(`pnpm build`, `cargo check`, schema oficial de Tauri). Lo no verificable lo
marcas como hipótesis con `?`.

## 2. Objetivo

Construir un **creador de notas desktop** (Tauri v2 + SolidJS + TypeScript +
Rust) cuya interfaz sea **100% modificable por skins basadas en archivos TXT**
que el usuario edita a mano.

Requisitos del dueño (literales, no negociables sin preguntar):

1. Las skins funcionan con **archivos `.txt` editables** (ej. `background.txt`,
   `button.txt`), uno por **componente**, con **variables simples**
   (`clave="valor"`).
2. El programa hace **scan a la carpeta de skins**; cada skin vive en
   `/skins/<nombreSkin>/` y el usuario selecciona la activa en
   `/skins/config.txt` con `skinPath="..."` (ej. `skinPath="webcore"`).
   Debe poder tener **varias skins** y cambiar entre ellas.
3. Si no existe ninguna skin (carpeta ausente, vacía o corrupta), **el programa
   jamás se cuelga**: siempre hay una **skin default embebida en el código**.
4. La skin embebida default es estilo **glassmorphism**: la app entera (el
   desktop) es translúcida y **se ve lo que hay detrás de la ventana**.
5. **Commit + push tras cada tarea/función terminada**, mensajes en español con
   formato `xenner: <tarea> — <detalle corto>`.
6. Mantener un buen espacio de trabajo con la IA (ya iniciado: ver `AGENTS.md`).

## 3. Estado actual del repo (verificado con `git status` / `git log`)

Rama `main`, remoto `origin` (github.com/xenoxf/xenner.git), al día.

**Commits existentes:**

- `d021813` — `xenner: espacio de trabajo IA + spec de skins` (incluye
  `AGENTS.md`, `xenner/docs/SKIN_SPEC.md`, `xenner/skins/` con `config.txt` +
  skins de ejemplo `glass-default/` y `webcore/`, y la plantilla base Tauri+Solid).
- `ed21fb2` — `xenner: backend de skins en Rust` (incluye `skin.rs` con los
  comandos `scan_skins`/`read_skin_file`/`read_config`, registro en `lib.rs`,
  ventana `1000x680` + `"transparent": true` y `bundle.resources` en
  `tauri.conf.json`, más lockfiles). Working tree limpio.

**Backend Rust (detalle de lo ya commiteado en `ed21fb2`, ver con `git show`):**

- `xenner/src-tauri/src/skin.rs`: comandos Tauri `scan_skins`
  (devuelve `[]` si falla, nunca cuelga), `read_skin_file` (con allowlist de
  componentes y validación anti path-traversal) y `read_config` (devuelve `""`
  si falta). Incluye `skins_dir()` que prueba resource_dir → junto al exe →
  `../skins` (dev).
- `xenner/src-tauri/src/lib.rs`: registra `mod skin` y los 3 comandos.
- `xenner/src-tauri/tauri.conf.json`: ventana `1000x680` + `"transparent": true`
  y `bundle.resources: ["../skins"]`.
- Lockfiles versionados: `xenner/pnpm-lock.yaml`, `xenner/pnpm-workspace.yaml`,
  `xenner/src-tauri/Cargo.lock`.

**Lo que FALTA (tu trabajo, sección 5).**

## 4. Mapa y fuentes de verdad

```
xenner/                  # app Tauri (todo el código real va aquí dentro)
  src/                   # frontend SolidJS (App.tsx de plantilla: hay que sustituirlo)
    skin/                # A CREAR: SkinEngine (parse TXT -> CSS vars + default embebida)
    notes/               # A CREAR: CRUD de notas (fase 1: localStorage)
  src-tauri/src/         # backend Rust (skin.rs ya existe sin commitear; falta verificar)
  skins/                 # skins editables (ejemplos ya existen)
    config.txt           # skinPath="glass-default"
    glass-default/       # referencia glassmorphism (7 TXT)
    webcore/             # ejemplo oscuro sólido (7 TXT)
  docs/SKIN_SPEC.md      # ESPECIFICACIÓN del formato TXT — fuente de verdad, léela primero
AGENTS.md                # reglas del espacio de trabajo IA (raíz del repo)
```

Resumen del formato (el detalle manda en `SKIN_SPEC.md`): una variable por
línea `clave="valor"`, `#` comentario, duplicada → última gana, clave
desconocida → se ignora, valores con `!important`/`;`/llaves → se ignoran.
Componentes: `background, button, note, sidebar, input, toolbar` (+ `skin.txt`
como manifiesto con `name/version/author`). Resolución por clave: skin activa
→ default embebida. Variables CSS resultantes: `--skin-<componente>-<clave>`
en `:root`.

## 5. Plan de tareas (en este orden, commit+push tras CADA una)

### Tarea A — Verificar el backend Rust (ya commiteado en `ed21fb2`)

1. Lee `xenner/src-tauri/src/skin.rs` y `git show ed21fb2 --stat`.
2. Verifica: `cd xenner/src-tauri && cargo check` (⚠️ ver sección 6, problema
   de disco: comprueba `df -h /` antes; si hay < 3 GB libres, NO lo ejecutes y
   verifica con `rustc --edition 2021` la lógica pura o con `cargo check`
   tras liberar espacio borrando `xenner/src-tauri/target/` — está en
   `.gitignore`, es seguro borrarlo).
3. Si compila sin cambios, no hay nada que commitear (prohibidos los commits
   vacíos): continúa con la Tarea B. Si hay que corregir algo, commit + push:
   `xenner: backend de skins en Rust — <corrección>`.

### Tarea B — SkinEngine del frontend + default glassmorphism embebida

Archivos a crear en `xenner/src/skin/`:

- `parse.ts` → `parseSkinTxt(text: string): Record<string,string>` según
  SKIN_SPEC §3 (comentarios, comillas opcionales, última gana, ignorar claves
  con caracteres peligrosos). **Puro y testeable, sin dependencias.**
- `defaultSkin.ts` → `DEFAULT_SKIN: Record<componente, Record<clave,valor>>`
  con los mismos valores de `xenner/skins/glass-default/*.txt` (glassmorphism:
  `rgba(255,255,255,0.08–0.14)`, `backdrop-filter: blur(...)`, bordes
  `rgba(255,255,255,0.18)`, texto `#ffffff`, acento `#7dd3fc`).
- `loader.ts` → `loadSkin(): Promise<{activeId, skins}>` con cadena de
  fallback por CADA fichero: 1) `invoke('read_skin_file'/'read_config'/
  'scan_skins')` de Tauri → 2) bundle Vite con
  `import.meta.glob('../../skins/**/*.txt', { query: '?raw', import: 'default', eager: true })`
  (para `pnpm dev` sin runtime Tauri) → 3) `DEFAULT_SKIN` embebida.
  Aplica el resultado como variables `--skin-*-*` en `document.documentElement`.
  **Nunca lanza excepción sin capturar: cualquier fallo → default embebida.**
- `skin.css` → estilos base que SOLO usan `var(--skin-...)` + regla
  `html, body { background: transparent; }` (obligatoria para ver detrás).

Verificación: `cd xenner && pnpm install && pnpm build` debe pasar en verde.
Commit + push: `xenner: SkinEngine frontend — parse TXT, default glassmorphism y fallback`.

### Tarea C — Creador de notas (CRUD mínimo, fase 1 con localStorage)

En `xenner/src/notes/` + `xenner/src/App.tsx` (sustituye la plantilla Greet):

- `store.ts`: CRUD con clave `xenner:notes:v1`: `{id, title, body, updatedAt}`.
  Funciones `listNotes, createNote, updateNote, deleteNote`. Puro SolidJS
  (`createSignal`/`createStore`), sin backend.
- UI desktop: `toolbar` (título + botón nueva nota + selector de skin con la
  lista de `loadSkin`), `sidebar` (lista de notas), `note` (editor título +
  cuerpo con autoguardado), `button`/`input`/`background` aplicados.
- **Cero colores hardcodeados**: todo vía `var(--skin-...)`.
- Demostración de skins: cambiar `skins/config.txt` a `skinPath="webcore"` y
  recargar debe cambiar toda la apariencia; `skinPath=""` o carpeta
  inexistente debe mostrar la glassmorphism embebida sin errores.

Verificación: `pnpm build` en verde + prueba manual en `pnpm dev`
(http://localhost:1420) de los 3 casos (glass-default / webcore / inexistente).
Commit + push: `xenner: creador de notas CRUD — sidebar, editor y selector de skins`.

### Tarea D — Transparencia real de ventana (glassmorphism que muestra el escritorio)

- Ya está `"transparent": true` en `tauri.conf.json` (pendiente de commit,
  Tarea A) + `background: transparent` (Tarea B). Verifica con `tauri dev`
  que se ve lo de detrás. (Si el entorno no tiene display/GPU, documenta el
  resultado como no verificado en vez de afirmar.)
- Documenta en `xenner/docs/SKIN_SPEC.md` o `AGENTS.md` lo ya investigado:
  `backdrop-filter` solo afecta al DOM; el blur de lo que hay detrás lo pone
  el compositor (Linux) o `window-vibrancy` (Windows/macOS, fase futura);
  riesgo `transparent:true` + Nvidia en Linux (tauri-apps/tauri#14924) y
  conmutador `transparent:false`.
- Commit + push: `xenner: ventana transparente — glassmorphism sobre el escritorio`.

## 6. Problemas técnicos conocidos (no te atasques en ellos)

1. **Disco lleno**: `/dev/sda4` estaba al 100%. Se liberó borrando
   `xenner/src-tauri/target/` (artefacto gitignoreado). Antes de `cargo check`
   o `cargo build`, ejecuta `df -h /`; si hay < 3 GB, NO compiles Tauri
   completo: verifica el frontend con `pnpm build` y el Rust con revisión de
   código + `rustc` de la lógica pura si aplica. Nunca afirmes que Rust compila
   sin haberlo ejecutado.
2. **`cargo check -p xenner_lib` FALLA**: el paquete se llama `xenner`
   (la lib es el target). Usa `cargo check` a secas desde `xenner/src-tauri`.
3. **Claves de Tauri ya verificadas** contra el schema oficial
   (`https://schema.tauri.app/config/2`): `WindowConfig.transparent` y
   `BundleConfig.resources` existen. No necesitas re-verificarlo.
4. **`xenner/.agents/skills/neversight-skills_feed-glassmorphism/`** existe en
   el repo (venía en la plantilla, ya commiteado). Úsalo como referencia de
   estilo glassmorphism si te sirve.
5. `web/` está vacío (reservado para futura versión web). No lo toques.

## 7. Restricciones duras

- No crear archivos fuera de `xenner/` (excepción: este prompt y `AGENTS.md`).
- Todo I/O de skins con fallback a la default embebida; prohibido `unwrap()` o
  `expect()` en rutas de skins (el backend ya cumple: mantenlo).
- `pnpm build` debe quedar en verde tras cada tarea frontend.
- Commits en español, formato `xenner: <tarea> — <detalle corto>`, un
  commit+push por tarea terminada. No acumules varias tareas en un commit.
- Si algo no se puede verificar (ej. render transparente sin GPU), escríbelo
  como hipótesis marcada con `?`, no como hecho.

## 8. Definición de terminado

- [ ] Tareas A–D commiteadas y pusheadas a `origin/main`, una por una.
- [ ] `pnpm build` verde; `cargo check` verde o bloqueado-por-disco documentado.
- [ ] La app abre, crea/edita/borra notas, cambia de skin editando
      `skins/config.txt` (`glass-default` ↔ `webcore` ↔ inexistente→default),
      y con ventana transparente se ve lo que hay detrás con efecto glass.
- [ ] `AGENTS.md` y `SKIN_SPEC.md` actualizados si el formato evolucionó.
