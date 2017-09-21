// webgl2 required for flat keyword, using this define to
// document which variables should be flat interpolated
// (i.e. constant over each face), which also implies
// being constant over the tetrahedron.
#define flat

// Vertex coordinate in model space
varying vec3 v_model_position;  // TODO: Rename, easily mixed with position of the model...

#ifdef ENABLE_BARYCENTRIC_COORDINATES
    // 4D barycentric coordinate on tetrahedron, always ~zero for
    // the index of the current facet, which is the same as the
    // index of the opposing vertex not part of the currently
    // rasterized triangle
    varying vec4 v_barycentric_coordinates;
#endif

#ifdef ENABLE_DEPTH
    flat varying float v_max_depth;
    flat varying vec4 v_facing;

    #if defined(ENABLE_PERSPECTIVE_PROJECTION)
        varying vec4 v_ray_lengths;
    #endif
#endif

#ifdef ENABLE_PLANES
    // Normal vectors in model coordinates and plane equation
    // coefficient for each face of the tetrahedron
    flat varying mat4 v_planes;
#endif

// TODO: Can pack value and gradient in one vec4 since they're interpolated anyway
#ifdef ENABLE_DENSITY_FIELD
    // Value of field interpolated over currently rasterized triangle
    varying float v_density;
    #ifdef ENABLE_DENSITY_GRADIENT
        // Gradient of field w.r.t model coordinates on current tetrahedron
        flat varying vec3 v_density_gradient;
    #endif
#endif

// TODO: Can pack value and gradient in one vec4 since they're interpolated anyway
#ifdef ENABLE_EMISSION_FIELD
    // Value of field interpolated over currently rasterized triangle
    varying float v_emission;
    #ifdef ENABLE_EMISSION_GRADIENT
        // Gradient of field w.r.t model coordinates on current tetrahedron
        flat varying vec3 v_emission_gradient;
    #endif
#endif

#ifdef ENABLE_CELL_INDICATORS
    //flat varying float v_cell_indicator;           // want int or bool
#endif

// TODO: Could pass on all vertex values to compute function error
//       estimate, err = sum_i bc_width[i]*vertex_values[i];
//       (I guess mainly for validating the code.)
//flat varying vec4 v_emission_vertex_values;