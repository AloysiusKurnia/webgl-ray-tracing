import { BB, bboxDetail, buildBVHTree } from "raytracing/bvh";
import { octahedron } from "raytracing/geometry";
import { raytrace } from "raytracing/raytracing";

interface BBTriMapping extends BB {
    triIndex: number;
}

async function main() {
    const boxes = octahedron.tris.map((tri, triIndex) => {
        let x0 = Infinity; let x1 = -Infinity;
        let y0 = Infinity; let y1 = -Infinity;
        let z0 = Infinity; let z1 = -Infinity;
        for (let i = 0; i <= 2; i++) {
            const [x, y, z] = octahedron.verts[tri.vert[i] - 1];
            x0 = Math.min(x0, x); x1 = Math.max(x1, x);
            y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            z0 = Math.min(z0, z); z1 = Math.max(z1, z);
        }
        return { x0, y0, z0, x1, y1, z1, triIndex, toString() { return `Triangle ${triIndex}`; } } as BBTriMapping;
    });
    buildBVHTree(boxes);
    // const wrapper = document.createElement('div');
    // const canvas = document.createElement('canvas');
    // const statusBar = document.createElement('div');
    // statusBar.innerText = 'Tap the canvas to start rendering.';
    // wrapper.id = 'wrapper';
    // function updateStatusBar(msg: string) {
    //     statusBar.innerText = msg;
    // }
    // canvas.height = 500;
    // canvas.width = 700;

    // wrapper.appendChild(canvas);
    // wrapper.appendChild(statusBar);
    // document.body.appendChild(wrapper);

    // let resolver: () => void;
    // await new Promise<void>((res) => {
    //     resolver = () => res();
    //     canvas.addEventListener('mousedown', resolver);
    // });
    // canvas.removeEventListener('mousedown', resolver);
    // raytrace(canvas, updateStatusBar);
}

window.onload = main;