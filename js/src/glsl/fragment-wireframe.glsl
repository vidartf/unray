// Shade edges of triagle to show wireframe.
// This only works for opaque rendering modes.

// Compute a measure of closeness to edge in [0, 1],
// using partial derivatives of barycentric coordinates
// in window space to ensure edge size is large enough
// for far away edges.
vec4 edge_closeness = smoothstep(
    vec4(0.0),
    max(bc_width, u_wireframe_size), // vec4 in [0,1]
    v_barycentric_coordinates  // vec4 in [0,1]
    );
// Note that edge_closeness[i] -> 0 when closer to face i,
// which means that on the edge between two faces i,j
// we get edge_closeness[i] and edge_closeness[j] almost zero.

// Pick the two smallest edge closeness values and square them
vec4 sorted_edge_closeness = sorted(edge_closeness);
float edge_dist2 = sorted_edge_closeness[0]*sorted_edge_closeness[0]
                    + sorted_edge_closeness[1]*sorted_edge_closeness[1];
// Note that edge_dist2 goes to 0 when getting close to any edge.

// Compute opacity of edge shading at this fragment
float edge_opacity = u_wireframe_alpha * (1.0 - edge_dist2);

// Mix edge color into background
C = mix(C, u_wireframe_color, edge_opacity);