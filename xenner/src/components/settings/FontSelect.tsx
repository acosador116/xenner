import { For } from "solid-js";

import { FONT_GROUPS, FONT_OPTIONS } from "../../data/appearance";
import styles from "../../styles/components/FontSelect.module.css";

export interface FontSelectProps {
  id: string;
  value: string;
  onChange(value: string): void;
}

/**
 * Desplegable de tipografías agrupado por sensación y con cada opción escrita
 * en su propia tipografía: elegir no debería exigir saber qué es "serif".
 *
 * Xenner no descarga fuentes ni hace peticiones de red, así que solo se aplican
 * las que ya estén instaladas en el equipo. La pila de cada opción nombra de qué
 * se sustituye en ese caso, por eso el aviso del modal lo dice.
 */
export function FontSelect(props: FontSelectProps) {
  return (
    <select
      id={props.id}
      class={styles.select}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    >
      <For each={FONT_GROUPS}>
        {(group) => (
          <optgroup label={group.label}>
            <For each={FONT_OPTIONS.filter((font) => font.group === group.id)}>
              {(font) => (
                <option value={font.value} style={`font-family: ${font.value}`}>
                  {font.label}
                </option>
              )}
            </For>
          </optgroup>
        )}
      </For>
    </select>
  );
}
