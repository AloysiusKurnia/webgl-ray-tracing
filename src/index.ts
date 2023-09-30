import { bboxDetail, buildEncodedBVHTree } from "raytracing/bvh";
import { createBBoxFromTri, octahedron } from "raytracing/geometry";
import { raytrace } from "raytracing/raytracing";

async function main() {
    const bbox = octahedron.tris.map((s) => createBBoxFromTri(
        octahedron.verts,
        s.vert
    ));
    bbox.forEach(s => console.log(bboxDetail(s)));
    const tree = buildEncodedBVHTree(bbox);
    console.log(tree.join(' '));
    

    const wrapper = document.createElement('div');
    const canvas = document.createElement('canvas');
    const statusBar = document.createElement('div');
    statusBar.innerText = 'Tap the canvas to start rendering.';
    wrapper.id = 'wrapper';
    function updateStatusBar(msg: string) {
        statusBar.innerText = msg;
    }
    canvas.height = 500;
    canvas.width = 700;

    wrapper.appendChild(canvas);
    wrapper.appendChild(statusBar);
    document.body.appendChild(wrapper);

    let resolver: () => void;
    await new Promise<void>((res) => {
        resolver = () => res();
        canvas.addEventListener('mousedown', resolver);
    });
    canvas.removeEventListener('mousedown', resolver);
    raytrace(canvas, updateStatusBar);
}

window.onload = main;