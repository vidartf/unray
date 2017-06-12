// Fragment shader for the Unray project implementing
// variations of View Independent Cell Projection


// precision highp float;
// precision highp int;
// precision highp sampler2D;
// precision highp usampler2D;


// Using webpack-glsl-loader to copy in shared code
@import ./inverse;
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

#ifdef ENABLE_SURFACE_DEPTH_MODEL
#define ENABLE_DEPTH 1
#endif

#ifdef ENABLE_EMISSION_BACK
#define ENABLE_EMISSION 1
#define ENABLE_DEPTH 1
#define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_DENSITY_BACK
#define ENABLE_DENSITY 1
#define ENABLE_DEPTH 1
#define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_DENSITY
#endif

#ifdef ENABLE_EMISSION
#endif


// Time uniforms
uniform float u_time;
uniform vec4 u_oscillators;

// Custom camera uniforms
#ifdef ENABLE_PERSPECTIVE_PROJECTION
#else
uniform vec3 u_view_direction;
#endif

// Input data uniforms
uniform vec3 u_constant_color;
uniform vec2 u_isorange;
uniform float u_particle_area;
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

#ifdef ENABLE_DEPTH
varying float v_max_edge_length;         // webgl2 required for flat keyword
#ifdef ENABLE_PERSPECTIVE_PROJECTION
varying mat4 v_planes;                   // webgl2 required for flat keyword
#else
varying vec4 v_ray_lengths;
#endif
#endif

#ifdef ENABLE_DENSITY
varying float v_density;
#endif
#ifdef ENABLE_EMISSION
varying float v_emission;
#endif

#ifdef ENABLE_DENSITY_BACK
varying vec3 v_density_gradient;  // webgl2 required for flat keyword
#endif
#ifdef ENABLE_EMISSION_BACK
varying vec3 v_emission_gradient;  // webgl2 required for flat keyword
#endif

void main()
{
// #ifdef ENABLE_PERSPECTIVE_PROJECTION
//     vec3 position = v_model_position / gl_FragCoord.w;
// #else
    vec3 position = v_model_position;
// #endif

    // We need the view direction below
#ifdef ENABLE_PERSPECTIVE_PROJECTION
    vec3 view_direction = normalize(position - cameraPosition);
#else
    vec3 view_direction = u_view_direction;
#endif


#ifdef ENABLE_DEPTH
#ifdef ENABLE_PERSPECTIVE_PROJECTION
    vec4 ray_lengths;
    for (int i = 0; i < 4; ++i) {
        vec3 n = v_planes[i].xyz;
        float p = v_planes[i].w;
        ray_lengths[i] = (p - dot(n, position)) / dot(n, view_direction);

        // Check if exit point is inside tetrahedron
        // vec3 exit_point = position + ray_lengths[i] * view_direction;
        // for (int j = 0; j < 4; ++j) {
        //     vec3 nj = v_planes[j].xyz;
        //     float pj = v_planes[j].w;
        //     if (pj - dot(nj, position) <= 1e-3) {
        //         ray_lengths[i] = 0.0;
        //     }
        // }
    }
#else
    vec4 ray_lengths = v_ray_lengths;
#endif
    float depth = smallest_positive(ray_lengths, v_max_edge_length);
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
    // TODO: Could add some light model for the surface shading here?

    // vec3 surface_normal = normalize(v_density_gradient);
    // vec3 surface_normal = normalize(v_emission_gradient);

    #if defined(ENABLE_EMISSION)
    vec3 C = mapped_emission;  // CHECKME
    #elif defined(ENABLE_DENSITY)
    vec3 C = mapped_density * u_constant_color;  // CHECKME
    #else
    vec3 C = u_constant_color;  // CHECKME
    #endif

    // Always opaque
    float a = 1.0;
#endif


#ifdef ENABLE_SURFACE_DEPTH_MODEL
    // Scaling depth to [0,1], deepest is black, shallow is white
    vec3 C = vec3(1.0 - depth/v_max_edge_length);

    // Always opaque
    float a = 1.0;
#endif


    // I'm sure this can be done more elegantly but the endgoal
    // is texture lookups to support arbitrary numbers of isovalues
#ifdef ENABLE_ISOSURFACE_MODEL
    // TODO: Could add some light model for the surface shading here?

    vec2 isorange = u_isorange;

    #if defined(ENABLE_DENSITY)
    compile_error();  // Isosurface only implemented for emission for now
    #elif defined(ENABLE_EMISSION_BACK)
    float front = v_emission;
    float back = emission_back;
    #elif defined(ENABLE_EMISSION)
    float front = v_emission;
    float back = v_emission;
    #else
    compile_error();  // Isosurface needs emission
    #endif

    // vec3 surface_normal = normalize(v_emission_gradient);

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

    // Map value through color lut
    // TODO: Using emission lut here for now, what to do here is question of how to configure encoding parameters
    float scaled_value = (value - u_emission_range.x) * u_emission_range.w;
    vec3 C = texture2D(t_emission_lut, vec2(scaled_value, 0.5)).xyz;        

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
    #elif defined(ENABLE_INTEGRATED_DENSITY)
    // TODO: Preintegrated texture of integrated density from front to back value
    #elif defined(ENABLE_DENSITY_BACK)
    // This is exact assuming rho linear along a ray segment
    float rho = mix(mapped_density, mapped_density_back, 0.5);
    #elif defined(ENABLE_DENSITY)
    // This is exact for rho constant along a ray segment
    float rho = mapped_density;
    #else
    compile_error();  // Xray model needs density and density only
    #endif

    // DEBUGGING: Add some oscillation to density
    float area = u_particle_area;
    // area *= (2.0 + u_oscillators[1]) / (3.0);

    // Compute transparency (NB! this is 1-opacity)
    float a = exp(-depth * area * rho);  // CHECKME

    // All color comes from the background
    vec3 C = vec3(0.0);  // CHECKME

    // TODO: Test smallest_positive more
    // C.rgb = v_ray_lengths.xyz;  // These are nonzero

    // C.r = 0.0; // smallest_positive(vec4(0.0, 0.0, 0.0, 0.0));
    // C.g = 1.0; // smallest_positive(vec4(1.0, 1.0, 1.0, 1.0));
    // C.b = 1.0; // smallest_positive(vec4(-1.0, 0.0, 1.0, 0.0));

    // C.r = smallest_positive(vec4(-1.0, 1.0, 0.0, 0.0));
    // a = 0.0;
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

    // Debugging
    // if (gl_FrontFacing) {
    //     C.r = 0.0;
    // } else {
    //     C.r = 1.0;
    // }

    // Record result. Note that this will fail to compile
    // if C and a are not defined correctly above, providing a
    // small but significant safeguard towards errors in the
    // ifdef landscape above.
    gl_FragColor = vec4(C, a);

    // DEBUGGING:
    // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    // gl_FragColor = vec4(u_constant_color, 1.0);
    // gl_FragColor = vec4(u_constant_color, a);
    // gl_FragColor = vec4(0.0, 0.0, 1.0, a);
}