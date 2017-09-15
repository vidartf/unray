// Compute the gradient of a linear field with
// given vertex values on a tetrahedron
// in reference coordinates.
vec3 compute_gradient(mat3 Jinv, vec4 v) {
    return Jinv * vec3(v[1] - v[0], v[2] - v[0], v[3] - v[0]);
}
