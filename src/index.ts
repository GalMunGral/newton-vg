import { parseColor, parseSvgPath, toPoly } from "./svg";
import shaderSrc from "./render.wgsl";
import { createBuffer } from "./utils";
import tiger from "./Ghostscript_Tiger.svg";

async function main() {
  const tigerSvg = new DOMParser().parseFromString(tiger, "text/xml");
  const scene: number[] = [];
  tigerSvg.children[0].children[0].querySelectorAll("g").forEach((g) => {
    const pathEl = g.children[0];
    // if (pathEl.id !== "path152") return;
    const segments = toPoly(pathEl.getAttribute("d")!);

    const fill = g.getAttribute("fill");
    if (fill) {
      const color = parseColor(fill);
      scene.push(...color, segments.length / 8, 0, 0, 0, ...segments);
    }
  });

  const size = 900;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  document.body.append(canvas);

  const context: GPUCanvasContext = canvas.getContext("webgpu")!;

  const adapter = (await navigator.gpu.requestAdapter())!;
  const device = (await adapter.requestDevice())!;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  const sampleCount = 4;

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
    label: "hillshade",
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
    const storageValues = new Float32Array(scene);
    console.log(scene, storageValues);

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
          view: renderTarget.createView(),
          resolveTarget: context.getCurrentTexture().createView(),
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

    storageBuffer.destroy();

    // requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();
