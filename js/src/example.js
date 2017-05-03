var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var ndarray = require('ndarray');


// Array serialization code copied from pythreejs by Jason Grout
var typesToArray = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array
}
var JSONToArray = function(obj, manager) {
    // obj is {shape: list, dtype: string, array: DataView}
    // return an ndarray object
    return ndarray(new typesToArray[obj.dtype](obj.buffer.buffer), obj.shape);
}
var arrayToJSON = function(obj, manager) {
    // serialize to {shape: list, dtype: string, array: buffer}
    return {shape: obj.shape, dtype: obj.dtype, buffer: obj.data}
}
var array_serialization = { deserialize: JSONToArray, serialize: arrayToJSON };


//////////////////////////////////////////////////////////////////////////////////////////
// TODO: Place widget-independent unray parts in its own file or separate module

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

function createProgram(gl, vertexShader, fragmentShader, locations) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    for (let name in locations) {
        let loc = locations[name];
        gl.bindAttribLocation(program, loc, name);
    }
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    let msg = gl.getProgramInfoLog(program);
    console.error(msg);
    gl.deleteProgram(program);
}


function unray_default_config() {
    return {
        "raymodel": "surface",
    };
}


class Unray
{
    constructor(gl) {
        this.log("constructor, gl:");
        this.log(gl);

        this.config = unray_default_config();
        
        this.gl = gl;
        this.update_viewport();

        this.elementArrayBuffer = this.createElementArrayBuffer();

        this.snippets = {};
        this.shaders = {};
        this.programs = {};
        this.buffers = {};
        this.uniforms = {};
        this.textures = {};
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
        let shader = `#version 300 es
        precision highp float;
        precision highp int;
        precision highp sampler2D;
        precision highp isampler2D;

        // Local vertex attributes (just a test, and we need at least one vertex attribute to draw)
        layout (location = 0) in vec4 a_baryCoord;

        // Tetrahedron instance attributes
        //layout (location = 1) in vec4 t_color; // FIXME: Want [4] of these

        // Output values
        out vec4 v_baryCoord;
        out vec4 v_color;

        void main()
        {
        #if 1
            // Reference coordinates on tetrahedron
            v_baryCoord = vec4(0.0f);
            v_baryCoord[gl_VertexID] = a_baryCoord[gl_VertexID];
        #endif

            //v_color = t_color[gl_VertexID];

        #if 0
            // Debugging colors
            const vec3 colors[8] = vec3[8](
                vec3(0.0, 0.0, 0.0),
                vec3(0.0, 0.0, 1.0),
                vec3(0.0, 1.0, 0.0),
                vec3(0.0, 1.0, 1.0),
                vec3(1.0, 0.0, 0.0),
                vec3(1.0, 0.0, 1.0),
                vec3(1.0, 1.0, 0.0),
                vec3(1.0, 1.0, 1.0)
            );
            v_color = vec4(colors[gl_InstanceID*4 + gl_VertexID], 1.0f);
        #endif

        #if 1
            // Debugging positions
            const vec3 mesh[8] = vec3[8](
                vec3( 1.0,  1.0,  1.0),
                vec3( 1.0,  0.0,  0.0),
                vec3( 0.0,  1.0,  0.0),
                vec3( 0.0,  0.0,  1.0),
                vec3(-1.0, -1.0, -1.0),
                vec3(-1.0,  0.0,  0.0),
                vec3( 0.0, -1.0,  0.0),
                vec3( 0.0,  0.0, -1.0)
            );
            gl_Position = vec4(mesh[gl_InstanceID*4 + gl_VertexID], 1.0f);
        #endif
        }
        `;
        return shader;
    }

