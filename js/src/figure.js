'use strict';

var widgets = require('@jupyter-widgets/base');
var _ = require('underscore');
var THREE = require('three');
window.THREE = THREE;
// require('../node_modules/three/examples/js/controls/TrackballControls');
require('../node_modules/three/examples/js/controls/OrbitControls');

var version = require('./version.js');
let meshutils = require("./meshutils.js");
let renderer = require("./renderer.js");


//var debug = _.bind(console.log, console);
var debug = function() {}


class FigureModel extends widgets.DOMWidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'FigureModel',
            _view_name : 'FigureView',

            // Canvas properties
            width : 800,
            height : 600,
            downscale : 1.0,

            // Presentation properties
            animate : true,  // Used for debugging

            // Collection of data
            data : {},

            // Collection of plot configurations
            plots : {},

            // Currently selected plot
            plotname : undefined,
        };
        return _.extend(super.defaults(), version.module_defaults, model_defaults);
    }

    initialize()
    {
        super.initialize(...arguments);
        debug("FigureModel initialize ", this.get("data"));
    }
};
FigureModel.serializers = _.extend({
    data: { deserialize: widgets.unpack_models },
    plots: { deserialize: widgets.unpack_models },
}, widgets.DOMWidgetModel.serializers);


class FigureView extends widgets.DOMWidgetView
{
    initialize()
    {
        super.initialize(...arguments);
        this.canvas = null;
        this.renderer = null;
    }

    /*
    on_context_lost()
    {
        this.renderer.on_context_lost();
        this.pause_animation();
    }

    on_context_restored()
    {
        this.renderer.on_context_restored();
        this.schedule_animation();
    }
    */

    render() {
        debug("FigureView render");
        let that = this;

        let width = this.model.get("width");
        let height = this.model.get("height");
        let downscale = this.model.get("downscale");

        this.aspect_ratio = width / height;

        // Setup canvas
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);

        // Add it to the DOM
        this.el.innerHTML = "";
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.appendChild(this.canvas);

