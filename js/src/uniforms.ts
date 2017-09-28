"use strict";

import * as _ from "underscore";

import * as THREE from "three";



export
interface IUniformMap {
    [key: string]: THREE.IUniform
}

interface ITypedUniform extends THREE.IUniform {
    gltype: string;
}

interface ITypedUniformMap {
    [key: string]: ITypedUniform
}

export
interface IDefines {
    [key: string]: number;
}

// Uniforms that are set automatically by user
export
function default_automatic_uniforms(): IUniformMap {
    const typed = {
        // Time related
        u_time: { value: 0.0, gltype: "float" },
        u_oscillators: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0), gltype: "vec4" },
        // View related
        u_local_view_direction: { value: new THREE.Vector3(0, 0, 1), gltype: "vec3" },
        u_local_camera_position: { value: new THREE.Vector3(0, 0, 0), gltype: "vec3" },
        u_mvp_matrix: { value: new THREE.Matrix4(), gltype: "mat4" },
    };
    // Create uniforms dict with fresh copies of values
    const values = _.mapObject(typed, ({value}, key) => { return { value }; } );
    // Extract types as { u_foo: "float" }
    //const gltypes = _.mapObject(all, (val, key) => val.gltype);
    return values;
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

    // Groups of uniforms set from user data
    const user_data_groups: {[key: string]: ITypedUniformMap} = {
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
            u_wireframe_size: { value: 0.01, gltype: "float" },
            u_wireframe_decay: { value: 1.0, gltype: "float" },  // TODO: Unused, delete or implement
        },
        interval: {  // TODO: Unused, delete or implement
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
    const groups = Object.assign({}, user_data_groups);
    const all = Object.assign({}, ...Object.keys(groups).map(key => groups[key]));

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

// Generate definitions like "uniform vec3 u_foo;" for an
// object containing types keyed by variable name { u_foo: "vec3" }
function generate_declarations(gltypes: {[key: string]: string}, prefix: string): string {
    const definitions = _.values(_.mapObject(gltypes,
        (val, key) => `${prefix} ${val} ${key};`));
    definitions.sort();
    return definitions.join("\n");
}
