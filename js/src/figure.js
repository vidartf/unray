'use strict';

import _ from 'underscore';

import widgets from '@jupyter-widgets/base';

import version from './version';
import {create_unray_state} from "./renderer";

import './threeimport';
const THREE = window.THREE;
// console.log("THREE imported in figure:", THREE);


class FigureModel extends widgets.DOMWidgetModel
{
    defaults()
    {
        const model_defaults = {
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
};
FigureModel.serializers = _.extend({
    data: { deserialize: widgets.unpack_models },
    plots: { deserialize: widgets.unpack_models },
}, widgets.DOMWidgetModel.serializers);


class FigureView extends widgets.DOMWidgetView {
    render() {
        // Setup root object, this will be created by pythreejs blackbox object later
        this.obj = new THREE.Object3D();

        // Setup unray state
        // FIXME: Refactor to move all unray stuff into here
        const initial = {
            data: this.model.get("data"),
            plotname: this.model.get("plotname"),
            plots: this.model.get("plots"),
        };
        this.substate = create_unray_state(this.obj, initial);

        // Setup scene with root object added
        this.scene = new THREE.Scene();
        this.scene.add(this.obj);

        // Setup canvas and add it to the DOM
        const width = this.model.get("width");
        const height = this.model.get("height");
        const downscale = this.model.get("downscale");
        this.aspect_ratio = width / height;
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);
        this.el.innerHTML = "";
        this.el.appendChild(this.canvas);

        // Setup three.js renderer
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

        // Setup camera
        // TODO: Use pythreejs camera and controller if we stick to webgl1 and three.js
        this.use_perspective_camera = true; // TODO: Make this an option
        if (this.use_perspective_camera) {
            this.camera = new THREE.PerspectiveCamera(60.0, this.aspect_ratio, 0.1, 100);
        } else {
    		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        }
        // this.camera.matrixAutoUpdate = true;
        this.step_camera(0.0);

        // Setup camera controls
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.addEventListener("change", () => {
            this.on_camera_changed();
            this.redraw()
        });

        // Wire listeners
        this.listenTo(this.model, "change:animate", () => this.schedule_animation());

        // Initiate rendering
        return Promise.resolve().then(() => this.schedule_animation());
    }

    step_camera(passed_time) {
        // These are all the input parameters here
        const ar = this.aspect_ratio;
        const center = this.substate.get_center();
        let radius = this.substate.get_radius();

        // Set radius of sphere that camera moves on somewhat larger than model
        radius *= 1.5;

        if (this.use_perspective_camera) {
            // TODO: Use fov calculation to set proper distance
            //this.camera.fov
            radius *= 2;
        } else {
            const w = Math.max(2 * radius, ar * 2 * radius);
            const h = w / ar;
            this.camera.left = -w/2;
            this.camera.right = w/2;
            this.camera.top = h/2;
            this.camera.bottom = -h/2;
        }

        // Look at center of model
        this.camera.lookAt(center.clone());

        // Crude animation: move on sphere around model
        const freq1 = .3;
        const freq2 = .1;
        const theta = 2.0 * Math.PI * freq1 * passed_time;
        const phi = 2.0 * Math.PI * freq2 * passed_time;
        const offset = new THREE.Vector3(
            radius * Math.cos(phi) * Math.cos(theta),
		    radius * Math.sin(phi),
            radius * Math.cos(phi) * Math.sin(theta)
        );
        this.camera.position.addVectors(center, offset);

        // Manually trigger camera change for now
        this.on_camera_changed();
    }

    on_camera_changed() {
        const center = this.substate.get_center();
        const radius = this.substate.get_radius();
        const camera = this.camera;

        // Recompute camera near/far planes to include model
        // (TODO: This doesn't seem to work very well)
        const dist = camera.position.distanceTo(center);
        camera.near = Math.max(dist * 0.8 - radius * 1.2, 0.001 * radius);
        camera.far = dist * 1.2 + radius * 1.2;
        camera.updateProjectionMatrix();

        // Update renderer uniforms etc, possibly resort cells
        this.substate.update_perspective(camera);
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

        const animating = this.model.get("animate");
        if (animating) {
            const time_step = time - this.prev_time;
            const passed_time = time - this.start_time;
            this.step_time(passed_time, time_step);
        }

        this.redraw();

        this.prev_time = time;

        if (animating) {
            this.schedule_animation();
        }
    }

    step_time(passed_time, time_step)
    {
        // TODO: Later want camera to be controlled via connected pythreejs widget
        //this.step_camera(passed_time);

        // Update time in tetrenderer
        this.substate.update_time(passed_time);
    }

    redraw() {
        // Select method-specific background color
        // TODO: How to deal with this when adding to larger scene?
        //       I guess it will be up to the user.
        const bgcolor = this.substate.get_bgcolor();
        this.renderer.setClearColor(bgcolor, 1);
        this.renderer.render(this.scene, this.camera);
    }
};


export {
    FigureModel, FigureView
};
