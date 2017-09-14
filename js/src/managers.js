"use strict";

import {THREE} from './threeimport';

import {ObjectManager} from "./object_manager";

import {
    allocate_lut_texture,
    allocate_array_texture,
    update_lut,
    update_array_texture
} from "./threeutils";

// channel.dtype
// channel.item_size
// vertex_texture_shape
// cell_texture_shape
// Singleton managers for each object type
export
const managers = {
    array_texture: new ObjectManager(
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
    lut_texture: new ObjectManager(
        // Create
        ({array, dtype, item_size, texture_shape}) => {
            const texture = allocate_array_texture(dtype, item_size, texture_shape);
            update_array_texture(texture, array);
            return texture;
        },
        // Update
        (texture, {array, dtype, item_size}) => {
            update_lut(texture, array, item_size, dtype);
        },
    ),
    cells_buffer: new ObjectManager(
        // Create
        ({array, dtype, item_size}) => {
            const buffer = new THREE.InstancedBufferAttribute(array, item_size, 1);
            //buffer.setDynamic(true);
            return buffer;
        },
        // Update
        (buffer, {array, dtype, item_size}) => {
            buffer.array.set(array);
            buffer.needsUpdate = true;
        }
    ),
};
