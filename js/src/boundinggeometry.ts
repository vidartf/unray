"use strict";

import * as THREE from "three";

import { compute_bounding_sphere, compute_bounding_box } from "./meshutils";

export
function create_bounding_sphere(coordinates: Float32Array): THREE.Sphere {
    const bsphere = compute_bounding_sphere(coordinates);
    return new THREE.Sphere(
        new THREE.Vector3(bsphere.center[0], bsphere.center[1], bsphere.center[2]),
        bsphere.radius
    );
}

export
function create_bounding_box(coordinates: Float32Array): THREE.Box3 {
    const bbox = compute_bounding_box(coordinates);
    // Possible alternative:
    //geometry.boundingBox = new THREE.Box3();
    //geometry.boundingBox.setFromArray(coordinates);
    return new THREE.Box3(
        new THREE.Vector3(bbox.min[0], bbox.min[1], bbox.min[2]),
        new THREE.Vector3(bbox.max[0], bbox.max[1], bbox.max[2])
    );
}

export
function create_bounding_sphere_geometry(bsphere: THREE.Sphere, scale=1.0, color=0xcccccc): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(bsphere.radius * scale, 32, 32);
    const material = new THREE.MeshBasicMaterial({color});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(bsphere.center);
    return mesh;
}

export
function create_bounding_box_geometry(bbox: THREE.Box3, scale=1.0, color=0xcccccc): THREE.Mesh {
    const dims = bbox.getSize(new THREE.Vector3()).toArray().map(x => scale*x);

    // Showing only backside faces avoids hiding the model
    const side = THREE.BackSide;
    const material = new THREE.MeshBasicMaterial({color, side});

    const geometry = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
    const mesh = new THREE.Mesh(geometry, material);
    bbox.getCenter(mesh.position);

    return mesh;
}

export
function create_bounding_box_midplanes_geometry(bbox: THREE.Box3, scale=1.0, color=0xcccccc): THREE.Object3D {
    const dims = bbox.getSize(new THREE.Vector3()).toArray().map(x => scale*x);

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
    bbox.getCenter(group.position);
    return group;
}

function bounding_box_corners(bbox: THREE.Box3, scale: number) {
    const offset = bbox.getSize(new THREE.Vector3()).toArray().map(x => 0.5*(scale-1.0)*x);
    const u = bbox.min.toArray();
    const v = bbox.max.toArray();
    for (let i = 0; i < 3; ++i) {
        u[i] -= offset[i];
        v[i] += offset[i];
    }
    return [u, v];
}

function box_edge_vertices(u: number[], v: number[]) {
    // The four vertices of the y-z plane if x is fixed
    const yz = [
        [u[1], u[2]],
        [u[1], v[2]],
        [v[1], v[2]],
        [v[1], u[2]],
    ];
    const points: number[] = [];
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
function create_bounding_box_axis_geometry(bbox: THREE.Box3, scale=1.0, color="#000000"): THREE.LineSegments {
    const [u, v] = bounding_box_corners(bbox, scale);
    const vertices = box_edge_vertices(u, v);
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute("position", new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        fog: true,
        });
    return new THREE.LineSegments(geometry, material);
}
