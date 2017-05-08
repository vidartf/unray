float max4(vec4 x) {
    return max(max(x[0], x[1]), max(x[2], x[3]));
}

float min4(vec4 x) {
    return min(min(x[0], x[1]), min(x[2], x[3]));
}

vec4 sort4(vec4 x) {
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

int bsum4(bvec4 b) {
    int c = 0;
    for (int i = 0; i < 4; ++i) {
        if (b[i])
            ++c;
    }
    return c;
}

// Return dimension of subentity on tetrahedron that
// barycentric coordinate corresponds to within distance eps
int on_tetrahedron_entity(vec4 baryCoord, float eps) {
    return bsum4(lessThan(baryCoord, vec4(eps)));
}

ivec2 texelFetchCoord(int index, ivec2 size)
{
    return ivec2(index / size.x, index % size.x);
}

uvec2 texelFetchCoord(uint index, uvec2 size)
{
    return uvec2(index / size.x, index % size.x);
}

// Must be consistent across shaders
// (TODO: Find a more robust way to configure this)
#define VERTEX_BITSHIFT 28

// Compute face normals of tetrahedron
mat4x3 computeTetNormals(vec3 coords[4]) {
    // TODO: This should be tested better
    // TODO: This can be improved if we know the
    //       orientation of the tetrahedrons
    mat4x3 N;
    for (int i = 0; i < 4; ++i)
    {
        // Indices of face i
        int i1 = (i + 1) & 3;
        int i2 = (i + 2) & 3;
        int i3 = (i + 3) & 3;

        // Edge vectors spanning face i
        vec3 e0 = coords[i2] - coords[i1];
        vec3 e1 = coords[i3] - coords[i1];

        // Edge vector pointing in the approximate direction of n
        vec3 ndir = coords[i1] - coords[i];

        // Normalized vector of face i
        vec3 nn = normalize(cross(e0, e1));

        // Swap direction if necessary
        N[i] = faceforward(nn, ndir, nn);
    }
    return N;
}

// Compute plane equation coefficients for faces of tetrahedron
vec4 computeTetPlaneEquationCoefficients(vec3 coords[4], mat4x3 normals)
{
    vec4 coeffs;
    for (int i = 0; i < 4; ++i) {
        int i1 = (i + 1) & 3;
        coeffs[i] = dot(normals[i], coords[i1]);
    }
    return coeffs;
}

// Compute ray length vectors holding distances from
// each vertex to the opposing plane along view direction.
vec4 computeTetRayLengths(vec3 coords[4], vec3 cameraPosition, mat4x3 N)
{
    vec4 rayLengths;
    for (int i = 0; i < 4; ++i)
    {
        // Arbitrary index on face i
        int i1 = (i + 1) & 3;

        // Normal of opposing face
        vec3 nn = N[i].xyz;

        // One of the edge vectors from vertex i towards a vertex on face i
        vec3 edge = coords[i1] - coords[i];

        // View direction through vertex i for perspective projected camera
        vec3 viewDirection = normalize(coords[i] - cameraPosition);

        // Ray length between vertex i and face i
        rayLengths[i] = dot(edge, nn) / dot(viewDirection, nn);
    }
    return rayLengths;
}

// Compute constant gradient of linear function over
// tetrahedron given vertex coordinates and values
vec3 computeTetGradient(vec3 coords[4], vec4 values)
{
    mat3 A = mat3(coords[1]-coords[0], coords[2]-coords[0], coords[3]-coords[0]);
    vec3 b = vec3(values[1]-values[0], values[2]-values[0], values[3]-values[0]);
    return inverse(A)*b;
}

// Return the smallest positive value in x, or 0
float smallestPositive(vec4 x) {
    //const float infinity = 1e38f;
    bool touched = false;
    float depth = 0.0f;
    for (int i = 0; i < 4; ++i) {
        if (x[i] > 0.0f) {
            if (touched) {
                depth = min(depth, x[i]);
            } else {
                depth = x[i];
                touched = true;
            }
        }
    }
    return depth;
}

// Compute f values at entry and exit points of ray
vec2 computeFunctionValues(
    float functionValue, vec3 functionGradient,
    float depth, vec3 viewDirection)
{
    float functionDiff = depth * dot(functionGradient, viewDirection);
    return vec2(functionValue, functionValue + functionDiff);
}

// Map components of values from [range.x,range.y] to [0, 1],
// optimized by expecting range.z == 1.0f / (range.x - range.y)
vec2 mapToRange(vec2 values, vec3 range)
{
    return (values - vec2(range.x)) * range.z;
}

vec4 integrate_constant_ray(
    float depth,
    vec3 emission,
    float extinction)
{
    // Simplest per-fragment approximation to ray integral, assuming
    // piecewise constant color and extinction across the ray segment.

    // Evaluate ray integral, use in combination
    // with blend equation: RGB_src * A_dst + RGB_dst
    float transparency = exp(-depth * extinction);
    float alpha = 1.0f - transparency;
    return vec4(alpha * emission, alpha);
}
