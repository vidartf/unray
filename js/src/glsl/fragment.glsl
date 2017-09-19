// Fragment shader for the Unray project implementing
// variations of View Independent Cell Projection


// precision highp float;
// precision highp int;
// precision highp sampler2D;
// precision highp usampler2D;

// Added by three.js:
// #extension GL_OES_standard_derivatives : enable

// Using webpack-glsl-loader to copy in shared code
@import ./utils/inverse;
@import ./utils/getitem;
@import ./utils/sorted;
@import ./utils/depth;
@import ./utils/isosurface;


/* For uniforms added by three.js, see
https://threejs.org/docs/index.html#api/renderers/webgl/WebGLProgram
*/
    // Copied from THREE.js logbufdepth_pars_fragment.glsl
#ifdef USE_LOGDEPTHBUF
	uniform float logDepthBufFC;
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
	#endif
#endif


// Crude dependency graph for ENABLE_FOO code blocks.
// It's useful to share this between the vertex and fragment shader,
// so if something needs to be toggled separately in those there
// needs to be separate define names.

#ifdef ENABLE_XRAY_MODEL
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
    #if !defined(ENABLE_EMISSION) || !defined(ENABLE_EMISSION_FIELD)
    compile_error();
    #endif
    #define ENABLE_EMISSION_GRADIENT 1
    #define ENABLE_DEPTH 1
    #define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_DENSITY_BACK
    #if !defined(ENABLE_DENSITY) || !defined(ENABLE_DENSITY_FIELD)
    compile_error();
    #endif
    #define ENABLE_DENSITY_GRADIENT 1
    #define ENABLE_DEPTH 1
    #define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_SURFACE_LIGHT
    #if defined(ENABLE_EMISSION)
        #define ENABLE_EMISSION_GRADIENT 1
    #elif defined(ENABLE_DENSITY)
        #define ENABLE_DENSITY_GRADIENT 1
    #endif
    #define ENABLE_PLANES 1
#endif

#ifdef ENABLE_DEPTH
    #define ENABLE_BARYCENTRIC_COORDINATES 1
    #ifdef ENABLE_PERSPECTIVE_PROJECTION
        #define ENABLE_PLANES 1
    #endif
#endif

#ifdef ENABLE_BARYCENTRIC_DERIVATIVES
    #define ENABLE_BARYCENTRIC_COORDINATES 1
#endif


// Time uniforms
uniform float u_time;
uniform vec4 u_oscillators;

// Custom camera uniforms
//uniform mat4 u_mvp_matrix;
#ifdef ENABLE_PERSPECTIVE_PROJECTION
uniform vec3 u_local_camera_position;
#else
uniform vec3 u_local_view_direction;
#endif


// Custom light uniforms
uniform vec3 u_emission_color;
#ifdef ENABLE_SURFACE_LIGHT
uniform vec2 u_emission_intensity_range;  // [min, max]
#endif
#ifdef ENABLE_SUM_MODEL
uniform float u_exposure;
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
// Isovalue spacing for multiple surface
uniform float u_isovalue_spacing;
// Time period for sweep modes
uniform float u_isovalue_sweep_period;
#endif

#if defined(ENABLE_XRAY_MODEL) || defined(ENABLE_VOLUME_MODEL)
uniform float u_extinction;
#endif

// #ifdef ENABLE_CELL_INDICATORS
// uniform int u_cell_indicator_value;
// #endif

#ifdef ENABLE_DENSITY
#ifdef ENABLE_DENSITY_FIELD
uniform vec4 u_density_range;
#else
uniform float u_density_constant;
#endif
#endif

#ifdef ENABLE_DENSITY_LUT
uniform sampler2D t_density_lut;
#endif


#ifdef ENABLE_EMISSION
#ifdef ENABLE_EMISSION_FIELD
uniform vec4 u_emission_range;
#else
uniform float u_emission_constant;
#endif
#endif

#ifdef ENABLE_EMISSION_LUT
uniform sampler2D t_emission_lut;
#endif


// Varyings
varying vec3 v_model_position;


#ifdef ENABLE_BARYCENTRIC_COORDINATES
varying vec4 v_barycentric_coordinates;
#endif

// #ifdef ENABLE_CELL_INDICATORS
// varying float v_cell_indicator;                // want int or float, webgl2 required for flat keyword
// #endif

#ifdef ENABLE_DEPTH
varying float v_max_depth;               // webgl2 required for flat keyword
varying vec4 v_facing;                   // webgl2 required for flat keyword
#endif

