// Config check
#if !defined(ENABLE_EMISSION_BACK)
#error Isosurface needs front and back values of emission field.
#endif


// TODO: If both emission and density are present,
//       could use density for isovalue selection
//       and map to emission at same point for coloring


// Attempts at avoiding edge artifacts
//float tolerance = mix(0.001, 0.05, clamp(maxv(bc_width), 0.0, 1.0));
//float tolerance = mix(0.0001, 0.03, clamp(minv(bc_width), 0.0, 1.0));
// float tolerance = 0.03;  // TODO: Make this a uniform
float tolerance = 0.0;


#ifdef USING_ISOSURFACE_MODE_SINGLE
    // Single surface variant, check if value is outside range in unscaled domain
    if (is_outside_interval(u_isovalue, emission_back, emission, tolerance)) {
        discard;
    }
#endif


// Scale root value (value for n=0)
#if defined(USE_EMISSION_SCALE_IDENTITY)
    float scaled_rootvalue = u_isovalue;
#endif
#if defined(USE_EMISSION_SCALE_LINEAR)
    float scaled_rootvalue = u_emission_scale_m * u_isovalue + u_emission_scale_b;
#endif
#if defined(USE_EMISSION_SCALE_LOG)
    float scaled_rootvalue = u_emission_scale_m * log(u_isovalue) + u_emission_scale_b;
#endif
#if defined(USE_EMISSION_SCALE_POW)
    float scaled_rootvalue = u_emission_scale_m * pow(u_isovalue, u_emission_scale_k) + u_emission_scale_b;
#endif


#ifdef USING_ISOSURFACE_MODE_SINGLE
    // Single surface variant, range check is earlier
    float scaled_isovalue = scaled_rootvalue;
#else
    // Multiple surfaces spaced with fixed distance in scaled space

    // Find fractional isosurface level for back and front values
    float na = u_isovalue_spacing_inv * (scaled_emission_back - scaled_rootvalue);
    float nb = u_isovalue_spacing_inv * (scaled_emission - scaled_rootvalue);

    // Find integer level n within [na,nb] or [nb,na]
    float n;
    if (!find_closest_level(n, na, nb, tolerance)) {
        discard;
    }

    // Reconstruct scaled isovalue at level n
    // FIXME: Is it ok that the unit/scale of u_isovalue_spacing is in unit interval deltas?
    float scaled_isovalue = n * u_isovalue_spacing + scaled_rootvalue;
#endif


// Discard isosurfaces out of range
if (scaled_isovalue < 0.0 || scaled_isovalue > 1.0) {
    discard;
}


// Map value
#ifdef ENABLE_EMISSION_LUT
    vec3 C = texture2D(t_emission_lut, vec2(scaled_isovalue, 0.5)).xyz;
#else
    vec3 C = u_emission_color * scaled_isovalue;
#endif


// Apply some shading
#ifdef ENABLE_SURFACE_LIGHT
    // Gradient of source function is parallel to the normal of the isosurface
    vec3 surface_normal = normalize(v_emission_gradient);

    // Using abs to ignore which side we see isosurface from
    float cos_V_N = abs(dot(surface_normal, view_direction));

    // Apply shading to emission color
    float k_emit = mix(u_emission_intensity_range.x, u_emission_intensity_range.y, cos_V_N);
    C *= k_emit;
#endif


// Opaque since isosurface is contained in [back, front] unless discarded
float a = 1.0;