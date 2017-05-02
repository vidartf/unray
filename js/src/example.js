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


// TODO: Place in its own file or even separate module
/*
class Unray
{
    constructor(gl) {
        this.gl = gl;
        console.log("Unray: " + gl);
    }
};
*/


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

// When serialiazing the entire widget state for embedding, only values that
// differ from the defaults will be specified.
var UnrayModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(_.result(this, 'widgets.DOMWidgetModel.prototype.defaults'), {
        _model_name : 'UnrayModel',
        _view_name : 'UnrayView',
        _model_module : 'jupyter-unray',
        _view_module : 'jupyter-unray',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',

        // Configuration dict
        config : {
            raymodel: "sum",
        },

        // Mesh and function data
        coordinates: ndarray(new Float32Array(), [0, 3]),
        cells: ndarray(new Uint32Array(), [0, 3]),
        values: ndarray(new Float32Array(), [0]),

        // TODO: More to come
    })
}, {
    serializers: _.extend({
        coordinates: array_serialization,
        cells: array_serialization,
        values: array_serialization,
    }, widgets.DOMWidgetModel.serializers)
});


// Custom View. Renders the widget model.
var UnrayView = widgets.DOMWidgetView.extend({
    _wire_events: function() {
        console.log("Wiring unray widget events.");
        this.model.on('change:config', this.config_changed, this);
        this.model.on('change:coordinates', this.coordinates_changed, this);
        this.model.on('change:cells', this.cells_changed, this);
        this.model.on('change:values', this.values_changed, this);
    },

/*
    _setup_unray: function() {
        console.log("Beginning of unray setup.");
        if (!!this._canvas) {
            console.log("Creating canvas for unray.");
            this._canvas = document.createElement("canvas");
            this._canvas.width = 800;
            this._canvas.height = 600;
            this.el.appendChild(this._canvas);
        }
        if (!!this._gl) {
            console.log("Creating gl context for unray.");
            let gloptions = {
                antialias: false,
                depth: false,
                alpha: true,
                stencil: false,
                preserveDrawingBuffer: true,
                failIfMajorPerformanceCaveat: true,
            };
            this._gl = this._canvas.getContext("webgl2", gloptions);
        }
        if (!!this.unray) {
            console.log("Creating unray object.");
            this._unray = new Unray(this._gl);
        }
        console.log("End of unray setup.");
    },
        */

    render: function() {
        if (!this._render_count) {
            this._render_count = 1;
        } else {
            this._render_count++;
        }
        this.el.textContent = "Rendering call " + this._render_count;

        //this._setup_unray();
        //this._setup_unray_data();
        this._wire_events();
    },

    config_changed: function() {
        // FIXME
        var config = this.model.get('config');
        console.log("config changed:");
        console.log(config);
    },

    coordinates_changed: function() {
        // FIXME
        var coordinates = this.model.get('coordinates');
        console.log("coordinates changed:");
        console.log(coordinates);
    },

    cells_changed: function() {
        // FIXME
        var cells = this.model.get('cells');
        console.log("cells changed:");
        console.log(cells);
    },

    values_changed: function() {
        // FIXME
        var values = this.model.get('values');
        console.log("values changed:");
        console.log(values);
    },

});


module.exports = {
    UnrayModel : UnrayModel,
    UnrayView : UnrayView
};
