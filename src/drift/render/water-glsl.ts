// 水面与河岸着色器
export const maxLights = 16

export const waterVert = /* glsl */ `
in vec2 aPosition;
out vec2 vWorld;
out vec2 vScreen;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec2 uScreen;
uniform vec3 uCam;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vScreen = aPosition;
  vWorld = uCam.xy + (aPosition * uScreen - uScreen * 0.5) / uCam.z;
}
`

export const waterFrag = /* glsl */ `
precision highp float;
in vec2 vWorld;
in vec2 vScreen;
out vec4 finalColor;

uniform vec2 uScreen;
uniform sampler2D uData;
uniform sampler2D uDetail;
uniform sampler2D uBed;
uniform sampler2D uLand;
uniform vec4 uGrid;
uniform float uTime;
uniform float uFlow;
uniform float uLightCount;
uniform vec4 uLights[${maxLights}];
uniform vec4 uLightCol[${maxLights}];
uniform vec3 uAmbient;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uLandTint;
uniform vec3 uSky;
uniform vec3 uMoon;
uniform float uExposure;
uniform float uBedVis;
uniform float uStone;
uniform float uGlow;

float caustic(vec2 p, float t) {
  float a = texture(uDetail, p / 71.0 + vec2(t * 0.021, t * 0.034)).b;
  float b = texture(uDetail, p / 89.0 + vec2(-t * 0.027, t * 0.015)).b;
  return pow(1.0 - abs(a - b), 9.0);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 w = vWorld;
  vec2 uv = vec2((w.x - uGrid.x) / uGrid.y, w.y / uGrid.z);
  vec4 d = texture(uData, uv);
  // 两种尺度错开采样，掩盖平铺
  vec4 land = texture(uLand, w / 256.0);
  vec4 land2 = texture(uLand, vec2(w.x * 0.6 - w.y * 0.8, w.x * 0.8 + w.y * 0.6) / 733.0);
  land.rgb = mix(land.rgb, land2.rgb, 0.45) * (0.75 + 0.5 * land2.a);
  float depth = d.a * 192.0 - 16.0 + (land.a - 0.5) * 7.0 * (1.0 - uStone * 0.85);
  if (uv.x < 0.0 || uv.x > 1.0) depth = -40.0;
  float h = (d.r - 0.5) * 2.0;
  vec2 slope = (d.gb - 0.5) * 2.0;

  // 顺流细节法线，两层视差
  vec2 f1 = w / 230.0 + vec2(0.0, uTime * uFlow / 230.0);
  vec2 f2 = w / 101.0 + vec2(uTime * 0.013, uTime * uFlow * 1.2 / 101.0);
  vec2 dn = (texture(uDetail, f1).rg - 0.5) * 0.7 + (texture(uDetail, f2).rg - 0.5) * 0.45;
  vec3 N = normalize(vec3(slope * 0.9 + dn * 0.12, 1.0));

  // 灯光累计
  vec3 light = uAmbient;
  vec3 spec = vec3(0.0);
  for (int i = 0; i < ${maxLights}; i++) {
    if (float(i) >= uLightCount) break;
    vec4 L = uLights[i];
    vec4 C = uLightCol[i];
    vec2 dv = L.xy - w;
    float dist = length(dv);
    float att = 1.0 - smoothstep(0.0, L.z, dist);
    light += C.rgb * L.w * att * att;
    vec3 H = normalize(normalize(vec3(dv, C.a)) + vec3(0.0, 0.0, 1.0));
    float s = pow(max(dot(N, H), 0.0), 70.0);
    spec += C.rgb * L.w * s * (1.0 - smoothstep(0.0, L.z * 1.5, dist));
  }

  // 水体：浅处透见河床，深处沉入夜色
  float wd = smoothstep(-6.0, 110.0, depth);
  vec2 refr = N.xy * (4.0 + 26.0 * wd);
  vec3 bed = texture(uBed, (w + refr) / 125.0).rgb;
  bed = mix(bed, vec3(0.42, 0.4, 0.36), 0.3 + 0.4 * wd);
  float ca = caustic(w + refr * 0.6, uTime);
  vec3 bedLit = bed * uShallow * (0.7 + ca * 1.3 * (1.0 - wd));
  float murk = (1.0 - uBedVis) * smoothstep(0.0, 30.0, depth);
  vec3 water = mix(bedLit, uDeep, clamp(0.22 + wd * 0.74 + murk * 0.7, 0.0, 1.0));
  water *= light;
  // 萤洞：水中浮游荧光
  vec2 pw = vec2(w.x * 0.8 + w.y * 0.6, w.y * 0.8 - w.x * 0.6);
  float pa = texture(uDetail, w / 53.0 + vec2(uTime * 0.012, uTime * uFlow * 0.9 / 53.0)).a;
  float pb = texture(uDetail, pw / 37.0 + vec2(-uTime * 0.017, uTime * uFlow * 0.7 / 37.0)).a;
  float twinkle = 0.55 + 0.45 * sin(uTime * 2.7 + w.x * 0.13 + w.y * 0.09);
  water += vec3(0.25, 0.85, 1.0) * smoothstep(0.62, 0.68, pa * pb * 1.25) * twinkle * uGlow * smoothstep(4.0, 24.0, depth) * 0.9;
  // 天光倒影随法线起伏
  float sky = 0.5 + dot(N.xy, vec2(-0.6, -1.1)) * 2.2;
  water += uSky * clamp(sky, 0.0, 2.5) * 0.75;
  vec3 Hm = normalize(normalize(vec3(-0.2, -0.36, 0.9)) + vec3(0.0, 0.0, 1.0));
  water += uMoon * pow(max(dot(N, Hm), 0.0), 420.0) * 1.1;
  water += spec * 1.15;

  // 岸边与礁石泡沫、浪尖
  float fn = texture(uDetail, w / 48.0 + vec2(0.0, uTime * uFlow / 48.0)).a;
  float edge = 1.0 - smoothstep(0.0, 9.0, depth);
  float foam = edge * smoothstep(0.42, 0.7, fn + edge * 0.35);
  foam += smoothstep(0.55, 1.0, h) * 0.2;
  water = mix(water, vec3(0.82, 0.9, 0.95) * (light * 0.85 + 0.15), clamp(foam, 0.0, 1.0) * 0.5);

  // 河岸：湿沙草甸 / 石板驳岸 / 洞壁
  float sand = smoothstep(-20.0, -1.0, depth) * (1.0 - uStone);
  vec3 ground = mix(land.rgb * uLandTint, bed * vec3(0.55, 0.5, 0.45), sand * 0.8);
  vec2 sp = w / vec2(28.0, 17.0);
  sp.x += floor(sp.y) * 0.5;
  vec2 sf = fract(sp);
  float slab = smoothstep(0.0, 0.05, sf.x) * smoothstep(1.0, 0.95, sf.x) * smoothstep(0.0, 0.08, sf.y) * smoothstep(1.0, 0.92, sf.y);
  vec3 paving = mix(vec3(0.12, 0.11, 0.13), vec3(0.38, 0.36, 0.38) * (0.8 + 0.45 * land.a), slab);
  float wall = smoothstep(-10.0, -7.5, depth) * (1.0 - smoothstep(-2.0, 0.0, depth));
  paving = mix(paving, vec3(0.55, 0.52, 0.5), wall * 0.7);
  ground = mix(ground, paving, uStone);
  ground *= 0.72 + 0.28 * smoothstep(-2.0, -10.0, depth);
  ground *= light * 0.9;
  ground += vec3(0.2, 0.8, 0.95) * smoothstep(0.8, 0.86, land.a) * uGlow * 0.35 * (0.6 + 0.4 * twinkle);

  vec3 col = mix(ground, water, smoothstep(-0.8, 0.8, depth));
  vec2 q = vScreen - 0.5;
  float side = abs(q.x) * uScreen.x / uScreen.y;
  col *= (1.0 - dot(q, q) * 0.55) * (1.0 - smoothstep(0.3, 0.95, side) * 0.6);
  finalColor = vec4(aces(col * uExposure), 1.0);
}
`
