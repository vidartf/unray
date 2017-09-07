'use strict';

import _ from 'underscore';

import {
    extend2
} from './utils.js';

import {
    reorient_tetrahedron_cells
} from "./meshutils";

import {
    compute_range, extended_range, compute_texture_shape,
    allocate_lut_texture, allocate_array_texture,
    update_lut, update_array_texture
} from "./threeutils";

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

import { create_three_objects } from "./channels.js";

import {THREE} from './threeimport';


// TODO: Improve and document channel specifications
const default_channels = {
    cells:                { association: "cell",            dtype: "int32",   item_size: 4 },
    coordinates:          { association: "vertex",          dtype: "float32", item_size: 3 },
    // ordering:          { association: "cell",            dtype: "int32",   item_size: 1 },

    cell_indicators:      { association: "cell",            dtype: "int32",   item_size: 1 },
    cell_indicator_value: { association: "constant",  dtype: "int32",   item_size: 1 }, // int

    emission:             { association: "vertex",          dtype: "float32", item_size: 1 },
    emission_lut:         { association: "lut",             dtype: "float32", item_size: 3 },
    emission_color:       { association: "constant",  dtype: "float32", item_size: 3 }, // color

    density:              { association: "vertex",          dtype: "float32", item_size: 1 },
    density_lut:          { association: "lut",             dtype: "float32", item_size: 1 },
    extinction:           { association: "constant",  dtype: "float32", item_size: 1 }, // float

    isorange:             { association: "constant",  dtype: "float32", item_size: 2 }, // vec2
};

