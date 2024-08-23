export type SvgPathCommands = {
  width: number;
  height: number;
  commands: Array<Command>;
};

export type Command =
  | {
      type: "MOVE_TO";
      x: number;
      y: number;
    }
  | {
      type: "LINE_TO";
      x: number;
      y: number;
    }
  | {
      type: "CUBIC_BEZIER";
      cx1: number;
      cy1: number;
      cx2: number;
      cy2: number;
      x: number;
      y: number;
    }
  | {
      type: "CLOSE_PATH";
    };

export type SvgPath = {
  width: number;
  height: number;
  d: string;
};

export type PathConfig = {
  paths: Array<SvgPath>;
};

type InputStream = {
  buf: string;
  i: number;
};

function space(s: InputStream) {
  if (s.i >= s.buf.length) return false;
  while (s.i < s.buf.length && /\s/.test(s.buf[s.i])) ++s.i;
  return true;
}

function separator(s: InputStream): boolean {
  space(s);
  if (
    s.i < s.buf.length - 1 &&
    /[\s,]/.test(s.buf[s.i]) &&
    /[^\s,]/.test(s.buf[s.i + 1])
  ) {
    ++s.i;
  }
  space(s);
  return true;
}

function number(s: InputStream): number {
  const reg = /[+-]?((0|[1-9]\d*)?\.\d*[1-9]|(0|[1-9]\d*))/y;
  reg.lastIndex = s.i;
  const match = reg.exec(s.buf);
  if (!match)
    throw {
      error: "failed to parse number",
      location: s.buf.slice(s.i),
    };
  s.i += match[0].length;
  separator(s);
  return Number(match[0]);
}

function token(s: InputStream, reg: RegExp): void {
  reg.lastIndex = s.i;
  const match = reg.exec(s.buf);
  if (!match)
    throw {
      error: "failed to parse token",
      location: s.buf.slice(s.i),
    };
  s.i += match[0].length;
  space(s);
}

export function parseSvgPath(d: string): Array<Command> {
  let cx: number = 0,
    cy: number = 0,
    x: number = 0,
    y: number = 0;

  let isPrevCubic = false;

  const res = Array<Command>();

  const s: InputStream = {
    buf: d,
    i: 0,
  };

  space(s);
  while (s.i < s.buf.length) {
    let node = parseCommands();
    if (!node.length)
      throw {
        res,
        location: s.buf.slice(s.i),
      };
    res.push(...node);
    space(s);
  }

  function command() {
    let res = s.buf[s.i++];
    separator(s);
    return res;
  }

  function parseCommands(): Array<Command> {
    try {
      switch (command()) {
        case "M":
          return moveTo();
        case "m":
          return moveToDelta();
        case "L":
          return lineTo();
        case "l":
          return lineToDelta();
        case "H":
          return hLineTo();
        case "h":
          return hLineToDelta();
        case "V":
          return vLineTo();
        case "v":
          return vLineToDelta();
        case "C":
          return cubicBezier();
        case "c":
          return cubicBezierDelta();
        case "S":
          return smoothCubicBezier();
        case "s":
          return smoothCubicBezierDelta();
        case "Z":
        case "z":
          return closePath();
      }
    } catch (e) {
      console.log(e);
    }
    return [];
  }

  function moveTo(): Array<Command> {
    const res: Array<Command> = [];
    let first = true;
    do {
      x = number(s);
      y = number(s);
      if (first) {
        first = false;
        res.push({ type: "MOVE_TO", x, y });
      } else {
        res.push({ type: "LINE_TO", x, y });
      }
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function moveToDelta(): Array<Command> {
    const res: Array<Command> = [];
    let first = true;
    do {
      x += number(s);
      y += number(s);
      if (first) {
        first = false;
        res.push({ type: "MOVE_TO", x, y });
      } else {
        res.push({ type: "LINE_TO", x, y });
      }
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function lineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x = number(s);
      y = number(s);
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function lineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x += number(s);
      y += number(s);
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function hLineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x = number(s);
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function hLineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x += number(s);
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function vLineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      y = number(s);
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function vLineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      y += number(s);
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = false;
    return res;
  }

  function cubicBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = number(s);
      let cy1 = number(s);
      let cx2 = (cx = number(s));
      let cy2 = (cy = number(s));
      x = number(s);
      y = number(s);
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = true;
    return res;
  }

  function cubicBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = x + number(s);
      let cy1 = y + number(s);
      let cx2 = (cx = x + number(s));
      let cy2 = (cy = y + number(s));
      x += number(s);
      y += number(s);
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = true;
    return res;
  }

  function smoothCubicBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = isPrevCubic ? 2 * x - cx : x;
      let cy1 = isPrevCubic ? 2 * y - cy : y;
      let cx2 = (cx = number(s));
      let cy2 = (cy = number(s));
      x = number(s);
      y = number(s);
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = true;
    return res;
  }

  function smoothCubicBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = isPrevCubic ? 2 * x - cx : x;
      let cy1 = isPrevCubic ? 2 * y - cy : y;
      let cx2 = (cx = x + number(s));
      let cy2 = (cy = y + number(s));
      x += number(s);
      y += number(s);
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(s.buf[s.i]));
    isPrevCubic = true;
    return res;
  }

  function closePath(): Array<Command> {
    isPrevCubic = false;
    return [{ type: "CLOSE_PATH" }];
  }

  return res;
}

