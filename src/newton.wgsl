const atol: f32 = 1e-9;
const rtol: f32 = 1e-5;
const max_iter: u32 = 5;
const pi = radians(180);

fn swap(a_ptr: ptr<function, f32>, b_ptr: ptr<function, f32>) {
  let tmp = *a_ptr;
  *a_ptr = *b_ptr;
  *b_ptr = tmp;
}

fn is_close(a: f32, b: f32) -> bool {
  return abs(a - b) <= atol + rtol * abs(b);
}

fn quadratic(a: f32, b: f32, c: f32, t: f32) -> f32 {
  return ((a * t) + b) * t + c;
}

fn cubic(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
  return (((a * t) + b) * t + c) * t + d;
}

fn quartic(a: f32, b: f32, c: f32, d: f32, e: f32, t: f32) -> f32 {
  return ((((a * t) + b) * t + c) * t + d) * t + e;
}

fn quintic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, t: f32) -> f32 {
  return (((((a * t) + b) * t + c) * t + d) * t + e) * t + f;
}

fn sextic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32, t: f32) -> f32 {
  return ((((((a * t) + b) * t + c) * t + d) * t + e) * t + f) * t + g;
}

fn monotonize_3(arr: ptr<function, array<f32, 3>>) {
  var prev = 0f;
  for (var i = 0; i < 3; i++) {
    if arr[i] > prev { prev = arr[i]; }
    else { arr[i] = prev; }
  }
}

fn monotonize_4(arr: ptr<function, array<f32, 4>>) {
  var prev = 0f;
  for (var i = 0; i < 4; i++) {
    if arr[i] > prev { prev = arr[i]; }
    else { arr[i] = prev; }
  }
}

fn solve_quadratic(a: f32, b: f32, c: f32) -> array<f32,2> {
  let d = b * b - 4 * a * c;
  if a == 0 { return array(clamp(-c / b, 0, 1), 1); }
  if d < 0 { return array(0, 0); }
  var t1 = clamp((-b - sqrt(d)) / (2 * a), 0, 1);
  var t2 = clamp((-b + sqrt(d)) / (2 * a), 0, 1);
  if a < 0 { swap(&t1, &t2); }
  return array(t1, t2);
}

fn solve_cubic_monotonic(a: f32, b: f32, c: f32, d: f32, t1: f32, t2: f32) -> f32 {
  if t1 == t2 { return -1; }
  if sign(cubic(a, b, c, d, t1)) * sign(cubic(a, b, c, d, t2)) > 0 {
    return -1;
  }
  var t = (t1 + t2) / 2;
  for (var i = 0u; i < max_iter; i++) {
    var ft = cubic(a, b, c, d, t);
    if is_close(ft, 0) { break; }
    t -= ft / quadratic(3 * a, 2 * b, c, t);
  }
  return clamp(t, t1, t2);
}

fn solve_cubic(a: f32, b: f32, c: f32, d: f32) -> array<f32, 3> {
  var crit = solve_quadratic(3 * a, 2 * b, c);
  return array(
    solve_cubic_monotonic(a, b, c, d, 0, crit[0]),
    solve_cubic_monotonic(a, b, c, d, crit[0], crit[1]),
    solve_cubic_monotonic(a, b, c, d, crit[1], 1)
  );
}

fn solve_quartic_monotonic(a: f32, b: f32, c: f32, d: f32, e: f32, t1: f32, t2: f32) -> f32 {
  if t1 == t2 { return -1; }
  if sign(quartic(a, b, c, d, e, t1)) * sign(quartic(a, b, c, d, e, t2)) > 0 {
    return -1;
  }
  var t = (t1 + t2) / 2;
  for (var i = 0u; i < max_iter; i++) {
    var ft = quartic(a, b, c, d, e, t);
    if is_close(ft, 0) { break; }
    t -= ft / cubic(4 * a, 3 * b, 2 * c, d, t);
  }
  return clamp(t, t1, t2);
}

fn solve_quartic(a: f32, b: f32, c: f32, d: f32, e: f32) -> array<f32, 4> {
  var crit = solve_cubic(4 * a, 3 * b, 2 * c, d);
  monotonize_3(&crit);
  return array(
    solve_quartic_monotonic(a, b, c, d, e, 0, crit[0]),
    solve_quartic_monotonic(a, b, c, d, e, crit[0], crit[1]),
    solve_quartic_monotonic(a, b, c, d, e, crit[1], crit[2]),
    solve_quartic_monotonic(a, b, c, d, e, crit[2], 1)
  );
}

