export type vec3 = [number, number, number];
export type vec4 = [number, number, number, number];
export interface PrecomputedTriangle {
    p1: vec3;
    p2: vec3;
    p3: vec3;
    edge1: vec3;
    edge2: vec3;
    edge3: vec3;
    normal: vec3; // Must be with length of 1
    bboxMin: vec3;
    bboxMax: vec3;
}

export interface Material {
    color: vec3;
}