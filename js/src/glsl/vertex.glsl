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
    // Work in progress, this was a varying but currently is not
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


#ifdef ENABLE_DEPTH
    // Compute max length of all 6 unique edges
    v_max_depth = length(coordinates[3] - coordinates[2]);
    for (int i = 0; i < 6; ++i) {
        v_max_depth = max(v_max_depth, length(edge[i]));
    }
#endif


#ifdef ENABLE_DENSITY_GRADIENT
    vec4 density;
    for (int i = 0; i < 4; ++i) {
        density[i] = texture2D(t_density, vertex_uv[i]).a;
    }
    v_density = getitem(density, local_vertex_id);
    v_density_gradient = compute_gradient(Jinv, density);
#elif defined(ENABLE_DENSITY_FIELD)
    v_density = texture2D(t_density, this_vertex_uv).a;
#endif


#ifdef ENABLE_EMISSION_GRADIENT
    vec4 emission;
    for (int i = 0; i < 4; ++i) {
        emission[i] = texture2D(t_emission, vertex_uv[i]).a;
    }
    v_emission = getitem(emission, local_vertex_id);
    v_emission_gradient = compute_gradient(Jinv, emission);
#elif defined(ENABLE_EMISSION_FIELD)
    v_emission = texture2D(t_emission, this_vertex_uv).a;
#endif


#if 0
#ifdef ENABLE_ISOSURFACE_MODEL
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
#endif


#if defined(ENABLE_PLANES)
    // TODO: v_planes can be precomputed
    // Note: This can be done in a separate preprocessing step,
    // computing v_planes once for each cell and storing it as
    // a cell texture or instanced buffer attribute.
    // With webgl2 it could be done using vertex transform feedbacks.
    // This will require 4*4*4=64 bytes per cell for v_planes alone.

    // Ccw oriented faces, consistent independent
    // of which vertex shader we're in
    // ivec3 faces[4];
    // faces[0] = ivec3(1, 2, 3);
    // faces[1] = ivec3(0, 3, 2);
    // faces[2] = ivec3(0, 1, 3);
    // faces[3] = ivec3(0, 2, 1);

    // Compute the normal vector of the tetrahedon face opposing vertex i
    // vec3 edge_a = x2 - x1;
    // vec3 edge_b = x3 - x1;
    // vec3 n = normalize(cross(edge_a, edge_b));
#if 0
    v_planes[0].xyz = normalize(cross(edge[0], edge[4]));
    v_planes[1].xyz = normalize(cross(edge[1], edge[3]));
    v_planes[2].xyz = normalize(cross(edge[2], edge[1]));
    v_planes[3].xyz = normalize(cross(edge[3], edge[2]));
#else
    // TODO: Performance test reordering + loop
    vec3 edge2[4];
    edge2[0] = edge[4];
    edge2[1] = edge[3];
    edge2[2] = edge[1];
    edge2[3] = edge[2];
    for (int i = 0; i < 4; ++i) {
        v_planes[i].xyz = normalize(cross(edge[i], edge2[i]));
    }
#endif

    // TODO: Don't need this part for surface normals
    // Store plane equation coefficient for each face
    // (plane equation coefficient is the distance from face to origo along n)
    v_planes[0].w = dot(v_planes[0].xyz, coordinates[1]);
    v_planes[1].w = dot(v_planes[1].xyz, coordinates[0]);
    v_planes[2].w = dot(v_planes[2].xyz, coordinates[0]);
    v_planes[3].w = dot(v_planes[3].xyz, coordinates[0]);

    // Compute cos of angle between face normal and direction to camera
    // vec3 cos_angles;
    // cos_angles[i][j] = dot(normals[i], vertex_to_camera[j]);
#endif


#if defined(ENABLE_DEPTH) && defined(ENABLE_PERSPECTIVE_PROJECTION)
    // Compute direction from each vertex towards camera
    vec3 vertex_to_camera[4];
    vertex_to_camera[0] = normalize(u_local_camera_position - coordinates[0]);
    vertex_to_camera[1] = normalize(u_local_camera_position - coordinates[1]);
    vertex_to_camera[2] = normalize(u_local_camera_position - coordinates[2]);
    vertex_to_camera[3] = normalize(u_local_camera_position - coordinates[3]);


    const float front_facing_eps = 1e-2;
    // bool front_facing;

    // cos_angles[0] = dot(normals[0], vertex_to_camera[1]);
    // cos_angles[1] = dot(normals[0], vertex_to_camera[2]);
    // cos_angles[2] = dot(normals[0], vertex_to_camera[3]);

    // cos_angles[0] = dot(normals[1], vertex_to_camera[0]);
    // cos_angles[1] = dot(normals[1], vertex_to_camera[2]);
    // cos_angles[2] = dot(normals[1], vertex_to_camera[3]);

    // cos_angles[0] = dot(normals[2], vertex_to_camera[0]);
    // cos_angles[1] = dot(normals[2], vertex_to_camera[1]);
    // cos_angles[2] = dot(normals[2], vertex_to_camera[3]);

    // cos_angles[0] = dot(normals[3], vertex_to_camera[0]);
    // cos_angles[1] = dot(normals[3], vertex_to_camera[1]);
    // cos_angles[2] = dot(normals[3], vertex_to_camera[2]);
    // front_facing = any(greaterThanEqual(cos_angles, vec3(-front_facing_eps)));
    // v_facing[i] = front_facing ? +1.0 : -1.0;

    // TODO: Performance testing
#if 1
    for (int i = 0; i < 4; ++i) {
        v_facing[i] = -1.0;
        for (int j = 0; j < 4; ++j) {
            if (j != i && dot(v_planes[i].xyz, vertex_to_camera[j]) >= -front_facing_eps) {
                v_facing[i] = +1.0;
                break;
            }
        }
    }
