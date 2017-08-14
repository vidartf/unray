'use strict';

import './threeimport';
const THREE = window.THREE;


function create_instanced_tetrahedron_geometry(num_tetrahedrons) {

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

export {
    create_instanced_tetrahedron_geometry
};
