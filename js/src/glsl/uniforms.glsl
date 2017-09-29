// Our own premultiplied MVP matrix, not provided by three.js
uniform mat4 u_mvp_matrix;

#ifdef ENABLE_PERSPECTIVE_PROJECTION
    // Camera position in model coordinates
    uniform vec3 u_local_camera_position;
#else
    // Camera direction in model coordinates
    uniform vec3 u_local_view_direction;
#endif

// Time uniforms (currently not much used)
uniform float u_time;
uniform vec4 u_oscillators;

#ifdef ENABLE_CELL_UV
    // Shape of any texture with per-cell values
    uniform ivec2 u_cell_texture_shape;
#endif

// Shape of any texture with per-vertex values
uniform ivec2 u_vertex_texture_shape;

// Coordinates of all mesh vertices
uniform sampler2D t_coordinates;

#ifdef ENABLE_CELL_ORDERING
    // If cells are ordered via the c_ordering attribute,
    // per-cell data will be looked up in textures

    // Vertex indices for each cell
    uniform sampler2D t_cells;
    #ifdef ENABLE_CELL_INDICATORS
        // Cell indicator value for each cell
        uniform sampler2D t_cell_indicators;
    #endif
#endif

// Single enabled cell indicator value
// TODO: Replace with texture lookup to support multiple indicator values
#ifdef ENABLE_CELL_INDICATORS
    uniform int u_cell_indicator_value;
#endif


#ifdef ENABLE_DENSITY
    #ifdef ENABLE_DENSITY_FIELD
        uniform sampler2D t_density;
    #else
        uniform float u_density_constant;
    #endif

    #ifndef USE_EMISSION_SCALE_IDENTITY
    uniform float u_density_scale_m;
    uniform float u_density_scale_b;
    uniform float u_density_scale_k;
    #endif

    #ifdef ENABLE_DENSITY_LUT
        uniform sampler2D t_density_lut;
    #endif
#endif


#ifdef ENABLE_EMISSION
    #ifdef ENABLE_EMISSION_FIELD
        uniform sampler2D t_emission;
    #else
        uniform float u_emission_constant;
    #endif

    #ifndef USE_EMISSION_SCALE_IDENTITY
    uniform float u_emission_scale_m;
    uniform float u_emission_scale_b;
    uniform float u_emission_scale_k;
    #endif

    #ifdef ENABLE_EMISSION_LUT
        uniform sampler2D t_emission_lut;
    #endif
#endif


// This is used in many places, but can probably be restricted by some defines
uniform vec3 u_emission_color;


// Custom light uniforms
#ifdef ENABLE_SURFACE_LIGHT
uniform vec2 u_emission_intensity_range;  // [min, max]
#endif

#if defined(ENABLE_SUM_MODEL) || defined(ENABLE_VOLUME_MODEL)
uniform float u_exposure;
#endif

#if defined(ENABLE_XRAY_MODEL) || defined(ENABLE_VOLUME_MODEL)
uniform float u_extinction;
#endif

#ifdef ENABLE_WIREFRAME
uniform vec3 u_wireframe_color;
uniform float u_wireframe_alpha;
uniform float u_wireframe_size;
#endif

#ifdef ENABLE_ISOSURFACE_MODEL
uniform vec2 u_volume_interval;
// Isovalue for surface n = 0
uniform float u_isovalue;
uniform float u_isovalue_scaled;
// Isovalue spacing for multiple surface
uniform float u_isovalue_spacing;
uniform float u_isovalue_spacing_inv;
// Time period for sweep modes
uniform float u_isovalue_sweep_period;
#endif