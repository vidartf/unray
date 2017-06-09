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


// TODO: Let default encodings differ per method
const default_encoding = {
    cells:        { field: "cells" },
    coordinates:  { field: "coordinates" },
    density:      { field: "density", range: "auto" },
    emission:     { field: "emission", range: "auto" },
    density_lut:  { field: "density_lut" },
    emission_lut: { field: "emission_lut" },
};


function override_defaults(defaults, params) {
    let p = _.clone(defaults);
    for (let key in params) {
        _.extend(p[key], params[key]);
    }
    return p;
}


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
    blank: {
    },
    surface: {
        sorted: false,
        transparent: false,

        // Any background is fine
        background: undefined,

        // Cells are oriented such that the front side
        // should be visible, can safely cull the backside
        side: THREE.FrontSide,

        defines: _.extend({}, default_defines, {
            ENABLE_SURFACE_MODEL: 1,
            ENABLE_EMISSION: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    max2: {
        sorted: false,
        transparent: true,

        // Must start with a black background
        background: new THREE.Color(0, 0, 0),

        // Rendering front side only and taking max in shader
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MaxEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_MAX_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
            ENABLE_EMISSION_BACK: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    max: {
        sorted: false,
        transparent: true,

        // Must start with a black background
        background: new THREE.Color(0, 0, 0),

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
            // ENABLE_EMISSION_BACK: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    min2: {
        sorted: false,
        transparent: true,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

        // Rendering front side only and taking min in shader
        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.MinEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_MIN_MODEL: 1,
            ENABLE_EMISSION: 1, // TODO: It makes sense to use emission OR density here.
            ENABLE_EMISSION_BACK: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    min: {
        sorted: false,
        transparent: true,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

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
            // ENABLE_EMISSION_BACK: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    xray: {
        sorted: false,
        transparent: true,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        // blend_equation: THREE.ReverseSubtractEquation, // dst - src  // TODO: Is there a way to use this for negative xray?
        blend_src: THREE.OneFactor,
        blend_dst: THREE.SrcAlphaFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_XRAY_MODEL: 1,
            ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
            // ENABLE_DENSITY_BACK: 1,
        }),

        vertex_shader: shader_sources.vertex,
        fragment_shader: shader_sources.fragment,
        channels: default_channels,
        default_encoding: default_encoding,
    },
    xray2: {
        sorted: false,
        transparent: true,

        // Must start with a white background
        background: new THREE.Color(1, 1, 1),

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        // blend_equation: THREE.ReverseSubtractEquation, // dst - src  // TODO: Is there a way to use this for negative xray?
        blend_src: THREE.OneFactor,
        blend_dst: THREE.SrcAlphaFactor,

        defines: _.extend({}, default_defines, {
            ENABLE_XRAY_MODEL: 1,
            ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
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

        // Must start with a black background
        background: new THREE.Color(0, 0, 0),

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.OneFactor,
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

        // Any background is fine
        background: undefined,

        side: THREE.FrontSide,

        blending: THREE.CustomBlending,
        blend_equation: THREE.AddEquation,
        blend_src: THREE.OneFactor,
        blend_dst: THREE.OneMinusSrcAlphaFactor,

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


function compute_range(array)
{
    let min = array[0];
    let max = array[0];
    for (let v of array) {
        min = Math.min(min, v);
        max = Math.max(max, v);
    }
    return [min, max];
}


function extended_range(min, max)
{
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


function allocate_lut_texture(dtype, item_size, texture_shape)
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
        format, type,
        undefined,
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
        // TODO: Could make linear/nearest filtering of lut an encoding parameter
        THREE.LinearFilter, THREE.LinearFilter);

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
        // This is the reference tetrahedron,
        // assumed a few places via face numbering etc.
        // let reference_coordinates = [
        //     0, 0, 0,
        //     1, 0, 0,
        //     0, 1, 0,
        //     0, 0, 1
        // ];

        // Setup triangle strip to draw each tetrahedron instance,
        // make sure that the faces winded ccw seen from the outside.
        this.element_buffer = new THREE.BufferAttribute(new Uint8Array([0, 2, 1, 3, 0, 2]), 1);

        // cw winded version
        // this.element_buffer = new THREE.BufferAttribute(new Uint8Array([0, 1, 2, 3, 0, 1]), 1);

        // Note: Seems like we need at least one vertex attribute
        // (i.e. per instance vertex) to please some webgl drivers

        // TODO: Remove this? Contained in local_vertices_buffer, first item.
        // Replacement for gl_VertexID which requires webgl2
        // this.local_vertex_id_buffer =  new THREE.BufferAttribute(new Float32Array([0,1,2,3]), 1);

        // Setup local tetrahedron vertex indices in a pattern relative to each vertex.
        // For each vertex 0...3, listing the vertices of the opposing face
        // in ccw winding seen from outside the tetrahedron.
        // This simplifies the computation of the opposing normal in the vertex shader,
        // i.e. n0 = normal of the face (v1, v2, v3) opposing v0, pointing away from v0,
        // n0 = normalized((v2-v1) x (v3-v1)) = normal pointing away from v0
        this.local_vertices_buffer = new THREE.BufferAttribute(new Float32Array([
            0,   1, 2, 3,
            1,   0, 3, 2,
            2,   0, 1, 3,
            3,   0, 2, 1,
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
            u_particle_area: { value: 1.0 },
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

    select_bgcolor(method, encoding, default_bgcolor)
    {
        let mp = method_properties[method];
        return mp.background || default_bgcolor;
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

    create_geometry(method, encoding)
    {
        let sorted = method_properties[method].sorted;

        let geometry = new THREE.InstancedBufferGeometry();
        geometry.maxInstancedCount = this.num_tetrahedrons;
        geometry.setIndex(this.element_buffer);
        geometry.addAttribute("a_local_vertices", this.local_vertices_buffer);
        // geometry.addAttribute("a_vertex_id", this.local_vertex_id_buffer);

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
        if (!sorted) {
            // let cell_data_channels = ["cells"];
            let cell_data_channels = [];
            for (let channel_name of cell_data_channels) {
                let attrib = this.attributes["c_" + channel_name];
                if (attrib === undefined) {
                    console.error(`Unknown attribute channel ${channel_name}.`);
                } else if (attrib === null) {
                    console.error(`Haven't allocated data for ${channel_name} yet! Geometry will be missing this data.`);
                } else {
                    geometry.addAttribute("c_" + channel_name, attrib);
                }
            }
        }
        return geometry;
    }

    create_material(method, encoding)
    {
        let mp = method_properties[method];

        // TODO: depthTest also makes sense for transparent methods
        // if there's something else opaque in the scene like axes
        let depth_test = !mp.transparent;

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
            depthTest: depth_test,
            depthWrite: !mp.transparent,
        });

        // Configure blending
        if (mp.blending === THREE.CustomBlending) {
            material.blending = mp.blending;
            material.blendEquation = mp.blend_equation;
            material.blendSrc = mp.blend_src;
            material.blendDst = mp.blend_dst;
        }

        // TODO: May also add defines based on encoding if necessary
        // if encoding specifies density or emission, add defines:
        //     ENABLE_DENSITY: 1,       // TODO: It might make sense to use emission OR density here? Maybe with per color channel blending.
        //     ENABLE_DENSITY_BACK: 1,

        // Apply method #defines to shaders
        material.defines = mp.defines;

        //material.extensions = {};

        return material;
    }

    allocate(method, encoding)
    {
        // The current implementation assumes:
        // - Each channel has only one possible association

        let mp = method_properties[method];

        // Copy and override defaults with provided values
        encoding = override_defaults(mp.default_encoding, encoding);

        // Process all passed channel
        for (let channel_name in mp.channels)
        {
            // Get channel description
            let channel = mp.channels[channel_name];

            // Get encoding for this channel
            let enc = encoding[channel_name];

            // debug("*** allocating for channel", channel_name, channel, enc);

            // Some sanity checks
            if (channel === undefined) {
                console.error(`Channel ${channel_name} is missing description.`);
                continue;
            }
            if (enc === undefined) {
                console.error(`No encoding found for channel ${channel_name}.`);
                continue;
            }

            // Default association in channel, can override in encoding
            let association = enc.association || channel.association;
            let uniform = null;
            switch (association)
            {
            case "uniform":
                uniform = this.uniforms["u_" + channel_name];
                if (!uniform.value) {
                    // TODO: Allocating uniform shared between methods using
                    // channel data which may conceptually differe between method,
                    // not the best possible design
                    uniform.value = allocate_value(channel.item_size);
                }
                break;
            case "vertex":
                uniform = this.uniforms["t_" + channel_name];
                if (!uniform.value) {
                    uniform.value = allocate_array_texture(
                        channel.dtype, channel.item_size,
                        this.uniforms.u_vertex_texture_shape.value);
                    console.log(`Allocated vertex texture for ${channel_name}.`, uniform.value);
                }
                break;
            case "cell":
                // Maybe we want to allocate or allow allocation for both the sorted and unsorted case,
                // to quickly switch between methods e.g. during camera rotation.
                uniform = this.uniforms["t_" + channel_name];
                if (!uniform.value) {
                    uniform.value = allocate_array_texture(
                        channel.dtype, channel.item_size,
                        this.uniforms.u_cell_texture_shape.value);
                }

                // TODO: Currently always placing cell data as textures,
                // update this for cell data as instance attributes when needed.
                // Shaders should in principle be ready for this by undefining ENABLE_CELL_ORDERING

                // FIXME: Design issue: creating the geometry depends on the
                // InstancedBufferAttribute being allocated already which
                // depends on the data which hasn't necessarily been set yet
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
                //     } else {
                //         // Update contents of instanced buffer attribute
                //         attrib.array.set(new_value);
                //         attrib.needsUpdate = true;
                //     }
                // }
                break;
            case "lut":
                // debug("Not allocating lut yet.")
                break;
            default:
                console.error(`Unknown association ${association}.`);
            }
        }
    }

    // Upload data, assuming method has been configured
    upload(data, method, encoding)
    {
        // The current implementation assumes:
        // - Each channel has only one possible association

        let mp = method_properties[method];

        // Copy and override defaults with provided values
        encoding = override_defaults(mp.default_encoding, encoding);

        // Process all channels
        for (let channel_name in mp.channels)
        {
            // Get channel description
            let channel = mp.channels[channel_name];

            // Get encoding for this channel
            let enc = encoding[channel_name];

            // debug("*** allocating for channel", channel_name, channel, enc);

            // Sanity checks
            if (channel === undefined) {
                console.error(`Channel ${channel_name} is missing description.`);
                continue;
            }
            if (enc === undefined) {
                console.error(`No encoding found for channel ${channel_name}.`);
                continue;
            }

            // Get new data value
            let new_value = data[enc.field];
            if (new_value === undefined) {
                console.error(`No data found for field ${enc.field} encoded for channel ${channel_name}.`);
                continue;
            }

            // Default association in channel, can override in encoding
            // (TODO: The idea here was to be able to select vertex/cell
            // association for fields, figure out a better design for that)
            let association = enc.association || channel.association;
            let uniform = null;
            switch (association)
            {
            case "uniform":
                uniform = this.uniforms["u_" + channel_name];
                uniform.value = new_value;  // TODO: Copy? Set into existing object?
                break;
            case "vertex":
                uniform = this.uniforms["t_" + channel_name];
                console.log(`Updating ${channel_name} with vertex data.`, uniform.value, new_value);
                update_array_texture(uniform.value, new_value);
                break;
            case "cell":
                // if (mp.sorted) {
                uniform = this.uniforms["t_" + channel_name];
                update_array_texture(uniform.value, new_value);
                // } else {
                //     update instance buffer  // FIXME: See allocate()
                // }
                break;
            case "lut":
                var dim = new_value.length / channel.item_size;
                uniform = this.uniforms["t_" + channel_name];
                if (!uniform.value) {
                    uniform.value = allocate_lut_texture(
                        channel.dtype, channel.item_size, [dim, 1]);
                } else if (uniform.value.image.width != dim) {
                    // TODO: Should we deallocate the gl texture via uniform.value somehow?
                    uniform.value = allocate_lut_texture(
                        channel.dtype, channel.item_size, [dim, 1]);
                }
                debug("Updating lut texture for " + channel_name);
                debug(uniform.value, new_value);
                update_array_texture(uniform.value, new_value);
                break;
            default:
                console.error("unknown association " + association);
            }

            // Update associated data range
            if (enc.range !== undefined) {
                console.log("Range computation", channel_name, enc.range, new_value)
                let newrange = null;
                if (enc.range === "auto") {
                    newrange = compute_range(new_value);
                } else  {
                    newrange = enc.range;
                }
                if (newrange !== null) {
                    newrange = extended_range(...newrange);
                    let range_name = "u_" + channel_name + "_range";
                    if (this.uniforms.hasOwnProperty(range_name)) {
                        this.uniforms[range_name].value.set(...newrange);
                        console.log(`Updating data range for ${channel_name} to ${newrange}.`);
                    }
                }
            }
        }
    }

    configure(plotname, method, encoding)
    {
        // Allocate various textures and buffers
        this.allocate(method, encoding);

        // Configure instanced geometry, each tetrahedron is an instance
        let geometry = this.create_geometry(method, encoding);

        // Configure material (shader)
        let material = this.create_material(method, encoding);

        // How to use wireframe
        //this.use_wireframe = true;
        // if (this.use_wireframe) {
        //     material.wireframe = true;
        //     material.wireframeLinewidth = 3;
        // }

        // Finally we have a Mesh to render for this method
        let mesh = new THREE.Mesh(geometry, material);
        mesh.setDrawMode(THREE.TriangleStripDrawMode);
        this.meshes.set(plotname, mesh);


        // Not really sure if one mesh per method is a good sharing model,
        // the encoding also affects the above setup
        // but at least this will allow quick switching
        // between methods if nothing else
        // let plotconfig = this.plotconfigs.get(plotname);
        // this.plotconfigs.set(plotname, {method, encoding, mesh});
    }
};

module.exports = {
    TetrahedralMeshRenderer
};
