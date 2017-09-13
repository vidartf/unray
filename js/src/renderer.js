'use strict';

import _ from 'underscore';

import {
    extend2
} from './utils.js';

import {
    reorient_tetrahedron_cells
} from "./meshutils";

import {
    compute_range, extended_range, compute_texture_shape,
    allocate_lut_texture, allocate_array_texture,
    update_lut, update_array_texture
} from "./threeutils";

import {
    create_instanced_tetrahedron_geometry,
    create_cells_attribute,
    create_cell_ordering_attribute,
    create_bounding_sphere,
    create_bounding_box,
    create_bounding_sphere_geometry,
    create_bounding_box_geometry,
    create_bounding_box_axis_geometry,
    create_bounding_box_midplanes_geometry
} from './geometry';

import {create_material} from "./material";

import { default_uniforms } from "./uniforms"
import { create_three_data } from "./channels";

import {THREE} from './threeimport';

function sort_cells(ordering, cells, coordinates, camera_position, view_direction) {
    /*
    const num_tetrahedrons = cells.length / 4;
    for (let i = 0; i < num_tetrahedrons; ++i) {
        ordering[i] = i;
    }
    */

    // TODO: Compute a better perspective dependent ordering using topology

    // Naively sort by smallest distance to camera
    ordering.sort((i, j) => {
        const min_dist = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
        const indices = [i, j];
        for (let r = 0; r < 2; ++r) {
            const local_vertices = cells[indices[r]]
            for (let k = 0; k < 4; ++k) {
                const offset = 3*local_vertices[k];
                let dist = 0.0;
                for (let s = 0; s < 3; ++s) {
                    const dx = coordinates[offset+s] - camera_position[s];
                    // With orthographic camera and constant view direction
                    dist += view_direction[s] * dx;
                    // With perspective camera, use only distance to camera
                    //dist += dx*dx;
                }
                // Take distance from vertex with smallest distance
                // (could also use midpoint)
                min_dist[r] = Math.min(dist, min_dist[r]);
            }
        }
        if (min_dist[0] === min_dist[1]) {
            return 0;
        } else if (min_dist[0] < min_dist[1]) {
            return -1;
        } else {
            return +1;
        }
    });
}

// TODO: Use this in prerender and improve sorting
// when unsorted methods are working well
function update_ordering(geometry, material) {
    const u = material.uniforms;

    // TODO: Benchmark use of reordering array vs reordering
    //       cell data and uploading those larger buffers.
    const dir = u.u_local_view_direction.value;

    // Get cells and coordinates from texture data
    const cells = u.t_cells.value.image.data;
    const coordinates = u.t_coordinates.value.image.data;

    // NB! Number of cells === ordering.array.length,
    // !== cells.length / 4 which includes texture padding.

    // Compute cell reordering in place in geometry attribute array
    const ordering = geometry.attributes.c_ordering;
    sort_cells(ordering.array, cells, coordinates, dir);
    ordering.needsUpdate = true;
}

function create_geometry(sorted, cells, coordinates) {
    // Assuming tetrahedral mesh
    const num_tetrahedrons = cells.length / 4;

    // Reorient tetrahedral cells (NB! this happens in place!)
    // TODO: We want cells to be reoriented _once_ if they're
    //       reused because this is a bit expensive
    reorient_tetrahedron_cells(cells, coordinates);

    // Setup cells of geometry (using textures or attributes)
    const attributes = {};
    if (sorted) {
        // Need ordering, let ordering be instanced and read cells from texture
        // Initialize ordering array with contiguous indices,
        // stored as floats because webgl2 is required for integer attributes.
        // When assigned a range of integers, the c_ordering instance attribute
        // can be used as a replacement for gl_InstanceID which requires webgl2.
        attributes.c_ordering = create_cell_ordering_attribute(num_tetrahedrons);
    } else {
        // Don't need ordering, pass cells as instanced buffer attribute instead
        attributes.c_cells = create_cells_attribute(cells);
    }

    // Configure instanced geometry, each tetrahedron is an instance
    const geometry = create_instanced_tetrahedron_geometry(num_tetrahedrons);
    for (let name in attributes) {
        geometry.addAttribute(name, attributes[name]);
    }

    // Compute bounding box and sphere and set on geometry so
    // they become available to generic THREE.js code
    geometry.boundingSphere = create_bounding_sphere(coordinates);
    geometry.boundingBox = create_bounding_box(coordinates);

    return geometry;
}

