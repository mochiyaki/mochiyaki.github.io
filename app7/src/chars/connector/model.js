// Voxel Connector: an oval jelly monster. One blob (on the rig's hips joint — the hips channels are its whole body) with
// two big eyes and a very large mouth — never shut, chewing slowly on its own clock — painted on its front, three black hairs on top, two little
// orange balls for hands (floating free: they ride the rig's two weapon joints, so a punch reaches as far as its clip
// says). No feet, no weapon: it hops and slides on its bottom.
// Render-only life (createConnectorSecondary): the jelly wobble (a spring on the blob's squash: it stretches in a jump,
// flattens on a landing or a slam, bounces with the run), the face (the slow chew, blinks on another clock, the mouth
// as wide as it goes on a shout, eyes blazing on Copy: Flash), the hairs swaying, the two copies of Clone Burst, and the Overclock's size — GIGA CONNECT
// blows the whole rig up 4.64× (a hundred times its volume).
import * as THREE from 'three';
import { vox } from '../../hero/model.js';
import { shade } from '../../core/voxel.js';
import { hash01 } from '../../core/rng.js';
import { HERO_SCALE } from '../../hero/rig.js';
import { B, hex, fighterMaterial } from '../shared/body.js';
import { CLONES, MOVES } from './moves.js';
import { MUSOU_FRAMES } from './anims.js';

export const JC = {
  jelly: hex('#46e07a'), light: hex('#a6ffc4'), deep: hex('#1e8a4a'), gloss: hex('#eafff0'), orange: hex('#ff8a1e'), orangeD: hex('#d9620c'), orangeL: hex('#ffc070'),
  hair: hex('#16181c'), white: hex('#ffffff'), pupil: hex('#10131a'), mouth: hex('#4a0f1e'), tongue: hex('#ff6f8a'), tongueD: hex('#d94a6a'), tooth: hex('#fff6e6'), toothD: hex('#d8ccbc'), flash: hex('#fff7b0'),
};
const BV = 0.03, RX = 15, RY = 20, RZ = 13.5;                       // blob voxel (m), radii (voxels)
export const BLOB_Y = -0.06;                                          // blob centre under the hips joint (m)
/** GIGA CONNECT: linear scale at Overclock frame t (1 → 4.64 → 1): a hundred times the volume. */
export const GIANT = 4.64;
export function giantScale(t) {
  if (t <= 6 || t >= MUSOU_FRAMES - 2) return 1;
  if (t < 30) { const u = (t - 6) / 24, e = 1 - (1 - u) ** 3; return 1 + (GIANT - 1) * (e + 0.12 * Math.sin(u * Math.PI)); }   // a little overshoot
  if (t > MUSOU_FRAMES - 24) { const u = (MUSOU_FRAMES - 2 - t) / 22; return 1 + (GIANT - 1) * u * u; }
  return GIANT;
}

// ---------------------------------------------------------------- the blob, in its four faces
const inside = (x, y, z) => { const w = 1 + 0.12 * Math.max(0, -(y + 0.5) / RY); return ((x + 0.5) / (RX * w)) ** 2 + ((y + 0.5) / RY) ** 2 + ((z + 0.5) / (RZ * w)) ** 2 <= 1; };
function jelly(x, y, z) {
  if (!inside(x, y, z)) return null;
  const u = (y + RY) / (2 * RY);                                      // 0 bottom → 1 top
  if (x < -3 && x > -11 && y > 8 && y < 16 && z > 2 && (x + y) % 5 !== 0 && hash01(x, y, 3) < 0.8) return JC.gloss;   // the wet highlight
  if (hash01(x, y, z) < 0.035) return JC.light;                       // bubbles
  return u > 0.78 ? JC.light : u > 0.5 ? shade(JC.jelly, 1.06) : u > 0.22 ? JC.jelly : JC.deep;
}
const EYE = { x: 6.5, y: 5.5, rx: 4.3, ry: 5.4 };
/** The face painted on the front: eyes 'idle' | 'blink' | 'flash', mouth open by `k` (0.3 … 1: it is never shut — it
 *  chews, slowly, all the time). → the colour at (x, y), or null. */
