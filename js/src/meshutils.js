
// Compute bounding box and sphere of a set of points in a flat array
function compute_bounds(coords)
{
    let center = new Float32Array([0, 0, 0]);
    let min = new Float32Array([coords[0], coords[1], coords[2]]);
    let max = new Float32Array([coords[0], coords[1], coords[2]]);
    let radius = 0;
    let nv = coords.length / 3;
    console.log("coords", coords);
    console.log("coords length", coords.length);
    console.log("nv", nv);

    for (let i = 0; i < coords.length; i += 3) {
        for (let j = 0; j < 3; ++j) {
            let xj = coords[i + j];
            center[j] += xj;
            min[j] = Math.min(min[j], xj);
            max[j] = Math.max(max[j], xj);
        }
    }
    center[0] /= nv;
    center[1] /= nv;
    center[2] /= nv;

    for (let i = 0; i < coords.length; i += 3) {
        let dist2 = 0;
        for (let j = 0; j < 3; ++j) {
            let xj = coords[i + j];
            let dx = xj - center[j];
            dist2 += dx * dx;
        }
        radius = Math.max(radius, Math.sqrt(dist2));
    }

    return {min, max, center, radius};
}

module.exports = {
    compute_bounds
};
