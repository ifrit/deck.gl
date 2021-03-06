// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* vertex shader for the arc-layer */

const float N = 49.0;

attribute vec3 vertices;
attribute vec4 positions;

uniform mat4 worldMatrix;
uniform mat4 projectionMatrix;

varying float ratio;

// viewport: [x, y, width, height]
uniform vec4 viewport;
// mapViewport: [longitude, latitude, zoom, worldSize]
uniform vec4 mapViewport;

const float TILE_SIZE = 512.0;
const float PI = 3.1415926536;

vec2 mercatorProject(vec2 lnglat, float zoom) {
  float longitude = lnglat.x;
  float latitude = lnglat.y;

  float lamda = radians(lnglat.x);
  float phi = radians(lnglat.y);
  float scale = pow(2.0, zoom) * TILE_SIZE / (PI * 2.0);

  float x = scale * (lamda + PI);
  float y = scale * (PI - log(tan(PI * 0.25 + phi * 0.5)));

  return vec2(x, y);
}

vec2 lnglatToScreen(vec2 lnglat) {
  // non-linear projection: lnglats => screen coordinates
  vec2 mapCenter = mercatorProject(mapViewport.xy, mapViewport.z);
  vec2 theVertex = mercatorProject(lnglat, mapViewport.z);
  // linear transformation:
  float canvasSize = max(viewport.z, viewport.w);
  float worldSize = mapViewport.w;
  // TODO further simplify: let worldSize = canvasSize
  vec2 offsetXY = theVertex - mapCenter - viewport.xy + viewport.zw * 0.5;
  vec2 scaledXY = offsetXY * (worldSize * 2.0 / canvasSize) - worldSize;
  // flip y
  return scaledXY * vec2(1.0, -1.0);
}

float paraboloid(vec2 source, vec2 target, float index) {
  float ratio = index / N;

  vec2 x = mix(source, target, ratio);
  vec2 center = mix(source, target, 0.5);

  float dSourceCenter = distance(source, center);
  float dXCenter = distance(x, center);
  return (dSourceCenter + dXCenter) * (dSourceCenter - dXCenter);
}

void main(void) {
  vec2 source = lnglatToScreen(positions.xy);
  vec2 target = lnglatToScreen(positions.zw);

  float segmentIndex = vertices.x;
  vec3 p = vec3(
    // xy: linear interpolation of source & target
    mix(source, target, segmentIndex / N),
    // z: paraboloid interpolate of source & target
    sqrt(paraboloid(source, target, segmentIndex))
  );

  gl_Position = projectionMatrix * worldMatrix * vec4(p, 1.0);

  // map arc distance to color in fragment shader
  ratio = clamp(distance(source, target) / 1000.0, 0.0, 1.0);
}
