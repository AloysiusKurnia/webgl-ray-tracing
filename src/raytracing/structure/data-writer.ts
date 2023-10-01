import { BoundingBox, Material, Pair, PrecomputedTriangle, Quadruple, Triple, vec3 } from "raytracing/types";

const enum ArrayType { Float, Int }

type ElementPerDataEntry = {
    1: number,
    2: Pair<number | null>,
    3: Triple<number | null>,
    4: Quadruple<number | null>;
};
class DataWriter<N extends keyof ElementPerDataEntry> {
    public readonly buffer: Float32Array | Int16Array;

    constructor(
        private width: number,
        height: number,
        type: ArrayType,
        private elementPerData: N
    ) {
        const size = height * width * elementPerData;
        if (type === ArrayType.Int) {
            this.buffer = new Int16Array(size);
        } else {
            this.buffer = new Float32Array(size);
        }
    }

    write(x: number, y: number, data: ElementPerDataEntry[N]) {
        const loc = (y * this.width + x) * this.elementPerData;
        if (typeof data === 'number') {
            this.buffer[loc] = data;
        } else {
            for (let i = 0; i < this.elementPerData; i++) {
                const num = data[i];
                if (num !== null) {
                    this.buffer[loc + i] = num;
                }
            }
        }
        return this;
    }
}

export interface RenderUniformData {
    triangles: PrecomputedTriangle[];
    materials: Material[];
    boundingBoxData: {
        structure: number[];
        shape: BoundingBox[];
    };
}

export function generateUniformData(data: RenderUniformData) {
    const { triangles, materials, boundingBoxData } = data;
    const length = Math.max(boundingBoxData.shape.length, materials.length);
    /* ROW ASSIGNMENT =========================================================
    Floats
    0-2 | Triangle vertices
    3   | Triangle normal
    4   | Material color
    5   | Material specular color [unused]
    6   | [Material roughness, Material emission strength, -]
    7-8 | Bounding box min and max points respectively
    Ints
    0   | [Box structure data, triangle material index, -]
    */
    const floatDataWriter = new DataWriter(length, 9, ArrayType.Float, 3);
    const intDataWriter = new DataWriter(length, 1, ArrayType.Int, 2);

    for (let i = 0; i < triangles.length; i++) {
        const { p0, p1, p2, normal, materialIndex } = triangles[i];
        floatDataWriter
            .write(i, 0, p0)
            .write(i, 1, p1)
            .write(i, 2, p2)
            .write(i, 3, normal);
        intDataWriter
            .write(i, 0, [null, materialIndex]);
    }

    for (let i = 0; i < materials.length; i++) {
        const { color, roughness, emissionStrength } = materials[i];
        floatDataWriter
            .write(i, 4, color)
            .write(i, 6, [roughness, emissionStrength, null]);
    }

    for (let i = 0; i < boundingBoxData.shape.length; i++) {
        const { x0, x1, y0, y1, z0, z1 } = boundingBoxData.shape[i];
        floatDataWriter
            .write(i, 7, [x0, y0, z0])
            .write(i, 8, [x1, y1, z1]);
        intDataWriter
            .write(i, 0, [boundingBoxData.structure[i], null]);
    }

    return {
        floats: floatDataWriter.buffer,
        ints: intDataWriter.buffer,
        length
    }
}