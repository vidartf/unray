
// Mirror of THREE.BufferAttribute
class BufferAttribute  // TODO: Use this type of interface mirroring to stay closer to three.js for future coupling?
{
    constructor(array, itemSize) {
        this.array = array;
        this.count = array.length / itemSize;
        this.itemSize = itemSize;
        this.dynamic = false;
    }
}


function createSizedBuffer(gl, size, usage) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, size, usage);
    return buffer;
}


function createAndBufferData(gl, array, usage) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, array, usage);
    return buffer;
}


function createAndBufferTextureData(gl, array, size, usage) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, size, usage);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, array);
    return buffer;
}


function updateBufferData(gl, buffer, array) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, array, usage);
}


function createElementArrayBuffer(gl, elementArray) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementArray, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return buffer;
}


function configureAttrib(gl, program, buffer, name, size, type) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let location = gl.getAttribLocation(program, name);
    if (location < 0) {
        console.log("Failed to configure attribute:");
        console.log("WebGL error: " + gl.getError());
        console.log("Program: " + program);
        console.log("Name: " + name);
        console.log("Loc: " + location);
        console.log("GL errors: ");
    }
    else {
        gl.enableVertexAttribArray(location);
        if (type === gl.INT || type === gl.UNSIGNED_INT) {
            gl.vertexAttribIPointer(location, size, type, 0, 0);
        }
        else {
            gl.vertexAttribPointer(location, size, type, false, 0, 0);
        }
    }
}


function uploadUniforms(gl, program, uniforms) {
    let cameraPositionLocation = gl.getUniformLocation(program, "u_cameraPosition");
    if (cameraPositionLocation != -1) {
        gl.uniform3fv(cameraPositionLocation, uniforms.cameraPosition);
    }

    let viewDirectionLocation = gl.getUniformLocation(program, "u_viewDirection");
    if (viewDirectionLocation != -1) {
        gl.uniform3fv(viewDirectionLocation, uniforms.viewDirection);
    }

    let functionRangeLocation = gl.getUniformLocation(program, "u_functionRange");
    if (functionRangeLocation != -1) {
        gl.uniform3fv(functionRangeLocation, uniforms.functionRange);
    }

    let particleCrossSectionLocation = gl.getUniformLocation(program, "u_particleCrossSection");
    if (particleCrossSectionLocation != -1) {
        gl.uniform1f(particleCrossSectionLocation, uniforms.particleCrossSection);
    }

    let mvpLocation = gl.getUniformLocation(program, "u_mvp");
    if (mvpLocation != -1) {
        gl.uniformMatrix4fv(mvpLocation, false, uniforms.mvp);
    }
    console.log("Uniform locations:");
    console.log("cp:" + cameraPositionLocation + " " + uniforms.cameraPosition);
    console.log("vd:" + viewDirectionLocation + " " + uniforms.viewDirection);
    console.log("fr:" + functionRangeLocation + " " + uniforms.functionRange);
    console.log("ps:" + particleCrossSectionLocation + " " + uniforms.particleCrossSection);
    console.log("mv:" + mvpLocation + " " + uniforms.mvp);
}


// Allocate textures (simplified version, many options not available here)
function createIntegerTexture(gl, unit, buffer, internalFormat, width, height, format, type) {
    let texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    //gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    if (0) {
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, n, n, 0, gl.RG_INTEGER, gl.UNSIGNED_INT, pix)
    } else {
        gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, buffer);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, 0);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    }

    return texture;
}


// Allocate textures (simplified version, many options not available here)
function createTexture(gl, unit, buffer, internalFormat, width, height, format, type) {
    let texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, buffer);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, 0);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    return texture;
}


