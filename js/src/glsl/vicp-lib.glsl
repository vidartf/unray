
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
    float alpha = 1.0f - transparency;
    return vec4(alpha * emission, alpha);
}

// Return the smallest positive value in x, or 0
float smallest_positive(vec4 x) {
    //const float infinity = 1e38f;
    bool touched = false;
    float depth = 0.0f;
    for (int i = 0; i < 4; ++i) {
        if (x[i] > 0.0f) {
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

vec2 index_to_uv(uint index, uvec2 shape)
{
    uvec2 uv = uvec2(index % shape.x, index / shape.x);
    return vec2(
        (0.5f + float(uv.x)) / float(shape.x + 1),
        (0.5f + float(uv.y)) / float(shape.y + 1),
    );
}