#ifdef ENABLE_PLANES
varying mat4 v_planes;                   // webgl2 required for flat keyword
#endif

#if defined(ENABLE_DEPTH) && !defined(ENABLE_PERSPECTIVE_PROJECTION)
varying vec4 v_ray_lengths;
#endif

#ifdef ENABLE_DENSITY_FIELD
varying float v_density;
#endif

#ifdef ENABLE_EMISSION_FIELD
varying float v_emission;
#endif

#ifdef ENABLE_DENSITY_GRADIENT
varying vec3 v_density_gradient;  // webgl2 required for flat keyword
#endif

#ifdef ENABLE_EMISSION_GRADIENT
varying vec3 v_emission_gradient;  // webgl2 required for flat keyword
#endif


// TODO: Could pass on all vertex values to compute function error
//       estimate, err = sum_i bc_width[i]*vertex_values[i];
//varying vec4 v_emission_vertex_values;


void main()
{
    // TODO: See vertex shader for cell indicator plan
    // TODO: Handle facet indicators
// #ifdef ENABLE_CELL_INDICATORS
//     // Round to get the exact integer because fragment shader
//     // doesn't interpolate constant integer valued floats accurately
//     int cell_indicator = int(v_cell_indicator + 0.5);
//     // TODO: Use texture lookup with nearest interpolation to get
//     // color and discard-or-not (a=0|1) for a range of indicator values
//     if (cell_indicator != u_cell_indicator_value) {
//         discard;
//     }
// #endif


    // Fragment position in model space
    vec3 position = v_model_position;

    // Compute view direction vector from camera
    // to this fragment in model coordinates
#ifdef ENABLE_PERSPECTIVE_PROJECTION
    vec3 view_direction = normalize(position - u_local_camera_position);
#else
    vec3 view_direction = u_local_view_direction;
#endif

    // Estimate the resolution of the barycentric coordinate
    // components in screen space, useful for determining
    // robustly whether bc is "close to" 0.0 or 1.0
#ifdef ENABLE_BARYCENTRIC_DERIVATIVES
    vec4 bc_width = fwidth(v_barycentric_coordinates);
#endif

    // Determine which facet we're on and fetch the normal vector
#ifdef ENABLE_FACET_PLANE
    int facet = smallest_index(bc_width);
    vec4 facet_plane = getitem(v_planes, facet);
#endif

    // Compute depth of tetrahedron behind fragment
#ifdef ENABLE_DEPTH
@import ./fragment-depth;
#endif

    // Compute scaled_density, scaled_density_back,
    // mapped_density, and mapped_density_back.
#ifdef ENABLE_DENSITY
@import ./fragment-density;
#endif

    // Compute scaled_emission, scaled_emission_back,
    // mapped_emission, and mapped_emission_back.
#ifdef ENABLE_EMISSION
@import ./fragment-emission;
#endif

    // Note: Each model here defines vec3 C and float a inside the ifdefs,
    // which makes the compiler check that we define them once and only once.
    // TODO: Step through each model with some data and check. See CHECKME below.
#if defined(ENABLE_SURFACE_MODEL)
@import ./fragment-surface;
#elif defined(ENABLE_ISOSURFACE_MODEL)
@import ./fragment-isosurface;
#elif defined(ENABLE_INTERVAL_VOLUME_MODEL)
@import ./fragment-interval-volume;
#elif defined(ENABLE_MAX_MODEL)
@import ./fragment-max;
#elif defined(ENABLE_MIN_MODEL)
@import ./fragment-min;
#elif defined(ENABLE_XRAY_MODEL)
@import ./fragment-xray;
#elif defined(ENABLE_SUM_MODEL)
@import ./fragment-sum;
#elif defined(ENABLE_VOLUME_MODEL)
@import ./fragment-volume;
#endif

    // Mixes wireframe into surface color (TODO: move to surface?)
#ifdef ENABLE_WIREFRAME
@import ./fragment-wireframe;
#endif

    // Discard fragments outside facet restriction
    // TODO: Finialize this, move to surface?
#ifdef ENABLE_FACET_INDICATORS
@import ./fragment-facet-indicators;
#endif

    // Hook to insert debug statements without editing this file
@import ./fragment-debug;

    // Record result. Note that this will fail to compile
    // if C and a are not defined correctly above, providing
    // a small but useful safeguard towards errors in the
    // somewhat hard to follow "ifdef landscape" above.
    gl_FragColor = vec4(C, a);

    // Adjust fragment depth when using logarithmic buffer
    // (Copied from THREE.js logbufdepth_fragment.glsl)
#if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
#endif
}