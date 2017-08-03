
// Return true if v IS NOT in [a,b] or [b,a]
// (whichever makes the interval start smaller than the end)
bool is_outside_interval(float v, float a, float b) {
    return v < min(a, b) || v > max(a, b);
}


// Return true if v IS in [a,b] or [b,a]
// (whichever makes the interval start smaller than the end)
bool is_inside_interval(float v, float a, float b) {
    return v >= min(a, b) && v < max(a, b);
}


// Find integer n such that n is in [na,nb] or [nb,na].
// If multiple values are possible, return the one closest to nb.
// Return true if value is found, false otherwise.
bool find_closest_level(out float n, float na, float nb) {
    if (na <= nb) {
        n = floor(nb);
        return n >= na;
        // return n >= ceil(na);
    } else {  // na > nb
        n = ceil(nb);
        return n < na;
        // return n >= floor(na);
    }
}


bool find_isovalue_linear_spacing(out float value, float back, float front, float rootvalue, float spacing) {
    float inv_spacing = 1.0 / spacing;
    float n;
    if (!find_closest_level(n, (back - rootvalue) * inv_spacing, (front - rootvalue) * inv_spacing)) {
        return false;
    }
    value = rootvalue + n * spacing;
    return true;
}


bool find_isovalue_log_spacing(out float value, float back, float front, float rootvalue, float spacing) {
    float inv_v0 = 1.0 / rootvalue;
    float inv_log2_spacing = 1.0 / log2(spacing);
    float n;
    if (!find_closest_level(n, log2(back * inv_v0) * inv_log2_spacing, log2(front * inv_v0) * inv_log2_spacing)) {
        return false;
    }
    value = rootvalue * pow(spacing, n);
    return true;
}
