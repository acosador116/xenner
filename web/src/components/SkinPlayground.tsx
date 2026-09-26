import { useMemo, useState } from 'react';
import './SkinPlayground.css';

/* Colores reales leídos de los TXT de xenner/skins y de defaultSkin.ts.
   No inventados: la demo debe enseñar la skin verdadera. */

type Preset = {
  id: string;
  name: string;
  file: string;
  origin: string;
  vars: Record<string, string>;
};

const PRESETS: Preset[] = [
  {
    id: 'webcore',
    name: 'WebCore',
    file: 'skins/webcore/background.txt',
    origin: 'sistémica',
    vars: {
      background: '#14161c',
      text: '#e8eaf0',
      accent: '#4ade80',
      radius: '12px',
      sidebar: '#10131a',
      note: '#1b1f2a',
    },
  },
  {
    id: 'glass',
    name: 'Glass',
    file: 'skins/glass-default/background.txt',
    origin: 'sistémica',
    vars: {
      background: 'rgba(28,34,44,0.34)',
      text: '#f4f7fb',
      accent: '#b7cee1',
      radius: '24px',
      sidebar: 'rgba(20,26,34,0.30)',
      note: 'rgba(255,255,255,0.10)',
    },
  },
  {
    id: 'default',
    name: 'Base embebida',
    file: 'src/skin/defaultSkin.ts',
    origin: 'fallback',
    vars: {
      background: '#ffffff',
      text: '#2f2f2f',
      accent: '#2383e2',
      radius: '10px',
      sidebar: '#f7f7f5',
      note: '#ffffff',
    },
  },
];

const KEYS = [
  { key: 'background', label: 'Fondo', type: 'color' },
  { key: 'text', label: 'Texto', type: 'color' },
  { key: 'accent', label: 'Acento', type: 'color' },
  { key: 'radius', label: 'Radio', type: 'radius' },
  { key: 'sidebar', label: 'Sidebar', type: 'color' },
  { key: 'note', label: 'Tarjeta', type: 'color' },
] as const;

const TREE = [
  { name: 'Ideas', depth: 0, kind: 'folder' as const },
  { name: 'Notas de escritorio', depth: 1, kind: 'note' as const, active: true },
  { name: 'Pieles TXT', depth: 1, kind: 'note' as const },
  { name: 'Ideas', depth: 0, kind: 'folder' as const },
  { name: 'Roadsides', depth: 1, kind: 'note' as const },
  { name: 'Biblioteca', depth: 0, kind: 'folder' as const },
  { name: 'Apuntes', depth: 1, kind: 'note' as const },
];

