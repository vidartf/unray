'use strict';

//import _ from 'underscore';

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
    constant_color:       { association: "constant",  dtype: "float32", item_size: 3 }, // color
    isorange:             { association: "constant",  dtype: "float32", item_size: 2 }, // vec2
    particle_area:        { association: "constant",  dtype: "float32", item_size: 1 }, // float
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
    constant_color:       { value: new THREE.Color(0.8, 0.8, 0.8) },
    isorange:             { value: new THREE.Vector2(0.2, 0.8) },
    particle_area:        { value: 1.0 },
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
    return {
        // Time and oscillators (updated in update_time())
        u_time: { value: 0.0 },
        u_oscillators: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },

        // Camera uniforms (updated in update_perspective(), threejs provides cameraPosition)
        u_view_direction: { value: new THREE.Vector3(0, 0, 1) },

        // Light uniforms
        u_light_floor: { value: 0.5 },

        // Input constants (u_foo is updated in upload() based on
        // encoding.foo.value, but only if foo is present in channels,
        // with default value set in the default encoding)
        u_cell_indicator_value: { value: 1 },

        u_constant_color: { value: new THREE.Color(0.8, 0.8, 0.8) },

        u_exposure: { value: 1.0 },

        u_wireframe_color: { value: new THREE.Color(0.1, 0.1, 0.1) },
        u_wireframe_alpha: { value: 0.7 },
        u_wireframe_size: { value: 0.001 },

        u_isorange: { value: new THREE.Vector2(0.0, 1.0) },

        u_particle_area: { value: 1.0 },

        // Input data ranges (u_foo_range is updated in upload() based on encoding.foo.range attribute)
        // The 4 values are: [min, max, max-min, 1.0/(max-min) or 1]
        u_density_range: { value:  new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
        u_emission_range: { value: new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },

        // Texture dimensions (set in init() based on given mesh size)
        u_cell_texture_shape: { value: [0, 0] },
        u_vertex_texture_shape: { value: [0, 0] },

        // Cell textures (updated in upload() based on encoding)
        t_cells: { value: null },
        t_cell_indicators: { value: null },

        // Vertex textures (updated in upload() based on encoding)
        t_coordinates: { value: null },
        t_density: { value: null },
        t_emission: { value: null },

        // LUT textures (updated in upload() based on encoding)
        t_density_lut: { value: null },
        t_emission_lut: { value: null },
        //t_indicator_lut: { value: null },
        //t_isosurface_lut: { value: null },
    };
}

class TetrahedralMeshRenderer {
    constructor() {}

    update_perspective(camera, geometry, material) {
        // TODO: When using three.js scenegraph, probably need
        // to distinguish better between model and world coordinates
        // in various places
        //camera.getWorldPosition(this.camera_position);

        const dir = material.uniforms.u_view_direction.value;
        camera.getWorldDirection(dir);

        // TODO: Upload full MVP matrix here to uniforms
        //       instead of multiplying in vertex shader

        // TODO: Enable and improve sorting when other methods are working
        if (0) {
            // TODO: Benchmark use of reordering array vs reordering
            //       cell data and uploading those larger buffers.

            // Get cells and coordinates from texture data
            const cells = material.uniforms.t_cells.value.image.data;
            const coordinates = material.uniforms.t_coordinates.value.image.data;

            // NB! Number of cells === ordering.array.length,
            // !== cells.length / 4 which includes texture padding.

            // Compute cell reordering in place in geometry attribute array
            const ordering = geometry.attributes.c_ordering;
            sort_cells(ordering.array, cells, coordinates, dir);
            ordering.needsUpdate = true;
        }
    }

    update_time(time, geometry, material) {
        material.uniforms.u_time.value = time;
        for (let i=0; i<4; ++i) {
            material.uniforms.u_oscillators.value.setComponent(i, Math.sin((i+1) * Math.PI * time));
        }
    }

    // add_cell_attribute(geometry, channel_name, attribute) {
    //     geometry.addAttribute("c_" + channel_name, attribute);
    // }

    // add_cell_data() {
    //     // let cell_data_channels = ["cells"];
    //     const cell_data_channels = [];
    //     for (let channel_name of cell_data_channels) {
    //         const attrib = this.attributes["c_" + channel_name];
    //         add_cell_attribute(geometry, channel_name, attrib);
    //     }
    // }

