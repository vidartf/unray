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
@import ./vicp-lib;


/* Uniforms added by three.js, see
https://threejs.org/docs/index.html#api/renderers/webgl/WebGLProgram

uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
*/


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

#ifdef ENABLE_SURFACE_DEPTH_MODEL
    #define ENABLE_DEPTH 1
#endif

#ifdef ENABLE_WIREFRAME
    #define ENABLE_BARYCENTRIC_DERIVATIVES 1
#endif

#ifdef ENABLE_FACET_PLANE
    #define ENABLE_BARYCENTRIC_DERIVATIVES 1
#endif

#ifdef ENABLE_EMISSION_BACK
    #define ENABLE_EMISSION 1
    #define ENABLE_EMISSION_GRADIENT 1
    #define ENABLE_DEPTH 1
    #define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_DENSITY_BACK
    #define ENABLE_DENSITY 1
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
#ifdef ENABLE_PERSPECTIVE_PROJECTION
#else
uniform vec3 u_view_direction;
#endif

// Custom light uniforms
#ifdef ENABLE_SURFACE_LIGHT
uniform float u_light_floor;
#endif


// Input data uniforms
uniform vec3 u_constant_color;
uniform float u_exposure;

#ifdef ENABLE_WIREFRAME
uniform vec3 u_wireframe_color;
uniform float u_wireframe_alpha;
uniform float u_wireframe_size;
#endif

#ifdef ENABLE_ISOSURFACE_MODEL
uniform vec2 u_isorange;
#endif

#if defined(ENABLE_XRAY_MODEL) || defined(ENABLE_VOLUME_MODEL)
uniform float u_particle_area;  // TODO: Use u_exposure instead?
#endif

// #ifdef ENABLE_CELL_INDICATORS
// uniform int u_cell_indicator_value;
// #endif
#ifdef ENABLE_DENSITY
uniform vec4 u_density_range;
#endif
#ifdef ENABLE_EMISSION
uniform vec4 u_emission_range;
#endif


// LUT textures
#ifdef ENABLE_DENSITY
uniform sampler2D t_density_lut;
#endif
#ifdef ENABLE_EMISSION
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

#ifdef ENABLE_DENSITY
varying float v_density;
#endif

#ifdef ENABLE_EMISSION
varying float v_emission;
#endif

#ifdef ENABLE_DENSITY_GRADIENT
varying vec3 v_density_gradient;  // webgl2 required for flat keyword
#endif

#ifdef ENABLE_EMISSION_GRADIENT
varying vec3 v_emission_gradient;  // webgl2 required for flat keyword
#endif


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


    // We need the view direction below
#ifdef ENABLE_PERSPECTIVE_PROJECTION
    vec3 view_direction = normalize(position - cameraPosition);
#else
    vec3 view_direction = u_view_direction;
#endif


#ifdef ENABLE_BARYCENTRIC_DERIVATIVES
    // Estimate the resolution of the barycentric coordinate
    // components in screen space, useful for determining
    // robustly whether bc is "close to" 0.0 or 1.0
    vec4 bc_width = fwidth(v_barycentric_coordinates);
#endif


#ifdef ENABLE_FACET_PLANE
    // Determine which facet we're on and fetch the normal vector
    int facet = smallest_index(bc_width);
    vec4 facet_plane = getitem(v_planes, facet);  // CHECKME
#endif


