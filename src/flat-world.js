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

// A standard viewport implementation
const DEFAULT_FOV = 15;
const DEFAULT_SIZE = 1000;

const flatWorld = {

  // World size
  size: DEFAULT_SIZE,

  // Field of view
  fov: DEFAULT_FOV,

  Viewport: class Viewport {

    /**
     * @classdesc
     * Calculate {x,y,with,height} of the WebGL viewport
     * based on provided canvas width and height
     *
     * Note: The viewport will be set to a square that covers
     * the canvas, and an offset will be applied to x or y
     * as necessary to center the window in the viewport
     * So that the camera will look at the center of the canvas
     *
     * @class
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
      const xOffset = width > height ? 0 : (width - height) / 2;
      const yOffset = height > width ? 0 : (height - width) / 2;
      const size = Math.max(width, height);

      this.x = xOffset;
      this.y = yOffset;
      this.width = size;
      this.height = size;
    }

    screenToSpace({x, y}) {
      return {
        x: ((x - this.x) / this.width - 0.5) * flatWorld.size * 2,
        y: ((y - this.y) / this.height - 0.5) * flatWorld.size * 2 * -1,
        z: 0
      };
    }
  },

  // Camera height that will cover a plane of [-size, size]
  // to fit exactly the entire screen
  // Considering field of view is 45 degrees:
  //
  //
  //       Camera Height
  //     /|
  //    /~| => fov / 2
  //   /  |
  //  /   |
  // /    |
  // -----|
  // Half of plane [0, size]
  // The upper angle is half of the field of view angle.
  // Camera height = size / Math.tan((fov/2) * Math.PI/180);
  //
  getCameraHeight(size, fov) {
    size = size || flatWorld.size;
    fov = fov || flatWorld.fov;

    switch (fov) {
    case 15: return size * 7.595754112725151;
    case 30: return size * 3.732050807568878;
    case 45: return size * 2.414213562373095;
    case 60: return size * 1.732050807568877;
    default: return size / Math.tan(fov / 2 * Math.PI / 180);
    }
  },

  getCamera(t = 0) {
    const cameraHeight = flatWorld.getCameraHeight();

    const xx = Math.cos(t * Math.PI / 180);
    const yy = Math.sin(t * Math.PI / 180);

    const x = cameraHeight * xx * 0.4;
    const y = cameraHeight * yy * 0.5;
    const z = cameraHeight * 0.25;
    return {
      fov: 15,
      near: (cameraHeight + 1) / 100,
      far: cameraHeight + 1,
      position: [x, y, -z],
      target: [0, 0, 0],
      up: [xx * 0.4, yy * 0.5, 0]
    };
  },
};

export default flatWorld;
