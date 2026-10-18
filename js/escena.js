/*
 * Portafolio 3D — escena de fondo.
 * - Canvas fijo detrás del HTML (z-index 0); el texto fluye encima con el scroll.
 * - Nube de partículas (ShaderMaterial) con 7 formas, una por sección: se fragmenta y se recompone.
 * - Núcleo 3D que se gira con clic izquierdo y arrastrar (raycasting) e inercia.
 * - Flujos de datos: paquetes de partículas que viajan entre nodos (motivo visual).
 * - Humo rojo / transición líquida (ShaderMaterial a pantalla completa) en los interludios.
 * - GSAP + ScrollTrigger: una sola línea de tiempo atada al scroll mueve cámara, formas y humo.
 */
import * as THREE from 'three';
import { RoomEnvironment } from './../vendor/addons/RoomEnvironment.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
const punteroFino = window.matchMedia('(pointer: fine)').matches;
const esMovil = () => window.innerWidth < 760 || !punteroFino;

/* ------------------------------------------------------------------ */
/* Interfaz: revelado de textos (funciona aunque no haya WebGL)        */
/* ------------------------------------------------------------------ */
function prepararInterfaz() {
  const pista = document.getElementById('pista-girar');
  if (pista && !punteroFino) pista.textContent = 'Desliza hacia abajo para recorrer';

  if (menosMovimiento.matches) return;
  document.documentElement.classList.add('js');
  const piezas = document.querySelectorAll(
    '.hero-texto > *, .encabezado, .lista-servicios li, .proyecto-texto > *, .captura, .pasos li, .contacto > *'
  );
  piezas.forEach((el) => el.classList.add('revelar'));
  // Hero: entra al cargar
  gsap.to('.hero-texto > *', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.15 });
  // Resto: al entrar en pantalla, por lotes
  ScrollTrigger.batch(document.querySelectorAll('.revelar:not(.hero-texto > *)'), {
    start: 'top 90%',
    once: true,
    onEnter: (lote) => gsap.to(lote, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.07, overwrite: true }),
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades de formas                                                */
/* ------------------------------------------------------------------ */
const azar = (a, b) => a + Math.random() * (b - a);
function enEsfera(r) {
  const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return [r * s * Math.cos(t), r * u, r * s * Math.sin(t)];
}

// Posiciones de los "locales" del inventario: también son los nodos del flujo de datos
const LOCALES = [
  [0, 0, 0, 1.5], [-2.7, 1.5, -0.4, 1.0], [2.7, 1.5, -0.4, 1.0], [-2.7, -1.5, 0.4, 1.0], [2.7, -1.5, 0.4, 1.0],
];

const FORMAS = [
  // 0 · Hero: halo esférico alrededor del núcleo
  () => enEsfera(azar(2.7, 3.5)),
  // 1 · Servicios: nudo toroidal
  () => {
    const t = Math.random() * Math.PI * 2, p = 2, q = 3;
    const r = 1.6 + 0.7 * Math.cos(q * t);
    const c = [r * Math.cos(p * t), r * Math.sin(p * t), 0.7 * Math.sin(q * t)];
    const o = enEsfera(azar(0, 0.38));
    return [c[0] * 1.15 + o[0], c[1] * 1.15 + o[1], c[2] * 1.15 + o[2]];
  },
  // 2 · Data Gest: depósito + cuatro locales (cubos de partículas)
  () => {
    const [cx, cy, cz, s] = LOCALES[Math.random() < 0.32 ? 0 : 1 + Math.floor(Math.random() * 4)];
    const h = s / 2, cara = Math.floor(Math.random() * 3), signo = Math.random() < 0.5 ? -1 : 1;
    const v = [azar(-h, h), azar(-h, h), azar(-h, h)];
    v[cara] = signo * h;
    if (Math.random() < 0.45) v[(cara + 1) % 3] = (Math.random() < 0.5 ? -1 : 1) * h; // aristas más densas
    return [cx + v[0], cy + v[1], cz + v[2]];
  },
  // 3 · BarberGest: poste de barbería (cilindro con franjas en espiral)
  () => {
    const y = azar(-2.6, 2.6), franja = Math.random() < 0.7;
    let a = Math.random() * Math.PI * 2;
    if (franja) a = y * 1.6 + Math.floor(Math.random() * 3) * (Math.PI * 2 / 3) + azar(-0.18, 0.18);
    const r = franja ? 0.95 : azar(0.9, 1.0);
    const ang = 0.35, x = r * Math.cos(a), z = r * Math.sin(a);
    return [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang), z];
  },
  // 4 · NailGest: gota de esmalte (superficie de revolución)
  () => {
    const t = Math.acos(1 - 2 * Math.random()), a = Math.random() * Math.PI * 2;
    const r = 1.75 * Math.sin(t) * Math.pow(Math.sin(t / 2), 1.1);
    const y = -2.3 * Math.cos(t) + 0.3;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  },
  // 5 · Proceso: manto ondulado
  () => {
    const x = azar(-5.2, 5.2), z = azar(-2.8, 2.8);
    const y = 0.45 * Math.sin(x * 1.2) * Math.cos(z * 1.4) + 0.25 * Math.sin(x * 0.5 + z);
    const inc = -0.5;
    return [x, y * Math.cos(inc) - z * Math.sin(inc), y * Math.sin(inc) + z * Math.cos(inc)];
  },
  // 6 · Contacto: anillo alrededor del núcleo
  () => {
    const a = Math.random() * Math.PI * 2, R = Math.random() < 0.8 ? 3.0 : azar(2.2, 4.2);
    const o = enEsfera(azar(0, 0.2));
    const x = R * Math.cos(a) + o[0], y = o[1] * 0.6, z = R * Math.sin(a) + o[2];
    const inc = 1.2;
    return [x, y * Math.cos(inc) - z * Math.sin(inc), y * Math.sin(inc) + z * Math.cos(inc)];
  },
];

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */
const NUBE_VERT = /* glsl */ `
  attribute vec3 p0; attribute vec3 p1; attribute vec3 p2; attribute vec3 p3;
  attribute vec3 p4; attribute vec3 p5; attribute vec3 p6;
  attribute vec4 aAzar;
  uniform float uForma, uTiempo, uDispersion, uTam, uPixel;
  varying float vRojo, vFrag, vAlfa;

  vec3 forma(float i) {
    if (i < 0.5) return p0; if (i < 1.5) return p1; if (i < 2.5) return p2;
    if (i < 3.5) return p3; if (i < 4.5) return p4; if (i < 5.5) return p5; return p6;
  }
  void main() {
    float f = clamp(uForma, 0.0, 6.0);
    float a = min(floor(f), 5.0);
    float t = f - a;
    // Cada partícula sale con su propio retraso: la malla se deshace y se reagrupa por capas
    float tt = smoothstep(0.0, 1.0, clamp((t - aAzar.x * 0.35) / 0.65, 0.0, 1.0));
    vec3 pos = mix(forma(a), forma(a + 1.0), tt);

    // Fragmentación: máxima a mitad de la transición
    float frag = sin(3.14159 * t) * uDispersion;
    vec3 dir = normalize(aAzar.yzw * 2.0 - 1.0 + 0.0001);
    pos += dir * frag * (1.2 + aAzar.x * 3.2);
    float ang = frag * (aAzar.y - 0.5) * 2.4;
    pos.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pos.xz;

    // Respiración suave en reposo
    pos += 0.035 * vec3(sin(uTiempo * 0.7 + aAzar.x * 40.0), cos(uTiempo * 0.6 + aAzar.y * 40.0), sin(uTiempo * 0.5 + aAzar.z * 40.0));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uTam * uPixel * (0.55 + aAzar.y * 0.9) * (1.0 + frag * 0.6) / -mv.z;
    vRojo = step(0.87, aAzar.w);
    vFrag = frag;
    vAlfa = 0.55 + 0.45 * aAzar.z;
  }
`;
const NUBE_FRAG = /* glsl */ `
  uniform float uBrillo;
  varying float vRojo, vFrag, vAlfa;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    vec3 blanco = vec3(0.93, 0.92, 0.9);
    vec3 rojo = vec3(1.0, 0.16, 0.14);
    vec3 col = mix(blanco, rojo, clamp(vRojo + vFrag * 0.35, 0.0, 1.0));
    gl_FragColor = vec4(col, a * vAlfa * uBrillo);
  }
`;

