
'use strict';

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');

const vsGLSL = `#version 300 es
in vec4 position;
in vec3 normal;
in vec2 texcoord;
uniform mat4 projection;
uniform mat4 modelView;
out vec3 v_normal;
out vec2 v_texcoord;
void main() {
    gl_Position = projection * modelView * position;
    v_normal = mat3(modelView) * normal;
    v_texcoord = texcoord;
}
`;

const fsGLSL = `#version 300 es
precision highp float;
in vec3 v_normal;
in vec2 v_texcoord;
uniform sampler2D diffuse;
uniform vec3 lightDir;
out vec4 outColor;
void main() {
    vec3 normal = normalize(v_normal);
    float light = dot(normal, lightDir) * 0.5 + 0.5;
    vec4 color = texture(diffuse, v_texcoord);
    outColor = vec4(color.rgb * light, color.a);
}
`;

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vsGLSL);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(vertexShader));
};

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fsGLSL);
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fragmentShader));
};

const prg = gl.createProgram();
gl.attachShader(prg, vertexShader);
gl.attachShader(prg, fragmentShader);
gl.linkProgram(prg);
if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prg));
};

// NOTE! These are only here to unclutter the diagram.
// It is safe to detach and delete shaders once
// a program is linked though it is arguably not common.
// and I usually don't do it.
gl.detachShader(prg, vertexShader);
gl.deleteShader(vertexShader);
gl.detachShader(prg, fragmentShader);
gl.deleteShader(fragmentShader);

const positionLoc = gl.getAttribLocation(prg, 'position');
const normalLoc = gl.getAttribLocation(prg, 'normal');
const texcoordLoc = gl.getAttribLocation(prg, 'texcoord');

const projectionLoc = gl.getUniformLocation(prg, 'projection');
const modelViewLoc = gl.getUniformLocation(prg, 'modelView');
const diffuseLoc = gl.getUniformLocation(prg, 'diffuse');
const lightDirLoc = gl.getUniformLocation(prg, 'lightDir');

// vertex positions for a cube
const cubeVertexPositions = new Float32Array([
    1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1,
]);
// vertex normals for a cube
const cubeVertexNormals = new Float32Array([
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
]);
// vertex texture coordinates for a cube
const cubeVertexTexcoords = new Float32Array([
    1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1,
]);
// vertex indices for the triangles of a cube
// the data above defines 24 vertices. We need to draw 12
// triangles, 2 for each size, each triangle needs
// 3 vertices so 12 * 3 = 36
const cubeVertexIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
],);

const cubeVertexArray = gl.createVertexArray();
gl.bindVertexArray(cubeVertexArray);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertexPositions, gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(
    positionLoc,  // location
    3,            // size (components per iteration)
    gl.FLOAT,     // type of to get from buffer
    false,        // normalize
    0,            // stride (bytes to advance each iteration)
    0,            // offset (bytes from start of buffer)
);

const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertexNormals, gl.STATIC_DRAW);
gl.enableVertexAttribArray(normalLoc);
gl.vertexAttribPointer(
    normalLoc,  // location
    3,          // size (components per iteration)
    gl.FLOAT,   // type of to get from buffer
    false,      // normalize
    0,          // stride (bytes to advance each iteration)
    0,          // offset (bytes from start of buffer)
);

const texcoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertexTexcoords, gl.STATIC_DRAW);
gl.enableVertexAttribArray(texcoordLoc);
gl.vertexAttribPointer(
    texcoordLoc,  // location
    2,            // size (components per iteration)
    gl.FLOAT,     // type of to get from buffer
    false,        // normalize
    0,            // stride (bytes to advance each iteration)
    0,            // offset (bytes from start of buffer)
);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndices, gl.STATIC_DRAW);

// This is not really needed but if we end up binding anything
// to ELEMENT_ARRAY_BUFFER, say we are generating indexed geometry
// we'll change cubeVertexArray's ELEMENT_ARRAY_BUFFER. By binding
// null here that won't happen.
gl.bindVertexArray(null);

const checkerTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, checkerTexture);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,                // mip level
    gl.LUMINANCE,     // internal format
    4,                // width
    4,                // height
    0,                // border
    gl.LUMINANCE,     // format
    gl.UNSIGNED_BYTE, // type
    new Uint8Array([  // data
        192, 128, 192, 128,
        128, 192, 128, 192,
        192, 128, 192, 128,
        128, 192, 128, 192,
    ]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const fbTextureWidth = 128;
const fbTextureHeight = 128;
const fbTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, fbTexture);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,                // mip level
    gl.RGBA,          // internal format
    fbTextureWidth,   // width
    fbTextureHeight,  // height
    0,                // border
    gl.RGBA,          // format
    gl.UNSIGNED_BYTE, // type
    null,             // data
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

const depthRB = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, depthRB);
gl.renderbufferStorage(
    gl.RENDERBUFFER,
    gl.DEPTH_COMPONENT16,  // format
    fbTextureWidth,        // width,
    fbTextureHeight,       // height,
);

const fb = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTexture, 0);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRB);

// above this line is initialization code
// --------------------------------------
// below is rendering code.
// --------------------------------------
// First draw a cube to the texture attached to the framebuffer
gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
gl.viewport(0, 0, fbTextureWidth, fbTextureHeight);

gl.clearColor(1, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

gl.bindVertexArray(cubeVertexArray);

gl.useProgram(prg);

// Picking unit 6 just to be different. The default of 0
// would render but would show less state changing.
let texUnit = 6;
gl.activeTexture(gl.TEXTURE0 + texUnit);
gl.bindTexture(gl.TEXTURE_2D, checkerTexture);
gl.uniform1i(diffuseLoc, texUnit);

gl.uniform3fv(lightDirLoc, m4.normalize([1, 5, 8]));

// We need a perspective matrix that matches the
// aspect of the framebuffer texture
let projection = m4.perspective(
    60 * Math.PI / 180,                // fov
    fbTextureWidth / fbTextureHeight,  // aspect
    0.1,                               // near
    10,                                // far
);
gl.uniformMatrix4fv(projectionLoc, false, projection);

let modelView = m4.identity();
modelView = m4.translate(modelView, 0, 0, -4);
modelView = m4.xRotate(modelView, 0.5);
modelView = m4.yRotate(modelView, 0.5);

gl.uniformMatrix4fv(modelViewLoc, false, modelView);

gl.drawElements(
    gl.TRIANGLES,
    36,                // num vertices to process
    gl.UNSIGNED_SHORT, // type of indices
    0,                 // offset on bytes to indices
);

// --------------------------------------
// Now draw a cube to the canvas using
// the texture attached to the framebuffer
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.clearColor(0, 0, 1, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// We need a perspective matrix that matches the
// aspect of the canvas
projection = m4.perspective(
    60 * Math.PI / 180,  // fov
    gl.canvas.clientWidth / gl.canvas.clientHeight,  // aspect
    0.1,  // near
    10,   // far
);
gl.uniformMatrix4fv(projectionLoc, false, projection);

// Picking unit 3 just to be different. We could have
// stated with the same as above.
texUnit = 6;
gl.activeTexture(gl.TEXTURE0 + texUnit);
gl.bindTexture(gl.TEXTURE_2D, fbTexture);
gl.uniform1i(diffuseLoc, texUnit);

// We didn't have to change attributes or other
// uniforms as we're just drawing the same cube vertices
// at the same place in front of the camera.
gl.drawElements(
    gl.TRIANGLES,
    36,                // num vertices to process
    gl.UNSIGNED_SHORT, // type of indices
    0,                 // offset on bytes to indices
);
