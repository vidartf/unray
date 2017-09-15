"use strict";

import * as THREE from "three";

import {ObjectManager} from "./object_manager";

import {
    allocate_lut_texture,
    allocate_array_texture,
    update_array_texture
} from "./threeutils";


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