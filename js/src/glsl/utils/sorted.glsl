// Utilities for sorting vectors

// Return sorted vector values
vec4 sorted(vec4 v)
{
    // TODO: Don't know if this is the fastest approach, optimization may be possible
    // Alternative formulation to test for performance 
    //v.xy = v.x <= v.y ? v.xy : v.yx;

    if (v.w < v.z)  v.zw = v.wz;
    if (v.w < v.y)  v.yw = v.wy;
    if (v.w < v.x)  v.xw = v.wx;
    if (v.z < v.y)  v.yz = v.zy;
    if (v.z < v.x)  v.xz = v.zx;
    if (v.y < v.x)  v.xy = v.yx;
    return v;
}

// Return sorted vector values
vec3 sorted(vec3 v)
{
    if (v.z < v.y)  v.yz = v.zy;
    if (v.z < v.x)  v.xz = v.zx;
    if (v.y < v.x)  v.xy = v.yx;
    return v;
}

// Return sorted vector values
vec2 sorted(vec2 v)
{
    if (v.y < v.x)  v.xy = v.yx;
    return v;
}
