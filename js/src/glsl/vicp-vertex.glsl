// Vertex shader for the Unray project implementing
// variations of View Independent Cell Projection


// precision highp float;
// precision highp int;
// precision highp sampler2D;
// precision highp usampler2D;


// Using webpack-glsl-loader to copy in shared code
@import ./utils/inverse;
@import ./utils/getitem;
@import ./utils/minmax;
@import ./vicp-lib;


/* Uniforms added by three.js, see
https://threejs.org/docs/index.html#api/renderers/webgl/WebGLProgram

// = object.matrixWorld
uniform mat4 modelMatrix;

// = camera.matrixWorldInverse * object.matrixWorld
uniform mat4 modelViewMatrix;

// = camera.projectionMatrix
uniform mat4 projectionMatrix;

// = camera.matrixWorldInverse
uniform mat4 viewMatrix;

// = inverse transpose of modelViewMatrix
uniform mat3 normalMatrix;

// = camera position in world space
uniform vec3 cameraPosition;
*/


// Crude dependency graph for ENABLE_FOO code blocks.
// It's useful to share this between the vertex and fragment shader,
// so if something needs to be toggled separately in those there
// needs to be separate define names.

#ifdef ENABLE_XRAY_MODEL
#define ENABLE_DEPTH 1
#endif

#ifdef ENABLE_SURFACE_MODEL
#define ENABLE_BARYCENTRIC_COORDINATES 1
#endif

#ifdef ENABLE_SURFACE_DEPTH_MODEL
#define ENABLE_DEPTH 1
#endif

#ifdef ENABLE_CELL_ORDERING
#define ENABLE_CELL_UV 1
#endif

#ifdef ENABLE_PERSPECTIVE_PROJECTION
#define ENABLE_COORDINATES 1
#endif

#ifdef ENABLE_EMISSION_BACK
#define ENABLE_EMISSION 1
#define ENABLE_DEPTH 1
#define ENABLE_JACOBIAN_INVERSE 1
#define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_DENSITY_BACK
#define ENABLE_DENSITY 1
#define ENABLE_DEPTH 1
#define ENABLE_JACOBIAN_INVERSE 1
#define ENABLE_VIEW_DIRECTION 1
#endif

#ifdef ENABLE_DEPTH
#define ENABLE_COORDINATES 1
#define ENABLE_BARYCENTRIC_COORDINATES 1
#endif

#ifdef ENABLE_DENSITY
#define ENABLE_VERTEX_UV 1
#endif

#ifdef ENABLE_EMISSION
#define ENABLE_VERTEX_UV 1
#endif

#ifdef ENABLE_JACOBIAN_INVERSE
#define ENABLE_COORDINATES 1
#endif

#ifdef ENABLE_COORDINATES
#define ENABLE_VERTEX_UV 1
#endif


// Time uniforms
// uniform float u_time;
// uniform vec4 u_oscillators;

// Custom camera uniforms
uniform vec3 u_view_direction;


// Input data uniforms

#ifdef ENABLE_CELL_INDICATORS
uniform int u_cell_indicator_value;
#endif
#ifdef ENABLE_DENSITY
uniform vec4 u_density_range;
#endif
#ifdef ENABLE_EMISSION
uniform vec4 u_emission_range;
#endif


// Texture property uniforms
#ifdef ENABLE_CELL_UV
uniform ivec2 u_cell_texture_shape;
#endif
#ifdef ENABLE_VERTEX_UV
uniform ivec2 u_vertex_texture_shape;
#endif


// Cell textures
#ifdef ENABLE_CELL_ORDERING
uniform sampler2D t_cells;
#endif
#ifdef ENABLE_CELL_INDICATORS
uniform sampler2D t_cell_indicators;
#endif

// Vertex textures
uniform sampler2D t_coordinates;
#ifdef ENABLE_DENSITY
uniform sampler2D t_density;
uniform sampler2D t_density_lut;
#endif
#ifdef ENABLE_EMISSION
uniform sampler2D t_emission;
uniform sampler2D t_emission_lut;
#endif


// Vertex attributes (local vertices 0-4 on tetrahedron)
attribute vec4 a_local_vertices;                 // webgl2 required for ivec4 attributes and gl_VertexID
attribute vec4 a_barycentric_coordinates;

