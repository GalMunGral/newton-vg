import { evaluate, solve } from "./solver";
import { parseColor, parseSvgPath, toPoly } from "./svg";

interface ClosedCurve {
  segments: number[][][];
  fill: number[];
}

function isInside(curve: ClosedCurve, x: number, y: number): boolean {
  let count = 0;
  for (let segment of curve.segments) {
    const X = segment[0];
    const Y = [...segment[1]];
    Y[Y.length - 1] -= y;
    count += solve(Y)
      .map((t) => {
        return evaluate(X, t);
      })
      .filter((_x) => _x < x).length;
  }
  return count % 2 == 1;
}

function getColor(scene: ClosedCurve[], x: number, y: number): number[] {
  let color = [0, 0, 0, 0];
  for (let curve of scene) {
    if (isInside(curve, x, y)) {
      color = curve.fill;
    }
  }
  return color;
}

async function main() {
  const tigerSvg = new DOMParser().parseFromString(
    await (
      await fetch(
        "https://upload.wikimedia.org/wikipedia/commons/f/fd/Ghostscript_Tiger.svg"
      )
    ).text(),
    "text/xml"
  );
  const scene: ClosedCurve[] = [];
  tigerSvg.children[0].children[0].querySelectorAll("g").forEach((g) => {
    const pathEl = g.children[0];
    // if (pathEl.id !== "path168") return;
    const segments = toPoly(pathEl.getAttribute("d")!);

    const fill = g.getAttribute("fill");
    if (fill) {
      const color = parseColor(fill).map((x) => Math.round(x * 255)) as [
        number,
        number,
        number,
        number
      ];
      scene.push({
        segments,
        fill: color,
      });
    }
  });

  const size = 800;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  document.body.append(canvas);
  const ctx = canvas.getContext("2d")!;
  const imageData = new ImageData(size, size);

  for (let y = 0; y < size; ++y) {
    console.log("y", y);
    for (let x = 0; x < size; ++x) {
      const [r, g, b, a] = getColor(scene, x, y + Math.random() * 1e-4);
      imageData.data[(y * size + x) * 4] = r;
      imageData.data[(y * size + x) * 4 + 1] = g;
      imageData.data[(y * size + x) * 4 + 2] = b;
      imageData.data[(y * size + x) * 4 + 3] = a;
    }
    ctx.putImageData(imageData, 0, 0);
    await new Promise((resolve) => {
      setTimeout(resolve);
    });
  }
}

main();
