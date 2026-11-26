// Direction B · tier 3: a raw WebGL light layer (no library, ~3 KB).
// Loaded only on capable devices. The Canvas 2D renderer projects everything and hands this
// layer a flat list of light sources; the shader gives each a physically-motivated falloff
// (gaussian core + inverse-square tail), accumulates them additively, and widens / softens
// out-of-focus lights for depth of field. If WebGL is missing or the context is lost, the
// 2D renderer simply keeps drawing its own sprites.
const VS = `attribute vec2 p;attribute float s;attribute vec4 c;attribute float k;uniform vec2 r;varying vec4 vc;varying float vk;
void main(){vec2 q=p/r*2.0-1.0;gl_Position=vec4(q.x,-q.y,0.,1.);gl_PointSize=s;vc=c;vk=k;}`;
const FS = `precision mediump float;varying vec4 vc;varying float vk;
void main(){vec2 d=gl_PointCoord*2.0-1.0;float q=dot(d,d);if(q>1.0)discard;
float core=exp(-q*mix(30.0,90.0,vk));float tail=(0.018/(q+0.018))*(1.0-q);
float a=mix(core*0.9+tail*0.1,core*0.5+tail*0.7,vk)*vc.a;gl_FragColor=vec4(vc.rgb*a,a);}`;

export function createGL(canvas, w, h, dpr) {
  let gl;
  try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' }); } catch { return null; }
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null; } catch { return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const loc = (n) => gl.getAttribLocation(prog, n);
  const F = 4, STRIDE = 8 * F;
  const attr = (n, size, off) => { const l = loc(n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, STRIDE, off * F); };
  attr('p', 2, 0); attr('s', 1, 2); attr('c', 4, 3); attr('k', 1, 7);
  const ur = gl.getUniformLocation(prog, 'r');
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  const maxPt = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;
  let lost = false; let D = dpr; let CW = w, CH = h;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  const api = {
    resize(nw, nh, ndpr) { CW = nw; CH = nh; D = ndpr; canvas.width = Math.round(nw * D); canvas.height = Math.round(nh * D); canvas.style.width = nw + 'px'; canvas.style.height = nh + 'px'; gl.viewport(0, 0, canvas.width, canvas.height); },
    draw(data, n) {
      if (lost) return;
      // sizes are in CSS px; convert to device px and clamp to the hardware point-size limit
      for (let i = 0; i < n; i++) data[i * 8 + 2] = Math.min(maxPt, data[i * 8 + 2] * D);
      gl.uniform2f(ur, CW, CH);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
      gl.drawArrays(gl.POINTS, 0, n);
    },
  };
  api.resize(w, h, dpr);
  return api;
}