function chooseTextureSize(N) {
    // Picking the smallest power of 2 (but at least 4) which as the
    // dimension of square sized texture is large enough to hold N values.
    // (It might be faster to use some expression similar to
    // n0 = Math.log2(sqrt(N)) but this loop should work fine
    // and is arguably easier to read.)
    let n0 = 0;
    for (let i = 2; i < 14; ++i) {
        if (Math.pow(2, 2*i) >= N) {
            // 2^i squared is a sufficient texture size
            n0 = Math.pow(2, i);
            break;
        }
    }
    // Find second dimension sufficient for a rectangular texture
    let n1 = 0;
    for (let i = 2; i < 14; ++i) {
        if (n0 * Math.pow(2, i) >= N) {
            // n0 x 2^i is a sufficient texture size
            n1 = Math.pow(2, i);
            break;
        }
    }
    // TODO: Do something a bit smarter here
    // Validate our computed dimensions
    if (n0 * n1 < N) {
        throw "Computed texture size is too small.";
    }
    return [n0, n1];
}


// FIXME: Extract parts from this prototype code that we want
function setup(gl) {

    // Configure size and background
    //webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.enable(gl.BLEND);
    //gl.enable(gl.DEPTH_TEST);

    // Generate shader sources
    let shaders = generateShaders();

    // Compile programs
    let programs = compilePrograms(gl, shaders);

    // Create VAOs for each program
    let vaos = {
        cellVao: gl.createVertexArray(),
        vertexVao: gl.createVertexArray()
    };

    // Collect state in global volren object
    // (for now, figure out better design later)
    let volren = {}
    volren.gl = gl;
    volren.programs = programs;
    volren.vaos = vaos;
    volren.config = {
        rayModel: "dvr",
    };

    // Create test model emulating user input
    volren.model = createTestModel1();
    console.log(volren.model);

    // Create buffers for uploading model to GPU

    // Compute texture sizes from number of tetrahedrons and vertices
    //let NC = volren.model.num_tetrahedrons;
    //let NV = volren.model.num_vertices;
    let [cellTexWidth, cellTexHeight] = chooseTextureSize(volren.model.num_tetrahedrons);
    let [vertexTexWidth, vertexTexHeight] = chooseTextureSize(volren.model.num_vertices);

    // FIXME: Need to increase the size of the actual data arrays to upload to texture...
    cellTexWidth *= cellTexHeight;  cellTexHeight = 1;  // This will only work for small data
    vertexTexWidth *= vertexTexHeight;  vertexTexHeight = 1;  // This will only work for small data

    let NC = volren.model.num_tetrahedrons;
    let numCellTexels = cellTexWidth * cellTexHeight;
    let numVertexTexels = vertexTexWidth * vertexTexHeight;
    let sz = 4; // sizeof float or int

    volren.buffers = {
        // Upload user provided data (tex_ = texture buffers only, data per original vertex)
        tex_vertices: createAndBufferTextureData(gl, volren.model.vertices,
            3*numVertexTexels*sz, gl.STATIC_DRAW),
        tex_cells: createAndBufferTextureData(gl, volren.model.cells,
            4*numCellTexels*sz, gl.STATIC_DRAW),
        tex_functionValues: createAndBufferTextureData(gl, volren.model.functionValues,
            1*numVertexTexels*sz, gl.DYNAMIC_DRAW),
        cellIndex: createAndBufferData(gl, volren.model.cellOrdering, gl.DYNAMIC_DRAW),

        // Allocate space on GPU for cell/vertex attribute buffers without uploading anything
        tex_functionGradient: createSizedBuffer(gl,
            3*numCellTexels*sz, gl.STATIC_DRAW),
        rayLengths: createSizedBuffer(gl,
            4*NC*sz, gl.DYNAMIC_DRAW),
        cellVertIndex: createSizedBuffer(gl,
            4*NC*sz, gl.DYNAMIC_DRAW),

        // Lookup tables
        tex_densityLUT: createAndBufferData(gl, volren.model.densityLUT, gl.DYNAMIC_DRAW),
        tex_emissionLUT: createAndBufferData(gl, volren.model.emissionLUT, gl.DYNAMIC_DRAW),
    };

    volren.textures = {
    };

    // Build the facet elements buffer
    volren.elementArray = computeElementArrayIndices(NC);
    volren.elementArrayBuffer = createElementArrayBuffer(gl, volren.elementArray);

    // Define uniforms
    volren.uniforms = {
        mvp: new Float32Array([
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        ]),
        cameraPosition: new Float32Array([0.0, 0.0, -10.0]),  // FIXME: This is suspect
        viewDirection: new Float32Array([0.0, 0.0, 1.0]),
        particleCrossSection: 1.0,
        functionRange: new Float32Array([0.0, 1.0, 1.0 / (1.0 - 0.0)]),
    };

    // Create textures
    let cellsTexture = createIntegerTexture(gl, 0, volren.buffers.tex_cells,
        gl.RGBA32UI, cellTexWidth, cellTexHeight, gl.RGBA_INTEGER, gl.UNSIGNED_INT);
    let verticesTexture = createTexture(gl, 1, volren.buffers.tex_vertices,
        gl.RGB32F, vertexTexWidth, vertexTexHeight, gl.RGB, gl.FLOAT);
    let functionValuesTexture = createTexture(gl, 2, volren.buffers.tex_functionValues,
        gl.R32F, vertexTexWidth, vertexTexHeight, gl.RED, gl.FLOAT);
    let functionGradientTexture = createTexture(gl, 3, volren.buffers.tex_functionGradient,
        gl.RGB32F, cellTexWidth, cellTexHeight, gl.RGB, gl.FLOAT);

    let lutWidth = volren.model.densityLUT.length;
    let densityTexture = createTexture(gl, 4, volren.buffers.tex_densityLUT,
        gl.R32F, lutWidth, 1, gl.RED, gl.FLOAT);
    let emissionTexture = createTexture(gl, 5, volren.buffers.tex_emissionLUT,
        gl.RGB32F, lutWidth, 1, gl.RGB, gl.FLOAT);

    // Setup feedback transform stuff FIXME: validate
    console.log("Configuring cell program...");
    program = volren.programs.cellProgram;
    vao = volren.vaos.cellVao;
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    uploadUniforms(gl, program, volren.uniforms);
    // Configure textures for cell program
    let cellsTextureLocation2 = gl.getUniformLocation(program, "u_cells")
    gl.uniform1i(cellsTextureLocation2, 0);
    let verticesTextureLocation2 = gl.getUniformLocation(program, "u_vertices")
    gl.uniform1i(verticesTextureLocation2, 1);
    let functionValuesTextureLocation2 = gl.getUniformLocation(program, "u_functionValues")
    gl.uniform1i(functionValuesTextureLocation2, 2);
    // Configure attributes for cell program
    configureAttrib(gl, program, volren.buffers.cellIndex,
            "a_cellIndex", 1, gl.INT);

    // Configure transform feedback stuff for cell shader FIXME: Validate
    let transformFeedback = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, volren.buffers.cellVertIndex);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, volren.buffers.rayLengths);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, volren.buffers.tex_functionGradient);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, volren.model.num_tetrahedrons);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // Select program and vao to configure attributes
    console.log("Configuring vertex program...");
    program = volren.programs.vertexProgram;
    vao = volren.vaos.vertexVao;
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    uploadUniforms(gl, program, volren.uniforms);
    // Configure textures for vertex program
    let cellsTextureLocation = gl.getUniformLocation(program, "u_cells")
    gl.uniform1i(cellsTextureLocation, 0);
    let verticesTextureLocation = gl.getUniformLocation(program, "u_vertices")
    gl.uniform1i(verticesTextureLocation, 1);
    let functionValuesTextureLocation = gl.getUniformLocation(program, "u_functionValues")
    gl.uniform1i(functionValuesTextureLocation, 2);
    let functionGradientsTextureLocation = gl.getUniformLocation(program, "u_functionGradients")
    gl.uniform1i(functionGradientsTextureLocation, 3);
    let densityLUTTextureLocation = gl.getUniformLocation(program, "u_densityLUT")
    gl.uniform1i(densityLUTTextureLocation, 4);
    let emissionLUTTextureLocation = gl.getUniformLocation(program, "u_emissionLUT")
    gl.uniform1i(emissionLUTTextureLocation, 5);
    // Configure attributes for vertex program
    configureAttrib(gl, program, volren.buffers.rayLengths,
        "a_rayLength", 1, gl.FLOAT);
    configureAttrib(gl, program, volren.buffers.cellVertIndex,
        "a_cellVertIndex", 1, gl.INT);

    console.log("Done configuring programs...");


    // Future contents of render():

    // Draw triangles
    configureBlendEquation(gl, volren.config.rayModel);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(volren.programs.vertexProgram);
    gl.bindVertexArray(volren.vaos.vertexVao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, volren.elementArrayBuffer);

    //gl.lineWidth(10.0);
    //gl.drawArrays(gl.LINE_LOOP, 0, 4); // FIXME: Only shows line from (-1,0) to (0,0)?

    gl.drawElementsInstanced(gl.TRIANGLE_STRIP, 6, gl.UNSIGNED_INT, 0, volren.model.num_tetrahedrons);

    // Return context
    return volren;
}




