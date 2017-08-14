// Some utilities for boolean and conditional operations on vectors

// Return max of vec values
float maxv(vec4 x) {
    return max(max(x[0], x[1]), max(x[2], x[3]));
}

// Return max of vec values
float maxv(vec3 x) {
    return max(max(x[0], x[1]), x[2]);
}

// Return max of vec values
float maxv(vec2 x) {
    return max(x[0], x[1]);
}

// Return min of vec values
float minv(vec4 x) {
    return min(min(x[0], x[1]), min(x[2], x[3]));
}

// Return min of vec values
float minv(vec3 x) {
    return min(min(x[0], x[1]), x[2]);
}

// Return min of vec values
float minv(vec2 x) {
    return min(x[0], x[1]);
}

// Return sum of vec values
float sumv(vec4 x) {
    return (x[0] + x[1]) + (x[2] + x[3]);
}

// Return sum of vec values
float sumv(vec3 x) {
    return (x[0] + x[1]) + x[2];
}

// Return sum of vec values
float sumv(vec2 x) {
    return x[0] + x[1];
}

// Return avg of vec values
float avgv(vec4 x) {
    return 0.25 * ((x[0] + x[1]) + (x[2] + x[3]));
}

// Return avg of vec values
float avgv(vec3 x) {
    return (1.0/3.0) * ((x[0] + x[1]) + x[2]);
}

// Return avg of vec values
float avgv(vec2 x) {
    return 0.5 * (x[0] + x[1]);
}

// Return avg of two middle values
float midv(vec4 x) {
    return 0.5 * (
          max(min(x.x, x.y), min(x.z, x.w))
        + min(max(x.x, x.y), max(x.z, x.w))
        );
}
