// TODO: Can this type of check be used for unit testing?
// Would need to generate images and check for colors in the image.

// Shows facet plane is correctly computed
// #ifdef ENABLE_FACET_PLANE
//     C.rgb = 0.5 * facet_plane.xyz + vec3(0.5);
// #endif

// Shows view direction is correctly computed
// #ifdef ENABLE_FACET_PLANE
//     bool front = -dot(view_direction, facet_plane.xyz) > 0.0;
//     C.rgb = vec3(float(front), 0.0, float(!front));
// #endif