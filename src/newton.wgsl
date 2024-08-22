const eps = 1e-9;

fn quadratic(a: f32, b: f32, c: f32, t: f32) -> f32 {
  return ((a * t) + b) * t + c;
}

fn solve_quadratic(a: f32, b: f32, c: f32) -> array<f32,2> {
  let d = b * b - 4 * a * c;
  if d < 0 {
    return array(0, 0);
  }
  var res = array(
    clamp((-b - sqrt(d)) / (2 * a), 0, 1),
    clamp((-b + sqrt(d)) / (2 * a), 0, 1),
  );
  if a < 0 {
    let tmp = res[0];
    res[0] = res[1];
    res[1] = tmp;
  }
  return res;
}

fn cubic(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
  return (((a * t) + b) * t + c) * t + d;
}

fn solve_cubic_monotonic(a: f32, b: f32, c: f32, d: f32, t1: f32, t2: f32) -> f32 {
  if abs(t2 - t1) < eps {
    return -1;
  }
  let f1 = cubic(a, b, c, d, t1);
  let f2 = cubic(a, b, c, d, t2);
  if abs(f1) < eps {
    return t1;
  }
  if abs(f2) < eps {
    return t2;
  }
  if (f1 > eps && f2 > eps) || (f1 < -eps && f2 < -eps) {
    return -1;
  }
  // Newton's method
  var t = (t1 + t2) / 2;
  var i: u32 = 0;
  loop {
    var f = cubic(a, b, c, d, t);
    if abs(f) < eps { break; }
    t -= f / quadratic(3 * a, 2 * b, c, t);
    i++;
    if i == 100 { break; }
  }
  return clamp(t, t1, t2);
}

fn count_monotonic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32, h: f32, t1: f32, t2: f32) -> i32 {
  let t = solve_cubic_monotonic(e, f, g, h, t1, t2);
  return select(0, 1, t >= t1 - eps && t <= t2 + eps && cubic(a, b, c, d, t) < 0);
}

fn count_crossings(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32, h: f32) -> i32 {
  let I = solve_quadratic(3 * e, 2 * f, g);
  return (
    count_monotonic(a, b, c, d, e, f, g, h, 0, I[0]) +
    count_monotonic(a, b, c, d, e, f, g, h, I[0], I[1]) +
    count_monotonic(a, b, c, d, e, f, g, h, I[1], 1)
  );
}

fn solve_cubic(a: f32, b: f32, c: f32, d: f32) -> array<f32, 3> {
  let I = solve_quadratic(3 * a, 2 * b, c);
  return array(
    clamp(solve_cubic_monotonic(a, b, c, d, 0, I[0]), 0, I[0]),
    clamp(solve_cubic_monotonic(a, b, c, d, I[0], I[1]), I[0], I[1]),
    clamp(solve_cubic_monotonic(a, b, c, d, I[1], 1), I[1], 1)
  );
}

fn quartic(a: f32, b: f32, c: f32, d: f32, e: f32, t: f32) -> f32 {
  return ((((a * t) + b) * t + c) * t + d) * t + e;
}

fn solve_quartic_monotonic(a: f32, b: f32, c: f32, d: f32, e: f32, t1: f32, t2: f32) -> f32 {
  if abs(t2 - t1) < eps {
    return -1;
  }
  let f1 = quartic(a, b, c, d, e, t1);
  let f2 = quartic(a, b, c, d, e, t2);
  if abs(f1) < eps {
    return t1;
  }
  if abs(f2) < eps {
    return t2;
  }
  if (f1 > eps && f2 > eps) || (f1 < -eps && f2 < -eps) {
    return -1;
  }
  // Newton's method
  var t = (t1 + t2) / 2;
  var i: u32 = 0;
  loop {
    var f = quartic(a, b, c, d, e, t);
    if abs(f) < eps { break; }
    t -= f / cubic(4 * a, 3 * b, 2 * c, d, t);
    i++;
    if i == 100 { break; }
  }
  return clamp(t, t1, t2);
}

fn solve_quartic(a: f32, b: f32, c: f32, d: f32, e: f32) -> array<f32, 4> {
  let I = solve_cubic(4 * a, 3 * b, 2 * c, d);
  return array(
    clamp(solve_quartic_monotonic(a, b, c, d, e, 0, I[0]), 0, I[0]),
    clamp(solve_quartic_monotonic(a, b, c, d, e, I[0], I[1]), I[0], I[1]),
    clamp(solve_quartic_monotonic(a, b, c, d, e, I[1], I[2]), I[1], I[2]),
    clamp(solve_quartic_monotonic(a, b, c, d, e, I[2], 1), I[2], 1),
  );
}

