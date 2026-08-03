/*
 * Imagen que se dibuja cuando una ficha no trae la suya o cuando la descarga falla.
 * Va incrustada como dato en lugar de apuntar a un archivo, puesto que así funciona igual sin servidor.
 */
export const IMAGEN_RESERVA =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
      <rect width='400' height='300' fill='#0b1520'/>
      <g fill='none' stroke='#3f5a72' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' transform='translate(176 96) scale(2)'>
        <path d='M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10M12 7v10'/>
      </g>
      <text x='200' y='210' text-anchor='middle' font-size='15' fill='#6f88a0'
        font-family='Segoe UI, sans-serif'>Imagen pendiente</text>
    </svg>`
  );