export function parseColor(s: string): [number, number, number, number] {
  if (s === "none") return [0, 0, 0, 0];
  if (s.length == 7) {
    const r = parseInt(s.slice(1, 3), 16) / 255;
    const g = parseInt(s.slice(3, 5), 16) / 255;
    const b = parseInt(s.slice(5, 7), 16) / 255;
    return [r, g, b, 1];
  } else {
    const r = parseInt(s.slice(1, 2), 16) / 15;
    const g = parseInt(s.slice(2, 3), 16) / 15;
    const b = parseInt(s.slice(3, 4), 16) / 15;
    return [r, g, b, 1];
  }
}

function matmul(a: number[][], b: number[][]) {
  const c = Array(3)
    .fill(0)
    .map(() => Array(3).fill(0));
  for (let i = 0; i < 3; ++i) {
    for (let j = 0; j < 3; ++j) {
      for (let k = 0; k < 3; ++k) {
        c[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return c;
}

function apply(m: number[][], x: number, y: number): number[] {
  const u = [x, y, 1];
  const v = Array(3).fill(0);
  for (let i = 0; i < 3; ++i) {
    for (let j = 0; j < 3; ++j) {
      v[i] += m[i][j] * u[j];
    }
  }
  return [v[0] / v[2], v[1] / v[2]];
}

const identity = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

function parseMatrix(t: string): number[][] {
  const s: InputStream = { buf: t, i: 0 };
  token(s, /matrix/);
  token(s, /\(/);
  const a = number(s);
  const b = number(s);
  const c = number(s);
  const d = number(s);
  const e = number(s);
  const f = number(s);
  token(s, /\)/);
  return [
    [a, c, e],
    [b, d, f],
    [0, 0, 1],
  ];
}

export function encode(
  node: SVGElement,
  buffer: number[],
  transform: number[][] = identity,
  fill: number[] = [0, 0, 0, 0],
  stroke: number[] = [0, 0, 0, 0],
  strokeWidth: number = 1
) {
  const f = node.getAttribute("fill");
  if (f) fill = parseColor(f);
  const s = node.getAttribute("stroke");
  if (s) stroke = parseColor(s);
  const sw = node.getAttribute("stroke-width");
  if (sw) strokeWidth = Number(sw);

  switch (node.tagName) {
    case "svg":
    case "g": {
      const t = node.getAttribute("transform");
      if (t) transform = matmul(transform, parseMatrix(t));
      for (let n of node.children) {
        encode(n as SVGElement, buffer, transform, fill, stroke, strokeWidth);
      }
    }
    case "path": {
      const d = node.getAttribute("d");
      if (!d) return;
      const commands = parseSvgPath(d);
      buffer.push(...fill);
      buffer.push(...stroke);
      buffer.push(strokeWidth);
      buffer.push(commands.filter((c) => c.type !== "MOVE_TO").length);
      encodePathCommand(commands, buffer, transform);
    }
  }
}

export function encodePathCommand(
  commands: Command[],
  buffer: number[],
  transform: number[][]
) {
  let start: number[] = [0, 0];
  let q: number[] = [0, 0];

  for (const cmd of commands) {
    switch (cmd.type) {
      case "MOVE_TO": {
        start = q = apply(transform, cmd.x, cmd.y);
        break;
      }
      case "LINE_TO": {
        const p = apply(transform, cmd.x, cmd.y);
        buffer.push(0, 0, p[0] - q[0], q[0], 0, 0, p[1] - q[1], q[1]);
        q = p;
        break;
      }
      case "CUBIC_BEZIER": {
        const c1 = apply(transform, cmd.cx1, cmd.cy1);
        const c2 = apply(transform, cmd.cx2, cmd.cy2);
        const p = apply(transform, cmd.x, cmd.y);
        buffer.push(
          -q[0] + 3 * c1[0] - 3 * c2[0] + p[0],
          3 * q[0] - 6 * c1[0] + 3 * c2[0],
          -3 * q[0] + 3 * c1[0],
          q[0],
          -q[1] + 3 * c1[1] - 3 * c2[1] + p[1],
          3 * q[1] - 6 * c1[1] + 3 * c2[1],
          -3 * q[1] + 3 * c1[1],
          q[1]
        );
        q = p;
        break;
      }
      case "CLOSE_PATH": {
        buffer.push(0, 0, start[0] - q[0], q[0], 0, 0, start[1] - q[1], q[1]);
        break;
      }
      default:
        console.log("NOT IMPLEMENTED", cmd);
    }
  }
}

export function parseViewBox(svg: SVGElement) {
  const v = svg.getAttribute("viewBox");
  if (!v) return [0, 0, 0, 0];
  return v.split(/\s+/).map((n) => Number(n));
}