// TODO: Port the parts of this shader that we want
let old_cell_shader = shader_header + shader_library + `

// Contains vertex indices for each tetrahedron
uniform isampler2D u_cells;

// Contains coordinates for each vertex of the tetrahedron mesh
uniform sampler2D u_vertices;

// Contains function values for each vertex of the tetrahedron mesh
uniform sampler2D u_functionValues;

// Camera position used to compute view direction with perspective projection
uniform vec3 u_cameraPosition;

// Camera view direction with orthographic projection
//uniform vec3 u_viewDirection;

// Cell index taken from cell ordering
in int a_cellIndex;

// Output variable: Packed cell index and local vertex index for each vertex in tetrahedron
flat out ivec4 f_cellVertIndex;

// Output variable: ray length from vertex to opposing face for each vertex in tetrahedron
flat out vec4 f_rayLengths;

// Output variable: function gradient for each tetrahedron
flat out vec3 f_functionGradient;

void main()
{
    // Get vertex indices of cell
    ivec2 cellsTextureSize = textureSize(u_cells, 0);
    ivec2 cellPos = texelFetchCoord(a_cellIndex, cellsTextureSize);
    ivec4 vertexIndex = texelFetch(u_cells, cellPos, 0);

    // Pack cell index and local vertex index in one int
    // FIXME: Not necessary with instancing, since gl_VertexID will be the local vertex id
    for (int i = 0; i < 4; ++i) {
        f_cellVertIndex[i] = a_cellIndex | (i << VERTEX_BITSHIFT);
    }

    // Get vertex coordinates of cell
    ivec2 coordsTextureSize = textureSize(u_vertices, 0);
    vec3 coords[4];
    vec4 functionValues;
    for (int i = 0; i < 4; ++i)
    {
        ivec2 vertexPos = texelFetchCoord(vertexIndex[i], coordsTextureSize);
        coords[i] = texelFetch(u_vertices, vertexPos, 0).xyz;
        functionValues[i] = texelFetch(u_functionValues, vertexPos, 0).x;
    }

    // Compute gradient
    f_functionGradient = computeTetGradient(coords, functionValues);

    // Compute plane equations
    mat4x3 normals = computeTetNormals(coords);
    f_rayLengths = computeTetRayLengths(coords, u_cameraPosition, normals);

    // FIXME: Store vec4(normal, dot(normal, edge)) for each face instead,
    //   can then compute rayLengths for a specific viewpoint in vertex shader
    //f_normals = N;
}

`