#if defined(ENABLE_DEPTH) && defined(ENABLE_PERSPECTIVE_PROJECTION)
    // Initialize to a too large value
    float depth = 1000.0 * v_max_depth;
    bool touched = false;

    // Check all faces (we don't know which face we're on,
    // but that's always a front face and will be skipped)
    for (int i = 0; i < 4; ++i) {
        // Only back faces can be exit points
        if (v_facing[i] < 0.0) {
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
#endif


#if defined(ENABLE_DEPTH) && !defined(ENABLE_PERSPECTIVE_PROJECTION)
    // Find which faces are back faces
    bvec4 is_back_face = lessThan(v_facing, vec4(-0.5));
    vec4 ray_lengths = v_ray_lengths;
    float depth = compute_depth(ray_lengths, v_barycentric_coordinates, is_back_face, v_max_depth);
#endif


    // Map components of values from [range.x, range.y] to [0, 1],
    // optimized by expecting
    //    range.w == 1.0 / (range.x - range.y) or 1 if range.x == range.y

    // FIXME: Clamp scaled_density and scaled_emission to [0,1],
    // or just allow the texture sampler to deal with that?

#ifdef ENABLE_DENSITY
    float scaled_density = (v_density - u_density_range.x) * u_density_range.w;
    float mapped_density = texture2D(t_density_lut, vec2(scaled_density, 0.5)).a;
#endif

#ifdef ENABLE_EMISSION
    float scaled_emission = (v_emission - u_emission_range.x) * u_emission_range.w;
    vec3 mapped_emission = texture2D(t_emission_lut, vec2(scaled_emission, 0.5)).xyz;
#endif

#ifdef ENABLE_DENSITY_BACK
    // TODO: With constant view direction,
    //    dot(v_density_gradient, view_direction)
    // is also constant and can be made a flat varying
    float density_back = v_density + depth * dot(v_density_gradient, view_direction);
    float scaled_density_back = (density_back - u_density_range.x) * u_density_range.w;
    float mapped_density_back = texture2D(t_density_lut, vec2(scaled_density_back, 0.5)).a;
#endif

#ifdef ENABLE_EMISSION_BACK
    float emission_back = v_emission + depth * dot(v_emission_gradient, view_direction);
    float scaled_emission_back = (emission_back - u_emission_range.x) * u_emission_range.w;
    vec3 mapped_emission_back = texture2D(t_emission_lut, vec2(scaled_emission_back, 0.5)).xyz;
#endif


    // Note: Each model here defines vec3 C and float a inside the ifdefs,
    // which makes the compiler check that we define them once and only once.

    // TODO: Step through each model with some data and check. See CHECKME below.

    // TODO: Could map functions to different color channels:
    //       hue, saturation, luminance, noise texture intensity


#ifdef ENABLE_DEBUG_MODEL
    vec3 C = vec3(1.0, 0.5, 0.5);
    float a = 1.0;
#endif


#ifdef ENABLE_SURFACE_MODEL
    #if defined(ENABLE_EMISSION)
    vec3 C = mapped_emission;  // CHECKME
    #elif defined(ENABLE_DENSITY)
    vec3 C = mapped_density * u_constant_color;  // CHECKME
    #else
    vec3 C = u_constant_color;  // CHECKME
    #endif

    // Apply simple flat shading model
  #if defined(ENABLE_SURFACE_LIGHT)
    vec3 surface_normal = facet_plane.xyz;
    C *= u_light_floor + (1.0 - u_light_floor) * abs(dot(surface_normal, view_direction)); // CHECKME
  #endif

    // TODO: Could modulate surface_scaling or color components with
    // noise or a texture, e.g.:
    // C *= (1.0 - u_modulate_amplitude * mapped_density);
    // C *= (1.0 - u_oscillators[1] * u_modulate_amplitude * mapped_density);
    // C = desaturate(C, mapped_density);

    // Always opaque
    float a = 1.0;
#endif


#ifdef ENABLE_SURFACE_DEPTH_MODEL
    // This is primarily a debugging technique

    // Scaling depth to [0,1], deepest is black, shallow is white
    // vec3 C = vec3(1.0 - depth/v_max_depth);

    // Deepest is green, shallow is red
    vec3 C = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), depth/v_max_depth);

    // Always opaque
    float a = 1.0;
#endif


    // TODO: Revamp this code
