
// Return the smallest positive value in x, or 0
// float compute_depth(vec4 bc, vec4 depths, float max_depth);
// bc[i] = 0 on face i
// depths[i] = 0 on face i
// depths[i] is not bounded

@import ./minmax;


float compute_depth(vec4 ray_lengths, bvec4 is_back_face, bvec4 on_face, float max_depth)
{
    // This removes large depth on exterior edges,
    // but introduces zero depth on interior edges:
    // if (minv(bc) < 0.0) {
    //     return 0.0;
    // }

    // TODO: If issues occur when zooming in, consider getting
    // this based on distance to camera, e.g.
    // min_depth = -(distance(fragment, camera) - near)
    float min_depth = -0.1*max_depth;

    // Initialize to a too large value
    float depth = 3.0 * max_depth;

    for (int i = 0; i < 4; ++i) {
        // Getting this right took quite a few attempts.
        // Only back faces can be exit points.
        // An exit point will also have a positive depth by definition.
        // A negative depth for a back face occurs
        // when the intersection point hits behind the camera.

        // Except that float accuracy issues make it more complicated.
        // But a slightly negative depth can also occur
        // close to the exterior edge of the tetrahedron
        // projection.

        if (is_back_face[i] && ray_lengths[i] >= min_depth) {
            depth = min(depth, ray_lengths[i]);
        }
    }
    // If depth was set to slightly negative or wasn't touched, reset it to zero
    if (depth < 0.0 || depth > 1.1 * max_depth) {
        depth = 0.0;
    }
    return depth;
}


float compute_depth2(vec4 ray_lengths, bvec4 is_back_face, bvec4 on_face, float max_depth)
{
    // Initialize to a too large value
    float depth = 1000.0 * max_depth;
    bool touched = false;

    // Check all faces (we don't know which face we're on,
    // but that's always a front face and will be skipped)
    for (int i = 0; i < 4; ++i) {
        // Only back faces can be exit points
        if (is_back_face[i]) {
            // A positive depth means an exit point by definition.
            // However at the shared edge between a back face and
            // the currently rasterized front face, slightly negative
            // depths can be observed due to interpolation errors.
            // Allowing those, and clamping to a non-negative value below.
            if (ray_lengths[i] > 0.0 || on_face[i]) {
                depth = min(depth, ray_lengths[i]);
                touched = true;
            }
        }
    }
    // Clamp depth and use zero if it wasn't touched
    if (touched) {
        return clamp(depth, 0.0, max_depth);
    } else {
        return 0.0;
    }
}
