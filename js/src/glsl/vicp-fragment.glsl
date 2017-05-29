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

// Time uniforms
uniform float u_time;
uniform vec4 u_oscillators;

// Custom camera uniforms
uniform vec3 u_view_direction;

// Input data uniforms
#ifdef ENABLE_DENSITY
uniform vec4 u_density_range;
#endif
#ifdef ENABLE_EMISSION
uniform vec4 u_emission_range;
#endif
uniform vec3 u_constant_color;

// LUT textures
#ifdef ENABLE_DENSITY
uniform sampler2D t_density_lut;
#endif
#ifdef ENABLE_EMISSION
uniform sampler2D t_emission_lut;
#endif

// Varyings
varying vec3 v_model_position;
varying vec3 v_view_direction; // flat
#ifdef ENABLE_DEPTH
varying vec4 v_ray_lengths;
#endif
#ifdef ENABLE_DENSITY
varying float v_density;
#endif
#ifdef ENABLE_EMISSION
varying float v_emission;
#endif
#ifdef ENABLE_DENSITY_BACK
varying float v_density_gradient; // FIXME: flat
#endif
#ifdef ENABLE_EMISSION_BACK
varying float v_emission_gradient; // flat
#endif

void main()
{
#ifdef ENABLE_PERSPECTIVE_PROJECTION
    //vec3 view_direction = normalize(v_view_direction);
    vec3 view_direction = normalize(v_model_position - cameraPosition);
#else
    vec3 view_direction = u_view_direction;
#endif

#ifdef ENABLE_DEPTH
    float depth = smallest_positive(v_ray_lengths);
#endif

    // Map components of values from [range.x, range.y] to [0, 1],
    // optimized by expecting
    //    range.w == 1.0 / (range.x - range.y) or 1 if range.x == range.y
#ifdef ENABLE_DENSITY
    float mapped_density = (v_density - u_density_range.x) * u_density_range.w;
#endif

#ifdef ENABLE_EMISSION
    float mapped_emission = (v_emission - u_emission_range.x) * u_emission_range.w;
#endif

#ifdef ENABLE_DENSITY_BACK
    // TODO: With constant view direction,
    //    dot(v_density_gradient, view_direction)
    // is also constant and can be made a flat varying
    float density_back = v_density + depth * dot(v_density_gradient, view_direction);
    float mapped_density_back = (density_back - u_density_range.x) * u_density_range.w;
#endif

#ifdef ENABLE_EMISSION_BACK
    float emission_back = v_emission + depth * dot(v_emission_gradient, view_direction);
    float mapped_emission_back = (emission_back - u_emission_range.x) * u_emission_range.w;
#endif

    vec3 C = vec3(1.0);
    float a = 1.0;

#ifdef ENABLE_SURFACE_MODEL
    // TODO: Could add some light model for the surface shading here
    #ifdef ENABLE_EMISSION
    C = texture2D(t_emission_lut, vec2(mapped_emission, 0.5)).xyz;
    #else
    C = u_constant_color;
    #endif
#endif

#ifdef ENABLE_XRAY_MODEL
#endif

#ifdef ENABLE_MAX_MODEL
#endif

    gl_FragColor = vec4(C, a);
}