function facePaint(face, k) {
  return (x, y, z) => {
    if (z < 2) return null;
    const cx = x + 0.5, cy = y + 0.5;
    for (const s of [-1, 1]) {                                        // eyes
      const ex = (cx - s * EYE.x) / EYE.rx, ey = (cy - EYE.y) / EYE.ry, d = ex * ex + ey * ey;
      if (d > 1) continue;
      if (face === 'blink') return Math.abs(cy - EYE.y + 1) < 1 ? JC.pupil : null;
      if (face === 'flash') return d > 0.8 ? JC.orangeL : JC.flash;
      const qx = cx - s * (EYE.x - 0.9), qy = cy - (EYE.y - 0.4);      // the pupil: a tall oval toward the nose, one catch-light
      if (Math.abs(qx + 0.9) < 0.6 && Math.abs(qy - 1.3) < 0.6) return JC.white;
      if ((qx / 2.3) ** 2 + (qy / 3.2) ** 2 <= 1) return JC.pupil;
      return JC.white;
    }
    if (Math.abs(cx) > 10.5) return null;                            // mouth: the upper lip line stays, the jaw drops by k
    const top = -2.5 + 0.02 * cx * cx, gap = (10 - 0.055 * cx * cx) * k, bot = top - gap;
    // the big tongue: once the mouth is past half open it lolls out over the lower lip, further the wider the mouth
    if (gap > 3.2) {
      const hang = 1 + (gap - 3.2) * 0.55, half = 5.6 - Math.max(0, bot - cy) * 1.1;
      if (cy < bot + 4.2 && cy > bot - hang && Math.abs(cx) < half) return cy < bot - hang + 1.2 || Math.abs(cx) > half - 1.1 ? JC.tongueD : JC.tongue;
    }
    if (cy > top || cy < bot) return null;
    if (cy > top - 1.6) return Math.abs(Math.round(cx)) % 5 === 0 ? JC.toothD : JC.tooth;   // a tight top row: seams, no gaps
    if (cy < bot + 1.4) return Math.abs(Math.round(cx) + 2) % 5 === 0 ? JC.toothD : JC.tooth;   // bottom row on the jaw
    return JC.mouth;
  };
}
const blobGeo = (face, k) => vox([B([-18, -21, -17], [18, 21, 17], jelly), { a: [-13, -15, 2], b: [13, 13, 17], c: facePaint(face, k), paint: true }], BV, { jitter: 0.05, ao: 0.28 });
const EYES = ['idle', 'blink', 'flash'], MOUTH = [0.3, 0.5, 0.72, 1];   // the baked variants: 3 eye states × 4 jaw positions
/** Jaw position 0-3 of the slow chew at time t (s): one chew ≈ 5.4 s (drifting between ≈ 4.6 and 6.2 s, never in step
 *  with the blinks) — opens over 0.7 s, HOLDS open for ≈ 2.6 s, closes over 1 s, rests nearly shut for ≈ 1 s. */
export const chew = (t) => {
  const u = (t / 5.4 + 0.12 * Math.sin(t * 0.37)) % 1;                // the chew's phase; its rate wanders but never reverses
  const o = u < 0.13 ? u / 0.13 : u < 0.62 ? 1 : u < 0.8 ? 1 - (u - 0.62) / 0.18 : 0;
  return Math.max(0, Math.min(3, Math.floor(o * 3.999)));
};

const ballGeo = (r, c, cL, cD, sx = 1, sy = 1, sz = 1) => vox([B([-7, -7, -8], [7, 7, 8], (x, y, z) => {
  const d = ((x + 0.5) / (r * sx)) ** 2 + ((y + 0.5) / (r * sy)) ** 2 + ((z + 0.5) / (r * sz)) ** 2;
  return d > 1 ? null : y > r * sy * 0.35 && x < 0 ? cL : y < -r * sy * 0.4 ? cD : c;
})], BV, { jitter: 0.05, ao: 0.3 });
const hairGeo = (k) => vox([B([0, 0, 0], [1, 8 + k, 1], JC.hair), B([1, 7 + k, 0], [3, 8 + k, 1], JC.hair), B([2, 5 + k, 0], [3, 7 + k, 1], JC.hair)], BV, { off: [-0.5, 0, -0.5], jitter: 0.02, ao: 0.1 });

export function createConnectorModel(rig) {
  const mat = fighterMaterial({ roughness: 0.28, metalness: 0, emissive: new THREE.Color(0x0a5a2a), emissiveIntensity: 0.18 }, 0.35, 1.1);
  const ballMat = fighterMaterial({ roughness: 0.4, emissive: new THREE.Color(0x5a2400), emissiveIntensity: 0.2 }, 0.35, 0.9);
  const meshes = {};
  const add = (parent, geo, name, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; parent.add(o); meshes[name] = o; return o; };
  const faces = {};
  for (const e of EYES) MOUTH.forEach((k, i) => { faces[e + i] = blobGeo(e, k); });
  const blob = add(rig.joints.hips, faces.idle3, 'blob', mat);
  blob.position.y = BLOB_Y;
  const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5 });
  const hairs = [-1, 0, 1].map((k) => {
    const h = add(blob, hairGeo(k === 0 ? 2 : 0), 'hair' + k, hairMat);
    h.position.set(k * 0.11, 0.58 - Math.abs(k) * 0.03, 0.02); h.rotation.z = -k * 0.4; h.rotation.y = k ? 0 : Math.PI;
    return h;
  });
  const hand = ballGeo(4.2, JC.orange, JC.orangeL, JC.orangeD);
  add(rig.joints.weapon, hand, 'handR', ballMat); add(rig.joints.weaponL, hand, 'handL', ballMat);
  rig.connector = { blob, hairs, faces };
  return { meshes, material: mat };
}

