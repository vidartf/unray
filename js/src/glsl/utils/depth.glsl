
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



// This version shows noise on the rasterized face
float compute_depth_v1(vec4 bc, vec4 depths, float max_depth)
{
    float depth = 1e10 * max_depth;
    for (int i = 0; i < 4; ++i) {
        if (depths[i] > 0.0) {
            depth = min(depth, depths[i]);
        }
    }
    return depth;
}


float compute_depth_v2(vec4 bc, vec4 depths, float max_depth)
{
    float eps = 1e-3 * max_depth;
    float depth = 1e10 * max_depth;
    for (int i = 0; i < 4; ++i) {
        if (depths[i] > eps) {
            depth = min(depth, depths[i]);
        }
    }
    return depth;
}


float compute_depth_v3(vec4 bc, vec4 depths, float max_depth)
{
    float depth = 1e10 * max_depth;
    for (int i = 0; i < 4; ++i) {
        if (depths[i] > 0.0) {
            depth = min(depth, depths[i]);
        }
    }
    if (depth > 1e9 * max_depth) {
        depth = 0.0;
    }
    return depth;
}


float compute_depth_v4(vec4 bc, vec4 depths, float max_depth)
{
    float eps = 1e-3 * max_depth;
    float depth = 10.0 * max_depth;
    for (int i = 0; i < 4; ++i) {
        if (depths[i] > eps) {
            depth = min(depth, depths[i]);
        }
    }
    // If depth wasn't touched, reset it to zero
    if (depth > 9.0 * max_depth) {
        depth = 0.0;
    }
    return depth;
}


float compute_depth_v5(vec4 bc, vec4 depths, float max_depth)
{
    if (minv(bc) < 0.0) {
        return 0.0;
    }

    // Initialize to a too large value
    float depth = 1000.0 * max_depth;
    for (int i = 0; i < 4; ++i) {
        // problem: depth on edge becomes _large_, not zero
        // problem: bc accuracy depends on zoom level

        // Only consider faces we're not on and where depth is positive
        if (bc[i] > 0.0 && depths[i] > 0.0) {
            // Take minimum of all positive depths
            depth = min(depth, depths[i]);
        }
    }
    // If depth wasn't touched, reset it to zero
    if (depth > max_depth * (1.0+1e-6)) {
        depth = 0.0;
    }
    return depth;
}


// Return the smallest positive value in x, or 0
// float compute_depth(vec4 bc, vec4 depths, float max_depth)
// {
//     // Need tolerance in float comparisons
//     // to avoid noise on triangle.
//     // If there's another way to skip the 'current triangle',
//     // maybe this can be simplified.
//     float eps = 1e-3 * max_depth;

//     //float depth = minWhere(depths, and(greaterThan(depths, 0.0), greaterThan(bc, eps)), max_depth);
//     // Take minimum of all positive values
//     float depth = max_depth * 2.0;
//     for (int i = 0; i < 4; ++i) {
//         // Skip almost-zero values to avoid noise on face.
//         // This also leads to invalid depth along edges?
//         if (depths[i] > eps) {
//             depth = min(depth, depths[i]);
//         }
//     }
//     // If only positive value found is larger than max,
//     // we must be at an edge and the depth is zero
//     if (depth > max_depth * 1.99) {
//         depth = 0.0;
//     }
//     return depth;
// }


// Return the smallest positive value in x, or 0
// float compute_depth(vec4 bc, vec4 depths, float max_depth)
// {
//     // Need tolerance in float comparisons
//     // to avoid noise on triangle.
//     // If there's another way to skip the 'current triangle',
//     // maybe this can be simplified.
//     const float eps = 1e-3;

//     //float depth = minWhere(depths, and(greaterThan(depths, 0.0), greaterThan(bc, eps)), max_depth);
//     float depth = max_depth * 2.0;
//     for (int i = 0; i < 4; ++i) {
//         // Only consider faces we're not on and where depth is positive
//         if (bc[i] > eps && depths[i] > 0.0) {
//             // Take minimum of all positive values
//             depth = min(depth, depths[i]);
//         }
//     }

//     // If only positive value found is larger than max,
//     // we must be at an edge and the depth is zero
//     return depth <= max_depth ? depth : 0.0;
// }


// Return the smallest positive value in x, or 0
// float smallest_positive(vec4 depths, float max_depth)
// {
//     // Need tolerance in float comparisons
//     // to avoid noise on triangle.
//     // If there's another way to skip the 'current triangle',
//     // maybe this can be simplified.
//     const float eps = 1e-4;

//     // Scale x relative to max_depth which is the
//     // largest valid length within the tetrahedron
//     depths *= (1.0 / max_depth);

//     float depth = -1.0;
//     for (int i = 0; i < 4; ++i) {
//         // Skip negative and too large values
//         if (eps < depths[i] && depths[i] < 1.0 + eps) {
//             depth = depth < 0.0 ? depths[i] : min(depth, depths[i]);
//             if (depth < 0.0) {
//                 // Pick first positive value
//                 depth = depths[i];
//             } else {
//                 // Take minimum of additional positive values
//                 depth = min(depth, depths[i]);
//             }
//         }
//     }

//     // Set to zero if no positive depth was found,
//     // and scale back to original scale
//     return clamp(depth, 0.0, 1.0) * max_depth;
// }


// Return the smallest positive value in x, or 0
// float smallest_positive(vec4 x) {
//     //const float infinity = 1e38f;
//     bool touched = false;
//     float depth = 0.0;
//     for (int i = 0; i < 4; ++i) {
//         if (x[i] > 0.0) {
//             if (touched) {
//                 depth = min(depth, x[i]);
//             } else {
//                 depth = x[i];
//                 touched = true;
//             }
//         }
//     }
//     return depth;
// }


// // Return the smallest positive value in x, or 0
// float smallest_positive_v2(vec4 x, float eps) {
//     // float min_x = min4(x);
//     // float max_x = max4(x);
//     float depth = -1.0;
//     for (int i = 0; i < 4; ++i) {
//         if (x[i] > eps) {
//             if (depth < 0.0) {
//                 depth = x[i];
//             } else {
//                 depth = min(depth, x[i]);
//             }
//         }
//     }
//     // This shouldn't happen?
//     if (depth < 0.0) {
//         depth = 0.0;
//     }
//     return depth;
// }


// // Return the smallest positive value in x, or 0
// float smallest_positive_v3(vec4 x, float max_depth)
// {
//     // Need tolerance in float comparisons
//     // to avoid noise on triangle.
//     // If there's another way to skip the 'current triangle',
//     // maybe this can be simplified.
//     const float eps = 1e-4;
//     float min_x = max_depth * 1e-4;
//     float max_x = max_depth * (1.0 + 1e-2);

//     // Make negatives and too large values zero
//     x *= step(min_x, x);
//     x *= step(-max_x, -x);

//     // First value is either zero or positive so a valid starting point
//     float depth = x[0];

//     // Remaining values are either zero or positive
//     for (int i = 1; i < 4; ++i) {
//         if (0.0 < x[i] && x[i] < depth) {
//             depth = x[i];
//         }
//     }
//     return depth;
// }