#ifdef ENABLE_INTERVAL_VOLUME_MODEL
    vec2 isorange = u_isorange;

    bool front_in_range = isorange.x <= front && front <= isorange.y;
    bool back_in_range = isorange.x <= back && back <= isorange.y;

    // If values are not in isorange, discard this fragment
    if (!(front_in_range || back_in_range)) {
        discard;
    }

    // Select isorange value closest to camera
    float value;
    if (front_in_range) {
        value = front;
    } else if (front > back) {
        value = isorange.y;
    } else {
        value = isorange.x;
    }
#endif


#ifdef ENABLE_ISOSURFACE_MODEL
    // TODO: This is getting a bit complex, maybe refactor to some functions

    #if defined(ENABLE_EMISSION_BACK)
    float front = v_emission;
    float back = emission_back;
    vec4 value_range = u_emission_range;
    #elif defined(ENABLE_DENSITY_BACK)
    float front = v_density;
    float back = density_back;
    vec4 value_range = u_density_range;
    #else
    compile_error();  // Isosurface needs front and back values
    #endif

    // FIXME add uniforms
    // Isovalue for surface n = 0
    //uniform float u_isovalue;
    // Isovalue spacing for multiple surface
    //uniform float u_isosurface_spacing;
    // Time period for sweep modes
    //uniform float u_sweep_period;

    // FIXME set these uniform defaults in js or python code
    float u_isovalue = 0.5 * (value_range.x + value_range.y);
    float u_sweep_period = 2.0;
  #if !defined(USING_ISOSURFACE_MODE_SINGLE)
    float num_intervals = 10.0;
    #if defined(USING_ISOSURFACE_MODE_LINEAR)
    float u_isosurface_spacing = (1.0 / num_intervals) * (value_range.y - value_range.x);
    #elif defined(USING_ISOSURFACE_MODE_LOG)
    float u_isosurface_spacing = pow(value_range.y / value_range.x, 1.0 / (num_intervals + 1.0));
    #endif
  #endif


  #if defined(USING_ISOSURFACE_MODE_SINGLE)
    // Single surface variant, check if value is outside range of ray
    float value = u_isovalue;
    if (is_outside_interval(value, back, front)) {
        discard;
    }
  #elif defined(USING_ISOSURFACE_MODE_SWEEP)
    // Single surface variant, check if value is outside range of ray
    float value = mix(value_range.x, value_range.y, fract(u_time / u_sweep_period));
    if (is_outside_interval(value, back, front)) {
        discard;
    }
  #elif defined(USING_ISOSURFACE_MODE_LINEAR)
    // Multiple surfaces spaced with fixed distance
    float value;
    if (!find_isovalue_linear_spacing(value, back, front, u_isovalue, u_isosurface_spacing)) {
        discard;
    }
  #elif defined(USING_ISOSURFACE_MODE_LOG)
    // Multiple surfaces spaced with fixed ratio
    float value;
    if (!find_isovalue_log_spacing(value, back, front, u_isovalue, u_isosurface_spacing)) {
        discard;
    }
  #endif


    // Map value through color lut
    float scaled_value = (value - value_range.x) * value_range.w;
  #if defined(ENABLE_EMISSION_BACK)
    vec3 C = texture2D(t_emission_lut, vec2(scaled_value, 0.5)).xyz; // CHECKME
  #elif defined(ENABLE_DENSITY_BACK)
    vec3 C = u_constant_color * texture2D(t_density_lut, vec2(scaled_value, 0.5)).a; // CHECKME
  #endif

    // Apply simple flat shading model
  #if defined(ENABLE_SURFACE_LIGHT) && (defined(ENABLE_EMISSION) || defined(ENABLE_DENSITY))
    #if defined(ENABLE_EMISSION)
    vec3 surface_normal = normalize(v_emission_gradient);  // CHECKME
    #elif defined(ENABLE_DENSITY)
    vec3 surface_normal = normalize(v_density_gradient);  // CHECKME
    #endif
    C *= u_light_floor + (1.0 - u_light_floor) * abs(dot(surface_normal, view_direction)); // CHECKME
  #endif

    // Opaque since isosurface is contained in [back, front]
    float a = 1.0;