    create_material(method, encoding, uniforms) {
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

    allocate(method, encoding, data, uniforms) {
        // The current implementation assumes:
        // - Each channel has only one possible association

        const mp = method_properties[method];

        const channels = mp.channels;

        // Copy and override defaults with provided values
        encoding = extend2(mp.default_encoding, encoding);

        // console.log("Encoding:", encoding)
        // console.log("channels:", channels)

        // Process all passed channel
        for (let channel_name in channels) {
            // Get channel description
            const channel = channels[channel_name];

            // Get encoding for this channel
            const enc = encoding[channel_name];

            // Some sanity checks
            if (channel === undefined) {
                console.error(`Channel ${channel_name} is missing description.`);
                continue;
            }
            if (enc === undefined) {
                console.error(`No encoding found for channel ${channel_name}.`);
                continue;
            }

            // Default association in channel, can override in encoding
            const association = enc.association || channel.association;
            const uniform_prefix = {
                constant: "u_",
                vertex: "t_",
                cell: "t_",
                lut: "t_"
            };
            const uniform_name = uniform_prefix[association] + channel_name;
            const uniform = uniforms[uniform_name];

            if (uniform && !uniform.value) {
                let new_uniform_value = null;
                switch (association) {
                case "constant":
                    // TODO: Allocating uniform shared between methods using
                    // channel data which may conceptually differe between method,
                    // not the best possible design
                    new_uniform_value = allocate_value(channel.item_size);
                    break;
                case "vertex":
                    new_uniform_value = allocate_array_texture(
                        channel.dtype, channel.item_size,
                        uniforms.u_vertex_texture_shape.value);
                    break;
                case "cell":
                    // Maybe we want to allocate or allow allocation for both the sorted and unsorted case,
                    // to quickly switch between methods e.g. during camera rotation.
                    new_uniform_value = allocate_array_texture(
                        channel.dtype, channel.item_size,
                        uniforms.u_cell_texture_shape.value);
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
                // console.log("Setting new uniform value: ", uniform_name, new_uniform_value);
                uniform.value = new_uniform_value;
            }
        }
    }

    // Upload data, assuming method has been configured
    upload(method, encoding, data, uniforms) {
        // The current implementation assumes:
        // - Each channel has only one possible association

        const mp = method_properties[method];

        const channels = mp.channels;

        // Copy and override defaults with provided values
        encoding = extend2(mp.default_encoding, encoding);

        // Process all channels
        for (let channel_name in channels) {
            // Get channel description
            const channel = channels[channel_name];

            // Get encoding for this channel
            const enc = encoding[channel_name];

            // Sanity checks
            if (channel === undefined) {
                console.warn(`Channel ${channel_name} is missing description.`);
                continue;
            }
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
            let uniform = null;
            switch (association) {
            case "constant":
                // TODO: Revisit specification of uniform value types in encoding/channels/data
                uniform = uniforms["u_" + channel_name];
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
                    console.warn("Unexpected uniform type " + (typeof uniform.value) + " for channel " + channel_name);
                    uniform.value = new_value;
                }
                break;
            case "vertex":
                uniform = uniforms["t_" + channel_name];
                update_array_texture(uniform.value, new_value);
                break;
            case "cell":
                // if (mp.sorted) {
                uniform = uniforms["t_" + channel_name];
                if (channel_name === "cells") {
                    console.log("Cells: ", uniform.value, new_value);
                }
                update_array_texture(uniform.value, new_value);
                // } else {
                //     update instance buffer  // FIXME: See allocate()
                // }
                break;
            case "lut":
                var dim = new_value.length / channel.item_size;
                uniform = uniforms["t_" + channel_name];
                if (!uniform.value) {
                    uniform.value = allocate_lut_texture(
                        channel.dtype, channel.item_size, [dim, 1]);
                } else if (uniform.value.image.width !== dim) {
                    // TODO: Should we deallocate the gl texture via uniform.value somehow?
                    uniform.value = allocate_lut_texture(
                        channel.dtype, channel.item_size, [dim, 1]);
                }
                update_array_texture(uniform.value, new_value);
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

    create_uniforms(method, encoding, data, num_tetrahedrons, num_vertices) {
        // Initialize new set of uniforms
        const uniforms = default_uniforms();

        // Compute suitable 2D texture shapes large enough
        // to hold this number of values and store in uniforms
        [...uniforms.u_cell_texture_shape.value] = compute_texture_shape(num_tetrahedrons);

        // Compute suitable 2D texture shapes large enough
        // to hold this number of values and store in uniforms
        [...uniforms.u_vertex_texture_shape.value] = compute_texture_shape(num_vertices);

        // Allocate various textures and buffers (needs the shapes assigned above)
        this.allocate(method, encoding, data, uniforms);

        // Upload more data
        this.upload(method, encoding, data, uniforms);

        return uniforms;
    }

    create_geometry(sorted, cells, coordinates) {
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

    create_mesh(method, encoding, data) {
        // Mesh data is required and assumed to be present at this point
        const cells = data[encoding.cells.field];
        const coordinates = data[encoding.coordinates.field];

        // Assuming tetrahedral mesh
        const num_vertices = coordinates.length / 3;
        const num_tetrahedrons = cells.length / 4;

        // Initialize geometry
        // FIXME: Enable the non-sorted branch
        const sorted = true || method_properties[method].sorted;
        const geometry = this.create_geometry(sorted, cells, coordinates);

        // Initialize uniforms, including textures
        const uniforms = this.create_uniforms(method, encoding, data, num_tetrahedrons, num_vertices);

        // Configure material (shader)
        const material = this.create_material(method, encoding, uniforms);

        // Finally we have a Mesh to render for this method
        const mesh = new THREE.Mesh(geometry, material);
        mesh.setDrawMode(THREE.TriangleStripDrawMode);
        return mesh;
    }
};


class UnrayStateWrapper {
    constructor(root, initial) {
        this.root = root;
        this.init(initial);
    }

    // sketch() {
    //     // encoding === initial

    //     // Scalar spaces:
    //     //   number(dtype), vecN(dtype), matMN(dtype), color
    //     // Distributed to each:
    //     //   global | cell | vertex

    //     const channelname = "color";

    //     const encoding_entry = {
    //         entity: "global", // space enum: "global" | "cell" | "vertex"
    //         value: "#ff0000", // constant value if global | field (nd)array
    //         field: "08jniqjdhc09u2", // null | field id
    //     };

    //     const encoding = {
    //         channelname: encoding_entry,
    //     };
    // }

    init_new(initial) {
        const {data, plotname, plots} = initial;
        //encoding.cells.field;
    }

    init(initial) {
        const {data, plotname, plots} = initial;
        const plot = plots[plotname];
        const method = plot ? plot.get("method") : "surface";
        const encoding = plot ? plot.get("encoding") : undefined;

        // Check mesh dimensions
        if (data.coordinates.get("array").shape[1] !== 3) {
            console.error("Shape error in coordinates", data.coordinates);
        }
        if (data.cells.get("array").shape[1] !== 4) {
            console.error("Shape error in cells", data.cells);
        }

        // Get raw data arrays from dict of data models
        const raw_data = {};
        for (let name in data) {
            // Get the typedarray of the ndarray of the datamodel...
            const arr = data[name].get("array");
            raw_data[name] = arr.data;
        }

        // Setup state with old code (under refactoring)
        const tetrenderer = new TetrahedralMeshRenderer();
        const mesh = tetrenderer.create_mesh(method, encoding, raw_data);

        // Add some things to this (internal state is under heavy refactoring)
        Object.assign(this, {method, tetrenderer});

        // Add mesh to root
        this.root.add(mesh);

        // Register hook for updates before rendering
        mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            // FIXME: Set camera and time uniforms directly in material.uniforms here
            this.prerender(camera, geometry, material);
        };

        // Add a bounding sphere representation to root for debugging
        if (0) {
            this.root.add(create_bounding_sphere_geometry(mesh.geometry.boundingSphere, 1.1));
        }
        // Add a bounding box representation to root for debugging
        if (0) {
            this.root.add(create_bounding_box_geometry(mesh.geometry.boundingBox, 1.1));
        }
        // Add a bounding box midplane representation to root for debugging
        if (0) {
            this.root.add(create_bounding_box_midplanes_geometry(mesh.geometry.boundingBox, 1.1));
        }
        // Add a bounding box wireframe representation to root for debugging
        if (1) {
            this.root.add(create_bounding_box_axis_geometry(mesh.geometry.boundingBox, 1.1));
        }
        // Add a sphere representation of center for debugging
        if (0) {
            const sphere = mesh.geometry.boundingSphere.clone();
            sphere.radius *= 0.05;
            this.root.add(create_bounding_sphere_geometry(sphere));
        }
    }

    update(changed) {
        // for (let name in changed) {
        //     this.channel_update(name)(changed[name]);
        // }
    }

    // TODO: Alternative to update_time + update_perspective,
    // to be called before doing renderer.render(scene, camera)
    prerender(camera, geometry, material) {
        const time = 0.0; // fixme
        this.tetrenderer.update_time(time, geometry, material);
        this.tetrenderer.update_perspective(camera, geometry, material);
    }

    // Select method-specific background color
    // TODO: How to deal with this when adding to larger scene?
    get_bgcolor() {
        return method_properties[this.method].background || new THREE.Color(1, 1, 1);
    }

    // TODO: Remove this later, not needed
    get_radius() {
        const mesh = this.root.children[0];
        return mesh.geometry.boundingSphere.radius;
    }

    // TODO: Remove this later, not needed
    get_center() {
        const mesh = this.root.children[0];
        return mesh.geometry.boundingSphere.center.clone();
    }
}

function create_unray_state(root, attributes) {
    const state = new UnrayStateWrapper(root, attributes);
    // console.log("////////////////////////////////");
    // console.log("Created unray state:");
    // console.log(state);
    // console.log("////////////////////////////////");
    return state;
}

export {
    create_unray_state
};
