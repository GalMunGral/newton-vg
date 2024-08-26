import { encode, parseViewBox } from "./encoder";
import shaderSrc from "./newton.wgsl";

export type TypedArray = Float32Array | Uint16Array;
export type TypedArrayConstructor = new (a: ArrayBuffer) => TypedArray;

export function createBuffer(
  device: GPUDevice,
  data: TypedArray,
  usage: GPUTextureUsageFlags
): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  const dst = new (data.constructor as TypedArrayConstructor)(
    buffer.getMappedRange()
  );
  dst.set(data);
  buffer.unmap();
  return buffer;
}

async function main() {
  const doc = new DOMParser().parseFromString(
    await (
      await fetch(
        "https://upload.wikimedia.org/wikipedia/commons/f/fd/Ghostscript_Tiger.svg"
      )
    ).text(),
    "text/xml"
  );
  const svg = doc.firstElementChild as SVGElement;

  const [, , width, height] = parseViewBox(svg);
  const canvas = document.querySelector("canvas#main") as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width / devicePixelRatio + "px";
  canvas.style.height = height / devicePixelRatio + "px";

  const sceneBuffer: number[] = [];
  encode(svg, sceneBuffer);

  const context: GPUCanvasContext = canvas.getContext("webgpu")!;

  const adapter = (await navigator.gpu.requestAdapter())!;
  const device = (await adapter.requestDevice())!;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  const sampleCount = 1;

  const renderTarget = device.createTexture({
    size: [canvas.width, canvas.height],
    format: presentationFormat,
    sampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    sampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const shaderModule = device.createShaderModule({ code: shaderSrc });
  const pipeline = device.createRenderPipeline({
    label: "newton-vg",
    layout: "auto",
    vertex: {
      module: shaderModule,
      buffers: [
        {
          arrayStride: 2 * 4,
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
    multisample: {
      count: sampleCount,
    },
  });

  const positions = new Float32Array([-1, 1, 1, 1, 1, -1, -1, -1]);
  const positionBuffer = createBuffer(device, positions, GPUBufferUsage.VERTEX);

  const indices = new Uint16Array([0, 3, 1, 2, 1, 3]);
  const indicesBuffer = createBuffer(device, indices, GPUBufferUsage.INDEX);

  function render() {
    const storageValues = new Float32Array(sceneBuffer);
    const storageBuffer = device.createBuffer({
      size: Math.max(48, storageValues.byteLength),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: storageBuffer } }],
    });

    device.queue.writeBuffer(storageBuffer, 0, storageValues);

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          // view: renderTarget.createView(),
          // resolveTarget: context.getCurrentTexture().createView(),
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setIndexBuffer(indicesBuffer, "uint16");
    passEncoder.drawIndexed(indices.length);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
  requestAnimationFrame(render);

  setTimeout(() => debug(sceneBuffer, canvas), 1000);
}

main();

async function debug(sceneBuffer: number[], canvas: HTMLCanvasElement) {
  const progress = document.querySelector("#progress")!;
  const debugCanvas = document.querySelector(
    "canvas#debug"
  ) as HTMLCanvasElement;
  const scale = 1;
  const width = canvas.width / scale;
  const height = canvas.height / scale;
  const N = width * height;

  debugCanvas.width = width;
  debugCanvas.height = height;
  debugCanvas.style.width = canvas.width / devicePixelRatio + "px";
  debugCanvas.style.height = canvas.height / devicePixelRatio + "px";
  const debugContext = debugCanvas.getContext("2d");
  const imageData = new ImageData(debugCanvas.width, debugCanvas.height);

  let completed = 0;
  const start = Date.now();
  const worker = new Worker("./worker.js");
  worker.onmessage = (e) => {
    const [x, y, r, g, b, a] = e.data as number[];
    imageData.data[(y * width + x) * 4] = r * 255;
    imageData.data[(y * width + x) * 4 + 1] = g * 255;
    imageData.data[(y * width + x) * 4 + 2] = b * 255;
    imageData.data[(y * width + x) * 4 + 3] = a * 255;
    debugContext?.putImageData(imageData, 0, 0);
    ++completed;
    const timePerPixel = (Date.now() - start) / completed;
    const timeRemaining = timePerPixel * (N - completed);

    const minutesStr = Math.floor(timeRemaining / 1000 / 60);
    const secondsStr = ((timeRemaining / 1000) % 60)
      .toFixed(2)
      .padStart(5, "0");
    const completedStr = String(completed).padStart(String(N).length, "\xa0");
    progress.textContent = `${minutesStr}m${secondsStr}s remaining ${completedStr}/${N} completed`;
  };
  worker.postMessage({ width, height, scale, sceneBuffer });
}
