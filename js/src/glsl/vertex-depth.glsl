
// Compute max length of all 6 unique edges
v_max_depth = length(coordinates[3] - coordinates[2]);
for (int i = 0; i < 6; ++i) {
    v_max_depth = max(v_max_depth, length(edge[i]));
}


#ifndef ENABLE_PERSPECTIVE_PROJECTION
    // The vertex attribute local_vertices[1..3] is carefully
    // chosen to be ccw winded seen from outside the tetrahedron
    // such that n computed below will point away from local_vertices[0]

    // Get vertex coordinates ordered relative to the current vertex
    vec3 x0 = getitem(coordinates, local_vertices[0]);
    vec3 x1 = getitem(coordinates, local_vertices[1]);

    // Get the face normal opposing the current vertex
    vec3 n = getitem(v_planes, local_vertex_id).xyz;

    // Compute the distance from the current vertex
    // to its orthogonal projection on the opposing face
    // Note: this is a constant property of the opposing
    // face of this cell, might be possible to exploit that somehow.
    float orthogonal_dist = dot(n, x1 - x0);

    // Compute the distance from this vertex along the
    // view direction to the plane of the opposing face
    float ray_length = orthogonal_dist / dot(n, u_local_view_direction);

    // Output ray length of the current vertex as a component of
    // a vec4 with zeros at the other local vertex ids, giving
    // access to all ray lengths interpolated across the rasterized
    // triangle in the fragment shader.
    v_ray_lengths = with_nonzero_at(local_vertex_id, ray_length);
#endif


    // Compute v_facing[face] = +1.0 for front facing or -1.0 for back facing.
    // Rays always enter through front faces and exit through back faces.
    // For this purpose, orthogonal faces can be classified as front faces
    // since they never contain the exit point of a ray.

    // v_facing can in principle be precomputed per cell,
    // which will simplify the numerical robustness issues
    // and reduce the computational cost at the cost of
    // using more gpu memory.

    // The tricky part is to handle orthogonal faces robustly in the
    // limit where front facing becomes orthogonal.
    // If a face becomes positive on one vertex and negative on another,
    // that can be a problem, as this value will be interpolated
    // across the face (webgl version 1 has no flat interpolation).

    // So for robustness, we err on the +1 side (frontface).
    // This means almost orthogonal backfaces are likely to
    // become frontfaces and have their depths ignored.
    // If we lean too much towards classification as frontface,
    // we get render artifact slivers where backfaces become almost orthogonal.

    // Ideally this should match the opengl drivers decision
    // to make the face front or back facing...
    // TODO: Find specs and see if there are any guarantees we can exploit?


    // TLDR; It is important that computation of v_facing is numerically robust
    // enough to be the same in all four vertex shader invocations on a tetrahedron!
    const float front_facing_eps = 1e-2;
    // TODO: Make tolerance runtime configurable for testing
    // uniform float u_front_facing_eps;


#ifndef ENABLE_PERSPECTIVE_PROJECTION
    const float front_facing_eps = 1e-2;
    for (int i = 0; i < 4; ++i) {
        v_facing[i] = dot(v_planes[i].xyz, u_local_view_direction) <= front_facing_eps ? +1.0 : -1.0;
    }

#else
    // Compute direction from each vertex towards camera
    vec3 vertex_to_camera[4];
    vertex_to_camera[0] = normalize(u_local_camera_position - coordinates[0]);
    vertex_to_camera[1] = normalize(u_local_camera_position - coordinates[1]);
    vertex_to_camera[2] = normalize(u_local_camera_position - coordinates[2]);
    vertex_to_camera[3] = normalize(u_local_camera_position - coordinates[3]);

    // Compute cos of angle between face normal and direction to camera
    // vec3 cos_angles;
    // for(i) for(j) cos_angles[i][j] = dot(normals[i], vertex_to_camera[j]);

    // Classify face as front facing if vector from _any_ vertex in face to camera
    // has a positive normal component, with a generous definition
    // of positive (>= -eps).

    // TODO: Performance testing variations
#  if 1
    for (int face = 0; face < 4; ++face) {
        v_facing[face] = -1.0;
        for (int vertex = 0; vertex < 4; ++vertex) {
            if (vertex != face && dot(v_planes[face].xyz, vertex_to_camera[vertex]) >= -front_facing_eps) {
                v_facing[face] = +1.0;
                break;
            }
        }
    }
#  elif 0
    bvec4 front_facing[4];
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 4; ++j) {
            front_facing[i][j] = i == j ? false : dot(v_planes[i].xyz, vertex_to_camera[j]) >= -front_facing_eps;
        }
    }
    for (int i = 0; i < 4; ++i) {
        v_facing[i] = any(front_facing[i]) ? +1.0 : -1.0;
    }
#  elif 0
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
#  endif

#endif