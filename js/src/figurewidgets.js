var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
//var ndarray = require('ndarray');

// Local imports
var utils = require('./utils.js');
var datawidgets = require('./datawidgets.js');


class PlotModel extends widgets.WidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'PlotModel',
            _view_name : 'PlotView',
            method : "blank",
            encoding : {},
        };
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }

    initialize()
    {
        super.initialize(...arguments);
    }
};
/*
PlotModel.serializers = _.extend({
    //array: utils.array_serialization,
}, widgets.WidgetModel.serializers);
*/

class PlotView extends widgets.WidgetView
{
    initialize()
    {
        super.initialize(...arguments);
    }

    render()
    {
        console.log("PLOTVIEW RENDER")
    }

    update(options)
    {
        //super.update(...arguments);
        let method = this.model.get("method");
        let encoding = this.model.get("encoding");
        // ...
        console.log("PLOTVIEW UPDATE ", method, encoding, this.parent)
    }
};


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

            // TODO: multiple plot configurations
            plot : null,
        };
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }

    initialize()
    {
        super.initialize(...arguments);
    }
};
FigureModel.serializers = _.extend({
    data: { deserialize: widgets.unpack_models },
    plot: { deserialize: widgets.unpack_models },
}, widgets.DOMWidgetModel.serializers);


class FigureView extends widgets.DOMWidgetView
{
    initialize()
    {
        super.initialize(...arguments);
        this.data_views = new Map();
        //this.plot_views = new Map();
    }

    render()
    {
        console.log("FIGUREVIEW RENDER")

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", this.model.get("width"));
        this.canvas.setAttribute("height", this.model.get("height"));

        this.el.innerHTML = "";
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.appendChild(this.canvas);

        return this.create_views();
    }

    create_views() {
        console.log("FIGUREVIEW CREATEVIEWS")
        let that = this;
        let view_promises = [];
        console.log("model: ", this.model)
        let data = this.model.get("data");
        console.log("data: ", data)
        console.log("data keys: ", Object.keys(data))

        for (let name of Object.keys(data)) {
            let model = data[name];
            let p = this.create_child_view(model);
            view_promises.push(
                p.then(
                    (view) => {
                        that.data_views.set(view.model.get("name"), view);
                        return view;
                    }
                )
            );
        }

        /*
        for (let [modelname, model] in this.model.get("plots").entries()) {
            view_promises.push(
                this.create_child_view(model).then(
                    (view) => {
                        that.plot_views.set(view.model.get("name"), view);
                        return view;
                    }
                )
            );
        }
        */

        this.view_promises = Promise.all(view_promises).then(
            () => {
                that.refresh();
            }).catch((err) => {
                console.error("Failed to initialize FigureView.");
                console.error(err);
                return widgets.reject(err);
            });

        console.log("FIGUREVIEW CREATEVIEWS DIDNT CRASH")
        return this.view_promises;
    }

    update()
    {
        super.update(...arguments);
        console.log("FIGUREVIEW UPDATE")
        this.refresh();
    }

    refresh()
    {
        console.log("FIGUREVIEW REFRESH")
        console.log(this)
    }
};


module.exports = {
    PlotModel, PlotView,
    FigureModel, FigureView,
};