// ---------------------------------------------------------------- secondary: wobble, face, hairs, clones, the giant
const OPEN_MOVES = { c1: [16, 50], n6: [20, 36], c2: [12, 30], c3: [8, 60], c5: [6, 66], c6: [10, 60], dash: [4, 30], jc: [4, 44], n4: [8, 18] };
const SLAMS = ['n6', 'c5', 'c6', 'jc'];

export function createConnectorSecondary(scene, rig, mat, hero) {
  const C = rig.connector, blob = C.blob;
  // Clone Burst copies: every mesh of the body once more per side, drawn from the posed originals' matrices
  const src = [];
  rig.root.traverse((o) => { if (o.isMesh) src.push(o); });
  const cloneMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.3, color: new THREE.Color(0.75, 0.62, 1.35),
    emissive: new THREE.Color(0x2a1466), emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
  const clones = [-1, 1].map((side) => ({ side, meshes: src.map((m) => { const c = new THREE.Mesh(m.geometry, cloneMat); c.matrixAutoUpdate = false; c.visible = false; c.frustumCulled = false;
    c.castShadow = true; scene.add(c); return c; }) }));
  const _T = new THREE.Matrix4();
  let t = 0, y = 1, v = 0, face = '', lastMove = -1;
  return {
    reset() { y = 1; v = 0; },
    update(dt) {
      t += dt;
      const h = hero;
      // ---- squash target from what it is doing; a spring follows it (k 170, damping 12: two or three wobbles)
      let want = 1 + 0.03 * Math.sin(t * 2.4);
      let nf = (t % 3.4) < 0.12 || (t % 7.9) < 0.1 ? 'blink' : 'idle', jaw = chew(t);   // eyes; the jaw chews on its own clock
      if (h) {
        if (h.dead) { want = 0.5; nf = 'blink'; jaw = 1; }
        else if (h.state === 'run') want = 1 + 0.08 * Math.sin(h.runPhase * 2) * Math.min(1, h.speed / 8);
        else if (h.state === 'jump') want = h.vy > 0 ? 1.16 : 1.06;
        else if (h.state === 'land') want = 0.8;
        else if (h.state === 'hurt') { want = 0.88; jaw = 3; }
        else if (h.state === 'musou') { want = 1; jaw = 3; }
        else if (h.state === 'attack') {
          const m = MOVES[h.move], o = OPEN_MOVES[h.move];
          if (h.moveSeq !== lastMove) { lastMove = h.moveSeq; v += 1.6; }                    // every move starts with a wobble
          if (o && h.moveT >= o[0] && h.moveT <= o[1]) jaw = 3;                                // a shout: as wide as it goes
          if (h.move === 'c4' && h.moveT >= 12 && h.moveT <= 44) nf = 'flash';
          if (SLAMS.includes(h.move)) for (const w of m.hits) if (h.moveT >= w.f[0] && h.moveT < w.f[0] + 6) want = 0.72;   // flat on a slam
        }
      }
      const n = Math.max(1, Math.min(4, Math.round(dt * 120)));
      for (let i = 0; i < n && dt > 0; i++) { const s = dt / n; v += (170 * (want - y) - 12 * v) * s; y += v * s; }
      y = Math.max(0.4, Math.min(1.5, y));
      const xz = 1 / Math.sqrt(y);
      blob.scale.set(xz, y, xz);
      blob.position.y = BLOB_Y + (y - 1) * 0.56;                      // its bottom stays where it was
      const key = nf + jaw;
      if (key !== face) { face = key; blob.geometry = C.faces[key]; }
      C.hairs.forEach((m, k) => {
        const sway = Math.sin(t * 2.2 + k * 1.3) * 0.12 + v * 0.06;
        m.rotation.z = -(k - 1) * 0.4 + sway; m.rotation.x = (h ? -Math.min(0.6, h.speed * 0.05) : 0) + Math.sin(t * 1.7 + k) * 0.06;
      });
      // ---- GIGA CONNECT: the whole rig, a hundred times the volume
      const g = h && h.state === 'musou' ? giantScale((h.musouT || 0) * MUSOU_FRAMES) : 1;
      if (g !== 1) { rig.root.scale.setScalar(HERO_SCALE * g); }
      rig.root.updateMatrixWorld(true);
      // ---- Clone Burst
      const w = h && h.state === 'attack' && CLONES[h.move];
      const d = w && h.moveT >= w[0] && h.moveT <= w[1] ? w[2] * Math.min(1, (h.moveT - w[0]) / 6, (w[1] - h.moveT) / 6) : 0;
      for (const c of clones) {
        const on = d > 0.05;
        if (on) _T.makeTranslation(Math.cos(h.yaw) * d * c.side, 0, -Math.sin(h.yaw) * d * c.side);
        c.meshes.forEach((m, i) => {
          m.visible = on;
          if (!on) return;
          if (m.geometry !== src[i].geometry) m.geometry = src[i].geometry;
          m.matrix.multiplyMatrices(_T, src[i].matrixWorld); m.matrixWorldNeedsUpdate = true;
        });
      }
    },
  };
}
