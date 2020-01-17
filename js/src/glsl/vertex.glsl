// Vertex shader for the Unray project implementing
// variations of View Independent Cell Projection

// Added by three.js:
// precision highp float;
// precision highp int;
// precision highp sampler2D;
// precision highp usampler2D;

// Using webpack-glsl-loader to copy in shared code
@import ./utils/transpose;
@import ./utils/inverse;
@import ./utils/getitem;
@import ./utils/minmax;
@import ./utils/uv;
@import ./utils/grad;
@import ./utils/place;

/*
For uniforms added by three.js, see
https://threejs.org/docs/index.html#api/renderers/webgl/WebGLProgram
*/

// Variables for log depth buffer
@import ./logbufdepth_pars_fragment;

// Add defines based on internal dependencies
@import ./dependencies;

// Share uniforms between fragment and vertex shader (affected by defines!)
@import ./uniforms;


// Vertex attributes (per local vertices 0-4 on tetrahedron instance)
attribute vec4 a_local_vertices;                 // webgl2 required for ivec4 attributes and gl_VertexID
attribute vec4 a_barycentric_coordinates;


// Instance attributes (per tetrahedron instance)
#ifdef ENABLE_CELL_ORDERING
    // Index of the cell currently processed, used to look up
    // vertex indices and other per-cell data looked up in textures
    attribute float c_ordering;                      // webgl2 required for int attributes and gl_InstanceID
#else
    // If cells are unordered per-cell data can be passed as instance attributes

    // Vertex indices for this cell
    attribute vec4 c_cells;                          // webgl2 required for ivec4 attributes
    #ifdef ENABLE_CELL_INDICATORS
        // Cell indicator value for this cell
        attribute float c_cell_indicators;           // webgl2 required for int attributes
    #endif
#endif


// Share varyings between fragment and vertex shader (affected by defines!)
@import ./varyings;


void main()
{
    // Local to local mapping 0-3 -> 0-3
    ivec4 local_vertices = ivec4(a_local_vertices);

    // Replacement for gl_VertexID, the local vertex
    // 0...3 on the current tetrahedron instance
    int local_vertex_id = local_vertices[0];


#ifdef ENABLE_BARYCENTRIC_COORDINATES
    // Interpolate barycentric coordinate on local tetrahedron over faces
    v_barycentric_coordinates = a_barycentric_coordinates;
#endif


#ifdef ENABLE_CELL_UV
    // Index of the current tetrahedron instance
    // to be used for cell data lookup.
    int cell_index = int(c_ordering);

    // In webGL2, _if_ no cell ordering is necessary, the
    // c_ordering array can be dropped in place of this:
    // int cell_index = gl_InstanceID;

    // Map cell index to texture location
    vec2 cell_uv = index_to_uv(cell_index, u_cell_texture_shape);
#endif


#ifdef ENABLE_CELL_INDICATORS
@import ./vertex-cell-indicators;
#endif


#ifdef ENABLE_CELL_ORDERING
    // Using computed texture location to lookup cell
    ivec4 cell = ivec4(texture2D(t_cells, cell_uv));
#else
    // Using cell from per-instance buffer
    ivec4 cell = ivec4(c_cells);
#endif


#ifdef ENABLE_ALL_VERTEX_UV
    // Map all vertex indices to texture locations for vertex data lookup
    vec2 vertex_uv[4];
    for (int i = 0; i < 4; ++i) {
        vertex_uv[i] = index_to_uv(cell[i], u_vertex_texture_shape);
    }
    // Get vertex texture location for the current vertex
    vec2 this_vertex_uv = getitem(vertex_uv, local_vertex_id);
#else
    // Global index of the current vertex
    int global_vertex_id = getitem(cell, local_vertex_id);
    // Get vertex texture location for the current vertex
    vec2 this_vertex_uv = index_to_uv(global_vertex_id, u_vertex_texture_shape);
#endif


#ifdef ENABLE_ALL_COORDINATES
    // Get coordinates of all tetrahedron vertices
    vec3 coordinates[4];
    for (int i = 0; i < 4; ++i) {
        coordinates[i] = texture2D(t_coordinates, vertex_uv[i]).xyz;
    }
    // Extract the coordinate of the current vertex
    v_model_position = getitem(coordinates, local_vertex_id);
#else
    // Get just the coordinate of the current vertex
    v_model_position = texture2D(t_coordinates, this_vertex_uv).xyz;
#endif


#ifdef ENABLE_EDGES
    // Precompute 5 of the 6 unique edges for reuse
    // in normal and edge length computations
    vec3 edge[5];
    edge[0] = coordinates[2] - coordinates[1];
    edge[1] = coordinates[3] - coordinates[0];
    edge[2] = coordinates[1] - coordinates[0];
    edge[3] = coordinates[2] - coordinates[0];
    edge[4] = coordinates[3] - coordinates[1];
#endif


#ifdef ENABLE_JACOBIAN_INVERSE
    // Compute 3x3 Jacobian matrix of the coordinate
    // field on a tetrahedron with given vertices,
    // assuming a certain reference coordinate system.
    mat3 Jinv = inverse(transpose(mat3(edge[2], edge[3], edge[1])));
#endif

#ifdef ENABLE_PLANES
@import ./vertex-planes;
#endif

#ifdef ENABLE_DEPTH
@import ./vertex-depth;
#endif

#ifdef ENABLE_DENSITY_FIELD
@import ./vertex-density;
#endif

#ifdef ENABLE_EMISSION_FIELD
@import ./vertex-emission;
#endif

#ifdef ENABLE_ISOSURFACE_MODEL
@import ./vertex-isosurface;
#endif

    // Map model coordinate to clip space
    gl_Position = u_mvp_matrix * vec4(v_model_position, 1.0);

    // Adjustment for log depth buffer
@import ./logbufdepth_vertex;
}
