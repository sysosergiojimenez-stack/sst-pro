import { useRef, useCallback } from 'react';

// Detecta "mantener presionado" (long press) en una fila/tarjeta.
// Uso: const handlers = useLongPress(() => activarSeleccion(id));
// <tr {...handlers}>...
export function useLongPress(onLongPress: () => void, ms: number = 450) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disparado = useRef(false);

  const start = useCallback(() => {
    disparado.current = false;
    timerRef.current = setTimeout(() => {
      disparado.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // Si se disparo el long press, evitamos que el click normal (ej. abrir detalle) se ejecute despues
    onClickCapture: (e: React.MouseEvent) => {
      if (disparado.current) {
        e.preventDefault();
        e.stopPropagation();
        disparado.current = false;
      }
    },
  };
}
