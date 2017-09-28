// Crude dependency graph for ENABLE_FOO code blocks.
// It's useful to share this between the vertex and fragment shader,
// so if something needs to be toggled separately in those there
// needs to be separate define names.

// The volume rendering models need the depth of the tetrahedron behind each fragment
#if defined(ENABLE_XRAY_MODEL) || defined(ENABLE_SUM_MODEL) || defined(ENABLE_VOLUME_MODEL)
    #define ENABLE_DEPTH 1
#endif

#ifdef ENABLE_SURFACE_MODEL
    #ifdef ENABLE_SURFACE_LIGHT
        #define ENABLE_FACET_PLANE 1
    #endif
#endif

#ifdef ENABLE_ISOSURFACE_MODEL
    #define ENABLE_BARYCENTRIC_DERIVATIVES 1
#endif


#ifdef ENABLE_CELL_ORDERING
    // If cell ordering is active, we need uv coordinates
    // to look up in per-cell textures
    #define ENABLE_CELL_UV 1
#endif

#ifdef ENABLE_PERSPECTIVE_PROJECTION
    #define ENABLE_ALL_COORDINATES 1
#endif


#ifdef ENABLE_SURFACE_DEPTH_SHADING
    #define ENABLE_DEPTH 1
#endif

#ifdef ENABLE_WIREFRAME
    #define ENABLE_BARYCENTRIC_DERIVATIVES 1
#endif

#ifdef ENABLE_FACET_PLANE
    #define ENABLE_BARYCENTRIC_DERIVATIVES 1
#endif

#ifdef ENABLE_EMISSION_BACK
    #if !(defined(ENABLE_EMISSION) && defined(ENABLE_EMISSION_FIELD))
    #error Inconsistent emission defines
    #endif
    #define ENABLE_EMISSION_GRADIENT 1
    #define ENABLE_DEPTH 1
    #define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_DENSITY_BACK
    #if !(defined(ENABLE_DENSITY) && defined(ENABLE_DENSITY_FIELD))
    #error Inconsistent density defines
    #endif
    #define ENABLE_DENSITY_GRADIENT 1
    #define ENABLE_DEPTH 1
    #define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_SURFACE_LIGHT
    #if defined(ENABLE_EMISSION_FIELD)
        #define ENABLE_EMISSION_GRADIENT 1
    #elif defined(ENABLE_DENSITY_FIELD)
        #define ENABLE_DENSITY_GRADIENT 1
    #endif
    #define ENABLE_PLANES 1
#endif

#if defined(ENABLE_EMISSION_GRADIENT) || defined(ENABLE_DENSITY_GRADIENT)
    // If we need one or more function gradients,
    // we need the Jacobian inverse of the coordinate field
    #define ENABLE_JACOBIAN_INVERSE 1
#endif

#ifdef ENABLE_DEPTH
    #define ENABLE_ALL_COORDINATES 1
    #define ENABLE_BARYCENTRIC_COORDINATES 1
    #define ENABLE_EDGES 1
    #define ENABLE_PLANES 1
#endif

#ifdef ENABLE_BARYCENTRIC_DERIVATIVES
    #define ENABLE_BARYCENTRIC_COORDINATES 1
#endif

#ifdef ENABLE_PLANES
    #define ENABLE_EDGES 1
#endif

#ifdef ENABLE_EDGES
    #define ENABLE_ALL_COORDINATES 1
#endif

#ifdef ENABLE_JACOBIAN_INVERSE
    #define ENABLE_ALL_COORDINATES 1
#endif

#if defined(ENABLE_ALL_COORDINATES) || defined(ENABLE_DENSITY_FIELD) || defined(ENABLE_EMISSION_FIELD)
    // If we need to sample any per-vertex texture for all vertices on tetrahedron
    #define ENABLE_ALL_VERTEX_UV 1
#endif
