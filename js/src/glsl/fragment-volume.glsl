//#if defined(ENABLE_DENSITY_BACK) && defined(ENABLE_EMISSION_BACK)
// TODO: Implement Moreland partial pre-integration

#if defined(ENABLE_DENSITY_BACK)
// TODO: Currently only using average density, more accurate options exist.
float rho = mix(mapped_density, mapped_density_back, 0.5); // CHECKME
#elif defined(ENABLE_DENSITY)
float rho = mapped_density; // CHECKME
#else
compile_error();  // Volume model requires density
#endif

#if defined(ENABLE_EMISSION_BACK)
// TODO: Currently only using average color, more accurate options exist.
vec3 L = mix(mapped_emission, mapped_emission_back, 0.5); // CHECKME
#elif defined(ENABLE_EMISSION)
vec3 L = mapped_emission; // CHECKME
#else
compile_error();  // Volume model requires emission
#endif

// Evaluate ray integral, use in combination
// with blend equation: RGB_src * A_dst + RGB_dst
float a = 1.0 - exp(-depth * u_extinction * rho); // CHECKME
vec3 C = a * L;