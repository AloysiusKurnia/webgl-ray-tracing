import { buildEncodedBVHTree } from "raytracing/geometry/bvh";
import { compileGeometry, createBBoxFromTri } from "raytracing/geometry/geometry";
import { readObj } from "raytracing/geometry/obj";
import { raytrace } from "raytracing/raytracing";

import objFile from '../objs/untitled.obj';

const shape = readObj(objFile, {
    base: { color: [0.8, 0.8, 0.8], emissionStrength: -1, roughness: 1 },
    light: { color: [1, 1, 1], emissionStrength: 10, roughness: 1 },
    left: { color: [1, 0, 0], emissionStrength: -1, roughness: 0.1 },
    right: { color: [0, 1, 1], emissionStrength: -1, roughness: 0.1 },
    purple: { color: [0.5, 0, .9], emissionStrength: -1, roughness: 1 },
    glossyPurple: { color: [0.8, 0.2, 1], emissionStrength: 1.5, roughness: 0 },
    floor: { color: [1, 1, 1], emissionStrength: -1, roughness: 0.3 },
});

const bounceLimit = 4, raysPerPixel = 10, maxIteration = 100;

async function main() {
    const selectedShape = shape;
    const wrapper = document.createElement('div');
    const canvas = document.createElement('canvas');
    const statusBar = document.createElement('div');
    statusBar.innerText = 'Tap the canvas to start rendering.';
    wrapper.id = 'wrapper';
    function updateStatusBar(msg: string) { statusBar.innerText = msg; }
    canvas.width = 500;
    canvas.height = 300;

    wrapper.appendChild(canvas);
    wrapper.appendChild(statusBar);
    document.body.appendChild(wrapper);

    const bbox = selectedShape.tris.map(
        (tri) => createBBoxFromTri(selectedShape.verts, tri.vert)
    );
    const boundingBoxData = buildEncodedBVHTree(bbox);
    const triangles = compileGeometry(selectedShape);

    let resolver: () => void;
    await new Promise<void>((res) => {
        resolver = () => res();
        canvas.addEventListener('mousedown', resolver);
    });

    canvas.removeEventListener('mousedown', resolver!);

    raytrace(canvas, {
        triangles,
        materials: selectedShape.materials,
        boundingBoxData
    }, {
        bounceLimit,
        raysPerPixel,
        maxIteration
    }, updateStatusBar);
}

window.onload = main;