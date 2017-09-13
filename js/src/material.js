'use strict';

import _ from 'underscore';

import {THREE} from './threeimport';

import {vertex_shader, fragment_shader} from './shaders';

// Note: Cells are oriented such that the front side should be
// visible, which means we either use FrontSide or DoubleSide.

const default_nontransparent = {
    side: THREE.FrontSide,
    transparent: false,
    depthTest: true,
    depthWrite: true,
};

const default_transparent = {
    side: THREE.FrontSide,
    transparent: true,
    depthTest: true,
    depthWrite: false,
};

const method_configs = {
    mesh: {
        side: THREE.FrontSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
    },
    cells: {
        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
    },
    surface: {
        side: THREE.FrontSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
    },
    surface_depth: {
        side: THREE.FrontSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
    },
    isosurface: {
        side: THREE.FrontSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
    },
    max: {
        // Rendering front and back sides means shaders can be
        // simpler at the cost of doubling the number of triangles.
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.MaxEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    max2: {
        // Rendering front side only and computing back
        // side value in shader, meaning more costly shader
        // computations but half as many triangles.
        side: THREE.FrontSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.MaxEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    min: {
        // Rendering front and back sides means shaders can be
        // simpler at the cost of doubling the number of triangles.
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.MinEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    min2: {
        // Rendering front side only and computing back
        // side value in shader, meaning more costly shader
        // computations but half as many triangles.
        side: THREE.FrontSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.MinEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    xray: {
        side: THREE.FrontSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        // blendEquation: THREE.ReverseSubtractEquation, // dst - src  // TODO: Is there a way to use this for negative xray?
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
    },
    xray2: {
        side: THREE.FrontSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        // blendEquation: THREE.ReverseSubtractEquation, // dst - src  // TODO: Is there a way to use this for negative xray?
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
    },
    sum: {
        transparent: true,
        depthTest: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    volume: {
        transparent: true,
        depthTest: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
    },
};

export
function create_material(method, uniforms, defines) {
    const material_config = {
        uniforms: uniforms,
        defines: defines,
        vertexShader: vertex_shader,
        fragmentShader: fragment_shader,
        fog: false,  // To enable fog, would need custom shader support
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
