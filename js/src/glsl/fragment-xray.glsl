// Configuration checks
#if defined(ENABLE_EMISSION)
#error Xray model does not accept emission.
#endif

#if !defined(ENABLE_DENSITY)
#error Xray model requires density.
#endif


// Compute density
#if defined(ENABLE_DENSITY_BACK)
// This is exact assuming rho linear along a ray segment
float rho = mix(mapped_density, mapped_density_back, 0.5);
#elif defined(ENABLE_DENSITY_FIELD)
// This is exact for rho constant along a ray segment
float rho = mapped_density;
#else
// Given global constant
float rho = mapped_density;
#endif

// Compute opacity
float a = 1.0 - exp(-depth * u_extinction * rho);

// Color must be zero for no emission to occur, i.e. all
// color comes from the background and is attenuated by 1-a.
vec3 C = vec3(0.0);

// TODO: Alternate blend equation:
// C = a * u_xray_color_filter;
// Cdst = Csrc * Cdst + 0 * Csrc;