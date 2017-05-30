
// get_at: workaround for missing v[i] in webgl: webgl doesn't support indexing by non-constants

int get_at(ivec2 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    return 0;
}

int get_at(ivec3 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    return 0;
}

int get_at(ivec4 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return 0;
}


float get_at(vec2 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    return 0.0;
}

float get_at(vec3 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    return 0.0;
}

float get_at(vec4 v, int i)
{
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return 0.0;
}


ivec2 get_at(ivec2 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return ivec2(0);
}

ivec3 get_at(ivec3 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return ivec3(0);
}

ivec4 get_at(ivec4 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return ivec4(0);
}


vec2 get_at(vec2 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return vec2(0.0);
}

vec3 get_at(vec3 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return vec3(0.0);
}

vec4 get_at(vec4 v[4], int i) {
    if      (i == 0)  return v[0];
    else if (i == 1)  return v[1];
    else if (i == 2)  return v[2];
    else if (i == 3)  return v[3];
    return vec4(0.0);
}


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
