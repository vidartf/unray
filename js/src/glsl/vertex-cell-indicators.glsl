// FIXME: Work in progress, this was a varying but currently is not
float v_cell_indicator;

#ifdef ENABLE_CELL_ORDERING
// Using computed texture location to lookup cell
v_cell_indicator = texture2D(t_cell_indicators, cell_uv).a;
#else
// Using cell from per-instance buffer
v_cell_indicator = c_cell_indicators;
#endif

// Safely cast to float (probably don't need the +0.5 here, it was
// needed in fragment shader because of interpolation rounding errors)
int cell_indicator = int(v_cell_indicator + 0.5);

// TODO: Use texture lookup with nearest interpolation to get
// color and discard-or-not (a=0|1) for a range of indicator values.
// "Discard" here to avoid running fragment shaders, or output the
// color as a varying to avoid repeating texture lookups in the
// fragment shader.
if (cell_indicator != u_cell_indicator_value) {
    // This creates degenerate triangles outside the screen,
    // such that no fragment shaders need to run for this cell
    gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
    return;
}