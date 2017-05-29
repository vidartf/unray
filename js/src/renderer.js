'use strict';

var _ = require('underscore');
var THREE = require('three');

// TODO: Get blank threejs renderer on screen

// TODO: Write minimal shaders

// TODO: Get tetrahedron on screen

// TODO: Extend shader functionality


const shader_sources = {
    vertex: require("./glsl/vicp-vertex.glsl"),
    fragment: require("./glsl/vicp-fragment.glsl"),
}


const default_channels = {
    cells:        { association: "cell",   dtype: "int32",   item_size: 4, dynamic: false },
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
const default_defines = {
    // Always need cell ordering array with
    // webgl1 because gl_InstanceID is not available
    ENABLE_CELL_ORDERING: 1,
};
const method_properties = {
    surface: {
        transparent: false,
        ordered: false,
        side: THREE.DoubleSide, // TODO: Not necessary, pick side to debug facing issues easily
        defines: _.extend({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        }),
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
        defines: _.extend({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        }),
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
        defines: _.extend({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        }),
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
        defines: _.extend({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        }),
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
        defines: _.extend({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        }),
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
    if (size <= 0) {
        throw `Expecting a positive size, got ${size}.`;
    }
    let width = Math.pow(2, Math.floor(Math.log2(size) / 2));
    let height = Math.ceil(size / width);
    if (width * height < size) {
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
    try {
        texture.image.data.set(data);
    } catch(e) {
        console.error("failed to update texture");
    }
    texture.needsUpdate = true;
}


function sort_cells(ordering, cells, coordinates, camera_position, view_direction)
{
    /*
    let num_tetrahedrons = cells.length / 4;
    for (let i = 0; i < num_tetrahedrons; ++i) {
        ordering[i] = i;
    }
    */

    // TODO: Compute a better perspective dependent ordering using topology

    // Naively sort by smallest distance to camera
    ordering.sort((i, j) => {
        let min_dist = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
        let indices = [i, j];
        for (let r = 0; r < 2; ++r) {
            let local_vertices = cells[indices[r]]
            for (let k = 0; k < 4; ++k) {
                let offset = 3*local_vertices[k];
                let dist = 0.0;
                for (let s = 0; s < 3; ++s) {
                    let dx = coordinates[offset+s] - camera_position[s];
                    // With orthographic camera and constant view direction
                    dist += view_direction[s] * dx;
                    // With perspective camera, use only distance to camera
                    //dist += dx*dx;
                }
                // Take distance from vertex with smallest distance
                // (could also use midpoint)
                min_dist[r] = Math.min(dist, min_dist[r]);
            }
        }
        if (min_dist[0] == min_dist[1]) {
            return 0;
        } else if (min_dist[0] < min_dist[1]) {
            return -1;
        } else {
            return +1;
        }
    });
}


class TetrahedralMeshRenderer
{
    constructor()
    {
        this._init_shared_topology();
        this._init_uniforms();
        this._init_attributes();
        this._init_meshes();
    }

    _init_shared_topology()
    {
        // Setup triangle strip to draw each tetrahedron instance
        // TODO: Check that strip ordering matches 
        this.element_buffer = new THREE.BufferAttribute(new Uint8Array([0, 1, 2, 3, 0, 1]));
        
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

    _init_uniforms()
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

    _init_attributes()
    {
        this.attributes = {
            // Cell attributes
            c_ordering: null, // only if ordered
            c_cells: null,    // only if non-ordered
        };
    }

    _init_meshes()
    {
        this.meshes = new Map();
        this.encodings = new Map();
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

    // Update data ranges, also done automatically during update_data
    update_ranges(data)
    {
        this.uniforms.u_density_range.value.set(...compute_range(data.density));
        this.uniforms.u_emission_range.value.set(...compute_range(data.emission));
    }

    allocate_ordering()
    {
        // Initialize ordering array with contiguous indices
        this.ordering = new Int32Array(this.num_tetrahedrons);
        for (let i = 0; i < this.num_tetrahedrons; ++i) {
            ordering[i] = i;
        }
        this.attributes.c_ordering = new THREE.InstancedBufferAttribute(this.ordering, 1, 1);
        this.attributes.c_ordering.setDynamic(true);
    }

    update_perspective(camera)
    {
        // TODO: When using three.js scenegraph, probably need
        // to distinguish better between model and world coordinates
        // in various places
        //camera.getWorldPosition(this.camera_position);
        camera.getWorldDirection(this.uniforms.u_view_direction.value);

        // TODO: Enable and improve sorting when other methods are working
        if (0) {
            sort_cells(this.ordering, this.data.cells, this.data.coordinates,
                    this.uniforms.u_view_direction.value);
            this.attributes.c_ordering.needsUpdate = true;
        }
    }

    update_time(time)
    {
        this.uniforms.u_time.value = time;
        for (let i=0; i<4; ++i) {
            this.uniforms.u_oscillators[i] = Math.sin((i+1) * Math.PI * this.time);
        }
    }

    // Upload data, assuming method has been configured
    upload(data, method)
    {
        let mp = method_properties[method];
        let encoding = this.encodings.get(method);
        this._allocate_and_update(data, encoding, mp.channels, mp.ordered, false, true);
    }

    _create_geometry(ordered)
    {
        let geometry = new THREE.InstancedBufferGeometry();
        geometry.maxInstancedCount = this.num_tetrahedrons;
        geometry.setIndex(this.element_buffer);
        geometry.addAttribute("a_local_vertices", this.local_vertices_buffer);

        // Setup cells of geometry (using textures or attributes)
        if (ordered) {
            // Allocate ordering when first needed
            if (this.attributes.c_ordering === null) {
                this.allocate_ordering();
            }
            // Need ordering, let ordering be instanced and read cells from texture
            geometry.addAttribute("c_ordering", this.attributes.c_ordering);
        } else {
            if (this.attributes.c_cells === null) {
                console.error(`Haven't allocated cells yet!`);
                // Don't need ordering, use cells instanced instead
                // TODO: Add eventual other attributes with cell association here
                geometry.addAttribute("c_cells", this.attributes.c_cells);
            }
        }
        return geometry
    }

    _create_material(mp)
    {
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
        // TODO: Dependency graph for defines? Not worth spending to much time on.
        material.defines = mp.defines;

        //material.extensions = {};

        return material;
    }

    // TODO: not sure what happens if this is called twice right now, even with different methods.
    configure(method, encoding)
    {
        // Get description of rendering configuration in currently chosen method
        let mp = method_properties[method];

        // Use default encoding if none is provided
        encoding = encoding || mp.default_encoding;

        // Allocate various textures and buffers
        this._allocate_and_update(null, encoding, mp.channels, mp.ordered, true, false);

        // Configure instanced geometry, each tetrahedron is an instance
        let geometry = this._create_geometry(mp.ordered);

        // Configure material (shader)
        let material = this._create_material(mp);

        // How to use wireframe
        //this.use_wireframe = true;
        // if (this.use_wireframe) {
        //     material.wireframe = true;
        //     material.wireframeLinewidth = 3;
        // }

        // Finally we have a Mesh to render for this method
        let mesh = new THREE.Mesh(geometry, material);
        mesh.setDrawMode(THREE.TriangleStripDrawMode);

        // Not really sure if one mesh per method is a good sharing model,
        // the encoding also affects the above setup
        // but at least this will allow quick switching
        // between methods if nothing else
        this.meshes.set(method, mesh);

        // Store encoding for future uploads
        this.encodings.set(method, encoding);
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
                    }
                }
                if (update) {
                    if (ordered) {
                        update_array_texture(this.uniforms["t_" + channel_name].value, array);
                    } else {
                        let attrib = this.attributes["c_" + channel_name];
                        if (attrib === null) {
                            // Allocate instanced buffer attribute
                            // TODO: Should we copy the array here?
                            attrib = new THREE.InstancedBufferAttribute(array, channel.item_size, 1);
                            if (channel.dynamic) {
                                attrib.setDynamic(true);
                            }
                            this.attributes["c_" + channel_name] = attrib;

                            // FIXME: Hack! The data flow here is not very nice.
                            this.meshes.get("surface").geometry.addAttribute("c_" + channel_name, attrib);
                        } else {
                            // Update contents of instanced buffer attribute
                            attrib.array.set(array);
                            attrib.needsUpdate = true;
                        }
                    }
                }
                break;
            case "lut":
                if (allocate) {
                }
                if (update) {
                    let uniform = this.uniforms["t_" + channel_name];
                    if (uniform.value === null) {
                        uniform.value = allocate_array_texture(
                            channel.dtype, channel.item_size, [array.length / channel.item_size, 1]);
                    } else {
                        update_array_texture(uniform.value, array);
                    }
                }
                break;
            }
        }
    }
};

module.exports = {
    TetrahedralMeshRenderer
};
