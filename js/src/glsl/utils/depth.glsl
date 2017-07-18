@import ./minmax;



// Return the smallest positive value in ray_lengths, or 0
float compute_depth(vec4 ray_lengths, vec4 bc, bvec4 is_back_face, float max_depth)
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
            if (ray_lengths[i] >= 0.0 || bc[i] <= 0.0) {
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
