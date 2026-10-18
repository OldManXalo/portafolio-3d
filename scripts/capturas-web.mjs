// Capturas reales de las webs publicadas (Playwright). Uso: node scripts/capturas-web.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const dest = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/proyectos');
const tareas = [
  // BarberGest: se captura el código local (dice "30 días gratis"); la versión publicada aún dice 15 días.
  { url: pathToFileURL(path.join(os.homedir(), 'Documents', 'Proyectos Independientes', 'BarberGest', 'index.html')).href, nombre: 'barbergest-portada', vp: { width: 1440, height: 900 }, dpr: 1 },
  { url: 'https://data-gest-ten.vercel.app', nombre: 'datagest-movil', vp: { width: 390, height: 844 }, dpr: 2 },
];

const nav = await chromium.launch();
for (const t of tareas) {
  const pag = await nav.newPage({ viewport: t.vp, deviceScaleFactor: t.dpr });
  await pag.goto(t.url, { waitUntil: 'networkidle', timeout: 60000 });
  await pag.waitForTimeout(3000);
  const png = path.join(dest, `${t.nombre}.png`);
  await pag.screenshot({ path: png });
  // Convierte a WebP con Pillow y borra el PNG temporal
  execFileSync('python', ['-c', `from PIL import Image;import os;i=Image.open(r"${png}").convert("RGB");i=i.resize((min(i.width,1280),round(i.height*min(i.width,1280)/i.width)));i.save(r"${png.replace('.png', '.webp')}","WEBP",quality=82);os.remove(r"${png}")`]);
  console.log('ok', t.nombre);
  await pag.close();
}
await nav.close();
