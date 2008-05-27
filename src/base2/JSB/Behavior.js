
var Behavior = Module.extend(null, {
  attach: I,
  detach: I,

  extend: function(_interface, _static) {
    // Extend a behavior to create a new behavior.
    var behavior = this.base(_interface, _static);
    behavior.EventDelegator = this.EventDelegator || EventDelegator;
    if (_static && _static.EventDelegator) {
      behavior.EventDelegator = behavior.EventDelegator.extend(_static.EventDelegator);
    }
    var events, delegatedEvents = [], attributes = {}, methods;
    var attachedElementIDs = {}; // base2IDs
    var eventListener = new EventListener(new behavior.EventDelegator(behavior, attachedElementIDs));
    
    if (behavior.ondocumentready) {
      behavior._readyQueue = [];
    }

    // Extract behavior properties.
    behavior.forEach (function(property, name) {
      if (_EVENT.test(name)) {
        var type = name.slice(2);
        // Store event handlers.
        if (_CAN_DELEGATE.test(type)) {
          delegatedEvents.push(type);
        } else {
          if (!events) events = [];
          events.push(type);
        }
      } else {
        // Store methods.
        if (!methods) methods = {};
        methods[name] = behavior.prototype[name];
      }
    });
    forEach.detect (_interface, function(property, name) {
      // Store attributes.
      if (typeOf(property) != "function") {
        attributes[name] = property;
      }
    });

    var docID = document.base2ID;
    behavior.attach = function(element) {
      //if (!element) return;
      var base2ID = element.base2ID || assignID(element);
      if (!attachedElementIDs[base2ID]) { // Don't attach more than once.
        attachedElementIDs[base2ID] = true;
        if (JSB.globalize && element.id) global[JSB.globalize + ViewCSS.toCamelCase(element.id)] = element;
        // If the document is bound then bind the element.
        if (DOM.bind[docID]) DOM.bind(element);
        // Add event handlers
        if (delegatedEvents) {
          forEach (delegatedEvents, bind(eventListener.delegate, eventListener));
          delegatedEvents = null;
        }
        if (events) {
          forEach (events, bind(eventListener.add, eventListener, element));
        }
        // Extend the element.
        for (var name in attributes) {
          var value = attributes[name];
          if (element[name] === undefined && typeof value != "object") {
            element.setAttribute(name, value)
          } else {
            element[name] = value;
          }
        }
        if (methods) extend(element, methods);
        // Pseudo events.
        if (behavior.onattach) behavior.onattach(element);
        if (behavior.oncontentready) {
          if (DocumentState.isContentReady(element)) {
            behavior.oncontentready(element);
          } else {
            DocumentState.readyQueue.push({element: element, behavior: behavior});
          }
        }
        if (behavior._readyQueue) {
          behavior._readyQueue.push(element);
        }
        if (element == document.activeElement && behavior.onfocus) {
          behavior.dispatchEvent(element, "focus");
        }
      }
      return element;
    };

    behavior.detach = function(element) {
      var base2ID = element.base2ID || assignID(element);
      if (attachedElementIDs[base2ID]) {
        if (behavior.ondetach) behavior.ondetach(element);
        delete attachedElementIDs[base2ID];
      }
      return element;
    };
    
    if (behavior.init) behavior.init();

    return behavior;
  },

  EventDelegator: null,

  dispatchEvent: function(element, event, data) {
    if (typeof event == "string") {
      var type = event;
      event = DocumentEvent.createEvent(document, "Events");
      Event.initEvent(event, type, true, false);
    }
    EventTarget.dispatchEvent(element, extend(event, data));
  },

  handleEvent: function(element, event, type) {
    // We could use the passed event type but we can't trust the descendant
    // classes to always pass it. :-)
    type = event.type;
    var handler = "on" + type;
    if (this[handler]) {
      if (_EVENT_MOUSE.test(type)) {
        if (!_EVENT_BUTTON.test(type) || _MOUSE_BUTTON_LEFT.test(event.button)) {
          if (type == "mousewheel") {
            this[handler](element, event, event.wheelDelta);
          } else {
            this[handler](element, event, event.offsetX, event.offsetY, event.screenX, event.screenY);
          }
        }
      } else if (_EVENT_TEXT.test(type)) {
        this[handler](element, event, event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
      } else {
        this[handler](element, event);
      }
    }
  },

  getComputedStyle: function(element, propertyName) {
    var view = document.defaultView;
    if (propertyName) return ViewCSS.getComputedPropertyValue(view, element, propertyName);
    return ViewCSS.getComputedStyle(view, element, null);
  },

  getCSSProperty: function(element, propertyName) {
    CSSStyleDeclaration.getPropertyValue(element.style, propertyName);
  },

  setCSSProperty: function(element, propertyName, value, important) {
    CSSStyleDeclaration.setProperty(element.style, propertyName, value, important ? "important" : "");
  }
});

forEach ([
  EventTarget,
  NodeSelector,
  Node,
  Element
], function(_interface) {
  _interface.forEach(function(method, name) {
    if (!Behavior[name]) {
      Behavior[name] = bind(method, _interface);
    }
  });
});

ClassList.forEach(function(method, name) {
  Behavior[name + "Class"] = bind(method, ClassList);
});