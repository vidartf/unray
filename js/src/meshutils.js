
// TODO: Could possibly imlpement these utils cleaner
// and more efficiently using scijs packages:
// ndarray, ndarray-scratch, ndarray-ops, ndarray-sort
// https://github.com/scijs/ndarray-grid-connectivity
let ndarray = require('ndarray');
// let pack = require('ndarray-pack');
let det = require('ndarray-determinant');
let glm = require('gl-matrix');


// Compute bounding box and sphere of a set of 3D points in a flat array
function compute_bounds(points)
{
    let center = new Float32Array([0, 0, 0]);
    let bbcenter = new Float32Array([0, 0, 0]);
    let min = new Float32Array([points[0], points[1], points[2]]);
    let max = new Float32Array([points[0], points[1], points[2]]);
    let radius = 0;
    let nv = points.length / 3;

    // Estimate center of mass and find bounding box
    for (let i = 0; i < points.length; i += 3) {
        for (let j = 0; j < 3; ++j) {
            let xj = points[i + j];
            center[j] += xj;
            min[j] = Math.min(min[j], xj);
            max[j] = Math.max(max[j], xj);
        }
    }
    for (let j = 0; j < 3; ++j) {
        center[j] /= nv;
        bbcenter[j] = 0.5 * (min[j] + max[j]);
    }

    for (let i = 0; i < points.length; i += 3) {
        let dist2 = 0;
        for (let j = 0; j < 3; ++j) {
            let xj = points[i + j];
            let dx = xj - center[j];
            dist2 += dx * dx;
        }
        radius = Math.max(radius, Math.sqrt(dist2));
    }

    return {min, max, bbcenter, center, radius};
}


// Reorient tetrahedron cells such that det(J) is positive
// by swapping the last two indices in each cell if necessary
function reorient_tetrahedron_cells(cells, vertices)
{
    // If given ndarrays:
    // let c = cells.data;
    // let v = vertices.data;
    // let num_cells = cells.shape[0];

    // If given flat arrays
    let c = cells;
    let v = vertices;
    let num_cells = cells.length / 4;
    let num_vertices = vertices.length / 3;

    // Allocate some placeholders for computations below
    let x0 = glm.vec3.create();
    let x1 = glm.vec3.create();
    let x2 = glm.vec3.create();
    let x3 = glm.vec3.create();
    let edge_a = glm.vec3.create();
    let edge_b = glm.vec3.create();
    let edge_opposing = glm.vec3.create();
    let normal = glm.vec3.create();

    for (let i = 0; i < num_cells; ++i)
    {
        // If c, v are ndarrays:
        // let K = c.pick(i, null);
        // let x0 = v.pick(3*K[0], null);
        // let x1 = v.pick(3*K[1], null);
        // let x2 = v.pick(3*K[2], null);
        // let x3 = v.pick(3*K[3], null);

        // Get vertex indices for this cell
        let K = [ c[4*i + 0], c[4*i + 1], c[4*i + 2], c[4*i + 3] ];

        // Get coordinates for the vertices
        glm.vec3.copy(x0, [ v[3*K[0] + 0], v[3*K[0] + 1], v[3*K[0] + 2] ]);
        glm.vec3.copy(x1, [ v[3*K[1] + 0], v[3*K[1] + 1], v[3*K[1] + 2] ]);
        glm.vec3.copy(x2, [ v[3*K[2] + 0], v[3*K[2] + 1], v[3*K[2] + 2] ]);
        glm.vec3.copy(x3, [ v[3*K[3] + 0], v[3*K[3] + 1], v[3*K[3] + 2] ]);

        // Compute facet normal of face (1,2,3)
        glm.vec3.subtract(edge_a, x2, x1);
        glm.vec3.subtract(edge_b, x3, x1);
        glm.vec3.cross(normal, edge_a, edge_b);

        // Compute direction of normal relative to x0->x1 vector
        glm.vec3.subtract(edge_opposing, x1, x0);
        let direction = glm.vec3.dot(edge_opposing, normal);

        if (direction < 0) {
            // Swapping two vertices in cell changes the winding
            c[4*i + 2] = K[3];
            c[4*i + 3] = K[2];
        }
    }
}


module.exports = {
    compute_bounds,
    reorient_tetrahedron_cells
};
