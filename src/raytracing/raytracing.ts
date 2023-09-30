import * as twgl from 'externals/twgl';

import accumF from 'shaders/accum.frag';
import plainF from 'shaders/plain.frag';
import traceF from 'shaders/trace.frag';
import vertexSource from 'shaders/vert.vert';

import { TriData, octahedron } from './geometry';
import { vec4 } from './structs';

const bounceLimit = 3, raysPerPixel = 40, maxIteration = 30;

function createTextureArrayFromTris(data: TriData) {
    const { tris, verts, colors } = data;
    const v0: vec4[] = [[0, 0, 0, 0]];
    const v1: vec4[] = [[0, 0, 0, 0]];
    const v2: vec4[] = [[0, 0, 0, 0]];
    const color: vec4[] = [[0, 0, 0, 0]];
    for (const tri of tris) {
        v0.push([...verts[tri.vert[0] - 1], 0]);
        v1.push([...verts[tri.vert[1] - 1], 0]);
        v2.push([...verts[tri.vert[2] - 1], 0]);
        color.push([...colors[tri.color - 1], tri.emissionStrength]);
    }
    const flattened = [v0, v1, v2, color].flat(2);
    return new Float32Array(flattened);
}

export function raytrace(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    updateStatusBar: (s: string) => void
) {
    const gl = canvas.getContext("webgl2");

    const octaTexture = createTextureArrayFromTris(octahedron);

    const traceProgram = twgl.createProgramInfo(gl, [vertexSource, traceF]);
    const plainProgram = twgl.createProgramInfo(gl, [vertexSource, plainF]);
    const accumProgram = twgl.createProgramInfo(gl, [vertexSource, accumF]);

    const tracingFrame = twgl.createFramebufferInfo(gl);
    const previousFrame = twgl.createFramebufferInfo(gl);
    const currentFrame = twgl.createFramebufferInfo(gl);

    const triData = twgl.createTexture(gl, {
        mag: gl.NEAREST, min: gl.NEAREST,
        height: 4,
        format: gl.RGBA, internalFormat: gl.RGBA32F,
        src: octaTexture
    });

    // Attributes and pre-set uniforms
    const geometry = twgl.createBufferInfoFromArrays(gl, {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]
    });
    gl.useProgram(plainProgram.program);
    twgl.setBuffersAndAttributes(gl, plainProgram, geometry);

    gl.useProgram(accumProgram.program);
    twgl.setBuffersAndAttributes(gl, accumProgram, geometry);

    gl.useProgram(traceProgram.program);
    twgl.setBuffersAndAttributes(gl, traceProgram, geometry);
    twgl.setUniforms(traceProgram, {
        raySourceDistance: 10, screenMultiplier: 2,
        triAmount: 8,
        screenSize: [canvas.width, canvas.height],
        bounceLimit, raysPerPixel
    });

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    function draw() {
        twgl.drawBufferInfo(gl, geometry, gl.TRIANGLE_STRIP);
    }
    function useProgram(programInfo: twgl.ProgramInfo) {
        gl.useProgram(programInfo.program);
    }
    function selectFrame(frame: twgl.FramebufferInfo) {
        twgl.bindFramebufferInfo(gl, frame);
    }
    const startTime = Date.now();
    let iteration = 1;
    const render = () => {
        // Render current frame to previous frame.
        selectFrame(previousFrame);
        useProgram(plainProgram);
        twgl.setUniforms(plainProgram, {
            tex: currentFrame.attachments[0]
        });
        draw();

        // Render ray tracing.
        selectFrame(tracingFrame);
        useProgram(traceProgram);
        twgl.setUniforms(traceProgram, {
            triData,
            seed: Math.random() * 1000
        });
        draw();

        // Accumulate with previous frame.
        selectFrame(currentFrame);
        useProgram(accumProgram);
        twgl.setUniforms(accumProgram, {
            currentFrame: tracingFrame.attachments[0],
            previousFrame: previousFrame.attachments[0],
            iteration
        });
        draw();

        // Render to canvas
        selectFrame(null);
        useProgram(plainProgram);
        twgl.setUniforms(plainProgram, {
            tex: currentFrame.attachments[0]
        });
        draw();

        const currentTime = Date.now();
        const elapsedMiliseconds = currentTime - startTime;
        const fps = iteration * 1000 / elapsedMiliseconds;
        updateStatusBar(
            `Rendering pass ${iteration}/${maxIteration}... (${fps.toFixed(2)}fps)`
        );

        iteration++;
        if (iteration < maxIteration)
            requestAnimationFrame(render);
        else
            updateStatusBar(`Done! (total time: ${(elapsedMiliseconds/1000).toFixed(2)}s)`);
    };

    render();
}