        // Setup three.js renderer
        // TODO: Use pythreejs for this if we stick to webgl1 and three.js
		this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            precision: "highp",
            alpha: true,
            antialias: true,
            stencil: false,
            preserveDrawingBuffer: true,
            depth: true,
            logarithmicDepthBuffer: true,
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width * downscale, height * downscale);


        /////////////////////////////////////////////////////////////////
        // Get raw data arrays from dict of data models
        // TODO: Use ndarray in TetRenderer instead?
        let data = this.model.get("data");
        let raw_data = {};
        for (let name in data) {
            // Get the typedarray of the ndarray of the datamodel...
            let arr = data[name].get("array");
            raw_data[name] = arr.data;
        }

        if (data.cells.get("array").shape[1] !== 4) {
            console.error("Shape error in cells", data.cells);
        }
        let num_tetrahedrons = data.cells.get("array").shape[0];
        //let num_tetrahedrons = raw_data.cells.length / 4;

        if (data.coordinates.get("array").shape[1] !== 3) {
            console.error("Shape error in coordinates", data.coordinates);
        }
        let num_vertices = data.coordinates.get("array").shape[0];
        //let num_tetrahedrons = raw_data.coordinates.length / 3;

        // Reorient tetrahedral cells
        meshutils.reorient_tetrahedron_cells(
            data.cells.get("array").data,
            data.coordinates.get("array").data)
        /////////////////////////////////////////////////////////////////


        /////////////////////////////////////////////////////////////////
        // Setup cloud model
        this.tetrenderer = new renderer.TetrahedralMeshRenderer();

        // Initialize renderer once dimensions are known
        this.tetrenderer.init(num_tetrahedrons, num_vertices);

        // TODO: Better handling of multiple configurations with data sharing
        let plots = this.model.get("plots");
        let plotname = this.model.get("plotname");
        let plot = plots[plotname];
        let method = "surface";
        let encoding = undefined;
        if (plot) {
            method = plot.get("method");
            encoding = plot.get("encoding");
        }
        console.log("Using method", method);
        console.log("Using encoding", encoding);

        this.tetrenderer.configure(plotname, method, encoding, raw_data);

        // Select method-specific background color
        let default_bgcolor = new THREE.Color(1, 1, 1);
        this.bgcolor = this.tetrenderer.select_bgcolor(method, encoding, default_bgcolor);

        // Upload data to textures
        this.tetrenderer.upload(raw_data, method, encoding);
        /////////////////////////////////////////////////////////////////


        /////////////////////////////////////////////////////////////////
        // Compute bounding sphere of model
        // (TODO: Maybe let tetrenderer do this?)
        this.bounds = meshutils.compute_bounds(raw_data.coordinates);
        this.model_center = new THREE.Vector3(this.bounds.center[0], this.bounds.center[1], this.bounds.center[2]);
        // this.model_center = new THREE.Vector3(this.bounds.bbcenter[0], this.bounds.bbcenter[1], this.bounds.bbcenter[2]);
        console.log("Computed bounds:", this.bounds);
        /////////////////////////////////////////////////////////////////


        /////////////////////////////////////////////////////////////////
        // Setup camera
        this.init_camera();  // NB! Depends on this.bounds being set.
        /////////////////////////////////////////////////////////////////


        /////////////////////////////////////////////////////////////////
        // Setup empty scene
        this.scene = new THREE.Scene();

        // FIXME: Swap mesh in scene when changing method etc.
		this.scene.add(this.tetrenderer.meshes.get(plotname));

        /////////////////////////////////////////////////////////////////


        // this.controls = new THREE.TrackballControls(this.camera, this.canvas);
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.addEventListener("change", () => {
            that.on_camera_changed();
            that.redraw()
        });

        // Wire listeners
        this.listenTo(this.model, "change:animate", this.on_animate_changed);
        this.listenTo(this.model, "change:data", this.on_data_changed);
        this.listenTo(this.model, "change:plots", this.on_plots_changed);
        //this.wire_data_listeners();
        //this.wire_plot_listeners();

        return Promise.resolve().then(() => { that.schedule_animation(); });
    }

    on_animate_changed()
    {
        debug("on_animate_changed ", arguments);

        // let data = this.model.get("data"); //[name];
        // debug(data);
        //this.renderer.on_data_changed(name, data.array);

        this.schedule_animation();
    }

    on_data_changed(model, data)
    {
        debug("====================== on_data_changed ", arguments);
        debug(model.uuid, data.uuid);

        // let data = this.model.get("data")[name];
        // this.renderer.on_data_changed(name, data.array);

        this.schedule_animation();
    }

    on_plots_changed()
    {
        // FIXME: Trigger on already connected plot changed
        debug("====================== on_plots_changed ", arguments);

        this.schedule_animation();
    }

    on_camera_changed() {
        // Recompute camera near/far planes to include model
        let dist = this.camera.position.distanceTo(this.model_center);
        this.camera.near = Math.max(dist * 0.8 - this.bounds.radius * 1.2, 0.001 * this.bounds.radius);
        this.camera.far = dist * 1.2 + this.bounds.radius * 1.2;
        // console.log("Using near, far:", this.camera.near, this.camera.far);

        // Recompute projection matrix
        this.camera.updateProjectionMatrix();

        // Update renderer uniforms etc, possibly resort cells
        this.tetrenderer.update_perspective(this.camera);
    }

    init_camera() {
        // TODO: Use pythreejs camera and controller if we stick to webgl1 and three.js
        this.use_perspective_camera = true; // TODO: Make this an option
        if (this.use_perspective_camera) {
            this.camera = new THREE.PerspectiveCamera(60.0, this.aspect_ratio, 0.1, 100);
        } else {
    		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        }
        // this.camera.matrixAutoUpdate = true;
        this.step_camera(0.0);
    }

    step_camera(passed_time) {
        // Radius of sphere that camera moves on
        let radius = 1.5 * this.bounds.radius;

        if (this.use_perspective_camera) {
            // TODO: Use fov calculation to set proper distance
            //this.camera.fov
            radius *= 2;
        } else {
            let w = Math.max(2 * radius, this.aspect_ratio * 2 * radius);
            let h = w / this.aspect_ratio;
            this.camera.left = -w/2;
            this.camera.right = w/2;
            this.camera.top = h/2;
            this.camera.bottom = -h/2;
        }

        // Look at center of model
        this.camera.lookAt(this.model_center.clone());

        // Crude animation: move on sphere around model
        let freq1 = .3;
        let freq2 = .1;
        let theta = 2.0 * Math.PI * freq1 * passed_time;
        let phi = 2.0 * Math.PI * freq2 * passed_time;
        let offset = new THREE.Vector3(
            radius * Math.cos(phi) * Math.cos(theta),
		    radius * Math.sin(phi),
            radius * Math.cos(phi) * Math.sin(theta)
        );
        this.camera.position.addVectors(this.model_center, offset);

        // Manually trigger camera change for now
        this.on_camera_changed();
    }

    update()
    {
        super.update(...arguments);

        // TODO: New data or plot connected

        // debug("FigureView update", Object.keys(this.model.get("data")), arguments);
    }

    schedule_animation()
    {
        this.animation_frame_id = window.requestAnimationFrame(_.bind(this.animate, this));
    }

    pause_animation()
    {
        if (this.animation_frame_id !== undefined) {
            window.cancelRequestAnimationFrame(this.animation_frame_id);
            this.animation_frame_id = undefined;
        }
    }

    animate(time)
    {
        // Seconds are more convenient to work with
        time = time / 1000;
        if (!this.start_time) {
            this.start_time = time;
            this.prev_time = time;
        }

        let animating = this.model.get("animate");
        if (animating) {
            let time_step = time - this.prev_time;
            let passed_time = time - this.start_time;
            this.step_time(passed_time, time_step);
        }

        // this.redraw_count = this.redraw_count ? this.redraw_count + 1: 1;
        this.redraw();

        this.prev_time = time;

        if (animating) {
            this.schedule_animation();
        }
    }

    step_time(passed_time, time_step)
    {
        debug("step_time: ", passed_time, time_step);

        // TODO: Later want camera to be controlled via connected pythreejs widget
        this.step_camera(passed_time);

        // Update time in tetrenderer
        this.tetrenderer.update_time(passed_time);
    }

    redraw()
    {
        // TODO: React to data changes:
        //this.tetrenderer.update_method(method); // TODO: Better model for methods and data sharing
        //this.tetrenderer.update_encoding(encoding);
        //this.tetrenderer.update_data(data);

        // debug("Calling render");
        // debug(this.scene);
        // debug(this.camera);
        // debug(this.camera.toJSON());
        // debug(this.camera.projectionMatrix);

        this.renderer.setClearColor(this.bgcolor, 1);
        this.renderer.render(this.scene, this.camera);

        // debug("Done rendering.");
    }
};


module.exports = {
    FigureModel, FigureView
};
