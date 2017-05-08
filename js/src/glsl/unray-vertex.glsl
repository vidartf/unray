#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;

// Using webpack-glsl-loader to copy in shared code
@import ./unray-lib;

// Local vertex attributes (just a test, and we need at least one vertex attribute to draw)
layout (location = 0) in int a_debug;

// Tetrahedron instance attributes
layout (location = 1) in vec4 t_nx;
layout (location = 2) in vec4 t_ny;
layout (location = 3) in vec4 t_nz;
layout (location = 4) in vec4 t_ne;

// Doing this would require duplication of vertices:
//layout (location = 5) in vec3 t_position;
// Therefore doing this instead:

//layout (location = 5) in uint t_cellIndex;
// FIXME: Add samplers for cells, coordinates

// Output values
out vec4 v_baryCoord;
out vec4 v_color;
out vec4 v_rayLengths;

void main()
{
    // This is the local vertex id 0..3 on the current tetrahedron instance
    int v = gl_VertexID;

    // Get normalized view direction vector // TODO: from camera data
    vec3 viewDirection = vec3(0.0f, 0.0f, 1.0f);

    // Get ray equation data for the face on this
    // tetrahedron opposing the current vertex
    //vec4 rayEq = vec4(t_N0[v], t_N1[v], t_N2[v], t_N3[v]);
    vec3 n = vec3(t_nx[v], t_ny[v], t_nz[v]);
    float rayLength = t_ne[v] / dot(viewDirection, n);

    // Just need to do something that can't be compiled away
    // with the dummy vertex attribute or this won't compile...
    if (a_debug != 0) {
        rayLength = 1.0f;
    }

    // Place scalar raylength from vertex to opposing
    // face in the corresponing vector entry
    v_rayLengths = vec4(0.0f);
    v_rayLengths[v] = rayLength;

#if 1
    // Local barycentric coordinates on tetrahedron
    v_baryCoord = vec4(0.0f);
    v_baryCoord[v] = 1.0f;
#endif

    //v_color = t_color[v];

#if 1
    // Debugging colors
    const vec3 colors[8] = vec3[8](
        vec3(1.0, 0.0, 0.0),
        vec3(1.0, 0.0, 0.0),
        vec3(1.0, 0.0, 0.0),
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
    v_color = vec4(colors[gl_InstanceID*4 + v], 1.0f);
    if (v > 2)
        v_color.rgb = vec3(0.0f);
    //v_color.rgb = vec3(1.0, 0.0, 0.0);
    //v_color.r = 1.0f / float(v + 1);
#endif

#if 1
    // Debugging positions
    const vec3 mesh[8] = vec3[8](
        vec3(-1.0,  0.0,  0.5),
        vec3(-0.5,  1.0, -0.5),
        vec3(-0.5, -1.0, -0.5),
        vec3( 0.0,  0.0,  0.5),
        vec3( 1.0,  0.0,  0.5),
        vec3( 0.5,  1.0, -0.5),
        vec3( 0.5, -1.0, -0.5),
        vec3( 0.0,  0.0,  0.5)
    );
    gl_Position = vec4(mesh[gl_InstanceID*4 + v], 1.0f);
#endif
}
