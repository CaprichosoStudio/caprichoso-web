// Hero: hairline club lasers behind a single piece of liquid glass shaped like the logo.
// The glass has no colour of its own: it only shows by bending the lasers that cross it
// and by catching their light on its rounded edges.
(() => {
  const section = document.querySelector('[data-hero3d]');
  const THREE = window.THREE;
  if (!section || !THREE) return;
  const canvas = section.querySelector('canvas');
  const d = document.querySelector('.nav__logo path')?.getAttribute('d');
  if (!canvas || !d) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); } catch (e) { return; }
  const DPR = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(DPR);

  // ---------- glass height map: one merged piece with rounded (liquid) edges
  const VB = [155, 172, 1134, 413];
  const TW = 1400, PAD = 70, LW = TW - PAD * 2, LH = Math.round(LW * VB[3] / VB[2]), TH = LH + PAD * 2;
  const MERGE = 9;   // px the letters are grown so they fuse into one piece
  const BEVEL = 24;   // px of rounded rim
  const hm = (() => {
    const c = document.createElement('canvas'); c.width = TW; c.height = TH;
    const g = c.getContext('2d');
    g.translate(PAD, PAD); g.scale(LW / VB[2], LH / VB[3]); g.translate(-VB[0], -VB[1]);
    g.fill(new Path2D(d));
    const a = g.getImageData(0, 0, TW, TH).data, n = TW * TH;
    const INF = 1e9;
    // two-pass chamfer distance (3-4), good enough for a smooth bevel
    const dist = (inside) => {
      const D = new Float32Array(n);
      for (let i = 0; i < n; i++) D[i] = inside(i) ? INF : 0;
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
        const i = y * TW + x; let v = D[i]; if (!v) continue;
        if (x > 0) v = Math.min(v, D[i - 1] + 3);
        if (y > 0) { v = Math.min(v, D[i - TW] + 3); if (x > 0) v = Math.min(v, D[i - TW - 1] + 4); if (x < TW - 1) v = Math.min(v, D[i - TW + 1] + 4); }
        D[i] = v;
      }
      for (let y = TH - 1; y >= 0; y--) for (let x = TW - 1; x >= 0; x--) {
        const i = y * TW + x; let v = D[i]; if (!v) continue;
        if (x < TW - 1) v = Math.min(v, D[i + 1] + 3);
        if (y < TH - 1) { v = Math.min(v, D[i + TW] + 3); if (x < TW - 1) v = Math.min(v, D[i + TW + 1] + 4); if (x > 0) v = Math.min(v, D[i + TW - 1] + 4); }
        D[i] = v;
      }
      for (let i = 0; i < n; i++) D[i] /= 3;
      return D;
    };
    const out = dist((i) => a[i * 4 + 3] < 128);           // distance from the logo, outside it
    const merged = (i) => a[i * 4 + 3] >= 128 || out[i] <= MERGE;
    const ins = dist(merged);                                // distance to the edge, inside the merged piece
    let f = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (!merged(i)) continue;
      const t = Math.min(1, ins[i] / BEVEL);
      f[i] = Math.sqrt(1 - (1 - t) * (1 - t));   // circular rim, flat top
    }
    // soften the chamfer steps so the refraction is smooth
    const blur = (src, r) => {
      const tmp = new Float32Array(n), dst = new Float32Array(n), k = 1 / (2 * r + 1);
      for (let y = 0; y < TH; y++) { let s = 0; const o = y * TW;
        for (let x = -r; x <= r; x++) s += src[o + Math.min(TW - 1, Math.max(0, x))];
        for (let x = 0; x < TW; x++) { tmp[o + x] = s * k; s += src[o + Math.min(TW - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
      for (let x = 0; x < TW; x++) { let s = 0;
        for (let y = -r; y <= r; y++) s += tmp[Math.min(TH - 1, Math.max(0, y)) * TW + x];
        for (let y = 0; y < TH; y++) { dst[y * TW + x] = s * k; s += tmp[Math.min(TH - 1, y + r + 1) * TW + x] - tmp[Math.max(0, y - r) * TW + x]; } }
      return dst;
    };
    f = blur(blur(f, 3), 3);
    const h = new Uint8Array(n);
    for (let i = 0; i < n; i++) h[i] = Math.round(255 * f[i]);
    const tex = new THREE.DataTexture(h, TW, TH, THREE.LuminanceFormat);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.flipY = true; tex.needsUpdate = true;
    return tex;
  })();

  // ---------- light scene: lasers + haze, rendered to a texture
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 8000);
  camera.position.set(0, 0, 1500);
  const COUNT = 5;
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){ float a = 1.0 - abs(vUv.x - 0.5) * 2.0; float core = pow(a, 30.0); float glow = pow(a, 5.0) * 0.2;
        float along = smoothstep(0.0, 0.04, vUv.y) * (1.0 - vUv.y * 0.55);
        vec3 c = vec3(1.0, 0.07, 0.04) * (core * 1.3 + glow) + vec3(1.0, 0.85, 0.8) * core * 0.3;
        gl_FragColor = vec4(c * along * (0.92 + 0.08 * sin(uTime * 50.0)), 1.0); }`,
  });
  const rig = new THREE.Group(); scene.add(rig);
  const beams = [];
  for (let i = 0; i < COUNT; i++) {
    const g = new THREE.PlaneGeometry(8, 4200); g.translate(0, 2100, 0);
    const h = new THREE.Group(); const a = new THREE.Mesh(g, beamMat), b = new THREE.Mesh(g, beamMat); b.rotation.y = Math.PI / 2; h.add(a, b);
    h.position.x = (i - (COUNT - 1) / 2) * 60; rig.add(h); beams.push(h);
  }
  const N = 700, hp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) hp.set([(Math.random() - 0.5) * 3200, (Math.random() - 0.5) * 1800, (Math.random() - 0.5) * 1200], i * 3);
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  const haze = new THREE.Points(hg, new THREE.PointsMaterial({ color: 0xFFFFE9, size: 2, transparent: true, opacity: 0.16, depthWrite: false }));
  scene.add(haze);

  const rt = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

  // ---------- composite: refract the light scene through the glass
  const post = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uScene: { value: rt.texture },
    uHeight: { value: hm },
    uRect: { value: new THREE.Vector4(0, 0, 1, 1) },   // glass texture placement in screen uv
    uTexel: { value: new THREE.Vector2(1 / TW, 1 / TH) },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTilt: { value: new THREE.Vector2(0, 0) },
    uBg: { value: new THREE.Color('#222222') },
    uLines: { value: Array.from({ length: COUNT }, () => new THREE.Vector4(-9999, -9999, -9998, -9998)) },
  };
  post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uScene, uHeight; uniform vec4 uRect; uniform vec2 uTexel, uRes, uTilt; uniform vec3 uBg; uniform vec4 uLines[5];
      varying vec2 vUv;
      float H(vec2 p){ if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) return 0.0; return texture2D(uHeight, p).r; }
      vec3 S(vec2 p){ return texture2D(uScene, clamp(p, 0.0, 1.0)).rgb; }
      void main(){
        vec2 g = (vUv - uRect.xy) / uRect.zw;
        float h = H(g);
        vec3 base = S(vUv);
        if (h <= 0.0) { gl_FragColor = vec4(base + uBg, 1.0); return; }
        vec2 e = uTexel * 1.5;
        float dx = H(g + vec2(e.x, 0.0)) - H(g - vec2(e.x, 0.0));
        float dy = H(g + vec2(0.0, e.y)) - H(g - vec2(0.0, e.y));
        vec3 N = normalize(vec3(-dx * 6.0, -dy * 6.0, 1.0));
        float rim = 1.0 - N.z;                         // 0 on the flat top, ~1 on the edge
        // refraction: strong on the rim, slight magnification on the top, chromatic split
        vec2 px = 1.0 / uRes;
        vec2 off = (N.xy * 90.0 + (vUv - (uRect.xy + uRect.zw * 0.5)) * -0.06 * uRes + uTilt * 12.0) * px;
        vec3 refr = vec3(S(vUv - off * 1.00).r, S(vUv - off * 1.08).g, S(vUv - off * 1.16).b);
        // how much laser light reaches this point of the glass (a few taps around it)
        vec2 P = vUv * uRes; float gl = 0.0;
        for (int i = 0; i < 5; i++) {
          vec2 A = uLines[i].xy, B = uLines[i].zw, AB = B - A;
          float k = clamp(dot(P - A, AB) / dot(AB, AB), 0.0, 1.0);
          float dd = length(P - (A + AB * k)) / uRes.y;   // distance in screen heights
          gl += exp(-dd * 38.0) * 0.55 + exp(-dd * 10.0) * 0.07;
        }
        vec3 lightAround = vec3(1.0, 0.09, 0.05) * gl;
        float lum = dot(lightAround, vec3(0.6, 0.3, 0.1));
        // edges and a sheen catch the light; with no laser nearby, nothing shows
        vec3 L = normalize(vec3(uTilt * 0.8 + vec2(-0.3, 0.6), 0.7));
        float spec = pow(max(dot(N, L), 0.0), 18.0) * rim;
        vec3 edge = (lightAround * 5.0 + vec3(1.0, 0.95, 0.9) * lum * 2.5) * pow(rim, 1.3);
        vec3 sheen = vec3(1.0, 0.92, 0.88) * spec * lum * 6.0;
        vec3 inner = lightAround * 0.16 * (1.0 - rim);
        gl_FragColor = vec4(refr + edge + sheen + inner + uBg, 1.0);
      }`,
  })));

  // ---------- layout
  let vW = 1, vH = 1, W = 1, Hh = 1;
  function resize() {
    W = section.clientWidth; Hh = section.clientHeight;
    renderer.setSize(W, Hh, false);
    rt.setSize(Math.round(W * DPR), Math.round(Hh * DPR));
    camera.aspect = W / Hh; camera.updateProjectionMatrix();
    vH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z; vW = vH * camera.aspect;
    rig.position.set(0, vH * 0.62, 260);
    uniforms.uRes.value.set(W * DPR, Hh * DPR);
    // logo width on screen, then the full texture (with padding) around it
    const narrow = W < 760;
    const lw = Math.min(W * (narrow ? 0.94 : 0.86), Hh * 0.5 * (VB[2] / VB[3]));
    const s = lw / LW, tw = TW * s, th = TH * s;
    const cx = W / 2, cy = Hh * (narrow ? 0.36 : 0.36);
    uniforms.uRect.value.set((cx - tw / 2) / W, 1 - (cy + th / 2) / Hh, tw / W, th / Hh);
  }
  resize(); addEventListener('resize', resize);

  // ---------- pointer
  const ptr = { nx: 0, ny: 0, x: 0, y: 0, inside: false };
  section.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = section.getBoundingClientRect();
    ptr.nx = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.ny = -(((e.clientY - r.top) / r.height) * 2 - 1); ptr.inside = true;
  });
  section.addEventListener('pointerleave', () => { ptr.inside = false; });

  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), wp = new THREE.Vector3(), tg = new THREE.Vector3(), dir = new THREE.Vector3();
  let on = true, t = 0;
  function frame() {
    if (!on) return;
    t += 1 / 60;
    beamMat.uniforms.uTime.value = t;
    const ix = ptr.inside ? ptr.nx : Math.sin(t * 0.35) * 0.65;
    const iy = ptr.inside ? ptr.ny : 0.25 + Math.cos(t * 0.3) * 0.2;
    ptr.x += (ix - ptr.x) * 0.07; ptr.y += (iy - ptr.y) * 0.07;
    uniforms.uTilt.value.set(ptr.x, ptr.y);
    beams.forEach((b, i) => {
      const s = i - (COUNT - 1) / 2;
      tg.set(ptr.x * vW * 0.45 + s * 150 + Math.sin(t * 0.8 + i * 1.3) * 60, ptr.y * vH * 0.42 + Math.cos(t * 1.1 + i) * 40, -500);
      b.getWorldPosition(wp);
      q.setFromUnitVectors(up, dir.copy(tg).sub(wp).normalize());
      b.quaternion.slerp(q, 0.1);
      // the beam as a 2D segment on screen, for the glow on the glass
      b.updateMatrixWorld();
      dir.copy(up).applyQuaternion(b.quaternion);
      const p0 = wp.clone().project(camera), p1 = wp.clone().add(dir.multiplyScalar(3600)).project(camera);
      const R = uniforms.uRes.value;
      uniforms.uLines.value[i].set((p0.x * 0.5 + 0.5) * R.x, (p0.y * 0.5 + 0.5) * R.y, (p1.x * 0.5 + 0.5) * R.x, (p1.y * 0.5 + 0.5) * R.y);
    });
    haze.rotation.y += 0.0004;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(post, postCam);
    if (!reduce) requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(frame); }).observe(section);
  canvas.classList.add('is-ready');
  requestAnimationFrame(frame);
})();
