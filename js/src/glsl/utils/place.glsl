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
