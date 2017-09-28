#ifdef ENABLE_DENSITY_GRADIENT
    // Fetch value of field for all four vertices
    vec4 density;
    for (int i = 0; i < 4; ++i) {
        density[i] = texture2D(t_density, vertex_uv[i]).a;
    }
    // Pick the one for the current vertex
    v_density = getitem(density, local_vertex_id);
    // Compute gradient (constant on cell)
    v_density_gradient = compute_gradient(Jinv, density);
#else
    // Fetch value for the current vertex only
    v_density = texture2D(t_density, this_vertex_uv).a;
#endif