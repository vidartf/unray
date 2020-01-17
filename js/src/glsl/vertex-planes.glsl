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

// TODO: Benchmark equivalent unrolled version vs reordering + loop
#if 0
// Unrolled version
v_planes[0].xyz = normalize(cross(edge[0], edge[4]));
v_planes[1].xyz = normalize(cross(edge[1], edge[3]));
v_planes[2].xyz = normalize(cross(edge[2], edge[1]));
v_planes[3].xyz = normalize(cross(edge[3], edge[2]));
#else
// Reordering to use loop
vec3 edge2[4];
edge2[0] = edge[4];
edge2[1] = edge[3];
edge2[2] = edge[1];
edge2[3] = edge[2];
for (int i = 0; i < 4; ++i) {
    v_planes[i].xyz = normalize(cross(edge[i], edge2[i]));
}
#endif


// TODO: Don't need this part to get surface normals
#if defined(ENABLE_PLANES)
// Store plane equation coefficient for each face
// (plane equation coefficient is the distance from face to origo along n)
v_planes[0].w = dot(v_planes[0].xyz, coordinates[1]);
for (int i = 1; i < 4; ++i) {
    v_planes[i].w = dot(v_planes[i].xyz, coordinates[0]);
}
#endif