function prerender_update(renderer, scene, camera, geometry, material, group, mesh) {
    //console.log("In prerender_update", {renderer, scene, camera, geometry, material, group, mesh});
    console.log("In prerender_update", camera.getWorldPosition());

    // Just in time updates of uniform values
    const u = material.uniforms;

    // FIXME: Get actual time from some start point in seconds,
    // or make it a parameter to be controlled from the outside
    const time = 0.0;
    u.u_time.value = time;

    for (let i=0; i<4; ++i) {
        u.u_oscillators.value.setComponent(i, Math.sin((i+1) * Math.PI * time));
    }

    // TODO: Are all these up to date here? Need to call any update functions?
    // mesh.matrixWorld
    // camera.matrixWorldInverse
    // camera.projectionMatrix

    // Get and precompute some transforms
    const M = mesh.matrixWorld;  // maps from object space to world space
    const V = camera.matrixWorldInverse; // maps from world space to camera space
    const P = camera.projectionMatrix; // maps from camera space to clip coordinates

    const Minv = new THREE.Matrix4(); // maps from world space to object space
    Minv.getInverse(M);
    // const Vinv = new THREE.Matrix4(); // maps from camera space to world space
    // Vinv.getInverse(V);
    // const MVinv = new THREE.Matrix4(); // maps from camera space to object space
    // MVinv.getInverse(MV);

    // Transform camera direction from world coordinates to object space
    // (only used for orthographic projection)
    const local_view_direction = u.u_local_view_direction.value;
    camera.getWorldDirection(local_view_direction);
    local_view_direction.applyMatrix4(Minv); // map from world space to object space

    // Transform camera position from world coordinates to object space
    const local_camera_position = u.u_local_camera_position.value;
    camera.getWorldPosition(local_camera_position);
    local_camera_position.applyMatrix4(Minv); // map from world space to object space

    // Compute entire MVP matrix
    const MV = new THREE.Matrix4(); // maps from object space to camera space
    MV.multiplyMatrices(V, M);
    const MVP = u.u_mvp_matrix.value; // maps from object space to clip space
    MVP.multiplyMatrices(P, MV);
}

function create_mesh(method, encoding, data) {
    // Tetrahedral mesh data is required and assumed to be present at this point
    const cells = data[encoding.cells.field];
    const coordinates = data[encoding.coordinates.field];
    // const num_vertices = coordinates.length / 3;
    // const num_tetrahedrons = cells.length / 4;

    const sorted = true || method === "volume";  // FIXME: Enable the non-sorted branch

    // Initialize uniforms, including textures
    //const uniforms = create_uniforms(method, encoding, data, num_tetrahedrons, num_vertices);
    //const defines = method_defines[method];
    const {uniforms, defines, attributes} = create_three_data(method, encoding, data);

    // Initialize geometry
    const geometry = create_geometry(sorted, cells, coordinates);

    // Configure material (shader)
    const material = create_material(method, uniforms, defines);

    // Finally we have a Mesh to render for this method
    const mesh = new THREE.Mesh(geometry, material);
    mesh.setDrawMode(THREE.TriangleStripDrawMode);

    mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
        prerender_update(renderer, scene, camera, geometry, material, group, mesh);
    };

    // If needed, we can attach properties to the mesh.userData object:
    //Object.assign(mesh.userData, { method, encoding });

    return mesh;
}

function add_debugging_geometries(root, mesh) {
    // Add a bounding sphere representation to root for debugging
    // root.add(create_bounding_sphere_geometry(mesh.geometry.boundingSphere, 1.1));

    // Add a bounding box representation to root for debugging
    // root.add(create_bounding_box_geometry(mesh.geometry.boundingBox, 1.1));

    // Add a bounding box midplane representation to root for debugging
    // root.add(create_bounding_box_midplanes_geometry(mesh.geometry.boundingBox, 1.1));

    // Add a bounding box wireframe representation to root for debugging
    root.add(create_bounding_box_axis_geometry(mesh.geometry.boundingBox, 1.1));

    // Add a sphere representation of center for debugging
    // const sphere = mesh.geometry.boundingSphere.clone();
    // sphere.radius *= 0.05;
    // root.add(create_bounding_sphere_geometry(sphere));
}

const method_backgrounds = {
    // Must start with a black background
    max: new THREE.Color(0, 0, 0),
    max2: new THREE.Color(0, 0, 0),
    sum: new THREE.Color(0, 0, 0),

    // Must start with a white background
    min: new THREE.Color(1, 1, 1),
    min2: new THREE.Color(1, 1, 1),
    xray: new THREE.Color(1, 1, 1),
    xray2: new THREE.Color(1, 1, 1),
};

class UnrayStateWrapper {
    init(root, method, encoding, data) {
        // Select method-specific background color
        // TODO: How to deal with this when adding to larger scene?
        //       I guess it will be up to the user.
        //       Alternatively, could add a background box of the right color.
        this.bgcolor = method_backgrounds[method] || new THREE.Color(1, 1, 1);

        const mesh = create_mesh(method, encoding, data);

        root.add(mesh);

        this.root = root;
        add_debugging_geometries(root, mesh);
    }

    update(changed) {
        // for (let name in changed) {
        //     this.channel_update(name)(changed[name]);
        // }
    }

    // Select method-specific background color
    // Currently called by figure, TODO: remove when using pythreejs renderer
    get_bgcolor() {
        return this.bgcolor;
    }
}

export
function create_unray_state(root, method, encoding, data) {
    const state = new UnrayStateWrapper();
    state.init(root, method, encoding, data);
    // console.log("////////////////////////////////");
    // console.log("Created unray state:");
    // console.log(state);
    // console.log("////////////////////////////////");
    return state;
}