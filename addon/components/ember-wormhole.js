import Ember from 'ember';

var computed = Ember.computed;
var observer = Ember.observer;
var run = Ember.run;

// walk SimpleDom's body to find the element by id
function findElementById(body, id) {
  let node = body.firstChild;
  while (node) {
    if (node.getAttribute && node.getAttribute('id') === id) {
      return node;
    }
    if (node.firstChild) {
      node = node.firstChild;
    } else if (node.nextSibling) {
      node = node.nextSibling;
    } else if (node.parentNode) {
      node = node.parentNode;
    } else {
      break;
    }
  }
}

export default Ember.Component.extend({
  to: computed.alias('destinationElementId'),
  destinationElementId: null,
  destinationElement: computed('destinationElementId', 'renderInPlace', function() {
    let id = this.get('destinationElementId');
    let dom = this.renderer._dom.document.body;
    let el = findElementById(dom, id);
    if (!el) {
      throw new Error(`Unable to find element by id ${id}`);
    }
    return el;
  }),
  renderInPlace: false,

  willRender: function() {
    run.schedule('afterRender', () => {
      let element = this._renderNode.firstNode;
      let elementId = element.getAttribute('id');
      Ember.assert(`Rendered element id does not match expected (el id: ${elementId}, expected ${this.elementId}`, elementId === this.elementId);

      this._firstNode = element.firstChild;
      this._lastNode = element.lastChild;
      this.appendToDestination();
    });
  },

  didInsertElement: function() {
    // not called when in Fastboot
    this._super(...arguments);
    this._firstNode = this.element.firstChild;
    this._lastNode = this.element.lastChild;
    this.appendToDestination();
  },

  willDestroyElement: function() {
    this._super(...arguments);
    var firstNode = this._firstNode;
    var lastNode = this._lastNode;
    run.schedule('render', () => {
      this.removeRange(firstNode, lastNode);
    });
  },

  destinationDidChange: observer('destinationElement', function() {
    var destinationElement = this.get('destinationElement');
    if (destinationElement !== this._firstNode.parentNode) {
      run.schedule('render', this, 'appendToDestination');
    }
  }),

  appendToDestination: function() {
    var destinationElement = this.get('destinationElement');
    // ignore activeElement for this POC
    // var currentActiveElement = document.activeElement;
    if (!destinationElement) {
      var destinationElementId = this.get('destinationElementId');
      if (destinationElementId) {
        throw new Error(`ember-wormhole failed to render into '#${this.get('destinationElementId')}' because the element is not in the DOM`);
      }
      throw new Error('ember-wormhole failed to render content because the destinationElementId was set to an undefined or falsy value.');
    }

    this.appendRange(destinationElement, this._firstNode, this._lastNode);
    // ignore activeElement for this POC
    /*
    if (document.activeElement !== currentActiveElement) {
      currentActiveElement.focus();
    }
    */
  },

  appendRange: function(destinationElement, firstNode, lastNode) {
    while(firstNode) {
      destinationElement.insertBefore(firstNode, null);
      firstNode = firstNode !== lastNode ? lastNode.parentNode.firstChild : null;
    }
  },

  removeRange: function(firstNode, lastNode) {
    var node = lastNode;
    do {
      var next = node.previousSibling;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
        if (node === firstNode) {
          break;
        }
      }
      node = next;
    } while (node);
  }

});
