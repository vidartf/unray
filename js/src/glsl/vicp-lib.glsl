

@import ./get-at;


// Map contiguous 1D index to UV coordinates
// in [0,1]^2 for given texture shape
vec2 index_to_uv(int index, ivec2 shape)
{
    //int u = index % shape.x;
    int v = index / shape.x;
    int u = index - shape.x * v;
    return vec2(
        (0.5 + float(u)) / float(shape.x),
        (0.5 + float(v)) / float(shape.y)
    );
}


// Return the smallest positive value in x, or 0
/*
float smallest_positive(vec4 x) {
    //const float infinity = 1e38f;
    bool touched = false;
    float depth = 0.0;
    for (int i = 0; i < 4; ++i) {
        if (x[i] > 0.0) {
            if (touched) {
                depth = min(depth, x[i]);
            } else {
                depth = x[i];
                touched = true;
            }
        }
    }
    return depth;
}
*/


// Return the smallest positive value in x, or 0
float smallest_positive(vec4 x) {
    float depth = 0.0;
    bool first = true;
    for (int i = 0; i < 4; ++i) {
        if (x[i] > 0.0 && (first || x[i] < depth)) {
            depth = x[i];
            first = false;
        }
    }
    return depth;
}


// Compute 3x3 Jacobian matrix of the coordinate
// field on a tetrahedron with given vertices,
// assuming a certain reference coordinate system.
mat3 compute_edge_diff_matrix(vec3 x[4])
{
    return mat3(x[1] - x[0],
                x[2] - x[0],
                x[3] - x[0]);
}


// Compute the gradient of a linear field with
// given vertex values on a tetrahedron
// in reference coordinates.
vec3 compute_edge_diff_vector(vec4 v)
{
    return vec3(v[1] - v[0],
                v[2] - v[0],
                v[3] - v[0]);
}
