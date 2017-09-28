// Fragment shader for the Unray project implementing
// variations of View Independent Cell Projection

// Added by three.js:
// #extension GL_OES_standard_derivatives : enable
// precision highp float;
// precision highp int;
// precision highp sampler2D;
// precision highp usampler2D;

// Using webpack-glsl-loader to copy in shared code
@import ./utils/inverse;
@import ./utils/getitem;
@import ./utils/sorted;
@import ./utils/depth;
@import ./utils/isosurface;

/*
For uniforms added by three.js, see
https://threejs.org/docs/index.html#api/renderers/webgl/WebGLProgram
*/

// Variables for log depth buffer
@import ./logbufdepth_pars_fragment;

// Add defines based on internal dependencies
@import ./dependencies;

// Share uniforms between fragment and vertex shader (affected by defines!)
@import ./uniforms;

// Share varyings between fragment and vertex shader (affected by defines!)
@import ./varyings;


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
#ifdef ENABLE_FACET_INDEX
    int facet = smallest_index(bc_width);
#endif

#ifdef ENABLE_FACET_PLANE
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