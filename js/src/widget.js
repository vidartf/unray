var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var ndarray = require('ndarray');


// Import the widgets-independent module
// (currently just local files, could be made a separate module later)
var unray = require('./unray.js');


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
    console.log("XXX")
    console.log(obj);
    return ndarray(new typesToArray[obj.dtype](obj.buffer.buffer), obj.shape);
}
var arrayToJSON = function(obj, manager) {
    // serialize to {shape: list, dtype: string, array: buffer}
    return {shape: obj.shape, dtype: obj.dtype, buffer: obj.data}
}
var array_serialization = { deserialize: JSONToArray, serialize: arrayToJSON };


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


// Define this just once
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

        let base_defaults = _.result(this, 'widgets.DOMWidgetModel.prototype.defaults');
        return _.extend(base_defaults, module_defaults, model_defaults);
    }
};

UnrayModel.serializers = _.extend({
            cells: array_serialization,
            ordering: array_serialization,
            coordinates: array_serialization,
            density: array_serialization,
            emission: array_serialization,
            density_lut: array_serialization,
            emission_lut: array_serialization,
            mvp: array_serialization,
            view_direction: array_serialization,
        }, widgets.DOMWidgetModel.serializers);


// Custom View. Renders the widget model.
class UnrayView extends widgets.DOMWidgetView {

    /* Hooks called from widget library or backbone */

    // Initialize view properties (called on initialization)
    initialize() {
        this.log("initialize");
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

    // Render to DOM (called at least once when placed on page)
    // TODO: can it be called more than once?
    render() {
        this.log("render");
        this.setup_unray(this.el);
        this.wire_events();
        this.all_changed();
    }

    /* Internal view logic */

    log(msg) {
        console.log("unray view:  " + msg);
    }

    wire_events() {
        this.log("wire_events");
        this.model.on('change:config', this.config_changed, this);

        for (let name of this.all_fields) {
            this.model.on("change:" + name, () => this.data_changed(name), this)
        }

        //this.on('animate:update', this.redraw, this);
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
            let config = this.model.get("config");
            this.unray = new unray.Unray(this.gl, config);
            this.log("created Unray instance");
        }
        this.log("leaving setup_unray.");
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
        this.log("config changed:");
        console.log(config);
        this.unray.update_config(config);
        this.schedule_redraw();
    }

    data_changed(name) {
        this.log("data_changed: " + name)
        var array = this.model.get(name);

        if (array.shape[0] === 0) {
            console.log("Skipping setting zero sized array " + name);
            return;
        }

        if (array.shape === undefined || array.dtype === undefined || array.data === undefined) {
            console.error("Expecting array object to have shape, dtype, data; with name = " + name, array);
        }

        this.log(name + " changed:");
        console.log(array);
        this.unray.update_data(name, array);
        this.schedule_redraw();
    }

};


module.exports = {
    UnrayModel : UnrayModel,
    UnrayView : UnrayView
};
