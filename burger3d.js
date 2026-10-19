// Hamburguesa 3D de Zoo: modelo procedural con materiales PBR, luz dinámica y giro con inercia.
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const host = document.querySelector('[data-burger]');
const canvas = host && host.querySelector('canvas.b3d');
if (host && canvas) start();

function start() {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const target = new THREE.Vector3(0, 0.38, 0);

  // ---------- Ruido y texturas procedurales ----------
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const sm = t => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
      l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }
  const fbm = (x, y, z, o = 3) => { let a = 0.5, f = 1, s = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function canvasTex(size, draw, srgb, repeat) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); draw(g, size);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  function noiseBump(size, scale, rep) {
    return canvasTex(size, (g, s) => {
      const im = g.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const v = fbm(x / s * scale, y / s * scale, 3.3, 4);
        const k = (y * s + x) * 4, c = Math.floor(v * 255);
        im.data[k] = im.data[k + 1] = im.data[k + 2] = c; im.data[k + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    }, false, rep);
  }
  const bunBump = noiseBump(256, 24, 1);
  const pattyBump = noiseBump(256, 40, 1);

  const pattyMap = canvasTex(512, (g, s) => {
    const im = g.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const n = fbm(x / s * 30, y / s * 30, 1.7, 4), k = (y * s + x) * 4;
      let r = 74 + n * 52, gg = 42 + n * 30, b = 28 + n * 20;
      // marcas de parrilla cruzadas
      const u = (x + y) / s * 11, w = (x - y) / s * 11;
      const line = Math.max(0, 1 - Math.abs(((u % 1) + 1) % 1 - .5) * 9) * 0.0;
      const d1 = Math.abs(((u % 1) + 1) % 1 - 0.5), d2 = Math.abs(((w % 1) + 1) % 1 - 0.5);
      const gr = Math.max(0, 1 - d1 * 7) * 0.5;
      const f = 1 - gr * (0.6 + 0.4 * vnoise(x * .08, y * .08, 2)) + line;
      r *= f; gg *= f; b *= f;
      if (hash(x, y, 5) > 0.996) { r += 90; gg += 70; b += 50; }   // motas de grasa
      im.data[k] = r; im.data[k + 1] = gg; im.data[k + 2] = b; im.data[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }, true);

  const tomatoMap = canvasTex(512, (g, s) => {
    const c = s / 2;
    let gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, '#f07a5c'); gr.addColorStop(0.55, '#e0412c'); gr.addColorStop(0.93, '#c92a1c'); gr.addColorStop(1, '#a31b10');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,214,170,.65)'; g.lineWidth = 7;
    for (let i = 0; i < 5; i++) {   // paredes entre los gajos
      const a = i / 5 * Math.PI * 2 + 0.3;
      g.beginPath(); g.moveTo(c + Math.cos(a) * 40, c + Math.sin(a) * 40); g.lineTo(c + Math.cos(a) * c * 0.84, c + Math.sin(a) * c * 0.84); g.stroke();
    }
    g.beginPath(); g.arc(c, c, c * 0.86, 0, 7); g.lineWidth = 9; g.strokeStyle = 'rgba(255,190,150,.5)'; g.stroke();
    for (let i = 0; i < 5; i++) {   // gajos con pulpa y pepitas
      const a = (i + 0.5) / 5 * Math.PI * 2 + 0.3, px = c + Math.cos(a) * c * 0.5, py = c + Math.sin(a) * c * 0.5;
      const pg = g.createRadialGradient(px, py, 0, px, py, 70); pg.addColorStop(0, 'rgba(255,170,120,.85)'); pg.addColorStop(1, 'rgba(255,170,120,0)');
      g.fillStyle = pg; g.beginPath(); g.arc(px, py, 70, 0, 7); g.fill();
      for (let k = 0; k < 5; k++) {
        g.save(); g.translate(px + (rnd() - .5) * 60, py + (rnd() - .5) * 60); g.rotate(rnd() * 6);
        g.fillStyle = '#f3e3a1'; g.beginPath(); g.ellipse(0, 0, 8, 5, 0, 0, 7); g.fill(); g.restore();
      }
    }
  }, true);

  const lettuceMap = canvasTex(512, (g, s) => {
    const c = s / 2;
    const gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, '#9fd04a'); gr.addColorStop(0.6, '#6fb52c'); gr.addColorStop(1, '#4a9a22');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(230,245,170,.55)'; g.lineWidth = 4;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2;
      g.beginPath(); g.moveTo(c, c); g.quadraticCurveTo(c + Math.cos(a + .2) * c * .5, c + Math.sin(a + .2) * c * .5, c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke();
    }
    const im = g.getImageData(0, 0, s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const n = (fbm(x / s * 14, y / s * 14, 9, 3) - 0.5) * 60, k = (y * s + x) * 4;
      im.data[k] += n; im.data[k + 1] += n; im.data[k + 2] += n * 0.5;
    }
    g.putImageData(im, 0, 0);
  }, true);

  // ---------- Utilidades de geometría ----------
  function planarUV(geo, R) {
    const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / (2 * R) + 0.5; uv[i * 2 + 1] = p.getZ(i) / (2 * R) + 0.5; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  function fixSeam(geo, rows, segs) {
    const n = geo.attributes.normal;
    for (let j = 0; j < rows; j++) {
      const a = j, b = segs * rows + j;
      const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
      n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
    }
  }
  const spline = (pts, n) => new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(n);
  function lathe(pts, segs) { return new THREE.LatheGeometry(pts, segs); }

  const R = 1.25;
  const layers = [];   // {obj, rest, delay, y, vy, state}
  const model = new THREE.Group(); scene.add(model);

  // Plato de cerámica
  {
    const prof = spline([[0, 0], [1.5, 0], [1.9, 0.05], [2.3, 0.21], [2.36, 0.26], [2.3, 0.27], [2.25, 0.19], [1.85, -0.02], [1.2, -0.06], [0, -0.06]], 60);
    const plate = new THREE.Mesh(lathe(prof, 96), new THREE.MeshPhysicalMaterial({ color: 0xfbf7ef, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 }));
    plate.position.y = -0.38; plate.scale.set(0.86, 1, 0.86); plate.receiveShadow = true; plate.castShadow = true; model.add(plate);
  }

  // Pan inferior
  {
    const prof = spline([[0, -0.4], [R * 0.7, -0.38], [R * 0.97, -0.3], [R * 1.04, -0.14], [R * 1.03, -0.02], [R * 0.9, 0.0], [0, 0.0]], 70);
    const g = lathe(prof, 96);
    shade(g, R, 'bottom');
    const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.66, bumpMap: bunBump, bumpScale: 1.1, envMapIntensity: 0.4 });
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true;
    addLayer(mesh, 0, 0.0);
  }

  // Carne
  {
    const prof = spline([[0, 0], [R * 0.9, 0], [R * 0.97, 0.04], [R * 1.0, 0.15], [R * 0.97, 0.28], [R * 0.9, 0.33], [0, 0.34]], 60);
    const g = lathe(prof, 128);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z) || 1;
      const edge = Math.pow(Math.min(1, r / (R * 1.0)), 3);
      const d = (fbm(x * 3.2, y * 3.2, z * 3.2, 4) - 0.5) * (0.07 + 0.1 * edge);
      p.setXYZ(i, x + (x / r) * d * 1.6, y + d * 0.5, z + (z / r) * d * 1.6);
    }
    g.computeVertexNormals(); fixSeam(g, prof.length, 128); planarUV(g, R * 1.1);
    const m = new THREE.MeshPhysicalMaterial({ map: pattyMap, roughness: 0.78, bumpMap: pattyBump, bumpScale: 3.2, clearcoat: 0.18, clearcoatRoughness: 0.5, envMapIntensity: 0.5 });
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true;
    addLayer(mesh, 1, 0.02);
  }

  // Queso fundido
  {
    const s = 2.35, N = 70, g = new THREE.PlaneGeometry(s, s, N, N);
    g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z), ang = Math.atan2(z, x);
      const over = Math.max(0, d - R * 0.92);
      const drop = Math.pow(over, 1.6) * 0.95 + (fbm(x * 2, 0, z * 2, 3) - 0.5) * 0.04 * (1 + over * 2);
      p.setY(i, -drop + Math.sin(ang * 6 + d * 3) * 0.012 * Math.min(1, over * 3));
    }
    g.computeVertexNormals();
    const m = new THREE.MeshPhysicalMaterial({ color: 0xee9410, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.3, side: THREE.DoubleSide, emissive: 0x3a1800, emissiveIntensity: 0.25, envMapIntensity: 0.45 });
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true;
    addLayer(mesh, 2, 0.375);
  }

  // Tomate (dos rodajas)
  [0.455, 0.545].forEach((y, k) => {
    const g = new THREE.CylinderGeometry(R * 0.93, R * 0.93, 0.085, 72, 1);
    const m = new THREE.MeshPhysicalMaterial({ map: tomatoMap, roughness: 0.22, clearcoat: 0.85, clearcoatRoughness: 0.12, envMapIntensity: 0.9 });
    const sideMat = new THREE.MeshPhysicalMaterial({ color: 0xc92d1d, roughness: 0.3, clearcoat: 0.7, envMapIntensity: 0.8 });
    const mesh = new THREE.Mesh(g, [sideMat, m, m]); mesh.rotation.y = k * 1.1; mesh.scale.set(1, 1, 0.97);
    mesh.castShadow = mesh.receiveShadow = true;
    addLayer(mesh, 3 + k, y, k * 0.6);
  });

  // Lechuga rizada
  [{ y: 0.64, rot: 0, sc: 1.1 }, { y: 0.69, rot: 0.9, sc: 1.02 }].forEach((o, k) => {
    const g = ruffle(R * o.sc, 22, 160, 0.16 + k * 0.03, k);
    const m = new THREE.MeshPhysicalMaterial({ map: lettuceMap, roughness: 0.42, side: THREE.DoubleSide, clearcoat: 0.25, clearcoatRoughness: 0.4, bumpMap: bunBump, bumpScale: 0.6, envMapIntensity: 0.7 });
    const mesh = new THREE.Mesh(g, m); mesh.rotation.y = o.rot; mesh.castShadow = mesh.receiveShadow = true;
    addLayer(mesh, 5 + k, o.y);
  });

  // Pan superior con sésamo
  {
    const H = R * 0.66, base = 0.05;
    const underside = [[0, 0.03], [R * 0.7, 0.0], [R * 0.96, 0.0], [R * 1.0, base]];
    const dome = []; for (let a = 1.5707; a >= 0; a -= 0.035) dome.push([R * Math.sin(a), base + H * Math.cos(a)]);
    dome.push([0, base + H]);
    const prof = underside.map(q => new THREE.Vector2(q[0], q[1])).concat(dome.slice(1).map(q => new THREE.Vector2(q[0], q[1])));
    const g = lathe(prof, 128);
    shade(g, R, 'top');
    const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, bumpMap: bunBump, bumpScale: 1.6, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.4 });
    const top = new THREE.Group();
    const bun = new THREE.Mesh(g, m); bun.castShadow = bun.receiveShadow = true; top.add(bun);

    const seedGeo = new THREE.SphereGeometry(0.05, 14, 10); seedGeo.scale(1, 0.38, 0.55);
    const seedMat = new THREE.MeshPhysicalMaterial({ color: 0xf3e2b8, roughness: 0.45, clearcoat: 0.2, envMapIntensity: 0.6 });
    const N = 110, seeds = new THREE.InstancedMesh(seedGeo, seedMat, N); seeds.castShadow = true;
    const placed = []; const dummy = new THREE.Object3D(); const up = new THREE.Vector3(0, 1, 0);
    let n = 0, tries = 0;
    while (n < N && tries++ < 4000) {
      const u = rnd(), phi = Math.acos(1 - u * (1 - Math.cos(1.1))), th = rnd() * Math.PI * 2;
      const x = R * Math.sin(phi) * Math.cos(th), z = R * Math.sin(phi) * Math.sin(th), y = base + H * Math.cos(phi);
      if (placed.some(q => (q[0] - x) ** 2 + (q[1] - y) ** 2 + (q[2] - z) ** 2 < 0.0062)) continue;
      placed.push([x, y, z]);
      const nor = new THREE.Vector3(x / (R * R), (y - base) / (H * H), z / (R * R)).normalize();
      dummy.position.set(x + nor.x * 0.012, y + nor.y * 0.012, z + nor.z * 0.012);
      dummy.quaternion.setFromUnitVectors(up, nor);
      dummy.rotateY(rnd() * Math.PI * 2);
      const sc = 0.85 + rnd() * 0.4; dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix(); seeds.setMatrixAt(n++, dummy.matrix);
    }
    seeds.count = n; top.add(seeds);
    addLayer(top, 7, 0.74);
  }

  // color de vértice y forma orgánica del pan
  function shade(g, R, kind) {
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = fbm(x * 2.4, y * 2.4, z * 2.4, 4), n2 = fbm(x * 9, y * 9, z * 9, 2);
      let h, s, l;
      if (kind === 'top') {
        const k = Math.min(1, Math.max(0, (y - 0.05) / (R * 0.66)));
        h = 0.078 - 0.014 * k; s = 0.8; l = 0.47 - 0.22 * Math.pow(k, 0.7) + (n - 0.5) * 0.26 + (n2 - 0.5) * 0.07;
        if (y < 0.02) l = 0.62;
      } else {
        const k = Math.min(1, Math.max(0, (y + 0.4) / 0.4));
        h = 0.085; s = 0.7; l = 0.56 - 0.12 * (1 - k) + (n - 0.5) * 0.12 + (n2 - 0.5) * 0.04;
      }
      c.setHSL(h, s, Math.max(0.2, Math.min(0.82, l))); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      const r = Math.hypot(x, z) || 1, d = (n - 0.5) * 0.05;
      p.setXYZ(i, x + x / r * d, y + d * 0.6, z + z / r * d);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    planarUV(g, R);
  }

  // disco ondulado (lechuga)
  function ruffle(rad, rings, segs, amp, ph) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
      const t = i / rings, a = j / segs * Math.PI * 2;
      const edge = 1 + 0.07 * Math.sin(a * 7 + ph) + 0.045 * Math.sin(a * 13 + ph * 2);
      const r = rad * t * edge;
      const w = Math.sin(a * 9 + t * 4 + ph) * 0.5 + Math.sin(a * 17 - t * 3) * 0.28 + (fbm(Math.cos(a) * 2 + t, Math.sin(a) * 2, ph, 3) - 0.5);
      const y = amp * Math.pow(t, 1.8) * w + 0.03 * Math.sin(t * 7 + a * 3);
      pos.push(r * Math.cos(a), y, r * Math.sin(a));
      uv.push(0.5 + 0.5 * t * Math.cos(a), 0.5 + 0.5 * t * Math.sin(a));
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  function addLayer(obj, order, rest) {
    obj.position.y = rest; model.add(obj);
    layers.push({ obj, rest, order, delay: 0.25 + order * 0.2, y: rest + 6, vy: 0, done: false, wob: 0 });
  }

  // ---------- Luces ----------
  const hemi = new THREE.HemisphereLight(0xffe6c4, 0x2a1c10, 0.35); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe9cf, 2.5);
  key.position.set(3, 5, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 0.5, far: 16 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025; key.shadow.radius = 5;
  scene.add(key); scene.add(key.target); key.target.position.copy(target);
  const rim = new THREE.DirectionalLight(0xffa35c, 2.4); rim.position.set(-4, 3, -3.5); scene.add(rim);
  const glint = new THREE.PointLight(0xffd9a0, 9, 9, 2); scene.add(glint);

  // ---------- Interacción ----------
  const st = { az: 0.5, vel: 0, elev: 0.38, dragging: false, last: 0, idle: 0, moved: 0, mx: 0.3, my: 0, tmx: 0.3, tmy: 0 };
  const AUTO = reduce ? 0 : 0.32;
  canvas.addEventListener('pointerdown', e => {
    st.dragging = true; st.moved = 0; st.lastX = e.clientX; st.lastY = e.clientY; st.vel = 0; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (!st.dragging) return;
    const dx = e.clientX - st.lastX, dy = e.clientY - st.lastY; st.lastX = e.clientX; st.lastY = e.clientY; st.moved += Math.abs(dx) + Math.abs(dy);
    st.az += dx * 0.011; st.vel = dx * 0.011 * 60; st.elev = Math.min(0.85, Math.max(0.1, st.elev + dy * 0.006));
  });
  const up = () => { if (!st.dragging) return; st.dragging = false; st.idle = 0; canvas.style.cursor = 'grab'; if (st.moved < 5) rebuild(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  window.addEventListener('mousemove', e => { st.tmx = (e.clientX / innerWidth) * 2 - 1; st.tmy = (e.clientY / innerHeight) * 2 - 1; });
  function rebuild() { layers.forEach(l => { l.y = l.rest + 6; l.vy = 0; l.done = false; l.t = 0; l.wob = 0; l.obj.rotation.z = 0; }); clock0 = performance.now(); }

  // ---------- Bucle ----------
  function resize() {
    const w = canvas.clientWidth || 440, h = canvas.clientHeight || 440;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true, clock0 = performance.now(), prev = performance.now(), t = 0, firstFrame = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas);

  if (reduce) layers.forEach(l => { l.y = l.rest; l.done = true; });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { prev = now; return; }
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now; t += dt;
    const el = (now - clock0) / 1000;

    // caída con gravedad y rebote de cada capa
    layers.forEach(l => {
      if (l.done) return;
      if (el < l.delay) { l.obj.position.y = l.rest + 6; return; }
      l.vy -= 20 * dt; l.y += l.vy * dt;
      if (l.y <= l.rest) {
        l.y = l.rest;
        if (Math.abs(l.vy) < 0.9) { l.done = true; l.vy = 0; l.obj.rotation.z = 0; }
        else { l.vy = -l.vy * 0.3; l.wob = Math.min(0.05, Math.abs(l.vy) * 0.05) * (l.order % 2 ? 1 : -1); }
      }
      l.obj.position.y = l.y;
      l.wob *= Math.pow(0.02, dt); l.obj.rotation.z = l.wob * Math.sin(el * 30);
    });

    // giro con inercia y rotación automática
    if (!st.dragging) {
      st.idle += dt;
      st.az += st.vel * dt; st.vel *= Math.exp(-2.6 * dt);
      if (st.idle > 1.2) st.az += AUTO * dt * Math.min(1, (st.idle - 1.2));
    }
    model.rotation.y = st.az;

    // cámara: elevación suave + ligera flotación
    const d = 8.9, e = st.elev + Math.sin(t * 0.7) * 0.012;
    camera.position.set(0, target.y + Math.sin(e) * d, Math.cos(e) * d);
    camera.lookAt(target);
    model.position.y = Math.sin(t * 1.1) * 0.025;

    // luz dinámica: la luz principal sigue al puntero (o deriva sola) y un destello orbita
    const hover = matchMedia('(hover:hover)').matches;
    if (!hover || reduce) { st.tmx = Math.sin(t * 0.5) * 0.8; st.tmy = Math.cos(t * 0.37) * 0.5; }
    st.mx += (st.tmx - st.mx) * Math.min(1, dt * 3); st.my += (st.tmy - st.my) * Math.min(1, dt * 3);
    key.position.set(st.mx * 5.2, 4.6 - st.my * 1.6, 3.6 - Math.abs(st.mx) * 0.8);
    glint.position.set(Math.cos(t * 0.8) * 3.2, 1.5 + Math.sin(t * 0.6) * 0.9, Math.sin(t * 0.8) * 3.2);

    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; host.classList.add('has3d'); }
  }
  requestAnimationFrame(frame);
}
