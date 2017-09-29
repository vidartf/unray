// TODO: With orthographic camera and constant view direction,
//    dot(v_density_gradient, view_direction)
// is also constant and can be made a flat varying


// Evaluate
#ifdef ENABLE_DENSITY_FIELD
    float density = v_density;
#else
    float density = u_density_constant;
#endif

// Scale
#if defined(USE_DENSITY_SCALE_IDENTITY)
    float scaled_density = density;
#endif
#if defined(USE_DENSITY_SCALE_LINEAR)
    float scaled_density = u_density_scale_m * density + u_density_scale_b;
#endif
#if defined(USE_DENSITY_SCALE_LOG)
    float scaled_density = u_density_scale_m * log(density) + u_density_scale_b;
#endif
#if defined(USE_DENSITY_SCALE_POW)
    float scaled_density = u_density_scale_m * pow(density, u_density_scale_k) + u_density_scale_b;
#endif

// Map
#ifdef ENABLE_DENSITY_LUT
    float mapped_density = texture2D(t_density_lut, vec2(scaled_density, 0.5)).a;
#else
    float mapped_density = scaled_density;
#endif


// Repeat for back value
#ifdef ENABLE_DENSITY_BACK
    // Evaluate
    float density_back = density + depth * dot(v_density_gradient, view_direction);

    // Scale
#if defined(USE_DENSITY_SCALE_IDENTITY)
    float scaled_density_back = density_back;
#endif
#if defined(USE_DENSITY_SCALE_LINEAR)
    float scaled_density_back = u_density_scale_m * density_back + u_density_scale_b;
#endif
#if defined(USE_DENSITY_SCALE_LOG)
    float scaled_density_back = u_density_scale_m * log(density_back) + u_density_scale_b;
#endif
#if defined(USE_DENSITY_SCALE_POW)
    float scaled_density_back = u_density_scale_m * pow(density_back, u_density_scale_k) + u_density_scale_b;
#endif

    // Map
  #ifdef ENABLE_DENSITY_LUT
    float mapped_density_back = texture2D(t_density_lut, vec2(scaled_density_back, 0.5)).a;
  #else
    float mapped_density_back = scaled_density_back;
  #endif
#endif