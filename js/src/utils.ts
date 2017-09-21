"use strict";

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
function __recompute_near_far(center, radius, position, fov) {
    const offset = 0.2;
    const dist = position.distanceTo(center);
    const near_edge = dist - radius;
    const far_edge = dist + radius;
    const near = Math.max(0.01 * near_edge, 0.01 * radius);
    const far = 100 * far_edge;
    return [near, far];
}

// Copied in from figure.js before deleting that file, documenting how renderer was previously setup
function __setup_renderer(canvas, width, height, bgcolor) {
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        precision: "highp",
        alpha: true,
        antialias: true,
        stencil: false,
        preserveDrawingBuffer: true,
        depth: true,
        logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(bgcolor, 1);

    // Setup scene fog
    //scene.fog = new THREE.Fog(0xaaaaaa);
}