// TODO: Port the parts of this shader that we want
let old_vertex_shader = shader_header + shader_library + `
// Uniforms
uniform mat4 u_mvp;     // MVP matrix

// Texture samplers
uniform isampler2D u_cells;            // Vertex indices for each tetrahedron
uniform sampler2D u_vertices;          // Vertex coordinates for each vertex of the tetrahedron mesh
uniform sampler2D u_functionValues;    // Function values for each vertex of the tetrahedron mesh
uniform sampler2D u_functionGradients; // Function gradient for each tetrahedron

// Vertex attributes
in float a_rayLength;        // Ray lengths to each face of tetrahedron
in int a_cellVertIndex;      // Packed tetrahedron cell index and local vertex index

// Varyings
out vec3 v_position;               // Position in model space coordinates
out vec4 v_rayLengths;             // Ray lengths to each face of tetrahedron
out float v_functionValue;         // Value of function
flat out vec3 v_functionGradient;  // Gradient of f on tetrahedron

out float v_debug; // Debugging variable

void main()
{
    // Unpack cell index and local vertex index from one int
    int cellIndex = a_cellVertIndex & ((1 << VERTEX_BITSHIFT) - 1);
    int localVertexIndex = a_cellVertIndex >> VERTEX_BITSHIFT;

    // Map index to 2D position for texture lookup
    ivec2 cellsTextureSize = textureSize(u_cells, 0);
    ivec2 cellPos = texelFetchCoord(cellIndex, cellsTextureSize);

    // DEBUGGING:
    // Validated:
    // cellIndex
    // localVertexIndex

    // Get global vertex index
    ivec4 verticesOfCell = texelFetch(u_cells, cellPos, 0);
    int globalVertexIndex = verticesOfCell[localVertexIndex];

    // Map vertex index to 2D position for texture lookup
    ivec2 vertexPos = texelFetchCoord(globalVertexIndex,
        textureSize(u_vertices, 0));

    // Fetch position and function value in vertex from textures
    v_position = texelFetch(u_vertices, vertexPos, 0).xyz;
    v_functionValue = texelFetch(u_functionValues, vertexPos, 0).x;

    // Get function gradient for this tetrahedron
    v_functionGradient = texelFetch(u_functionGradients, cellPos, 0).xyz;

    // Place scalar raylength from vertex to opposing
    // face in the corresponing vector entry
    v_rayLengths = vec4(0.0f);
    v_rayLengths[localVertexIndex] = a_rayLength;


    // Debugging
#if 0
    // Setting position from this "mesh" is guaranteed to be inside the viewport
    // and the visual result confirms that cellindex and localvertexindex is correct.
    mat4x3 mesh = mat4x3(
        -1.0,  0.0, 0.0,
         0.0, -1.0, 0.0,
        +1.0,  0.0, 0.0,
         0.0, +1.0, 1.0
        //0.5, 0.5, 0.5
    );
    v_position = vec3(0.2*float(cellIndex)) + mesh[localVertexIndex].xyz;

    // All these are correct:
    v_debug = cellsTextureSize == ivec2(16, 1) ? 1.0: 0.0;  // true for all vertices
    v_debug = cellPos == ivec2(0, 0) ? 1.0: 0.0; // true for all vertices
    v_debug = cellIndex == 0 ? 1.0: 0.0;  // true for all vertices
    v_debug = localVertexIndex == 0 ? 1.0: 0.0;  // varies 0...3 for vertices
    v_debug = verticesOfCell == ivec4(0,1,2,3) ? 1.0: 0.0;  // true for all vertices in first cell

    /*
    int k = 0;  // Changing this from 0..3 shows that...
    vec4 color = vec4(0.0f);
    color[k] = 1.0f;
    v_debug = color[localVertexIndex];  // localVertexIndex is correct
    */

    /* This is also correct now:
    int found = 0;
    v_debug = 0.0f; //float(globalVertexIndex - localVertexIndex);
    for (int i=0; i<4; ++i)
    {
        if (globalVertexIndex == verticesOfCell[i])
        {
            found++;
        }
    }
    v_debug = found == 1 ? 1.0f: 0.0f;
    */

#endif

    // Map vertex coordinate to clip space
    //gl_Position = vec4(v_position, 1.0f);
    gl_Position = u_mvp * vec4(v_position, 1.0f);
}
`



