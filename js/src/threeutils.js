"use strict";

import {THREE} from './threeimport';

export
function compute_range(array) {
    let min = array[0];
    let max = array[0];
    for (let v of array) {
        min = Math.min(min, v);
        max = Math.max(max, v);
    }
    return [min, max];
}

export
function extended_range(min, max) {
    let range = max - min;
    let scale = range > 0.0 ? 1.0 / range : 1.0;
    return [min, max, range, scale];
}

export
function compute_texture_shape(size) {
    if (size <= 0) {
        throw { message: 'Expecting a positive size', size: size };
    }
    const width = Math.pow(2, Math.floor(Math.log2(size) / 2));
    const height = Math.ceil(size / width);
    return [width, height];
}

export
const dtype2threetype = {
    float32: THREE.FloatType,
    uint32: THREE.UnsignedIntType,
    uint16: THREE.UnsignedIntType,
    uint8: THREE.UnsignedIntType,
    int32: THREE.IntType,
    int16: THREE.IntType,
    int8: THREE.IntType,
};

// export
// const dtype2arraytype = {
//     float32: Float32Array,
//     uint32: Uint32Array,
//     uint16: Uint16Array,
//     uint8: Uint8Array,
//     int32: Int32Array,
//     int16: Int16Array,
//     int8: Int8Array,
// };

export
const itemsize2threeformat = {
    1: THREE.AlphaFormat,
    3: THREE.RGBFormat,
    4: THREE.RGBAFormat
};

export
function allocate_array_texture(dtype, item_size, texture_shape) {
    const size = texture_shape[0] * texture_shape[1] * item_size;

    // console.log("Allocating array texture with shape: ", texture_shape);

    // Textures using Int32Array and Uint32Array require webgl2,
    // so currently just ignoring the dtype during prototyping.
    // Some redesign may be in order once the prototype is working,
    // or maybe porting to webgl2.
    // const arraytype = dtype2arraytype[dtype];
    // const padded_data = new arraytype(size);
    // const type = dtype2threetype[dtype];

    const padded_data = new Float32Array(size);
    const type = dtype2threetype["float32"];  // NB! See comment above

    const format = itemsize2threeformat[item_size];

    const texture = new THREE.DataTexture(padded_data,
        texture_shape[0], texture_shape[1],
        format, type);

    return texture;
}

export
function allocate_lut_texture(dtype, item_size, texture_shape) {
    const size = texture_shape[0] * texture_shape[1] * item_size;

    // Textures using Int32Array and Uint32Array require webgl2,
    // so currently just ignoring the dtype during prototyping.
    // Some redesign may be in order once the prototype is working,
    // or maybe porting to webgl2.
    // const arraytype = dtype2arraytype[dtype];
    // const padded_data = new arraytype(size);
    // const type = dtype2threetype[dtype];

    const padded_data = new Float32Array(size);
    const type = dtype2threetype["float32"];  // NB! See comment above

    const format = itemsize2threeformat[item_size];

    const texture = new THREE.DataTexture(padded_data,
        texture_shape[0], texture_shape[1],
        format, type,
        undefined,
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
        // TODO: Could make linear/nearest filtering of lut an encoding parameter
        THREE.LinearFilter, THREE.LinearFilter);

    return texture;
}

export
function update_array_texture(texture, data) {
    try {
        // Note that input data may be Int32Array or Uint32Array
        // here while image.data is currently always Float32Array
        // (see allocate_array_texture) because webgl doesn't support
        // large integer textures, but this .set operation still works
        // fine and doubles as type casting the data before uploading.
        texture.image.data.set(data);
    } catch(e) {
        console.error("failed to update texture", e);
    }
    texture.needsUpdate = true;
}

export
function update_lut(uniform, new_value, item_size, dtype) {
    const dim = new_value.length / item_size;
    if (!uniform.value) {
        uniform.value = allocate_lut_texture(dtype, item_size, [dim, 1]);
    } else if (uniform.value.image.width !== dim) {
        // TODO: Should we deallocate the gl texture via uniform.value somehow?
        uniform.value = allocate_lut_texture(
            dtype, item_size, [dim, 1]);
    }
    update_array_texture(uniform.value, new_value);
}
