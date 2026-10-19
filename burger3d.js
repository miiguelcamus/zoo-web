// Hamburguesa 3D de Zoo: modelo estilizado y limpio, luz dinámica, giro con inercia y vista de capas separadas.
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
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);

  // ---------- Utilidades ----------
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const sm = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    return lerp(
      lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
      lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lathe = (pts, seg = 80) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  function paint(geo, fn) {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { fn(c, p.getX(i), p.getY(i), p.getZ(i)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const mat = o => new THREE.MeshPhysicalMaterial(Object.assign({ roughness: 0.6, envMapIntensity: 0.65, vertexColors: false }, o));
  const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; };

  const model = new THREE.Group(); scene.add(model);
  const layers = [];
  function addLayer(obj, rest, off, order) {
    obj.position.y = rest; model.add(obj);
    layers.push({ obj, rest, off, order, delay: 0.25 + order * 0.18, y: rest + 7, vy: 0, done: false, wob: 0 });
  }

  // ---------- Pan inferior ----------
  {
    const g = lathe([[0, 0], [1.38, 0], [1.52, 0.06], [1.58, 0.18], [1.55, 0.32], [1.4, 0.43], [0, 0.46]]);
    paint(g, (c, x, y, z) => { c.set('#e3b06a').lerp(new THREE.Color('#cf9242'), Math.min(1, y / 0.3)).multiplyScalar(0.96 + vnoise(x * 3, y * 3, z * 3) * 0.08); });
    addLayer(mesh(g, mat({ vertexColors: true, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 })), 0, 0, 0);
  }

  // ---------- Carne ----------
  {
    const g = lathe([[0, 0], [1.5, 0], [1.62, 0.06], [1.67, 0.2], [1.61, 0.33], [1.45, 0.385], [0, 0.385]], 96);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), r = Math.hypot(x, z);
      if (r > 1.0) { const k = 1 + (vnoise(x * 2.4, y * 3, z * 2.4) - 0.5) * 0.09; p.setX(i, x * k); p.setZ(i, z * k); }
    }
    g.computeVertexNormals();
    paint(g, (c, x, y, z) => { const n = vnoise(x * 5, y * 4, z * 5); c.set('#5a3622').lerp(new THREE.Color('#3b2216'), n * 0.9); });
    addLayer(mesh(g, mat({ vertexColors: true, roughness: 0.78, envMapIntensity: 0.45 })), 0.62, 1.3, 3);
  }

  // ---------- Queso ----------
  {
    const g = new THREE.BoxGeometry(2.9, 0.07, 2.9, 40, 1, 40);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), over = Math.max(0, r - 1.12);
      const pull = 1 - over * 0.12;
      p.setX(i, x * pull); p.setZ(i, z * pull);
      p.setY(i, p.getY(i) - 0.45 * Math.tanh(Math.pow(over, 1.5) * 2.2) - Math.sin(x * 4 + z * 3) * 0.008);
    }
    g.computeVertexNormals();
    const m = mesh(g, mat({ color: '#f1ab1f', roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 0.8 }));
    m.rotation.y = Math.PI / 4;
    const grp = new THREE.Group(); grp.add(m);
    addLayer(grp, 1.04, 1.75, 4);
  }

  // ---------- Tomate y pepinillos ----------
  {
    const grp = new THREE.Group();
    const slice = mesh(lathe([[0, 0], [1.33, 0], [1.41, 0.035], [1.41, 0.105], [1.33, 0.14], [0, 0.14]], 72), mat({ color: '#c93a2c', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
    const core = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.012, 56), mat({ color: '#de5948', roughness: 0.3, clearcoat: 0.6 }));
    core.position.y = 0.143; grp.add(slice, core);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4, pk = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 32), mat({ color: '#6f9238', roughness: 0.35, clearcoat: 0.5 }));
      pk.position.set(Math.cos(a) * 0.8, 0.17, Math.sin(a) * 0.8); grp.add(pk);
    }
    addLayer(grp, 0.50, 0.85, 2);
  }

  // ---------- Lechuga ----------
  {
    const R = 1.82, rings = 16, segs = 128, pos = [], idx = [];
    for (let i = 0; i <= rings; i++) {
      const q = i / rings;
      for (let j = 0; j <= segs; j++) {
        const th = (j / segs) * Math.PI * 2;
        const edge = 1 + 0.045 * Math.sin(th * 9) + 0.03 * Math.sin(th * 17 + 1);
        const r = q * R * lerp(1, edge, q * q);
        const y = 0.07 * Math.sin(th * 8 + q * 4) * Math.pow(q, 1.2) + 0.045 * Math.sin(th * 15 - q * 6) * q - 0.2 * Math.pow(q, 6);
        pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    paint(g, (c, x, y, z) => { const r = Math.hypot(x, z) / R; c.set('#6a9a2f').lerp(new THREE.Color('#9cc35a'), Math.min(1, r * r * 0.9 + (vnoise(x * 3, 0, z * 3) - 0.5) * 0.3)); });
    const m = mesh(g, mat({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, clearcoat: 0.3 }));
    const grp = new THREE.Group(); grp.add(m);
    addLayer(grp, 0.40, 0.45, 1);
  }

  // ---------- Pan superior con sésamo ----------
  {
    const RX = 1.62, H = 0.98, B = 0.08, pts = [[0, 0], [1.5, 0], [RX, B]];
    for (let k = 1; k <= 28; k++) { const a = (k / 28) * Math.PI / 2; pts.push([RX * Math.cos(a), B + H * Math.sin(a)]); }
    const g = lathe(pts, 96);
    paint(g, (c, x, y, z) => { c.set('#e0a352').lerp(new THREE.Color('#b5661f'), Math.pow(Math.min(1, y / 1.06), 1.3)).multiplyScalar(0.95 + vnoise(x * 3, y * 3, z * 3) * 0.1); });
    const top = new THREE.Group();
    top.add(mesh(g, mat({ vertexColors: true, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.32, envMapIntensity: 0.75 })));
    const N = 72, seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), mat({ color: '#f4e7c6', roughness: 0.5, envMapIntensity: 0.7 }), N);
    seeds.castShadow = true;
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3();
    const s0 = Math.sin(0.22), s1 = Math.sin(1.42);
    for (let i = 0; i < N; i++) {
      const a = Math.asin(lerp(s0, s1, rnd())), th = rnd() * Math.PI * 2;
      const x0 = RX * Math.cos(a), y0 = B + H * Math.sin(a);
      nrm.set(x0 / (RX * RX), (y0 - B) / (H * H), 0).normalize();
      dummy.position.set(Math.cos(th) * (x0 + nrm.x * 0.015), y0 + nrm.y * 0.015, Math.sin(th) * (x0 + nrm.x * 0.015));
      const n3 = new THREE.Vector3(Math.cos(th) * nrm.x, nrm.y, Math.sin(th) * nrm.x).normalize();
      dummy.quaternion.setFromUnitVectors(up, n3); dummy.rotateY(rnd() * 6.28);
      dummy.scale.set(0.088, 0.048, 0.058);
      dummy.updateMatrix(); seeds.setMatrixAt(i, dummy.matrix);
    }
    top.add(seeds);
    addLayer(top, 1.17, 2.4, 5);
  }

  // ---------- Suelo: sombra real y sombra suave de contacto ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.03; floor.receiveShadow = true; scene.add(floor);
  const blobTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(40,26,12,.55)'); gr.addColorStop(1, 'rgba(40,26,12,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -0.025; scene.add(blob);

  // ---------- Luces ----------
  scene.add(new THREE.HemisphereLight(0xfff3df, 0xc9b99d, 0.55));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.3);
  key.position.set(3, 6, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 18 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(-4, 3.5, -4); scene.add(rim);
  const glint = new THREE.PointLight(0xffe2b0, 5, 10, 2); scene.add(glint);

  // ---------- Interacción ----------
  const st = { az: 0.6, vel: 0, elev: 0.3, dragging: false, idle: 0, moved: 0, mx: 0.3, my: 0, tmx: 0.3, tmy: 0 };
  let ex = 0, exT = 0;
  const AUTO = reduce ? 0 : 0.3;
  canvas.addEventListener('pointerdown', e => {
    st.dragging = true; st.moved = 0; st.lastX = e.clientX; st.lastY = e.clientY; st.vel = 0; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (!st.dragging) return;
    const dx = e.clientX - st.lastX, dy = e.clientY - st.lastY; st.lastX = e.clientX; st.lastY = e.clientY; st.moved += Math.abs(dx) + Math.abs(dy);
    st.az += dx * 0.011; st.vel = dx * 0.011 * 60; st.elev = Math.min(0.8, Math.max(0.08, st.elev + dy * 0.006));
  });
  const up = e => { if (!st.dragging) return; st.dragging = false; st.idle = 0; canvas.style.cursor = 'grab'; if (st.moved < 5 && e && e.pointerType !== 'mouse') exT = exT ? 0 : 1; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') exT = 1; });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') exT = 0; });
  window.addEventListener('mousemove', e => { st.tmx = (e.clientX / innerWidth) * 2 - 1; st.tmy = (e.clientY / innerHeight) * 2 - 1; });

  // ---------- Bucle ----------
  function resize() {
    const w = canvas.clientWidth || 440, h = canvas.clientHeight || 440;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true, clock0 = performance.now(), prev = performance.now(), t = 0, firstFrame = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas);
  if (reduce) layers.forEach(l => { l.y = l.rest; l.done = true; });
  const look = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { prev = now; return; }
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now; t += dt;
    const el = (now - clock0) / 1000;

    // caída con gravedad y rebote de cada capa
    layers.forEach(l => {
      if (!l.done) {
        if (el < l.delay) { l.y = l.rest + 7; }
        else {
          l.vy -= 22 * dt; l.y += l.vy * dt;
          if (l.y <= l.rest) {
            l.y = l.rest;
            if (Math.abs(l.vy) < 1.0) { l.done = true; l.vy = 0; l.obj.rotation.z = 0; }
            else { l.vy = -l.vy * 0.28; l.wob = Math.min(0.04, Math.abs(l.vy) * 0.04) * (l.order % 2 ? 1 : -1); }
          }
          l.wob *= Math.pow(0.02, dt); l.obj.rotation.z = l.wob * Math.sin(el * 30);
        }
      }
    });
    // capas separadas (vista de ingredientes)
    ex += (exT - ex) * Math.min(1, dt * 5);
    layers.forEach(l => { l.obj.position.y = l.y + ex * l.off; });

    // giro con inercia y rotación automática
    if (!st.dragging) {
      st.idle += dt; st.az += st.vel * dt; st.vel *= Math.exp(-2.6 * dt);
      if (st.idle > 1.2) st.az += AUTO * dt * Math.min(1, st.idle - 1.2);
    }
    model.rotation.y = st.az;

    // cámara
    const d = 10.4 + ex * 3.2, ty = 1.05 + ex * 1.45, e = st.elev + Math.sin(t * 0.7) * 0.012;
    look.set(0, ty, 0);
    camera.position.set(0, ty + Math.sin(e) * d, Math.cos(e) * d); camera.lookAt(look);
    model.position.y = Math.sin(t * 1.1) * 0.03;
    blob.scale.setScalar(1 + ex * 0.12); blob.material.opacity = 1 - ex * 0.35;

    // luz dinámica
    const hover = matchMedia('(hover:hover)').matches;
    if (!hover || reduce) { st.tmx = Math.sin(t * 0.5) * 0.8; st.tmy = Math.cos(t * 0.37) * 0.5; }
    st.mx += (st.tmx - st.mx) * Math.min(1, dt * 3); st.my += (st.tmy - st.my) * Math.min(1, dt * 3);
    key.position.set(st.mx * 5.2, 6 - st.my * 1.8, 4 - Math.abs(st.mx) * 0.8);
    glint.position.set(Math.cos(t * 0.8) * 3.4, 2 + Math.sin(t * 0.6) * 1.0 + ex, Math.sin(t * 0.8) * 3.4);

    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; host.classList.add('has3d'); }
  }
  requestAnimationFrame(frame);
}