// TODO: Port the parts of this shader that we want
let old_fragment_shader = shader_header + shader_library + `
// Camera position used to compute view direction with perspective projection
uniform vec3 u_cameraPosition;

// Camera view direction with orthographic projection
//uniform vec3 u_viewDirection;

// Particle cross section to scale density with to get extinction
uniform float u_particleCrossSection;

// Min/max values of function, .x=min, .y=max, .z=1/(max-min) or 1 if equal
uniform vec3 u_functionRange;

// Lookup table for density
uniform sampler2D u_densityLUT;

// Lookup table for emission color
uniform sampler2D u_emissionLUT;

// Lookup table for emission color (rgb) and density (a)
//uniform sampler2D u_emissionDensityLUT

// Varyings, interpolated on the rasterized front face currently drawn
in vec3 v_position;               // Position in model space coordinates
in vec4 v_rayLengths;             // Ray lengths to each face of tetrahedron
in float v_functionValue;         // Value of function
flat in vec3 v_functionGradient;  // Gradient of f on tetrahedron

in float v_debug; // Debugging variable

// Final result
out vec4 fragColor;

void main()
{
    // View direction through this fragment for perspective projected camera
    vec3 viewDirection = normalize(v_position - u_cameraPosition);

    // View direction through this fragment for orthographic projection camera
    //vec3 viewDirection = u_viewDirection;


    // Look for smallest positive ray length
    float depth = smallestPositive(v_rayLengths); // FIXME: Doesnt seem to work


    // Compute function values at entry and exit points of ray
    vec2 f = computeFunctionValues(
        v_functionValue, v_functionGradient,
        depth, viewDirection);

    // Map function values to [0,1] range
    f = mapToRange(f, u_functionRange);


    // Use combined lookup table favg -> (emission, extinction)
    /*
    float favg = 0.5f * (f.x + f.y);

    vec4 value = texture(u_emissionDensityLUT, vec2(favg, 0.5f));
    vec3 emission = value.rgb;
    float extinction = u_particleCrossSection * value.a;

    //vec4 ee = lookup_ee(favg, u_emissionDensityLUT, u_particleCrossSection);
    */

    // Use lookup tables to map (depth, f0, f1) to extinction and emission:
    /*
    // Use combined lookup table f -> (emission, extinction)
    vec4 value0 = texture(u_emissionDensityLUT, vec2(f0, 0.5f));
    vec4 value1 = texture(u_emissionDensityLUT, vec2(f1, 0.5f));
    vec3 emission0 = value0.rgb;
    vec3 emission1 = value1.rgb;
    float extinction0 = u_particleCrossSection * value0.a;
    float extinction1 = u_particleCrossSection * value1.a;
    // Compute averages on ray segment
    vec3 emission = mix(emission0, emission1, 0.5f);
    float extinction = mix(extinction0, extinction1, 0.5f);

    //vec4 ee = lookup_ee(f, u_emissionDensityLUT, u_particleCrossSection);
    */

    // Use separate lookup tables f -> emission, g -> extinction
    ///*
    vec2 g = f;
    vec3 emission0 = texture(u_emissionLUT, vec2(f.x, 0.5f)).rgb;
    vec3 emission1 = texture(u_emissionLUT, vec2(f.y, 0.5f)).rgb;
    float extinction0 = u_particleCrossSection * texture(u_densityLUT, vec2(g.x, 0.5f)).a;
    float extinction1 = u_particleCrossSection * texture(u_densityLUT, vec2(g.y, 0.5f)).a;
    // Compute averages on ray segment
    vec3 emission = mix(emission0, emission1, 0.5f);
    float extinction = mix(extinction0, extinction1, 0.5f);

    //vec4 ee = lookup_ee(f, g, u_emissionDensityLUT, u_particleCrossSection);
    //*/

    // Alternative models:
    // - No lookup, emission and extinction both constant
    // - Lookup only emission, extinction a constant rate
    // - Lookup only extinction, emission a constant color
    // - Lookup both emission and extinction in one LUT
    // - Lookup emission and extinction in separate LUTs
    //   using separate functions: f -> emission, g -> extinction

    // Alternative LUT organization:
    // - Lookup once using favg
    //vec4 value = texture(u_emissionDensityLUT, vec2(0.5f*(f0+f1), 0.5f));
    // - Lookup at endpoints
    //vec4 value0 = texture(u_emissionDensityLUT, vec2(f0, 0.5f));
    //vec4 value1 = texture(u_emissionDensityLUT, vec2(f1, 0.5f));
    // - Lookup in 2D texture using (f0, f1)
    //vec4 value = texture(u_emissionDensityLUT, vec2(f0, f1));


    // Apply piecewise constant ray integration model
    vec4 C = integrate_constant_ray(depth, emission, extinction);

    // Debugging:
    if (depth == 0.0f) {
        C.r = 0.0f;
        C.b = 0.0f;
    }
    //if (abs(v_debug) > 0.0f) C.g = 1.0f;
    C.g = v_debug;
    C.a = 1.0f; // ensure it's not transparent

    fragColor = C;
}
`