export default function SkinPlayground() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const base = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const vars = { ...base.vars, ...overrides };
  const editedCount = Object.keys(overrides).length;
  const isDark = useMemo(() => {
    const hex = vars.background.replace('#', '');
    if (hex.length !== 6) return false;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }, [vars.background]);

  const setKey = (key: string, value: string) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  const reset = () => setOverrides({});
  const switchPreset = (id: string) => {
    setPresetId(id);
    setOverrides({});
  };

  const t = `skin {
  --sk-bg: ${vars.background};
  --sk-text: ${vars.text};
  --sk-accent: ${vars.accent};
  --sk-radius: ${vars.radius};
  --sk-sidebar: ${vars.sidebar};
  --sk-note: ${vars.note};
}`;

  return (
    <div className="pg">
      <div className="pg__toolbar">
        <div className="pg__dots" aria-hidden="true">
          <i /><i /><i />
        </div>
        <p className="pg__file">
          <code>{base.file}</code>
        </p>
        <div className="pg__tabs" role="group" aria-label="Skins disponibles">
          {PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              aria-pressed={preset.id === presetId}
              data-active={preset.id === presetId}
              onClick={() => switchPreset(preset.id)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="pg__body">
        <div
          className="pg__app"
          data-dark={isDark}
          style={
            {
              '--sk-bg': vars.background,
              '--sk-text': vars.text,
              '--sk-accent': vars.accent,
              '--sk-radius': vars.radius,
              '--sk-sidebar': vars.sidebar,
              '--sk-note': vars.note,
            } as React.CSSProperties
          }
        >
          <div className="pg-app__bar">
            <span className="pg-app__title">Notas de escritorio.md</span>
            <span className="pg-app__state">
              <i aria-hidden="true" /> autoguardado
            </span>
          </div>

          <div className="pg-app__main">
            <nav className="pg-app__explorer" aria-label="Explorador de biblioteca">
              <p className="pg-app__heading">Biblioteca</p>
              <ul>
                {TREE.map((item) => (
                  <li key={item.name} data-depth={item.depth} data-active={'active' in item && item.active}>
                    <span aria-hidden="true">{item.kind === 'folder' ? '▸' : '•'}</span>
                    {item.name}
                  </li>
                ))}
              </ul>
            </nav>

            <article className="pg-app__doc">
              <h3>Notas de escritorio</h3>
              <p className="pg-app__lead">
                Xenner trabaja con una biblioteca local de archivos Markdown. El título de la
                nota es el nombre del archivo.
              </p>
              <p>
                Editor visual con encabezados, listas, tareas, tablas, código, enlaces, imágenes
                y LaTeX. Cada cambio se escribe en disco de forma atómica.
              </p>
              <ul className="pg-app__list">
                <li>Tarea completada</li>
                <li>Tarea pendiente</li>
              </ul>
              <p className="pg-app__quote">Cita en bloque para legibilidad.</p>

              <div className="pg-app__card">
                <span className="pg-app__card-label">Tarjeta · note.txt</span>
                <div className="pg-app__card-bar" />
                <div className="pg-app__card-bar" />
              </div>
            </article>
          </div>
        </div>

        <div className="pg__editor">
          <div className="pg__editor-head">
            <h3>Edita las claves</h3>
            <button
              type="button"
              className="pg__reset"
              onClick={reset}
              disabled={editedCount === 0}
            >
              {editedCount === 0 ? 'Sin cambios' : `Deshacer ${editedCount}`}
            </button>
          </div>

          {/* Región de estado fuera del botón: si viviera dentro, el lector de
              pantalla anunciaría el texto del botón dos veces. */}
          <p className="pg__status" role="status">
            {editedCount === 0
              ? 'Mostrando los valores del archivo, sin cambios.'
              : `${editedCount} ${editedCount === 1 ? 'clave modificada' : 'claves modificadas'} sobre el archivo original.`}
          </p>

          <div className="pg__fields">
            {KEYS.map(({ key, label, type }) => (
              <div className="pg__field" key={key}>
                {/* Cada control necesita un id propio: dos inputs con el mismo id
                    rompen la asociación label↔control. */}
                <label htmlFor={`pg-val-${key}`}>
                  <span>{label}</span>
                  <code>{key}</code>
                </label>
                <div className="pg__control">
                  {type === 'color' ? (
                    <input
                      type="color"
                      id={`pg-color-${key}`}
                      aria-label={`${label} (${key}) — selector de color`}
                      value={toHex(vars[key])}
                      onChange={(e) => setKey(key, e.target.value)}
                    />
                  ) : null}
                  <input
                    type="text"
                    id={`pg-val-${key}`}
                    className="pg__text"
                    value={vars[key]}
                    spellCheck={false}
                    onChange={(e) => setKey(key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="pg__hint">
            Los valores salen de los TXT de{' '}
            <code>skins/</code> y del fallback embebido. Una clave que no exista se ignora; el
            resto sigue resolviéndose.
          </p>
        </div>
      </div>

      <div className="pg__out">
        <span className="pg__out-label">CSS generado</span>
        <pre aria-live="polite"><code>{t}</code></pre>
      </div>
    </div>
  );
}

/** Los skins de vidrio usan rgba(); el input[type=color] solo admite hex. */
function toHex(value: string): string {
  if (value.startsWith('#')) {
    return value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value.slice(0, 7);
  }
  return '#888888';
}
