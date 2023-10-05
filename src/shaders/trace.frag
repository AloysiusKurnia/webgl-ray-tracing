#version 300 es

// UNIFORMS ===================================================================

precision highp float;
precision highp isampler2D;

in vec2 tracingCoordinates;
in vec2 pixelMap;
in vec2 texCoord;

uniform sampler2D floatArrayUniform;
uniform isampler2D integerArrayUniform;
uniform sampler2D previousFrame;

uniform float raySourceDistance;
uniform float iteration;
uniform vec2 screenSize;
uniform float seed;

uniform uint bounceLimit;
uniform uint raysPerPixel;

out vec4 outColor;

// STRUCTS ====================================================================

struct Material {
    vec3 color;
    float emissionStrength;
    float roughness;
};

struct TraceOutput {
    int hitGeometryIndex;
    vec3 newOrigin;
    vec3 normal;
};

struct Ray {
    vec3 origin;
    vec3 direction;
    vec3 directionInverse;
};

struct IntersectionResult {
    int index;
    float dist;
};

// DATA FETCHER ===============================================================

// Floats
// 0-2 | Triangle vertices
// 3   | Triangle normal
// 4   | Material color
// 5   | Material specular color [unused]
// 6   | [Material roughness, Material emission strength, -]
// 7-8 | Bounding box min and max points respectively
// Ints
// 0   | [Box structure data, triangle material index, Box parent index]

ivec4 fetchIntegerArray(int index, int signifier) {
    return texelFetch(integerArrayUniform, ivec2(index, signifier), 0);
}

vec4 fetchFloatArray(int index, int signifier) {
    return texelFetch(floatArrayUniform, ivec2(index, signifier), 0);
}

Material triMaterial(int index) {
    int materialIndex = fetchIntegerArray(index, 0).g;

    vec3 color = fetchFloatArray(materialIndex, 4).rgb;
    vec4 row6 = fetchFloatArray(materialIndex, 6);
    float emission = row6.g;
    float roughness = row6.r;
    return Material(color, emission, roughness);
}

vec3[3] getTri(int index) {
    vec3 v0 = fetchFloatArray(index, 0).rgb;
    vec3 v1 = fetchFloatArray(index, 1).rgb;
    vec3 v2 = fetchFloatArray(index, 2).rgb;
    return vec3[](v0, v1, v2);
}

vec3 getTriNormal(int index) {
    return fetchFloatArray(index, 3).rgb;
}

vec3[2] getBoundingBoxDimension(int index) {
    vec3 vMin = fetchFloatArray(index, 7).rgb;
    vec3 vMax = fetchFloatArray(index, 8).rgb;
    return vec3[](vMin, vMax);
}

int getBoundingBoxRightChild(int index) {
    return fetchIntegerArray(index, 0).r;
}

int getBoundingBoxParent(int index) {
    return fetchIntegerArray(index, 0).b;
}

// RANDOMIZATION ==============================================================

// PCG Randomization algorithm
float random(inout uint state) {
    state = state * 747796405u + 1u;
    uint value = (((state >> 10) ^ state) >> 12) & 0xffffu;
    uint rot = state >> 28;
    uint outputInteger = ((value >> rot) | (value << ((-rot) & 15u))) & 0xffffu;

    return float(outputInteger) / 65535.0;
}

const float PI = 3.1415926538;
vec3 randomDirection(inout uint randomState) {
    float z = 2.0 * random(randomState) - 1.0;
    float angle = random(randomState) * 2.0 * PI;
    float sliceRadius = sqrt(1.0 - z * z);
    return vec3(sliceRadius * sin(angle), sliceRadius * cos(angle), z);
}

// INTERSECTION ===============================================================
const float INFINITY = 1. / 0.;
float intersectBox(vec3[2] box, Ray ray, float tminUpperBound) {
    vec3 t1 = (box[0] - ray.origin) * ray.directionInverse;
    vec3 t2 = (box[1] - ray.origin) * ray.directionInverse;

    vec3 tminVec = min(t1, t2);
    vec3 tmaxVec = max(t1, t2);

    float tmin = max(max(tminVec.x, tminVec.y), tminVec.z);
    float tmax = min(min(tmaxVec.x, tmaxVec.y), tmaxVec.z);

    if(tmax < tmin || tmin > tminUpperBound) {
        return -1.;
    }
    return tmax;
}

// Moeller-Trumbore intersection
float intersectTri(vec3[3] verts, Ray ray) {
    vec3 direction = ray.direction;
    vec3 rayOrigin = ray.origin;
    vec3 e1 = verts[1] - verts[0];
    vec3 e2 = verts[2] - verts[0];
    vec3 h = cross(direction, e2);
    float a = dot(e1, h);

    // The ray does not intersect plane.
    // For double sided triangle, use abs(a).
    if(a < 0.0001)
        return -1.;

    float f = 1. / a;
    vec3 s = rayOrigin - verts[0];
    float u = f * dot(s, h);

    if(u < 0. || u > 1.)
        return -1.;

    vec3 q = cross(s, e1);
    float v = f * dot(direction, q);

    if(v < 0. || u + v > 1.)
        return -1.;

    float dist = f * dot(e2, q);
    return dist;
}

