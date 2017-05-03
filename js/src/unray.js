var _ = require('underscore');


function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    let msg = gl.getShaderInfoLog(shader);
    console.error(msg);
    gl.deleteShader(shader);
}


function createProgram(gl, vertexShader, fragmentShader, locations={}, transformAttribs=[]) {
    // Create program with given shaders
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // Bind attribute locations
    for (let name in locations) {
        let loc = locations[name];
        gl.bindAttribLocation(program, loc, name);
    }

    // Specify transform feedback attributes if any
    if (transformAttribs.length) {
        //var transformAttribs = ["f_cellVertIndex", "f_rayLengths", "f_functionGradient"];
        gl.transformFeedbackVaryings(program, transformAttribs, gl.SEPARATE_ATTRIBS);
    }

    // Link and return or report error
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    let msg = gl.getProgramInfoLog(program);
    console.error(msg);
    gl.deleteProgram(program);
}


let shader_header = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;
`


let shader_library = `
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

`


let dummy_fragment_shader = shader_header + `
void main() {
    // Do nothing
}
`


let default_vertex_shader = `
// Local vertex attributes (just a test, and we need at least one vertex attribute to draw)
layout (location = 0) in int a_debug;

// Tetrahedron instance attributes
layout (location = 1) in vec4 t_nx;
layout (location = 2) in vec4 t_ny;
layout (location = 3) in vec4 t_nz;
layout (location = 4) in vec4 t_ne;

// Output values
out vec4 v_baryCoord;
out vec4 v_color;
out vec4 v_rayLengths;

