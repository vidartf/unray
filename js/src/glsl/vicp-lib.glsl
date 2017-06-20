// Some fairly specialized utility functions

@import ./utils/transpose;


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


vec4 with_nonzero_at(int i, float value)
{
    vec4 v = vec4(0.0);
    // v[i] = value;  // webgl doesn't support indexing by non-constants
    if      (i == 0)  v[0] = value;
    else if (i == 1)  v[1] = value;
    else if (i == 2)  v[2] = value;
    else if (i == 3)  v[3] = value;
    return v;    
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
float smallest_positive_v2(vec4 x, float eps) {
    // float min_x = min4(x);
    // float max_x = max4(x);
    float depth = -1.0;
    for (int i = 0; i < 4; ++i) {
        if (x[i] > eps) {
            if (depth < 0.0) {
                depth = x[i];
            } else {
                depth = min(depth, x[i]);
            }
        }
    }
    // This shouldn't happen?
    if (depth < 0.0) {
        depth = 0.0;
    }
    return depth;
}


// Return the smallest positive value in x, or 0
float smallest_positive(vec4 depths, float max_length)
{
    // Need tolerance in float comparisons
    // to avoid noise on triangle.
    // If there's another way to skip the 'current triangle',
    // maybe this can be simplified.
    const float eps = 1e-4;

    // Scale x relative to max_length which is the
    // largest valid length within the tetrahedron
    depths *= (1.0 / max_length);

    float depth = -1.0;
    for (int i = 0; i < 4; ++i) {
        // Skip negative and too large values
        if (eps < depths[i] && depths[i] < 1.0 + eps) {
            if (depth < 0.0) {
                // Pick first positive value
                depth = depths[i];
            } else {
                // Take minimum of additional positive values
                depth = min(depth, depths[i]);
            }
        }
    }

    // Set to zero if no positive depth was found,
    // and scale back to original scale
    return clamp(depth, 0.0, 1.0) * max_length;
}


// Return the smallest positive value in x, or 0
float smallest_positive_v3(vec4 x, float max_length)
{
    // Need tolerance in float comparisons
    // to avoid noise on triangle.
    // If there's another way to skip the 'current triangle',
    // maybe this can be simplified.
    const float eps = 1e-4;
    float min_x = max_length * 1e-4;
    float max_x = max_length * (1.0 + 1e-2);

    // Make negatives and too large values zero
    x *= step(min_x, x);
    x *= step(-max_x, -x);

    // First value is either zero or positive so a valid starting point
    float depth = x[0];

    // Remaining values are either zero or positive
    for (int i = 1; i < 4; ++i) {
        if (0.0 < x[i] && x[i] < depth) {
            depth = x[i];
        }
    }
    return depth;
}


// Compute 3x3 inverse Jacobian matrix of the coordinate
// field on a tetrahedron with given vertices,
// assuming a certain reference coordinate system.
mat3 compute_Jinv(vec3 x[4])
{
    return inverse(transpose(mat3(x[1] - x[0], x[2] - x[0], x[3] - x[0])));
}

// Compute the gradient of a linear field with
// given vertex values on a tetrahedron
// in reference coordinates.
vec3 compute_gradient(mat3 Jinv, vec4 v) {
    return Jinv * vec3(v[1] - v[0], v[2] - v[0], v[3] - v[0]);
}