// Travel through BVH tree.
IntersectionResult findNearestIntersection(Ray ray) {
    int nodeIndex = 0;
    int depthMod8 = 0, depthDiv8 = 0;
    // A stack of 24 booleans, shared into 3 8-bit octets.
    // If the BVH tree has a depth of more than 24, God help us all.
    uint[] stack = uint[](0u, 0u, 0u);
    float nearestDist = INFINITY;
    int nearestTriIndex = -1;
    while(nodeIndex != -1) {
        bool shouldFloat = true;
        int rightChildIndex = getBoundingBoxRightChild(nodeIndex);

        vec3[2] box = getBoundingBoxDimension(nodeIndex);
        float dist = intersectBox(box, ray, nearestDist);
        if(dist > 0.) {
            // Check if this node is a leaf node.
            if(rightChildIndex < 1) {
                int triIndex = -rightChildIndex;
                vec3[3] tri = getTri(triIndex);
                float dist = intersectTri(tri, ray);
                if(dist > 0. && dist < nearestDist) {
                    nearestDist = dist;
                    nearestTriIndex = triIndex;
                }
            } else {
                // Not a leaf node but it intersects.
                shouldFloat = false;
            }
        }
        int nextDestination = nodeIndex + 1;
        if(shouldFloat) {
            uint octet = stack[depthDiv8], bitMask = 1u << depthMod8;
            // Go to the last node that has the bit indicator 0
            do {
                depthMod8 -= 1;
                if(depthMod8 == -1) {
                    depthMod8 = 7;
                    depthDiv8 -= 1;
                    if(depthDiv8 == -1) {
                        break;
                    }
                    octet = stack[depthDiv8];
                }

                bitMask = 1u << depthMod8;
                nodeIndex = getBoundingBoxParent(nodeIndex);
            } while((octet & bitMask) != 0u);

            if(depthDiv8 == -1) {
                // The algorithm is done.
                break;
            }
            // Set this node as 'having its left node visited'.
            stack[depthDiv8] = octet | bitMask;
            nextDestination = getBoundingBoxRightChild(nodeIndex);
        }
        // This node is a branch node and haven't traveled to the left.
        // Can't prove that last statement though. :P
        depthMod8 += 1;
        if(depthMod8 > 7) {
            depthDiv8 += 1;
            depthMod8 = 0;
        }
        nodeIndex = nextDestination;
        uint octet = stack[depthDiv8];
        uint bitMask = 1u << depthMod8;
        // Set that node to mark that its left child is not yet visited
        stack[depthDiv8] = octet & ~bitMask;
    }
    return IntersectionResult(nearestTriIndex, nearestDist);
}

// RAY TRACING ================================================================

TraceOutput singleTrace(Ray ray) {
    IntersectionResult result = findNearestIntersection(ray);
    int nearestShapeIndex = result.index;
    float distanceToNearestShape = result.dist;

    vec3 newOrigin = distanceToNearestShape * ray.direction + ray.origin;
    vec3 normal = getTriNormal(nearestShapeIndex);
    return TraceOutput(nearestShapeIndex, newOrigin, normal);
}

vec3 runRayTracing(inout uint randomState, uint maxBounces) {
    vec3 raySource = vec3(0, 0, -raySourceDistance);
    vec3 direction = normalize(vec3(tracingCoordinates, 0) - raySource);
    vec3 rayColor = vec3(1);
    vec3 incomingLight = vec3(0);
    for(uint i = 0u; i < maxBounces; i++) {
        TraceOutput traceResult = singleTrace(Ray(raySource, direction, 1. / direction));
        if(traceResult.hitGeometryIndex == -1) {
            outColor = vec4(0, 0, 0, 1);
            return incomingLight;
            break;
        }
        Material material = triMaterial(traceResult.hitGeometryIndex);

        // assuming emission and diffusive materials are two completely different things
        if(material.emissionStrength > 0.) {
            vec3 emittedLight = material.color * material.emissionStrength;
            incomingLight += emittedLight * rayColor;
            break;
        }
        vec3 diffuseDir = normalize(traceResult.normal + randomDirection(randomState));
        vec3 specularDir = reflect(direction, traceResult.normal);
        direction = normalize(mix(specularDir, diffuseDir, material.roughness));

        rayColor *= material.color;
        raySource = traceResult.newOrigin;
    }
    return incomingLight;
}

void main() {
    outColor = vec4(0, 0, 0, 1);
    uvec2 castPixelMap = uvec2(pixelMap);
    uint index = castPixelMap.y * uint(screenSize.x) + castPixelMap.x;
    uint randomState = uint(seed) + index;
    random(randomState);
    vec3 color = vec3(0);

    for(uint i = 0u; i < raysPerPixel; i++) {
        color += runRayTracing(randomState, bounceLimit);
    }
    vec4 prevPixelColor = texture(previousFrame, texCoord);
    outColor = (prevPixelColor * (iteration - 1.) + vec4(color / float(raysPerPixel), 1)) / iteration;
}