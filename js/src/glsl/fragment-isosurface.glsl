#line 1000

// Config check
#if !(defined(ENABLE_EMISSION_BACK) || defined(ENABLE_DENSITY_BACK))
#error Isosurface needs front and back values
#endif


// Select values from emission or density field
// TODO: If both are present, use density for isovalue selection
//       and corresponding emission for coloring
#if defined(ENABLE_DENSITY_BACK)
float front = v_density;
float back = density_back;
vec4 value_range = u_density_range;
#elif defined(ENABLE_EMISSION_BACK)
float front = v_emission;
float back = emission_back;
vec4 value_range = u_emission_range;
#endif

// Magically chosen tolerance for avoiding edge artifacts on isosurfaces
// FIXME: This used clamp incorrectly, check again how this behaves...
float tolerance = mix(0.001, 0.05, clamp(maxv(bc_width), 0.0, 1.0));
//float tolerance = mix(0.0001, 0.03, clamp(midv(bc_width), 0.0, 1.0));
//float tolerance = 0.03;  // TODO: Make this a uniform

#if defined(USING_ISOSURFACE_MODE_SINGLE)
// Single surface variant, check if value is outside range of ray
float value = u_isovalue;
if (is_outside_interval(value, back, front, tolerance)) {
    discard;
}
#elif defined(USING_ISOSURFACE_MODE_SWEEP)
// Single surface variant, check if value is outside range of ray
float value = mix(value_range.x, value_range.y, fract(u_time / u_isovalue_sweep_period));
if (is_outside_interval(value, back, front, tolerance)) {
    discard;
}
#elif defined(USING_ISOSURFACE_MODE_LINEAR)
// Multiple surfaces spaced with fixed distance
float value;
if (!find_isovalue_linear_spacing(value, back, front, u_isovalue, u_isovalue_spacing, tolerance)) {
    discard;
}
#elif defined(USING_ISOSURFACE_MODE_LOG)
// Multiple surfaces spaced with fixed ratio
float value;
if (!find_isovalue_log_spacing(value, back, front, u_isovalue, u_isovalue_spacing, tolerance)) {
    discard;
}
#elif defined(USING_ISOSURFACE_MODE_POWER)
// FIXME: Implement find_isovalue_power_spacing
// Multiple surfaces spaced with fixed ratio
float value;
if (!find_isovalue_power_spacing(value, back, front, u_isovalue, u_isovalue_spacing, tolerance)) {
    discard;
}
#else
#error Missing valid USING_ISOSURFACE_* define
#endif


// Map value through color lut
float scaled_value = (value - value_range.x) * value_range.w;
#if defined(ENABLE_EMISSION_BACK)
#ifdef ENABLE_EMISSION_LUT
vec3 C = texture2D(t_emission_lut, vec2(scaled_value, 0.5)).xyz; // CHECKME
#else
vec3 C = u_emission_color * scaled_value; // CHECKME
#endif
#elif defined(ENABLE_DENSITY_BACK)
#ifdef ENABLE_DENSITY_LUT
float C = u_emission_color * texture2D(t_density_lut, vec2(scaled_value, 0.5)).a;
#else
float C = u_emission_color * scaled_value;
#endif
#endif


// Apply some shading
#if defined(ENABLE_SURFACE_LIGHT) && (defined(ENABLE_EMISSION) || defined(ENABLE_DENSITY))
// Gradient of source function is parallel to the normal of the isosurface
#if defined(ENABLE_EMISSION)
vec3 surface_normal = normalize(v_emission_gradient);
#elif defined(ENABLE_DENSITY)
vec3 surface_normal = normalize(v_density_gradient);
#endif
// Using abs to ignore which side we see isosurface from
float cos_V_N = abs(dot(surface_normal, view_direction));

// Apply shading to emission color
float k_emit = mix(u_emission_intensity_range.x, u_emission_intensity_range.y, cos_V_N);
C *= k_emit;
#endif

// Opaque since isosurface is contained in [back, front] unless discarded
float a = 1.0;