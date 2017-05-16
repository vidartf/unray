var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
//var ndarray = require('ndarray');

// Local imports
var utils = require('./utils.js');


function debug() { console.log(...arguments); }
//function debug() { }


class DataModel extends widgets.WidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'DataModel',
            _view_name : 'DataView',
            name : "unnamed",
            array : null,
        };
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
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
        console.log("DATAVIEW INIT")
    }

    render()
    {
        console.log("DATAVIEW RENDER")
    }

    update(options)
    {
        let name = this.model.get("name");
        let array = this.model.get("array");
        console.log("DATAVIEW UPDATE ", name, array)
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
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }
};
DataDisplayModel.serializers = _.extend({
    data: { deserialize: widgets.unpack_models },
}, widgets.DOMWidgetModel.serializers);


class DataDisplayView extends widgets.DOMWidgetView
{
    initialize()
    {
        console.log("DATADISPLAYVIEW INIT", arguments)
        super.initialize(...arguments);
        this.dataview = null;
    }

    wire_events()
    {
        // datamodel change -> dataview.update
        // datadisplaymodel change -> datadisplaymodel.update
    }

    render()
    {
        console.log("DATADISPLAYVIEW RENDER", arguments)

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

        return this.view_promises;
    }

    update()
    {
        console.log("DATADISPLAYVIEW UPDATE", arguments)
        super.update(...arguments);
        this.refresh();
    }

    refresh() {
        console.log("DATADISPLAYVIEW REFRESH", arguments)
        let dataview = this.dataview;
        let datamodel = dataview.model;
        let array = datamodel.get("array");
        this.div.innerHTML = "";
        this.div.textContent = array;
    }
};


module.exports = {
    DataModel, DataView,
    DataDisplayModel, DataDisplayView,
};
