'use strict';

import { zip } from 'underscore';

// Compute bounding box of a set of 3D points in a flat array
function compute_bounding_box(points=new Float32Array([])) {
    // Find bounding box
    let min = points.slice(0, 3);
    let max = points.slice(0, 3);
    for (let i = 0; i < points.length; i += 3) {
        min[0] = Math.min(min[0], points[i]);
        min[1] = Math.min(min[1], points[i + 1]);
        min[2] = Math.min(min[2], points[i + 2]);
        max[0] = Math.max(max[0], points[i]);
        max[1] = Math.max(max[1], points[i + 1]);
        max[2] = Math.max(max[2], points[i + 2]);
    }
    min = Array.from(min);
    max = Array.from(max);

    // Find center of box
    const center = zip(min, max).map(([a, b]) => 0.5*(a + b));
    return {min, max, center};
}

// Estimate center of mass of 3D points
function compute_center(points=new Float32Array([])) {
    const center = [0, 0, 0];
    for (let i = 0; i < points.length; i += 3) {
        center[0] += points[i];
        center[1] += points[i + 1];
        center[2] += points[i + 2];
    }
    return center.map(x => x * 3 / points.length);
}

// Compute smallest radius of sphere around center containing all points
function compute_radius(points=new Float32Array([]), center=[0, 0, 0]) {
    // Find radius around center
    let radius = 0;
    const [c0, c1, c2] = center;
    for (let i = 0; i < points.length; i += 3) {
        const d0 = points[i] - c0,
              d1 = points[i + 1] - c1,
              d2 = points[i + 2] - c2;
        radius = Math.max(radius, d0*d0 + d1*d1 + d2*d2);
    }
    return Math.sqrt(radius);
}

// Estimate smallest sphere containing all points
function compute_bounding_sphere(points=new Float32Array([])) {
    const center = compute_center(points);
    const radius = compute_radius(points, center);
    return {center, radius};
}

// Reorient tetrahedron cells such that det(J) is positive
// by swapping the last two indices in each cell if necessary
function reorient_tetrahedron_cells(cells, vertices) {
    // If given flat arrays
    const c = cells;
    const v = vertices;
    const num_cells = cells.length / 4;
    const num_vertices = vertices.length / 3;
    for (let i = 0; i < num_cells; ++i) {
        // Vertex index preprocessing for this cell
        const j = 4*i;
        const K = [3*c[j], 3*c[j + 1], 3*c[j + 2], 3*c[j + 3]];

        // Get coordinates for the vertices
        const x0 = [v[K[0]], v[K[0] + 1], v[K[0] + 2]];
        const x1 = [v[K[1]], v[K[1] + 1], v[K[1] + 2]];
        const x2 = [v[K[2]], v[K[2] + 1], v[K[2] + 2]];
        const x3 = [v[K[3]], v[K[3] + 1], v[K[3] + 2]];

        // Compute some edges
        const a = [x2[0] - x1[0], x2[1] - x1[1], x2[2] - x1[2]];
        const b = [x3[0] - x1[0], x3[1] - x1[1], x3[2] - x1[2]];

        // Compute facet normal of face (1,2,3), and check
        // direction of normal relative to x0->x1 vector
        if ( (x1[0] - x0[0]) * (a[1] * b[2] - a[2] * b[1])
           + (x1[1] - x0[1]) * (a[2] * b[0] - a[0] * b[2])
           + (x1[2] - x0[2]) * (a[0] * b[1] - a[1] * b[0]) < 0) {
            // Swapping two vertices in cell changes the winding
            [c[j + 2], c[j + 3]] = [c[j + 3], c[j + 2]];
        }
    }
}

export {
    compute_bounds,
    compute_bounding_box,
    compute_bounding_sphere,
    reorient_tetrahedron_cells
};
