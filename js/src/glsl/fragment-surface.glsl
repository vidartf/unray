// Select emission color
#if defined(ENABLE_EMISSION)
vec3 C_emit = mapped_emission;
#elif defined(ENABLE_DENSITY)
vec3 C_emit = u_emission_color * mapped_density;
#else
vec3 C_emit = u_emission_color;
#endif

// Apply light model
// TODO: Get proper light terms and parameter names in here
#if defined(ENABLE_SURFACE_LIGHT)
vec3 surface_normal = facet_plane.xyz;
float cos_V_N = max(0.0, -dot(surface_normal, view_direction));

// Apply shading to emission color
float k_emit = mix(u_emission_intensity_range.x, u_emission_intensity_range.y, cos_V_N);
vec3 C = k_emit * C_emit;
#else
vec3 C = C_emit;
#endif

// Always opaque
float a = 1.0;


// TODO: Could modulate surface_scaling or color components with
// noise or a texture, e.g.:
// C *= (1.0 - u_modulate_amplitude * mapped_density);
// C *= (1.0 - u_oscillators[1] * u_modulate_amplitude * mapped_density);
// C = desaturate(C, mapped_density);

#ifdef ENABLE_SURFACE_DEPTH_SHADING
    // Debugging technique: Shade by depth behind fragment
    // Scaling depth to [0,1], deepest is black, shallow is white
    // C = vec3(1.0 - depth/v_max_depth);

    // Deepest is green, shallow is red
    C = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), depth/v_max_depth);
#endif

    // TODO: Test this concept and make configurable or remove
#ifdef ENABLE_SURFACE_DERIVATIVE_SHADING
    // TODO: Could we do something interesting with the gradient below the surface.
    // The gradient is unbounded, needs some mapping to [0,1].
    // Can use de/dv (below) or v_emission_gradient (or same for density)
    float emission_view_derivative = (emission - emission_back) / depth;
    float gamma = emission_view_derivative / (emission_view_derivative + 1.0);

    vec3 C = u_emission_color * gamma;
#endif