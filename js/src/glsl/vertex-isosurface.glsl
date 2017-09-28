#if 0
    // FIXME: Make this work, also move this and computation of
    // emission[] and density[] above coordinates because we
    // don't need those if we discard the cell

    // FIXME: This should be sufficient as the single isovalue version:
    vec4 values = emission;
    vec4 values = density;
    if (all(lt(values, u_isovalue)) || all(gt(values, u_isovalue))) {
        // This creates degenerate triangles outside the screen,
        // such that no fragment shaders need to run for this cell
        gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
        return;
    }

    // FIXME: A bit more tricky for multiple surfaces:
    // Check if all vertex values are inside the same isovalue
    // interval or on the same side of a single isovalue, and
    // if so discard the cell and stop processing (same for all vertices)
    vec4 isolevels;

    // FIXME: Implement this, refactor fragment shader pieces into functions to reuse here
    //isolevels[i] = level n computed from emission[i] or density[i]; depending on linear or log scale

    // FIXME: Validate this code
    vec3 isolevel_dist = floor(isolevels.xyz) - floor(isolevels.w);
    if (all(lt(isolevel_dist, 1.0)) && all(ge(isolevel_dist, 0.0))) {
        // This creates degenerate triangles outside the screen,
        // such that no fragment shaders need to run for this cell
        gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
        return;
    }
#endif