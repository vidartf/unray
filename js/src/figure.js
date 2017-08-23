'use strict';

import _ from 'underscore';

import widgets from '@jupyter-widgets/base';

import version from './version';
import {create_unray_state} from "./renderer";

import './threeimport';
const THREE = window.THREE;
// console.log("THREE imported in figure:", THREE);


function recompute_near_far(center, radius, position, fov) {
    const offset = 0.2;
    const dist = position.distanceTo(center);
    const near_edge = dist - radius;
    const far_edge = dist + radius;
    const near = Math.max(0.01 * near_edge, 0.01 * radius);
    const far = 100 * far_edge;
    return [near, far];
}


class FigureModel extends widgets.DOMWidgetModel {
    defaults() {
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


        // Reformat input variables
        const plot = this.model.get("plots")[this.model.get("plotname")];
        const method = plot ? plot.get("method") : "surface";
        const encoding = plot ? plot.get("encoding") : {};
        // Get the typedarray of the ndarray of the datamodel...
        const data = _.mapObject(
            this.model.get("data"),
            datawidget => datawidget.get("array").data
        );

        // Setup unray state
        this.substate = create_unray_state(this.obj, method, encoding, data);

        const bgcolor = this.substate.get_bgcolor();


        // Everything below will be created using pythreejs widgets


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
        this.renderer.setClearColor(bgcolor, 1);


        // Setup scene with root object added
        this.scene = new THREE.Scene();

        // Setup scene fog
        this.scene.fog = new THREE.Fog(0xaaaaaa);

        // Add our root object
        this.scene.add(this.obj);

        // Place camera a few radii off center of the model
        // Assuming perspective camera here
        this.sphere = this.obj.children[0].geometry.boundingSphere;
        const center = this.sphere.center.clone();
        const radius = this.sphere.radius;
        const offset = new THREE.Vector3(3*radius, 0, 0);
        const camera = new THREE.PerspectiveCamera(60.0, this.aspect_ratio, 0.1, 100);
        camera.position.addVectors(center, offset);
        camera.lookAt(center);
        this.camera = camera;

        // Manually trigger camera change for now
        this.on_camera_changed();

        // Setup camera controls
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.target.copy(center);
        this.controls.target0.copy(center);
        this.controls.update();
        this.controls.addEventListener("change", () => {
            this.on_camera_changed();
            this.schedule_animation();
        });

        // Wire listeners
        this.listenTo(this.model, "change:animate", () => this.schedule_animation());

        // Initiate rendering
        return Promise.resolve().then(() => this.schedule_animation());
    }

    on_camera_changed() {
        // Recompute camera near/far planes to include model
        const [near, far] = recompute_near_far(
            this.sphere.center,
            this.sphere.radius,
            this.camera.position,
            this.camera.fov
        );

        // Update camera
        const camera = this.camera;
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();

        // Update fog
        const fog = this.scene.fog;
        fog.near = near;
        fog.far = far;
    }

    schedule_animation() {
        if (this.animation_frame_id === undefined) {
            this.animation_frame_id = window.requestAnimationFrame((time) => {
                this.animation_frame_id = undefined;
                this.animate(time);
            });
        }
    }

    pause_animation() {
        if (this.animation_frame_id !== undefined) {
            window.cancelRequestAnimationFrame(this.animation_frame_id);
            this.animation_frame_id = undefined;
        }
    }

    animate(time) {
        const animating = this.model.get("animate");
        this.redraw();
        if (animating) {
            this.schedule_animation();
        }
    }

    redraw() {
        this.renderer.render(this.scene, this.camera);
    }
};


export {
    FigureModel, FigureView
};
