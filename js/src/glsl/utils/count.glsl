// Utilities for counting boolean vector values


// TODO: Don't know if this is the fastest approach, optimization may be possible
// Alternative formulation to test for performance 
// int count(bvec4 b) {
//     return (b[0] ? 1: 0) + (b[1] ? 1: 0) + (b[2] ? 1: 0) + (b[3] ? 1: 0);
// }

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

// Count true values in vector
int count(bool b) {
    return b ? 1: 0;
}