fn solve_quintic_monotonic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, t1: f32, t2: f32) -> f32 {
  if t1 == t2 { return -1; }
  if sign(quintic(a, b, c, d, e, f, t1)) * sign(quintic(a, b, c, d, e, f, t2)) > 0 {
    return -1;
  }
  var t = (t1 + t2) / 2;
  for (var i = 0u; i < max_iter; i++) {
    var ft = quintic(a, b, c, d, e, f, t);
    if is_close(ft, 0) { break; }
    t -= ft / quartic(5 * a, 4 * b, 3 * c, 2 * d, e, t);
  }
  return clamp(t, t1, t2);
}

fn solve_quintic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32) -> array<f32, 5> {
  var crit = solve_quartic(5 * a, 4 * b, 3 * c, 2 * d, e);
  monotonize_4(&crit);
  return array(
    solve_quintic_monotonic(a, b, c, d, e, f, 0, crit[0]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[0], crit[1]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[1], crit[2]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[2], crit[3]),
    solve_quintic_monotonic(a, b, c, d, e, f, crit[3], 1),
  );
}

fn count_monotonic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32, h: f32, t1: f32, t2: f32) -> i32 {
  let t = solve_cubic_monotonic(e, f, g, h, t1, t2);
  return select(0, 1, t != -1 && cubic(a, b, c, d, t) < 0);
}

fn count_crossings(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32, h: f32) -> i32 {
  let crit = solve_quadratic(3 * e, 2 * f, g);
  return (
    count_monotonic(a, b, c, d, e, f, g, h, 0, crit[0]) +
    count_monotonic(a, b, c, d, e, f, g, h, crit[0], crit[1]) +
    count_monotonic(a, b, c, d, e, f, g, h, crit[1], 1)
  );
}

fn minimize(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32) -> f32 {
  var crit = solve_quintic(6 * a, 5 * b, 4 * c, 3 * d, 2 * e, f);
  var res: f32 = sextic(a, b, c, d, e, f, g, 1);
  for (var i = 0; i < 5; i++) {
    if crit[i] >= 0 {
      res = min(res, sextic(a, b, c, d, e, f, g, crit[i]));
    }
  }
  return res;
}

@vertex
fn vsMain(@location(0) position: vec4f) -> @builtin(position) vec4f {
  return position;
}

@group(0) @binding(0) var<storage> buf: array<f32>;

fn over(c1: vec4f, c2: vec4f) -> vec4f {
  let a = c1.a + (1 - c1.a) * c2.a;
  if a == 0 { return vec4f(0, 0, 0, 0); }
  return vec4f((c1.rgb * c1.a + c2.rgb * (1 - c1.a) * c2.a) / a, a);
}

fn coverage(x: f32) -> f32 {
  return x * sqrt(1 - x * x) + asin(x);
}

@fragment
fn fsMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  var color = vec4f(0, 0, 0, 0);
  
  for(var i = 0u; i < arrayLength(&buf);) {
    let fill_color = vec4f(buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
    let stroke_color = vec4f(buf[i + 4], buf[i + 5], buf[i + 6], buf[i + 7]);
    let stroke_width = buf[i + 8];
    let n = u32(buf[i + 9]);
    i += 10;

    var crossings: i32 = 0;
    var dist: f32 = 1e10;

    for (var j = 0u; j < n; j++) {
      let offset = i + 8 * j;
      let a = buf[offset];
      let b = buf[offset + 1];
      let c = buf[offset + 2];
      let d = buf[offset + 3] - pos.x;
      let e = buf[offset + 4];
      let f = buf[offset + 5];
      let g = buf[offset + 6];
      let h = buf[offset + 7] - pos.y;
      crossings += count_crossings(a, b, c, d, e, f, g, h);
      dist = min(dist, sqrt(minimize(
        a * a + e * e,
        2 * a * b + 2 * e * f,
        2 * a * c + b * b + 2 * e * g + f * f,
        2 * a * d + 2 * b * c + 2 * e * h + 2 * f * g,
        2 * b * d + c * c + 2 * f * h + g * g,
        2 * c * d + 2 * g * h,
        d * d + h * h 
      )));
    }

    const r = 1f;

    let sign = select(1f, -1f, crossings % 2 == 1);
    let fill_dist = sign * min(dist, r) / r;
    let fill_alpha = (0.5 * pi - coverage(fill_dist)) / pi;
    color = over(fill_color * vec4f(1, 1, 1, fill_alpha), color);

    let d1 = clamp(dist - stroke_width / 2, -r, r) / r;
    let d2 = clamp(dist + stroke_width / 2, -r, r) / r;
    let stroke_alpha = (coverage(d2) - coverage(d1)) / pi;
    color = over(stroke_color * vec4f(1, 1, 1, stroke_alpha), color);

    i += 8 * n;
  }
  return color;
}