const FLUJO_VERT = /* glsl */ `
  attribute vec3 aDe; attribute vec3 aA; attribute vec3 aCtrl; attribute vec2 aVel;
  uniform float uTiempo, uTam, uPixel;
  varying float vVida, vRojo;
  void main() {
    float t = fract(uTiempo * aVel.x + aVel.y);
    float u = 1.0 - t;
    vec3 pos = u * u * aDe + 2.0 * u * t * aCtrl + t * t * aA; // curva de Bézier cuadrática
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    vVida = sin(3.14159 * t);
    vRojo = step(0.5, fract(aVel.y * 7.0));
    gl_PointSize = uTam * uPixel * (0.4 + vVida) / -mv.z;
  }
`;
const FLUJO_FRAG = /* glsl */ `
  uniform float uOpacidad;
  varying float vVida, vRojo;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(0.95), vec3(1.0, 0.2, 0.16), vRojo);
    gl_FragColor = vec4(col, a * vVida * uOpacidad);
  }
`;

const HUMO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const HUMO_FRAG = /* glsl */ `
  uniform float uTiempo, uCubrir, uAspecto;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) { v += a * ruido(p); p = r * p * 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 p = vUv * vec2(uAspecto, 1.0) * 2.4;
    float t = uTiempo * 0.07;
    // Deformación de dominio: aspecto de humo / líquido espeso
    vec2 q = vec2(fbm(p + vec2(0.0, t * 2.0)), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.5), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
    float n = fbm(p + 2.6 * r);

    // Frente que sube: cubre de abajo arriba (0→1) y se retira por abajo (1→2)
    float v = vUv.y * 0.72 + n * 0.5 - 0.12;
    float e1 = uCubrir * 1.5 - 0.25;
    float e2 = (uCubrir - 1.0) * 1.5 - 0.25;
    float cubre = (1.0 - smoothstep(e1 - 0.2, e1, v)) * smoothstep(e2, e2 + 0.2, v);
    float borde = clamp(cubre * (1.0 - cubre) * 4.0, 0.0, 1.0);

    vec3 hondo = vec3(0.018, 0.004, 0.006);
    vec3 vino = vec3(0.36, 0.02, 0.04);
    vec3 col = mix(hondo, vino, smoothstep(0.35, 0.95, n));
    col += vec3(0.9, 0.08, 0.07) * pow(clamp(r.x, 0.0, 1.0), 4.0) * 0.55;
    col += vec3(1.0, 0.22, 0.16) * borde * 0.85;
    float vineta = smoothstep(1.25, 0.25, length(vUv - 0.5) * 1.6);
    col *= 0.55 + 0.45 * vineta;
    gl_FragColor = vec4(col, clamp(cubre * 0.97 + borde * 0.3, 0.0, 1.0));
  }
`;

