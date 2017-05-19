
let ndarray = require('ndarray');

// Array serialization code copied from pythreejs
let typesToArray = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array
}
let JSONToArray = function(obj, manager) {
    // obj is {shape: list, dtype: string, buffer: DataView}
    // return an ndarray object
    return ndarray(new typesToArray[obj.dtype](obj.buffer.buffer), obj.shape);
}
let arrayToJSON = function(obj, manager) {
    // serialize to {shape: list, dtype: string, buffer: buffer}
    return {shape: obj.shape, dtype: obj.dtype, buffer: obj.data}
}
let array_serialization = { deserialize: JSONToArray, serialize: arrayToJSON };


// TODO: Follow ipyvolume strategy on versionining?
// same strategy as: ipywidgets/jupyter-js-widgets/src/widget_core.ts, except we use ~
// so that N.M.x is allowed (we don't care about x, but we assume 0.2.x is not compatible with 0.3.x
//let semver_range = '~' + require('../package.json').version;

let semver_range = require('../package.json').version;


// Define this just once
let module_defaults = {
    _model_module : 'jupyter-unray',
    _view_module : 'jupyter-unray',
    _model_module_version : '0.1.0',
    _view_module_version : '0.1.0',
};

module.exports = {
    array_serialization,
    module_defaults
};
