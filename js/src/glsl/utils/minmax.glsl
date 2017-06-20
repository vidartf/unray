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
