    // Map components of values from [range.x, range.y] to [0, 1],
    // optimized by expecting
    //    range.w == 1.0 / (range.x - range.y) or 1 if range.x == range.y

    // FIXME: Clamp scaled_density and scaled_emission to [0,1],
    // or just allow the texture sampler to deal with that?

// TODO: Could map functions to different color channels:
//       hue, saturation, luminance, noise texture intensity

#ifdef ENABLE_EMISSION_FIELD
    float scaled_emission = (v_emission - u_emission_range.x) * u_emission_range.w;
#else
    float scaled_emission = u_emission_constant;
#endif

#ifdef ENABLE_EMISSION_LUT
    vec3 mapped_emission = texture2D(t_emission_lut, vec2(scaled_emission, 0.5)).xyz;
#else
    // TODO: Review API and whether this is reachable
    vec3 mapped_emission = u_emission_color * scaled_emission;
#endif

#ifdef ENABLE_EMISSION_BACK
    float emission_back = v_emission + depth * dot(v_emission_gradient, view_direction);
    float scaled_emission_back = (emission_back - u_emission_range.x) * u_emission_range.w;

  #ifdef ENABLE_EMISSION_LUT
    vec3 mapped_emission_back = texture2D(t_emission_lut, vec2(scaled_emission_back, 0.5)).xyz;
  #else
    vec3 mapped_emission_back = u_emission_color * scaled_emission_back;
  #endif
#endif