#ifdef ENABLE_PERSPECTIVE_PROJECTION
    // Initialize to a too large value
    float depth = 1000.0 * v_max_depth;
    bool touched = false;

    // Check all faces (we don't know which face we're on,
    // but that's always a front face and will be skipped)
    for (int i = 0; i < 4; ++i) {
        // Skip the current facet (i != facet), and
        // only back faces can be exit points (v_facing[i] < 0.0)
        // TODO: With the current facet check, the facing check may be superfluous
        if (i != facet && v_facing[i] < 0.0) {
            // Compute depth of ray from entry point to this face
            vec3 n = v_planes[i].xyz;
            float ray_length = (v_planes[i].w - dot(n, position)) / dot(n, view_direction);

            // A positive depth means an exit point by definition.
            // However at the shared edge between a back face and
            // the currently rasterized front face, slightly negative
            // depths can be observed due to interpolation errors.
            // Allowing those, and clamping to a non-negative value below.
            if (ray_length >= 0.0 || v_barycentric_coordinates[i] <= 0.0) {
                depth = min(depth, ray_length);
                touched = true;
            }
        }
    }
    // Clamp depth and use zero if it wasn't touched
    if (!touched) {
        depth = 0.0;
    }
    depth = clamp(depth, 0.0, v_max_depth);
#else
    // !defined(ENABLE_PERSPECTIVE_PROJECTION)
    float depth = compute_depth(
        v_ray_lengths, v_barycentric_coordinates,
        lessThan(v_facing, vec4(-0.5)), v_max_depth
        );
#endif