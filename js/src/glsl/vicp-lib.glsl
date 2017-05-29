
float max4(vec4 x) {
    return max(max(x[0], x[1]), max(x[2], x[3]));
}

float min4(vec4 x) {
    return min(min(x[0], x[1]), min(x[2], x[3]));
}

vec4 sort4(vec4 x) {
    vec4 y = vec4(x);
    for (int i = 1; i < 4; ++i) {
        float z = y[i];
        int j = i - 1;
        while (j >= 0 && y[j] > z) {
            y[j+1] = y[j];
            --j;
        }
        y[j + 1] = z;
    }
    return y;
}

int bsum4(bvec4 b) {
    int c = 0;
    for (int i = 0; i < 4; ++i) {
        if (b[i])
            ++c;
    }
    return c;
}

int get_at(ivec4 v, int i)
{
    // return v[i];  // webgl doesn't support indexing by non-constants
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return 0;
}

float get_at(vec2 v, int i)
{
    // return v[i];  // webgl doesn't support indexing by non-constants
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    return 0.0;
}

float get_at(vec3 v, int i)
{
    // return v[i];  // webgl doesn't support indexing by non-constants
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    return 0.0;
}

float get_at(vec4 v, int i)
{
    // return v[i];  // webgl doesn't support indexing by non-constants
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return 0.0;
}

vec2 get_at(vec2 v[4], int i)
{
    // return v[i];  // webgl doesn't support indexing by non-constants
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return vec2(0.0);
}

vec4 with_nonzero_at(int i, float value)
{
    vec4 v = vec4(0.0);
    // v[i] = value;  // webgl doesn't support indexing by non-constants
    if      (i == 0)  v[0] = value;
    else if (i == 1)  v[1] = value;
    else if (i == 2)  v[2] = value;
    else if (i == 3)  v[3] = value;
    return v;    
}

vec4 integrate_constant_ray(
    float depth,
    vec3 emission,
    float extinction)
{
    // Simplest per-fragment approximation to ray integral, assuming
    // piecewise constant color and extinction across the ray segment.

    // Evaluate ray integral, use in combination
    // with blend equation: RGB_src * A_dst + RGB_dst
    float transparency = exp(-depth * extinction);
    float alpha = 1.0 - transparency;
    return vec4(alpha * emission, alpha);
}

// Return the smallest positive value in x, or 0
float smallest_positive(vec4 x) {
    //const float infinity = 1e38f;
    bool touched = false;
    float depth = 0.0;
    for (int i = 0; i < 4; ++i) {
        if (x[i] > 0.0) {
            if (touched) {
                depth = min(depth, x[i]);
            } else {
                depth = x[i];
                touched = true;
            }
        }
    }
    return depth;
}

mat3 compute_edge_diff_matrix(vec3 x[4])
{
    return mat3(x[1] - x[0], x[2] - x[0], x[3] - x[0]);
}

vec3 compute_edge_diff_vector(vec4 v)
{
    return vec3(v[1] - v[0], v[2] - v[0], v[3] - v[0]);
}

vec2 index_to_uv(int index, ivec2 shape)
{
    //int u = index % shape.x;
    int v = index / shape.x;
    int u = index - shape.x * v;
    return vec2(
        (0.5 + float(u)) / float(shape.x + 1),
        (0.5 + float(v)) / float(shape.y + 1)
    );
}
