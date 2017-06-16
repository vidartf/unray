// Vertex shader for the Unray project implementing
// variations of View Independent Cell Projection


// precision highp float;
// precision highp int;
// precision highp sampler2D;
// precision highp usampler2D;


// Using webpack-glsl-loader to copy in shared code
@import ./inverse;
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
// uniform vec3 u_constant_color;
// uniform float u_particle_area;
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

#ifdef ENABLE_CELL_INDICATORS
varying float v_cell_indicator;           // want int or bool, webgl2 required for flat keyword
#endif

#ifdef ENABLE_DEPTH
varying float v_max_edge_length;         // webgl2 required for flat keyword
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


#ifdef ENABLE_CELL_ORDERING
    // Using computed texture location to lookup cell
    ivec4 cell = ivec4(texture2D(t_cells, cell_uv));
#else
    // Using cell from per-instance buffer
    ivec4 cell = ivec4(c_cells);
#endif


#ifdef ENABLE_CELL_INDICATORS
#ifdef ENABLE_CELL_ORDERING
    // Using computed texture location to lookup cell
    v_cell_indicator = texture2D(t_cell_indicators, cell_uv).a;
#else
    // Using cell from per-instance buffer
    v_cell_indicator = c_cell_indicators;
#endif
#endif


#ifdef ENABLE_VERTEX_UV
    // Map all vertex indices to texture locations for vertex data lookup
    vec2 vertex_uv[4];
    for (int i = 0; i < 4; ++i) {
        vertex_uv[i] = index_to_uv(cell[i], u_vertex_texture_shape);
    }
    // Get vertex texture location for the current vertex
    vec2 this_vertex_uv = get_at(vertex_uv, local_vertex_id);
#else
    // Global index of the current vertex
    int global_vertex_id = get_at(cell, local_vertex_id);
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
    v_model_position = get_at(coordinates, local_vertex_id);
#else
    // Get just the coordinate of the current vertex
    v_model_position = texture2D(t_coordinates, this_vertex_uv).xyz;
#endif


#ifdef ENABLE_JACOBIAN_INVERSE
    mat3 XD = compute_edge_diff_matrix(coordinates);
    mat3 XDinv = inverse(XD);
#endif


#ifdef ENABLE_DENSITY_BACK
    vec4 density;
    for (int i = 0; i < 4; ++i) {
        density[i] = texture2D(t_density, vertex_uv[i]).a;
    }
    v_density = get_at(density, local_vertex_id);
    v_density_gradient = XDinv * compute_edge_diff_vector(density);
#elif defined(ENABLE_DENSITY)
    v_density = texture2D(t_density, this_vertex_uv).a;
#endif


#ifdef ENABLE_EMISSION_BACK
    vec4 emission;
    for (int i = 0; i < 4; ++i) {
        emission[i] = texture2D(t_emission, vertex_uv[i]).a;
    }
    v_emission = get_at(emission, local_vertex_id);
    v_emission_gradient = XDinv * compute_edge_diff_vector(emission);
#elif defined(ENABLE_EMISSION)
    v_emission = texture2D(t_emission, this_vertex_uv).a;
#endif



#ifdef ENABLE_DEPTH
    // Compute longest edge on cell
    // TODO: Can be speed up considerably
    // TODO: v_max_edge_length can be precomputed
    float max_edge_length = 0.0;
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 4; ++j) {
            max_edge_length = max(max_edge_length, distance(coordinates[i], coordinates[j]));
        }
    }
    v_max_edge_length = max_edge_length;
#ifdef ENABLE_PERSPECTIVE_PROJECTION
    // TODO: v_planes can be precomputed
    // Note: This can be done in a separate preprocessing step,
    // computing v_planes once for each cell and storing it as
    // a cell texture or instanced buffer attribute.
    // With webgl2 it could be done using vertex transform feedbacks.

    // Ccw oriented faces
    ivec3 faces[4];
    faces[0] = ivec3(1, 2, 3);
    faces[1] = ivec3(0, 3, 2);
    faces[2] = ivec3(0, 1, 3);
    faces[3] = ivec3(0, 2, 1);

    for (int i = 0; i < 4; ++i) {
        // Get vertex coordinates ordered relative to vertex i
        vec3 x0 = coordinates[i];
        vec3 x1 = get_at(coordinates, faces[i][0]);
        vec3 x2 = get_at(coordinates, faces[i][1]);
        vec3 x3 = get_at(coordinates, faces[i][2]);

        // Compute the normal vector of the tetrahedon face opposing vertex i
        vec3 edge_a = x2 - x1;
        vec3 edge_b = x3 - x1;
        vec3 n = normalize(cross(edge_a, edge_b));

        // Store normal vector and plane equation coefficient for this face
        v_planes[i] = vec4(n, dot(n, x1));
    }
#else
    vec3 view_direction = u_view_direction;

    // The vertex attribute local_vertices[1..3] is carefully
    // chosen to be ccw winded seen from outside the tetrahedron
    // such that n computed below will point away from local_vertices[0]

    // Get vertex coordinates ordered relative to the current vertex
    vec3 x0 = get_at(coordinates, local_vertices[0]);
    vec3 x1 = get_at(coordinates, local_vertices[1]);
    vec3 x2 = get_at(coordinates, local_vertices[2]);
    vec3 x3 = get_at(coordinates, local_vertices[3]);

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

    // TODO: Figure out if we can do perspective correct
    // interpolation of ray lengths somehow, this approach
    // is only correct for orthographic projection
#endif
#endif


    // TODO: Get this as a uniform
    mat4 MVP = projectionMatrix * modelViewMatrix;

    // Map model coordinate to clip space
    gl_Position = MVP * vec4(v_model_position, 1.0);

    // TODO: Is this necessary or us perspective correct interpolation default in webgl?
    // Adjust coordinate for perspective correct interpolation
// #ifdef ENABLE_PERSPECTIVE_PROJECTION
//     v_model_position /= gl_Position.w;
// #endif

    // Debugging: Ignore camera to check v_model_position
    // gl_Position = vec4(v_model_position, 1.0);

    // Debugging: Check that this_vertex_uv varies within [0,1]^2    
    // gl_Position = vec4(this_vertex_uv, 0.0, 1.0);

    // Debugging: Check that this_vertex_uv varies within [0,1]^2    
    // gl_Position = vec4(2.0*this_vertex_uv - vec2(1.0), 0.0, 1.0);

    // Debugging: Check that local_vertex_id varies 0...3
    // gl_Position = vec4(
    //     local_vertex_id == 1 ? 1.0 : 0.0,
    //     local_vertex_id == 2 ? 1.0 : 0.0,
    //     local_vertex_id == 3 ? 1.0 : 0.0,
    //     1.0
    // );

    // Debugging: Check that local_vertex_id varies 0...3
    // Placing vertices on a unit circle with angle = id * 90 degrees
    // gl_Position = vec4(1.0);  // Should never hit the (1,1) corner
    // if (local_vertex_id == 0)
    //     gl_Position = vec4( 1.0, 0.0, 0.0, 1.0);
    // if (local_vertex_id == 1)
    //     gl_Position = vec4( 0.0, 1.0, 0.0, 1.0);
    // if (local_vertex_id == 2)
    //     gl_Position = vec4(-1.0, 0.0, 0.0, 1.0);
    // if (local_vertex_id == 3)
    //     gl_Position = vec4( 0.0,-1.0, 0.0, 1.0);
}