void main()
{
    // This is the local vertex id 0..3 on the current tetrahedron instance
    int v = gl_VertexID;

    // Get normalized view direction vector // TODO: from camera data
    vec3 viewDirection = vec3(0.0f, 0.0f, 1.0f);

    // Get ray equation data for the face on this
    // tetrahedron opposing the current vertex
    //vec4 rayEq = vec4(t_N0[v], t_N1[v], t_N2[v], t_N3[v]);
    vec3 n = vec3(t_nx[v], t_ny[v], t_nz[v]);
    float rayLength = t_ne[v] / dot(viewDirection, n);

    // Just need to do something that can't be compiled away
    // with the dummy vertex attribute or this won't compile...
    if (a_debug != 0) {
        rayLength = 1.0f;
    }

    // Place scalar raylength from vertex to opposing
    // face in the corresponing vector entry
    v_rayLengths = vec4(0.0f);
    v_rayLengths[v] = rayLength;

#if 1
    // Local barycentric coordinates on tetrahedron
    v_baryCoord = vec4(0.0f);
    v_baryCoord[v] = 1.0f;
#endif

    //v_color = t_color[v];

#if 1
    // Debugging colors
    const vec3 colors[8] = vec3[8](
        vec3(1.0, 0.0, 0.0),
        vec3(1.0, 0.0, 0.0),
        vec3(1.0, 0.0, 0.0),
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
    v_color = vec4(colors[gl_InstanceID*4 + v], 1.0f);
    if (v > 2)
        v_color.rgb = vec3(0.0f);
    //v_color.rgb = vec3(1.0, 0.0, 0.0);
    //v_color.r = 1.0f / float(v + 1);
#endif

#if 1
    // Debugging positions
    const vec3 mesh[8] = vec3[8](
        vec3(-1.0,  0.0,  0.5),
        vec3(-0.5,  1.0, -0.5),
        vec3(-0.5, -1.0, -0.5),
        vec3( 0.0,  0.0,  0.5),
        vec3( 1.0,  0.0,  0.5),
        vec3( 0.5,  1.0, -0.5),
        vec3( 0.5, -1.0, -0.5),
        vec3( 0.0,  0.0,  0.5)
    );
    gl_Position = vec4(mesh[gl_InstanceID*4 + v], 1.0f);
#endif
}
`;


let default_fragment_shader = `
// Globally constant uniforms
//uniform vec4 u_dofs;

// Varyings
in vec4 v_baryCoord;
in vec4 v_color;
in vec4 v_rayLengths;

// Resulting color
out vec4 fragColor;

void main()
{
    // This is the color we'll return in the end,
    // allowing some modifications below
    vec4 C = v_color;

    // Example use of barycentric coordinates:
    // Maximum 1.0 at vertices,
    // 0.5 at midpoint of edges,
    // 0.33 at midpoint of faces,
    // minimum 0.25 at midpoint of cell
    //float f = max4(v_baryCoord);

    // Piecewise linear function over tetrahedron
    //float f = dot(u_dofs, v_baryCoord);

    // Debugging: highlight vertices, edges, faces
#if 1
    int on_entity_dim = on_tetrahedron_entity(v_baryCoord, 0.05);
    if (on_entity_dim >= 2)
        C.a = 0.0f;
    else
        C.a = 1.0f;
    //C[3-on_entity_dim] = 1.0f;
#endif

    // Emit color at last
    fragColor = C;
}
`;


class Unray
{
    static default_config() {
        return {
            "raymodel": "surface",
        };
    }

    constructor(gl) {
        this.log("constructor, gl:");
        this.log(gl);

        this.config = Unray.default_config();
        
        this.gl = gl;
        this.update_viewport();

        this.elementArrayBuffer = this.createElementArrayBuffer();

        /*
        this.snippets = {};
        this.shaders = {};
        this.programs = {};
        this.buffers = {};
        this.uniforms = {};
        this.textures = {};
        */
    }

    log(msg) {
        console.log("Unray:  " + msg);
    }

    update_viewport() {
        let gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    // TODO: Need to piece together shaders based on config somehow
    vertex_shader_source() {
        let shader = shader_header + shader_library + default_vertex_shader
        return shader;
    }

    fragment_shader_source() {
        let shader = shader_header + shader_library + default_fragment_shader;
        return shader;
    }

    compile_program() {
        let gl = this.gl;

        let vsSrc = this.vertex_shader_source();
        let fsSrc = this.fragment_shader_source();

        let vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
        let fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);

        // For dynamic link-time location binding
        // TODO: Figure out how to interact with three.js w.r.t. locations (and other resources)
        let locations = {
            //"a_debug": 0,
            //"t_color": 1,
        };

        let program = createProgram(gl, vs, fs, locations);

        return program;
    }

    configureBlending() {
        let gl = this.gl;
        switch (this.config.raymodel)
        {
        case "surface":
            gl.disable(gl.BLEND);
            break;
        case "full":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_DST_ALPHA);
            break;
       case "sum":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.DST_ALPHA, gl.ONE);
            break;
        case "max":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.MAX);
            break;
        case "min":
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.MIN);
            break;
        default:
            console.error("Unknown ray model " + rayModel);
        }
    }

    createElementArrayBuffer() {
        let gl = this.gl;
        let elementArray = new Uint32Array([0,1,2,3,0,1]);
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementArray, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return buffer;
    }

    build_vao() {
        let gl = this.gl;

        // Setup attributes
        this.attributes = {
            "a_debug": {
                // Params named after three.BufferAttribute
                itemSize: 1,
                count: 4,
                array: new Int32Array([0, 0, 0, 0]),
                dynamic: false,
                // Other params 
                location: 0,
                gltype: gl.INT,
                buffer: gl.createBuffer(),
                divisor: 0,
                normalized: false,
                stride: 0,
                offset: 0,
            },
        };

        // TODO: Select relevant subset of attributes
        let attributes = this.attributes;

        // TODO: Upload when data is updated, not when building vao
        // Upload all buffers
        for (let name in attributes) {
            let attr = attributes[name];
            gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
            let drawMode = attr.dynamic ? gl.DYNAMIC_DRAW: gl.STATIC_DRAW;
            gl.bufferData(gl.ARRAY_BUFFER, attr.array, drawMode);
        }

        // Build vao
        let vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // Configure attributes
        for (let name in attributes) {
            let attr = attributes[name];
            gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
            if (attr.gltype === gl.INT || attr.gltype === gl.UNSIGNED_INT) {
                gl.vertexAttribIPointer(attr.location, attr.itemSize, attr.gltype,
                                        attr.stride, attr.offset);
            } else {
                gl.vertexAttribPointer(attr.location, attr.itemSize, attr.gltype,
                                       attr.normalized, attr.stride, attr.offset);
            }
            gl.enableVertexAttribArray(attr.location);
            gl.vertexAttribDivisor(attr.location, attr.divisor);
        }

        // Done setting up vao
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);

        return vao;
    }

    redraw() {
        this.log("redraw");
        console.log(this.config);

        let gl = this.gl;

        // Setup global GL properties and clear canvas
        // TODO: According to config

        gl.disable(gl.DEPTH_TEST);

        gl.enable(gl.CULL_FACE);
        //gl.disable(gl.CULL_FACE);

        this.configureBlending();

        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);


        // FIXME: Organize programs and vaos so we can have
        // more than one and compile/select based on config
        let program = this.compile_program();
        let vao = this.build_vao();

        // FIXME: Get model properties properly
        //let num_tetrahedrons = this.model.num_tetrahedrons;
        let num_tetrahedrons = 2;

        // Apply program to instanced triangle strip
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementArrayBuffer);
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, 6, gl.UNSIGNED_INT, 0, num_tetrahedrons);
    }


    update_config(config) {
        this.log("update_config");
        // TODO: Extract what changed and react to only what's necessary
        let changed = {};
        for (let name in config) {
            if (this.config[name] != config[name]) {
                changed[name] = config[name];
            }
        }
        console.log("Updated config:");
        console.log(changed);
        this.config = _.extend(this.config, config);
    }

    update_coordinates(coordinates) {
        this.log("update_coordinates");
        // FIXME
        //this.model = FIXME;
    }

    update_cells(cells) {
        this.log("update_cells");
        // FIXME
    }

    update_values(values) {
        this.log("update_values");
        // FIXME
    }

};


module.exports = {
    Unray
};
