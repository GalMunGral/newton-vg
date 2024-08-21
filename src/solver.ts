export const epsilon = 1e-9;

const { abs, sqrt } = Math;

export function solve1(a: number, b: number): number[] {
  if (abs(a) < epsilon) return [];
  return [-b / a];
}

export function solve2(a: number, b: number, c: number): number[] {
  const D = b ** 2 - 4 * a * c;
  if (D < 0) return [];
  if (D == 0) return [-b / (2 * a)];
  return [(-b + sqrt(D)) / (2 * a), (-b - sqrt(D)) / (2 * a)];
}

export function evaluate(P: number[], t: number) {
  let res = P[0];
  for (let i = 1; i < P.length; ++i) {
    res = res * t + P[i];
  }
  return res;
}

function D(P: number[]): number[] {
  const n = P.length;
  const res = Array<number>(n - 1);
  for (let i = 0; i < n - 1; ++i) {
    res[i] = P[i] * (n - 1 - i);
  }
  return res;
}

function newton(P: number[], t1: number, t2: number): number[] {
  const f1 = evaluate(P, t1);
  const f2 = evaluate(P, t2);
  if (abs(f1) < epsilon) return [t1];
  if (abs(f2) < epsilon) return [t2];
  if ((f1 > epsilon && f2 > epsilon) || (f1 < -epsilon && f2 < -epsilon))
    return [];
  let t = (t1 + t2) / 2;
  let f = 0;
  while (abs((f = evaluate(P, t))) > epsilon) {
    t -= f / evaluate(D(P), t);
  }
  return [t];
}

export function solve3(
  a: number,
  b: number,
  c: number,
  d: number
): Array<number> {
  const C = solve2(3 * a, 2 * b, c)
    .filter((c) => c > 0 && c < 1)
    .sort((a, b) => a - b);
  const M = [0, ...C, 1];
  const res: Array<number> = [];
  for (let i = 0; i < M.length - 1; ++i) {
    res.push(...newton([a, b, c, d], M[i], M[i + 1]));
  }
  return res;
}

export function solve(P: number[]) {
  switch (P.length) {
    case 2:
      return solve1(P[0], P[1]).filter((t) => t >= -epsilon && t < 1 - epsilon);
    case 3:
      return solve2(P[0], P[1], P[2]).filter(
        (t) => t >= -epsilon && t < 1 - epsilon
      );
    case 4:
      return solve3(P[0], P[1], P[2], P[3]);
    default:
      return [];
  }
}
