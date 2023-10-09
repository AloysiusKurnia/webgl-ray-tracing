import * as twgl from 'externals/twgl';

import plainF from 'shaders/plain.frag';
import traceF from 'shaders/trace.frag';
import colorF from 'shaders/color.frag';
import vertexSource from 'shaders/vert.vert';

import { RenderUniformData, generateUniformData } from './structure/data-writer';

export function raytrace(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    data: RenderUniformData,
    renderOptions: {
        bounceLimit: number,
        raysPerPixel: number,
        maxIteration: number;
    },
    updateStatusBar: (s: string) => void
) {
    const { bounceLimit, raysPerPixel, maxIteration } = renderOptions;
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        updateStatusBar(`Your browser doesn't support WebGL :(`)
        return;
    }
    const dataArray = generateUniformData(data);

    const traceProgram = twgl.createProgramInfo(gl, [vertexSource, traceF]);
    const plainProgram = twgl.createProgramInfo(gl, [vertexSource, plainF]);
    const colorProgram = twgl.createProgramInfo(gl, [vertexSource, colorF]);

    const tracingFrame = twgl.createFramebufferInfo(gl);
    const previousFrame = twgl.createFramebufferInfo(gl);

    const floatArrayUniform = twgl.createTexture(gl, {
        mag: gl.NEAREST, min: gl.NEAREST,
        width: dataArray.length,
        format: gl.RGB, internalFormat: gl.RGB32F,
        src: dataArray.floats
    });
    const integerArrayUniform = twgl.createTexture(gl, {
        mag: gl.NEAREST, min: gl.NEAREST,
        width: dataArray.length,
        format: gl.RGB_INTEGER, internalFormat: gl.RGB16I,
        src: dataArray.ints
    });


    // Attributes and pre-set uniforms
    const geometry = twgl.createBufferInfoFromArrays(gl, {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]
    });
    gl.useProgram(plainProgram.program);
    twgl.setBuffersAndAttributes(gl, plainProgram, geometry);

    gl.useProgram(traceProgram.program);
    twgl.setBuffersAndAttributes(gl, traceProgram, geometry);
    twgl.setUniforms(traceProgram, {
        raySourceDistance: 10, screenMultiplier: 2,
        triAmount: 8,
        screenSize: [canvas.width, canvas.height],
        bounceLimit, raysPerPixel,
        skyColorZenith: [0.76, 0.93, 0.89],
        skyColorHorizon: [0.39, 0.63, 0.85],
    });

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const draw = () => {
        twgl.drawBufferInfo(gl, geometry, gl.TRIANGLE_STRIP);
    };
    const useProgram = (programInfo: twgl.ProgramInfo) => {
        gl.useProgram(programInfo.program);
    };
    const selectFrame = (frame: twgl.FramebufferInfo) => {
        twgl.bindFramebufferInfo(gl, frame);
    };
    const startTime = Date.now();
    let iteration = 1;
    selectFrame(previousFrame);
    useProgram(colorProgram);
    twgl.setUniforms(colorProgram, { color: [1, 0, 0] });
    draw();
    const render = () => {
        // Render ray tracing.
        selectFrame(tracingFrame);
        useProgram(traceProgram);
        twgl.setUniforms(traceProgram, {
            previousFrame: previousFrame.attachments[0],
            iteration,
            floatArrayUniform,
            integerArrayUniform,
            seed: Math.random() * 65536
        });
        draw();

        // Move it to previous frame.
        selectFrame(previousFrame);
        useProgram(plainProgram);
        twgl.setUniforms(plainProgram, {
            tex: tracingFrame.attachments[0]
        });
        draw();

        // Render to canvas
        selectFrame(null!);
        useProgram(plainProgram);
        twgl.setUniforms(plainProgram, {
            tex: tracingFrame.attachments[0]
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
        else {
            const elapsedTime = elapsedMiliseconds / 1000;
            updateStatusBar(
                `Done! ${elapsedTime.toFixed(2)}s at ${fps.toFixed(2)}fps avg.`
            );
        }
    };

    render();
}