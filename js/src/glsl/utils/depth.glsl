
// Return the smallest positive value in x, or 0
// float compute_depth(vec4 bc, vec4 depths, float max_depth);
// bc[i] = 0 on face i
// depths[i] = 0 on face i
// depths[i] is not bounded

@import ./minmax;


float compute_depth(vec4 bc, vec4 depths, vec4 facing, float max_depth)
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

        if (facing[i] < 0.0 && depths[i] >= min_depth) {
            depth = min(depth, depths[i]);
        }
    }
    // If depth was set to slightly negative or wasn't touched, reset it to zero
    if (depth < 0.0 || depth > 2.0 * max_depth) {
        depth = 0.0;
    }
    return depth;
}
