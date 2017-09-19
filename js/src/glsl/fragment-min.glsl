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
vec3 C = u_emission_color * min(mapped_density, mapped_density_back);  // CHECKME
#elif defined(ENABLE_DENSITY)
vec3 C = u_emission_color * mapped_density;  // CHECKME
#else
compile_error();  // Max model needs emission or density
#endif

// Opacity is unused for this mode
float a = 1.0;