# Portafolio 3D — Estudio Martínez

Escaparate web para captar clientes de webs 3D. Muestra los tres productos del señor Martínez:
**Data Gest** (inventario multilocal), **BarberGest** y **NailGest**, con capturas reales.

HTML + CSS + JS sin compilar. Three.js y GSAP van copiados en `vendor/` (no dependen de un CDN);
solo las fuentes (Geist, Geist Mono, Instrument Serif) vienen de Google Fonts y, si fallan, se usan las del sistema.

## Verlo en local

```bash
npm install          # solo instala Playwright (para capturas y verificación)
npm run servir       # http://localhost:5173
```

Hace falta un servidor (no abrir `index.html` con doble clic): los módulos ES no cargan desde `file://`.

## Qué hay dentro

| Requisito | Dónde |
|---|---|
| Canvas fijo de fondo (z-index 0) con el HTML encima fluyendo con el scroll | `index.html` (`#escena`), `css/estilos.css` |
| Malla de partículas que se fragmenta y se reagrupa entre secciones (7 formas, una por sección) | `js/escena.js` → `FORMAS`, `NUBE_VERT` |
| GSAP + ScrollTrigger: una línea de tiempo atada al scroll (cámara que avanza, formas, humo) | `construirLinea()` |
| Modelo 3D (núcleo de esquirlas metálicas con corazón rojo) que se gira con clic izquierdo y arrastrar, con inercia | raycasting en `tocaNucleo()` / `girar()` |
| ShaderMaterial GLSL de humo rojo / transición líquida que cubre la pantalla en los interludios | `HUMO_FRAG` (fbm con deformación de dominio) |
| Flujos de datos: paquetes de partículas que viajan entre nodos (red del inventario y red de fondo) | `crearFlujo()`, `FLUJO_VERT` |
| Iluminación de cine: luz clave blanca suave, contraluces rojos, entorno `RoomEnvironment`, niebla | `crearEscena()` |

Secciones: hero · servicios (webs 3D, animaciones de scroll, shaders, dashboards) · Data Gest · BarberGest ·
NailGest · proceso · contacto (solo botones mailto y WhatsApp; la web no envía nada).

### Móvil, accesibilidad y respaldo
- Móvil o equipos de ≤4 núcleos: 6 500 partículas en vez de 16 000, menos paquetes y polvo, `pixelRatio` ≤ 1,5,
  sin antialias, escena escalada al ancho y nube más tenue detrás del texto.
- `prefers-reduced-motion`: sin humo, sin fragmentación, sin giro automático, sin cámara que avanza ni revelados;
  cada sección cambia la forma de golpe. Se puede cambiar en caliente.
- Sin WebGL: queda un degradado CSS con luz roja y la página funciona entera.
- Enlace "Saltar al contenido", foco visible, textos alternativos en todas las capturas, `lang="es"`.

## Antes de publicar (decisiones del señor)
1. **Contacto:** poner correo y WhatsApp reales en `js/config.js` (ahora son de ejemplo).
2. **Nombre de marca:** "Estudio Martínez" es provisional (barra, título, pie).
3. **BarberGest — días de prueba:** el portafolio dice **30 días gratis** (lo que dicen el encargo y el código local),
   pero la web publicada `barber-gest.vercel.app` todavía dice **15 días**. Hay que publicar la versión local de
   BarberGest o cambiar el texto aquí. La captura de portada se hizo desde el código local por eso.
4. **Enlaces en vivo:** Data Gest (`data-gest-ten.vercel.app`) y BarberGest llevan botón "Ver la web publicada".
   NailGest no lleva enlace porque aún no está desplegada. Ojo: `data-gest.vercel.app` (sin "-ten") es una web ajena.
5. No lleva precios de ningún producto; NailGest no menciona prueba gratis.

## Capturas
`assets/proyectos/` — todas reales.
- `python scripts/capturas.py`: convierte a WebP capturas que ya existían en NailGest y BarberGest.
- `node scripts/capturas-web.mjs`: captura con Playwright Data Gest publicada y la portada local de BarberGest.

## Verificación
```bash
npm run servir                # en una terminal
npm run verificar             # en otra: recorre la página en escritorio, móvil y movimiento reducido
```
Guarda capturas en `verificacion/` y falla si hay errores o avisos en la consola o recursos que no cargan.
Última pasada (18/10/2026): **sin errores ni avisos** en los tres casos.

## Publicar
Es estático: sirve en Vercel, Netlify o GitHub Pages subiendo la carpeta (sin `node_modules/` ni `verificacion/`).
**No está publicado**: queda pendiente de la aprobación del señor.
