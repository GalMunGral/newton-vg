const { cos, sin, acos, PI, sqrt } = Math;

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

export function parseSvgPath(d: string): Array<Command> {
  let i = 0;
  let cx: number = 0,
    cy: number = 0,
    x: number = 0,
    y: number = 0;

  let isPrevCubic = false;

  const res = Array<Command>();

  space();
  while (i < d.length) {
    let node = parseCommands();

    if (!node.length) throw [res, d.slice(i), i];
    res.push(...node);
    space();
  }

  function command() {
    let res = d[i++];
    separator();
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

  function space() {
    if (i >= d.length) return false;
    while (i < d.length && /\s/.test(d[i])) ++i;
    return true;
  }

  function separator(): boolean {
    space();
    if (i < d.length - 1 && /[\s,]/.test(d[i]) && /[^\s,]/.test(d[i + 1])) {
      ++i;
    }
    space();
    return true;
  }

  function number(): number {
    const reg = /[+-]?((0|[1-9]\d*)?\.\d*[1-9]|(0|[1-9]\d*))/y;
    reg.lastIndex = i;
    const match = reg.exec(d);
    if (!match)
      throw {
        error: "failed to parse number",
        location: d.slice(i),
        res,
      };
    i += match[0].length;
    separator();
    return Number(match[0]);
  }

  function moveTo(): Array<Command> {
    const res: Array<Command> = [];
    let first = true;
    do {
      x = number();
      y = number();
      if (first) {
        first = false;
        res.push({ type: "MOVE_TO", x, y });
      } else {
        res.push({ type: "LINE_TO", x, y });
      }
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function moveToDelta(): Array<Command> {
    const res: Array<Command> = [];
    let first = true;
    do {
      x += number();
      y += number();
      if (first) {
        first = false;
        res.push({ type: "MOVE_TO", x, y });
      } else {
        res.push({ type: "LINE_TO", x, y });
      }
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function lineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x = number();
      y = number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function lineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x += number();
      y += number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function hLineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x = number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function hLineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x += number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function vLineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      y = number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function vLineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      y += number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    return res;
  }

  function cubicBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = number();
      let cy1 = number();
      let cx2 = (cx = number());
      let cy2 = (cy = number());
      x = number();
      y = number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = true;
    return res;
  }

  function cubicBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = x + number();
      let cy1 = y + number();
      let cx2 = (cx = x + number());
      let cy2 = (cy = y + number());
      x += number();
      y += number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = true;
    return res;
  }

  function smoothCubicBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = isPrevCubic ? 2 * x - cx : x;
      let cy1 = isPrevCubic ? 2 * y - cy : y;
      let cx2 = (cx = number());
      let cy2 = (cy = number());
      x = number();
      y = number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = true;
    return res;
  }

  function smoothCubicBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = isPrevCubic ? 2 * x - cx : x;
      let cy1 = isPrevCubic ? 2 * y - cy : y;
      let cx2 = (cx = x + number());
      let cy2 = (cy = y + number());
      x += number();
      y += number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
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

export function toPoly(d: string): number[][][] {
  const path = parseSvgPath(d);

  const res: number[][][] = [];

  let start: number[] = [0, 0];
  let q: number[] = [0, 0];

  function transform(x: number, y: number) {
    return [1.5 * (x + 200), 1.5 * (y + 200)];
  }

  for (const cmd of path) {
    switch (cmd.type) {
      case "MOVE_TO": {
        start = q = transform(cmd.x, cmd.y);
        break;
      }
      case "LINE_TO": {
        const p = transform(cmd.x, cmd.y);
        res.push([
          [p[0] - q[0], q[0]],
          [p[1] - q[1], q[1]],
        ]);
        q = p;
        break;
      }
      case "CUBIC_BEZIER": {
        const c1 = transform(cmd.cx1, cmd.cy1);
        const c2 = transform(cmd.cx2, cmd.cy2);
        const p = transform(cmd.x, cmd.y);
        res.push([
          [
            -q[0] + 3 * c1[0] - 3 * c2[0] + p[0],
            3 * q[0] - 6 * c1[0] + 3 * c2[0],
            -3 * q[0] + 3 * c1[0],
            q[0],
          ],
          [
            -q[1] + 3 * c1[1] - 3 * c2[1] + p[1],
            3 * q[1] - 6 * c1[1] + 3 * c2[1],
            -3 * q[1] + 3 * c1[1],
            q[1],
          ],
        ]);
        q = p;
        break;
      }
      case "CLOSE_PATH": {
        res.push([
          [start[0] - q[0], q[0]],
          [start[1] - q[1], q[1]],
        ]);
        break;
      }
    }
  }

  return res;
}