// Cell attributes
#ifdef ENABLE_CELL_ORDERING
attribute float c_ordering;                      // webgl2 required for int attributes and gl_InstanceID
#else
attribute vec4 c_cells;                          // webgl2 required for ivec4 attributes
#endif
#ifdef ENABLE_CELL_INDICATORS
attribute float c_cell_indicators;               // webgl2 required for int attributes
#endif


// Varyings
// Note: Not position of the model but vertex coordinate in model space
varying vec3 v_model_position;

#ifdef ENABLE_BARYCENTRIC_COORDINATES
varying vec4 v_barycentric_coordinates;
#endif

// #ifdef ENABLE_CELL_INDICATORS
// varying float v_cell_indicator;           // want int or bool, webgl2 required for flat keyword
// #endif

#ifdef ENABLE_DEPTH
varying float v_max_depth;               // webgl2 required for flat keyword
varying vec4 v_facing;                   // webgl2 required for flat keyword
#ifdef ENABLE_PERSPECTIVE_PROJECTION
varying mat4 v_planes;                   // webgl2 required for flat keyword
#else
varying vec4 v_ray_lengths;
#endif
#endif


// TODO: Can pack density and density_gradient in one vec4 since they're interpolated anyway
#ifdef ENABLE_DENSITY
varying float v_density;
#endif
#ifdef ENABLE_DENSITY_BACK
varying vec3 v_density_gradient;         // webgl2 required for flat keyword
#endif

#ifdef ENABLE_EMISSION
varying float v_emission;
#endif
#ifdef ENABLE_EMISSION_BACK
varying vec3 v_emission_gradient;        // webgl2 required for flat keyword
#endif

