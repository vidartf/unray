// Vertex shader for the Unray project implementing
// variations of View Independent Cell Projection

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;


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

// Time uniforms
uniform float u_time;
uniform vec4 u_oscillators;

// Custom camera uniforms
uniform vec3 u_view_direction;

// Input data uniforms
uniform vec4 u_density_range;
uniform vec4 u_emission_range;
uniform vec3 u_constant_color;

// Texture property uniforms
uniform uvec2 u_cell_texture_shape;
uniform uvec2 u_vertex_texture_shape;

// Vertex attributes
attribute uvec4 a_local_vertices;

// Cell attributes
attribute uint c_ordering;
attribute uvec4 c_cells;

// Cell textures
uniform usampler2D t_cells;

// Vertex textures
uniform sampler2D t_coordinates;
uniform sampler2D t_density;
uniform sampler2D t_emission;

// LUT textures
uniform sampler2D t_density_lut;
uniform sampler2D t_emission_lut;

// Varyings
varying vec3 v_model_position;
flat varying vec3 v_view_direction;
varying vec4 v_ray_lengths;
varying float v_density;
varying float v_emission;
flat varying float v_density_gradient;
flat varying float v_emission_gradient;


void main()
{
    mat4 MVP = projectionMatrix * modelViewMatrix

#ifdef ENABLE_CELL_UV
    vec2 cell_uv = index_to_uv(c_ordering, u_cell_texture_shape);
#endif

#ifdef ENABLE_CELL_ORDERING
    uvec4 cell = texture2D(t_cells, cell_uv);
#else
    uvec4 cell = c_cells;
#endif

#ifdef ENABLE_VERTEX_INDICES
    // Locally reordered global vertex indices
    vec4 vertex_indices;
    for (int i = 0; i < 4; ++i) {
        vertex_indices[i] = cell[a_local_vertices[i]];
    }
#endif

#ifdef ENABLE_VERTEX_UV
    vec2 vertex_uv[4];
    for (int i = 0; i < 4; ++i) {
        vertex_uv[i] = index_to_uv(cell[i], u_vertex_texture_shape);
    }
#endif

#if defined(ENABLE_COORDINATES)
    vec3 coordinates[4];
    for (int i = 0; i < 4; ++i) {
        coordinates[i] = texture2D(t_coordinates, vertex_uv[i]);
    }
    v_model_position = coordinates[gl_VertexID];
#endif

#ifdef ENABLE_PERSPECTIVE_PROJECTION
    v_view_direction = normalize(coordinates[gl_VertexID] - cameraPosition);
#else
    v_view_direction = u_view_direction;
#endif

#if defined(ENABLE_DENSITY_BACK) || defined(ENABLE_EMISSION_BACK)
    mat3 XD = compute_edge_diff_matrix(coordinates);
    mat3 XDinv = inverse(XD);
#endif

#ifdef ENABLE_DENSITY_BACK
    vec4 density;
    for (int i = 0; i < 4; ++i) {
        density[i] = texture2D(t_density, vertex_uv[i]);
    }
    v_density = density[gl_VertexID];
    v_density_gradient = XDinv * compute_edge_diff_vector(density);
#else
#ifdef ENABLE_DENSITY
    v_density = texture2D(t_density, vertex_uv[gl_VertexID]);
#endif
#endif

#ifdef ENABLE_EMISSION_BACK
    vec4 emission;
    for (int i = 0; i < 4; ++i) {
        emission[i] = texture2D(t_emission, vertex_uv[i]);
    }
    v_emission = emission[gl_VertexID];
    v_emission_gradient = XDinv * compute_edge_diff_vector(emission);
#else
#ifdef ENABLE_EMISSION
    v_emission = texture2D(t_emission, vertex_uv[gl_VertexID]);
#endif
#endif

#if defined(ENABLE_DEPTH) || defined(ENABLE_DENSITY_BACK) || defined(ENABLE_EMISSION_BACK)
    // FIXME: pick a_local_vertices properly and update this to be outwards pointing
    // Compute the normal vector of the tetrahedon face opposing this vertex
    vec3 x1 = coordinates[a_local_vertices[1]];
    vec3 edge_a = coordinates[a_local_vertices[2]] - x1;
    vec3 edge_b = coordinates[a_local_vertices[3]] - x1;
    vec3 n = normalize(cross(edge_a, edge_b));

    // Compute the distance from this vertex along the view direction to the plane of the opposing face
    // Note: orthogonal_length is a constant property of the opposing face of this cell
    float orthogonal_length = dot(n, coordinates[a_local_vertices[1]] - coordinates[a_local_vertices[0]]);
    v_ray_lengths = vec4(0.0f);
    v_ray_lengths[gl_VertexID] = orthogonal_length / dot(n, v_view_direction);
#endif

    gl_Position = MVP * vec4(v_model_position, 1.0);
}
