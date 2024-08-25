const atol: number = 1e-9;
const rtol: number = 1e-5;
const max_iter: number = 5;

const { abs, max, min, sqrt } = Math;

function sign(n: number): number {
  return n === 0 ? 0 : n > 0 ? 1 : -1;
}

function clamp(n: number, a: number, b: number) {
  return min(b, max(a, n));
}

function is_close(a: number, b: number): boolean {
  return abs(a - b) <= atol + rtol * abs(b);
}

function quadratic(a: number, b: number, c: number, t: number): number {
  return (a * t + b) * t + c;
}

function cubic(a: number, b: number, c: number, d: number, t: number): number {
  return ((a * t + b) * t + c) * t + d;
}

function quartic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  t: number
): number {
  return (((a * t + b) * t + c) * t + d) * t + e;
}

function quintic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  t: number
): number {
  return ((((a * t + b) * t + c) * t + d) * t + e) * t + f;
}

function sextic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  t: number
): number {
  return (((((a * t + b) * t + c) * t + d) * t + e) * t + f) * t + g;
}

function monotonize_3(arr: number[]) {
  let prev = 0;
  for (let i = 0; i < 3; i++) {
    if (arr[i] > prev) {
      prev = arr[i];
    } else {
      arr[i] = prev;
    }
  }
}

function monotonize_4(arr: number[]) {
  let prev = 0;
  for (let i = 0; i < 4; i++) {
    if (arr[i] > prev) {
      prev = arr[i];
    } else {
      arr[i] = prev;
    }
  }
}

function solve_quadratic(a: number, b: number, c: number): number[] {
  if (a === 0) {
    return [clamp(-c / b, 0, 1), 1];
  }
  const d = b * b - 4 * a * c;
  if (d < 0) {
    return [0, 0];
  }
  let t1 = clamp((-b - sqrt(d)) / (2 * a), 0, 1);
  let t2 = clamp((-b + sqrt(d)) / (2 * a), 0, 1);
  if (a < 0) {
    let tmp = t1;
    t1 = t2;
    t2 = tmp;
  }
  return [t1, t2];
}

function solve_cubic_monotonic(
  a: number,
  b: number,
  c: number,
  d: number,
  t1: number,
  t2: number
): number {
  if (t1 == t2) {
    return -1;
  }
  const f1 = cubic(a, b, c, d, t1);
  const f2 = cubic(a, b, c, d, t2);
  if (sign(f1) * sign(f2) > 0) {
    return -1;
  }
  let l = t1;
  let r = t2;
  let t = (l + r) / 2;
  for (let i = 0; i < max_iter; i++) {
    let ft = cubic(a, b, c, d, t);
    if (is_close(ft, 0)) {
      break;
    }
    t -= ft / quadratic(3 * a, 2 * b, c, t);
    if (t < l || t > r) {
      t = (l + r) / 2;
      const ft = cubic(a, b, c, d, t);
      if (sign(ft) == sign(f1)) {
        l = t;
      } else {
        r = t;
      }
    }
  }
  return clamp(t, t1, t2);
}

function solve_cubic(a: number, b: number, c: number, d: number): number[] {
  let crit = solve_quadratic(3 * a, 2 * b, c);
  return [
    solve_cubic_monotonic(a, b, c, d, 0, crit[0]),
    solve_cubic_monotonic(a, b, c, d, crit[0], crit[1]),
    solve_cubic_monotonic(a, b, c, d, crit[1], 1),
  ];
}

function solve_quartic_monotonic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  t1: number,
  t2: number
): number {
  if (t1 == t2) {
    return -1;
  }
  const f1 = quartic(a, b, c, d, e, t1);
  const f2 = quartic(a, b, c, d, e, t2);
  if (sign(f1) * sign(f2) > 0) {
    return -1;
  }
  let l = t1;
  let r = t2;
  let t = (l + r) / 2;
  for (let i = 0; i < max_iter; i++) {
    let ft = quartic(a, b, c, d, e, t);
    if (is_close(ft, 0)) {
      break;
    }
    t -= ft / cubic(4 * a, 3 * b, 2 * c, d, t);
    if (t < l || t > r) {
      t = (l + r) / 2;
      const ft = quartic(a, b, c, d, e, t);
      if (sign(ft) == sign(f1)) {
        l = t;
      } else {
        r = t;
      }
    }
  }
  return clamp(t, t1, t2);
}

function solve_quartic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
): number[] {
  let crit = solve_cubic(4 * a, 3 * b, 2 * c, d);
  monotonize_3(crit);
  return [
    solve_quartic_monotonic(a, b, c, d, e, 0, crit[0]),
    solve_quartic_monotonic(a, b, c, d, e, crit[0], crit[1]),
    solve_quartic_monotonic(a, b, c, d, e, crit[1], crit[2]),
    solve_quartic_monotonic(a, b, c, d, e, crit[2], 1),
  ];
}

