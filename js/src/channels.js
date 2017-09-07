"use strict";

import {THREE} from './threeimport';

import {ObjectManager} from "./object_manager";

import {
    compute_range, extended_range, compute_texture_shape,
    allocate_lut_texture, allocate_array_texture,
    update_lut, update_array_texture
} from "./threeutils";

function delete_undefined(obj) {
    for (let key in obj) {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
}

// TODO: Improve and document encoding specifications
// TODO: ENABLE_PERSPECTIVE_PROJECTION should be determined by camera, maybe use a uniform to toggle
const default_defines = {
    surface: {
        ENABLE_SURFACE_MODEL: 1,
    },
    surface_depth: {
        ENABLE_SURFACE_DEPTH_MODEL: 1,
    },
    isosurface: {
        ENABLE_ISOSURFACE_MODEL: 1,
    },
    xray: {
        ENABLE_XRAY_MODEL: 1,
    },
    min: {
        ENABLE_MIN_MODEL: 1,
    },
    max: {
        ENABLE_MAX_MODEL: 1,
    },
    sum: {
        ENABLE_SUM_MODEL: 1,
    },
    volume: {
        ENABLE_VOLUME_MODEL: 1,
        ENABLE_CELL_ORDERING: 1,
    },
};

const default_encodings = create_default_encodings();

// Build default encodings for each method
function create_default_encodings() {
    // Reusable channel defaults
    const cells = {
        field: null,
    };
    const coordinates = {
        field: null,
    };
    const indicators = {
        field: null,
        values: [1],
        lut_field: null,
    };
    const density = {
        constant: 1.0,
        field: null,
        space: "P1",
        range: "auto",
        lut_field: null,
    };
    const emission = {
        constant: "#ff00ff",
        field: null,
        space: "P1",
        range: "auto",
        lut_field: null,
    };
    const wireframe = {
        enable: false,
        size: 0.001,
        color: "#000000",
        opacity: 1.0,
        decay: 0.5,
    };
    const isovalues = {
        mode: "single", // "single", "linear", "log", "power", "sweep"
        value: 0.0,
        num_intervals: 0,
        spacing: 1.0,
        period: 3.0,
    };
    const light = {
        emission_intensity_range: [0.5, 1.0],
        // ambient_intensity: 0.0,
        // ambient_color: "#888888"
    };
    const extinction = { value: 1.0 };
    const exposure = { value: 0.0 };

    // Compose method defaults from channels
    const defenc = {
        mesh: { cells, coordinates, indicators, wireframe, light },
        surface: { cells, coordinates, indicators, wireframe, emission, light },
        isosurface: { cells, coordinates, wireframe, isovalues },
        xray: { cells, coordinates, indicators, density, extinction },
        sum: { cells, coordinates, indicators, emission, exposure },
        min: { cells, coordinates, indicators, density },
        max: { cells, coordinates, indicators, density },
        volume: { cells, coordinates, indicators, density, emission },
    };

    return defenc;
}

function update_range_uniform(uniforms, name, range, array) {
    if (desc.range === undefined) {
        delete uniforms[name];
    } else {
        let new_range = null;
        if (desc.range === "auto") {
            newrange = compute_range(array);
        } else {
            newrange = desc.range;
        }
        uniforms[name] = { value: extended_range(...newrange) };
    }
}

const channel_handlers = {
    cells: ({uniforms, defines, attributes}, desc, {data, managers}) => {
        if (!desc.field) {
            throw new Error("Missing required cells field");
        }
        const key = desc.field;
        const array = data[key];

        const num_tetrahedrons = array.length / 4;
        const texture_shape = compute_texture_shape(num_tetrahedrons);

        uniforms.u_cell_texture_shape = { value: [...texture_shape] };

        const prev = uniforms.t_cells ? uniforms.t_cells.value : undefined;
        const value = managers.array_texture.update(
            key,
            {array: array, dtype: "int32", item_size: 4, texture_shape: texture_shape},
            prev);
        uniforms.t_cells = { value };

        if (0) {  // Use attributes if unsorted: c_cells, c_ordering
            attributes.c_cells = managers.buffers.update(
                desc.field, data[desc.field], attributes.c_cells);
            // attributes.c_ordering = FIXME;
        }
    },
    coordinates: ({uniforms, defines}, desc, {data, managers}) => {
        if (!desc.field) {
            throw new Error("Missing required coordinates field");
        }
        const key = desc.field;
        const array = data[key];

        const num_vertices = array.length / 3;
        const texture_shape = compute_texture_shape(num_vertices);
        uniforms.u_vertex_texture_shape = { value: [...texture_shape] };

        const prev = uniforms.t_coordinates ? uniforms.t_coordinates.value: undefined;
        const value = managers.array_texture.update(key,
            {array: array, dtype: "float32", item_size: 3, texture_shape: texture_shape },
            prev);
        uniforms.t_coordinates = { value };
    },
    indicators: ({uniforms, defines, attributes}, desc, {data, managers}) => {
        uniforms.u_cell_indicator_value = { value: desc.value };
        const key = desc.field;
        if (key) {
            const array = data[key];
            uniforms.t_cell_indicators = { value: managers.array_texture.update(key, array, uniforms.t_cell_indicators.value) };
            // or
            // attributes.c_cell_indicators = managers.buffers.update(key, array, attributes.c_cell_indicators);
        }
    },
    wireframe: ({uniforms, defines}, desc) => {
        if (desc.enable) {
            defines.ENABLE_WIREFRAME = 1;
        } else {
            delete defines.ENABLE_WIREFRAME;
        }
        uniforms.u_wireframe_color = { value: new THREE.Color(desc.color) };
        uniforms.u_wireframe_alpha = { value: desc.opacity };
        uniforms.u_wireframe_size = { value: desc.size };
        uniforms.u_wireframe_decay = { value: desc.decay };
    },
    light: ({uniforms, defines}, desc) => {
        uniforms.u_emission_intensity_range = { value: [...desc.emission_intensity_range] };
    },
    density: ({uniforms, defines}, desc, {data, managers}) => {
        const key = desc.field;
        if (key) {
            const array = data[key];
            const num_vertices = array.length;
            const texture_shape = compute_texture_shape(num_vertices);

            const prev = uniforms.t_density ? uniforms.t_density.value : undefined;
            const value = managers.array_texture.update(key,
                {array: array, dtype: "float32", item_size: 1, texture_shape: texture_shape },
                prev);
            uniforms.t_density = { value };
            defines.ENABLE_DENSITY = 1;
            if (desc.space !== "P0") {
                defines.ENABLE_DENSITY_BACK = 1;
            }
            update_range_uniform(uniforms, "u_density_range", desc.range, array);
        }
        if (desc.lut_field) {
            const lut = managers.lut_texture.update(desc.lut_field, data[desc.lut_field]); // FIXME
            uniforms.t_density_lut = { value: lut };
        }
    },
    emission: ({uniforms, defines}, desc, {data, managers}) => {
        const key = desc.field;
        if (key) {
            const array = data[key];
            const num_vertices = array.length;
            const texture_shape = compute_texture_shape(num_vertices);

            const prev = uniforms.t_emission ? uniforms.t_emission.value : undefined;
            const value = managers.array_texture.update(key,
                {array: array, dtype: "float32", item_size: 1, texture_shape: texture_shape },
                prev);
            uniforms.t_emission = { value };
            defines.ENABLE_EMISSION = 1;
            if (desc.space !== "P0") {
                defines.ENABLE_EMISSION_BACK = 1;
            }
            update_range_uniform(uniforms, "u_emission_range", desc.range, array);
        }
        if (desc.lut_field) {
            const lut = managers.lut_texture.update(desc.lut_field, data[desc.lut_field]); // FIXME
            uniforms.t_emission_lut = { value: lut };
        }
        uniforms.u_emission_color = { value: new THREE.Color(desc.color) };
    },
    isovalues: ({uniforms, defines}, desc) => {
        uniforms.u_isovalue = { value: desc.value };

        const scale_modes = ["linear", "log", "power"];
        if (scale_modes.includes(desc.mode)) {
            uniforms.u_isovalue_spacing = { value: desc.spacing };
        }

        if (desc.mode === "sweep") {
            uniforms.u_isovalue_sweep_period = { value: desc.period };
        } else {
            delete uniforms.u_isovalue_sweep_period;
        }

        // TODO: Use a single define instead?
        const match = (mode, name) => (name === mode ? 1: undefined);
        defines.USING_ISOSURFACE_MODE_SINGLE = match(desc.mode, "single");
        defines.USING_ISOSURFACE_MODE_SWEEP = match(desc.mode, "sweep");
        defines.USING_ISOSURFACE_MODE_LINEAR = match(desc.mode, "linear");
        defines.USING_ISOSURFACE_MODE_LOG = match(desc.mode, "log");
        defines.USING_ISOSURFACE_MODE_POWER = match(desc.mode, "power");
    },
    extinction: ({uniforms, defines}, desc) => {
        uniforms.u_extinction = { value: desc.value };
    },
    exposure: ({uniforms, defines}, desc) => {
        uniforms.u_exposure = { value: Math.pow(2.0, desc.value) };
    },
};

// channel.dtype
// channel.item_size
// vertex_texture_shape
// cell_texture_shape
// Singleton managers for each object type
const managers = {
    array_texture: new ObjectManager(
        // Create
        ({array, dtype, item_size, texture_shape}) => {
            const texture = allocate_array_texture(dtype, item_size, texture_shape);
            update_array_texture(texture, array);
            return texture;
        },
        // Update
        (texture, {array, dtype, item_size, texture_shape}) => {
            update_array_texture(texture, array);
        },
    ),
    lut_texture: new ObjectManager(
        // Create
        ({array, dtype, item_size, texture_shape}) => {
            const texture = allocate_array_texture(dtype, item_size, texture_shape);
            update_array_texture(texture, array);
            return texture;
        },
        // Update
        (texture, {array, dtype, item_size}) => {
            update_lut(texture, array, item_size, dtype);
        },
    ),
    cells_buffer: new ObjectManager(
        // Create
        ({array, dtype, item_size}) => {
            const buffer = new THREE.InstancedBufferAttribute(array, item_size, 1);
            //buffer.setDynamic(true);
            return buffer;
        },
        // Update
        (buffer, {array, dtype, item_size}) => {
            buffer.array.set(array);
            buffer.needsUpdate = true;
        }
    ),
};

export
function create_three_data(method, encoding, data) {
    // const cell_texture_shape = compute_texture_shape(num_tetrahedrons);
    // const vertex_texture_shape = compute_texture_shape(num_vertices);

    // Initialize new set of uniforms
    //const defaults = default_uniforms();

    // Combine encoding with fallback values from default_encoding
    const default_encoding = default_encodings[method];
    const user_encoding = encoding;
    encoding = {};
    for (let channel in default_encoding) {
        // FIXME: Make this deep copy? Or perhaps we'll only read from this anyway?
        encoding[channel] = Object.assign({}, default_encoding[channel], user_encoding[channel]);
    }

    // Define initial default defines based on method
    const defines = Object.assign({}, default_defines[method]);
    defines.ENABLE_CELL_ORDERING = 1;  // TODO: Avoid for unsorted methods
    defines.ENABLE_PERSPECTIVE_PROJECTION = 1;  // TODO: Determine based on camera type

    // Initialize uniforms with texture dimensions
    const uniforms = {
        // FIXME: Add defaults for automatic uniform groups here
    };

    const attributes = {
        // FIXME: ?
    };

    // State that the handlers shouldn't touch
    const in_state = {
        method, encoding, data, managers //, defaults
    };

    // State that the handlers will modify in place
    const out_state = {
        uniforms, defines, attributes
    };

    // Map channels to uniforms
    for (let channel in encoding) {
        // This modifies uniforms in place
        const update_uniforms = channel_handlers[channel];
        const desc = encoding[channel];
        if (!update_uniforms) {
            throw new Error(`Missing channel handler for channel ${channel}`);
        }
        update_uniforms(out_state, desc, in_state);
    }

    // Remove undefined attributes
    delete_undefined(uniforms);
    delete_undefined(defines);
    delete_undefined(attributes);

    return { uniforms, defines, attributes };
}
