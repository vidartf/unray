// getitem: workaround for missing v[i] in webgl,
// webgl doesn't support indexing by non-constants

int getitem(ivec2 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    return 0;
}

int getitem(ivec3 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    return 0;
}

int getitem(ivec4 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return 0;
}


float getitem(vec2 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    return 0.0;
}

float getitem(vec3 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    return 0.0;
}

float getitem(vec4 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return 0.0;
}


ivec2 getitem(ivec2 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return ivec2(0);
}

ivec3 getitem(ivec3 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return ivec3(0);
}

ivec4 getitem(ivec4 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return ivec4(0);
}


vec2 getitem(vec2 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return vec2(0.0);
}

vec3 getitem(vec3 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return vec3(0.0);
}

vec4 getitem(vec4 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return vec4(0.0);
}

void reorder(out vec3 dst[4], vec3 src[4], ivec4 indices) {
    for (int i = 0; i < 4; ++i) {
        int j = indices[i];
        if      (j == 0)  dst[i] = src[0];
        else if (j == 1)  dst[i] = src[1];
        else if (j == 2)  dst[i] = src[2];
        else if (j == 3)  dst[i] = src[3];
    }
}

void reorder2(out vec3 dst[4], vec3 src[4], ivec4 indices) {
    for (int i = 0; i < 4; ++i) {
        int j = indices[i];
        if (j < 2) {
            dst[i] = j == 0 ? src[0] : src[1];
        } else {
            dst[i] = j == 2 ? src[2] : src[3];
        }
    }
}
