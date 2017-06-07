
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
    let min = new Float32Array([points[0], points[1], points[2]]);
    let max = new Float32Array([points[0], points[1], points[2]]);
    let radius = 0;
    let nv = points.length / 3;
    console.log("points", points);
    console.log("points length", points.length);
    console.log("nv", nv);

    for (let i = 0; i < points.length; i += 3) {
        for (let j = 0; j < 3; ++j) {
            let xj = points[i + j];
            center[j] += xj;
            min[j] = Math.min(min[j], xj);
            max[j] = Math.max(max[j], xj);
        }
    }
    center[0] /= nv;
    center[1] /= nv;
    center[2] /= nv;

    for (let i = 0; i < points.length; i += 3) {
        let dist2 = 0;
        for (let j = 0; j < 3; ++j) {
            let xj = points[i + j];
            let dx = xj - center[j];
            dist2 += dx * dx;
        }
        radius = Math.max(radius, Math.sqrt(dist2));
    }

    return {min, max, center, radius};
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

    let x0 = glm.vec3.create();
    let x1 = glm.vec3.create();
    let x2 = glm.vec3.create();
    let x3 = glm.vec3.create();

    let e1 = glm.vec3.create();
    let e2 = glm.vec3.create();
    let e3 = glm.vec3.create();

    let cr = glm.vec3.create();

    console.log("Reorienting cells", num_cells, num_vertices);

    for (let i = 0; i < num_cells; ++i)
    {
        // If c, v are ndarrays:
        // let K = c.pick(i, null);
        // let x0 = v.pick(3*K[0], null);
        // let x1 = v.pick(3*K[1], null);
        // let x2 = v.pick(3*K[2], null);
        // let x3 = v.pick(3*K[3], null);

        let K = [ c[4*i + 0], c[4*i + 1], c[4*i + 2], c[4*i + 3] ];
        let off = [3*K[0], 3*K[1], 3*K[2], 3*K[3]];

        glm.vec3.copy(x0, [ v[off[0] + 0], v[off[0] + 1], v[off[0] + 2] ]);
        glm.vec3.copy(x1, [ v[off[1] + 0], v[off[1] + 1], v[off[1] + 2] ]);
        glm.vec3.copy(x2, [ v[off[2] + 0], v[off[2] + 1], v[off[2] + 2] ]);
        glm.vec3.copy(x3, [ v[off[3] + 0], v[off[3] + 1], v[off[3] + 2] ]);

        glm.vec3.subtract(e1, x1, x0);
        glm.vec3.subtract(e2, x2, x0);
        glm.vec3.subtract(e3, x3, x0);

        glm.vec3.cross(cr, e1, e2);
        let r = glm.vec3.dot(e3, cr);

        if (r < 0) {
            c[4*i + 2] = K[3];
            c[4*i + 3] = K[2];
        }
    }
}


module.exports = {
    compute_bounds,
    reorient_tetrahedron_cells
};
