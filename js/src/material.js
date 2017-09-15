"use strict";

import _ from "underscore";
import * as THREE from "three";

const vertexShader = require("./glsl/vertex.glsl");
const fragmentShader = require("./glsl/fragment.glsl");

// Note: Cells are oriented such that the front side should be
// visible, which means we either use FrontSide or DoubleSide.

const default_nontransparent = {
    side: THREE.FrontSide,
    //side: THREE.DoubleSide,
    transparent: false,
    depthTest: true,
    depthWrite: true,
};

const default_transparent = {
    side: THREE.FrontSide,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
};

const default_minmax = Object.assign(default_transparent, {
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
});

const method_configs = {
    // TODO: Merge these methods into one with different encodings
    mesh: default_nontransparent,
    cells: default_nontransparent,
    surface: default_nontransparent,
    surface_depth: default_nontransparent,

    isosurface: default_nontransparent,
    max: Object.assign(default_minmax, {
        // Rendering front and back sides means shaders can be
        // simpler at the cost of doubling the number of triangles.
        side: THREE.DoubleSide,
        blendEquation: THREE.MaxEquation,
    }),
    max2: Object.assign(default_minmax, {
        // Rendering front side only and computing back
        // side value in shader, meaning more costly shader
        // computations but half as many triangles.
        side: THREE.FrontSide,
        blendEquation: THREE.MaxEquation,
    }),
    min: Object.assign(default_minmax, {
        // Rendering front and back sides means shaders can be
        // simpler at the cost of doubling the number of triangles.
        side: THREE.DoubleSide,
        blendEquation: THREE.MinEquation,
    }),
    min2: Object.assign(default_minmax, {
        // Rendering front side only and computing back
        // side value in shader, meaning more costly shader
        // computations but half as many triangles.
        side: THREE.FrontSide,
        blendEquation: THREE.MinEquation,
    }),
    xray: Object.assign(default_transparent, {
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
    }),
    xray2: Object.assign(default_transparent, {
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
    }),
    sum: Object.assign(default_transparent, {
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    }),
    volume: Object.assign(default_transparent, {
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
    }),
};

export
function create_material(method, uniforms, defines) {
    const fog = false;  // To enable fog, would need custom shader support
    const material_config = {
        uniforms, defines,
        vertexShader, fragmentShader,
        fog
    };
    Object.assign(material_config, method_configs[method]);

    // Configure shader
    // (using only a few things from ShaderMaterial, could also
    // use RawShaderMaterial by adding those few things explicitly)
    const material = new THREE.ShaderMaterial(material_config);

    // Some extensions need to be explicitly enabled
    material.extensions.derivatives = true;

    return material;
}
