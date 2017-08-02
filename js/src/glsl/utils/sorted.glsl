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

// Return index of smallest vector value
int smallest_index(vec4 v)
{
    int i = 0;
    float x = v[0];
    if (v[1] < x) {
        i = 1;
        x = v[1];
    }
    if (v[2] < x) {
        i = 2;
        x = v[2];
    }
    if (v[3] < x) {
        i = 3;
    }
    return i;
}

// Return index of smallest vector value
int smallest_index(vec3 v)
{
    int i = 0;
    float x = v[0];
    if (v[1] < x) {
        i = 1;
        x = v[1];
    }
    if (v[2] < x) {
        i = 2;
    }
    return i;
}

// Return index of smallest vector value
int smallest_index(vec2 v)
{
    return v.x < v.y ? 0 : 1;
}
