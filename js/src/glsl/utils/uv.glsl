// Map contiguous 1D index to UV coordinates
// in [0,1]^2 for given texture shape
vec2 index_to_uv(int index, ivec2 shape)
{
    //int u = index % shape.x;
    int v = index / shape.x;
    int u = index - shape.x * v;
    return vec2(
        (0.5 + float(u)) / float(shape.x),
        (0.5 + float(v)) / float(shape.y)
    );
}
