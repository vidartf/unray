var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var ndarray = require('ndarray');

// Local imports
var utils = require('../utils.js');
var unray = require('./unray.js');


class UnrayModel extends widgets.DOMWidgetModel {

    defaults() {
        let model_defaults = {
            _model_name : 'UnrayModel',
            _view_name : 'UnrayView',

            // Canvas size
            width : 800,
            height : 600,
            downscale : 1.0,
            ready : false,

            // Configuration
            config : unray.Unray.default_config(),

            // Mesh and function data
            cells : ndarray(new Uint32Array(), [0, 4]),
            ordering : ndarray(new Uint32Array(), [0]),
            coordinates : ndarray(new Float32Array(), [0, 3]),

            density : ndarray(new Float32Array(), [0]),
            emission : ndarray(new Float32Array(), [0]),
            density_lut : ndarray(new Float32Array(), [0]),
            emission_lut : ndarray(new Float32Array(), [0, 3]),

            mvp : ndarray(new Float32Array(), [4, 4]),
            view_direction : ndarray(new Float32Array(), [3]),
        };

        return _.extend({}, super.defaults(), utils.module_defaults, model_defaults);
    }

    initialize() {
        super.initialize(...arguments);
        this.on("msg:custom", this.on_custom_msg, this);
    }

    on_custom_msg(content, buffers) {
        switch (content.action) {
            case "show":
                this.trigger("unray:show");
                break;

            case "set_data":
                // This approach allows sending arrays from the kernel side
                // without going through the widgets trait synchronization
                // which gives a bit more control, but possibly loses some
                // functionality along the way.
                // TODO: For example I'm not sure what's the best way to
                //   handle serialization of data sent this way.
                let arr = ndarray(new typesToArray[content.dtype](buffers[0].buffer), content.shape);
                // ...
                break;

            default:
                console.error("Unknown custom message + " + content);
        }
    }
};
UnrayModel.serializers = _.extend({
            cells: utils.array_serialization,
            ordering: utils.array_serialization,
            coordinates: utils.array_serialization,
            density: utils.array_serialization,
            emission: utils.array_serialization,
            density_lut: utils.array_serialization,
            emission_lut: utils.array_serialization,
            mvp: utils.array_serialization,
            view_direction: utils.array_serialization,
        }, widgets.DOMWidgetModel.serializers);


// Custom View. Renders the widget model.
class UnrayView extends widgets.DOMWidgetView {

    /* Hooks called from widget library or backbone */

    // Initialize view properties (called on initialization)
    initialize() {
        widgets.DOMWidgetView.prototype.initialize.apply(this, arguments);

        // Array fields that will be passed on to unray
        this.all_fields = [
            "cells", "ordering",
            "coordinates",
            "density", "emission",
            "density_lut", "emission_lut",
            "mvp", "view_direction",
            ];

        this.canvas = null;
        this.gl = null;
        this.unray = null;
        this._hold_redraw = true;
    }

    update(options) {
        console.log("UPDATE", options);
    }

    // Render to DOM (called at least once when placed on page)
    // TODO: can it be called more than once?
    render() {
        this.setup_unray(this.el);
        this.wire_events();
        //this.all_changed();
    }

    // ipyvolume scatter view does something like this:
    /*
    unused_render_ideas() {
        // ...
        this.splat_material = new THREE.RawShaderMaterial({
            uniforms: {
                time : { type: "f", value: 0.0 },
                range: { type: "2f", value: [0.0, 1.0] },
            //}, textures: {
                // Cell textures
                cells : { type: "t", dtype: "4u" },
                // Vertex textures
                coordinates : { type: "t", dtype: "3f" },
                density : { type: "t", dtype: "1f" },
                emission : { type: "t", dtype: "3f" },
            },
            attributes: {  // FIXME: something like this
                reorder: { type: "u" },  // uniform cell reordering?
            },
            instance_attributes: {  // FIXME: something like this
                ordering: { type: "u" }
            },
            vertexShader: "#define AS_SPLAT\n" + require('../glsl/unray-vertex.glsl'),
            fragmentShader: "#define AS_SPLAT\n" + require('../glsl/unray-fragment.glsl'),
        });
        this.create_mesh()
        this.add_to_scene()
        this.model.on("change:size change:x",   this.on_change, this)
        this.model.on("change:geo change:connected", this.update_, this)
    }
    */

    /* Internal view logic */

    log(msg) {
        console.log("unray view:  " + msg);
    }

    on_show() {
        console.log("SHOWTIME!")
    }

    wire_events() {
        this.model.on("unray:show", this.on_show, this);

        this.model.on('change:config', this.config_changed, this);

        for (let name of this.all_fields) {
            this.model.on("change:" + name, () => this.data_changed(name), this)
        }

        //this.on('animate:update', this.redraw, this);
    }

    setup_unray(elm) {
        if (!this.canvas) {
            var canvas = document.createElement("canvas");
            elm.appendChild(canvas);
            this.canvas = canvas;
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
            this.gl = this.canvas.getContext("webgl2", gloptions);
        }
        if (!this.unray) {
            let config = this.model.get("config");
            this.unray = new unray.Unray(this.gl, config);
        }
    }

    // TODO: pythreejs has some more sophisticated animation handlers
    schedule_redraw() {
        if (!this._hold_redraw) {
            window.requestAnimationFrame(_.bind(this.redraw, this));
        }
    }

    // Update canvas contents by executing gl draw calls in unray
    redraw() {
        this.log("redraw()");
        this.unray.redraw();
    }

    /* Data change handlers */
    all_changed() {
        this._hold_redraw = true;

        this.config_changed();

        for (let name of this.all_fields) {
            this.data_changed(name);
        }

        this._hold_redraw = false;
        this.schedule_redraw();
    }

    config_changed() {
        var config = this.model.get('config');
        this.unray.update_config(config);
        this.schedule_redraw();
    }

    data_changed(name) {
        var array = this.model.get(name);

        // TODO: Better solution to empty default arrays before they're set?
        if (array.shape[0] === 0) {
            this.log("Skipping setting zero sized array " + name);
            return;
        }

        if (array.shape === undefined || array.dtype === undefined || array.data === undefined) {
            console.error("Expecting array object to have shape, dtype, data; with name = " + name, array);
        }

        this.unray.update_data(name, array);
        this.schedule_redraw();
    }

};


module.exports = {
    UnrayModel, UnrayView,
};
