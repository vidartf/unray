var _ = require('underscore');

// Assuming ndarray format in input arrays but currently not using the module directly here
//var ndarray = require('ndarray');


// Load shader templates using webpack-glsl-loader
let vertex_shader_template = require("./glsl/unray-vertex.glsl");
let fragment_shader_template = require("./glsl/unray-fragment.glsl");

let vertex_shader_generator = _.template(vertex_shader_template);
let fragment_shader_generator = _.template(fragment_shader_template);

let default_shader_args = {};

let default_vertex_shader_args = _.extend({}, default_shader_args, {
    debug_colors: 1,
    debug_positions: 1,
});

let default_fragment_shader_args = _.extend({}, default_shader_args, {
});


function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    let msg = gl.getShaderInfoLog(shader);
    console.error(msg);
    gl.deleteShader(shader);
}


function createProgram(gl, vertexShader, fragmentShader, locations={}, transformAttribs=[]) {
    // Create program with given shaders
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // Bind attribute locations
    for (let name in locations) {
        let loc = locations[name];
        gl.bindAttribLocation(program, loc, name);
    }

    // Specify transform feedback attributes if any
    if (transformAttribs.length) {
        //var transformAttribs = ["f_cellVertIndex", "f_rayLengths", "f_functionGradient"];
        gl.transformFeedbackVaryings(program, transformAttribs, gl.SEPARATE_ATTRIBS);
    }

    // Link and return or report error
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    let msg = gl.getProgramInfoLog(program);
    console.error(msg);
    gl.deleteProgram(program);
}


function flattened_texture_size(length, max_dim) {
    if (length < max_dim) {
        // Given index i in [0,length), fetch texel at [i >> 0, i & 0] = [i, 0].
        return [length, 1, 0, 0];
    }
    // Round length to multiple of 4
    let N = Math.ceil(length / 4) * 4;
    // Get number of bits to represent sqrt(N)
    let b = Math.log2(N) / 2;
    // Require width to be at least 4 = 2^2
    b = Math.max(2, b);
    // Use that number of bits to represent width as a power of 2
    let width = Math.pow(2, b);
    // Represent height just sufficiently
    let height = Math.ceil(length / width);

    // Note: This can be optimized a bit, wasted space (length - w*h)
    // is now bounded by approximately sqrt(length).

    // Given index i in [0,length), fetch texel at [i >> b, i & (w-1)] = [i / w, i % w].
    let index_shift = b;
    let index_mask = width - 1;
    return [width, height, index_shift, index_mask];
}


class Unray
{
    constructor(gl, config) {
        // Set configuration
        this.config = Unray.default_config();
        if (config !== undefined) {
            this.config = _.extend(this.config, config);
        }

        // Must be called before some of the below functions
        this.set_gl_context(gl);

        // Just splitting the constructor because it became a bit large
        this._init_element_array();
        this._init_data_descriptions();
        this._init_gl_object_cache();
    }

    static default_config() {
        return {
            "raymodel": "surface",
        };
    }

    log(msg) {
        console.log("Unray:  " + msg, arguments);
    }

    set_gl_context(gl) {
        this.gl = gl;

        this.update_viewport();

        // Texture size limit in one dimension
        // (lookup tables will usually be bounded by this)
        this.max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE)

