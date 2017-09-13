
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

// TODO: Define channels for all methods.
// TODO: Let defines follow from method channels and encoding instead of hardcoding per method

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
