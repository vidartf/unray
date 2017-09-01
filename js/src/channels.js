

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
    const mesh = {
        cells_field: null,
        points_field: null,
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
        mesh: { mesh, indicators, wireframe, light },
        surface: { mesh, indicators, wireframe, emission, light },
        isosurface: { mesh, wireframe, isovalues },
        xray: { mesh, indicators, density, extinction },
        sum: { mesh, indicators, emission, exposure },
        min: { mesh, indicators, density },
        max: { mesh, indicators, density },
        volume: { mesh, indicators, density, emission },
    };

    return defenc;
}

const channel_handlers = {
    mesh: ({uniforms, defines}, desc, {data, manager}) => {
        if (!desc.points_field) {
            throw new Error("Missing required points field");
        }
        uniforms.u_vertex_texture_shape = { value: [...manager.vertex_texture_shape] };
        uniforms.t_coordinates = manager.update_texture(desc.points_field, data[desc.points_field]);

        // TODO: Splitting here is arguably better

        if (!desc.cells_field) {
            throw new Error("Missing required cells field");
        }
        uniforms.u_cell_texture_shape = { value: [...manager.cell_texture_shape] };
        uniforms.t_cells = manager.update_texture(desc.cells_field, data[desc.cells_field]);
        // or attributes: c_cells, c_ordering
        // attributes.c_cells = manager.update_buffer(desc.cells_field, data[desc.cells_field]);
        // attributes.c_ordering = FIXME;
    },
    indicators: ({uniforms, defines}, desc) => {
        uniforms.u_cell_indicator_value = { value: desc.value };

        const texture = manager.update_texture(desc.field, data[desc.field]); // FIXME:
        uniforms.t_cell_indicators = { value: texture };
        // or
        // attributes.c_cell_indicators = manager.update_buffer(desc.field, data[desc.field]);
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
    density: ({uniforms, defines}, desc, {data, manager}) => {
        if (desc.field) {
            const texture = manager.update_texture(desc.field, data[desc.field]); // FIXME
            uniforms.t_density = { value: texture };
            defines.ENABLE_DENSITY = 1;
            if (desc.space !== "P0") {
                defines.ENABLE_DENSITY_BACK = 1;
            }
        }

        if (desc.lut_field) {
            const lut = manager.update_lut_texture(desc.lut_field, data[desc.lut_field]); // FIXME
            uniforms.t_density_lut = { value: lut };
        }

        if (desc.range === "auto") {
            uniforms.u_density_range = { value: compute_range(data[desc.field]) }; // FIXME
        } else {
            uniforms.u_density_range = { value: [...desc.range] };
        }
    },
    emission: ({uniforms, defines}, desc, {data, manager}) => {
        const texture = manager.update_texture(desc.field, data[desc.field]); // FIXME
        uniforms.t_emission = { value: texture };

        if (desc.lut_field) {
            const lut = manager.update_lut_texture(desc.lut_field, data[desc.lut_field]); // FIXME
            uniforms.t_emission_lut = { value: lut };
        }

        uniforms.u_emission_color = { value: new THREE.Color(desc.color) };

        if (desc.range === "auto") {
            uniforms.u_emission_range = { value: compute_range(data[desc.field]) }; // FIXME
        } else {
            uniforms.u_emission_range = { value: [...desc.range] };
        }
    },
    isovalues: ({uniforms, defines}, desc) => {
        uniforms.u_isovalue = { value: desc.value };

        const scale_modes = ["linear", "log", "power"];
        if (scale_modes.includes(desc.mode)) {
            uniforms.u_isovalue_spacing = { value: desc.spacing };
        }

        if (desc.mode === "sweep") {
            uniforms.u_isovalue_sweep_period = { value: desc.period };
        }

        const mode2define = {
            single: USING_ISOSURFACE_MODE_SINGLE,
            sweep: USING_ISOSURFACE_MODE_SWEEP,
            linear: USING_ISOSURFACE_MODE_LINEAR,
            log: USING_ISOSURFACE_MODE_LOG,
            power: USING_ISOSURFACE_MODE_POWER,
        };
        defines[mode2define[desc.mode]] = 1;
    },
    extinction: ({uniforms, defines}, desc) => {
        uniforms.u_extinction = { value: desc.value };
    },
    exposure: ({uniforms, defines}, desc) => {
        uniforms.u_exposure = { value: Math.pow(2.0, desc.value) };
    },
};

function create_uniforms_and_defines(method, encoding, data, manager) {
    // FIXME: pass in manager from outside
    manager = {
        cell_texture_shape: compute_texture_shape(num_tetrahedrons),
        vertex_texture_shape: compute_texture_shape(num_vertices),
        textures: {},
        update_buffer(id, array) {
            // FIXME
        },
        update_texture(id, array) {
            // FIXME: Missing some info here to create and update textures properly
            // FIXME: Consider weakmaps
            let texture = this.textures[id];
            if (texture) {
                update_texture_values(texture, array); // FIXME
            } else {
                texture = create_texture(array); // FIXME
                this.textures[id] = texture;
            }
        },
        update_lut_texture(id, array) {
            // FIXME: Missing some info here to create and update textures properly
            // FIXME: Consider weakmaps
            let texture = this.textures[id];
            if (texture) {
                update_lut_texture_values(texture, array); // FIXME
            } else {
                texture = create_lut_texture(array); // FIXME
                this.textures[id] = texture;
            }
        },
    };

    // Initialize new set of uniforms
    //const defaults = default_uniforms();

    // FIXME: Instead of default uniforms, create default encoding
    const default_encoding = default_encodings[method];

    // FIXME: Override default_encoding with encoding
    //default_encoding
    const user_encoding = encoding;
    encoding = {};
    for (let channel in default_encoding) {
        // FIXME: Make this deep copy? Or perhaps we'll only read from this anyway?
        encoding[channel] = Object.assign({}, default_encoding[channel], user_encoding[channel]);
    }

    // Define initial default defines based on method
    const defines = { ...default_defines[method] };
    defines.ENABLE_CELL_ORDERING = 1;  // TODO: Avoid for unsorted methods
    defines.ENABLE_PERSPECTIVE_PROJECTION = 1;  // TODO: Determine based on camera type

    // Initialize uniforms with texture dimensions
    const uniforms = {
        // FIXME: Add defaults for automatic uniform groups here
    };

    // State that the handlers shouldn't touch
    const instate = {
        method, encoding, data, manager, defaults
    };

    // State that the handlers will modify in place
    const outstate = {
        uniforms, defines
    };

    // Map channels to uniforms
    for (let channel in encoding) {
        // This modifies uniforms in place
        const update_uniforms = channel_handlers[channel];
        const desc = encoding[channel];
        update_uniforms(outstate, desc, instate);
    }

    return { uniforms, defines };
}
