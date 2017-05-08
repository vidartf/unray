var _ = require('underscore');

// Load shaders using webpack-glsl-loader
let default_vertex_shader = require("./glsl/unray-vertex.glsl");
let default_fragment_shader = require("./glsl/unray-fragment.glsl");


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

class Unray
{
    static default_config() {
        return {
            "raymodel": "surface",
        };
    }

    constructor(gl) {
        this.log("constructor, gl:");
        this.log(gl);

        this.config = Unray.default_config();
        
        this.gl = gl;
        this.update_viewport();

        this.elementArrayBuffer = this.createElementArrayBuffer();

        /*
        this.snippets = {};
        this.shaders = {};
        this.programs = {};
        this.buffers = {};
        this.uniforms = {};
        this.textures = {};
        */
    }

    log(msg) {
        console.log("Unray:  " + msg);
    }

    update_viewport() {
        let gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    // TODO: Need to piece together shaders based on config somehow
    vertex_shader_source() {
        return default_vertex_shader;
    }

    fragment_shader_source() {
        return default_fragment_shader;
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

    createElementArrayBuffer() {
        let gl = this.gl;
        let elementArray = new Uint32Array([0,1,2,3,0,1]);
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementArray, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return buffer;
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
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementArrayBuffer);
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, 6, gl.UNSIGNED_INT, 0, num_tetrahedrons);
    }


    update_config(config) {
        this.log("update_config");
        // TODO: Extract what changed and react to only what's necessary
        let changed = {};
        for (let name in config) {
            if (this.config[name] != config[name]) {
                changed[name] = config[name];
            }
        }
        console.log("Updated config:");
        console.log(changed);
        this.config = _.extend(this.config, config);
    }

    update_coordinates(coordinates) {
        this.log("update_coordinates");
        // FIXME
        //this.model = FIXME;
    }

    update_cells(cells) {
        this.log("update_cells");
        // FIXME
    }

    update_values(values) {
        this.log("update_values");
        // FIXME
    }

};


module.exports = {
    Unray
};