        // Store [internalFormat, format, type] for easy type mapping
        this.format_mapping = {
            "float32": {
                1: [gl.R32F, gl.RED, gl.FLOAT, false],
                2: [gl.RG32F, gl.RG, gl.FLOAT, false],
                3: [gl.RGB32F, gl.RGB, gl.FLOAT, false],
                4: [gl.RGBA32F, gl.RGBA, gl.FLOAT, false],
            },
            "uint32": {
                1: [gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT, true],
                2: [gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT, true],
                3: [gl.RGB32UI, gl.RGB_INTEGER, gl.UNSIGNED_INT, true],
                4: [gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT, true],
            },
            "int32": {
                1: [gl.R32I, gl.RED_INTEGER, gl.INT, true],
                2: [gl.RG32I, gl.RG_INTEGER, gl.INT, true],
                3: [gl.RGB32I, gl.RGB_INTEGER, gl.INT, true],
                4: [gl.RGBA32I, gl.RGBA_INTEGER, gl.INT, true],
            },
        };

    }

    _init_element_array() {
        let gl = this.gl;

        // Element array buffer is always the same triangle strip,
        // so can be allocated once and for all right away.

        // NB! This assumes that the tetrahedrons are always oriented
        // consistently such that dot(cross(v1-v0, v2-v0), v3-v0)) > 0.
        // FIXME: For cells where this does not hold, swap e.g. v2 and v3

        // It also assumes that front faces are clockwise, so setting this here:
        // TODO: If combining with another framework such as three.js may
        // need to reconsider where this is set, define a different strip,
        // or flip one of these two options:

        gl.frontFace(gl.CW);
        gl.cullFace(gl.BACK);

        let array = new Uint32Array([0, 1, 2, 3, 0, 1]);
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        this.element_array_buffer = buffer;
    }

    _init_gl_object_cache() {
        // Cache of allocated webgl objects
        this.uniforms = new Map();
        this.buffers = new Map();
        this.textures = new Map();
        /*
        this.snippets = new Map();
        this.shaders = new Map();
        this.programs = new Map();
        */
    }

    _init_data_descriptions() {
        let gl = this.gl;

        // Descriptions of all data arrays and how to upload them
        // TODO: Use dtype
        // TODO: Use access
        // TODO: Use item_size
        this.descriptions =  {
            cells: {
                upload_type: "texture",
                access: "cell",
                dtype: "uint32",
                item_size: 4,
            },
            ordering: {
                upload_type: "buffer",
                usage: gl.DYNAMIC_DRAW,
                access: "cell", // divisor: 1
                dtype: "uint32",
                item_size: 1,
            },
            coordinates: {
                upload_type: "texture",
                access: "vertex",
                dtype: "float32",
                item_size: 3,
            },
            density: {
                upload_type: "texture",
                access: "vertex",
                dtype: "float32",
                item_size: 1,
            },
            emission: {
                upload_type: "texture",
                access: "vertex",
                dtype: "float32",
                item_size: 1,
            },
            density_lut: {
                upload_type: "texture",
                access: "lut",
                dtype: "float32",
                item_size: 1,
            },
            emission_lut: {
                upload_type: "texture",
                access: "lut",
                dtype: "float32",
                item_size: 3,
            },
            mvp: {
                upload_type: "uniform",
                dtype: "float32",
            },
            view_direction: {
                upload_type: "uniform",
                dtype: "float32",
            },
        };
    }

    update_viewport() {
        let gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    vertex_shader_source() {
        let args = {
            // TODO: Need to piece together shaders based on config somehow
        };
        let vertex_shader = vertex_shader_generator(_.extend({},
            default_vertex_shader_args, args));
        return vertex_shader;
    }

    fragment_shader_source() {
        let args = {
            // TODO: Need to piece together shaders based on config somehow
        };
        let fragment_shader = fragment_shader_generator(
            _.extend({}, default_fragment_shader_args, args));
        return fragment_shader;
    }

    compile_program() {
        let gl = this.gl;

        let vsSrc = this.vertex_shader_source();
        let fsSrc = this.fragment_shader_source();

        let vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
        let fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);

        // For dynamic link-time location binding
        // TODO: Figure out how to interact with three.js w.r.t. locations (and other resources)
        let locations = {
            //"a_debug": 0,
            //"t_color": 1,
        };

        let program = createProgram(gl, vs, fs, locations);

        return program;
    }

    configureBlending() {
        let gl = this.gl;
        switch (this.config.raymodel)
        {
        case "surface":
            gl.disable(gl.BLEND);
            break;
        case "full":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_DST_ALPHA);
            break;
       case "sum":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.DST_ALPHA, gl.ONE);
            break;
        case "max":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.MAX);
            break;
        case "min":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.MIN);
            break;
        default:
            console.error("Unknown ray model " + rayModel);
        }
    }

    build_vao() {
        let gl = this.gl;

        // Setup attributes
        this.attributes = {
            "a_debug": {
                // Params named after three.BufferAttribute
                itemSize: 1,
                count: 4,
                array: new Int32Array([0, 0, 0, 0]),
                dynamic: false,
                // Other params 
                location: 0,
                gltype: gl.INT,
                buffer: gl.createBuffer(),
                divisor: 0,
                normalized: false,
                stride: 0,
                offset: 0,
            },
        };

        // TODO: Select relevant subset of attributes
        let attributes = this.attributes;

        // TODO: Upload when data is updated, not when building vao
        // Upload all buffers
        for (let name in attributes) {
            let attr = attributes[name];
            gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
            let drawMode = attr.dynamic ? gl.DYNAMIC_DRAW: gl.STATIC_DRAW;
            gl.bufferData(gl.ARRAY_BUFFER, attr.array, drawMode);
        }

        // Build vao
        let vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // Configure attributes
        for (let name in attributes) {
            let attr = attributes[name];
            gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
            if (attr.gltype === gl.INT || attr.gltype === gl.UNSIGNED_INT) {
                gl.vertexAttribIPointer(attr.location, attr.itemSize, attr.gltype,
                                        attr.stride, attr.offset);
            } else {
                gl.vertexAttribPointer(attr.location, attr.itemSize, attr.gltype,
                                       attr.normalized, attr.stride, attr.offset);
            }
            gl.enableVertexAttribArray(attr.location);
            gl.vertexAttribDivisor(attr.location, attr.divisor);
        }

        // Done setting up vao
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        return vao;
    }

    redraw() {
        // FIXME: Make sure we don't try to draw until all data is ready!

        this.log("redraw");
        console.log(this.config);

        let gl = this.gl;

        // Setup global GL properties and clear canvas
        // TODO: According to config

        gl.disable(gl.DEPTH_TEST);

        gl.enable(gl.CULL_FACE);
        //gl.disable(gl.CULL_FACE);

        this.configureBlending();

        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);


        // FIXME: Organize programs and vaos so we can have
        // more than one and compile/select based on config
        let program = this.compile_program();
        let vao = this.build_vao();

        // FIXME: Get model properties properly
        //let num_tetrahedrons = this.model.num_tetrahedrons;
        let num_tetrahedrons = 2;

        // Apply program to instanced triangle strip
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.element_array_buffer);
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, 6, gl.UNSIGNED_INT, 0, num_tetrahedrons);
    }


    dirty() {
        this._dirty = true;
    }

    upload_uniform_data(name, desc, array) {
        this.log("upload_uniform_data, name = " + name);
        console.log(desc);
        console.log(array);
        // FIXME: Upload array to uniform
    }

    upload_buffer_data(name, desc, array) {
        this.log("upload_buffer_data, name = " + name);
        console.log(desc);
        console.log(array);

        let gl = this.gl;

        // Get or create named buffer
        let buffer = this.buffers.get(name);
        if (buffer === undefined) {
            buffer = gl.createBuffer();
            this.buffers.set(name, buffer);
        }

        // Upload data (automatically allocates first time)
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, array.data, desc.usage);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.dirty();
    }

    upload_texture_data(name, desc, array) {
        this.log("upload_texture_data, name = " + name);
        console.log(desc);
        console.log(array);

        let gl = this.gl;

        // Get or create named texture
        let texture = this.textures.get(name);
        let allocate_now = texture === undefined;
        if (allocate_now) {
            texture = gl.createTexture();
            this.textures.set(name, texture);
        }

        // Make sense of input array
        let item_size = array.shape.length == 1 ? 1: array.shape[1];
        let size = array.shape[0];

        // Map types to gl types
        let [internalFormat, format, type, is_integer] = this.format_mapping[array.dtype][item_size];

        // Compute width, height from size
        let [width, height, index_shift, index_mask] = flattened_texture_size(size, this.max_texture_size);

        // FIXME: Store index_shift, index_mask to uniforms

        // TODO: store allocated size and delete/reallocate texture if it has changed

        // Currently just always using unit 0 for uploading
        let unit = 0;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        if (allocate_now) {
            // We're using textures only for data storage here, so...
            // ... there shouldn't be any fetches outside valid indices anyway
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            // ... and no filtering needed
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            // Allocate storage
            gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height);
        }

        // Upload data
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, array.data, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.dirty();
    }

    update_config(config) {
        // TODO: Extract what changed and react to only what's necessary
        let changed = {};
        for (let name in config) {
            if (this.config[name] != config[name]) {
                changed[name] = config[name];
            }
        }
        this.log("config changes: " + changed);
        this.config = _.extend(this.config, config);
    }

    update_data(name, array) {
        if (!this.descriptions.hasOwnProperty(name)) {
            console.error("Missing description for data named " + name);
            return;
        }
        let desc = this.descriptions[name];

        this.log("update_data for " + name, desc);

        // Validate dtype
        if (desc.dtype !== array.dtype) {
            console.error("unexpected dtype " + array.dtype + ", expecting " + desc.dtype);
        }

        // Validate array.shape vs desc.item_size
        if (desc.item_size !== undefined && desc.item_size != (array.shape.length == 1 ? 1: array.shape[1])) {
            console.error("incompatible shape " + array.shape + ", expecting item size " + desc.item_size);
        }

        switch (desc.upload_type) {
        case "texture":
            this.upload_texture_data(name, desc, array);
            break;
        case "buffer":
            this.upload_buffer_data(name, desc, array);
            break;
        case "uniform":
            this.upload_uniform_data(name, desc, array);
            break;
        default:
            console.error("Invalid upload type" + desc.upload_type + " for " + name);
        }
    }

};


module.exports = {
    Unray
};
