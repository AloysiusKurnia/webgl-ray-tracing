import * as twgl from 'externals/twgl';

import accumF from 'shaders/accum.frag';
import plainF from 'shaders/plain.frag';
import traceF from 'shaders/trace.frag';
import vertexSource from 'shaders/vert.vert';

import { RenderUniformData, generateUniformData } from './structure/data-writer';

const bounceLimit = 3, raysPerPixel = 1, maxIteration = 100;

export function raytrace(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    data: RenderUniformData,
    updateStatusBar: (s: string) => void
) {
    const gl = canvas.getContext("webgl2")!;

    const dataArray = generateUniformData(data);
    console.log(dataArray);

    const traceProgram = twgl.createProgramInfo(gl, [vertexSource, traceF]);
    const plainProgram = twgl.createProgramInfo(gl, [vertexSource, plainF]);
    const accumProgram = twgl.createProgramInfo(gl, [vertexSource, accumF]);

    const tracingFrame = twgl.createFramebufferInfo(gl);
    const previousFrame = twgl.createFramebufferInfo(gl);
    const currentFrame = twgl.createFramebufferInfo(gl);
    console.log(dataArray);

    const floatArrayUniform = twgl.createTexture(gl, {
        mag: gl.NEAREST, min: gl.NEAREST,
        width: dataArray.length,
        format: gl.RGB, internalFormat: gl.RGB32F,
        src: dataArray.floats
    });
    const integerArrayUniform = twgl.createTexture(gl, {
        mag: gl.NEAREST, min: gl.NEAREST,
        width: dataArray.length,
        format: gl.RG_INTEGER, internalFormat: gl.RG16I,
        src: dataArray.ints
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
            floatArrayUniform,
            integerArrayUniform,
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
        selectFrame(null!);
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
            updateStatusBar(`Done! (total time: ${(elapsedMiliseconds / 1000).toFixed(2)}s)`);
    };

    render();
}