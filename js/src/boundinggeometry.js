"use strict";

import {
    compute_bounding_sphere,
    compute_bounding_box
} from "./meshutils";

import {THREE} from "./threeimport";

export
function create_bounding_sphere(coordinates) {
    const bsphere = compute_bounding_sphere(coordinates);
    return new THREE.Sphere(
        new THREE.Vector3(...bsphere.center),
        bsphere.radius
    );
}

export
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

export
function create_bounding_sphere_geometry(bsphere, scale=1.0, color=0xcccccc) {
    const geometry = new THREE.SphereGeometry(bsphere.radius * scale, 32, 32);
    const material = new THREE.MeshBasicMaterial({color});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(bsphere.center);
    return mesh;
}

export
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

export
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

export
function create_bounding_box_axis_geometry(bbox, scale=1.0, color=0x000000) {
    const [u, v] = bounding_box_corners(bbox, scale);
    const vertices = box_edge_vertices(u, v);
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute("position", new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        });
    material.fog = true;
    return new THREE.LineSegments(geometry, material);
}