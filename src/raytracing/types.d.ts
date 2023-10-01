export type Pair<T> = [T, T];
export type Triple<T> = [T, T, T];
export type Quadruple<T> = [T, T, T, T];

export type vec3 = Triple<number>;
export type vec4 = Quadruple<number>;

export interface PrecomputedTriangle {
    p0: vec3;
    p1: vec3;
    p2: vec3;
    normal: vec3;
    materialIndex: number;
}

export interface Material {
    color: vec3;
    emissionStrength: number;
    roughness: number;
}

export interface BoundingBox {
    readonly x0: number; readonly y0: number; readonly z0: number;
    readonly x1: number; readonly y1: number; readonly z1: number;
}