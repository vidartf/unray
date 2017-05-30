'use strict';

var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var THREE = require('three');

var utils = require('./utils.js');
let renderer = require("./renderer.js")


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

            // Collection of data
            data : {},

            // Collection of plot configurations
            plots : {},
        };
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }

    initialize()
    {
        super.initialize(...arguments);
        console.log("FigureModel initialize ", this.get("data"));
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
        console.log("FigureView render");
        let that = this;

        let width = this.model.get("width");
        let height = this.model.get("height");
        let downscale = this.model.get("downscale");

        // Setup canvas
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);

        // Add it to the DOM
        this.el.innerHTML = "";
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.appendChild(this.canvas);

        // Downscale width, height for renderer setup
        width = width * downscale;
        height = height * downscale;

        // Setup camera
        // TODO: Use pythreejs camera and controller
        // TODO: Setup camera to include coordinates bounding box in view
        let near = 0;
        let far = 1000;
        let right = width * downscale * 0.5;
        let top = height * downscale * 0.5;
        // let near = -2.0;
        // let far = 2.0;
        // let right = 2.0;
        // let top = 2.0;
		this.camera = new THREE.OrthographicCamera(-right, right, top, -top, near, far);
		this.camera.position.z = 4;

        // Setup scene
        this.scene = new THREE.Scene();

        // Setup renderer
		this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,

        });
        this.renderer.setClearColor(0x000000);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width * downscale, height * downscale);

        // Setup cloud model
        this.tetrenderer = new renderer.TetrahedralMeshRenderer();

        // FIXME: Initialize with actual data

        // Mock data
        let num_tetrahedrons = 1;
        let num_vertices = 4;
        let data = {
            //ordering: new Int32Array(this.num_tetrahedrons),
            cells: new Int32Array(4 * num_tetrahedrons),
            coordinates: new Float32Array(3 * num_vertices),
            density: new Float32Array(num_vertices),
            emission: new Float32Array(num_vertices),
            density_lut: new Float32Array(4),
            emission_lut: new Float32Array(3 * 4),
        };
        data.cells.set([0, 1, 2, 3]);
        data.coordinates.set([0,0,0,  0,0,1,  0,1,0,  1,0,0]);
        data.density.set([1, 1, .3, .3]);
        data.emission.set([1, .66, .33, 0.0]);
        data.density_lut.set([0, .33, .66, 1]);
        data.emission_lut.set([1,0,0, 0,1,0, 0,0,1, 1,1,0]);
        // end mock data

        // Initialize renderer once dimensions are known
        this.tetrenderer.init(num_tetrahedrons, num_vertices);

        // // TODO: Better handling of multiple configurations with data sharing
        let method = "surface";
        let encoding = undefined;
        this.tetrenderer.configure(method, encoding);

        // // Upload data to textures
        this.tetrenderer.upload(data, method);

        this.tetrenderer.update_perspective(this.camera); // TODO: On camera change
		this.scene.add(this.tetrenderer.meshes.get(method)); // FIXME: Add mesh to scene

        // Wire listeners
        this.listenTo(this.model, "change:data", this.on_data_changed);
        this.listenTo(this.model, "change:plots", this.on_plots_changed);
        //this.wire_data_listeners();
        //this.wire_plot_listeners();

        return Promise.resolve().then(() => { that.schedule_animation(); });
    }

    on_data_changed()
    {
        console.log("on_data_changed ", arguments);

        //let data = this.model.get("data"); //[name];
        //this.renderer.on_data_changed(name, data.array);

        //this.schedule_animation();  // Need this? Currently always animated
    }

    on_plots_changed()
    {
        // FIXME: Trigger on already connected plot changed
        console.log("on_plots_changed ", arguments);
    }

    update()
    {
        super.update(...arguments);

        // TODO: New data or plot connected

        console.log("FigureView update", Object.keys(this.model.get("data")), arguments);
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
        let time_step = time - this.prev_time;
        let passed_time = time - this.start_time;
        this.redraw_count = this.redraw_count ? this.redraw_count + 1: 1;

        this.step_time(passed_time, time_step);
        this.redraw();

        this.prev_time = time;
        //this.schedule_animation();
    }

    step_time(passed_time, time_step)
    {
        // Animate camera (for debugging)
        /*
        let x = this.camera.position.x;
        let y = this.camera.position.y;
        let freq = 4;
        let theta = Math.PI * ((passed_time / freq) % 1.0);
        this.camera.position.z = 1000 * Math.cos(theta);
        this.camera.position.x = 1000 * Math.sin(theta);
        */

        // Update time in tetrenderer
        this.tetrenderer.update_time(passed_time);
    }

    redraw()
    {
        // TODO: On camera update, do this:
        //this.tetrenderer.update_perspective(this.camera);

        // TODO: React to data changes:
        //this.tetrenderer.update_ranges();
        //this.tetrenderer.update_method(method); // TODO: Better model for methods and data sharing
        //this.tetrenderer.update_encoding(encoding);
        //this.tetrenderer.update_data(data);

        console.log("Calling render");
        console.log(this.scene);
        console.log(this.camera);
        this.renderer.render(this.scene, this.camera);
        console.log("Done rendering.");
    }
};


module.exports = {
    FigureModel, FigureView
};
