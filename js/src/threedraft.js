
// TODO: Get blank threejs renderer on screen

// TODO: Write minimal shaders

// TODO: Get tetrahedron on screen

// TODO: Extend shader functionality


const shader_sources = {
    vertex: require("./glsl/vicp-vertex.glsl"),
    fragment: require("./glsl/vicp-fragment.glsl"),
}


const default_channels = {
    cells:        { association: "cell",   dtype: "uint32",  item_size: 4, dynamic: false },
    coordinates:  { association: "vertex", dtype: "float32", item_size: 3, dynamic: false },
    density:      { association: "vertex", dtype: "float32", item_size: 1, dynamic: true },
    emission:     { association: "vertex", dtype: "float32", item_size: 1, dynamic: true },
    density_lut:  { association: "lut",    dtype: "float32", item_size: 1, dynamic: true },
    emission_lut: { association: "lut",    dtype: "float32", item_size: 3, dynamic: true },
};


const default_encoding = {
    cells:        { field: "cells" },
    coordinates:  { field: "coordinates" },
    density:      { field: "density" },
    emission:     { field: "emission" },
    density_lut:  { field: "density_lut" },
    emission_lut: { field: "emission_lut" },
};


// TODO: Configure blend equations
// TODO: Add culling
// TODO: Add defaults to reduce the size of this?
// Note: defines are used as "ifdef FOO" not "if FOO" so the value is irrelevant
const method_properties = {
    surface: {
        transparent: false,
        ordered: false,
        side: THREE.DoubleSide, // TODO: Not necessary, pick side to debug facing issues easily
        defines: {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        },
        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    mip: { // TODO: call it max and min instead?
        transparent: true,
        blending: THREE.CustomBlending,
        blend_equation: THREE.MaxEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,
        ordered: false,
        side: THREE.DoubleSide,
        defines: {},
        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    xray: {
        transparent: true,
        blending: THREE.CustomBlending, // TODO: Configure
        blend_equation: THREE.AddEquation, // TODO: SubtractEquation?
        blend_src: THREE.SrcAlphaFactor,
        blend_dst: THREE.OneMinusDstAlphaFactor,
        ordered: false,
        side: THREE.BackSide,
        defines: {},
        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    splat: { // TODO: 'sum'?
        transparent: true,
        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.OneFactor,  // TODO: Check what THREE.SrcAlphaSaturateFactor does
        blend_dst: THREE.OneFactor,
        ordered: false,
        side: THREE.BackSide,
        defines: {},
        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    cloud: {
        transparent: true,
        blending: THREE.CustomBlending, // TODO: Configure
        blend_equation: THREE.AddEquation,
        blend_src: THREE.SrcAlphaFactor,
        blend_dst: THREE.OneMinusDstAlphaFactor,
        ordered: true,
        side: THREE.BackSide,
        defines: {},
        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
};


function join_defines(defines)
{
    let lines = [];
    for (let name of defines) {
        let value = defines[name];
        if (value === undefined) {
            lines.push(`#define ${name}`);
        } else {
            lines.push(`#define ${name} ${value}`);
        }
    }
    lines.push("");
    return lines.join("\n")
}


function compute_range(array)
{
    let min = array.reduce(Math.min, array[0]);
    let max = array.reduce(Math.max, array[0]);
    let range = max - min;
    let scale = range > 0.0 ? 1.0 / range : 1.0;
    return [min, max, range, scale];
}


function allocate_value(item_size)
{
    let new_value = null;
    switch (item_size)
    {
    case 1:
        return 0.0;
    case 2:
        return THREE.Vector2();
    case 3:
        return THREE.Vector3();
    case 4:
        return THREE.Vector4();
    }
    throw `Invalid item size ${item_size}.`;
}


function compute_texture_shape(size)
{
    let width = (Math.ceil(Math.sqrt(size)) + 3) % 4;
    let height = (Math.ceil(size / width) + 3) % 4;
    if (width * height > size) {
        throw `Texture shape computation failed! size=${size}, width=${width}, height=${height}`;
    }
    return [width, height];
}


const dtype2threetype = {
    float32: THREE.FloatType,
    uint32: THREE.UnsignedIntType,
    int32: THREE.IntType
};


const dtype2arraytype = {
    float32: Float32Array,
    uint32: Uint32Array,
    int32: Int32Array
};


const dtype2threeformat = {
    1: THREE.AlphaFormat,
    3: THREE.RGBFormat,
    4: THREE.RGBAFormat
};


function allocate_array_texture(dtype, item_size, texture_shape)
{
    let arraytype = dtype2arraytype[dtype];
    let size = texture_shape[0] * texture_shape[1] * item_size;
    let padded_data = new arraytype(size);

    let type = dtype2threetype[dtype];
    let format = dtype2threeformat[item_size];

    let texture = new THREE.DataTexture(padded_data,
        texture_shape[0], texture_shape[1],
        format, type);

    return texture;
}


function update_array_texture(texture, data)
{
    texture.data.set(data);
    texture.needsUpdate = true;
}


// TODO: Compute an actual perspective dependent ordering
sort_cells(ordering, cells, coordinates, camera_position)
{
    let v = new THREE.Vector3();
    ordering.sort((i, j) => {
        let c0 = cells[i];
        let c1 = cells[j];
        // FIXME
        for (let k = 0; k < 4; ++k) {
            let x = coordinates[c0[k]];
            let d02 = 0.0;
            for (let r = 0; r < 3; ++3) {
                let dr = x[r] - camera_position[r];
                d2 += dr*dr;
            }
        }
    });
    let num_tetrahedrons = cells.length / 4;
    for (let i = 0; i < num_tetrahedrons; ++i) {
        ordering[i] = i;
    }
}


class Cloud
{
    constructor()
    {
        this.init_shared_topology();
        this.init_uniforms();
        this.init_attributes();
        this.init_meshes();
    }

    init_shared_topology()
    {
        // Setup triangle strip to draw each tetrahedron instance
        // TODO: Check that strip ordering matches 
        this.element_buffer = new THREE.BufferAttribute(new Uint32Array([0, 1, 2, 3, 0, 1]));
        
        // Note: Seems like we need at least one vertex attribute
        // (i.e. per instance vertex) to please some webgl drivers
        // Setup local tetrahedron vertex indices in a pattern relative to each vertex
        // TODO: Arrange these such that normal computations become simpler,
        //   i.e. n0 = normal opposing v0 = v1->v2 x v1->v3 = pointing away from v0
        this.local_vertices_buffer = new THREE.BufferAttribute(new Uint8Array([
            0,   1, 2, 3,
            1,   2, 3, 0,
            2,   3, 0, 1,
            3,   0, 1, 2
        ]));
    }

    init_uniforms()
    {
        // Fill uniforms dict with dummy values
        this.uniforms = {
            // Time and oscillators
            u_time: { value: 0.0 },
            u_oscillators: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },
            // Camera uniforms (threejs provides cameraPosition)
            u_view_direction: new THREE.Vector3(),
            // Input data ranges, 4 values: [min, max, max-min, 1.0/(max-min) or 1]
            u_density_range: { value:  new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
            u_emission_range: { value: new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
            // Texture dimensions
            u_cell_texture_shape: { value: new THREE.Vector2(0, 0) },
            u_vertex_texture_shape: { value: new THREE.Vector2(0, 0) },
            // Cell textures
            t_cells: { value: null },
            // Vertex textures (at least in the current implementation)
            t_coordinates: { value: null },
            t_density: { value: null },
            t_emission: { value: null },
            // LUT textures
            t_density_lut: { value: null },
            t_emission_lut: { value: null },
        };
    }

    init_attributes()
    {
        this.attributes = {
            // Cell attributes
            c_ordering: null, // only if ordered
            c_cells: null,    // only if non-ordered
        };
    }

    init_meshes()
    {
        this.meshes = new Map();
    }

    init(num_tetrahedrons, num_vertices)
    {
        // Expecting dimensions to be set only once,
        // considering that everything must be scrapped
        // when these change
        this.num_tetrahedrons = num_tetrahedrons;
        this.num_vertices = num_vertices;

        // Compute suitable 2D texture shapes large
        // enough to hold this number of values
        this.cell_texture_shape = compute_texture_shape(this.num_tetrahedrons);
        this.vertex_texture_shape = compute_texture_shape(this.num_vertices);

        // Update texture property uniforms
        this.uniforms.u_cell_texture_shape.value.set(...this.cell_texture_shape);
        this.uniforms.u_vertex_texture_shape.value.set(...this.vertex_texture_shape);
    }

    update_ranges(data)
    {
        // Update data ranges
        // TODO: More selective update, maybe in upload()?
        this.uniforms.u_density_range.value.set(...compute_range(data.density));
        this.uniforms.u_emission_range.value.set(...compute_range(data.emission));
    }

    allocate_ordering()
    {
        this.ordering = new Uint32Array(this.num_tetrahedrons);
        for (let i = 0; i < this.num_tetrahedrons; ++i) {
            ordering[i] = i;
        }
        this.attributes.c_ordering = new THREE.InstancedBufferAttribute(this.ordering, 1, 1);
        this.attributes.c_ordering.setDynamic(true);
    }

    update_ordering()
    {
        // TODO: Use this.camera_position, this.view_direction
        sort_cells(this.ordering, this.data.cells, this.data.coordinates);
        this.attributes.c_ordering.needsUpdate = true;
    }

    update_perspective(camera)
    {
        // TODO: When using three.js scenegraph, probably need
        // to distinguish better between model and world coordinates
        // in various places
        camera.getWorldPosition(this.camera_position);
        camera.getWorldDirection(this.uniforms.u_view_direction.value);
        this.update_ordering();
    }

    setup()
    {
        let data = {
            ordering: new Uint32Array(this.num_tetrahedrons),
            cells: new Uint32Array(4 * this.num_tetrahedrons),
            coordinates: new Float32Array(3 * this.num_vertices),
            density: new Float32Array(this.num_vertices),
            emission: new Float32Array(this.num_vertices),
            density_lut: new Float32Array(256),
            emission_lut: new Float32Array(256),
        }
        let method = "surface";


        // Get description of rendering configuration in currently chosen method
        let mp = method_properties[method];

        // Get description of channels in currently chosen method
        let channels = mp.channels;

        // Use default encoding if none is provided
        let encoding = mp.default_encoding;

        // Update input data uniforms
        this.update_ranges();


        // Instanced geometry, each tetrahedron is an instance
        let geometry = new THREE.InstancedBufferGeometry();
        geometry.maxInstancedCount = this.num_tetrahedrons;
        geometry.setIndex(this.element_buffer);
        geometry.addAttribute("a_local_vertices", this.local_vertices_buffer);

        // Allocate
        this.allocate_and_update(null, encoding, channels, mp.ordered, true, false);

        // Upload
        this.allocate_and_update(data, encoding, channels, mp.ordered, false, true);

        // Allocate ordering when first needed
        if (mp.ordered && this.attributes.c_ordering === undefined) {
            this.allocate_ordering();
            this.update_ordering();
        }

        // Setup cells of geometry (using textures or attributes)
        if (mp.ordered) {
            // Need ordering, let ordering be instanced and read cells from texture
            this.geometry.addAttribute("c_ordering", this.attributes.c_ordering);
        } else {
            // Don't need ordering, use cells instanced instead
            // TODO: Add eventual other attributes with cell association here
            this.geometry.addAttribute("c_cells", this.attributes.c_cells);
        }

        // Configure shader
        let material = new THREE.ShaderMaterial({
            // Note: Assuming passing some unused uniforms here will work fine
            // without too much performance penalty, hopefully this is ok
            // as it allows us to share the uniforms dict between methods.
            uniforms: this.uniforms,
            vertexShader: mp.vertex_shader,
            fragmentShader: mp.fragment_shader,
            side: mp.side,
            transparent: mp.transparent
        })

        // Configure blending
        if (mp.blending === THREE.CustomBlending) {
            material.blending = mp.blending;
            material.blendEquation = mp.blend_equation;
            material.blendSrc = mp.blend_src;
            material.blendDst = mp.blend_dst;
        }

        // Apply method #defines to shaders
        // TODO: May also add defines based on encoding if necessary
        _.extend(material.defines, mp.defines);

        // How to use wireframe
        //this.use_wireframe = true;
        if (this.use_wireframe) {
            material.wireframe = true;
            material.wireframeLinewidth = 3;
        }

        // Finally we have a Mesh to render for this method
        let mesh = new THREE.Mesh(geometry, material);
        mesh.setDrawMode(THREE.TriangleStripDrawMode);

        // Not really sure if one mesh per method is a good sharing model,
        // the encoding also affects the above setup
        // but at least this will allow quick switching
        // between methods if nothing else
        this.meshes.set(method, mesh);
    }

    update_time(time)
    {
        this.uniforms.u_time.value = time;
        for (let i=0; i<4; ++i) {
            this.uniforms.u_oscillators[i] = Math.sin((i+1) * Math.PI * this.time);
        }
    }

    _allocate_and_update(data, encoding, channels, ordered, allocate, update)
    {
        // The current implementation assumes:
        // - Each channel has only one possible association

        // Process all passed channels
        for (let channel_name in channels)
        {
            // Get channel description
            let channel = channels[channel_name];
            if (channel === undefined) {
                console.log(`Channel ${channel_name} is missing description.`);
                continue;
            }

            // Get encoding for this channel
            let enc = encoding[channel_name];
            if (enc === undefined) {
                console.log(`No encoding found for channel ${channel_name}.`);
                continue;
            }

            // Get data array
            let array = null;
            if (data) {
                array = data[enc.field];
                if (array === undefined) {
                    console.log(`No data found for field ${enc.field} encoded for channel ${channel_name}.`);
                    continue;
                }
            }

            // Default association in channel, can override in encoding
            let association = enc.association || channel.association;
            switch (association)
            {
            case "uniform":
                if (allocate) {
                    this.uniforms["u_" + channel_name].value = allocate_value(channel.item_size);
                }
                if (update) {
                    this.uniforms["u_" + channel_name].value = array;
                }
                break;
            case "vertex":
                if (allocate) {
                    this.uniforms["t_" + channel_name].value = allocate_array_texture(
                        channel.dtype, channel.item_size, this.vertex_texture_shape);
                }
                if (update) {
                    update_array_texture(this.uniforms["t_" + channel_name].value, array);

                    // Update data range TODO: Option to skip auto-update
                    let range_name = "u_" + channel_name + "_range";
                    if (this.uniforms.hasOwnProperty(range_name)) {
                        this.uniforms[range_name].value.set(...compute_range(array));
                    }
                }
                break;
            case "cell":
                if (allocate) {
                    // TODO: Maybe we want to allocate both for the ordered and unordered case,
                    // to quickly switch between methods e.g. during camera rotation
                    if (ordered) {
                        this.uniforms["t_" + channel_name].value = allocate_array_texture(
                            channel.dtype, channel.item_size, this.cell_texture_shape);
                    } else {
                        // Allocate instanced buffer attribute
                        // TODO: Should we copy the array here?
                        let attrib = new THREE.InstancedBufferAttribute(array, channel.item_size, 1);
                        if (channel.dynamic) {
                            attrib.setDynamic(true);
                        }
                        this.attributes["c_" + channel_name] = attrib;
                    }
                }
                if (update) {
                    if (ordered) {
                        update_array_texture(this.uniforms["t_" + channel_name].value, array);
                    } else {
                        // Update contents of instanced buffer attribute
                        let attrib = this.attributes["c_" + channel_name];
                        attrib.array.set(array);
                        attrib.needsUpdate = true;
                    }
                }
                break;
            case "lut":
                if (allocate) {
                    this.uniforms["t_" + channel_name].value = allocate_array_texture(
                        channel.dtype, channel.item_size, [array.length / channel.item_size, 1]);
                }
                if (update) {
                    update_array_texture(this.uniforms["t_" + channel_name].value, array);
                }
                break;
            }
        }
    }
};


class CloudView
{
    render() {
        let width = 800;
        let height = 600;

        // Setup cloud model FIXME needs data
        this.cloud = new Cloud();
        this.cloud.setup();

        // Setup scene
        this.scene = new THREE.Scene();
		this.scene.add(this.cloud.mesh);

        // Setup camera TODO: Use pythreejs camera and controller
        let near = 1;
        let far = 1000;
		this.camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, near, far);
		this.camera.position.z = 4;

        // TODO: On camera change
        this.cloud.update_perspective(this.camera);

        // Setup renderer
		this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0x000000);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);

        // Add to widget view
        this.el.appendChild(this.renderer.domElement);
    }
}
