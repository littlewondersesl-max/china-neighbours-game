/** WebGL terrain: orthographic globe, and LAEA country pieces sampled from one relief image. */

const PIECE_VS = `
attribute vec2 aKm;
attribute vec2 aLL;
uniform vec2 uOrigin;
uniform vec2 uSize;
uniform float uKmpp;
uniform vec2 uCenter;
uniform float uScale;
uniform vec2 uPxOffset;
varying vec2 vLL;
void main() {
  vec2 km = uCenter + uScale * aKm;
  vec2 px = (km - uOrigin) / uKmpp;
  px.y = uSize.y - px.y;
  px += uPxOffset;
  vec2 ndc = vec2(px.x / uSize.x * 2.0 - 1.0, 1.0 - px.y / uSize.y * 2.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  vLL = aLL;
}`;

const PIECE_FS = `
precision mediump float;
uniform sampler2D uTex;
uniform float uShadow;
uniform float uAlpha;
varying vec2 vLL;
void main() {
  if (uShadow > 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.38 * uAlpha);
    return;
  }
  float u = fract((vLL.x + 180.0) / 360.0);
  float v = (vLL.y + 90.0) / 180.0;
  vec3 c = texture2D(uTex, vec2(u, v)).rgb;
  gl_FragColor = vec4(c * uAlpha, uAlpha);
}`;

const GLOBE_VS = `
attribute vec2 aLL;
uniform float uLon0;
uniform float uLat0;
uniform float uRadius;
uniform vec2 uSize;
varying vec2 vLL;
varying float vZ;
varying vec3 vN;
void main() {
  float lon = radians(aLL.x - uLon0);
  float lat = radians(aLL.y);
  float lat0 = radians(uLat0);
  float cx = cos(lat) * cos(lon);
  float cy = cos(lat) * sin(lon);
  float cz = sin(lat);
  float vx = cy;
  float vy = cz * cos(lat0) - cx * sin(lat0);
  float vz = cx * cos(lat0) + cz * sin(lat0);
  gl_Position = vec4(vx * uRadius / (uSize.x * 0.5), vy * uRadius / (uSize.y * 0.5), 0.0, 1.0);
  vLL = aLL;
  vZ = vz;
  vN = vec3(vx, vy, vz);
}`;

const GLOBE_FS = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vLL;
varying float vZ;
varying vec3 vN;
void main() {
  if (vZ < 0.02) discard;
  float u = fract((vLL.x + 180.0) / 360.0);
  float v = (vLL.y + 90.0) / 180.0;
  vec3 c = texture2D(uTex, vec2(u, v)).rgb;
  vec3 light = normalize(vec3(-0.35, 0.62, 0.70));
  float lam = 0.58 + 0.42 * max(dot(normalize(vN), light), 0.0);
  float rim = smoothstep(0.0, 0.22, vZ);
  gl_FragColor = vec4(c * lam * (0.82 + 0.18 * rim), 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "shader");
  }
  return sh;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) || "link");
  }
  return p;
}

function buildSphere() {
  const step = 2;
  const lats = [];
  const lons = [];
  for (let lat = -90; lat <= 90; lat += step) lats.push(lat);
  for (let lon = -180; lon <= 180; lon += step) lons.push(lon);
  const pos = new Float32Array(lats.length * lons.length * 2);
  const rows = [];
  let n = 0;
  for (let y = 0; y < lats.length; y++) {
    const row = [];
    for (let x = 0; x < lons.length; x++) {
      row.push(n / 2);
      pos[n++] = lons[x];
      pos[n++] = lats[y];
    }
    rows.push(row);
  }
  const idx = [];
  for (let y = 0; y < rows.length - 1; y++) {
    for (let x = 0; x < rows[y].length - 1; x++) {
      const a = rows[y][x], b = rows[y][x + 1], c = rows[y + 1][x], d = rows[y + 1][x + 1];
      idx.push(a, c, b, b, c, d);
    }
  }
  return { pos, idx: new Uint16Array(idx) };
}

const gpuTables = new WeakMap();

