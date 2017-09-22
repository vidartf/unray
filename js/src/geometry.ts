"use strict";

import * as THREE from "three";

import { arange } from "./utils";
import { compute_tetrahedron_cell_orientations, reorient_tetrahedron_cells } from "./meshutils";
import { create_bounding_sphere, create_bounding_box } from "./boundinggeometry";

export
function create_instanced_tetrahedron_geometry(num_tetrahedrons: number): THREE.InstancedBufferGeometry {
    // This is the coordinates of our reference tetrahedron,
    // assumed a few places via face numbering etc.,
    // included here for reference
    // const reference_coordinates = [
    //     0, 0, 0,
    //     1, 0, 0,
    //     0, 1, 0,
    //     0, 0, 1
    // ];

    // Setup triangle strip to draw each tetrahedron instance,
    // making sure that the faces are winded consistently seen from the outside.
    const ccw_strip = [0, 2, 1, 3, 0, 2];  // Counterclockwise winding
    //const cw_strip = [0, 1, 2, 3, 0, 1];  // Clockwise winding
    const element_buffer = new THREE.BufferAttribute(new Uint8Array(ccw_strip), 1);

    // Setup local tetrahedron vertex indices in a pattern relative to each vertex.
    // For each vertex 0...3, listing the vertices of the opposing face
    // in ccw winding seen from outside the tetrahedron.
    // This simplifies the computation of the opposing normal in the vertex shader,
    // i.e. n0 = normal of the face (v1, v2, v3) opposing v0, pointing away from v0,
    // n0 = normalized((v2-v1) x (v3-v1)) = normal pointing away from v0
    // First value for each vertex is a replacement for gl_VertexID which requires webgl2
    const local_vertices_buffer = new THREE.BufferAttribute(new Float32Array([
        0,   1, 2, 3,
        1,   0, 3, 2,
        2,   0, 1, 3,
        3,   0, 2, 1,
    ]), 4);

    // Local barycentric coordinates on tetrahedron. When interpolated over
    // a facet between the shaders, provides information on where on
    // the tetrahedron the fragment is located in the cell.
    const barycentric_coordinates_buffer = new THREE.BufferAttribute(new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]), 4);

    // Setup geometry with one instance === one tetrahedron,
    // attributes are per local vertex on a single tetrahedron
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.maxInstancedCount = num_tetrahedrons;
    geometry.setIndex(element_buffer);
    geometry.addAttribute("a_local_vertices", local_vertices_buffer);
    geometry.addAttribute("a_barycentric_coordinates", barycentric_coordinates_buffer);
    return geometry;
}

export
function create_cell_ordering_attribute(num_tetrahedrons: number): THREE.InstancedBufferAttribute {
    const attrib = new THREE.InstancedBufferAttribute(arange(num_tetrahedrons), 1, 1);
    attrib.setDynamic(true);
    return attrib;
}

export
function create_cells_attribute(cells: Int32Array): THREE.InstancedBufferAttribute {
    return new THREE.InstancedBufferAttribute(cells, 4, 1);
}

export
function create_geometry(sorted: boolean, cells: Int32Array, coordinates: Float32Array): THREE.InstancedBufferGeometry {
    // Assuming tetrahedral mesh
    const num_tetrahedrons = cells.length / 4;

    // Reorient tetrahedral cells (NB! this happens in place!)
    // TODO: We want cells to be reoriented _once_ if they're
    //       reused because this is a bit expensive
    const reorient = compute_tetrahedron_cell_orientations(cells, coordinates);
    reorient_tetrahedron_cells(cells, reorient);
    // TODO: Reorient on copy somewhere else, maybe in manager
    // copy_reoriented(dst, cells, reorient);

    // Setup cells of geometry (using textures or attributes)
    const attributes = {} as any;
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
