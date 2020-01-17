// Check config
#ifndef ENABLE_DENSITY
#error Volume model requires density
#endif
#ifndef ENABLE_EMISSION
#error Volume model requires emission
#endif


//#if defined(ENABLE_DENSITY_BACK) && defined(ENABLE_EMISSION_BACK)
// TODO: Implement Moreland partial pre-integration

#if defined(ENABLE_DENSITY_BACK)
// TODO: Currently only using average density, more accurate options exist.
float rho = mix(mapped_density, mapped_density_back, 0.5); // CHECKME
#else
float rho = mapped_density; // CHECKME
#endif


#if defined(ENABLE_EMISSION_BACK)
// TODO: Currently only using average color, more accurate options exist.
vec3 L = mix(mapped_emission, mapped_emission_back, 0.5); // CHECKME
#else
vec3 L = mapped_emission; // CHECKME
#endif


// Evaluate ray integral, use in combination
// with blend equation: RGB_src * A_dst + RGB_dst
float a = 1.0 - exp(-depth * u_extinction * rho); // CHECKME

// TODO: Should exposure be a factor of opacity "a" or multiplied here:?
vec3 C = (u_exposure * a) *L;