#endif


#ifdef ENABLE_SURFACE_DERIVATIVE_MODEL
    // TODO: Could we do something interesting with the gradient below the surface.
    // The gradient is unbounded, needs some mapping to [0,1].
    // Can use de/dv (below) or v_emission_gradient (or same for density)
    float emission_view_derivative = (emission - emission_back) / depth;
    float gamma = emission_view_derivative / (emission_view_derivative + 1.0);

    vec3 C = u_constant_color * gamma;

    // Always opaque
    float a = 1.0;
#endif


#ifdef ENABLE_XRAY_MODEL
    #if defined(ENABLE_EMISSION)
    compile_error();  // Xray model does not accept emission, only density
    #elif !defined(ENABLE_DENSITY)  // defined(ENABLE_DENSITY_UNIFORM)
    float rho = 0.1; // u_density;  // TODO: Add this parameter
    #elif defined(ENABLE_DENSITY_INTEGRATED)
    // TODO: Preintegrated texture of integrated density from front to back value
    #elif defined(ENABLE_DENSITY_BACK) // TODO: Rename ENABLE_DENSITY_BACK -> ENABLE_DENSITY_LINEAR
    // This is exact assuming rho linear along a ray segment
    float rho = mix(mapped_density, mapped_density_back, 0.5);
    #elif defined(ENABLE_DENSITY)  // TODO: Use ENABLE_DENSITY_CONSTANT
    // This is exact for rho constant along a ray segment
    float rho = mapped_density;
    #else
    compile_error();  // Xray model needs density and density only
    #endif

    // DEBUGGING: Add some oscillation to density
    // rho *= abs((2.0 + u_oscillators[1]) / 3.0);

    // Compute transparency (NB! this is 1-opacity)
    float a = exp(-depth * u_particle_area * rho);

    // This must be zero for no emission to occur, i.e.
    // all color comes from the background and is attenuated by 1-a
    vec3 C = vec3(0.0);
#endif


#ifdef ENABLE_MAX_MODEL
    // TODO: This can also be done without the LUT,
    // using scaled_foo instead of mapped_foo

    // Define color
    #if defined(ENABLE_EMISSION) && defined(ENABLE_DENSITY)
    compile_error();  // Only emission OR density allowed.
    #elif defined(ENABLE_EMISSION_BACK)
    vec3 C = max(mapped_emission, mapped_emission_back);  // CHECKME
    #elif defined(ENABLE_EMISSION)
    vec3 C = mapped_emission;  // CHECKME
    #elif defined(ENABLE_DENSITY_BACK)
    vec3 C = u_constant_color * max(mapped_density, mapped_density_back);  // CHECKME
    #elif defined(ENABLE_DENSITY)
    vec3 C = u_constant_color * mapped_density;  // CHECKME
    #else
    compile_error();  // Max model needs emission or density
    #endif

    // Opacity is unused for this mode
    float a = 1.0;
#endif


#ifdef ENABLE_MIN_MODEL
    // TODO: This can also be done without the LUT,
    // using scaled_foo instead of mapped_foo

    // Define color
    #if defined(ENABLE_EMISSION) && defined(ENABLE_DENSITY)
    compile_error();  // Only emission OR density allowed.
    #elif defined(ENABLE_EMISSION_BACK)
    vec3 C = min(mapped_emission, mapped_emission_back);  // CHECKME
    #elif defined(ENABLE_EMISSION)
    vec3 C = mapped_emission;  // CHECKME
    #elif defined(ENABLE_DENSITY_BACK)
    vec3 C = u_constant_color * min(mapped_density, mapped_density_back);  // CHECKME
    #elif defined(ENABLE_DENSITY)
    vec3 C = u_constant_color * mapped_density;  // CHECKME
    #else
    compile_error();  // Max model needs emission or density
    #endif

    // Opacity is unused for this mode
    float a = 1.0;
