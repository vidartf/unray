'use strict';

import ndarray from 'ndarray';

// Array serialization code copied from pythreejs
const typesToArray = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array
};

const JSONToArray = (obj, manager) => {
    // obj is {shape: list, dtype: string, buffer: DataView}
    // return an ndarray object
    const arraytype = typesToArray[obj.dtype];
    if (arraytype === undefined) {
        console.error("Invalid dtype", obj.dtype);
    }
    return ndarray(new arraytype(obj.buffer.buffer), obj.shape);
}

const arrayToJSON = (obj, manager) => {
    // serialize to {shape: list, dtype: string, buffer: buffer}
    return {shape: obj.shape, dtype: obj.dtype, buffer: obj.data}
}

const array_serialization = {
    deserialize: JSONToArray,
    serialize: arrayToJSON,
};

export {
    array_serialization
};
