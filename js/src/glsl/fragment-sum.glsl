// Check config
#if !defined(ENABLE_EMISSION)
#error Volume model requires emission
#endif

// Compute emission color
#if defined(ENABLE_EMISSION_BACK)
// Take average over ray segment
vec3 C_emit = mix(mapped_emission, mapped_emission_back, 0.5);
#elif defined(ENABLE_EMISSION)
// Constant or P0 field
vec3 C_emit = mapped_emission;
#elif defined(ENABLE_DENSITY_BACK)
fixme; // TODO: Currently unreachable. Ok?
vec3 C_emit = u_emission_color * mix(mapped_density, mapped_density_back, 0.5); // CHECKME
#elif defined(ENABLE_DENSITY)
fixme; // TODO: Currently unreachable. Ok?
vec3 C_emit = u_emission_color * mapped_density; // CHECKME
#endif

// Scale emitted color by depth and exposure level
vec3 C = (u_exposure * depth) * C_emit;

// Opacity is unused for this mode
float a = 1.0;
