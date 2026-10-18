// Verificación con Playwright: errores de consola, capturas en escritorio, móvil y con movimiento reducido.
// Uso: npm run servir (en otra terminal) y luego: node scripts/verificar.mjs [url]
import { chromium } from 'playwright';
import fs from 'node:fs';

const url = process.argv[2] || 'http://localhost:5173/';
fs.mkdirSync('verificacion', { recursive: true });
const casos = [
  { nombre: 'escritorio', vp: { width: 1440, height: 900 }, dpr: 1 },
  { nombre: 'movil', vp: { width: 390, height: 844 }, dpr: 2, movil: true },
  { nombre: 'reducido', vp: { width: 1440, height: 900 }, dpr: 1, reducido: true },
];
const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fallos = 0;
for (const c of casos) {
  const ctx = await nav.newContext({ viewport: c.vp, deviceScaleFactor: c.dpr, isMobile: !!c.movil, hasTouch: !!c.movil,
    reducedMotion: c.reducido ? 'reduce' : 'no-preference' });
  const pag = await ctx.newPage();
  const errores = [];
  pag.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(`[${m.type()}] ${m.text()}`); });
  pag.on('pageerror', (e) => errores.push('[pageerror] ' + e.message));
  pag.on('requestfailed', (r) => errores.push('[red] ' + r.url() + ' ' + (r.failure()?.errorText || '')));
  await pag.goto(url, { waitUntil: 'networkidle' });
  await pag.waitForTimeout(2500);
  const alto = await pag.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const puntos = c.nombre === 'escritorio' ? 14 : 7;
  for (let i = 0; i <= puntos; i++) {
    await pag.evaluate((y) => window.scrollTo(0, y), Math.round(alto * i / puntos));
    await pag.waitForTimeout(1500);
    await pag.screenshot({ path: `verificacion/${c.nombre}-${String(i).padStart(2, '0')}.png` });
  }
  console.log(`${c.nombre}: ${errores.length ? errores.join('\n  ') : 'sin errores ni avisos'}`);
  fallos += errores.filter((e) => !e.includes('GPU stall') && !e.includes('GL Driver Message')).length;
  await ctx.close();
}
await nav.close();
process.exit(fallos ? 1 : 0);
