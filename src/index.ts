import { encode, parseViewBox } from "./svg";
import shaderSrc from "./newton.wgsl";
import { debugRender } from "./debug";

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

  const progress = document.querySelector("span#progress") as HTMLSpanElement;
  const debugCanvas = document.querySelector(
    "canvas#debug"
  ) as HTMLCanvasElement;
  const scale = 1;
  debugCanvas.width = width / scale;
  debugCanvas.height = height / scale;
  debugCanvas.style.width = width / devicePixelRatio + "px";
  debugCanvas.style.height = height / devicePixelRatio + "px";
  const debugContext = debugCanvas.getContext("2d");
  const imageData = new ImageData(debugCanvas.width, debugCanvas.height);
  for (let y = 0; y < debugCanvas.height; ++y) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    progress.textContent = `Rendering... (y = ${y}/${debugCanvas.height})`;
    for (let x = 0; x < debugCanvas.width; ++x) {
      const [r, g, b, a] = debugRender(
        x * scale + Math.random() * 0.1,
        y * scale + Math.random() * 0.1,
        sceneBuffer
      );
      imageData.data[(y * debugCanvas.width + x) * 4] = r * 255;
      imageData.data[(y * debugCanvas.width + x) * 4 + 1] = g * 255;
      imageData.data[(y * debugCanvas.width + x) * 4 + 2] = b * 255;
      imageData.data[(y * debugCanvas.width + x) * 4 + 3] = a * 255;
    }
    debugContext?.putImageData(imageData, 0, 0);
  }
}

main();