// Initial draft of a volumetric model class.
// This will need to accomodate missing cellOrdering,
// missing function values, additional function values,
// and partial updates.
class VolumeModel  // TODO: From previous code, currently unused, do we need this abstraction?
{
    constructor(vertices, cells, cellOrdering, functionValues) {
        this.vertices = vertices,
        this.cells = cells;
        this.cellOrdering = cellOrdering;
        this.functionValues = functionValues;
        this.num_tetrahedrons = Math.floor(cells.length / 4);
        this.num_vertices = Math.floor(vertices.length / 3);

        let num_triangle_vertices = this.num_tetrahedrons * 4;
        if (cells.length !== 4 * this.num_tetrahedrons) {
            throw "Invalid dimensions.";
        }
        if (vertices.length !== 3 * this.num_vertices) {
            throw "Invalid dimensions.";
        }
        if (cellOrdering.length !== this.num_tetrahedrons) {
            throw "Invalid dimensions.";
        }
        if (functionValues.length !== this.num_vertices) {
            throw "Invalid dimensions.";
        }

        // Mock lookup tables
        let lutWidth = 512;
        this.densityLUT = new Float32Array(lutWidth);
        this.emissionLUT = new Float32Array(3*lutWidth);
        for (let i=0; i<lutWidth; ++i) {
            s = i / (lutWidth-1);
            this.densityLUT[i] = 0.3 + 0.7*s;
            this.emissionLUT[3*i + 0] = s;
            this.emissionLUT[3*i + 1] = 1.0 - s;
            this.emissionLUT[3*i + 2] = 0.0;
        }
    }
};


