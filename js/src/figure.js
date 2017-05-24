'use strict';

var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var THREE = require('three');

var utils = require('./utils.js');
var Renderer = require('./renderer.js');


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

    render()
    {
        console.log("FigureView render");
        let that = this;

        let width = this.model.get("width");
        let height = this.model.get("height");
        let downscale = this.model.get("downscale");

        // Setup canvas
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);

        this.el.innerHTML = "";
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.appendChild(this.canvas);

		this.canvas.addEventListener('webglcontextlost', (event) => {
            console.log(event);
            event.preventDefault();
            that.on_context_lost();
        }, false);

        this.canvas.addEventListener('webglcontextrestored', (event) => {
            console.log(event);
            that.on_context_restored();
        }, false);

        // Setup renderer (creates the webgl context)
        this.renderer = new Renderer(this.canvas);
        this.renderer.set_size(width * downscale, height * downscale);

        this.listenTo(this.model, "change:data", this.on_data_changed);
        this.listenTo(this.model, "change:plots", this.on_plots_changed);
        //this.wire_data_listeners();
        //this.wire_plot_listeners();

        /*
        // Setup camera
        let fov = 60;
        let aspect_ratio = width / height;
        let near = 1;
        let far = 10000;
        //this.camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
        this.camera = new THREE.PerspectiveCamera(fov, aspect_ratio, near, far);
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = 1000;
        this.camera.lookAt(new THREE.Vector3(0,0,0));
        */

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
        this.schedule_animation();
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

        // TODO: Create uniforms acessible in shaders
        // Update oscillation uniforms with new time
        /*
        this.uniforms.time = passed_time;
        this.uniforms.time_step = time_step;

        let tpi = Math.PI * passed_time;
        this.uniforms.sines = [
            Math.sin(1 * tpi),
            Math.sin(2 * tpi),
            Math.sin(3 * tpi),
            Math.sin(4 * tpi),
        ];
        */
    }

    redraw()
    {
        // this.renderer.redraw();

        //this.threejs_redraw();
    }
};

class TRenderer
{


    // Unoptimized naive threejs rendering
    setup(plot, data)
    {
    }

    redraw()
    {
        this.renderer = THREE.WebGLRenderer();

        this.renderer.render(this.scene, this.camera);
    }    
}

module.exports = {
    FigureModel, FigureView
};
