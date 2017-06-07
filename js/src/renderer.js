'use strict';

var _ = require('underscore');
var THREE = require('three');

// TODO: Get blank threejs renderer on screen

// TODO: Write minimal shaders

// TODO: Get tetrahedron on screen

// TODO: Extend shader functionality

//var debug = _.bind(console.log, console);
var debug = function() {}


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


// FIXME: Figure out backside culling!
// this.renderer.setFaceCulling(THREE.CullFaceBack, THREE.FrontFaceDirectionCW);
// this.renderer.setFaceCulling(THREE.CullFaceBack, THREE.FrontFaceDirectionCCW);
// this.renderer.setFaceCulling(THREE.CullFaceFront, THREE.FrontFaceDirectionCW);
// this.renderer.setFaceCulling(THREE.CullFaceFront, THREE.FrontFaceDirectionCCW);

// TODO: Define channels for all methods.
// TODO: Configure blend equations for all methods
// TODO: Let defines follow from channels, encoding, and possibly data.

// Note: defines are used as "ifdef FOO" not "if FOO" so the value is irrelevant
const default_defines = {
    // Always need cell ordering array with
    // webgl1 because gl_InstanceID is not available
    ENABLE_CELL_ORDERING: 1,
};

const method_properties = {
    surface: {
        sorted: false,
        transparent: false,

        // FIXME: Pick side to see which sides the tetrahedron show and adjust strip etc
        // side: THREE.FrontSide,
        side: THREE.BackSide,
        // side: THREE.DoubleSide,

        defines: _.extend({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    max: {
        sorted: false,
        transparent: true,

        // Rendering both sides automatically includes the
        // backside boundary of the mesh at cost of doubling
        // the number of faces.
        side: THREE.DoubleSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MaxEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_MAX_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    min: {
        sorted: false,
        transparent: true,

        // Rendering both sides automatically includes the
        // backside boundary of the mesh at cost of doubling
        // the number of faces.
        side: THREE.DoubleSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MinEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_MIN_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    xray: {
        sorted: false,
        transparent: true,

        side: THREE.FrontSide,  // FIXME: Use side chosen after working on surface

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation, // TODO: SubtractEquation?
        blend_src: THREE.SrcAlphaFactor,  // FIXME: Consider if this is correct
        blend_dst: THREE.OneMinusDstAlphaFactor,  // FIXME: Consider if this is correct

        defines: _.extend({}, default_defines, {
            ENABLE_XRAY_MODEL: 1,
            ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here?
            ENABLE_DENSITY_BACK: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    sum: {
        sorted: false,
        transparent: true,

        side: THREE.FrontSide,  // FIXME: Use side chosen after working on surface

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.OneFactor,  // TODO: Check what THREE.SrcAlphaSaturateFactor does
        blend_dst: THREE.OneFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_SUM_MODEL: 1,
            ENABLE_EMISSION: 1,        // TODO: It might make sense to use emission OR density here?
            ENABLE_EMISSION_BACK: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    volume: {
        sorted: true,
        transparent: true,

        side: THREE.FrontSide,  // FIXME: Use side chosen after working on surface

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.SrcAlphaFactor, // TODO: Configure
        blend_dst: THREE.OneMinusDstAlphaFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_VOLUME_MODEL: 1,
            ENABLE_DENSITY: 1,      // TODO: All combinations of density/emission with/without backside are valid.
            ENABLE_EMISSION: 1,
            ENABLE_DENSITY_BACK: 1,
            ENABLE_EMISSION_BACK: 1,
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
    let min = array[0];
    let max = array[0];
    for (let v of array) {
        min = Math.min(min, v);
        max = Math.max(max, v);
    }
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
    let size = texture_shape[0] * texture_shape[1] * item_size;

    // Textures using Int32Array and Uint32Array require webgl2,
    // so currently just ignoring the dtype during prototyping.
    // Some redesign may be in order once the prototype is working,
    // or maybe porting to webgl2.
    // let arraytype = dtype2arraytype[dtype];
    // let padded_data = new arraytype(size);
    // let type = dtype2threetype[dtype];

    let padded_data = new Float32Array(size);
    let type = dtype2threetype["float32"];

    let format = dtype2threeformat[item_size];

    debug(`Creating texture for dtype ${dtype} and item size ${item_size} with type ${type} and format ${format}.`);

    let texture = new THREE.DataTexture(padded_data,
        texture_shape[0], texture_shape[1],
        format, type);

    return texture;
}


function update_array_texture(texture, data)
{
    try {
        // Note that input data may be Int32Array or Uint32Array
        // here while image.data is currently always Float32Array
        // (see allocate_array_texture) because webgl doesn't support
        // large integer textures, but this .set operation still works
        // fine and doubles as type casting the data before uploading.
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
        this.element_buffer = new THREE.BufferAttribute(new Uint8Array([0, 1, 2, 3, 0, 1]), 1);

        // TODO: Remove this? Contained in local_vertices_buffer, first item.
        // Replacement for gl_VertexID which requires webgl2
        this.local_vertex_id_buffer =  new THREE.BufferAttribute(new Float32Array([0,1,2,3]), 1);

        // Note: Seems like we need at least one vertex attribute
        // (i.e. per instance vertex) to please some webgl drivers
        // Setup local tetrahedron vertex indices in a pattern relative to each vertex
        // TODO: Arrange these such that normal computations become simpler,
        //   i.e. n0 = normal opposing v0 = v1->v2 x v1->v3 = pointing away from v0
        this.local_vertices_buffer = new THREE.BufferAttribute(new Float32Array([
            0,   2, 1, 3,
            1,   2, 3, 0,
            2,   0, 3, 1,
            3,   0, 1, 2,
            // Simple rotation of 0..3:
            // 0,   1, 2, 3,
            // 1,   2, 3, 0,
            // 2,   3, 0, 1,
            // 3,   0, 1, 2
        ]), 4);
    }

    _init_uniforms()
    {
        // Fill uniforms dict with dummy values
        this.uniforms = {
            // Time and oscillators
            u_time: { value: 0.0 },
            u_oscillators: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },
            // Camera uniforms (threejs provides cameraPosition)
            u_view_direction: { value: new THREE.Vector3(0, 0, 1) },
            // Input constants
            u_constant_color: { value: new THREE.Color(1.0, 1.0, 1.0) },
            u_particle_area: { value: 0.2 },
            // Input data ranges, 4 values: [min, max, max-min, 1.0/(max-min) or 1]
            u_density_range: { value:  new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
            u_emission_range: { value: new THREE.Vector4(0.0, 1.0, 1.0, 1.0) },
            // Texture dimensions
            u_cell_texture_shape: { value: [0, 0] },
            u_vertex_texture_shape: { value: [0, 0] },
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
            c_ordering: null, // only if sorted
            c_cells: null,    // only if non-sorted
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

        // Compute suitable 2D texture shapes large enough
        // to hold this number of values and store in uniforms
        [...this.uniforms.u_cell_texture_shape.value] = compute_texture_shape(this.num_tetrahedrons);
        [...this.uniforms.u_vertex_texture_shape.value] = compute_texture_shape(this.num_vertices);
    }

    // Update data ranges, also done automatically during update_data
    update_ranges(data)
    {
        this.uniforms.u_density_range.value.set(...compute_range(data.density));
        this.uniforms.u_emission_range.value.set(...compute_range(data.emission));
        debug("Updated data ranges: ", this.uniforms.u_density_range.value, this.uniforms.u_emission_range.value);
    }

    allocate_ordering()
    {
        // Initialize ordering array with contiguous indices,
        // stored as floats because webgl2 is required for integer attributes
        this.ordering = new Float32Array(this.num_tetrahedrons);
        for (let i = 0; i < this.num_tetrahedrons; ++i) {
            this.ordering[i] = i;
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
            this.uniforms.u_oscillators.value.setComponent(i, Math.sin((i+1) * Math.PI * time));
        }
    }

    // Upload data, assuming method has been configured
    upload(data, method)
    {
        let mp = method_properties[method];
        let encoding = this.encodings.get(method);
        this._allocate_and_update(data, encoding, mp.channels, mp.sorted, false, true);
    }

    _create_geometry(sorted)
    {
        let geometry = new THREE.InstancedBufferGeometry();
        geometry.maxInstancedCount = this.num_tetrahedrons;
        geometry.setIndex(this.element_buffer);
        geometry.addAttribute("a_local_vertices", this.local_vertices_buffer);
        geometry.addAttribute("a_vertex_id", this.local_vertex_id_buffer);

        // Setup cells of geometry (using textures or attributes)

        // Currently always need the ordering instance attribute
        // in place of gl_InstanceID which requires webgl2.
        // However it's probably possible to use c_cells instead
        // of t_cells and skip c_ordering with some minor changes
        // here and there. Try it later.

        //if (sorted) {
        // Allocate ordering when first needed
        if (this.attributes.c_ordering === null) {
            this.allocate_ordering();
        }
        // Need ordering, let ordering be instanced and read cells from texture
        geometry.addAttribute("c_ordering", this.attributes.c_ordering);
        //}

        // TODO: Try this later. Currently not using c_cells, always using c_ordering and t_cells.
        // if (!sorted) {
        //     if (this.attributes.c_cells === null) {
        //         console.error(`Haven't allocated cells yet!`);
        //         // Don't need ordering, use cells instanced instead
        //         // TODO: Add eventual other attributes with cell association here
        //         geometry.addAttribute("c_cells", this.attributes.c_cells);
        //     }
        // }
        return geometry;
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
            transparent: mp.transparent,
            // TODO: depthTest also makes sense for transparent methods if there's something else opaque in the scene like axes
            depthTest: !mp.transparent,
            depthWrite: !mp.transparent,
        });

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
        this._allocate_and_update(null, encoding, mp.channels, mp.sorted, true, false);

        // Configure instanced geometry, each tetrahedron is an instance
        let geometry = this._create_geometry(mp.sorted);

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

    _allocate_and_update(data, encoding, channels, sorted, allocate, update)
    {
        // The current implementation assumes:
        // - Each channel has only one possible association

        // Process all passed channels
        for (let channel_name in channels)
        {
            debug("*** updating " + channel_name);

            // Get channel description
            let channel = channels[channel_name];
            if (channel === undefined) {
                debug(`Channel ${channel_name} is missing description.`);
                continue;
            }

            // Get encoding for this channel
            let enc = encoding[channel_name];
            if (enc === undefined) {
                debug(`No encoding found for channel ${channel_name}.`);
                continue;
            }

            // Get new data value
            let new_value = null;
            if (data) {
                new_value = data[enc.field];
                if (new_value === undefined) {
                    debug(`No data found for field ${enc.field} encoded for channel ${channel_name}.`);
                    continue;
                }
            }

            // Default association in channel, can override in encoding
            let association = enc.association || channel.association;
            debug("*** assiciation " + association);
            let uniform = null;
            switch (association)
            {
            case "uniform":
                {
                let uniform = this.uniforms["u_" + channel_name];
                if (!uniform.value) {
                    debug("Allocating uniform object for " + channel_name);
                    uniform.value = allocate_value(channel.item_size);
                    debug(uniform.value);
                }
                if (new_value) {
                    debug("Updating uniform value for " + channel_name);
                    debug(new_value);
                    uniform.value = new_value;  // TODO: Copy? Set into existing object?
                }
                break;
                }
            case "vertex":
                {
                let uniform = this.uniforms["t_" + channel_name];
                if (!uniform.value) {
                    debug("Allocating vertex texture for " + channel_name);
                    debug(new_value);
                    uniform.value = allocate_array_texture(
                        channel.dtype, channel.item_size,
                        this.uniforms.u_vertex_texture_shape.value);
                }
                if (new_value) {
                    debug("Uploading to vertex texture for " + channel_name);
                    debug(new_value);
                    update_array_texture(uniform.value, new_value);
                }
                break;
                }
            case "cell":
                {
                // TODO: Currently always placing cell data as textures,
                // update this for cell data as instance attributes when needed.
                // Maybe we want to allocate or allow allocation for both the sorted and unsorted case,
                // to quickly switch between methods e.g. during camera rotation.
                let uniform = this.uniforms["t_" + channel_name];
                if (!uniform.value) {
                    debug("Allocating cell texture for " + channel_name);
                    debug(new_value);
                    uniform.value = allocate_array_texture(
                        channel.dtype, channel.item_size,
                        this.uniforms.u_cell_texture_shape.value);
                }
                if (new_value) {
                    debug("Uploading to cell texture for " + channel_name);
                    debug(new_value);
                    update_array_texture(uniform.value, new_value);
                }

                // var upload_as_instanced_buffer = false;
                // if (upload_as_instanced_buffer && new_value) {
                //     let attrib = this.attributes["c_" + channel_name];
                //     if (!attrib) {
                //         // Allocate instanced buffer attribute
                //         // TODO: Should we copy the new_value here?
                //         attrib = new THREE.InstancedBufferAttribute(new_value, channel.item_size, 1);
                //         if (channel.dynamic) {
                //             attrib.setDynamic(true);
                //         }
                //         this.attributes["c_" + channel_name] = attrib;

                //         // FIXME: Hack! The data flow here is not very nice.
                //         let method = "surface";
                //         this.meshes.get(method).geometry.addAttribute("c_" + channel_name, attrib);
                //     } else {
                //         // Update contents of instanced buffer attribute
                //         attrib.array.set(new_value);
                //         attrib.needsUpdate = true;
                //     }
                // }
                break;
                }
            case "lut":
                {
                if (new_value) {
                    let dim = new_value.length / channel.item_size;
                    let uniform = this.uniforms["t_" + channel_name];
                    if (!uniform.value) {
                        debug("Allocating lut texture for " + channel_name);
                        debug(uniform.value, new_value);
                        uniform.value = allocate_array_texture(
                            channel.dtype, channel.item_size, [dim, 1]);
                    } else if (uniform.value.image.width != dim) {
                        debug("Reallocating lut texture for " + channel_name);
                        debug(uniform.value, new_value);
                        // TODO: Should we deallocate the gl texture via uniform.value somehow?
                        uniform.value = allocate_array_texture(
                            channel.dtype, channel.item_size, [dim, 1]);
                    }
                    debug("Updating lut texture for " + channel_name);
                    debug(uniform.value, new_value);
                    update_array_texture(uniform.value, new_value);
                }
                break;
                }
            default:
                debug("unknown association " + association);
            }

            // Update associated data range TODO: Option to skip auto-update
            if (new_value) {
                let range_name = "u_" + channel_name + "_range";
                if (this.uniforms.hasOwnProperty(range_name)) {
                    this.uniforms[range_name].value.set(...compute_range(new_value));
                    debug("Updating data range for " + channel_name);
                    debug(range_name, this.uniforms[range_name].value);
                }
            }
        }
    }
};

module.exports = {
    TetrahedralMeshRenderer
};
