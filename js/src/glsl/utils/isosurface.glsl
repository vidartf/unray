
// Return true if v IS NOT in [a,b] or [b,a]
// (whichever makes the interval start smaller than the end)
// A positive tolerance widens the interval.
bool is_outside_interval(float v, float a, float b, float tol) {
    tol *= 0.5 * (abs(a) + abs(b));
    return v < min(a, b) - tol || v > max(a, b) + tol;
}


// Find integer n such that n is in [na,nb] or [nb,na].
// If multiple values are possible, return the one closest to nb.
// Return true if value is found, false otherwise.
bool find_closest_level(out float n, float na, float nb, float tol) {
    if (na <= nb) {
        n = floor(nb + tol);
        return n >= na - tol;
    } else {  // na > nb
        n = ceil(nb - tol);
        return n <= na + tol;
    }
}


bool find_isovalue_linear_spacing(out float value, float back, float front, float rootvalue, float spacing, float tol) {
    float inv_spacing = 1.0 / spacing;
    float n;
    if (!find_closest_level(n, (back - rootvalue) * inv_spacing, (front - rootvalue) * inv_spacing, tol)) {
        return false;
    }
    value = rootvalue + n * spacing;
    return true;
}


bool find_isovalue_log_spacing(out float value, float back, float front, float rootvalue, float spacing, float tol) {
    float inv_v0 = 1.0 / rootvalue;
    float inv_log2_spacing = 1.0 / log2(spacing);
    float n;
    if (!find_closest_level(n, log2(back * inv_v0) * inv_log2_spacing, log2(front * inv_v0) * inv_log2_spacing, tol)) {
        return false;
    }
    value = rootvalue * pow(spacing, n);
    return true;
}
