import * as THREE from 'three';

export interface ClothPhysicsParams {
  /** 0..0.6 — how fast motion dies out (air drag). */
  viscosity: number;
  /** 0..1 — constraint solve strength. */
  stiffness: number;
  /** relaxation iterations per substep */
  iterations: number;
  /** 0..0.3 — laplacian smoothing, relaxes wrinkles back out */
  smoothing: number;
}

interface GrabState {
  indices: number[];
  weights: number[];
  /** offset of each grabbed vertex from the grab origin, 3 floats per entry */
  offsets: Float32Array;
  target: THREE.Vector3;
}

const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS = 4;
/** substeps of the opening drape: an overdriven fall, then a relaxation pass */
const SETTLE_DROP_STEPS = 80;
const SETTLE_RELAX_STEPS = 50;
const SETTLE_STEPS = SETTLE_DROP_STEPS + SETTLE_RELAX_STEPS;
/** fraction of the top edge each peg sits in from its corner */
const PEG_INSET = 0.1;
/**
 * How much narrower the peg span is than the fabric between the pegs. The
 * slack has nowhere to go but out of plane, which is what buckles a hung
 * sheet into vertical folds — a sheet clipped up perfectly taut stays flat.
 */
const PEG_GATHER = 0.9;

/**
 * Verlet cloth hung from two pegs on a line, the way a sheet is left out to
 * dry: gravity pulls the slack into vertical folds, the top edge sags into a
 * catenary between the pegs, and a low-frequency breeze keeps it breathing.
 */
export class ClothSim {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  readonly positions: Float32Array;
  private prev: Float32Array;
  private rest: Float32Array;

  // constraints as flat arrays: [ia, ib] pairs + rest length + strength mul
  private cA: Int32Array;
  private cB: Int32Array;
  private cRest: Float32Array;
  private cMul: Float32Array;

  /** 4-neighborhood for laplacian smoothing: -1 padded */
  private neighbors: Int32Array;

  /** downward acceleration, world units/s² — 0 floats the cloth again */
  gravity = 4.2;
  /** breeze amplitude; 0 leaves the drape perfectly still */
  wind = 1.6;

  /** vertices held by the pegs, and where they are held */
  private pins!: Int32Array;
  private pinPos!: Float32Array;

