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
