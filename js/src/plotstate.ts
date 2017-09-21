"use strict";

import * as _ from "underscore";
import * as THREE from "three";

import {
    create_bounding_sphere_geometry,
    create_bounding_box_geometry,
    create_bounding_box_axis_geometry,
    create_bounding_box_midplanes_geometry
} from "./boundinggeometry";
import {create_three_data} from "./channels";
import {create_geometry} from "./geometry";
import {create_material} from "./material";
import {sort_cells} from "./sorting";

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

function prerender_update(renderer, scene, camera, geometry, material, group, mesh) {
    // console.log("In prerender_update", {renderer, scene, camera, geometry, material, group, mesh});
    // console.log("In prerender_update", camera.getWorldPosition());

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
    if (encoding.cells === undefined || encoding.cells.field === undefined) {
        throw new Error("Cannot create mesh, missing cells in the encoding.")
    }
    if (encoding.coordinates === undefined || encoding.coordinates.field === undefined) {
        throw new Error("Cannot create mesh, missing coordinates in the encoding.")
    }

    const cells = data[encoding.cells.field];
    const coordinates = data[encoding.coordinates.field];

    if (cells === undefined) {
        throw new Error("Cannot create mesh, missing cells in data.")
    }
    if (coordinates === undefined) {
        throw new Error("Cannot create mesh, missing coordinates in data.")
    }

    // Determine whether cells should be sorted based on view direction
    // const sorted = method === "volume";
    const sorted = true;  // FIXME: Enable the non-sorted branch

    // Initialize uniforms, including textures
    const {uniforms, defines, attributes} = create_three_data(method, encoding, data);

    // Initialize geometry
    // TODO: Currently not reusing cell attributes between models
    // TODO: Currently computing bounding objects from coordinates for each geometry
    const geometry = create_geometry(sorted, cells, coordinates);

    // Configure material (shader)
    const material = create_material(method, uniforms, defines);

    // Finally we have a Mesh to render for this method
    const mesh = new THREE.Mesh(geometry, material);
    mesh.setDrawMode(THREE.TriangleStripDrawMode);

    mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
        prerender_update(renderer, scene, camera, geometry, material, group, mesh);
    };

    // If needed, we can attach properties to the mesh.userData object,
    // doing it now merely for the debugging convenience:
    Object.assign(mesh.userData, { method, encoding });

    return mesh;
}

function update_mesh(mesh, method, encoding, data) {
    // Recompute uniforms and defines (this also updates texture values etc)
    const {uniforms, defines, attributes} = create_three_data(method, encoding, data);

    // Update material (let three.js determine if recompilation is necessary)
    const mat = mesh.material;
    Object.keys(mat.uniforms).forEach(k => { delete mat.uniforms[k]; });
    Object.assign(mat.uniforms, uniforms);
    Object.keys(mat.defines).forEach(k => { delete mat.defines[k]; });
    Object.assign(mat.defines, defines);
    mat.needsUpdate = true;

    // TODO: Is it necessary to update geometry? If attributes can change it is.
    if (Object.keys(attributes).length > 0) {
        console.warn("Ignoring newly created attributes in update_mesh.", attributes);
    }
    //const geo = mesh.geometry;
    //geo.attributes.addAttribute();
}

function create_debugging_geometries(mesh) {
    const root = new THREE.Group();

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

    return root;
}


const method_backgrounds = {
    // These methods need a dark background
    max: new THREE.Color(0, 0, 0),
    max2: new THREE.Color(0, 0, 0),
    sum: new THREE.Color(0, 0, 0),

    // These methods need a bright background
    min: new THREE.Color(1, 1, 1),
    min2: new THREE.Color(1, 1, 1),
    xray: new THREE.Color(1, 1, 1),
    xray2: new THREE.Color(1, 1, 1),
};

export
function create_plot_state(root, method) {
    const state = {
        // Remember the root node (a THREE.Group instance) to modify our subscene
        root: root,

        // Method decides how to interpret encoding and data
        method: method,

        // Called once initial encoding and data is available
        init(encoding, data) {
            if (this.root.children.length !== 0) {
                console.error("Expecting init called only once.");
            }
            const mesh = create_mesh(this.method, encoding, data);
            this.root.add(mesh);
            this.root.add(create_debugging_geometries(mesh));

            // console.log("Initialized plot mesh:", mesh);
            // console.log("defines:", mesh.material.defines);
            // console.log("uniforms:", mesh.material.uniforms);
        },

        // Called on later updates
        update(encoding, data) {
            if (this.root.children.length === 0) {
                throw new Error("Expecting init called once before calling update.");
            }
            // Find mesh (should be the first root node, make this more robust if needed)
            const mesh = this.root.children[0];
            update_mesh(mesh, this.method, encoding, data);
            // console.log("Updated plot mesh:", mesh);
        },

        // Method specific suggestion for background color
        bgcolor: method_backgrounds[method] || new THREE.Color(1, 1, 1),

        // TODO: How to deal with background color when adding to larger scene?
        //       Could add a background box of the right color.
        //       Or render to a texture then do some postprocessing.
        get_bgcolor() {
            // TODO: Currently called by figure, can remove when using pythreejs renderer
            return this.bgcolor;
        }
    };
    // console.log("Constructed plot state:", state);
    return state;
}