  private grab: GrabState | null = null;
  private accumulator = 0;
  private time = 0;
  /** substeps of the opening drape already run. Settling is deferred to the
   *  first step so a rebuild that gets replaced in the same frame (aspect +
   *  perf profile both change at startup) pays for the drape only once */
  private settleStep = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly segX: number,
    readonly segY: number,
  ) {
    this.cols = segX + 1;
    this.rows = segY + 1;
    this.count = this.cols * this.rows;
    this.positions = new Float32Array(this.count * 3);
    this.prev = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);

    this.initPositions();

    // Build constraints: structural (1.0), shear (0.8), bend (0.1) — fabric
    // is near-inextensible but bends almost freely, so the bend springs stay
    // weak or the drape stiffens into sheet metal.
    //
    // Weak is not the same as removable: they are a third of the constraints
    // and, being distance pairs like the rest, they carry load. Dropping them
    // takes the worst stretch from 15% to 21% at the same iteration count,
    // and clawing that back needs ~20 iterations — which costs more than
    // keeping them. Measured; do not "optimize" them away again.
    const a: number[] = [];
    const b: number[] = [];
    const mul: number[] = [];
    const idx = (x: number, y: number) => y * this.cols + x;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (x + 1 < this.cols) { a.push(idx(x, y)); b.push(idx(x + 1, y)); mul.push(1.0); }
        if (y + 1 < this.rows) { a.push(idx(x, y)); b.push(idx(x, y + 1)); mul.push(1.0); }
        if (x + 1 < this.cols && y + 1 < this.rows) {
          a.push(idx(x, y)); b.push(idx(x + 1, y + 1)); mul.push(0.8);
          a.push(idx(x + 1, y)); b.push(idx(x, y + 1)); mul.push(0.8);
        }
        if (x + 2 < this.cols) { a.push(idx(x, y)); b.push(idx(x + 2, y)); mul.push(0.1); }
        if (y + 2 < this.rows) { a.push(idx(x, y)); b.push(idx(x, y + 2)); mul.push(0.1); }
      }
    }
    this.cA = new Int32Array(a);
    this.cB = new Int32Array(b);
    this.cMul = new Float32Array(mul);
    this.cRest = new Float32Array(a.length);
    this.computeRestLengths();

    this.neighbors = new Int32Array(this.count * 4).fill(-1);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = idx(x, y) * 4;
        this.neighbors[i + 0] = x > 0 ? idx(x - 1, y) : -1;
        this.neighbors[i + 1] = x + 1 < this.cols ? idx(x + 1, y) : -1;
        this.neighbors[i + 2] = y > 0 ? idx(x, y - 1) : -1;
        this.neighbors[i + 3] = y + 1 < this.rows ? idx(x, y + 1) : -1;
      }
    }
  }

  /**
   * Flat rectangle hanging in the XY plane, seeded with shallow vertical
   * folds. The seed only breaks the symmetry — `settle()` turns it into a
   * real drape by running the sim forward under gravity.
   */
  private initPositions() {
    const stepX = this.width / this.segX;
    const stepY = this.height / this.segY;
    let k = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const u = x / this.segX;
        const v = y / this.segY;
        const fold = Math.sin(u * Math.PI * 3) * 0.6 + Math.sin(u * Math.PI * 5 + 0.9) * 0.3;
        this.positions[k] = -this.width / 2 + x * stepX;
        this.positions[k + 1] = this.height / 2 - y * stepY;
        // folds open up away from the pegs, so nothing at the top row moves
        this.positions[k + 2] = fold * 0.09 * Math.sin(v * Math.PI * 0.8);
        k += 3;
      }
    }
    this.prev.set(this.positions);
    this.rest.set(this.positions);
    this.capturePins();
  }

  /**
   * Two pegs near the top corners, each holding a couple of vertices so the
   * fabric bunches at the peg instead of spiking from a single point.
   */
  private capturePins() {
    const c0 = Math.max(1, Math.round(this.segX * PEG_INSET));
    const c1 = Math.min(this.segX - 1, this.segX - c0);
    // row 0 runs along the top edge, so vertex index === column index
    const cols = [...new Set([c0, c0 + 1, c1 - 1, c1])]
      .filter((c) => c >= 0 && c < this.cols)
      .sort((a, b) => a - b);
    this.pins = new Int32Array(cols);
    this.pinPos = new Float32Array(cols.length * 3);
    for (let i = 0; i < cols.length; i++) {
      const p = cols[i] * 3;
      this.pinPos[i * 3] = this.positions[p] * PEG_GATHER;
      this.pinPos[i * 3 + 1] = this.positions[p + 1];
      this.pinPos[i * 3 + 2] = this.positions[p + 2];
    }
  }

  /** World-space center of each peg, for drawing the line and the clips. */
  pegPoints(): THREE.Vector3[] {
    const half = this.pins.length / 2;
    const out: THREE.Vector3[] = [];
    for (let g = 0; g < 2; g++) {
      const v = new THREE.Vector3();
      for (let i = g * half; i < (g + 1) * half; i++) {
        v.x += this.pinPos[i * 3];
        v.y += this.pinPos[i * 3 + 1];
        v.z += this.pinPos[i * 3 + 2];
      }
      out.push(v.multiplyScalar(1 / half));
    }
    return out;
  }

  /** True until the opening drape has finished falling into shape. */
  get isSettling() {
    return this.settleStep < SETTLE_STEPS;
  }

  /**
   * Fast-forward the sim so the cloth is already hanging on the first frame
   * instead of dropping into place while the page loads. Wind is off — a
   * settled drape, not a gust caught mid-flight.
   *
   * The fabric is near-inextensible, so its hanging shape barely depends on
   * how hard gravity pulls: the first pass overdrives gravity to fall into
   * the drape in a fraction of the steps, and the second relaxes the stretch
   * that shortcut introduces back out at the real strength.
   *
   * The full drape is a few hundred milliseconds of solving, so it is
   * resumable: pass a millisecond budget to spread it across frames instead
   * of blocking one, or Infinity to finish it here.
   */
  settleWithin(budgetMs: number) {
    if (!this.isSettling) return;
    const drop: ClothPhysicsParams = {
      viscosity: 0.4,
      stiffness: 0.95,
      iterations: 6,
      smoothing: 0.02,
    };
    const relax: ClothPhysicsParams = { ...drop, viscosity: 0.35, iterations: 12 };
    const deadline = performance.now() + budgetMs;
    do {
      if (this.settleStep < SETTLE_DROP_STEPS) this.substep(drop, 0, 10);
      else this.substep(relax, 0, 1);
      this.settleStep++;
    } while (this.isSettling && performance.now() < deadline);
    if (!this.isSettling) this.accumulator = 0;
  }

  private computeRestLengths() {
    // rest lengths come from the flat, unbillowed grid so the cloth
    // relaxes toward its true rectangle
    const stepX = this.width / this.segX;
    const stepY = this.height / this.segY;
    for (let c = 0; c < this.cA.length; c++) {
      const ia = this.cA[c], ib = this.cB[c];
      const ax = ia % this.cols, ay = Math.floor(ia / this.cols);
      const bx = ib % this.cols, by = Math.floor(ib / this.cols);
      const dx = (ax - bx) * stepX;
      const dy = (ay - by) * stepY;
      this.cRest[c] = Math.hypot(dx, dy);
    }
  }

  reset() {
    this.initPositions();
    this.grab = null;
    this.settleStep = 0;
    this.settleWithin(Infinity);
  }

  /** Give a random gentle impulse — a "poke" from nowhere. */
  poke(strength = 0.5) {
    const p = this.positions;
    const ci = Math.floor(Math.random() * this.count);
    const cx = p[ci * 3], cy = p[ci * 3 + 1], cz = p[ci * 3 + 2];
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize().multiplyScalar(strength * 0.09);
    const radius = Math.max(this.width, this.height) * 0.28;
    for (let i = 0; i < this.count; i++) {
      const dx = p[i * 3] - cx, dy = p[i * 3 + 1] - cy, dz = p[i * 3 + 2] - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      const w = 1 - d / radius;
      const s = w * w * (3 - 2 * w); // smoothstep
      this.prev[i * 3] -= dir.x * s;
      this.prev[i * 3 + 1] -= dir.y * s;
      this.prev[i * 3 + 2] -= dir.z * s;
    }
  }

  /** Begin a grab around a world-space point. Returns false if nothing near. */
  startGrab(point: THREE.Vector3, radius: number): boolean {
    const p = this.positions;
    const indices: number[] = [];
    const weights: number[] = [];
    const offsets: number[] = [];
    let best = Infinity;
    for (let i = 0; i < this.count; i++) {
      const dx = p[i * 3] - point.x;
      const dy = p[i * 3 + 1] - point.y;
      const dz = p[i * 3 + 2] - point.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      best = Math.min(best, d);
      if (d > radius) continue;
      const t = 1 - d / radius;
      const w = t * t * (3 - 2 * t);
      indices.push(i);
      weights.push(w);
      offsets.push(dx, dy, dz);
    }
    if (indices.length === 0 || best > radius) return false;
    this.grab = {
      indices,
      weights,
      offsets: new Float32Array(offsets),
      target: point.clone(),
    };
    return true;
  }

  moveGrab(target: THREE.Vector3) {
    if (this.grab) this.grab.target.copy(target);
  }

  endGrab() {
    this.grab = null;
  }

  get isGrabbing() {
    return this.grab !== null;
  }

  private cavityScratch: Float32Array | null = null;

  /**
   * Per-vertex cavity term for ambient occlusion: how deeply a vertex sits
   * inside a concave fold. Uses the discrete Laplacian projected onto the
   * vertex normal — concave (valley) vertices score > 0 — then one smoothing
   * pass to avoid grid artifacts. Writes [0,1] into `out`.
   */
  computeCavity(normals: ArrayLike<number>, out: Float32Array, gain = 6) {
    const p = this.positions;
    const nb = this.neighbors;
    const n = this.count;
    const invStep = 1 / Math.min(this.width / this.segX, this.height / this.segY);
    if (!this.cavityScratch || this.cavityScratch.length < n) {
      this.cavityScratch = new Float32Array(n);
    }
    const tmp = this.cavityScratch;
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0, az = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        ax += p[ni * 3]; ay += p[ni * 3 + 1]; az += p[ni * 3 + 2];
        cnt++;
      }
      if (cnt === 0) { tmp[i] = 0; continue; }
      const inv = 1 / cnt;
      const lx = ax * inv - p[i * 3];
      const ly = ay * inv - p[i * 3 + 1];
      const lz = az * inv - p[i * 3 + 2];
      const c = (lx * normals[i * 3] + ly * normals[i * 3 + 1] + lz * normals[i * 3 + 2]) * invStep;
      tmp[i] = Math.min(1, Math.max(0, c * gain));
    }
    // soften: blend each vertex with its neighborhood average
    for (let i = 0; i < n; i++) {
      let sum = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        sum += tmp[ni];
        cnt++;
      }
      out[i] = cnt > 0 ? tmp[i] * 0.5 + (sum / cnt) * 0.5 : tmp[i];
    }
  }

  step(dt: number, params: ClothPhysicsParams) {
    // a caller that has not budgeted for the drape gets all of it at once
    if (this.isSettling) this.settleWithin(Infinity);
    this.accumulator += Math.min(dt, 0.05);
    let steps = 0;
    while (this.accumulator >= SUBSTEP && steps < MAX_SUBSTEPS) {
      this.substep(params);
      this.accumulator -= SUBSTEP;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0;
  }

  private substep(params: ClothPhysicsParams, windMul = 1, gravityMul = 1) {
    const p = this.positions;
    const prev = this.prev;
    const n = this.count;
    this.time += SUBSTEP;

    // integrate: damping expressed per 60Hz-frame, converted to substep rate
    const damp = Math.pow(1 - Math.min(params.viscosity, 0.99), SUBSTEP * 60);
    // verlet takes accelerations as position offsets: a * dt²
    const dt2 = SUBSTEP * SUBSTEP;
    const g = -this.gravity * gravityMul * dt2;
    for (let i = 0; i < n * 3; i++) {
      const cur = p[i];
      const vel = (cur - prev[i]) * damp;
      prev[i] = cur;
      p[i] = cur + vel;
    }
    for (let i = 1; i < n * 3; i += 3) p[i] += g;

    // breeze: two slow travelling waves, mostly pushing the cloth off the
    // plane (z) with a little lateral drift, gusting on a longer cycle
    const windAmp = this.wind * dt2 * windMul;
    if (windAmp > 0) {
      const t = this.time;
      const gust = 0.55 + 0.45 * Math.sin(t * 0.31);
      for (let i = 0; i < n; i++) {
        const x = p[i * 3];
        const y = p[i * 3 + 1];
        const w = Math.sin(t * 1.05 + y * 1.7 + x * 0.5) * 0.65 +
                  Math.sin(t * 0.47 - x * 1.2 + 2.3) * 0.35;
        const a = windAmp * gust * w;
        p[i * 3 + 2] += a;
        p[i * 3] += a * 0.3;
      }
    }
    this.applyPins();

    // laplacian smoothing — keeps grid-scale crinkle from accumulating,
    // without ironing out the folds gravity puts in
    if (params.smoothing > 0) {
      const k = params.smoothing * 0.5;
      const nb = this.neighbors;
      for (let i = 0; i < n; i++) {
        let ax = 0, ay = 0, az = 0, cnt = 0;
        for (let j = 0; j < 4; j++) {
          const ni = nb[i * 4 + j];
          if (ni < 0) continue;
          ax += p[ni * 3]; ay += p[ni * 3 + 1]; az += p[ni * 3 + 2];
          cnt++;
        }
        if (cnt === 0) continue;
        const inv = 1 / cnt;
        p[i * 3] += (ax * inv - p[i * 3]) * k;
        p[i * 3 + 1] += (ay * inv - p[i * 3 + 1]) * k;
        p[i * 3 + 2] += (az * inv - p[i * 3 + 2]) * k;
      }
      this.applyPins();
    }

    // constraint relaxation
    const iters = Math.max(1, Math.round(params.iterations));
    const stiff = params.stiffness;
    const cA = this.cA, cB = this.cB, cRest = this.cRest, cMul = this.cMul;
    const nc = cA.length;
    for (let it = 0; it < iters; it++) {
      for (let c = 0; c < nc; c++) {
        const ia = cA[c] * 3, ib = cB[c] * 3;
        const dx = p[ib] - p[ia];
        const dy = p[ib + 1] - p[ia + 1];
        const dz = p[ib + 2] - p[ia + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1e-9) continue;
        const diff = ((d - cRest[c]) / d) * 0.5 * stiff * cMul[c];
        const ox = dx * diff, oy = dy * diff, oz = dz * diff;
        p[ia] += ox; p[ia + 1] += oy; p[ia + 2] += oz;
        p[ib] -= ox; p[ib + 1] -= oy; p[ib + 2] -= oz;
      }
      this.applyGrab();
      this.applyPins();
    }
  }

  /** Pegs are immovable: whatever else happened, put those vertices back. */
  private applyPins() {
    const p = this.positions;
    for (let k = 0; k < this.pins.length; k++) {
      const i = this.pins[k] * 3;
      p[i] = this.pinPos[k * 3];
      p[i + 1] = this.pinPos[k * 3 + 1];
      p[i + 2] = this.pinPos[k * 3 + 2];
    }
  }

  private applyGrab() {
    const g = this.grab;
    if (!g) return;
    const p = this.positions;
    for (let k = 0; k < g.indices.length; k++) {
      const i = g.indices[k] * 3;
      const w = g.weights[k];
      const tx = g.target.x + g.offsets[k * 3];
      const ty = g.target.y + g.offsets[k * 3 + 1];
      const tz = g.target.z + g.offsets[k * 3 + 2];
      p[i] += (tx - p[i]) * w;
      p[i + 1] += (ty - p[i + 1]) * w;
      p[i + 2] += (tz - p[i + 2]) * w;
    }
  }
}
