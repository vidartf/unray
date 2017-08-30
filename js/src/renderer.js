'use strict';

import _ from 'underscore';

import {
    extend2
} from './utils.js';

import {
    reorient_tetrahedron_cells
} from "./meshutils";

import {
    create_instanced_tetrahedron_geometry,
    create_cells_attribute,
    create_cell_ordering_attribute,
    create_bounding_sphere,
    create_bounding_box,
    create_bounding_sphere_geometry,
    create_bounding_box_geometry,
    create_bounding_box_axis_geometry,
    create_bounding_box_midplanes_geometry
} from './geometry';

import {
    vertex_shader,
    fragment_shader
} from './shaders';

import './threeimport';
const THREE = window.THREE;
// console.log("THREE imported in renderer:", THREE);

// TODO: Improve and document channel specifications
const default_channels = {
    cells:           { association: "cell",            dtype: "int32",   item_size: 4 },
    coordinates:     { association: "vertex",          dtype: "float32", item_size: 3 },
    // ordering:       { association: "cell",            dtype: "int32",   item_size: 1 },
    cell_indicators: { association: "cell",            dtype: "int32",   item_size: 1 },
    density:         { association: "vertex",          dtype: "float32", item_size: 1 },
    emission:        { association: "vertex",          dtype: "float32", item_size: 1 },
    density_lut:     { association: "lut",             dtype: "float32", item_size: 1 },
    emission_lut:    { association: "lut",             dtype: "float32", item_size: 3 },
    cell_indicator_value: { association: "constant",  dtype: "int32",   item_size: 1 }, // int
    emission_color:       { association: "constant",  dtype: "float32", item_size: 3 }, // color
    extinction:           { association: "constant",  dtype: "float32", item_size: 1 }, // float
    isorange:             { association: "constant",  dtype: "float32", item_size: 2 }, // vec2
    //wireframe:       { enable: false, size: 0.001, color: "#000000",  opacity: 1.0, decay: 0.5 },
};

// TODO: Improve and document encoding specifications, look at vega for ideas
// TODO: Let default encodings differ per method
const default_encoding = {
    cells:           { field: "cells" },
    coordinates:     { field: "coordinates" },
    // ordering:       { field: "ordering" },
    cell_indicators: { field: "cell_indicators" },
    density:         { field: "density", range: "auto" },
    emission:        { field: "emission", range: "auto" },
    density_lut:     { field: "density_lut" },
    emission_lut:    { field: "emission_lut" },
    cell_indicator_value: { value: 1 },
    emission_color:       { value: new THREE.Color(0.8, 0.8, 0.8) },
    extinction:           { value: 1.0 },
    isorange:             { value: new THREE.Vector2(0.2, 0.8) },
};



// TODO: Define channels for all methods.
// TODO: Let defines follow from method channels and encoding instead of hardcoding per method


// Note: defines are used as "ifdef FOO" not "if FOO" so the value is irrelevant
const default_defines = {
    // Always need cell ordering array with
    // webgl1 because gl_InstanceID is not available
    ENABLE_CELL_ORDERING: 1,

    // TODO: Should be determined by camera, maybe use a uniform to toggle
    ENABLE_PERSPECTIVE_PROJECTION: 1,
};


