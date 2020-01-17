// TODO: Could also map functions to different color channels:
//       hue, saturation, luminance, noise texture intensity

// TODO: With orthographic camera and constant view direction,
//    dot(v_emission_gradient, view_direction)
// is also constant and can be made a flat varying


// Evaluate
#ifdef ENABLE_EMISSION_FIELD
    float emission = v_emission;
#else
    float emission = u_emission_constant;
#endif

// Scale
#if defined(USE_EMISSION_SCALE_IDENTITY)
    float scaled_emission = emission;
#endif
#if defined(USE_EMISSION_SCALE_LINEAR)
    float scaled_emission = u_emission_scale_m * emission + u_emission_scale_b;
#endif
#if defined(USE_EMISSION_SCALE_LOG)
    float scaled_emission = u_emission_scale_m * log(emission) + u_emission_scale_b;
#endif
#if defined(USE_EMISSION_SCALE_POW)
    float scaled_emission = u_emission_scale_m * pow(emission, u_emission_scale_k) + u_emission_scale_b;
#endif

// Map
#ifdef ENABLE_EMISSION_LUT
    vec3 mapped_emission = texture2D(t_emission_lut, vec2(scaled_emission, 0.5)).xyz;
#else
    // Identity operation must 'lift' to color
    vec3 mapped_emission = u_emission_color * scaled_emission;
#endif


// Repeat for back value
#ifdef ENABLE_EMISSION_BACK
    // Evaluate
    float emission_back = emission + depth * dot(v_emission_gradient, view_direction);

    // Scale
#if defined(USE_EMISSION_SCALE_IDENTITY)
    float scaled_emission_back = emission_back;
#endif
#if defined(USE_EMISSION_SCALE_LINEAR)
    float scaled_emission_back = u_emission_scale_m * emission_back + u_emission_scale_b;
#endif
#if defined(USE_EMISSION_SCALE_LOG)
    float scaled_emission_back = u_emission_scale_m * log(emission_back) + u_emission_scale_b;
#endif
#if defined(USE_EMISSION_SCALE_POW)
    float scaled_emission_back = u_emission_scale_m * pow(emission_back, u_emission_scale_k) + u_emission_scale_b;
#endif

    // Map
  #ifdef ENABLE_EMISSION_LUT
    vec3 mapped_emission_back = texture2D(t_emission_lut, vec2(scaled_emission_back, 0.5)).xyz;
  #else
    vec3 mapped_emission_back = u_emission_color * scaled_emission_back;
  #endif
#endif