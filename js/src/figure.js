'use strict';

var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var THREE = require('three');

var utils = require('./utils.js');


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

        console.log("FigureView initialize");

        this.canvas = null;
        this.renderer = null;

        this.data_views = new Map();
        this.plot_views = new Map();
    }

    render()
    {
        console.log("FigureView render");
        let width = this.model.get("width");
        let height = this.model.get("height");
        let downscale = this.model.get("downscale");

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);

        this.el.innerHTML = "";
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.appendChild(this.canvas);

        //let gl = this._create_gl_context(this.canvas, downscale);
        //this.gl = gl;
		this.canvas.addEventListener('webglcontextlost', this.on_context_lost, false);

        // Setup renderer (creates its own webgl context)
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,
            stencil: true,
            preserveDrawingBuffer: true,
            depth: true,
            logarithmicDepthBuffer: false
        });
        this.renderer.setSize(downscale * width, downscale * height);
        this.bgcolor = new THREE.Color(0.9, 0.9, 0.9); // TODO: Make model attribute
        this.renderer.setClearColor(this.bgcolor, 1.0);

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

        // Create main scene
        this.scene = new THREE.Scene();
        let geometry = new THREE.BoxGeometry( 200, 200, 200 );
        let material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
        let mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);

        // Return promise representing async creation of child views
        return this._create_views();
    }

    /*
    _create_gl_context(canvas, downscale)
    {
        let gloptions = {
            antialias: false,
            depth: true,
            alpha: true,
            stencil: false,
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: true,
        };
        let gl = canvas.getContext("webgl2", gloptions);
        gl.viewport(0, 0, downscale * gl.canvas.width, downscale * gl.canvas.height);
        return gl;
    }
    */

    _create_views()
    {
        console.log("FigureView _create_views");
        // For capture in promise callback closures
        let that = this;
        let view_promises = [];

        // Create views for data objects
        let data = this.model.get("data");
        for (let name of Object.keys(data)) {
            let model = data[name];
            let p = this.create_child_view(model);
            view_promises.push( p.then(
                (view) => {
                    console.log("XXXXXXXXXXXXXXXXXXXXXXXXXx");
                    // name == view.model.get("name")
                    that.data_views.set(name, view);
                    that.listenTo(view, "data:dirty", that.on_data_dirty);
                    return view;
                }
            ));
        }

        // Create views for plot objects
        let plots = this.model.get("plots");
        for (let name of Object.keys(plots)) {
            let model = plots[name];
            let p = this.create_child_view(model);
            view_promises.push( p.then(
                (view) => {
                    // name == view.model.get("name")
                    that.plot_views.set(name, view);
                    that.listenTo(view, "plot:dirty", that.on_plot_dirty);
                    return view;
                }
            ));
        }

        // When all child views are created, trigger on_all_*views_ready
        this.view_promises = Promise.all(view_promises)
        .then(
            () => that.on_all_views_ready()
        ).catch((e) => {
            this.on_view_creation_failed(e);
            throw e;
        });
        return this.view_promises;
    }

    on_view_creation_failed(err) {
        console.error("Failed to initialize FigureView, error is: ", err);
    }

    on_data_dirty() {
        console.log("on_data_dirty ", arguments);
    }

    on_plot_dirty() {
        console.log("on_plot_dirty ", arguments);
    }

    on_all_views_ready() {
        console.log("FigureView on_all_views_ready");
        this.schedule_animation();
    }

    update()
    {
        super.update(...arguments);
        console.log("FigureView update", Object.keys(this.model.get("data")), arguments);
    }

    schedule_animation()
    {
        this.animation_frame_id = window.requestAnimationFrame(_.bind(this.animate, this));
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
        let x = this.camera.position.x;
        let y = this.camera.position.y;
        let freq = 4;
        let theta = Math.PI * ((passed_time / freq) % 1.0);
        this.camera.position.z = 1000 * Math.cos(theta);
        this.camera.position.x = 1000 * Math.sin(theta);

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
        //let gl = this.gl;
        //gl.clearColor(Math.abs(Math.sin(0.2*this.redraw_count)), 0.9, 0.9, 1.0);
        //gl.clear(gl.COLOR_BUFFER_BIT);

        // Simulate context loss (for testing)
        //this.renderer.forceContextLoss();

        // Adjust face culling (plot specific)
        //this.renderer.setFaceCulling("back", "ccw");
        this.renderer.setFaceCulling(false);

        // TODO: Who owns the camera and the scene?
        this.renderer.render(this.scene, this.camera);

        /*
        for (let plot of this.plots.entries()) {
            // Use this to view plots in separate parts of figure
            //this.renderer.setViewport(0, 0, this.width, this.height);
            let scene = plot.process();
        	this.renderer.render(scene, this.camera);
        }
        */
    }

    draft_threejs_setup()
    {
        // FIXME: Create textures from data arrays using THREE.DataTexture

        // FIXME: Configure instanced attributes
        //new THREE.InstancedBufferAttribute(array, itemSize, meshPerAttribute)

        // FIXME: Configure one per-vertex attribute to appease webgl drivers
        // next_vertex = new Uint32Array([1, 2, 3, 0]);
        //new THREE.BufferAttribute(array, itemSize, normalized)

        // FIXME: Configure geometry instance
        //var geometry = new THREE.BufferGeometry();

        // create a simple square shape. We duplicate the top left and bottom right
        // vertices because each vertex needs to appear once per triangle.
        /*
        var vertices = new Float32Array( [
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,

            1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0, -1.0,  1.0
        ] );
        */
        // itemSize = 3 because there are 3 values (components) per vertex
        //geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

        // FIXME: Configure custom shaders
        //var material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

        // FIXME: Setup scene and camera
        //var mesh = new THREE.Mesh(geometry, material);

        // FIXME: Configure uniforms
        /*
        let uniforms = {
	        time: { value: 1.0 },
	        resolution: new THREE.Uniform(new THREE.Vector2())
        };
        */
    }
};


module.exports = {
    FigureModel, FigureView
};