    fragment_shader_source() {
        let shader = `#version 300 es
        precision highp float;
        precision highp int;
        precision highp sampler2D;
        precision highp isampler2D;

        float max4(vec4 x)
        {
            return max(max(x[0], x[1]), max(x[2], x[3]));
        }

        // Globally constant uniforms
        //uniform vec4 u_dofs;

        // Varyings
        in vec4 v_baryCoord;
        in vec4 v_color;

        // Resulting color
        out vec4 fragColor;

        void main()
        {
            // Piecewise linear function over tetrahedron
            //float f = dot(u_dofs, v_refcoord);

            // Maximum 1.0 at vertices, minimum 0.25 at midpoint
            float f = max4(v_baryCoord);

            // Debugging color
            vec4 C = v_color;
            C.a = f;
            fragColor = C;
        }
        `;
        return shader;
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
            //"a_baryCoord": 0,
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
            gl.blendFunc(gl.ONE, gl.ONE);  // TODO: Do we need to use alpha for fragment shader output?
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
            "a_baryCoord": {
                location: 0,
                dim: 4,
                gltype: gl.FLOAT,
                array: new Float32Array([
                    1.0, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0,
                ]),
                buffer: gl.createBuffer(),
                drawMode: gl.STATIC_DRAW,
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
            gl.bufferData(gl.ARRAY_BUFFER, attr.array, attr.drawMode);
        }

        // Build vao
        let vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // Configure attributes
        for (let name in attributes) {
            let attr = attributes[name];
            gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
            gl.vertexAttribPointer(attr.location, attr.dim, attr.gltype,
                                   attr.normalized, attr.stride, attr.offset);
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
        let gl = this.gl;

        // Setup global GL properties and clear canvas
        // TODO: According to config

        gl.disable(gl.DEPTH_TEST);

        //gl.enable(gl.CULL_FACE);
        gl.disable(gl.CULL_FACE);

        this.configureBlending();

        gl.clearColor(0.8, 0.8, 0.8, 1.0);
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

//////////////////////////////////////////////////////////////////////////////////////////




// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including
//
//  - `_view_name`
//  - `_view_module`
//  - `_view_module_version`
//
//  - `_model_name`
//  - `_model_module`
//  - `_model_module_version`
//
//  when different from the base class.

// Shared among models
let module_defaults = {
    _model_module : 'jupyter-unray',
    _view_module : 'jupyter-unray',
    _model_module_version : '0.1.0',
    _view_module_version : '0.1.0',
};


// When serialiazing the entire widget state for embedding, only values that
// differ from the defaults will be specified.
class UnrayModel extends widgets.DOMWidgetModel {

    defaults() {
        let model_defaults = {
            _model_name : 'UnrayModel',
            _view_name : 'UnrayView',

            // Configuration dict
            config : unray_default_config(),

            // Mesh and function data
            coordinates : ndarray(new Float32Array(), [0, 3]),
            cells : ndarray(new Uint32Array(), [0, 3]),
            values : ndarray(new Float32Array(), [0]),

            // TODO: More to come
        };

        let base_defaults = _.result(this, 'widgets.DOMWidgetModel.prototype.defaults');
        return _.extend(base_defaults, module_defaults, model_defaults);
    }

    get serializers() {
        let custom = {
            coordinates: array_serialization,
            cells: array_serialization,
            values: array_serialization,
        };
        return _.extend(custom, widgets.DOMWidgetModel.serializers);
    }

};


// Custom View. Renders the widget model.
class UnrayView extends widgets.DOMWidgetView {

    /* Hooks called from widget library or backbone */

    // Initialize view properties (called on initialization)
    initialize() {
        this.log("initialize");
        widgets.DOMWidgetView.prototype.initialize.apply(this, arguments);

        this.canvas = null;
        this.gl = null;
        this.unray = null;
    }

    // Render to DOM (called at least once when placed on page, not sure what the semantics are beyond that?)
    render() {
        this.log("render");
        this.setup_unray(this.el);
        //this.setup_unray_data();
        this.wire_events();

        // Schedule a
        this.schedule_redraw();
    }

    /* Internal view logic (may contain stupid parts, I don't know the widgets design very well) */

    log(msg) {
        console.log("unray view:  " + msg);
    }

    wire_events() {
        this.log("wire_events");
        this.model.on('change:config', this.config_changed, this);
        this.model.on('change:coordinates', this.coordinates_changed, this);
        this.model.on('change:cells', this.cells_changed, this);
        this.model.on('change:values', this.values_changed, this);
        this.on('animate:update', this.redraw, this);
    }

    setup_unray(elm) {
        this.log("setup_unray.");
        if (!this.canvas) {
            var canvas = document.createElement("canvas");
            elm.appendChild(canvas);
            this.canvas = canvas;
            this.log("created canvas");
        }
        if (!this.gl) {
            var gloptions = {
                antialias: false,
                depth: false,
                alpha: true,
                stencil: false,
                preserveDrawingBuffer: true,
                failIfMajorPerformanceCaveat: true,
            };
            this.gl = this.canvas.getContext("webgl2", this.gloptions);
            this.log("created webgl2 context");
        }
        if (!this.unray) {
            this.unray = new Unray(this.gl);
            this.log("created Unray instance");
        }
        this.log("leaving setup_unray.");
    }

    // TODO: pythreejs has some more sophisticated animation handlers
    schedule_redraw() {
        window.requestAnimationFrame(_.bind(this.redraw, this));
    }

    // Update canvas contents by executing gl draw calls in unray
    redraw() {
        this.log("redraw()");
        this.unray.redraw();
    }

    /* Data change handlers */

    config_changed() {
        var config = this.model.get('config');
        this.log("config changed:");
        this.log(config);
        this.unray.update_config(config);
        this.schedule_redraw();
    }

    coordinates_changed() {
        // FIXME
        var coordinates = this.model.get('coordinates');
        this.log("coordinates changed:");
        this.log(coordinates);
        this.unray.update_coordinates(coordinates);
        this.schedule_redraw();
    }

    cells_changed() {
        // FIXME
        var cells = this.model.get('cells');
        this.log("cells changed:");
        this.log(cells);
        this.unray.update_cells(cells);
        this.schedule_redraw();
    }

    values_changed() {
        // FIXME
        var values = this.model.get('values');
        this.log("values changed:");
        this.log(values);
        this.unray.update_values(values);
        this.schedule_redraw();
    }

};


module.exports = {
    UnrayModel : UnrayModel,
    UnrayView : UnrayView
};