void main()
{
    // Local to local mapping 0-3 -> 0-3
    ivec4 local_vertices = ivec4(a_local_vertices);

    // Replacement for gl_VertexID, the local vertex
    // 0...3 on the current tetrahedron instance
    int local_vertex_id = local_vertices[0];


#ifdef ENABLE_BARYCENTRIC_COORDINATES
    // Interpolate barycentric coordinate on local tetrahedron over fragment
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


#ifdef ENABLE_VERTEX_UV
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


#ifdef ENABLE_COORDINATES
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

#ifdef ENABLE_JACOBIAN_INVERSE
    // Compute 3x3 Jacobian matrix of the coordinate
    // field on a tetrahedron with given vertices,
    // assuming a certain reference coordinate system.
    mat3 Jinv = compute_Jinv(coordinates);
#endif


#ifdef ENABLE_DENSITY_BACK
    vec4 density;
    for (int i = 0; i < 4; ++i) {
        density[i] = texture2D(t_density, vertex_uv[i]).a;
    }
    v_density = getitem(density, local_vertex_id);
    v_density_gradient = compute_gradient(Jinv, density);
#elif defined(ENABLE_DENSITY)
    v_density = texture2D(t_density, this_vertex_uv).a;
#endif


#ifdef ENABLE_EMISSION_BACK
    vec4 emission;
    for (int i = 0; i < 4; ++i) {
        emission[i] = texture2D(t_emission, vertex_uv[i]).a;
    }
    v_emission = getitem(emission, local_vertex_id);
    v_emission_gradient = compute_gradient(Jinv, emission);
#elif defined(ENABLE_EMISSION)
    v_emission = texture2D(t_emission, this_vertex_uv).a;
#endif


#ifdef ENABLE_DEPTH
    // Compute upper bound on depth of cell
    float edge_lengths[6];
    edge_lengths[0] = distance(coordinates[0], coordinates[1]);
    edge_lengths[1] = distance(coordinates[0], coordinates[2]);
    edge_lengths[2] = distance(coordinates[0], coordinates[3]);
    edge_lengths[3] = distance(coordinates[1], coordinates[2]);
    edge_lengths[4] = distance(coordinates[1], coordinates[3]);
    edge_lengths[5] = distance(coordinates[2], coordinates[3]);
    v_max_depth = max(
        max(edge_lengths[0], edge_lengths[1]),
        max(max(edge_lengths[2], edge_lengths[3]),
            max(edge_lengths[4], edge_lengths[5]))
    );

    // This didn't quite work out, revisit for bugs if optimization seems worthwhile:
    // vec4 depth_bounds;
    // for (int i = 0; i < 4; ++i) {
    //     depth_bounds[i] = distance(coordinates[i], cameraPosition);
    // }
    // float max_dist = maxv(depth_bounds);
    // float min_dist = minv(depth_bounds);
    // v_max_depth = sqrt(max_dist*max_dist - min_dist*min_dist);
#endif


#ifdef ENABLE_DEPTH
#ifdef ENABLE_PERSPECTIVE_PROJECTION
    // TODO: v_planes can be precomputed
    // Note: This can be done in a separate preprocessing step,
    // computing v_planes once for each cell and storing it as
    // a cell texture or instanced buffer attribute.
    // With webgl2 it could be done using vertex transform feedbacks.
    // This will require 4*4*4=64 bytes per cell for v_planes alone.

    // Ccw oriented faces, consistent independent
    // of which vertex shader we're in
    ivec3 faces[4];
    faces[0] = ivec3(1, 2, 3);
    faces[1] = ivec3(0, 3, 2);
    faces[2] = ivec3(0, 1, 3);
    faces[3] = ivec3(0, 2, 1);

    for (int i = 0; i < 4; ++i) {
        // Get vertex coordinates ordered relative to vertex i
        // vec3 x[4] = reorder(coordinates, faces[i]);  // TODO: Possibly easier for compiler to optimize something like this
        vec3 x0 = coordinates[i];
        vec3 x1 = getitem(coordinates, faces[i][0]);
        vec3 x2 = getitem(coordinates, faces[i][1]);
        vec3 x3 = getitem(coordinates, faces[i][2]);

        // Compute the normal vector of the tetrahedon face opposing vertex i
        vec3 edge_a = x2 - x1;
        vec3 edge_b = x3 - x1;
        vec3 n = normalize(cross(edge_a, edge_b));

        // Store normal vector and plane equation coefficient for this face
        // (plane equation coefficient is the distance from face to origo along n)
        v_planes[i] = vec4(n, dot(n, x1));


        // Attempt to handle orthogonal faces robustly.
        // If a face becomes positive on one vertex and negative on another,
        // that can be a problem, as this value will be interpolated
        // across the face (webgl version 1 has no flat interpolation).

        // So for robustness, we err on the +1 side (frontface)
        // and shift the distance by a small number.
        // This means almost orthogonal backfaces are likely to become
        // frontfaces and have their depths ignored.
        // TODO: Make tolerance runtime configurable for testing

        // Compute cos of angle between face normal and direction to camera
        float cos_angle = dot(n, normalize(cameraPosition - x1));

#define ENABLE_FACING_IS_COS_ANGLE 1
#if ENABLE_FACING_IS_COS_ANGLE
        // Pass on cos_angle and move the classification to the
        // fragment shader where we can use barycentric coordinate
        // derivatives to adjust tolerance in screen space
        v_facing[i] = cos_angle;
#else
        float dist = cos_angle;

        // NB! ||vertex_to_camera|| >= near plane distance
        // cos_angle = -1 if face_to_camera_distance == -||vertex_to_camera||
        // cos_angle = 0 if face_to_camera_distance == 0
        // cos_angle = 1 if face_to_camera_distance == ||vertex_to_camera||
        // face_to_camera_distance = ||vertex_to_camera||  ||n||  cos(theta)

        // Store +1 for front facing, -1 for back facing (and 0 for the rest)
        // Rays always enter through front faces and exit through back faces.
        // float eps = 1e-8;
        // if (cos_angle > eps) {
        //     v_facing[i] = +1.0;
        // } else if (cos_angle < -eps) {
        //     v_facing[i] = -1.0;
        // } else {
        //     v_facing[i] = 0.0;
        // }

        // Classify tiny slivers as front facing,
        // to be ignored in depth computations.
        // Increasing eps will lead to larger edge artifacts.
        // uniform float u_front_facing_eps;
        // uniform float u_back_facing_eps;
        float eps = 1e-6;  // TODO: Make this a uniform to control from notebook
        if (cos_angle > -eps) {
            v_facing[i] = +1.0;
        } else if (cos_angle < eps) {
            v_facing[i] = -1.0;
        } else {
            v_facing[i] = 0.0;
        }
#endif
    }

#else
    // FIXME: This doesn't set v_facing and hasn't been tested
    // in a little while. To set v_facing, normals on all faces are needed?

    vec3 view_direction = u_view_direction;

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
#endif


    // TODO: Get this as a uniform
    mat4 MVP = projectionMatrix * modelViewMatrix;

    // Map model coordinate to clip space
    gl_Position = MVP * vec4(v_model_position, 1.0);
}
