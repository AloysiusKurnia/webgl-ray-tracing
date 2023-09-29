#version 300 es

in vec4 position;
out vec2 tracingCoordinates;
out vec2 pixelMap;
out vec2 texCoord;

uniform vec2 screenSize;
uniform float screenMultiplier;

void main() {
    gl_Position = position;
    float maxDimension = max(screenSize.x, screenSize.y);
    vec2 screenScaling = screenSize / float(maxDimension);

    tracingCoordinates = position.xy * screenScaling * screenMultiplier;
    pixelMap = (position.xy + 1.0) * screenSize / 2.0;
    texCoord = (position.xy + 1.) / 2.;
}