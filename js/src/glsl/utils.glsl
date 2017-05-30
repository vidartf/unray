// Moved some utils here that I currently don't use

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


// Count true values in vector
int count(bvec4 b) {
    const int n = 4;
    int c = 0;
    for (int i = 0; i < n; ++i) {
        if (b[i])
            ++c;
    }
    return c;
}

// Count true values in vector
int count(bvec3 b) {
    const int n = 3;
    int c = 0;
    for (int i = 0; i < n; ++i) {
        if (b[i])
            ++c;
    }
    return c;
}

// Count true values in vector
int count(bvec2 b) {
    const int n = 2;
    int c = 0;
    for (int i = 0; i < n; ++i) {
        if (b[i])
            ++c;
    }
    return c;
}


// Return sorted vector
vec4 sorted(vec4 x) {
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
