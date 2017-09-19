    // Map components of values from [range.x, range.y] to [0, 1],
    // optimized by expecting
    //    range.w == 1.0 / (range.x - range.y) or 1 if range.x == range.y

    // FIXME: Clamp scaled_density and scaled_emission to [0,1],
    // or just allow the texture sampler to deal with that?

#ifdef ENABLE_DENSITY_FIELD
    float scaled_density = (v_density - u_density_range.x) * u_density_range.w;
#else
    float scaled_density = u_density_constant;
#endif

#ifdef ENABLE_DENSITY_LUT
    float mapped_density = texture2D(t_density_lut, vec2(scaled_density, 0.5)).a;
#else
    float mapped_density = scaled_density;
#endif

#ifdef ENABLE_DENSITY_BACK
    // TODO: With constant view direction,
    //    dot(v_density_gradient, view_direction)
    // is also constant and can be made a flat varying
    float density_back = v_density + depth * dot(v_density_gradient, view_direction);
    float scaled_density_back = (density_back - u_density_range.x) * u_density_range.w;
    
  #ifdef ENABLE_DENSITY_LUT
    float mapped_density_back = texture2D(t_density_lut, vec2(scaled_density_back, 0.5)).a;
  #else
    float mapped_density_back = scaled_density_back;
  #endif
#endif