/* ------------------------------------------------------------------ */
/* Escena                                                              */
/* ------------------------------------------------------------------ */
function webglDisponible() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

function crearEscena() {
  const canvas = document.getElementById('escena');
  const movil = esMovil();
  const pocos = movil || (navigator.hardwareConcurrency || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !movil, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, movil ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x050505, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const escena = new THREE.Scene();
  escena.fog = new THREE.FogExp2(0x050505, 0.028);
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camara = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
  camara.position.set(0, 0, 10);

  // Luces de cine: una clave blanca suave y contraluces rojos
  escena.add(new THREE.AmbientLight(0xffffff, 0.06));
  const clave = new THREE.DirectionalLight(0xfff4ea, 1.6);
  clave.position.set(-4, 5, 6);
  escena.add(clave);

  // "mundo" sigue a la cámara a distancia fija; el polvo del fondo da la sensación de avance
  const mundo = new THREE.Group();
  escena.add(mundo);
  const contraluz = new THREE.PointLight(0xff2a2a, 40, 14, 1.6);
  contraluz.position.set(2.5, 1.2, -2.5);
  mundo.add(contraluz);
  const bajo = new THREE.PointLight(0xc4141c, 18, 10, 1.8);
  bajo.position.set(-2, -2.5, 1.5);
  mundo.add(bajo);

  /* ---------- Nube de partículas ---------- */
  const N = pocos ? 6500 : 16000;
  const geo = new THREE.BufferGeometry();
  FORMAS.forEach((fn, i) => {
    const arr = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) arr.set(fn(), k * 3);
    geo.setAttribute('p' + i, new THREE.BufferAttribute(arr, 3));
  });
  geo.setAttribute('position', geo.getAttribute('p0'));
  const az = new Float32Array(N * 4);
  for (let k = 0; k < N * 4; k++) az[k] = Math.random();
  geo.setAttribute('aAzar', new THREE.BufferAttribute(az, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

  const pixel = renderer.getPixelRatio();
  const matNube = new THREE.ShaderMaterial({
    vertexShader: NUBE_VERT, fragmentShader: NUBE_FRAG,
    uniforms: {
      uForma: { value: 0 }, uTiempo: { value: 0 }, uDispersion: { value: menosMovimiento.matches ? 0 : 1 },
      uTam: { value: pocos ? 34 : 26 }, uPixel: { value: pixel }, uBrillo: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const nube = new THREE.Points(geo, matNube);
  mundo.add(nube);

  /* ---------- Flujos de datos entre nodos ---------- */
  function crearFlujo(nodos, aristas, paquetesPorArista, tam, opacidad) {
    const grupo = new THREE.Group();
    const total = aristas.length * paquetesPorArista;
    const de = new Float32Array(total * 3), a = new Float32Array(total * 3), ctrl = new Float32Array(total * 3), vel = new Float32Array(total * 2);
    const matLinea = new THREE.LineBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.16 * opacidad, depthWrite: false });
    let k = 0;
    aristas.forEach(([i, j]) => {
      const A = new THREE.Vector3(...nodos[i]), B = new THREE.Vector3(...nodos[j]);
      const C = A.clone().add(B).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.25 * A.distanceTo(B) * (Math.random() < 0.5 ? 1 : -1), 0.9));
      const curva = new THREE.QuadraticBezierCurve3(A, C, B);
      grupo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curva.getPoints(40)), matLinea));
      for (let p = 0; p < paquetesPorArista; p++, k++) {
        const ida = Math.random() < 0.6;
        de.set((ida ? A : B).toArray(), k * 3); a.set((ida ? B : A).toArray(), k * 3); ctrl.set(C.toArray(), k * 3);
        vel[k * 2] = azar(0.12, 0.32); vel[k * 2 + 1] = Math.random();
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(de, 3));
    g.setAttribute('aDe', new THREE.BufferAttribute(de, 3));
    g.setAttribute('aA', new THREE.BufferAttribute(a, 3));
    g.setAttribute('aCtrl', new THREE.BufferAttribute(ctrl, 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    const mat = new THREE.ShaderMaterial({
      vertexShader: FLUJO_VERT, fragmentShader: FLUJO_FRAG,
      uniforms: { uTiempo: { value: 0 }, uTam: { value: tam }, uPixel: { value: pixel }, uOpacidad: { value: opacidad } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    grupo.add(new THREE.Points(g, mat));
    const matNodo = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: opacidad });
    const esf = new THREE.SphereGeometry(1, 12, 12);
    nodos.forEach((n, i) => {
      const m = new THREE.Mesh(esf, i === 0 ? new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: opacidad }) : matNodo);
      m.position.set(n[0], n[1], n[2]); m.scale.setScalar(n[3] ? 0.045 : 0.05);
      grupo.add(m);
    });
    grupo.userData = { mat, matLinea, matNodo, base: opacidad };
    grupo.userData.fijar = (o) => {
      mat.uniforms.uOpacidad.value = o; matLinea.opacity = 0.16 * o; matNodo.opacity = o;
      grupo.children.forEach((c) => { if (c.isMesh) c.material.opacity = o; });
      grupo.visible = o > 0.01;
    };
    return grupo;
  }
  // Red del inventario: traslados entre depósito y locales
  const flujoInventario = crearFlujo(
    LOCALES.map((l) => [l[0], l[1], l[2] + 0.2, 1]),
    [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [3, 4], [2, 4]], pocos ? 22 : 60, pocos ? 70 : 60, 0
  );
  mundo.add(flujoInventario);
  // Red de fondo: siempre presente, lejana
  const nodosFondo = Array.from({ length: 11 }, () => [azar(-16, 16), azar(-8, 8), azar(-22, -12)]);
  const aristasFondo = [];
  nodosFondo.forEach((_, i) => { aristasFondo.push([i, (i + 1 + Math.floor(Math.random() * 3)) % nodosFondo.length]); });
  const flujoFondo = crearFlujo(nodosFondo, aristasFondo, pocos ? 10 : 26, 120, 0.4);
  mundo.add(flujoFondo);

  /* ---------- Núcleo 3D (se gira con el ratón) ---------- */
  const nucleo = new THREE.Group();
  mundo.add(nucleo);
  let shell = new THREE.IcosahedronGeometry(1.15, 1); // ya viene sin índices
  {
    // Esquirlas: cada triángulo se encoge hacia su centro y se quitan algunos para ver el corazón rojo
    const pos = shell.getAttribute('position');
    const salida = [];
    const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (let t = 0; t < pos.count; t += 3) {
      if (Math.random() < 0.28) continue;
      for (let j = 0; j < 3; j++) v[j].fromBufferAttribute(pos, t + j);
      const c = v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1 / 3);
      for (let j = 0; j < 3; j++) salida.push(...v[j].clone().lerp(c, 0.1).toArray());
    }
    shell = new THREE.BufferGeometry();
    shell.setAttribute('position', new THREE.Float32BufferAttribute(salida, 3));
    shell.computeVertexNormals();
  }
  const matShell = new THREE.MeshPhysicalMaterial({
    color: 0x141416, metalness: 1, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25,
    flatShading: true, side: THREE.DoubleSide, envMapIntensity: 0.6,
  });
  const malla = new THREE.Mesh(shell, matShell);
  nucleo.add(malla);
  const corazon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  nucleo.add(corazon);
  const alambre = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.55, 1)),
    new THREE.LineBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.28 })
  );
  nucleo.add(alambre);
  const anillos = new THREE.Group();
  [[1.95, 0xffffff, 0.45, 0.4], [2.3, 0xff3b3b, 0.5, -0.7]].forEach(([r, c, o, inc]) => {
    const an = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 180), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o }));
    an.rotation.x = Math.PI / 2 + inc;
    anillos.add(an);
  });
  nucleo.add(anillos);
  // Halo: textura radial hecha en un canvas
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,60,50,0.9)'); gr.addColorStop(0.25, 'rgba(220,30,40,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(3.4);
  nucleo.add(halo);

  /* ---------- Polvo de fondo a lo largo del recorrido ---------- */
  const M = pocos ? 900 : 2600;
  const polvo = new Float32Array(M * 3);
  for (let k = 0; k < M; k++) polvo.set([azar(-22, 22), azar(-14, 14), azar(-130, 12)], k * 3);
  const gPolvo = new THREE.BufferGeometry();
  gPolvo.setAttribute('position', new THREE.BufferAttribute(polvo, 3));
  const polvoPts = new THREE.Points(gPolvo, new THREE.PointsMaterial({
    color: 0x8a8580, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false,
  }));
  escena.add(polvoPts);

  /* ---------- Humo rojo a pantalla completa ---------- */
  const escenaHumo = new THREE.Scene();
  const camHumo = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const matHumo = new THREE.ShaderMaterial({
    vertexShader: HUMO_VERT, fragmentShader: HUMO_FRAG,
    uniforms: { uTiempo: { value: 0 }, uCubrir: { value: 0 }, uAspecto: { value: window.innerWidth / window.innerHeight } },
    transparent: true, depthTest: false, depthWrite: false,
  });
  const planoHumo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matHumo);
  planoHumo.frustumCulled = false;
  escenaHumo.add(planoHumo);

  /* ------------------------------------------------------------------ */
  /* Estado que mueve el scroll                                          */
  /* ------------------------------------------------------------------ */
  // Valores por sección (forma = índice data-forma)
  const AJUSTES = [
    { x: 2.6, y: 0, brillo: 1.0, nucleo: 1, flujo: 0 },    // hero
    { x: 0, y: 0, brillo: 0.5, nucleo: 0, flujo: 0 },      // servicios
    { x: 2.2, y: 0, brillo: 0.75, nucleo: 0, flujo: 1 },   // data gest
    { x: -2.4, y: 0, brillo: 0.75, nucleo: 0, flujo: 0 },  // barbergest
    { x: 2.4, y: 0, brillo: 0.75, nucleo: 0, flujo: 0 },   // nailgest
    { x: 0, y: -0.6, brillo: 0.5, nucleo: 0, flujo: 0 },   // proceso
    { x: 0, y: 0, brillo: 0.6, nucleo: 0.62, flujo: 0.3 },  // contacto
  ];
  const estado = { forma: 0, humo: 0, camZ: 10, ...AJUSTES[0] };

  let linea = null;
  let disparadoresQuietos = [];
  const secciones = [...document.querySelectorAll('[data-forma]')];
  const interludios = [...document.querySelectorAll('[data-humo]')];
  const arriba = (el) => el.getBoundingClientRect().top + window.scrollY;

  function construirLinea() {
    if (linea) { linea.scrollTrigger && linea.scrollTrigger.kill(); linea.kill(); linea = null; }
    disparadoresQuietos.forEach((t) => t.kill());
    disparadoresQuietos = [];
    const vh = window.innerHeight;
    const total = Math.max(1, document.documentElement.scrollHeight - vh);
    const n = (px) => Math.min(1, Math.max(0, px / total));

    if (menosMovimiento.matches) {
      // Sin animaciones de scroll: cada sección fija su forma al entrar, sin transiciones
      secciones.forEach((sec) => {
        const k = +sec.dataset.forma;
        disparadoresQuietos.push(ScrollTrigger.create({
          trigger: sec, start: 'top 60%', end: 'bottom 40%',
          onToggle: (s) => { if (s.isActive) Object.assign(estado, { forma: k, ...AJUSTES[k] }); },
        }));
      });
      return;
    }

    linea = gsap.timeline({
      defaults: { ease: 'power1.inOut', immediateRender: false },
      scrollTrigger: { trigger: document.body, start: 0, end: () => total, scrub: 1.1 },
    });
    // La cámara avanza durante todo el recorrido
    linea.fromTo(estado, { camZ: 10 }, { camZ: -95, duration: 1, ease: 'none' }, 0);
    // Formas: la malla se fragmenta y se reagrupa al entrar cada sección
    secciones.forEach((sec) => {
      const k = +sec.dataset.forma;
      if (k === 0) return;
      const ini = n(arriba(sec) - vh * 0.95), fin = n(arriba(sec) - vh * 0.2);
      linea.fromTo(estado, { forma: k - 1, ...AJUSTES[k - 1] }, { forma: k, ...AJUSTES[k], duration: Math.max(0.001, fin - ini) }, ini);
    });
    // Humo: cubre la pantalla en cada interludio y se retira
    interludios.forEach((el) => {
      const t = arriba(el), h = el.offsetHeight;
      const a0 = n(t - vh), a1 = n(t - vh * 0.05), b0 = n(t + h - vh * 1.05), b1 = n(t + h - vh * 0.1);
      linea.fromTo(estado, { humo: 0 }, { humo: 1, duration: Math.max(0.001, a1 - a0), ease: 'power2.out' }, a0);
      linea.fromTo(estado, { humo: 1 }, { humo: 2, duration: Math.max(0.001, b1 - b0), ease: 'power2.in' }, b0);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Girar el núcleo: clic izquierdo + arrastrar (raycasting)            */
  /* ------------------------------------------------------------------ */
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let arrastrando = false, ultimo = { x: 0, y: 0 };
  const vel = { x: 0, y: 0 };
  const ejeY = new THREE.Vector3(0, 1, 0), ejeX = new THREE.Vector3(1, 0, 0), qTmp = new THREE.Quaternion();

  function tocaNucleo(cx, cy) {
    if (!nucleo.visible || nucleo.scale.x < 0.3) return false;
    puntero.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    return rayo.intersectObjects([malla, corazon], false).length > 0 ||
      rayo.ray.distanceToPoint(nucleo.getWorldPosition(new THREE.Vector3())) < 1.3 * nucleo.scale.x * mundo.scale.x;
  }
  function girar(dx, dy) {
    qTmp.setFromAxisAngle(ejeY, dx); nucleo.quaternion.premultiply(qTmp);
    qTmp.setFromAxisAngle(ejeX, dy); nucleo.quaternion.premultiply(qTmp);
  }
  const interactivo = 'a, button, input, textarea, select, figure, nav, .stack, .rasgos';
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest(interactivo)) return;
    if (!tocaNucleo(e.clientX, e.clientY)) return;
    arrastrando = true; ultimo = { x: e.clientX, y: e.clientY }; vel.x = vel.y = 0;
    if (e.pointerType === 'mouse') e.preventDefault(); // evita seleccionar texto al arrastrar
    document.body.style.cursor = 'grabbing';
  });
  window.addEventListener('pointermove', (e) => {
    if (arrastrando) {
      const dx = (e.clientX - ultimo.x) * 0.006, dy = (e.clientY - ultimo.y) * 0.006;
      ultimo = { x: e.clientX, y: e.clientY };
      girar(dx, dy); vel.x = dx; vel.y = dy;
    } else if (e.pointerType === 'mouse') {
      const sobre = !e.target.closest(interactivo) && tocaNucleo(e.clientX, e.clientY);
      document.body.style.cursor = sobre ? 'grab' : '';
    }
  });
  const soltar = () => { if (arrastrando) { arrastrando = false; document.body.style.cursor = ''; } };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);

  // Paralaje sutil con el ratón
  const raton = { x: 0, y: 0 };
  if (punteroFino) window.addEventListener('mousemove', (e) => { raton.x = e.clientX / window.innerWidth - 0.5; raton.y = e.clientY / window.innerHeight - 0.5; });

  /* ------------------------------------------------------------------ */
  /* Bucle                                                               */
  /* ------------------------------------------------------------------ */
  const reloj = new THREE.Clock();
  let tiempo = 0;
  const camObjetivo = new THREE.Vector3();

  function escalaPantalla() {
    const asp = window.innerWidth / window.innerHeight;
    return asp < 1 ? Math.max(0.5, asp * 0.95) : 1;
  }
  let escala = escalaPantalla();

  function cuadro() {
    const dt = Math.min(reloj.getDelta(), 0.05);
    const quieto = menosMovimiento.matches;
    if (!quieto) tiempo += dt;

    const movilAhora = window.innerWidth < 760;
    const offX = movilAhora ? 0 : estado.x;
    const offY = movilAhora ? estado.y + (estado.nucleo > 0.5 ? 0.9 : 0) : estado.y;
    camara.position.z = estado.camZ;
    camObjetivo.set(raton.x * 0.6, -raton.y * 0.4, 0);
    camara.position.x += (camObjetivo.x - camara.position.x) * 0.05;
    camara.position.y += (camObjetivo.y - camara.position.y) * 0.05;
    camara.lookAt(camara.position.x * 0.5, camara.position.y * 0.5, estado.camZ - 10);

    mundo.position.set(offX, offY, estado.camZ - 10);
    mundo.scale.setScalar(escala);
    nube.rotation.y = tiempo * 0.05;
    flujoInventario.rotation.y = 0; // la red del inventario queda frontal para leerse bien
    matNube.uniforms.uForma.value = estado.forma;
    matNube.uniforms.uTiempo.value = tiempo;
    matNube.uniforms.uBrillo.value = estado.brillo * (movilAhora ? 0.5 : 1);

    flujoInventario.userData.fijar(estado.flujo);
    flujoInventario.userData.mat.uniforms.uTiempo.value = tiempo;
    flujoFondo.userData.mat.uniforms.uTiempo.value = tiempo;

    // Núcleo: aparece en el hero y en el contacto
    const s = estado.nucleo;
    nucleo.visible = s > 0.01;
    nucleo.scale.setScalar(Math.max(0.0001, s));
    if (!arrastrando) {
      if (!quieto) girar(0.0025, 0);
      girar(vel.x, vel.y); vel.x *= 0.94; vel.y *= 0.94;
    }
    anillos.rotation.z = tiempo * 0.15;
    alambre.rotation.y = -tiempo * 0.08;
    corazon.scale.setScalar(1 + Math.sin(tiempo * 2.2) * 0.06);
    contraluz.intensity = 40 * (0.7 + 0.3 * s);

    renderer.clear();
    renderer.render(escena, camara);
    if (estado.humo > 0.001 && estado.humo < 1.999 && !quieto) {
      matHumo.uniforms.uCubrir.value = estado.humo;
      matHumo.uniforms.uTiempo.value = tiempo;
      renderer.render(escenaHumo, camHumo);
    }
    requestAnimationFrame(cuadro);
  }

  /* ---------- Tamaño ---------- */
  let anchoPrevio = window.innerWidth, espera;
  window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    matHumo.uniforms.uAspecto.value = camara.aspect;
    escala = escalaPantalla();
    if (window.innerWidth !== anchoPrevio) {
      anchoPrevio = window.innerWidth;
      clearTimeout(espera);
      espera = setTimeout(() => { construirLinea(); ScrollTrigger.refresh(); }, 250);
    }
  });
  menosMovimiento.addEventListener('change', () => {
    matNube.uniforms.uDispersion.value = menosMovimiento.matches ? 0 : 1;
    construirLinea(); ScrollTrigger.refresh();
  });

  // Reconstruye la línea cuando cargan imágenes y fuentes (cambian las alturas)
  construirLinea();
  window.addEventListener('load', () => { construirLinea(); ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { construirLinea(); ScrollTrigger.refresh(); });

  requestAnimationFrame(cuadro);
}

prepararInterfaz();
if (webglDisponible()) {
  try { crearEscena(); } catch (e) {
    console.warn('No se pudo iniciar la escena 3D; queda el fondo en CSS.', e);
  }
}