#endif


#ifdef ENABLE_SUM_MODEL
    // Evaluate ray integral, use in combination
    // with blend equation: RGB_src + RGB_dst
    float scale = u_exposure * depth;
    #if defined(ENABLE_EMISSION_BACK)
    vec3 C = scale * mix(mapped_emission, mapped_emission_back, 0.5); // CHECKME
    #elif defined(ENABLE_EMISSION)
    vec3 C = scale * mapped_emission; // CHECKME
    #elif defined(ENABLE_DENSITY_BACK)
    vec3 C = u_constant_color * (scale * mix(mapped_density, mapped_density_back, 0.5)); // CHECKME
    #elif defined(ENABLE_DENSITY)
    vec3 C = u_constant_color * (scale * mapped_density); // CHECKME
    #else
    compile_error();  // Volume model requires emission
    #endif

    // Opacity is unused for this mode
    float a = 1.0;
#endif


#ifdef ENABLE_VOLUME_MODEL
    //#if defined(ENABLE_DENSITY_BACK) && defined(ENABLE_EMISSION_BACK)
    // TODO: Implement Moreland partial pre-integration

    #if defined(ENABLE_DENSITY_BACK)
    // TODO: Currently only using average density, more accurate options exist.
    float rho = mix(mapped_density, mapped_density_back, 0.5); // CHECKME
    #elif defined(ENABLE_DENSITY)
    float rho = mapped_density; // CHECKME
    #else
    compile_error();  // Volume model requires density
    #endif

    #if defined(ENABLE_EMISSION_BACK)
    // TODO: Currently only using average color, more accurate options exist.
    vec3 L = mix(mapped_emission, mapped_emission_back, 0.5); // CHECKME
    #elif defined(ENABLE_EMISSION)
    vec3 L = mapped_emission; // CHECKME
    #else
    compile_error();  // Volume model requires emission
    #endif

    // Evaluate ray integral, use in combination
    // with blend equation: RGB_src * A_dst + RGB_dst
    float a = 1.0 - exp(-depth * u_particle_area * rho); // CHECKME
    vec3 C = a * L;
#endif


#ifdef ENABLE_WIREFRAME
    // Shade edges of triagle to show wireframe.
    // This only works for opaque rendering modes.

    // Compute a measure of closeness to edge in [0, 1],
    // using partial derivatives of barycentric coordinates
    // in window space to ensure edge size is large enough
    // for far away edges.
    vec4 edge_closeness = smoothstep(vec4(0.0), max(bc_width, u_wireframe_size), v_barycentric_coordinates);

    // Pick the two smallest edge closeness values and square them
    vec4 sorted_edge_closeness = sorted(edge_closeness);
    float edge_factor = sorted_edge_closeness[0]*sorted_edge_closeness[0]
                      + sorted_edge_closeness[1]*sorted_edge_closeness[1];

    // Mix edge color into background
    C = mix(u_wireframe_color, C, mix(1.0, edge_factor, u_wireframe_alpha));
#endif


    // TODO: Untested draft:
#ifdef ENABLE_FACET_INDICATORS
    // TODO: Use texture lookup to find color and .a=0|1 discard status
    // ivec4 facet_indicators = ivec4(v_facet_indicators);
    ivec4 facet_indicators = ivec4(0, 1, 0, 1);
    int facet_indicator_value = 0;

    float eps = 1e-2;  // TODO: Configurable tolerance
    for (int i = 0; i < 4; ++i) {
        if (v_barycentric_coordinates[i] < eps) {
            if (facet_indicators[i] == facet_indicator_value) {
                discard;
            }
        }
    }
#endif

    // Record result. Note that this will fail to compile
    // if C and a are not defined correctly above, providing a
    // small but significant safeguard towards errors in the
    // ifdef landscape above.
    gl_FragColor = vec4(C, a);
}