export function createView(canvas, options = {}) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: !!options.preserve,
  });
  if (!gl) throw new Error("WebGL is not available in this browser.");
  const uintExt = gl.getExtension("OES_element_index_uint");

  const pieceProg = program(gl, PIECE_VS, PIECE_FS);
  const globeProg = program(gl, GLOBE_VS, GLOBE_FS);
  const pieceLoc = {
    aKm: gl.getAttribLocation(pieceProg, "aKm"),
    aLL: gl.getAttribLocation(pieceProg, "aLL"),
    uOrigin: gl.getUniformLocation(pieceProg, "uOrigin"),
    uSize: gl.getUniformLocation(pieceProg, "uSize"),
    uKmpp: gl.getUniformLocation(pieceProg, "uKmpp"),
    uCenter: gl.getUniformLocation(pieceProg, "uCenter"),
    uScale: gl.getUniformLocation(pieceProg, "uScale"),
    uPxOffset: gl.getUniformLocation(pieceProg, "uPxOffset"),
    uShadow: gl.getUniformLocation(pieceProg, "uShadow"),
    uAlpha: gl.getUniformLocation(pieceProg, "uAlpha"),
  };
  const globeLoc = {
    aLL: gl.getAttribLocation(globeProg, "aLL"),
    uLon0: gl.getUniformLocation(globeProg, "uLon0"),
    uLat0: gl.getUniformLocation(globeProg, "uLat0"),
    uRadius: gl.getUniformLocation(globeProg, "uRadius"),
    uSize: gl.getUniformLocation(globeProg, "uSize"),
  };

  const sphere = buildSphere();
  const sphereVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVbo);
  gl.bufferData(gl.ARRAY_BUFFER, sphere.pos, gl.STATIC_DRAW);
  const sphereIbo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIbo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.idx, gl.STATIC_DRAW);

  const tex = gl.createTexture();
  let ready = false;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);

  function table() {
    let t = gpuTables.get(gl);
    if (!t) gpuTables.set(gl, t = new WeakMap());
    return t;
  }

  function prepare(mesh) {
    const t = table();
    let buf = t.get(mesh);
    if (buf) return buf;
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    buf = {
      vbo, ibo,
      count: mesh.indices.length,
      type: mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
    };
    t.set(mesh, buf);
    return buf;
  }

  function setRelief(image) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    let source = image;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    if (image.width > max || image.height > max) {
      const scale = max / Math.max(image.width, image.height);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.floor(image.width * scale));
      c.height = Math.max(1, Math.floor(image.height * scale));
      c.getContext("2d").drawImage(image, 0, 0, c.width, c.height);
      source = c;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready = true;
  }

  function resize(cssW, cssH, ratio) {
    const dpr = ratio == null ? Math.min(1.5, window.devicePixelRatio || 1) : ratio;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function begin() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function drawPieces(entries, view, options = {}) {
    if (!ready) return;
    begin();
    gl.useProgram(pieceProg);
    gl.uniform2f(pieceLoc.uOrigin, view.originX, view.originY);
    gl.uniform2f(pieceLoc.uSize, view.width, view.height);
    gl.uniform1f(pieceLoc.uKmpp, view.kmPerPx);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const shadow = options.shadow !== false;
    for (const entry of entries) {
      const mesh = entry.mesh;
      if (!mesh.indices.length) continue;
      const buf = prepare(mesh);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.ibo);
      gl.enableVertexAttribArray(pieceLoc.aKm);
      gl.enableVertexAttribArray(pieceLoc.aLL);
      gl.vertexAttribPointer(pieceLoc.aKm, 2, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(pieceLoc.aLL, 2, gl.FLOAT, false, 16, 8);
      gl.uniform2f(pieceLoc.uCenter, entry.cx, entry.cy);
      gl.uniform1f(pieceLoc.uScale, entry.scale);
      const alpha = entry.alpha == null ? 1 : entry.alpha;
      gl.uniform1f(pieceLoc.uAlpha, alpha);
      if (shadow && alpha > 0.85) {
        gl.uniform2f(pieceLoc.uPxOffset, 5, 6);
        gl.uniform1f(pieceLoc.uShadow, 1);
        gl.drawElements(gl.TRIANGLES, buf.count, buf.type, 0);
      }
      gl.uniform2f(pieceLoc.uPxOffset, 0, 0);
      gl.uniform1f(pieceLoc.uShadow, 0);
      gl.drawElements(gl.TRIANGLES, buf.count, buf.type, 0);
    }
  }

  function drawGlobe(lon0, lat0, radius, width, height) {
    if (!ready) return;
    begin();
    gl.useProgram(globeProg);
    gl.uniform1f(globeLoc.uLon0, lon0);
    gl.uniform1f(globeLoc.uLat0, lat0);
    gl.uniform1f(globeLoc.uRadius, radius);
    gl.uniform2f(globeLoc.uSize, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIbo);
    gl.enableVertexAttribArray(globeLoc.aLL);
    gl.vertexAttribPointer(globeLoc.aLL, 2, gl.FLOAT, false, 8, 0);
    gl.drawElements(gl.TRIANGLES, sphere.idx.length, gl.UNSIGNED_SHORT, 0);
  }

  return { gl, setRelief, resize, drawPieces, drawGlobe };
}
