'use strict';

var _ = require('underscore');
var THREE = require('three');

//var utils = require('./utils.js');


// Load sources, configurable through #defines
let sources = {
    // "Cell shaders" for per-tetrahedron preprocessing
    cell_shader: require("./glsl/unray-cell.glsl"),
    dummy_fragment_shader: require("./glsl/dummy-fragment.glsl"),
    // Vertex and fragment shaders
    vertex_shader: require("./glsl/unray-vertex.glsl"),
    fragment_shader: require("./glsl/unray-fragment.glsl"),
};


class Renderer
{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.gl = canvas.getContext("webgl2", this.gloptions());
        this.clear();
    }

    gloptions()
    {
        return {
            alpha: true,
            antialias: false,
            depth: true,
            stencil: false,
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: true,
        };
    }

    set_size(width, height)
    {
        this.width = width;
        this.height = height;
    }

    on_context_lost()
    {
        this.clear();
    }

    on_context_restored()
    {
        this.upload();
    }

    clear()
    {
        //this.element_array_buffer = {};
        //this.buffers = {};
        //this.textures = {};
        //this.uniforms = {};
        //this.shaders = {};
        //this.programs = {};
    }

    allocate()
    {
        // FIXME: Allocate data here
    }

    upload()
    {
        // FIXME: Upload data here
    }

    redraw()
    {
        this.allocate();
        this.upload();

        let gl = this.gl;

        if (this.width !== gl.canvas.width || this.height !== gl.canvas.height) {
            console.error("Warning: unexpected width/height mismatch in renderer.");
        }
        let width = this.downscale * gl.canvas.width;
        let height = this.downscale * gl.canvas.height;

        // Basic setup (TODO: some of this may be method dependent)
        gl.viewport(0, 0, width, height);
        gl.clearColor(0.8, 0.8, 0.8, 1.0);
        //gl.enable(gl.BLEND);
        gl.disable(gl.BLEND);
        //gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.DEPTH_TEST);

        // Clear screen
        gl.clear(gl.COLOR_BUFFER_BIT);


        // TODO: Test that it works up to here
        if (true)
            return;


        // Select program

        // Select vao

        // Setup element array

        // Setup vertex attributes
        // local tetrahedron vertex properties

        // Setup instanced attributes
        // if ordered method:
        //     ordering
        // else:
        //     cells

        // Setup texture units (data driven)
        // if not ordered method:
        //     cells
        // coordinates
        // density
        // emission
        // density_lut
        // emission_lut

        // Setup uniforms
        // mvp
        // view_direction
        // time and oscillators


        let num_tetrahedrons = FIXME;

        // Draw each tetrahedron as an instance of a triangle strip
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, 6, gl.UNSIGNED_INT, 0, num_tetrahedrons);
    }
};


module.exports = {
    Renderer
};
