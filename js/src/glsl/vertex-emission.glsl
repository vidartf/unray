#ifdef ENABLE_EMISSION_GRADIENT
    // Fetch value of field for all four vertices
    vec4 emission;
    for (int i = 0; i < 4; ++i) {
        emission[i] = texture2D(t_emission, vertex_uv[i]).a;
    }
    // Pick the one for the current vertex
    v_emission = getitem(emission, local_vertex_id);
    // Compute gradient (constant on cell)
    v_emission_gradient = compute_gradient(Jinv, emission);
#else
    // Fetch value for the current vertex only
    v_emission = texture2D(t_emission, this_vertex_uv).a;
#endif