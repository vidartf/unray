// Copied from THREE.js logbufdepth_pars_fragment.glsl
#ifdef USE_LOGDEPTHBUF
	uniform float logDepthBufFC;
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
	#endif
    // Definition from three.js common.glsl
    #define EPSILON 1e-6
#endif