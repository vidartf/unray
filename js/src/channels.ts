"use strict";

import * as THREE from "three";

import {
    managers, IManagers
} from "./managers";

import {
    delete_undefined, Method, IPlotData
} from "./utils";

import {
    default_automatic_uniforms, IUniformMap, IDefines
} from "./uniforms";

import * as encodings from "./encodings";

// Get obj.name if obj is an object
function get_attrib<T>(obj: any, name: string): T | undefined {
    return obj === undefined ? undefined: obj[name];
}

export
function compute_range(array: number[]): number[] {
    let min = array[0];
    let max = array[0];
    for (let v of array) {
        min = Math.min(min, v);
        max = Math.max(max, v);
    }
    return [min, max];
}

export
function compute_texture_shape(size: number) {
    if (size <= 0) {
        throw new Error(`Expecting a positive size ${size}`);
    }
    const width = Math.pow(2, Math.floor(Math.log2(size) / 2));
    const height = Math.ceil(size / width);
    return [width, height];
}

const default_defines: { [key: string]: IDefines} = {
    surface: {
        ENABLE_SURFACE_MODEL: 1,
        // Enable this for debugging, shading by depth:
        //ENABLE_SURFACE_DEPTH_SHADING: 1,
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

// TODO: Update any types here
function update_scale_properties(channel: string, desc: any, uniforms: any, defines: any, data: any) {
    channel = channel.toLowerCase();
    const cap_channel = channel.toUpperCase();

    if (desc.scale === "identity" || !desc.field) {
        defines['USE_' + cap_channel + '_SCALE_IDENTITY'] = 1;
    } else {
        let domain = desc.domain;
        console.log(desc);
        console.log(domain);
        if (domain === "auto") {
            const array = data[desc.field];
            domain = compute_range(array);
        }
        const [xa, xb] = domain;

        let m = undefined;
        let b = undefined;
        let k = undefined;
        switch (desc.scale) {
        case "linear":
            defines['USE_' + cap_channel + '_SCALE_LINEAR'] = 1;
            m = 1 / (xb - xa);
            b = -xa * m;
            break;
        case "log":
            defines['USE_' + cap_channel + '_SCALE_LOG'] = 1;
            // y = m * log_base x + b = (m / log base) log x + b = (m * s) log x + b
            var s = desc.scale_base > 0 ? 1.0 / Math.log(desc.scale_base) : 1.0;
            m = 1 / (s*Math.log(xa) - s*Math.log(xa));
            b = -s*Math.log(xa) * m;
            break;
        case "pow":
            defines['USE_' + cap_channel + '_SCALE_POW'] = 1;
            k = desc.scale_exponent;
            m = 1 / (Math.pow(xa, k) - Math.pow(xa, k));
            b = -Math.pow(xa, k) * m;
            break;
        default:
            throw new Error("Invalid scale type.");
        }
        if (m !== undefined) uniforms["u_" + channel + "_scale_m"] = { value: m };
        if (b !== undefined) uniforms["u_" + channel + "_scale_b"] = { value: b };
        if (k !== undefined) uniforms["u_" + channel + "_scale_k"] = { value: k };
    }
}

export
interface IShaderOptions {
    uniforms: IUniformMap;
    defines: IDefines;
    attributes?: any;
}

export
interface IHandlerOptions {
    data: IPlotData;
    managers: IManagers;
}

export
type ChannelHandler = (shaderOptions: IShaderOptions,
                       desc: encodings.IEncodingEntry,
                       handlerOptions?: IHandlerOptions) => void;

const channel_handlers: {[key: string]: ChannelHandler} = {
    cells: (shaderOptions: IShaderOptions, desc: encodings.ICellsEncodingEntry, handlerOptions: IHandlerOptions) => {
        const {uniforms, defines, attributes} = shaderOptions;
        const {data, managers} = handlerOptions;
        if (!desc.field) {
            throw new Error("Missing required cells field");
        }
        const key = desc.field;
        const array = data[key];

        const num_tetrahedrons = array.length / 4;
        const texture_shape = compute_texture_shape(num_tetrahedrons);

        uniforms['u_cell_texture_shape'] = { value: [...texture_shape] };

        const prev = get_attrib<THREE.DataTexture>(uniforms['t_cells'], "value");
        const value = managers.array_texture.update(
            key,
            {array: array, dtype: "int32", item_size: 4, texture_shape: texture_shape},
            prev);
        uniforms['t_cells'] = { value };

        if (0) {  // Use attributes if unsorted: c_cells, c_ordering
            //attributes.c_cells = managers.buffers.update(
            //    desc.field, data[desc.field], attributes.c_cells);
            // attributes.c_ordering = FIXME;
        }
    },
    coordinates: (shaderOptions: IShaderOptions, desc: encodings.ICellsEncodingEntry, handlerOptions: IHandlerOptions) => {
        const {uniforms, defines, attributes} = shaderOptions;
        const {data, managers} = handlerOptions;
        if (!desc.field) {
            throw new Error("Missing required coordinates field");
        }
        const key = desc.field;
        const array = data[key];

        const num_vertices = array.length / 3;
        const texture_shape = compute_texture_shape(num_vertices);
        uniforms['u_vertex_texture_shape'] = { value: [...texture_shape] };

        const prev = get_attrib<THREE.DataTexture>(uniforms['t_coordinates'], "value");
        const value = managers.array_texture.update(key,
            {array: array, dtype: "float32", item_size: 3, texture_shape: texture_shape },
            prev);
        uniforms['t_coordinates'] = { value };
    },
    indicators: (shaderOptions: IShaderOptions, desc: encodings.IIndicatorsEncodingEntry, handlerOptions: IHandlerOptions) => {
        const {uniforms, defines, attributes} = shaderOptions;
        const {data, managers} = handlerOptions;
        if (desc.field) {
            if (desc.space != "I3") {
                throw new Error("Only cell restriction has been implemented.");
            }
            if ((desc as any).lut) {
                throw new Error("LUT for restriction has not been implemented.");
            }

            const key = desc.field;
            const uname = "t_cell_indicators";

            const array = data[key];
            const dtype = "int32";
            const item_size = 1;
            const texture_shape = compute_texture_shape(array.length / item_size);
            const spec = {array, dtype, item_size, texture_shape};

            const prev = get_attrib<THREE.DataTexture>(uniforms[uname], "value");

            const value = managers.array_texture.update(key, spec, prev);
            uniforms[uname] = { value };

            uniforms['u_cell_indicator_value'] = { value: desc.value };

            defines['ENABLE_CELL_INDICATORS'] = 1;

            // FIXME: If not sorted, use attributes instead:
            // attributes.c_cell_indicators = managers.buffers.update(key, array, attributes.c_cell_indicators);
        }
    },
    wireframe: (shaderOptions: IShaderOptions, desc: encodings.IWireframeEncodingEntry) => {
        const {uniforms, defines} = shaderOptions;
        if (desc.enable) {
            defines['ENABLE_WIREFRAME'] = 1;
            uniforms['u_wireframe_color'] = { value: new THREE.Color(desc.color) };
            uniforms['u_wireframe_alpha'] = { value: desc.opacity };
            uniforms['u_wireframe_size'] = { value: desc.size };
        }
    },
    light: (shaderOptions: IShaderOptions, desc: encodings.ILightEncodingEntry) => {
        const {uniforms, defines} = shaderOptions;
        uniforms['u_emission_intensity_range'] = { value: [...desc.emission_intensity_range] };

        defines['ENABLE_SURFACE_LIGHT'] = 1;
    },
    density: (shaderOptions: IShaderOptions, desc: encodings.IDensityEncodingEntry, handlerOptions: IHandlerOptions) => {
        const {uniforms, defines} = shaderOptions;
        const {data, managers} = handlerOptions;
        defines['ENABLE_DENSITY'] = 1;

        if (desc.field) {
            const key = desc.field;
            const uname = "t_density";

            const array = data[key];
            const dtype = "float32";
            const item_size = 1;
            const texture_shape = compute_texture_shape(array.length / item_size);
            const spec = {array, dtype, item_size, texture_shape};

            const prev = get_attrib<THREE.DataTexture>(uniforms[uname], "value");

            const value = managers.array_texture.update(key, spec, prev);
            uniforms[uname] = { value };

            defines['ENABLE_DENSITY_FIELD'] = 1;
            if (desc.space !== "P0") {
                // TODO: Rename ENABLE_DENSITY_BACK -> ENABLE_DENSITY_LINEAR
                defines['ENABLE_DENSITY_BACK'] = 1;
            }
        } else {
            uniforms['u_density_constant'] = { value: desc.constant };
        }

        update_scale_properties('density', desc, uniforms, defines, data);

        if (desc.lut_field) {
            const key = desc.lut_field;
            const uname = "t_density_lut";

            const array = data[key];
            const item_size = 1;
            const dtype = "float32";
            const spec = {array, dtype, item_size};

            const prev = get_attrib<THREE.DataTexture>(uniforms[uname], "value");

            const value = managers.lut_texture.update(key, spec, prev);
            uniforms[uname] = { value };

            defines['ENABLE_DENSITY_LUT'] = 1;
        }
    },
    emission: (shaderOptions: IShaderOptions, desc: encodings.IEmissionEncodingEntry, handlerOptions: IHandlerOptions) => {
        const {uniforms, defines} = shaderOptions;
        const {data, managers} = handlerOptions;
        defines['ENABLE_EMISSION'] = 1;

        if (desc.field) {
            const key = desc.field;
            const uname = "t_emission";

            const array = data[key];
            const item_size = 1;
            const dtype = "float32";
            const texture_shape = compute_texture_shape(array.length / item_size);
            const spec = {array, dtype, item_size, texture_shape};

            const prev = get_attrib<THREE.DataTexture>(uniforms[uname], "value");

            const value = managers.array_texture.update(key, spec, prev);
            uniforms[uname] = { value };

            defines['ENABLE_EMISSION_FIELD'] = 1;
            if (desc.space !== "P0") {
                defines['ENABLE_EMISSION_BACK'] = 1;
            }
        } else {
            uniforms['u_emission_constant'] = { value: desc.constant };
        }

        update_scale_properties('emission', desc, uniforms, defines, data);

        if (desc.lut_field) {
            const key = desc.lut_field;
            const uname = "t_emission_lut";

            const array = data[key];
            const item_size = 3;
            const dtype = "float32";
            const spec = {array, dtype, item_size};

            const prev = get_attrib<THREE.DataTexture>(uniforms[uname], "value");

            const value = managers.lut_texture.update(key, spec, prev);
            uniforms[uname] = { value };

            defines['ENABLE_EMISSION_LUT'] = 1;
        }

        // This should always have a valid value
        uniforms['u_emission_color'] = { value: new THREE.Color(desc.color) };
    },
    isovalues: (shaderOptions: IShaderOptions, desc: encodings.IIsoValuesEncodingEntry) => {
        const {uniforms, defines} = shaderOptions;
        uniforms['u_isovalue'] = { value: desc.value };

        const spacing = 1.0 / desc.num_intervals;

        const scale_modes = ["linear", "log", "pow"];
        if (scale_modes.indexOf(desc.mode) !== -1) {
            uniforms['u_isovalue_spacing'] = { value: spacing };
            uniforms['u_isovalue_spacing_inv'] = { value: 1.0 / spacing };
        }

        // TODO: Use a single define instead?
        const mode2define = (mode: encodings.IIsoValuesEncodingEntry['mode']) => {
            switch (mode) {
            case "single":
                return { USING_ISOSURFACE_MODE_SINGLE: 1 };
            case "linear":
                return { USING_ISOSURFACE_MODE_LINEAR: 1 };
            case "log":
                return { USING_ISOSURFACE_MODE_LOG: 1 };
            case "pow":
                return { USING_ISOSURFACE_MODE_POWER: 1 };
            default:
                throw new Error(`Invalid isovalue mode ${mode}.`);
            }
        };
        Object.assign(defines, mode2define(desc.mode));
    },
    extinction: (shaderOptions: IShaderOptions, desc: encodings.IExtinctionEncodingEntry) => {
        const {uniforms} = shaderOptions;
        uniforms['u_extinction'] = { value: desc.value };
    },
    exposure: (shaderOptions: IShaderOptions, desc: encodings.IExposureEncodingEntry) => {
        const {uniforms} = shaderOptions;
        uniforms['u_exposure'] = { value: Math.pow(2.0, desc.value) };
    },
};

export
function create_three_data(method: Method,
                           encoding: encodings.IPartialEncoding,
                           data: IHandlerOptions['data']) {
    // const cell_texture_shape = compute_texture_shape(num_tetrahedrons);
    // const vertex_texture_shape = compute_texture_shape(num_vertices);

    // Initialize new set of uniforms
    //const defaults = default_uniforms();

    // Combine encoding with fallback values from default_encoding
    const default_encoding = encodings.default_encodings[method];
    const user_encoding = encoding;
    encoding = {} as encodings.IPartialEncoding;
    for (const channel in default_encoding) {
        // FIXME: Make this deep copy? Or perhaps we'll only read from this anyway?
        encoding[channel] = Object.assign({}, default_encoding[channel], user_encoding[channel]);
    }
    console.log("Built encoding:", encoding);

    // Define initial default defines based on method
    const defines: IDefines = Object.assign({}, default_defines[method]);

    // TODO: ENABLE_CELL_ORDERING should be determined by need for sorting based on method
    defines['ENABLE_CELL_ORDERING'] = 1;

    // Should be updated by camera type in pre-render step:
    defines['ENABLE_PERSPECTIVE_PROJECTION'] = 1;

    // Initialize uniforms that are set by time and view changes
    const uniforms = default_automatic_uniforms();

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
        const desc = encoding[channel]!;
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
