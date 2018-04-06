// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  IJupyterWidgetRegistry, WidgetModel
 } from '@jupyter-widgets/base';

import * as datawidgets from './datawidgets';

import * as plotwidgets from './plotwidgets';

import {
  EXTENSION_SPEC_VERSION
} from './version';

const EXTENSION_ID = 'jupyter.extensions.unray';


/**
 * The example plugin.
 */
const examplePlugin: IPlugin<Application<Widget>, void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  activate: activateWidgetExtension,
  autoStart: true
};

export default examplePlugin;


const widget_exports: {[key: string]: typeof WidgetModel} = {};
for (let source of [datawidgets, plotwidgets]) {
  for (let key of Object.keys(source)) {
    if ((source as any)[key] instanceof WidgetModel) {
      widget_exports[key] = (source as any)[key] as typeof WidgetModel;
    }
  }
}


/**
 * Activate the widget extension.
 */
function activateWidgetExtension(app: Application<Widget>, registry: IJupyterWidgetRegistry): void {
  registry.registerWidget({
    name: 'unray',
    version: EXTENSION_SPEC_VERSION,
    exports: widget_exports,
  });
}