fn quintic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, t: f32) -> f32 {
  return (((((a * t) + b) * t + c) * t + d) * t + e) * t + f;
}

fn solve_quintic_monotonic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, t1: f32, t2: f32) -> f32 {
  if abs(t2 - t1) < eps {
    return -1;
  }
  let f1 = quintic(a, b, c, d, e, f, t1);
  let f2 = quintic(a, b, c, d, e, f, t2);
  if abs(f1) < eps {
    return t1;
  }
  if abs(f2) < eps {
    return t2;
  }
  if (f1 > eps && f2 > eps) || (f1 < -eps && f2 < -eps) {
    return -1;
  }
  // Newton's method
  var t = (t1 + t2) / 2;
  var i: u32 = 0;
  loop {
    var f = quintic(a, b, c, d, e, f, t);
    if abs(f) < eps { break; }
    t -= f / quartic(5 * a, 4 * b, 3 * c, 2 * d, e, t);
    i++;
    if i == 100 { break; }
  }
  return clamp(t, t1, t2);
}

fn solve_quintic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32) -> array<f32, 5> {
  let I = solve_quartic(5 * a, 4 * b, 3 * c, 2 * d, e);
  return array(
    solve_quintic_monotonic(a, b, c, d, e, f, 0, I[0]),
    solve_quintic_monotonic(a, b, c, d, e, f, I[0], I[1]),
    solve_quintic_monotonic(a, b, c, d, e, f, I[1], I[2]),
    solve_quintic_monotonic(a, b, c, d, e, f, I[2], I[3]),
    solve_quintic_monotonic(a, b, c, d, e, f, I[3], 1),
  );
}

fn sextic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32, t: f32) -> f32 {
  return ((((((a * t) + b) * t + c) * t + d) * t + e) * t + f) * t + g;
}

fn minimize(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, g: f32) -> f32 {
  let I = solve_quintic(6 * a, 5 * b, 4 * c, 3 * d, 2 * e, f);
  var res: f32 = 1e9;
  for (var i = 0; i < 5; i++) {
    if I[i] >= 0 && I[i] <= 1 {
      res = min(res, sextic(a, b, c, d, e, f, g, I[i]));
    }
  }
  return res;
}

struct VSInput {
  @location(0) position: vec4f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vsMain(in: VSInput) -> VSOutput {
  var out: VSOutput;
  out.position = in.position;
  return out;
}

@group(0) @binding(0) var<storage> curve: array<vec4f>;

@fragment
fn fsMain(v: VSOutput) -> @location(0) vec4f {
  var color = vec4f(0, 0, 0, 0);
  var i: u32 = 0;
  while i < arrayLength(&curve) {
    let fill = curve[i];
    i++;

    let stroke = curve[i];
    i++;

    let n = u32(curve[i].x);
    let half_width = curve[i].y;
    i++;

    if fill.a > 0 {
      var crossings: i32 = 0;
      for (var j: u32 = 0; j < n; j++) {
        let x = curve[i + 2 * j];
        let y = curve[i + 2 * j + 1];
        crossings += count_crossings(
          x.x, x.y, x.z, x.w - v.position.x,
          y.x, y.y, y.z, y.w - (v.position.y + 1e-4)
        );
      }
      if crossings % 2 == 1 {
        color = fill;
      }
    }
    if stroke.a > 0 && half_width > 0 {
      for (var j: u32 = 0; j < n; j++) {
        var x = curve[i + 2 * j];
        x.w -= v.position.x;
        var y = curve[i + 2 * j + 1] ;
        y.w -= v.position.y + 1e-4;
        let d = minimize(
          x.x * x.x + y.x * y.x,
          2 * x.x * x.y + 2 * y.x * y.y,
          2 * x.x * x.z + x.y * x.y + 2 * y.x * y.z + y.y * y.y,
          2 * x.x * x.w + 2 * x.y * x.z + 2 * y.x * y.w + 2 * y.y * y.z,
          2 * x.y * x.w + x.z * x.z + 2 * y.y * y.w + y.z * y.z,
          2 * x.z * x.w + 2 * y.z * y.w,
          x.w * x.w + y.w * y.w 
        );
        if d >= -eps && d <= half_width + eps {
          color = stroke;
        }
      }
    }
    i += 2 * n;
  }
  return color;
}