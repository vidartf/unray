'use strict';

import {
    arange,
    extend2
} from './utils.js';

import {
    compute_bounding_sphere,
    compute_bounding_box,
    reorient_tetrahedron_cells
} from "./meshutils";

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

function create_cell_ordering_attribute(num_tetrahedrons) {
    const attrib = new THREE.InstancedBufferAttribute(
        arange(num_tetrahedrons), 1, 1
    );
    attrib.setDynamic(true);
    return attrib;
}

function create_cells_attribute(cells) {
    return new THREE.InstancedBufferAttribute(
        cells, 4, 1
    );
}

function create_bounding_sphere(coordinates) {
    const bsphere = compute_bounding_sphere(coordinates);
    return new THREE.Sphere(
        new THREE.Vector3(...bsphere.center),
        bsphere.radius
    );
}

function create_bounding_box(coordinates) {
    const bbox = compute_bounding_box(coordinates);
    // Possible alternative:
    //geometry.boundingBox = new THREE.Box3();
    //geometry.boundingBox.setFromArray(coordinates);
    return new THREE.Box3(
        new THREE.Vector3(...bbox.min),
        new THREE.Vector3(...bbox.max)
    );
}

function create_bounding_sphere_geometry(bsphere, scale=1.0, color=0x333333) {
    const geometry = new THREE.SphereGeometry(bsphere.radius * scale, 32, 32);
    const material = new THREE.MeshBasicMaterial({color});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(bsphere.center);
    return mesh;
}

function create_bounding_box_geometry(bbox, scale=1.0, color=0x333333) {
    const dims = bbox.getSize().toArray().map(x => scale*x);
    const geometry = new THREE.BoxGeometry(...dims);
    const material = new THREE.MeshBasicMaterial({color});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(bbox.getCenter());
    return mesh;
}

function create_bounding_box_axis_geometry(bbox, scale=1.0, color=0x000000) {
    const offset = bbox.getSize().toArray().map(x => 0.5*(scale-1.0)*x);
    const x = bbox.min.toArray();
    const y = bbox.max.toArray();
    for (let i = 0; i < 3; ++i) {
        x[i] -= offset[i];
        y[i] += offset[i];
    }
    
    const vertices = new Float32Array([
        // x[0] constant
        x[0], x[1], x[2],
        x[0], x[1], y[2],

        x[0], x[1], y[2],
        x[0], y[1], y[2],

        x[0], y[1], y[2],
        x[0], y[1], x[2],

        x[0], y[1], x[2],
        x[0], x[1], x[2],

        // y[0] constant
        y[0], x[1], x[2],
        y[0], x[1], y[2],

        y[0], x[1], y[2],
        y[0], y[1], y[2],

        y[0], y[1], y[2],
        y[0], y[1], x[2],

        y[0], y[1], x[2],
        y[0], x[1], x[2],

        // from x[0] to y[0] plane
        x[0], x[1], x[2],
        y[0], x[1], x[2],

        x[0], x[1], y[2],
        y[0], x[1], y[2],

        x[0], y[1], x[2],
        y[0], y[1], x[2],

        x[0], y[1], y[2],
        y[0], y[1], y[2],
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        });
    const mesh = new THREE.LineSegments(geometry, material);
    return mesh;
}

export {
    create_instanced_tetrahedron_geometry,
    create_cells_attribute,
    create_cell_ordering_attribute,
    create_bounding_sphere,
    create_bounding_box,
    create_bounding_sphere_geometry,
    create_bounding_box_geometry,
    create_bounding_box_axis_geometry
};
