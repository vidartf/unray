var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
//var ndarray = require('ndarray');

// Local imports
var utils = require('./utils.js');


class DataModel extends widgets.WidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'DataModel',
            _view_name : 'DataView',
            array : null, //new Float32Array(), [0, 3]),
        };
        let d = _.extend(super.defaults(), utils.module_defaults, model_defaults);
        this.debug("DataModel initialize", arguments, d);
        return d;
    }

    initialize()
    {
        super.initialize(...arguments);
        this.debug("DataModel initialize", arguments)
    }
};
DataModel.serializers = _.extend({
    array: utils.array_serialization,
}, widgets.WidgetModel.serializers);


class DataView extends widgets.WidgetView
{
    initialize()
    {
        super.initialize(...arguments);
        this.debug("DataView initialize", arguments)
    }

    render()
    {
        this.debug("DataView render", arguments)
    }

    update(options)
    {
        //super.update(...arguments);
        this.debug("DataView update");
        this.debug("options:");
        this.debug(options);
        this.debug("arguments:");
        this.debug(arguments);
        this.debug("... DataView update");
        let array = this.model.get("array");
        this.debug(array);
    }
};


class DataDisplayModel extends widgets.DOMWidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'DataDisplayModel',
            _view_name : 'DataDisplayView',
            data : null,
        };
        let d = _.extend(super.defaults(), utils.module_defaults, model_defaults);
        this.debug("DataDisplayModel initialize", arguments, d);
        return d;
    }

    initialize()
    {
        super.initialize(...arguments);
        this.debug("DataDisplayModel initialize", arguments)
    }
};
DataDisplayModel.serializers = _.extend({
    data: { deserialize: widgets.unpack_models },
}, widgets.DOMWidgetModel.serializers);


class DataDisplayView extends widgets.DOMWidgetView
{
    initialize()
    {
        super.initialize(...arguments);
        //this.debug("DataDisplayView initialize", arguments)
        this.dataview = null;
    }

    render()
    {
        this.debug("DataDisplayView render", arguments)

        let data = this.model.get("data");
        if (data === undefined || data === null) {
            this.el.innerHTML = "<p>No data, couldn't create data display view.</p>";
            return Promise.resolve();
        }

        this.div = document.createElement("div");
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.innerHTML = "";
        this.el.appendChild(this.div);

        let that = this;
        let view_promises = [];

        let p = this.create_child_view(data);

        view_promises.push(
            p.then((dataview) => { that.dataview = dataview; })
        );

        this.view_promises = Promise.all(view_promises)
            .then(() => { that.refresh(); })
            .catch((err) => { console.error(err); throw err; });

        this.debug("Leaving DataDisplayView.render.")

        return this.view_promises;
    }

    update()
    {
        super.update(...arguments);
        this.debug("DataDisplayView update", arguments)
        this.refresh();
    }

    refresh() {
        this.debug("DataDisplayView refresh", arguments)
        let dataview = this.dataview;
        let datamodel = dataview.model;
        let array = datamodel.get("array");
        this.debug(array);
        this.div.innerHTML = "";
        this.div.textContent = array;
    }
};


function debug() { console.log(...arguments); }
function nodebug() { }
DataModel.prototype.debug = nodebug;
DataView.prototype.debug = nodebug;
DataDisplayModel.prototype.debug = nodebug;
DataDisplayView.prototype.debug = nodebug;


class Foo
{

    // This is the pythreejs RendererView
    thjsrender()
    {
        this.on('displayed', this.show, this);

        if (Detector.webgl) {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
        } else {
            this.renderer = new THREE.CanvasRenderer();
        }

        this.el.className = "jupyter-widget jupyter-threejs";
        this.el.innerHTML = "";
        this.canvas = document.createElement("div");
        this.el.appendChild(this.canvas);
        this.el.appendChild(this.renderer.domElement);

        var that = this;
        this.id = widgets.uuid();
        var render_loop = {
            register_update: function(fn, context) {
                that.on('animate:update', fn, context);
            },
            render_frame: function () {
                that._render = true;
                that.schedule_update();
            },
            renderer_id: this.id
        };

        var view_promises = [
          this.create_child_view(
              this.model.get('camera'), render_loop
              ).then(function(view) { that.camera = view; }),
          this.create_child_view(
              this.model.get('scene'), render_loop
              ).then(function(view) { that.scene = view; }),
        ];

        var effect_promise;
        if (this.model.get('effect')) {
            effect_promise = this.create_child_view(
                this.model.get('effect'), { renderer: this.renderer }
                ).then(function(view) { that.effectrenderer = view.obj; });
        } else {
            effect_promise = Promise.resolve(this.renderer
                ).then(function(r) { that.effectrenderer = r; });
        }
        view_promises.push(effect_promise.then(function() {
            that.effectrenderer.setSize(that.model.get('width'), that.model.get('height'));
            that.effectrenderer.setClearColor(that.model.get('background'), that.model.get('background_opacity'))
        }));

        this.view_promises = Promise.all(view_promises).then(function(objs) {
            that.scene.obj.add(that.camera.obj);
            this.debug('renderer', that.model, that.scene.obj, that.camera.obj);
            that.update();
            that._animation_frame = false;
            var controls = _.map(that.model.get('controls'), function(m) {
                return that.create_child_view(m, _.extend({}, {
                    dom: that.renderer.domElement,
                    start_update_loop: function() {
                        that._update_loop = true;
                        that.schedule_update();
                    },
                    end_update_loop: function() {
                        that._update_loop = false;
                    },
                    renderer: that
                }, render_loop))
            }, that);

            return Promise.all(controls)
                .then(function(c) {
                    that.controls = c;
                })
                .then(function() {
                    that._render = true;
                    that.schedule_update();
                    window.r = that;
                });
        });

        return this.view_promises;
    }
};

module.exports = {
    DataModel, DataView,
    DataDisplayModel, DataDisplayView,
};