// Create test model with unstructured tetrahedral mesh data
function createTestModel1() {
    let vertices = new Float32Array([
        -1.0,  0.0, 0.0,
         0.0, -1.0, 0.0,
        +1.0,  0.0, 0.0,
         0.0, +1.0, 1.0
         /*
        0.5, 0.5, 0.5,
        0.0, 0.0, 1.0,
        0.0, 1.0, 0.0,
        1.0, 0.0, 0.0,
        */
    ]);
    let cells = new Uint32Array([
        0, 1, 2, 3
    ]);
    let cellOrdering = new Uint32Array([
        0
    ]);
    let functionValues = new Float32Array([
        0.1, 0.2, 0.3, 0.4
    ]);
    return new VolumeModel(vertices, cells, cellOrdering, functionValues);
}


function createTestModel2() {
    let vertices = new Float32Array([
        -1.0, 0.0, 0.0,
        0.0, 0.0, -1.0,
        0.0, -1.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, -1.0, -1.0,
    ]);
    let cells = new Uint32Array([
        0, 1, 2, 3,
        1, 2, 3, 4,
    ]);
    let cellOrdering = new Uint32Array([
        1, 0
    ]);
    let functionValues = new Float32Array([
        0.1, 0.2, 0.5, 0.8, 1.0
    ]);
    return new VolumeModel(vertices, cells, cellOrdering, functionValues);
}


module.exports = {
};