const method_properties = {
    blank: {
    },
    mesh: {
        sorted: false,
        transparent: false,
        depth_test: true,
        depth_write: true,

        // Any background is fine
        background: undefined,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,

        defines: Object.assign({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_WIREFRAME: 1,
            ENABLE_SURFACE_LIGHT: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    cells: {
        sorted: false,
        transparent: false,
        depth_test: true,
        depth_write: true,

        // Any background is fine
        background: undefined,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,

        defines: Object.assign({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
            // TODO: decide on meaning of indicator values
            ENABLE_CELL_INDICATORS: 1, // TODO: Set this if the encoding channel has data
            ENABLE_WIREFRAME: 1,
            ENABLE_SURFACE_LIGHT: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    surface: {
        sorted: false,
        transparent: false,
        depth_test: true,
        depth_write: true,

        // Any background is fine
        background: undefined,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,

        defines: Object.assign({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
            ENABLE_SURFACE_LIGHT: 1,
        }),
        // select_defines: function(encoding) {
        //     const defines = {};

        //     defines.ENABLE_SURFACE_MODEL = 1;
        //     defines.ENABLE_EMISSION = 1;

        //     // Always need cell ordering array with
        //     // webgl1 because gl_InstanceID is not available
        //     defines.ENABLE_CELL_ORDERING = 1;

        //     return defines;
        // },
        channels: default_channels,
        default_encoding: default_encoding,
    },
    surface_depth: {
        sorted: false,
        transparent: false,
        depth_test: true,
        depth_write: true,

        // Any background is fine
        background: undefined,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,

        defines: Object.assign({}, default_defines, {
            ENABLE_SURFACE_DEPTH_MODEL: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    isosurface: {
        sorted: false,
        transparent: false,
        depth_test: true,
        depth_write: true,

        // Any background is fine
        background: undefined,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.SrcAlphaFactor,
        blend_dst: THREE.OneMinusSrcAlphaFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_ISOSURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
            ENABLE_EMISSION_BACK: 1,
            ENABLE_SURFACE_LIGHT: 1,
            // FIXME: Configurable mode:
            //USING_ISOSURFACE_MODE_LINEAR: 1,
            //USING_ISOSURFACE_MODE_LOG: 1,
            USING_ISOSURFACE_MODE_SINGLE: 1,
            //USING_ISOSURFACE_MODE_SWEEP: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    max2: {
        sorted: false,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Must start with a black background
        background: new THREE.Color(0, 0, 0),

        // Rendering front side only and taking max in shader
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MaxEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_MAX_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
            ENABLE_EMISSION_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    max: {
        sorted: false,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Must start with a black background
        background: new THREE.Color(0, 0, 0),

        // Rendering both sides automatically includes the
        // backside boundary of the mesh at cost of doubling
        // the number of faces.
        side: THREE.DoubleSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MaxEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_MAX_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
            // ENABLE_EMISSION_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    min2: {
        sorted: false,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

        // Rendering front side only and taking min in shader
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MinEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_MIN_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
            ENABLE_EMISSION_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    min: {
        sorted: false,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

        // Rendering both sides automatically includes the
        // backside boundary of the mesh at cost of doubling
        // the number of faces.
        side: THREE.DoubleSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MinEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_MIN_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
            // ENABLE_EMISSION_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    xray: {
        sorted: false,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        // blend_equation: THREE.ReverseSubtractEquation, // dst - src  // TODO: Is there a way to use this for negative xray?
        blend_src: THREE.OneFactor,
        blend_dst: THREE.SrcAlphaFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_XRAY_MODEL: 1,
            ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
            // ENABLE_DENSITY_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    xray2: {
        sorted: false,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        // blend_equation: THREE.ReverseSubtractEquation, // dst - src  // TODO: Is there a way to use this for negative xray?
        blend_src: THREE.OneFactor,
        blend_dst: THREE.SrcAlphaFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_XRAY_MODEL: 1,
            ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
            ENABLE_DENSITY_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    sum: {
        sorted: false,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Must start with a black background
        background: new THREE.Color(0, 0, 0),

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_SUM_MODEL: 1,
            ENABLE_EMISSION: 1,        // TODO: It might make sense to use emission OR density here?
            ENABLE_EMISSION_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
    volume: {
        sorted: true,
        transparent: true,
        depth_test: false,
        depth_write: false,

        // Any background is fine
        background: undefined,

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneMinusSrcAlphaFactor,

        defines: Object.assign({}, default_defines, {
            ENABLE_VOLUME_MODEL: 1,
            ENABLE_DENSITY: 1,      // TODO: All combinations of density/emission with/without backside are valid.
            ENABLE_EMISSION: 1,
            ENABLE_DENSITY_BACK: 1,
            ENABLE_EMISSION_BACK: 1,
        }),

        channels: default_channels,
        default_encoding: default_encoding,
    },
};

function compute_range(array) {
    let min = array[0];
    let max = array[0];
    for (let v of array) {
        min = Math.min(min, v);
        max = Math.max(max, v);
    }
    return [min, max];
}

function extended_range(min, max) {
    let range = max - min;
    let scale = range > 0.0 ? 1.0 / range : 1.0;
    return [min, max, range, scale];
}

const compute_texture_shape = (() => {
    const _texture_shapes = new Map();

    function _compute_texture_shape(size) {
        const shape = _texture_shapes.get(size);
        if (shape) {
            return shape;
        }
        if (size <= 0) {
            throw { message: 'Expecting a positive size', size:size };
        }
        const width = Math.pow(2, Math.floor(Math.log2(size) / 2));
        const height = Math.ceil(size / width);
        return [width, height];
    }

    return _compute_texture_shape;
})();

const dtype2threetype = {
    float32: THREE.FloatType,
    uint32: THREE.UnsignedIntType,
    uint16: THREE.UnsignedIntType,
    uint8: THREE.UnsignedIntType,
    int32: THREE.IntType,
    int16: THREE.IntType,
    int8: THREE.IntType,
};

// const dtype2arraytype = {
//     float32: Float32Array,
//     uint32: Uint32Array,
//     uint16: Uint16Array,
//     uint8: Uint8Array,
//     int32: Int32Array,
//     int16: Int16Array,
//     int8: Int8Array,
// };

const dtype2threeformat = {
    1: THREE.AlphaFormat,
    3: THREE.RGBFormat,
    4: THREE.RGBAFormat
};

function allocate_array_texture(dtype, item_size, texture_shape) {
    const size = texture_shape[0] * texture_shape[1] * item_size;

    // console.log("Allocating array texture with shape: ", texture_shape);

    // Textures using Int32Array and Uint32Array require webgl2,
    // so currently just ignoring the dtype during prototyping.
    // Some redesign may be in order once the prototype is working,
    // or maybe porting to webgl2.
    // const arraytype = dtype2arraytype[dtype];
    // const padded_data = new arraytype(size);
    // const type = dtype2threetype[dtype];

    const padded_data = new Float32Array(size);
    const type = dtype2threetype["float32"];  // NB! See comment above

    const format = dtype2threeformat[item_size];

    const texture = new THREE.DataTexture(padded_data,
        texture_shape[0], texture_shape[1],
        format, type);

    return texture;
}

function allocate_lut_texture(dtype, item_size, texture_shape) {
    const size = texture_shape[0] * texture_shape[1] * item_size;

    // Textures using Int32Array and Uint32Array require webgl2,
    // so currently just ignoring the dtype during prototyping.
    // Some redesign may be in order once the prototype is working,
    // or maybe porting to webgl2.
    // const arraytype = dtype2arraytype[dtype];
    // const padded_data = new arraytype(size);
    // const type = dtype2threetype[dtype];

    const padded_data = new Float32Array(size);
    const type = dtype2threetype["float32"];  // NB! See comment above

    const format = dtype2threeformat[item_size];

    const texture = new THREE.DataTexture(padded_data,
        texture_shape[0], texture_shape[1],
        format, type,
        undefined,
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
        // TODO: Could make linear/nearest filtering of lut an encoding parameter
        THREE.LinearFilter, THREE.LinearFilter);

    return texture;
}

function update_array_texture(texture, data) {
    try {
        // Note that input data may be Int32Array or Uint32Array
        // here while image.data is currently always Float32Array
        // (see allocate_array_texture) because webgl doesn't support
        // large integer textures, but this .set operation still works
        // fine and doubles as type casting the data before uploading.
        texture.image.data.set(data);
    } catch(e) {
        console.error("failed to update texture");
    }
    texture.needsUpdate = true;
}

function update_lut(uniform, new_value, item_size, dtype) {
    const dim = new_value.length / item_size;
    if (!uniform.value) {
        uniform.value = allocate_lut_texture(dtype, item_size, [dim, 1]);
    } else if (uniform.value.image.width !== dim) {
        // TODO: Should we deallocate the gl texture via uniform.value somehow?
        uniform.value = allocate_lut_texture(
            dtype, item_size, [dim, 1]);
    }
    update_array_texture(uniform.value, new_value);
}

function allocate_value(item_size) {
    switch (item_size)
    {
    case 1:
        return 0;
    case 2:
        return new THREE.Vector2();
    case 3:
        return new THREE.Vector3();
    case 4:
        return new THREE.Vector4();
    case 9:
        return new THREE.Matrix3();
    case 16:
        return new THREE.Matrix4();
    default:
        throw { message: 'Invalid item size', item_size: item_size };
    }
}

function update_uniform_value(uniform, new_value) {
    if (typeof uniform.value === "number") {
        uniform.value = new_value;
    } else if (uniform.value.isVector2) {  // TODO: Clean up this verbosity, did this to get rid of some errors quickly
        uniform.value.set(new_value[0], new_value[1]);
    } else if (uniform.value.isVector3) {
        uniform.value.set(new_value[0], new_value[1], new_value[2]);
    } else if (uniform.value.isVector4) {
        uniform.value.set(new_value[0], new_value[1], new_value[2], new_value[3]);
    } else if (uniform.value.isVector2 || uniform.value.isVector3 || uniform.value.isVector4) {
        uniform.value.set(...new_value);
    } else if (uniform.value.isMatrix3 || uniform.value.isMatrix4) {
        uniform.value.set(...new_value);
    } else if (uniform.value.isColor) {
        // TODO: Consider better color handling
        if (new_value.isColor || typeof new_value === "string") {
            uniform.value.set(new_value);
        } else {
            // Assuming rgb triplet
            uniform.value.setRGB(new_value[0], new_value[1], new_value[2]);
        }
        // uniform.value.setHSL(...new_value);  // hsl triplet
    } else {
        console.warn("Unexpected uniform type " + (typeof uniform.value));
        uniform.value = new_value;
    }
}

function sort_cells(ordering, cells, coordinates, camera_position, view_direction) {
    /*
    const num_tetrahedrons = cells.length / 4;
    for (let i = 0; i < num_tetrahedrons; ++i) {
        ordering[i] = i;
    }
    */

    // TODO: Compute a better perspective dependent ordering using topology

    // Naively sort by smallest distance to camera
    ordering.sort((i, j) => {
        const min_dist = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
        const indices = [i, j];
        for (let r = 0; r < 2; ++r) {
            const local_vertices = cells[indices[r]]
            for (let k = 0; k < 4; ++k) {
                const offset = 3*local_vertices[k];
                let dist = 0.0;
                for (let s = 0; s < 3; ++s) {
                    const dx = coordinates[offset+s] - camera_position[s];
                    // With orthographic camera and constant view direction
                    dist += view_direction[s] * dx;
                    // With perspective camera, use only distance to camera
                    //dist += dx*dx;
                }
                // Take distance from vertex with smallest distance
                // (could also use midpoint)
                min_dist[r] = Math.min(dist, min_dist[r]);
            }
        }
        if (min_dist[0] === min_dist[1]) {
            return 0;
        } else if (min_dist[0] < min_dist[1]) {
            return -1;
        } else {
            return +1;
        }
    });
}


function default_uniforms() {
    // Fill uniforms dict with dummy values
    const groups = {
        time: {
            u_time: { value: 0.0 },
            u_oscillators: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },
        },
        view: {
            u_local_view_direction: { value: new THREE.Vector3(0, 0, 1) },
            u_local_camera_position: { value: new THREE.Vector3(0, 0, 0) },
            u_mvp_matrix: { value: new THREE.Matrix4() },
        },
        light: {
            u_emission_color: { value: new THREE.Color(0.8, 0.8, 0.8) },
            u_emission_intensity_range: { value: new THREE.Vector2(0.5, 1.0) },
            u_exposure: { value: 1.0 },
            u_extinction: { value: 1.0 },
        },
        wireframe: {
            u_wireframe_color: { value: new THREE.Color(0.1, 0.1, 0.1) },
            u_wireframe_alpha: { value: 0.7 },
            u_wireframe_size: { value: 0.001 },
        },
        isosurface: {
            u_isorange: { value: new THREE.Vector2(0.0, 1.0) },
        },
        mesh: {
            t_cells: { value: null },
            t_coordinates: { value: null },
            u_cell_texture_shape: { value: [0, 0] },
            u_vertex_texture_shape: { value: [0, 0] },
        },
        indicators: {
            // Integer indicator values
            t_cell_indicators: { value: null },
            // Value to enable
            u_cell_indicator_value: { value: 1 },
            // Color/toggle lookup table
            // t_indicator_lut: { value: null },
        },
        density: {
            // Function values
            t_density: { value: null },
            // Range [min, max, max-min, 1.0/(max-min) or 1]
            u_density_range: { value:  new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
            // Scalar lookup table
            t_density_lut: { value: null },
        },
        emission: {
            // Function values
            t_emission: { value: null },
            // Range [min, max, max-min, 1.0/(max-min) or 1]
            u_emission_range: { value: new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
            // Color lookup table
            t_emission_lut: { value: null },
        },
    };
    const all = Object.assign({}, ...Object.values(groups));

    return all;
}


// TODO: Use this in prerender and improve sorting
// when unsorted methods are working well
function update_ordering(geometry, material) {
    const u = material.uniforms;

    // TODO: Benchmark use of reordering array vs reordering
    //       cell data and uploading those larger buffers.
    const dir = u.u_local_view_direction.value;

    // Get cells and coordinates from texture data
    const cells = u.t_cells.value.image.data;
    const coordinates = u.t_coordinates.value.image.data;

    // NB! Number of cells === ordering.array.length,
    // !== cells.length / 4 which includes texture padding.

    // Compute cell reordering in place in geometry attribute array
    const ordering = geometry.attributes.c_ordering;
    sort_cells(ordering.array, cells, coordinates, dir);
    ordering.needsUpdate = true;
}

function create_geometry(sorted, cells, coordinates) {
    // Assuming tetrahedral mesh
    const num_tetrahedrons = cells.length / 4;

    // Reorient tetrahedral cells (NB! this happens in place!)
    // TODO: We want cells to be reoriented _once_ if they're
    //       reused because this is a bit expensive
    reorient_tetrahedron_cells(cells, coordinates);

    // Configure instanced geometry, each tetrahedron is an instance
    const geometry = create_instanced_tetrahedron_geometry(num_tetrahedrons);

    // Setup cells of geometry (using textures or attributes)
    if (sorted) {
        // Need ordering, let ordering be instanced and read cells from texture
        // Initialize ordering array with contiguous indices,
        // stored as floats because webgl2 is required for integer attributes.
        // When assigned a range of integers, the c_ordering instance attribute
        // can be used as a replacement for gl_InstanceID which requires webgl2.
        const attrib = create_cell_ordering_attribute(num_tetrahedrons);
        geometry.addAttribute("c_ordering", attrib);
    } else {
        // Don't need ordering, pass cells as instanced buffer attribute instead
        const attrib = create_cells_attribute(cells);
        geometry.addAttribute("c_cells", attrib);
    }

    // Compute bounding box and sphere and set on geometry so
    // they become available to generic THREE.js code
    geometry.boundingSphere = create_bounding_sphere(coordinates);
    geometry.boundingBox = create_bounding_box(coordinates);

    return geometry;
}

function create_material(method, encoding, uniforms) {
    // TODO: Force turning on depthTest if there's something else opaque in the scene like axes
    // TODO: May also add defines based on encoding if necessary
    // if encoding specifies density or emission, add defines:
    //     ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
    //     ENABLE_DENSITY_BACK: 1,
    const mp = method_properties[method];
    const defines = mp.defines;
    
    const material_config = {
        // Note: Assuming passing some unused uniforms here will work fine
        // without too much performance penalty, hopefully this is ok
        // as it allows us to share the uniforms dict between methods.
        uniforms: uniforms,
        vertexShader: vertex_shader,
        fragmentShader: fragment_shader,
        side: mp.side,
        transparent: mp.transparent,
        depthTest: true,
        depthWrite: mp.depth_write,
    };

    // Configure shader
    const material = new THREE.ShaderMaterial(material_config);

    // Configure blending
    if (mp.blending === THREE.CustomBlending) {
        material.blending = mp.blending;
        material.blendEquation = mp.blend_equation;
        material.blendSrc = mp.blend_src;
        material.blendDst = mp.blend_dst;
    }

    // Not using the fog feature
    material.fog = false;

    // Apply method #defines to shaders
    material.defines = defines;

    // Some extensions need to be explicitly enabled
    material.extensions.derivatives = true;

    // How to use wireframe natively in THREE.js
    // material.wireframe = true;
    // material.wireframeLinewidth = 3;

    return material;
}

function allocate_textures_and_buffers(method, encoding, data, uniforms) {
    // The current implementation assumes:
    // - Each channel has only one possible association

    const mp = method_properties[method];

    const channels = mp.channels;

    // Copy and override defaults with provided values
    encoding = extend2(mp.default_encoding, encoding);

    const cell_texture_shape = uniforms.u_cell_texture_shape.value;
    const vertex_texture_shape = uniforms.u_vertex_texture_shape.value;

    const uniform_prefix = {
        constant: "u_",
        vertex: "t_",
        cell: "t_",
        lut: "t_"
    };

    // Process all passed channel
    for (let channel_name in channels) {
        // Get channel description
        const channel = channels[channel_name];
        if (channel === undefined) {
            console.error(`Channel ${channel_name} is missing description.`);
            continue;
        }

        // Get encoding for this channel
        const enc = encoding[channel_name];
        if (enc === undefined) {
            console.error(`No encoding found for channel ${channel_name}.`);
            continue;
        }

        // Default association in channel, can override in encoding
        const association = enc.association || channel.association;
        const uniform_name = uniform_prefix[association] + channel_name;
        const uniform = uniforms[uniform_name];

        if (uniform && !uniform.value) {
            switch (association) {
            case "constant":
                // TODO: Allocating uniform shared between methods using
                // channel data which may conceptually differe between method,
                // not the best possible design
                uniform.value = allocate_value(channel.item_size);
                break;
            case "vertex":
                uniform.value = allocate_array_texture(
                    channel.dtype, channel.item_size,
                    vertex_texture_shape);
                break;
            case "cell":
                // Maybe we want to allocate or allow allocation for both the sorted and unsorted case,
                // to quickly switch between methods e.g. during camera rotation.
                uniform.value = allocate_array_texture(
                    channel.dtype, channel.item_size,
                    cell_texture_shape);
                break;
                // TODO: Currently always placing cell data as textures,
                // update this for cell data as instance attributes when needed.
                // Shaders should in principle be ready for this by undefining ENABLE_CELL_ORDERING

                // FIXME: Design issue: creating the geometry depends on the
                // InstancedBufferAttribute being allocated already which
                // depends on the data which hasn't necessarily been set yet
                // var upload_as_instanced_buffer = false;
                // if (upload_as_instanced_buffer && new_value) {
                //     let attrib = this.attributes["c_" + channel_name];
                //     if (!attrib) {
                //         // Allocate instanced buffer attribute
                //         // TODO: Should we copy the new_value here?
                //         attrib = new THREE.InstancedBufferAttribute(new_value, channel.item_size, 1);
                //         //attrib.setDynamic(true);
                //         this.attributes["c_" + channel_name] = attrib;
                //     } else {
                //         // Update contents of instanced buffer attribute
                //         attrib.array.set(new_value);
                //         attrib.needsUpdate = true;
                //     }
                // }
            case "lut":
                break;
            default:
                console.error(`Unknown association ${association}.`);
            }
        }
    }
}

// Upload data, assuming method has been configured
function upload_data(method, encoding, data, uniforms) {
    // The current implementation assumes:
    // - Each channel has only one possible association

    const mp = method_properties[method];

    const channels = mp.channels;

    // Copy and override defaults with provided values
    encoding = extend2(mp.default_encoding, encoding);

    const uniform_prefix = {
        constant: "u_",
        vertex: "t_",
        cell: "t_",
        lut: "t_"
    };

    // Process all channels
    for (let channel_name in channels) {
        // Get channel description
        const channel = channels[channel_name];
        if (channel === undefined) {
            console.warn(`Channel ${channel_name} is missing description.`);
            continue;
        }

        // Get encoding for this channel
        const enc = encoding[channel_name];
        if (enc === undefined) {
            console.warn(`No encoding found for channel ${channel_name}.`);
            continue;
        }

        // Get new data value either from data or from encoding
        const new_value = enc.field ? data[enc.field]: enc.value;
        if (new_value === undefined) {
            console.log(`No data found for field ${enc.field} encoded for channel ${channel_name}.`);
            continue;
        }

        // Default association in channel, can override in encoding
        // (TODO: The idea here was to be able to select vertex/cell
        // association for fields, figure out a better design for that)
        const association = enc.association || channel.association;
        const uniform_name = uniform_prefix[association] + channel_name;

        switch (association) {
        case "constant":
            // TODO: Revisit specification of uniform value types in encoding/channels/data
            update_uniform_value(uniforms[uniform_name], new_value);
            break;
        case "vertex":
            update_array_texture(uniforms[uniform_name].value, new_value);
            break;
        case "cell":
            //if (sorted) {
            update_array_texture(uniforms[uniform_name].value, new_value);
            //} else {
            //     update instance buffer  // FIXME: See allocate()
            //}
            break;
        case "lut":
            update_lut(uniforms[uniform_name], new_value, channel.item_size, channel.dtype);
            break;
        default:
            console.warn("unknown association " + association);
        }

        // Update associated data range
        if (enc.range !== undefined) {
            let newrange = null;
            if (enc.range === "auto") {
                newrange = compute_range(new_value);
            } else  {
                newrange = enc.range;
            }
            if (newrange !== null) {
                newrange = extended_range(...newrange);
                const range_name = "u_" + channel_name + "_range";
                if (uniforms.hasOwnProperty(range_name)) {
                    uniforms[range_name].value.set(...newrange);
                }
            }
        }
    }
}

function create_uniforms(method, encoding, data, num_tetrahedrons, num_vertices) {
    // Initialize new set of uniforms
    const uniforms = default_uniforms();

    // Compute suitable 2D texture shapes large enough
    // to hold this number of values
    const cell_texture_shape = compute_texture_shape(num_tetrahedrons);
    const vertex_texture_shape = compute_texture_shape(num_vertices);

    // Store in uniforms
    [...uniforms.u_cell_texture_shape.value] = cell_texture_shape;
    [...uniforms.u_vertex_texture_shape.value] = vertex_texture_shape;

    // Allocate various textures and buffers (needs the shapes assigned above)
    // (NB! mutates uniforms)
    allocate_textures_and_buffers(method, encoding, data, uniforms);

    // Upload more data
    // (NB! mutates uniforms)
    upload_data(method, encoding, data, uniforms);

    return uniforms;
}

function prerender_update(renderer, scene, camera, geometry, material, group, mesh) {
    //console.log("In prerender_update", {renderer, scene, camera, geometry, material, group, mesh});
    console.log("In prerender_update", camera.getWorldPosition());

    // Just in time updates of uniform values
    const u = material.uniforms;

    // FIXME: Get actual time from some start point in seconds,
    // or make it a parameter to be controlled from the outside
    const time = 0.0;
    u.u_time.value = time;

    for (let i=0; i<4; ++i) {
        u.u_oscillators.value.setComponent(i, Math.sin((i+1) * Math.PI * time));
    }

    // TODO: Are all these up to date here? Need to call any update functions?
    // mesh.matrixWorld
    // camera.matrixWorldInverse
    // camera.projectionMatrix

    // Get and precompute some transforms
    const M = mesh.matrixWorld;  // maps from object space to world space
    const V = camera.matrixWorldInverse; // maps from world space to camera space
    const P = camera.projectionMatrix; // maps from camera space to clip coordinates

    const Minv = new THREE.Matrix4(); // maps from world space to object space
    Minv.getInverse(M);
    // const Vinv = new THREE.Matrix4(); // maps from camera space to world space
    // Vinv.getInverse(V);
    // const MVinv = new THREE.Matrix4(); // maps from camera space to object space
    // MVinv.getInverse(MV);

    // Transform camera direction from world coordinates to object space
    // (only used for orthographic projection)
    const local_view_direction = u.u_local_view_direction.value;
    camera.getWorldDirection(local_view_direction);
    local_view_direction.applyMatrix4(Minv); // map from world space to object space

    // Transform camera position from world coordinates to object space
    const local_camera_position = u.u_local_camera_position.value;
    camera.getWorldPosition(local_camera_position);
    local_camera_position.applyMatrix4(Minv); // map from world space to object space

    // Compute entire MVP matrix
    const MV = new THREE.Matrix4(); // maps from object space to camera space
    MV.multiplyMatrices(V, M);
    const MVP = u.u_mvp_matrix.value; // maps from object space to clip space
    MVP.multiplyMatrices(P, MV);
}

function create_mesh(method, encoding, data) {
    // Tetrahedral mesh data is required and assumed to be present at this point
    const cells = data[encoding.cells.field];
    const coordinates = data[encoding.coordinates.field];
    const num_vertices = coordinates.length / 3;
    const num_tetrahedrons = cells.length / 4;

    // Initialize geometry
    // FIXME: Enable the non-sorted branch
    const sorted = true || method_properties[method].sorted;
    const geometry = create_geometry(sorted, cells, coordinates);

    // Initialize uniforms, including textures
    const uniforms = create_uniforms(method, encoding, data, num_tetrahedrons, num_vertices);

    // Configure material (shader)
    const material = create_material(method, encoding, uniforms);

    // Finally we have a Mesh to render for this method
    const mesh = new THREE.Mesh(geometry, material);
    mesh.setDrawMode(THREE.TriangleStripDrawMode);

    mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
        prerender_update(renderer, scene, camera, geometry, material, group, mesh);
    };

    // If needed, we can attach properties to the mesh.userData object:
    //Object.assign(mesh.userData, { method, encoding });

    return mesh;
}

function add_debugging_geometries(root, mesh) {
    // Add a bounding sphere representation to root for debugging
    // root.add(create_bounding_sphere_geometry(mesh.geometry.boundingSphere, 1.1));

    // Add a bounding box representation to root for debugging
    // root.add(create_bounding_box_geometry(mesh.geometry.boundingBox, 1.1));

    // Add a bounding box midplane representation to root for debugging
    // root.add(create_bounding_box_midplanes_geometry(mesh.geometry.boundingBox, 1.1));

    // Add a bounding box wireframe representation to root for debugging
    root.add(create_bounding_box_axis_geometry(mesh.geometry.boundingBox, 1.1));

    // Add a sphere representation of center for debugging
    // const sphere = mesh.geometry.boundingSphere.clone();
    // sphere.radius *= 0.05;
    // root.add(create_bounding_sphere_geometry(sphere));
}

class UnrayStateWrapper {
    init(root, method, encoding, data) {
        // Select method-specific background color
        // TODO: How to deal with this when adding to larger scene?
        //       I guess it will be up to the user.
        //       Alternatively, could add a background box of the right color.
        this.bgcolor = method_properties[method].background || new THREE.Color(1, 1, 1);

        const mesh = create_mesh(method, encoding, data);

        root.add(mesh);

        this.root = root;
        add_debugging_geometries(root, mesh);
    }

    update(changed) {
        // for (let name in changed) {
        //     this.channel_update(name)(changed[name]);
        // }
    }

    // Select method-specific background color
    // Currently called by figure, TODO: remove when using pythreejs renderer
    get_bgcolor() {
        return this.bgcolor;
    }
}

function create_unray_state(root, method, encoding, data) {
    const state = new UnrayStateWrapper();
    state.init(root, method, encoding, data);
    // console.log("////////////////////////////////");
    // console.log("Created unray state:");
    // console.log(state);
    // console.log("////////////////////////////////");
    return state;
}

export {
    create_unray_state
};
