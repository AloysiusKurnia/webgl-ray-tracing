import { buildEncodedBVHTree } from "raytracing/geometry/bvh";
import { Geometry, compileGeometry, createBBoxFromTri } from "raytracing/geometry/geometry";
import { readObj } from "raytracing/geometry/obj";
import { raytrace } from "raytracing/raytracing";

import objFile from '../objs/untitled.obj';

const shape = readObj(objFile, {
    base: { color: [0.8, 0.8, 0.8], emissionStrength: -1, roughness: 1 },
    light: { color: [1, 1, 1], emissionStrength: 20, roughness: 1 },
    left: { color: [1, 0, 0], emissionStrength: -1, roughness: 1 },
    right: { color: [0, 1, 1], emissionStrength: -1, roughness: 1 },
    purple: { color: [0.5, 0, .9], emissionStrength: -1, roughness: 1 },
    glossyPurple: { color: [0.5, 0, .9], emissionStrength: -1, roughness: 0.6 },
    floor: { color: [0.8, 0.8, 0.8], emissionStrength: -1, roughness: 0 },
});

const octahedron = {
    verts: [
        [0.4 + .4, -0.5 + 0, 0], // 0
        [0.4 - .4, -0.5 + 0, 0],
        [0.4 + 0, -0.5 + 0, -.4],
        [0.4 + 0, -0.5 + 0, +.4],
        [0.4 + 0, -0.5 + .4, 0],
        [0.4 + 0, -0.5 - .4, 0],

        [+2, -1, +2], // 6
        [+2, -1, -2],
        [-2, -1, +2],
        [-2, -1, -2],
        [+2, +1, +2],
        [+2, +1, -2],
        [-2, +1, +2],
        [-2, +1, -2],

        [+.3, .99, +.3], // 14
        [+.3, .99, -.3],
        [-.3, .99, +.3],
        [-.3, .99, -.3],
    ],
    materials: [
        { color: [1, 0, 0], emissionStrength: -1, roughness: 1 },
        { color: [0, 1, 0], emissionStrength: -1, roughness: 1 },
        { color: [0, 0, 1], emissionStrength: -1, roughness: 1 },
        { color: [1, 1, 0], emissionStrength: -1, roughness: 1 },
        { color: [1, 1, 1], emissionStrength: -1, roughness: 1 },
        { color: [1, 1, 1], emissionStrength: 50, roughness: 0 },
    ],
    tris: [
        // Octahedron
        { vert: [4, 0, 2], materialIndex: 0 },
        { vert: [4, 2, 1], materialIndex: 1 },
        { vert: [4, 1, 3], materialIndex: 4 },
        { vert: [4, 3, 0], materialIndex: 4 },
        { vert: [5, 2, 0], materialIndex: 2 },
        { vert: [5, 1, 2], materialIndex: 3 },
        { vert: [5, 3, 1], materialIndex: 4 },
        { vert: [5, 0, 3], materialIndex: 4 },
        // Room
        { vert: [6, 7, 8], materialIndex: 4 },
        { vert: [9, 8, 7], materialIndex: 4 },
        { vert: [6, 8, 12], materialIndex: 4 },
        { vert: [6, 12, 10], materialIndex: 4 },
        { vert: [9, 13, 12], materialIndex: 0 },
        { vert: [9, 12, 8], materialIndex: 0 },
        { vert: [7, 6, 10], materialIndex: 1 },
        { vert: [11, 7, 10], materialIndex: 1 },
        { vert: [13, 9, 7], materialIndex: 4 },
        { vert: [7, 11, 13], materialIndex: 4 },
        { vert: [11, 10, 12], materialIndex: 4 },
        { vert: [12, 13, 11], materialIndex: 4 },
        // Lamp
        { vert: [15, 14, 16], materialIndex: 5 },
        { vert: [16, 17, 15], materialIndex: 5 }
    ]
} as Geometry;

const bounceLimit = 5, raysPerPixel = 1, maxIteration = 200;

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