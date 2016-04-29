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

/* global window */
import React, {PropTypes} from 'react';
import autobind from 'autobind-decorator';

import WebGLRenderer from './webgl-renderer';
import {
  matchLayers, finalizeOldLayers, updateMatchedLayers, initializeNewLayers,
  layersNeedRedraw
} from './layer-manager';

const PROP_TYPES = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  layers: PropTypes.array.isRequired,
  lights: PropTypes.object,
  viewport: PropTypes.object.isRequired,
  camera: PropTypes.object.isRequired,
  // TODO when do we want users to specify blendMode?
  blendMode: PropTypes.object,
  t: PropTypes.number
};

// TODO move blendMode to webgl-renderer? it does not concern layers
const DEFAULT_BLENDING_MODE = {
  enable: true,
  blendFunc: ['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA'],
  blendEquation: 'FUNC_ADD'
};

const DEFAULT_LIGHTS = {
  enable: true,
  ambient: {r: 1.0, g: 1.0, b: 1.0},
  points: [{
    diffuse: {r: 0.8, g: 0.8, b: 0.8},
    specular: {r: 0.6, g: 0.6, b: 0.6},
    position: [0.5, 0.5, 3]
  }]
};

export default class DeckGLOverlay extends React.Component {

  static get propTypes() {
    return PROP_TYPES;
  }

  constructor(props) {
    super(props);
    this.state = {};
    this.needsRedraw = true;
  }

  componentWillReceiveProps(nextProps) {
    matchLayers(this.props.layers, nextProps.layers);
    finalizeOldLayers(this.props.layers);
    updateMatchedLayers(nextProps.layers);
    this.initializeLayers(nextProps.layers);
  }

  initializeLayers(layers) {
    const {gl} = this.state;
    if (!gl) {
      return;
    }
    initializeNewLayers(layers, {gl});
    this.addLayersToScene(layers);
  }

  addLayersToScene(layers) {
    const {scene} = this.state;
    if (!scene) {
      return;
    }
    // clear scene and repopulate based on new layers
    scene.removeAll();
    for (const layer of layers) {
      // Save layer on model for picking purposes
      // TODO - store on model.userData rather than directly on model
      layer.state.model.userData.layer = layer;
      // Add model to scene
      scene.add(layer.state.model);
    }
  }

  @autobind
  _onRendererInitialized({gl, scene}) {
    this.setState({gl, scene});
    initializeNewLayers(this.props.layers, {gl});
  }

  // Route events to layers
  @autobind
  _onClick(info) {
    const {picked} = info;
    for (const item of picked) {
      if (item.model.userData.layer.onClick({color: item.color, ...info})) {
        return;
      }
    }
  }

    // Route events to layers
  @autobind
  _onMouseMove(info) {
    const {picked} = info;
    for (const item of picked) {
      if (item.model.userData.layer.onHover({color: item.color, ...info})) {
        return;
      }
    }
  }

  @autobind
  _checkIfNeedRedraw() {
    const {layers} = this.props;
    return layersNeedRedraw(layers, {clearFlag: true});
  }

  render() {
    const {
      width, height, layers, lights, blendMode, camera, viewport, ...otherProps
    } = this.props;

    // TODO initializeLayers in render()?
    this.initializeLayers(layers);

    const rendererProps = {
      ...otherProps,
      width,
      height,
      viewport,
      camera,
      lights: lights || DEFAULT_LIGHTS,
      blendMode: blendMode || DEFAULT_BLENDING_MODE,
      pixelRatio: window.devicePixelRatio,

      onRendererInitialized: this._onRendererInitialized,
      onNeedRedraw: this._checkIfNeedRedraw,
      onMouseMove: this._onMouseMove,
      onClick: this._onClick
    };

    return <WebGLRenderer {...rendererProps} />;
  }

}