#elif 0
    bvec4 front_facing[4];
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 4; ++j) {
            front_facing[i][j] = i == j ? false : dot(v_planes[i].xyz, vertex_to_camera[j]) >= -front_facing_eps;
        }
    }
    for (int i = 0; i < 4; ++i) {
        v_facing[i] = any(front_facing[i]) ? +1.0 : -1.0;
    }
#elif 0
    bvec4 front_facing[4];
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 4; ++j) {
            front_facing[i][j] = dot(v_planes[i].xyz, vertex_to_camera[j]) >= -front_facing_eps;
        }
    }
    for (int i = 0; i < 4; ++i) {
        front_facing[i][i] = false;
    }
    for (int i = 0; i < 4; ++i) {
        v_facing[i] = any(front_facing[i]) ? +1.0 : -1.0;
    }
#endif

    // for (int i = 0; i < 4; ++i) {
    //     // Get vertex coordinates ordered relative to vertex i
    //     // vec3 x[4] = reorder(coordinates, faces[i]);  // TODO: Possibly easier for compiler to optimize something like this
    //     vec3 x0 = coordinates[i];
    //     vec3 x1 = getitem(coordinates, faces[i][0]);
    //     vec3 x2 = getitem(coordinates, faces[i][1]);
    //     vec3 x3 = getitem(coordinates, faces[i][2]);

    //     vec3 n = normals[i];

    //     // Compute cos of angle between face normal and direction to camera
    //     vec3 cos_angles = vec3(
    //         dot(n, normalize(cameraPosition - x1)),
    //         dot(n, normalize(cameraPosition - x2)),
    //         dot(n, normalize(cameraPosition - x3))
    //     );

    //     const float front_facing_eps = 1e-2;
    //     bool front_facing = any(greaterThanEqual(cos_angles, vec3(-front_facing_eps)));
    //     v_facing[i] = front_facing ? +1.0 : -1.0;

        // TODO: Clean up comments here, there are some useful messages to keep.

        // Attempt to handle orthogonal faces robustly.
        // If a face becomes positive on one vertex and negative on another,
        // that can be a problem, as this value will be interpolated
        // across the face (webgl version 1 has no flat interpolation).

        // So for robustness, we err on the +1 side (frontface)
        // and shift the distance by a small number.
        // This means almost orthogonal backfaces are likely to become
        // frontfaces and have their depths ignored.
        // TODO: Make tolerance runtime configurable for testing

        // NB! ||vertex_to_camera|| >= near plane distance
        // cos_angle = -1 if face_to_camera_distance == -||vertex_to_camera||
        // cos_angle = 0 if face_to_camera_distance == 0
        // cos_angle = 1 if face_to_camera_distance == ||vertex_to_camera||
        // face_to_camera_distance = ||vertex_to_camera||  ||n||  cos(theta)

        // Store +1 for front facing, -1 for back facing (and 0 for the rest)
        // Rays always enter through front faces and exit through back faces.
        // uniform float u_front_facing_eps;

        // Err on the front facing side, but try to still keep
        // backside slivers as backsides. Ideally this should
        // match the opengl drivers decision to make the face
        // front or back facing...
        // TODO: Reuse vertex_to_camera[] here
        // TODO: Probably a more efficient way exists.
        // TODO: Find specs and see if there are any guarantees we can exploit?

        // Compute cos of angle between face normal and direction to camera
        // float cos_angle = dot(n, normalize(cameraPosition - x1));
    //}
#endif


#if defined(ENABLE_DEPTH) && !defined(ENABLE_PERSPECTIVE_PROJECTION)
    // FIXME: This doesn't set v_facing and hasn't been tested
    // in a little while. To set v_facing, normals on all faces are needed?

    vec3 view_direction = u_local_view_direction;

    // The vertex attribute local_vertices[1..3] is carefully
    // chosen to be ccw winded seen from outside the tetrahedron
    // such that n computed below will point away from local_vertices[0]

    // Get vertex coordinates ordered relative to the current vertex
    // vec3 x[4] = reorder(coordinates, local_vertices);  // TODO: Possibly easier for compiler to optimize something like this
    vec3 x0 = getitem(coordinates, local_vertices[0]);
    vec3 x1 = getitem(coordinates, local_vertices[1]);
    vec3 x2 = getitem(coordinates, local_vertices[2]);
    vec3 x3 = getitem(coordinates, local_vertices[3]);

    // Compute the normal vector of the tetrahedon face opposing this vertex
    vec3 edge_a = x2 - x1;
    vec3 edge_b = x3 - x1;
    vec3 n = normalize(cross(edge_a, edge_b));

    // Compute the distance from the current vertex
    // to its orthogonal projection on the opposing face
    // Note: this is a constant property of the opposing
    // face of this cell, might be possible to exploit that somehow.
    float orthogonal_dist = dot(n, x1 - x0);

    // Compute the distance from this vertex along the
    // view direction to the plane of the opposing face
    float ray_length = orthogonal_dist / dot(n, view_direction);

    // Output ray length of the current vertex as a component of
    // a vec4 with zeros at the other local vertex ids, giving
    // access to all ray lengths interpolated across the rasterized
    // triangle in the fragment shader.
    v_ray_lengths = with_nonzero_at(local_vertex_id, ray_length);
#endif


    // Map model coordinate to clip space
    gl_Position = u_mvp_matrix * vec4(v_model_position, 1.0);

    // Adjustment for log depth buffer
@import ./logbufdepth_vertex;
}