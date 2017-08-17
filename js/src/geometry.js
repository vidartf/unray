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

function create_bounding_sphere_geometry(bsphere, scale=1.0, color=0xcccccc) {
    const geometry = new THREE.SphereGeometry(bsphere.radius * scale, 32, 32);
    const material = new THREE.MeshBasicMaterial({color});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(bsphere.center);
    return mesh;
}

function create_bounding_box_geometry(bbox, scale=1.0, color=0xcccccc) {
    const dims = bbox.getSize().toArray().map(x => scale*x);

    // Showing only backside faces avoids hiding the model
    const side = THREE.BackSide;
    const material = new THREE.MeshBasicMaterial({color, side});

    const geometry = new THREE.BoxGeometry(...dims);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(bbox.getCenter());

    return mesh;
}

function create_bounding_box_midplanes_geometry(bbox, scale=1.0, color=0xcccccc) {
    const dims = bbox.getSize().toArray().map(x => scale*x);

    const range = [0, 1, 2];
    const side = THREE.DoubleSide;
    const colors = range.map(i => color & (0xff << (8*(2-i))));
    const materials = colors.map(color =>
        new THREE.MeshBasicMaterial({color, side})
    );
    const planes = range.map(i =>
        new THREE.PlaneGeometry(dims[(i + 1) % 3], dims[(i + 2) % 3])
    );
    const meshes = range.map(i =>
        new THREE.Mesh(planes[i], materials[i])
    );
    const angle = Math.PI / 2;
    meshes[0].rotateY(angle);
    meshes[0].rotateZ(angle);
    meshes[1].rotateX(angle);
    meshes[1].rotateZ(angle);
    const group = new THREE.Group();
    meshes.forEach(mesh => group.add(mesh));
    group.position.copy(bbox.getCenter());
    return group;
}

function bounding_box_corners(bbox, scale) {
    const offset = bbox.getSize().toArray().map(x => 0.5*(scale-1.0)*x);
    const u = bbox.min.toArray();
    const v = bbox.max.toArray();
    for (let i = 0; i < 3; ++i) {
        u[i] -= offset[i];
        v[i] += offset[i];
    }
    return [u, v];
}

function box_edge_vertices(u, v) {
    // The four vertices of the y-z plane if x is fixed
    const yz = [
        [u[1], u[2]],
        [u[1], v[2]],
        [v[1], v[2]],
        [v[1], u[2]],
    ];
    const points = [];
    // Hold x fixed and push edges around yz side
    for (let x of [u[0], v[0]]) {
        for (let i = 0; i < 4; ++i) {
            const j = (i + 1) & 3;
            points.push(x, ...yz[i],
                        x, ...yz[j]);
        }
    }
    // Push edges from x=min to x=max for each yz vertex
    for (let i = 0; i < 4; ++i) {
        points.push(u[0], ...yz[i],
                    v[0], ...yz[i]);
    }
    return new Float32Array(points);
}

function create_bounding_box_axis_geometry(bbox, scale=1.0, color=0x000000) {
    const [u, v] = bounding_box_corners(bbox, scale);
    const vertices = box_edge_vertices(u, v);
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        });
    return new THREE.LineSegments(geometry, material);
}

export {
    create_instanced_tetrahedron_geometry,
    create_cells_attribute,
    create_cell_ordering_attribute,
    create_bounding_sphere,
    create_bounding_box,
    create_bounding_sphere_geometry,
    create_bounding_box_geometry,
    create_bounding_box_axis_geometry,
    create_bounding_box_midplanes_geometry
};
