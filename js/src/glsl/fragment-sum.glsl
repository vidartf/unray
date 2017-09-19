// Evaluate ray integral, use in combination
// with blend equation: RGB_src + RGB_dst
float scale = u_exposure * depth;
#if defined(ENABLE_EMISSION_BACK)
vec3 C = scale * mix(mapped_emission, mapped_emission_back, 0.5); // CHECKME
#elif defined(ENABLE_EMISSION)
vec3 C = scale * mapped_emission; // CHECKME
#elif defined(ENABLE_DENSITY_BACK)
vec3 C = u_emission_color * (scale * mix(mapped_density, mapped_density_back, 0.5)); // CHECKME
#elif defined(ENABLE_DENSITY)
vec3 C = u_emission_color * (scale * mapped_density); // CHECKME
#else
compile_error();  // Volume model requires emission
#endif

// Opacity is unused for this mode
float a = 1.0;