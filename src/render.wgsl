const eps = 1e-9;

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

fn linear(p: vec2f, t: f32) -> f32 {
  return p.x * t + p.y;
}

fn quadratic(p: vec3f, t: f32) -> f32 {
  return p.x * t * t + p.y * t + p.z;
}

fn cubic(p: vec4f, t: f32) -> f32 {
  return p.x * t * t * t + p.y * t * t + p.z * t + p.w;
}

fn solve_linear(p: vec2f) -> f32 {
  if abs(p.x) < eps {
    return -1;
  }
  return -p.y / p.x;
}

fn solve_quadratic(p: vec3f) -> vec2f {
  let D = p.y * p.y - 4 * p.x * p.z;
  if D < 0 {
    return vec2f(-1, -1);
  }
  var res = vec2f(
    clamp((-p.y - sqrt(D)) / (2 * p.x), 0, 1),
    clamp((-p.y + sqrt(D)) / (2 * p.x), 0, 1),
  );
  if p.x < 0 {
    res = res.yx;
  }
  return res;
}

fn solve_cubic(p: vec4f, t1: f32, t2: f32) -> f32 {
  if abs(t2 - t1) < eps {
    return -1;
  }
  let f1 = cubic(p, t1);
  let f2 = cubic(p, t2);
  if abs(f1) < eps {
    return t1;
  }
  if abs(f2) < eps {
    return t2;
  }
  if (f1 > eps && f2 > eps) || (f1 < -eps && f2 < -eps) {
    return -1;
  }
  var t = (t1 + t2) / 2;
  var i: u32 = 0;
  loop {
    var f = cubic(p, t);
    if abs(f) < eps { break; }
    t -= f / quadratic(p.xyz * vec3f(3, 2, 1), t);
    i++;
    if i == 100 { break; }
  }
  return clamp(t, t1, t2);
}

fn count_linear(x: vec2f, y: vec2f) -> i32 {
  let t = solve_linear(y);
  return select(0, 1, t >= -eps && t <= 1 + eps && linear(x, t) < 0);
}

fn count_monotonic(x: vec4f, y: vec4f, t1: f32, t2: f32) -> i32 {
  let t = solve_cubic(y, t1, t2);
  return select(0, 1, t >= t1 - eps && t <= t2 + eps && cubic(x, t) < 0);
}

fn count_crossings(x: vec4f, y: vec4f) -> i32 {
  // if x.x == 0 && x.y == 0 && y.x == 0 && y.y == 0 {
  //   return count_linear(x.zw, y.zw);
  // }
  let C = solve_quadratic(y.xyz * vec3f(3, 2, 1));
  return (
    count_monotonic(x, y, 0, C.x) +
    count_monotonic(x, y, C.x, C.y) +
    count_monotonic(x, y, C.y, 1)
  );
}

// struct CubicSegment {
//   x: vec4f,
//   y: vec4f
// };

// struct ClosedCurve {
//   fill: vec4f,
//   segments: array<CubicSegment>
// };

@group(0) @binding(0) var<storage> curve: array<vec4f>;

@fragment
fn fsMain(v: VSOutput) -> @location(0) vec4f {
  var color = vec4f(0);
  var i: u32 = 0;
  while i < arrayLength(&curve) {
    let fill = curve[i];
    i++;
    let n = u32(curve[i].x);
    i++;
    var crossings: i32 = 0;
    for (var j: u32 = 0; j < n; j++) {
      let x = curve[i] - vec4f(0, 0, 0, v.position.x);
      i++;
      let y = curve[i] - vec4f(0, 0, 0, v.position.y + 1e-4);
      i++;
      crossings += count_crossings(x, y);
    }
    if crossings % 2 == 1 {
      color = fill;
    }
  }
  return color;
}