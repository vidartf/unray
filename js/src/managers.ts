"use strict";

import * as THREE from "three";

import {ObjectManager} from "./object_manager";

import {
    TypedArray
} from './utils';

export
const dtype2threetype: { [key: string]: THREE.TextureDataType} = {
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
const itemsize2threeformat: { [key: number]: THREE.PixelFormat} = {
    1: THREE.AlphaFormat,
    3: THREE.RGBFormat,
    4: THREE.RGBAFormat
};

export
function allocate_array_texture(dtype: string, item_size: number, texture_shape: number[]): THREE.DataTexture {
    // Textures using Int32Array and Uint32Array require webgl2,
    // so currently just ignoring the dtype during prototyping.
    // Some redesign may be in order once the prototype is working,
    // or maybe porting to webgl2.
    // const arraytype = dtype2arraytype[dtype];
    // const padded_data = new arraytype(size);
    // const type = dtype2threetype[dtype];

    const size = texture_shape[0] * texture_shape[1] * item_size;
    const padded_data = new Float32Array(size);
    const format = itemsize2threeformat[item_size];
    const type = dtype2threetype["float32"];  // NB! See comment above

    const texture = new THREE.DataTexture(
        padded_data,
        texture_shape[0], texture_shape[1],
        format, type);

    return texture;
}

export
function allocate_lut_texture(dtype: string, item_size: number, texture_shape: number[]): THREE.DataTexture {
    // Textures using Int32Array and Uint32Array require webgl2,
    // so currently just ignoring the dtype during prototyping.
    // Some redesign may be in order once the prototype is working,
    // or maybe porting to webgl2.
    // const arraytype = dtype2arraytype[dtype];
    // const padded_data = new arraytype(size);
    // const type = dtype2threetype[dtype];

    const size = texture_shape[0] * texture_shape[1] * item_size;
    const padded_data = new Float32Array(size);
    const format = itemsize2threeformat[item_size];
    const type = dtype2threetype["float32"];  // NB! See comment above

    const mapping = undefined;
    const wrapping = THREE.ClampToEdgeWrapping;
    const filter = THREE.LinearFilter;  // TODO: Could make linear/nearest filtering of lut an encoding parameter

    const texture = new THREE.DataTexture(
        padded_data,
        texture_shape[0], texture_shape[1],
        format, type,
        mapping,
        wrapping, wrapping,
        filter, filter);

    return texture;
}

export
function update_array_texture(texture: THREE.DataTexture, data: TypedArray) {
    try {
        // Note that input data may be Int32Array or Uint32Array
        // here while image.data is currently always Float32Array
        // (see allocate_array_texture) because webgl doesn't support
        // large integer textures, but this .set operation still works
        // fine and doubles as type casting the data before uploading.

        // Type cast due to incorrect typing of set function in library:
        texture.image.data.set(data as Uint8ClampedArray);
    } catch(e) {
        console.error("failed to update texture", e);
    }
    texture.needsUpdate = true;
}


export
interface IArrayTextureKey {
    array: TypedArray;
    dtype: string;
    item_size: number;
    texture_shape: number[];
}

export
interface ILutTextureKey {
    array: TypedArray;
    dtype: string;
    item_size: number;
}

export
interface ICellsBufferKey {
    array: TypedArray;
    dtype: string;
    item_size: number;
}

export
type MangerKey = IArrayTextureKey | ILutTextureKey | ICellsBufferKey;


export
interface IManagers {
    array_texture: ObjectManager<IArrayTextureKey, THREE.DataTexture>;
    lut_texture: ObjectManager<ILutTextureKey, THREE.DataTexture>;
    cells_buffer: ObjectManager<ICellsBufferKey, THREE.InstancedBufferAttribute>;
}

// Singleton managers for each object type
export
const managers: IManagers = {
    array_texture: new ObjectManager<IArrayTextureKey, THREE.DataTexture>(
        // Create
        ({array, dtype, item_size, texture_shape}) => {
            const texture = allocate_array_texture(dtype, item_size, texture_shape);
            update_array_texture(texture, array);
            return texture;
        },
        // Update
        (texture, {array, dtype, item_size, texture_shape}) => {
            update_array_texture(texture, array);
        },
    ),
    lut_texture: new ObjectManager<ILutTextureKey, THREE.DataTexture>(
        // Create
        ({array, dtype, item_size}) => {
            const texture_shape = [array.length / item_size, 1];
            const texture = allocate_lut_texture(dtype, item_size, texture_shape);
            update_array_texture(texture, array);
            return texture;
        },
        // Update
        (texture, {array}) => {
            update_array_texture(texture, array);
        },
    ),
    cells_buffer: new ObjectManager<ICellsBufferKey, THREE.InstancedBufferAttribute>(
        // Create
        ({array, dtype, item_size}) => {
            const buffer = new THREE.InstancedBufferAttribute(array, item_size, 1);
            //buffer.setDynamic(true);
            return buffer;
        },
        // Update
        (buffer, {array, dtype, item_size}) => {
            // Cast due to imprecise typing int @types/three
            (buffer.array as TypedArray).set(array);
            buffer.needsUpdate = true;
        }
    ),
};
