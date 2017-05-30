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
uniform float u_time;
uniform vec4 u_oscillators;

// Custom camera uniforms
uniform vec3 u_view_direction;

// Input data uniforms
uniform vec3 u_constant_color;
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

// Vertex attributes (local vertices 0-4 on tetrahedron)
attribute float a_vertex_id;       // webgl doesn't support gl_VertexID
attribute vec4 a_local_vertices;  // webgl doesn't support ivec4

// Cell attributes
#ifdef ENABLE_CELL_ORDERING
attribute float c_ordering;  // webgl doesn't support int attributes
#else
// TODO: Could still use c_cells as an instance attribute
//       to avoid texture lookups here
//       if c_ordering is set to the identity mapping i->i
attribute vec4 c_cells;  // webgl doesn't support ivec4 attributes
#endif

// Cell textures
#ifdef ENABLE_CELL_ORDERING
uniform sampler2D t_cells;
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

// Varyings
varying vec3 v_model_position;
varying vec3 v_view_direction; // flat
#ifdef ENABLE_DEPTH
varying vec4 v_ray_lengths;
#endif
#ifdef ENABLE_DENSITY
varying float v_density;
#endif
#ifdef ENABLE_EMISSION
varying float v_emission;
#endif

#ifdef ENABLE_DENSITY_BACK
varying float v_density_gradient; // flat
#endif
#ifdef ENABLE_EMISSION_BACK
varying float v_emission_gradient; // flat
#endif

void main()
{
    mat4 MVP = projectionMatrix * modelViewMatrix;

    int local_vertex_id = int(a_vertex_id); // replacement for gl_VertexID

#ifdef ENABLE_CELL_ORDERING
    int cell_index = int(c_ordering);
#else
    // In webGL2, if no cell ordering is necessary,
    // this allows dropping the c_ordering array:
    //int cell_index = gl_InstanceID;
#endif

#ifdef ENABLE_CELL_UV
    vec2 cell_uv = index_to_uv(cell_index, u_cell_texture_shape);
#endif

#ifdef ENABLE_CELL_ORDERING
    // FIXME: Do some kind of float to int conversion for cell
    ivec4 cell = ivec4(texture2D(t_cells, cell_uv));
#else
    ivec4 cell = ivec4(c_cells);
#endif

#ifdef ENABLE_VERTEX_INDICES
    // FIXME: Not quite sure how to use the vertex_indices local to local mapping yet

    // Local to local mapping 0-3 -> 0-3
    ivec4 local_vertices = ivec4(a_local_vertices);

    // Locally reordered global vertex indices
    ivec4 vertex_indices;
    for (int i = 0; i < 4; ++i) {
        vertex_indices[i] = cell[local_vertices[i]];
    }
    // Should this use the vertex_indices mapping?
    int global_vertex_id = get_at(vertex_indices, local_vertex_id);
#else
    int global_vertex_id = get_at(cell, local_vertex_id);
#endif

#ifdef ENABLE_VERTEX_UV
    vec2 vertex_uv[4];
    for (int i = 0; i < 4; ++i) {
        vertex_uv[i] = index_to_uv(cell[i], u_vertex_texture_shape);
    }
    vec2 v_uv = get_at(vertex_uv, local_vertex_id);
#endif

#ifdef ENABLE_COORDINATES
    vec3 coordinates[4];
    for (int i = 0; i < 4; ++i) {
        coordinates[i] = texture2D(t_coordinates, vertex_uv[i]);
    }
    v_model_position = get_at(coordinates, local_vertex_id);
#endif

#ifdef ENABLE_PERSPECTIVE_PROJECTION
    v_view_direction = normalize(v_model_position - cameraPosition);
#else
    v_view_direction = u_view_direction;
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
    v_density = texture2D(t_density, v_uv).a;
#endif

#ifdef ENABLE_EMISSION_BACK
    vec4 emission;
    for (int i = 0; i < 4; ++i) {
        emission[i] = texture2D(t_emission, vertex_uv[i]).a;
    }
    v_emission = get_at(emission, local_vertex_id);
    v_emission_gradient = XDinv * compute_edge_diff_vector(emission);
#elif defined(ENABLE_EMISSION)
    v_emission = texture2D(t_emission, v_uv).a;
#endif

#ifdef ENABLE_DEPTH
    // FIXME: pick a_local_vertices properly and update this to be outwards pointing
    // Compute the normal vector of the tetrahedon face opposing this vertex
    vec3 x1 = coordinates[a_local_vertices[1]];
    vec3 edge_a = coordinates[a_local_vertices[2]] - x1;
    vec3 edge_b = coordinates[a_local_vertices[3]] - x1;
    vec3 n = normalize(cross(edge_a, edge_b));

    // Compute the distance from this vertex along the view direction to the plane of the opposing face
    // Note: orthogonal_length is a constant property of the opposing face of this cell
    float orthogonal_length = dot(n, coordinates[a_local_vertices[1]] - coordinates[a_local_vertices[0]]);
    v_ray_lengths = with_nonzero_at(local_vertex_id, orthogonal_length / dot(n, v_view_direction));
#endif

    //gl_Position = MVP * vec4(v_model_position, 1.0);
    // gl_Position = vec4(v_model_position, 1.0);

    gl_Position = vec4(
        local_vertex_id == 1 ? 1.0 : 0.0,
        local_vertex_id == 2 ? 1.0 : 0.0,
        local_vertex_id == 3 ? 1.0 : 0.0,
        1.0
    );
}
