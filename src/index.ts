import { buildEncodedBVHTree } from "raytracing/geometry/bvh";
import { compileGeometry, createBBoxFromTri, octahedron } from "raytracing/geometry/geometry";
import { raytrace } from "raytracing/raytracing";

async function main() {
    const wrapper = document.createElement('div');
    const canvas = document.createElement('canvas');
    const statusBar = document.createElement('div');
    statusBar.innerText = 'Tap the canvas to start rendering.';
    wrapper.id = 'wrapper';
    function updateStatusBar(msg: string) { statusBar.innerText = msg; }
    canvas.height = 500;
    canvas.width = 700;

    wrapper.appendChild(canvas);
    wrapper.appendChild(statusBar);
    document.body.appendChild(wrapper);

    const bbox = octahedron.tris.map(
        (tri) => createBBoxFromTri(octahedron.verts, tri.vert)
    );
    const boundingBoxData = buildEncodedBVHTree(bbox);
    const triangles = compileGeometry(octahedron);

    let resolver: () => void;
    await new Promise<void>((res) => {
        resolver = () => res();
        canvas.addEventListener('mousedown', resolver);
    });

    canvas.removeEventListener('mousedown', resolver!);
    
    raytrace(canvas, {
        triangles,
        materials: octahedron.materials,
        boundingBoxData
    }, updateStatusBar);
}

window.onload = main;