function solve_quintic_monotonic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  t1: number,
  t2: number
): number {
  if (t1 == t2) {
    return -1;
  }
  const f1 = quintic(a, b, c, d, e, f, t1);
  const f2 = quintic(a, b, c, d, e, f, t2);
  if (sign(f1) * sign(f2) > 0) {
    return -1;
  }
  let l = t1;
  let r = t2;
  let t = (l + r) / 2;
  for (let i = 0; i < max_iter; i++) {
    let ft = quintic(a, b, c, d, e, f, t);
    if (is_close(ft, 0)) {
      break;
    }
    t -= ft / quartic(5 * a, 4 * b, 3 * c, 2 * d, e, t);
    if (t < l || t > r) {
      t = (l + r) / 2;
      const ft = quintic(a, b, c, d, e, f, t);
      if (sign(ft) == sign(f1)) {
        l = t;
      } else {
        r = t;
      }
    }
  }
  return clamp(t, t1, t2);
}

function solve_quintic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
): number[] {
  let crit = solve_quartic(5 * a, 4 * b, 3 * c, 2 * d, e);
  monotonize_4(crit);
  return [
    solve_quintic_monotonic(a, b, c, d, e, f, 0, crit[0]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[0], crit[1]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[1], crit[2]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[2], crit[3]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[3], 1),
  ];
}

function count_monotonic(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  t1: number,
  t2: number
): number {
  const t = solve_cubic_monotonic(e, f, g, h, t1, t2);
  return t != -1 && cubic(a, b, c, d, t) < 0 ? 1 : 0;
}

function count_crossings(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number
): number {
  const crit = solve_quadratic(3 * e, 2 * f, g);
  return (
    count_monotonic(a, b, c, d, e, f, g, h, 0, crit[0]) +
    count_monotonic(a, b, c, d, e, f, g, h, crit[0], crit[1]) +
    count_monotonic(a, b, c, d, e, f, g, h, crit[1], 1)
  );
}

function minimize(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number
): number {
  let crit = solve_quintic(6 * a, 5 * b, 4 * c, 3 * d, 2 * e, f);
  let res: number = sextic(a, b, c, d, e, f, g, 1);
  for (let i = 0; i < 5; i++) {
    if (crit[i] >= 0) {
      res = min(res, sextic(a, b, c, d, e, f, g, crit[i]));
    }
  }
  return res;
}

function over(c1: number[], c2: number[]): number[] {
  const a = c1[3] + (1 - c1[3]) * c2[3];
  if (a == 0) {
    return [0, 0, 0, 0];
  }
  return [
    (c1[0] * c1[3] + c2[0] * (1 - c1[3]) * c2[3]) / a,
    (c1[1] * c1[3] + c2[1] * (1 - c1[3]) * c2[3]) / a,
    (c1[2] * c1[3] + c2[2] * (1 - c1[3]) * c2[3]) / a,
    a,
  ];
}

export function debugRender(x: number, y: number, buf: number[]): number[] {
  let color = [0, 0, 0, 0];

  for (let i = 0; i < buf.length; ) {
    const fill_color = [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]];
    const stroke_color = [buf[i + 4], buf[i + 5], buf[i + 6], buf[i + 7]];
    const stroke_width = buf[i + 8];
    const n = buf[i + 9];
    i += 10;

    let crossings: number = 0;
    let dist: number = 1e10;

    for (let j = 0; j < n; j++) {
      const offset = i + 8 * j;
      const a = buf[offset];
      const b = buf[offset + 1];
      const c = buf[offset + 2];
      const d = buf[offset + 3] - x;
      const e = buf[offset + 4];
      const f = buf[offset + 5];
      const g = buf[offset + 6];
      const h = buf[offset + 7] - y;
      crossings += count_crossings(a, b, c, d, e, f, g, h);
      dist = min(
        dist,
        sqrt(
          minimize(
            a * a + e * e,
            2 * a * b + 2 * e * f,
            2 * a * c + b * b + 2 * e * g + f * f,
            2 * a * d + 2 * b * c + 2 * e * h + 2 * f * g,
            2 * b * d + c * c + 2 * f * h + g * g,
            2 * c * d + 2 * g * h,
            d * d + h * h
          )
        )
      );
    }

    const fill_dist = crossings % 2 == 1 ? -dist : dist;
    const fill_alpha = 0.5 - clamp(fill_dist, -0.5, 0.5);
    fill_color[3] *= fill_alpha;
    color = over(fill_color, color);

    const d1 = min(dist - stroke_width / 2, 0.5);
    const d2 = min(dist + stroke_width / 2, 0.5);
    const stroke_alpha = d2 - d1;
    stroke_color[3] *= stroke_alpha;
    color = over(stroke_color, color);

    i += 8 * n;
  }
  return color;
}