// TODO: Improve and document encoding specifications, look at vega for ideas
// TODO: Let default encodings differ per method
const default_encoding = {
    cells:           { field: "cells" },
    coordinates:     { field: "coordinates" },
    // ordering:       { field: "ordering" },

    cell_indicators: { field: "cell_indicators" },
    cell_indicator_value: { value: 1 },
    
    emission:        { field: "emission", range: "auto" },
    emission_lut:    { field: "emission_lut" },
    emission_color:       { value: new THREE.Color(0.8, 0.8, 0.8) },

    density:         { field: "density", range: "auto" },
    density_lut:     { field: "density_lut" },

    extinction:           { value: 1.0 },
    isorange:             { value: new THREE.Vector2(0.2, 0.8) },
    //wireframe:    { enable: false, size: 0.001, color: "#000000", opacity: 1.0, decay: 0.5 },
    //isosurface:   { mode: "single", value: "auto", num_intervals: 0, spacing: 1.0, period: 3.0 }
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


const method_defines = {
    mesh: Object.assign({}, default_defines, {
        ENABLE_SURFACE_MODEL: 1,
        ENABLE_WIREFRAME: 1,
        ENABLE_SURFACE_LIGHT: 1,
    }),
    cells: Object.assign({}, default_defines, {
        ENABLE_SURFACE_MODEL: 1,
        ENABLE_EMISSION: 1,
        // TODO: decide on meaning of indicator values
        ENABLE_CELL_INDICATORS: 1, // TODO: Set this if the encoding channel has data
        ENABLE_WIREFRAME: 1,
        ENABLE_SURFACE_LIGHT: 1,
    }),
    surface: Object.assign({}, default_defines, {
        ENABLE_SURFACE_MODEL: 1,
        ENABLE_EMISSION: 1,
        ENABLE_SURFACE_LIGHT: 1,
    }),
    surface_depth: Object.assign({}, default_defines, {
        ENABLE_SURFACE_DEPTH_MODEL: 1,
    }),
    isosurface: Object.assign({}, default_defines, {
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
    max2: Object.assign({}, default_defines, {
        ENABLE_MAX_MODEL: 1,
        ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
        ENABLE_EMISSION_BACK: 1,
    }),
    max: Object.assign({}, default_defines, {
        ENABLE_MAX_MODEL: 1,
        ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
        // ENABLE_EMISSION_BACK: 1,
    }),
    min2: Object.assign({}, default_defines, {
        ENABLE_MIN_MODEL: 1,
        ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
        ENABLE_EMISSION_BACK: 1,
    }),
    min: Object.assign({}, default_defines, {
        ENABLE_MIN_MODEL: 1,
        ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
        // ENABLE_EMISSION_BACK: 1,
    }),
    xray: Object.assign({}, default_defines, {
        ENABLE_XRAY_MODEL: 1,
        ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
        // ENABLE_DENSITY_BACK: 1,
    }),
    xray2: Object.assign({}, default_defines, {
        ENABLE_XRAY_MODEL: 1,
        ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
        ENABLE_DENSITY_BACK: 1,
    }),
    sum: Object.assign({}, default_defines, {
        ENABLE_SUM_MODEL: 1,
        ENABLE_EMISSION: 1,        // TODO: It might make sense to use emission OR density here?
        ENABLE_EMISSION_BACK: 1,
    }),
    volume: Object.assign({}, default_defines, {
        ENABLE_VOLUME_MODEL: 1,
        ENABLE_DENSITY: 1,      // TODO: All combinations of density/emission with/without backside are valid.
        ENABLE_EMISSION: 1,
        ENABLE_DENSITY_BACK: 1,
        ENABLE_EMISSION_BACK: 1,
    }),
};


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

// Generate definitions like 'uniform vec3 u_foo;' for an
// object containing types keyed by variable name { u_foo: "vec3" }
function generate_declarations(gltypes, prefix) {
    const definitions = Object.values(_.mapObject(gltypes,
        (val, key) => `${prefix} ${val} ${key};`));
    definitions.sort();
    return definitions.join("\n");
}

// Construct a uniforms dict with default values
function default_uniforms() {

    // Utilities like these could make the defaults list more readable:
    // const u_float = (value) => ({ value: value, gltype: "float" });
    // const u_vec2 = (...values) => ({ value: new THREE.Vector2(...values), gltype: "vec2" });
    // const u_vec3 = (...values) => ({ value: new THREE.Vector3(...values), gltype: "vec3" });
    // const u_vec4 = (...values) => ({ value: new THREE.Vector4(...values), gltype: "vec4" });
    // const u_int = (value) => ({ value: value, gltype: "int" });
    // const u_ivec2 = (...values) => ({ value: new THREE.Vector2(...values), gltype: "ivec2" });
    // const u_ivec3 = (...values) => ({ value: new THREE.Vector3(...values), gltype: "ivec3" });
    // const u_ivec4 = (...values) => ({ value: new THREE.Vector4(...values), gltype: "ivec4" });

    // Groups of uniforms that are set automatically by user
    const automatic_groups = {
        time: {
            u_time: { value: 0.0, gltype: "float" },
            u_oscillators: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0), gltype: "vec4" },
        },
        view: {
            u_local_view_direction: { value: new THREE.Vector3(0, 0, 1), gltype: "vec3" },
            u_local_camera_position: { value: new THREE.Vector3(0, 0, 0), gltype: "vec3" },
            u_mvp_matrix: { value: new THREE.Matrix4(), gltype: "mat4" },
        },
    };
    // Groups of uniforms set from user data
    const user_data_groups = {
        mesh: {
            t_cells: { value: null, gltype: "sampler2D" },
            t_coordinates: { value: null, gltype: "sampler2D" },
            u_cell_texture_shape: { value: [0, 0], gltype: "ivec2" },
            u_vertex_texture_shape: { value: [0, 0], gltype: "ivec2" },
        },
        indicators: {
            // Integer indicator values
            t_cell_indicators: { value: null, gltype: "sampler2D" },
            // Value to enable
            u_cell_indicator_value: { value: 1, gltype: "int" },
            // Color/toggle lookup table
            // t_indicator_lut: { value: null, gltype: "sampler2D" },
        },
        light: {
            u_emission_color: { value: new THREE.Color(0.8, 0.8, 0.8), gltype: "vec3" },
            u_emission_intensity_range: { value: new THREE.Vector2(0.5, 1.0), gltype: "vec2" },
            u_exposure: { value: 1.0, gltype: "float" },
            u_extinction: { value: 1.0, gltype: "float" },
        },
        wireframe: {
            u_wireframe_color: { value: new THREE.Color(0.1, 0.1, 0.1), gltype: "vec3" },
            u_wireframe_alpha: { value: 0.7, gltype: "float" },
            u_wireframe_size: { value: 0.001, gltype: "float" },
            u_wireframe_decay: { value: 1.0, gltype: "float" },
        },
        interval: {
            u_volume_interval: { value: new THREE.Vector2(0.0, 1.0), gltype: "vec2" },
        },
        isovalues: {
            u_isovalue: { value: 0.0, gltype: "float" },
            u_isovalue_spacing: { value: 0.0, gltype: "float" },
            u_isovalue_sweep_period: { value: 3.0, gltype: "float" },
        },
        density: {
            // Function values
            t_density: { value: null, gltype: "sampler2D" },
            // Range [min, max, max-min, 1.0/(max-min) or 1]
            u_density_range: { value:  new THREE.Vector4(0.0, 1.0, 1.0, 1.0), gltype: "vec4" },
            // Scalar lookup table
            t_density_lut: { value: null, gltype: "sampler2D" },
        },
        emission: {
            // Function values
            t_emission: { value: null, gltype: "sampler2D" },
            // Range [min, max, max-min, 1.0/(max-min) or 1]
            u_emission_range: { value: new THREE.Vector4(0.0, 1.0, 1.0, 1.0), gltype: "vec4" },
            // Color lookup table
            t_emission_lut: { value: null, gltype: "sampler2D" },
        },
    };

    // Flatten groups to { u_foo: { value: 123, gltype: "float" } }
    const groups = Object.assign({}, automatic_groups, user_data_groups);
    const all = Object.assign({}, ...Object.values(groups));

    // Create uniforms dict with fresh copies of values
    const values = _.mapObject(all, ({value}, key) => { return { value }; } );

    // Extract types as { u_foo: "float" }
    //const gltypes = _.mapObject(all, (val, key) => val.gltype);

    // TODO: By adding more data here and appropriately selecting
    // the relevant subset of uniforms, we can generate the definitions.
    // Do we want to do that? Could simplify maintenance.
    //console.log(generate_declarations(gltypes, "uniform"));
    //console.log(generate_declarations(gltypes, "varying"));

    return values;
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

    // Setup cells of geometry (using textures or attributes)
    const attributes = {};
    if (sorted) {
        // Need ordering, let ordering be instanced and read cells from texture
        // Initialize ordering array with contiguous indices,
        // stored as floats because webgl2 is required for integer attributes.
        // When assigned a range of integers, the c_ordering instance attribute
        // can be used as a replacement for gl_InstanceID which requires webgl2.
        attributes.c_ordering = create_cell_ordering_attribute(num_tetrahedrons);
    } else {
        // Don't need ordering, pass cells as instanced buffer attribute instead
        attributes.c_cells = create_cells_attribute(cells);
    }

    // Configure instanced geometry, each tetrahedron is an instance
    const geometry = create_instanced_tetrahedron_geometry(num_tetrahedrons);
    for (let name in attributes) {
        geometry.addAttribute(name, attributes[name]);
    }

    // Compute bounding box and sphere and set on geometry so
    // they become available to generic THREE.js code
    geometry.boundingSphere = create_bounding_sphere(coordinates);
    geometry.boundingBox = create_bounding_box(coordinates);

    return geometry;
}

const method_backgrounds = {
    // Must start with a black background
    max: new THREE.Color(0, 0, 0),
    max2: new THREE.Color(0, 0, 0),
    sum: new THREE.Color(0, 0, 0),

    // Must start with a white background
    min: new THREE.Color(1, 1, 1),
    min2: new THREE.Color(1, 1, 1),
    xray: new THREE.Color(1, 1, 1),
    xray2: new THREE.Color(1, 1, 1),
};

const method_configs = {
    blank: {
    },
    mesh: {
        transparent: false,
        depthTest: true,
        depthWrite: true,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,
    },
    cells: {
        transparent: false,
        depthTest: true,
        depthWrite: true,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,
    },
    surface: {
        transparent: false,
        depthTest: true,
        depthWrite: true,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,
    },
    surface_depth: {
        transparent: false,
        depthTest: true,
        depthWrite: true,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,
    },
    isosurface: {
        transparent: false,
        depthTest: true,
        depthWrite: true,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
    },
    max2: {
        transparent: true,
        depthTest: true,
        depthWrite: false,

        // Rendering front side only and taking max in shader
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blendEquation: THREE.MaxEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    max: {
        transparent: true,
        depthTest: true,
        depthWrite: false,

        // Rendering both sides automatically includes the
        // backside boundary of the mesh at cost of doubling
        // the number of faces.
        side: THREE.DoubleSide,

        blending: THREE.CustomBlending,
        blendEquation: THREE.MaxEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    min2: {
        transparent: true,
        depthTest: true,
        depthWrite: false,

        // Rendering front side only and taking min in shader
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blendEquation: THREE.MinEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    min: {
        transparent: true,
        depthTest: true,
        depthWrite: false,

        // Rendering both sides automatically includes the
        // backside boundary of the mesh at cost of doubling
        // the number of faces.
        side: THREE.DoubleSide,

        blending: THREE.CustomBlending,
        blendEquation: THREE.MinEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
    },
    xray: {
        transparent: true,
        depthTest: true,
        depthWrite: false,

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        // blendEquation: THREE.ReverseSubtractEquation, // dst - src  // TODO: Is there a way to use this for negative xray?
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
    },
    xray2: {
        transparent: true,
        depthTest: true,
        depthWrite: false,

        side: THREE.FrontSide,

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

function create_material(method, encoding, uniforms, defines) {
    const material_config = {
        uniforms: uniforms,
        defines: defines,
        vertexShader: vertex_shader,
        fragmentShader: fragment_shader,
        fog: false,
    };
    Object.assign(material_config, method_configs[method]);

    // Configure shader
    const material = new THREE.ShaderMaterial(material_config);

    // Some extensions need to be explicitly enabled
    material.extensions.derivatives = true;

    return material;
}

// FIXME: Replace this with new code
function allocate_textures_and_buffers(method, encoding, data, uniforms) {
    // The current implementation assumes:
    // - Each channel has only one possible association
    const channels = default_channels;

    // Copy and override defaults with provided values
    encoding = extend2(default_encoding, encoding);

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
// FIXME: Replace this with new code
function upload_data(method, encoding, data, uniforms) {
    // The current implementation assumes:
    // - Each channel has only one possible association
    const channels = default_channels;

    // Copy and override defaults with provided values
    encoding = extend2(default_encoding, encoding);

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

            // FIXME: Autoupdate values in a cleaner way
            // if (method === "isosurface") {
            //     const isovalue_enc = FIXME;
            //     if (isovalue_enc.value === "auto") {
            //         const value_range = newrange;
            //         u.u_isovalue = 0.5 * (value_range[0] + value_range[1]);
            //     }
            //     if (isovalue_enc.spacing === "auto") {
            //         const num_intervals = isovalue_enc.num_intervals;
            //         let spacing = 0.0;
            //         switch (isovalue_enc.mode) {
            //         case "linear":
            //             spacing = (1.0 / num_intervals) * (value_range[1] - value_range[0]);
            //             break;
            //         case "log":
            //             spacing = Math.pow(value_range[1] / value_range[0], 1.0 / (num_intervals + 1.0));
            //             break;
            //         }
            //         u.u_isovalue_spacing = spacing;
            //     }
            // }
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
    // const num_vertices = coordinates.length / 3;
    // const num_tetrahedrons = cells.length / 4;

    const sorted = true || method === "volume";  // FIXME: Enable the non-sorted branch

    // Initialize uniforms, including textures
    //const uniforms = create_uniforms(method, encoding, data, num_tetrahedrons, num_vertices);
    //const defines = method_defines[method];
    const {uniforms, defines, attributes} = create_three_data(method, encoding, data);

    // Initialize geometry
    const geometry = create_geometry(sorted, cells, coordinates);

    // Configure material (shader)
    const material = create_material(method, encoding, uniforms, defines);

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
        this.bgcolor = method_backgrounds[method] || new THREE.Color(1, 1, 1);

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
