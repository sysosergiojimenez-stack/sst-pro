// Detecta "mantener presionado" (long press) en una fila/tarjeta.
// IMPORTANTE: esto es una funcion normal, NO un hook de React - es seguro
// llamarla dentro de un .map() (los hooks de React no pueden usarse en bucles).
// Uso: <tr {...longPressHandlers(() => activarSeleccion(id))}>...
export function longPressHandlers(onLongPress: () => void, ms: number = 450) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disparado = false;

  const start = () => {
    disparado = false;
    timer = setTimeout(() => {
      disparado = true;
      onLongPress();
    }, ms);
  };

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // Si se disparo el long press, evitamos que el click normal (ej. abrir detalle) se ejecute despues
    onClickCapture: (e: React.MouseEvent) => {
      if (disparado) {
        e.preventDefault();
        e.stopPropagation();
        disparado = false;
      }
    },
  };
}
