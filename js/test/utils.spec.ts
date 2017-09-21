"use strict";

import * as widgets from '@jupyter-widgets/base';

import {expect} from 'chai';

const expectAllCloseTo = (actual, expected, delta=1e-8) => {
  for (let i in actual) {
    expect(actual[i]).closeTo(expected[i], delta);
  }
};

export { expectAllCloseTo };


/**
 * Serial ID for mock comms:
 */
let numComms = 0;

export
class MockComm {
    constructor() {
        this.comm_id = `mock-comm-id-${numComms}`;
        numComms += 1;
        this._on_msg = null;
        this._on_close = null;
    }
    on_close(fn) {
        this._on_close = fn;
    }
    on_msg(fn) {
        this._on_msg = fn;
    }
    _process_msg(msg) {
        if (this._on_msg) {
            return this._on_msg(msg);
        } else {
            return Promise.resolve();
        }
    }
    close() {
        if (this._on_close) {
            this._on_close();
        }
    }
    send() {}
}

export
class DummyManager extends widgets.ManagerBase {
    constructor() {
        super();
        this.el = window.document.createElement('div');
        this.testClasses = {};
    }

    display_view(msg, view, options) {
        // TODO: make this a spy
        // TODO: return an html element
        return Promise.resolve(view).then(view => {
            this.el.appendChild(view.el);
            view.on('remove', () => console.log('view removed', view));
            return view.el;
        });
    }

    loadClass(className, moduleName, moduleVersion) {
        if (moduleName === '@jupyter-widgets/base') {
            if (widgets[className]) {
                return Promise.resolve(widgets[className]);
            } else {
                return Promise.reject(new Error(`Cannot find class ${className}`));
            }
        } else if (moduleName === 'jupyter-datawidgets') {
            if (this.testClasses[className]) {
                return Promise.resolve(this.testClasses[className]);
            } else {
                return Promise.reject(new Error(`Cannot find class ${className}`));
            }
        } else {
            return Promise.reject(new Error(`Cannot find module ${moduleName}`));
        }
    }

    _get_comm_info() {
        return Promise.resolve({});
    }

    _create_comm() {
        return Promise.resolve(new MockComm());
    }
}

export
function createTestModel(constructor, attributes, widget_manager) {
  let id = widgets.uuid();
  let modelOptions = {
      widget_manager: widget_manager || new DummyManager(),
      model_id: id,
  }

  return new constructor(attributes, modelOptions);
}
