"use strict";

import * as THREE from 'three';

import {
  WidgetModel, ManagerBase
} from '@jupyter-widgets/base';

// Build Float32Array with numbers from 0 to n-1
export
function arange(n: number) {
    const arr = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
        arr[i] = i;
    }
    return arr;
}

// Two level Object.assign, i.e. override defaults.foo.* with params.foo.* where present
export
function extend2(defaults: {[key: string]: {[key: string]: any}}, params: {[key: string]: {[key: string]: any}}) {
    const p = Object.assign({}, defaults);
    for (let key in params) {
        Object.assign(p[key], params[key]);
    }
    return p;
}

// In place deletion of entries with undefined value
export
function delete_undefined(obj: {[key: string]: any}) {
    for (let key in obj) {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
}


// Copied in from figure.js before deleting that file, maybe useful somewhere
function __recompute_near_far(center: THREE.Vector3, radius: number, position: THREE.Vector3, fov: number) {
    const offset = 0.2;
    const dist = position.distanceTo(center);
    const near_edge = dist - radius;
    const far_edge = dist + radius;
    const near = Math.max(0.01 * near_edge, 0.01 * radius);
    const far = 100 * far_edge;
    return [near, far];
}

// Copied in from figure.js before deleting that file, documenting how renderer was previously setup
function __setup_renderer(canvas: HTMLCanvasElement, width: number, height: number, bgcolor: THREE.Color) {
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        precision: "highp",
        alpha: true,
        antialias: true,
        stencil: false,
        preserveDrawingBuffer: true,
        depth: true,
        logarithmicDepthBuffer: true,
    } as THREE.WebGLRendererParameters);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(bgcolor, 1);

    // Setup scene fog
    //scene.fog = new THREE.Fog(0xaaaaaa);
}


export
interface ISerializers {
  [key: string]: {
    deserialize?: (value?: any, manager?: ManagerBase<any>) => any;
    serialize?: (value?: any, widget?: WidgetModel) => any;
  }
}


export
type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

export
type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Uint8ClampedArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor;


export
type Method = 'surface' | 'isosurface' | 'max' | 'min' | 'xray' | 'sum' | 'volume';

export
type IPlotData = { [key: string]: any };
