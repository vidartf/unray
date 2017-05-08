#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;

// Using webpack-glsl-loader to copy in shared code
@import ./unray-lib;

// Globally constant uniforms
//uniform vec4 u_dofs;

// Varyings
in vec4 v_baryCoord;
in vec4 v_color;
in vec4 v_rayLengths;

// Resulting color
out vec4 fragColor;

void main()
{
    // This is the color we'll return in the end,
    // allowing some modifications below
    vec4 C = v_color;

    // Example use of barycentric coordinates:
    // Maximum 1.0 at vertices,
    // 0.5 at midpoint of edges,
    // 0.33 at midpoint of faces,
    // minimum 0.25 at midpoint of cell
    //float f = max4(v_baryCoord);

    // Piecewise linear function over tetrahedron
    //float f = dot(u_dofs, v_baryCoord);

    // Debugging: highlight vertices, edges, faces
#if 1
    int on_entity_dim = on_tetrahedron_entity(v_baryCoord, 0.05);
    if (on_entity_dim >= 2)
        C.a = 0.0f;
    else
        C.a = 1.0f;
    //C[3-on_entity_dim] = 1.0f;
#endif

    // Emit color at last
    fragColor = C;
}
