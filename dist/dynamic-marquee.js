(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.dynamicMarquee = {}));
})(this, (function (exports) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  /**
   * A boundary represents everything below a given point in the call stack.
   *
   * It can have an `onEnter` function which is called on entry and an `onExit`
   * function which is called on exit.
   *
   * To enter the boundry call `enter` with the function you want to run inside
   * it. On the first call to `enter` in the current stack `onEnter` will be
   * called before the provided function and `onExit` will be called after it.
   *
   * Nested `enter` calls will be called immediately.
   *
   * The function provided to `enter` will receive the return value from `onEnter`
   * as the first argument. This will be `undefined` if the `onEnter` function is still
   * executing.
   *
   * `onExit` will receive the the return value from `onEnter` and also the exception
   * if one is thrown from an `enter` call. It can choose to handle it, or leave it
   * to be rethrown.
   */
  var Boundary = /** @class */ (function () {
      /**
       * Takes an object with the following properties:
       * - onEnter (optional): A function that is called immediately before the boundary
       *                       is entered. It must not call `enter` on the boundary.
       * - onExit (optional): A function that is called immediately after leaving the
       *                      boundary. It receives an object that contains the following
       *                      properties:
       *                      - onEnterResult: The return value from `onEnter`. This will be
       *                                       `undefined` if `onEnter` threw an exception.
       *                      - exceptionOccurred: `true` if an exception occured inside
       *                                           the boundary.
       *                      - retrieveException: A function that returns the exception
       *                                           that occurred. Calling this will prevent
       *                                           the exception being thrown from `enter()`.
       *                                           Rethrow it if you don't want to handle it
       *                                           yourself.
       *                      If an exception occurs inside the boundary this will still
       *                      be called, and the exception will be rethrown, unless you call
       *                      `retrieveException`.
       */
      function Boundary(_a) {
          var onEnter = _a.onEnter, onExit = _a.onExit;
          this._execution = null;
          this.inBoundary = this.inBoundary.bind(this);
          this.enter = this.enter.bind(this);
          this._onEnter = onEnter || null;
          this._onExit = onExit || null;
      }
      /**
       * Returns `true` if called from within the boundary. This includes the `onEnter`
       * callback.
       */
      Boundary.prototype.inBoundary = function () {
          return !!this._execution;
      };
      Boundary.prototype.enter = function (fn) {
          if (this._execution) {
              return fn ? fn(this._execution.onEnterResult) : undefined;
          }
          var execution = (this._execution = {
              onEnterResult: undefined,
          });
          var returnVal = undefined;
          var exceptionOccurred = false;
          var exception = undefined;
          try {
              if (this._onEnter) {
                  execution.onEnterResult = this._onEnter();
              }
              if (fn) {
                  returnVal = fn(execution.onEnterResult);
              }
          }
          catch (e) {
              exceptionOccurred = true;
              exception = e;
          }
          this._execution = null;
          var exceptionHandled = !exceptionOccurred;
          if (this._onExit) {
              try {
                  this._onExit({
                      onEnterResult: execution.onEnterResult,
                      exceptionOccurred: exceptionOccurred,
                      retrieveException: function () {
                          exceptionHandled = true;
                          return exception;
                      },
                  });
              }
              catch (e) {
                  if (exceptionHandled) {
                      // if an error occured before onExit prioritise that one
                      // (similar to how `finally` works)
                      throw e;
                  }
              }
          }
          if (!exceptionHandled) {
              throw exception;
          }
          return returnVal;
      };
      return Boundary;
  }());

  var DIRECTION = {
    RIGHT: 'right',
    DOWN: 'down'
  };

  var resizeObservers = [];

  var hasActiveObservations = function () {
      return resizeObservers.some(function (ro) { return ro.activeTargets.length > 0; });
  };

  var hasSkippedObservations = function () {
      return resizeObservers.some(function (ro) { return ro.skippedTargets.length > 0; });
  };

  var msg = 'ResizeObserver loop completed with undelivered notifications.';
  var deliverResizeLoopError = function () {
      var event;
      if (typeof ErrorEvent === 'function') {
          event = new ErrorEvent('error', {
              message: msg
          });
      }
      else {
          event = document.createEvent('Event');
          event.initEvent('error', false, false);
          event.message = msg;
      }
      window.dispatchEvent(event);
  };

  var ResizeObserverBoxOptions;
  (function (ResizeObserverBoxOptions) {
      ResizeObserverBoxOptions["BORDER_BOX"] = "border-box";
      ResizeObserverBoxOptions["CONTENT_BOX"] = "content-box";
      ResizeObserverBoxOptions["DEVICE_PIXEL_CONTENT_BOX"] = "device-pixel-content-box";
  })(ResizeObserverBoxOptions || (ResizeObserverBoxOptions = {}));

  var freeze = function (obj) { return Object.freeze(obj); };

  var ResizeObserverSize = (function () {
      function ResizeObserverSize(inlineSize, blockSize) {
          this.inlineSize = inlineSize;
          this.blockSize = blockSize;
          freeze(this);
      }
      return ResizeObserverSize;
  }());

  var DOMRectReadOnly = (function () {
      function DOMRectReadOnly(x, y, width, height) {
          this.x = x;
          this.y = y;
          this.width = width;
          this.height = height;
          this.top = this.y;
          this.left = this.x;
          this.bottom = this.top + this.height;
          this.right = this.left + this.width;
          return freeze(this);
      }
      DOMRectReadOnly.prototype.toJSON = function () {
          var _a = this, x = _a.x, y = _a.y, top = _a.top, right = _a.right, bottom = _a.bottom, left = _a.left, width = _a.width, height = _a.height;
          return { x: x, y: y, top: top, right: right, bottom: bottom, left: left, width: width, height: height };
      };
      DOMRectReadOnly.fromRect = function (rectangle) {
          return new DOMRectReadOnly(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
      };
      return DOMRectReadOnly;
  }());

  var isSVG = function (target) { return target instanceof SVGElement && 'getBBox' in target; };
  var isHidden = function (target) {
      if (isSVG(target)) {
          var _a = target.getBBox(), width = _a.width, height = _a.height;
          return !width && !height;
      }
      var _b = target, offsetWidth = _b.offsetWidth, offsetHeight = _b.offsetHeight;
      return !(offsetWidth || offsetHeight || target.getClientRects().length);
  };
  var isElement = function (obj) {
      var _a, _b;
      if (obj instanceof Element) {
          return true;
      }
      var scope = (_b = (_a = obj) === null || _a === void 0 ? void 0 : _a.ownerDocument) === null || _b === void 0 ? void 0 : _b.defaultView;
      return !!(scope && obj instanceof scope.Element);
  };
  var isReplacedElement = function (target) {
      switch (target.tagName) {
          case 'INPUT':
              if (target.type !== 'image') {
                  break;
              }
          case 'VIDEO':
          case 'AUDIO':
          case 'EMBED':
          case 'OBJECT':
          case 'CANVAS':
          case 'IFRAME':
          case 'IMG':
              return true;
      }
      return false;
  };

  var global = typeof window !== 'undefined' ? window : {};

  var cache = new WeakMap();
  var scrollRegexp = /auto|scroll/;
  var verticalRegexp = /^tb|vertical/;
  var IE = (/msie|trident/i).test(global.navigator && global.navigator.userAgent);
  var parseDimension = function (pixel) { return parseFloat(pixel || '0'); };
  var size = function (inlineSize, blockSize, switchSizes) {
      if (inlineSize === void 0) { inlineSize = 0; }
      if (blockSize === void 0) { blockSize = 0; }
      if (switchSizes === void 0) { switchSizes = false; }
      return new ResizeObserverSize((switchSizes ? blockSize : inlineSize) || 0, (switchSizes ? inlineSize : blockSize) || 0);
  };
  var zeroBoxes = freeze({
      devicePixelContentBoxSize: size(),
      borderBoxSize: size(),
      contentBoxSize: size(),
      contentRect: new DOMRectReadOnly(0, 0, 0, 0)
  });
  var calculateBoxSizes = function (target, forceRecalculation) {
      if (forceRecalculation === void 0) { forceRecalculation = false; }
      if (cache.has(target) && !forceRecalculation) {
          return cache.get(target);
      }
      if (isHidden(target)) {
          cache.set(target, zeroBoxes);
          return zeroBoxes;
      }
      var cs = getComputedStyle(target);
      var svg = isSVG(target) && target.ownerSVGElement && target.getBBox();
      var removePadding = !IE && cs.boxSizing === 'border-box';
      var switchSizes = verticalRegexp.test(cs.writingMode || '');
      var canScrollVertically = !svg && scrollRegexp.test(cs.overflowY || '');
      var canScrollHorizontally = !svg && scrollRegexp.test(cs.overflowX || '');
      var paddingTop = svg ? 0 : parseDimension(cs.paddingTop);
      var paddingRight = svg ? 0 : parseDimension(cs.paddingRight);
      var paddingBottom = svg ? 0 : parseDimension(cs.paddingBottom);
      var paddingLeft = svg ? 0 : parseDimension(cs.paddingLeft);
      var borderTop = svg ? 0 : parseDimension(cs.borderTopWidth);
      var borderRight = svg ? 0 : parseDimension(cs.borderRightWidth);
      var borderBottom = svg ? 0 : parseDimension(cs.borderBottomWidth);
      var borderLeft = svg ? 0 : parseDimension(cs.borderLeftWidth);
      var horizontalPadding = paddingLeft + paddingRight;
      var verticalPadding = paddingTop + paddingBottom;
      var horizontalBorderArea = borderLeft + borderRight;
      var verticalBorderArea = borderTop + borderBottom;
      var horizontalScrollbarThickness = !canScrollHorizontally ? 0 : target.offsetHeight - verticalBorderArea - target.clientHeight;
      var verticalScrollbarThickness = !canScrollVertically ? 0 : target.offsetWidth - horizontalBorderArea - target.clientWidth;
      var widthReduction = removePadding ? horizontalPadding + horizontalBorderArea : 0;
      var heightReduction = removePadding ? verticalPadding + verticalBorderArea : 0;
      var contentWidth = svg ? svg.width : parseDimension(cs.width) - widthReduction - verticalScrollbarThickness;
      var contentHeight = svg ? svg.height : parseDimension(cs.height) - heightReduction - horizontalScrollbarThickness;
      var borderBoxWidth = contentWidth + horizontalPadding + verticalScrollbarThickness + horizontalBorderArea;
      var borderBoxHeight = contentHeight + verticalPadding + horizontalScrollbarThickness + verticalBorderArea;
      var boxes = freeze({
          devicePixelContentBoxSize: size(Math.round(contentWidth * devicePixelRatio), Math.round(contentHeight * devicePixelRatio), switchSizes),
          borderBoxSize: size(borderBoxWidth, borderBoxHeight, switchSizes),
          contentBoxSize: size(contentWidth, contentHeight, switchSizes),
          contentRect: new DOMRectReadOnly(paddingLeft, paddingTop, contentWidth, contentHeight)
      });
      cache.set(target, boxes);
      return boxes;
  };
  var calculateBoxSize = function (target, observedBox, forceRecalculation) {
      var _a = calculateBoxSizes(target, forceRecalculation), borderBoxSize = _a.borderBoxSize, contentBoxSize = _a.contentBoxSize, devicePixelContentBoxSize = _a.devicePixelContentBoxSize;
      switch (observedBox) {
          case ResizeObserverBoxOptions.DEVICE_PIXEL_CONTENT_BOX:
              return devicePixelContentBoxSize;
          case ResizeObserverBoxOptions.BORDER_BOX:
              return borderBoxSize;
          default:
              return contentBoxSize;
      }
  };

  var ResizeObserverEntry = (function () {
      function ResizeObserverEntry(target) {
          var boxes = calculateBoxSizes(target);
          this.target = target;
          this.contentRect = boxes.contentRect;
          this.borderBoxSize = freeze([boxes.borderBoxSize]);
          this.contentBoxSize = freeze([boxes.contentBoxSize]);
          this.devicePixelContentBoxSize = freeze([boxes.devicePixelContentBoxSize]);
      }
      return ResizeObserverEntry;
  }());

  var calculateDepthForNode = function (node) {
      if (isHidden(node)) {
          return Infinity;
      }
      var depth = 0;
      var parent = node.parentNode;
      while (parent) {
          depth += 1;
          parent = parent.parentNode;
      }
      return depth;
  };

  var broadcastActiveObservations = function () {
      var shallowestDepth = Infinity;
      var callbacks = [];
      resizeObservers.forEach(function processObserver(ro) {
          if (ro.activeTargets.length === 0) {
              return;
          }
          var entries = [];
          ro.activeTargets.forEach(function processTarget(ot) {
              var entry = new ResizeObserverEntry(ot.target);
              var targetDepth = calculateDepthForNode(ot.target);
              entries.push(entry);
              ot.lastReportedSize = calculateBoxSize(ot.target, ot.observedBox);
              if (targetDepth < shallowestDepth) {
                  shallowestDepth = targetDepth;
              }
          });
          callbacks.push(function resizeObserverCallback() {
              ro.callback.call(ro.observer, entries, ro.observer);
          });
          ro.activeTargets.splice(0, ro.activeTargets.length);
      });
      for (var _i = 0, callbacks_1 = callbacks; _i < callbacks_1.length; _i++) {
          var callback = callbacks_1[_i];
          callback();
      }
      return shallowestDepth;
  };

  var gatherActiveObservationsAtDepth = function (depth) {
      resizeObservers.forEach(function processObserver(ro) {
          ro.activeTargets.splice(0, ro.activeTargets.length);
          ro.skippedTargets.splice(0, ro.skippedTargets.length);
          ro.observationTargets.forEach(function processTarget(ot) {
              if (ot.isActive()) {
                  if (calculateDepthForNode(ot.target) > depth) {
                      ro.activeTargets.push(ot);
                  }
                  else {
                      ro.skippedTargets.push(ot);
                  }
              }
          });
      });
  };

  var process = function () {
      var depth = 0;
      gatherActiveObservationsAtDepth(depth);
      while (hasActiveObservations()) {
          depth = broadcastActiveObservations();
          gatherActiveObservationsAtDepth(depth);
      }
      if (hasSkippedObservations()) {
          deliverResizeLoopError();
      }
      return depth > 0;
  };

  var trigger;
  var callbacks = [];
  var notify = function () { return callbacks.splice(0).forEach(function (cb) { return cb(); }); };
  var queueMicroTask = function (callback) {
      if (!trigger) {
          var toggle_1 = 0;
          var el_1 = document.createTextNode('');
          var config = { characterData: true };
          new MutationObserver(function () { return notify(); }).observe(el_1, config);
          trigger = function () { el_1.textContent = "" + (toggle_1 ? toggle_1-- : toggle_1++); };
      }
      callbacks.push(callback);
      trigger();
  };

  var queueResizeObserver = function (cb) {
      queueMicroTask(function ResizeObserver() {
          requestAnimationFrame(cb);
      });
  };

  var watching = 0;
  var isWatching = function () { return !!watching; };
  var CATCH_PERIOD = 250;
  var observerConfig = { attributes: true, characterData: true, childList: true, subtree: true };
  var events = [
      'resize',
      'load',
      'transitionend',
      'animationend',
      'animationstart',
      'animationiteration',
      'keyup',
      'keydown',
      'mouseup',
      'mousedown',
      'mouseover',
      'mouseout',
      'blur',
      'focus'
  ];
  var time = function (timeout) {
      if (timeout === void 0) { timeout = 0; }
      return Date.now() + timeout;
  };
  var scheduled = false;
  var Scheduler = (function () {
      function Scheduler() {
          var _this = this;
          this.stopped = true;
          this.listener = function () { return _this.schedule(); };
      }
      Scheduler.prototype.run = function (timeout) {
          var _this = this;
          if (timeout === void 0) { timeout = CATCH_PERIOD; }
          if (scheduled) {
              return;
          }
          scheduled = true;
          var until = time(timeout);
          queueResizeObserver(function () {
              var elementsHaveResized = false;
              try {
                  elementsHaveResized = process();
              }
              finally {
                  scheduled = false;
                  timeout = until - time();
                  if (!isWatching()) {
                      return;
                  }
                  if (elementsHaveResized) {
                      _this.run(1000);
                  }
                  else if (timeout > 0) {
                      _this.run(timeout);
                  }
                  else {
                      _this.start();
                  }
              }
          });
      };
      Scheduler.prototype.schedule = function () {
          this.stop();
          this.run();
      };
      Scheduler.prototype.observe = function () {
          var _this = this;
          var cb = function () { return _this.observer && _this.observer.observe(document.body, observerConfig); };
          document.body ? cb() : global.addEventListener('DOMContentLoaded', cb);
      };
      Scheduler.prototype.start = function () {
          var _this = this;
          if (this.stopped) {
              this.stopped = false;
              this.observer = new MutationObserver(this.listener);
              this.observe();
              events.forEach(function (name) { return global.addEventListener(name, _this.listener, true); });
          }
      };
      Scheduler.prototype.stop = function () {
          var _this = this;
          if (!this.stopped) {
              this.observer && this.observer.disconnect();
              events.forEach(function (name) { return global.removeEventListener(name, _this.listener, true); });
              this.stopped = true;
          }
      };
      return Scheduler;
  }());
  var scheduler = new Scheduler();
  var updateCount = function (n) {
      !watching && n > 0 && scheduler.start();
      watching += n;
      !watching && scheduler.stop();
  };

  var skipNotifyOnElement = function (target) {
      return !isSVG(target)
          && !isReplacedElement(target)
          && getComputedStyle(target).display === 'inline';
  };
  var ResizeObservation = (function () {
      function ResizeObservation(target, observedBox) {
          this.target = target;
          this.observedBox = observedBox || ResizeObserverBoxOptions.CONTENT_BOX;
          this.lastReportedSize = {
              inlineSize: 0,
              blockSize: 0
          };
      }
      ResizeObservation.prototype.isActive = function () {
          var size = calculateBoxSize(this.target, this.observedBox, true);
          if (skipNotifyOnElement(this.target)) {
              this.lastReportedSize = size;
          }
          if (this.lastReportedSize.inlineSize !== size.inlineSize
              || this.lastReportedSize.blockSize !== size.blockSize) {
              return true;
          }
          return false;
      };
      return ResizeObservation;
  }());

  var ResizeObserverDetail = (function () {
      function ResizeObserverDetail(resizeObserver, callback) {
          this.activeTargets = [];
          this.skippedTargets = [];
          this.observationTargets = [];
          this.observer = resizeObserver;
          this.callback = callback;
      }
      return ResizeObserverDetail;
  }());

  var observerMap = new WeakMap();
  var getObservationIndex = function (observationTargets, target) {
      for (var i = 0; i < observationTargets.length; i += 1) {
          if (observationTargets[i].target === target) {
              return i;
          }
      }
      return -1;
  };
  var ResizeObserverController = (function () {
      function ResizeObserverController() {
      }
      ResizeObserverController.connect = function (resizeObserver, callback) {
          var detail = new ResizeObserverDetail(resizeObserver, callback);
          observerMap.set(resizeObserver, detail);
      };
      ResizeObserverController.observe = function (resizeObserver, target, options) {
          var detail = observerMap.get(resizeObserver);
          var firstObservation = detail.observationTargets.length === 0;
          if (getObservationIndex(detail.observationTargets, target) < 0) {
              firstObservation && resizeObservers.push(detail);
              detail.observationTargets.push(new ResizeObservation(target, options && options.box));
              updateCount(1);
              scheduler.schedule();
          }
      };
      ResizeObserverController.unobserve = function (resizeObserver, target) {
          var detail = observerMap.get(resizeObserver);
          var index = getObservationIndex(detail.observationTargets, target);
          var lastObservation = detail.observationTargets.length === 1;
          if (index >= 0) {
              lastObservation && resizeObservers.splice(resizeObservers.indexOf(detail), 1);
              detail.observationTargets.splice(index, 1);
              updateCount(-1);
          }
      };
      ResizeObserverController.disconnect = function (resizeObserver) {
          var _this = this;
          var detail = observerMap.get(resizeObserver);
          detail.observationTargets.slice().forEach(function (ot) { return _this.unobserve(resizeObserver, ot.target); });
          detail.activeTargets.splice(0, detail.activeTargets.length);
      };
      return ResizeObserverController;
  }());

  var ResizeObserver = (function () {
      function ResizeObserver(callback) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (typeof callback !== 'function') {
              throw new TypeError("Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.");
          }
          ResizeObserverController.connect(this, callback);
      }
      ResizeObserver.prototype.observe = function (target, options) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (!isElement(target)) {
              throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element");
          }
          ResizeObserverController.observe(this, target, options);
      };
      ResizeObserver.prototype.unobserve = function (target) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (!isElement(target)) {
              throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element");
          }
          ResizeObserverController.unobserve(this, target);
      };
      ResizeObserver.prototype.disconnect = function () {
          ResizeObserverController.disconnect(this);
      };
      ResizeObserver.toString = function () {
          return 'function ResizeObserver () { [polyfill code] }';
      };
      return ResizeObserver;
  }());

  var PX_REGEX = /px$/;

  function pxStringToValue(input) {
    if (!PX_REGEX.test(input)) {
      throw new Error('String missing `px` suffix');
    }

    return parseFloat(input.slice(0, -2));
  }

  var SizeWatcher = /*#__PURE__*/function () {
    function SizeWatcher($el) {
      var _this = this,
          _this$_observer;

      _classCallCheck(this, SizeWatcher);

      this._$el = $el;
      this._width = null;
      this._height = null;
      this._observer = new ResizeObserver(function (entries) {
        var entry = entries[entries.length - 1];
        var size = entry.borderBoxSize[0] || entry.borderBoxSize;
        _this._width = size.inlineSize;
        _this._height = size.blockSize;
      });
      (_this$_observer = this._observer) === null || _this$_observer === void 0 ? void 0 : _this$_observer.observe($el);
    }

    _createClass(SizeWatcher, [{
      key: "getWidth",
      value: function getWidth() {
        if (this._width !== null) return this._width; // maps to `inlineSize`

        var width = pxStringToValue(window.getComputedStyle(this._$el).width);
        if (this._observer) this._width = width;
        return width;
      }
    }, {
      key: "getHeight",
      value: function getHeight() {
        if (this._height !== null) return this._height; // maps to `blockSize`

        var height = pxStringToValue(window.getComputedStyle(this._$el).height);
        if (this._observer) this._height = height;
        return height;
      }
    }, {
      key: "tearDown",
      value: function tearDown() {
        var _this$_observer2;

        (_this$_observer2 = this._observer) === null || _this$_observer2 === void 0 ? void 0 : _this$_observer2.disconnect();
        this._observer = null;
      }
    }]);

    return SizeWatcher;
  }();

  var Item = /*#__PURE__*/function () {
    function Item($el, direction, metadata) {
      _classCallCheck(this, Item);

      var $container = document.createElement('div');
      $container.style.display = 'block';
      $container.style.opacity = '0';
      $container.style.position = 'absolute';
      $container.style.margin = '0';
      $container.style.padding = '0';

      if (direction === DIRECTION.RIGHT) {
        $container.style.whiteSpace = 'nowrap';
      }

      this._sizeWatcher = new SizeWatcher($container);
      $container.appendChild($el);
      this._$container = $container;
      this._$el = $el;
      this._direction = direction;
      this._metadata = metadata;
      this._offset = null;
    }

    _createClass(Item, [{
      key: "getSize",
      value: function getSize() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$inverse = _ref.inverse,
            inverse = _ref$inverse === void 0 ? false : _ref$inverse;

        var dir = this._direction;

        if (inverse) {
          dir = dir === DIRECTION.RIGHT ? DIRECTION.DOWN : DIRECTION.RIGHT;
        }

        return dir === DIRECTION.RIGHT ? this._sizeWatcher.getWidth() : this._sizeWatcher.getHeight();
      }
    }, {
      key: "setOffset",
      value: function setOffset(offset) {
        if (this._offset === offset) return;
        this._offset = offset;
        this._$container.style.opacity = '1';

        if (this._direction === DIRECTION.RIGHT) {
          this._$container.style.left = "".concat(offset, "px");
        } else {
          this._$container.style.top = "".concat(offset, "px");
        }
      }
    }, {
      key: "remove",
      value: function remove() {
        this._sizeWatcher.tearDown();

        this._$container.parentNode.removeChild(this._$container);
      }
    }, {
      key: "getContainer",
      value: function getContainer() {
        return this._$container;
      }
    }, {
      key: "getOriginalEl",
      value: function getOriginalEl() {
        return this._$el;
      }
    }, {
      key: "getMetadata",
      value: function getMetadata() {
        return this._metadata;
      }
    }]);

    return Item;
  }();

  var transitionDuration = 30000;
  var Slider = /*#__PURE__*/function () {
    function Slider($el, direction) {
      _classCallCheck(this, Slider);

      this._$el = $el;
      this._direction = direction;
      this._transitionState = null;
    }

    _createClass(Slider, [{
      key: "setOffset",
      value: function setOffset(offset, rate, force) {
        var transitionState = this._transitionState;
        var rateChanged = !transitionState || transitionState.rate !== rate;

        if (transitionState && !force) {
          var timePassed = performance.now() - transitionState.time;

          if (timePassed < transitionDuration - 10000 && !rateChanged) {
            return;
          }
        }

        if (force || rateChanged) {
          if (this._direction === DIRECTION.RIGHT) {
            this._$el.style.transform = "translateX(".concat(offset, "px)");
          } else {
            this._$el.style.transform = "translateY(".concat(offset, "px)");
          }

          this._$el.style.transition = 'none';
          this._$el.offsetLeft;
        }

        if (rate && (force || rateChanged)) {
          this._$el.style.transition = "transform ".concat(transitionDuration, "ms linear");
        }

        if (rate) {
          var futureOffset = offset + rate / 1000 * transitionDuration;

          if (this._direction === DIRECTION.RIGHT) {
            this._$el.style.transform = "translateX(".concat(futureOffset, "px)");
          } else {
            this._$el.style.transform = "translateY(".concat(futureOffset, "px)");
          }
        }

        this._transitionState = {
          time: performance.now(),
          rate: rate
        };
      }
    }]);

    return Slider;
  }();

  function defer(fn) {
    window.setTimeout(function () {
      return fn();
    }, 0);
  }
  function deferException(cb) {
    try {
      return cb();
    } catch (e) {
      defer(function () {
        throw e;
      });
    }
  }
  function toDomEl($el) {
    if (typeof $el === 'string' || typeof $el === 'number') {
      // helper. convert string to div
      var $div = document.createElement('div');
      $div.textContent = $el + '';
      return $div;
    }

    return $el;
  }
  function last(input) {
    return input.length ? input[input.length - 1] : null;
  }
  function first(input) {
    return input.length ? input[0] : null;
  }

  var maxTranslateDistance = 500000;
  var renderInterval = 100;
  var Marquee = /*#__PURE__*/function () {
    function Marquee($container) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref$rate = _ref.rate,
          rate = _ref$rate === void 0 ? -25 : _ref$rate,
          _ref$upDown = _ref.upDown,
          upDown = _ref$upDown === void 0 ? false : _ref$upDown,
          _ref$startOnScreen = _ref.startOnScreen,
          startOnScreen = _ref$startOnScreen === void 0 ? false : _ref$startOnScreen;

      _classCallCheck(this, Marquee);

      this._boundary = new Boundary({
        onEnter: function onEnter() {
          return {
            callbacks: []
          };
        },
        onExit: function onExit(_ref2) {
          var callbacks = _ref2.onEnterResult.callbacks;
          callbacks.forEach(function (cb) {
            return defer(function () {
              return cb();
            });
          });
        }
      });
      this._waitingForItem = true;
      this._nextItemWouldBeTouching = startOnScreen;
      this._rate = rate;
      this._lastEffectiveRate = rate;
      this._justReversedRate = false;
      this._correlation = null;
      this._direction = upDown ? DIRECTION.DOWN : DIRECTION.RIGHT;
      this._onItemRequired = [];
      this._onItemRemoved = [];
      this._onAllItemsRemoved = [];
      this._windowOffset = 0;
      this._containerSize = 0;
      this._containerSizeWatcher = null;
      this._items = [];
      this._pendingItem = null;
      this._visible = !!document.hidden;
      var $window = document.createElement('div');
      $window.style.display = 'block';
      $window.style.overflow = 'hidden';
      $window.style.position = 'relative';

      if (this._direction === DIRECTION.DOWN) {
        $window.style.height = '100%';
      }

      this._$window = $window;
      this.windowInverseSize = null;

      this._updateWindowInverseSize();

      var $moving = document.createElement('div');
      this._$moving = $moving;
      $moving.style.display = 'block';
      $moving.style.position = 'absolute';
      $moving.style.left = '0';
      $moving.style.right = '0';
      this._slider = new Slider($moving, this._direction);
      $window.appendChild($moving);
      $container.appendChild($window);
    } // called when there's room for a new item.
    // You can return the item to append next


    _createClass(Marquee, [{
      key: "onItemRequired",
      value: function onItemRequired(cb) {
        this._onItemRequired.push(cb);
      } // Called when an item is removed

    }, {
      key: "onItemRemoved",
      value: function onItemRemoved(cb) {
        this._onItemRemoved.push(cb);
      } // Called when the last item is removed

    }, {
      key: "onAllItemsRemoved",
      value: function onAllItemsRemoved(cb) {
        this._onAllItemsRemoved.push(cb);
      }
    }, {
      key: "getNumItems",
      value: function getNumItems() {
        return this._items.length;
      }
    }, {
      key: "setRate",
      value: function setRate(rate) {
        if (rate === this._rate) {
          return;
        }

        if (rate * this._lastEffectiveRate < 0) {
          this._justReversedRate = !this._justReversedRate;
        }

        this._rate = rate;

        if (rate) {
          this._lastEffectiveRate = rate;

          if (!this._items.length) {
            this._waitingForItem = true;
          }
        } else {
          this._waitingForItem = false;
        }

        this._tick();
      }
    }, {
      key: "getRate",
      value: function getRate() {
        return this._rate;
      }
    }, {
      key: "clear",
      value: function clear() {
        var _this = this;

        this._boundary.enter(function () {
          _this._items.forEach(function (_ref3) {
            var item = _ref3.item;
            return _this._removeItem(item);
          });

          _this._items = [];
          _this._waitingForItem = true;
          _this._nextItemWouldBeTouching = false;

          _this._updateWindowInverseSize();

          _this._cleanup();
        });
      }
    }, {
      key: "isWaitingForItem",
      value: function isWaitingForItem() {
        return this._waitingForItem;
      }
    }, {
      key: "appendItem",
      value: function appendItem($el) {
        var _this2 = this;

        var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref4$metadata = _ref4.metadata,
            metadata = _ref4$metadata === void 0 ? null : _ref4$metadata;

        this._boundary.enter(function () {
          if (!_this2._waitingForItem) {
            throw new Error('No room for item.');
          } // convert to div if $el is a string


          $el = toDomEl($el);

          var itemAlreadyExists = _this2._items.some(function (_ref5) {
            var item = _ref5.item;
            return item.getOriginalEl() === $el;
          });

          if (itemAlreadyExists) {
            throw new Error('Item already exists.');
          }

          _this2._waitingForItem = false;
          _this2._pendingItem = new Item($el, _this2._direction, metadata);

          _this2._tick();
        });
      }
    }, {
      key: "_removeItem",
      value: function _removeItem(item) {
        var _this3 = this;

        this._boundary.enter(function (_ref6) {
          var callbacks = _ref6.callbacks;
          item.remove();

          _this3._items.splice(_this3._items.indexOf(item), 1);

          _this3._onItemRemoved.forEach(function (cb) {
            callbacks.push(function () {
              return cb(item.getOriginalEl());
            });
          });
        });
      } // update size of container so that the marquee items fit inside it.
      // This is needed because the items are posisitioned absolutely, so not in normal flow.
      // Without this, for DIRECTION.RIGHT, the height of the container would always be 0px, which is not useful

    }, {
      key: "_updateWindowInverseSize",
      value: function _updateWindowInverseSize() {
        if (this._direction === DIRECTION.DOWN) {
          return;
        }

        var maxSize = Math.max.apply(Math, _toConsumableArray(this._items.map(function (_ref7) {
          var item = _ref7.item;
          return item.getSize({
            inverse: true
          });
        })));

        if (this.windowInverseSize !== maxSize) {
          this.windowInverseSize = maxSize;
          this._$window.style.height = "".concat(maxSize, "px");
        }
      }
    }, {
      key: "_scheduleRender",
      value: function _scheduleRender() {
        var _this4 = this;

        if (!this._renderTimer) {
          // ideally we'd use requestAnimationFrame here but there's a bug in
          // chrome which means when the callback is called it triggers a style
          // recalculation even when nothing changes, which is not efficient
          // see https://bugs.chromium.org/p/chromium/issues/detail?id=1252311
          // and https://stackoverflow.com/q/69293778/1048589
          this._renderTimer = window.setTimeout(function () {
            return _this4._tick();
          }, renderInterval);
        }
      }
    }, {
      key: "_cleanup",
      value: function _cleanup() {
        var _this$_containerSizeW;

        (_this$_containerSizeW = this._containerSizeWatcher) === null || _this$_containerSizeW === void 0 ? void 0 : _this$_containerSizeW.tearDown();
        this._containerSizeWatcher = null;
        this._correlation = null;
        this._windowOffset = 0;
      }
    }, {
      key: "_tick",
      value: function _tick() {
        var _this5 = this;

        this._boundary.enter(function (_ref8) {
          var callbacks = _ref8.callbacks;
          _this5._renderTimer && clearTimeout(_this5._renderTimer);
          _this5._renderTimer = null;

          if (!_this5._items.length && !_this5._pendingItem) {
            _this5._cleanup();

            return;
          }

          _this5._scheduleRender();

          if (!_this5._$window.isConnected) {
            // pause if we've been removed from the dom
            _this5._correlation = null;
            return;
          }

          if (!_this5._containerSizeWatcher) {
            _this5._containerSizeWatcher = new SizeWatcher(_this5._$window);
          }

          var now = performance.now();
          var resynced = false;

          if (_this5._correlation) {
            var timePassed = now - _this5._correlation.time;
            _this5._windowOffset = _this5._correlation.offset + _this5._correlation.rate * -1 * (timePassed / 1000);
          } else {
            resynced = true;
          }

          if (Math.abs(_this5._windowOffset) > maxTranslateDistance) {
            // resync so that the number of pixels we are translating doesn't get too big
            resynced = true;
            var shiftAmount = _this5._windowOffset;

            _this5._items.forEach(function (item) {
              return item.offset -= shiftAmount;
            });

            _this5._correlation = null;
            _this5._windowOffset = 0;
          }

          var visible = !document.hidden;
          var goneVisible = visible && _this5._visible !== visible;
          _this5._visible = visible;

          _this5._slider.setOffset(_this5._windowOffset * -1, _this5._rate, resynced || goneVisible);

          if (!_this5._correlation || _this5._correlation.rate !== _this5._rate) {
            _this5._correlation = {
              time: now,
              offset: _this5._windowOffset,
              rate: _this5._rate
            };
          }

          _this5._containerSize = _this5._direction === DIRECTION.RIGHT ? _this5._containerSizeWatcher.getWidth() : _this5._containerSizeWatcher.getHeight(); // if container has size 0 pretend it is 1 to prevent infinite loop
          // of adding items that are instantly removed

          var containerSize = Math.max(_this5._containerSize, 1);
          var justReversedRate = _this5._justReversedRate;
          _this5._justReversedRate = false;
          var newItemWouldBeTouching = _this5._nextItemWouldBeTouching;
          _this5._nextItemWouldBeTouching = null;
          var nextItemTouching = null;

          if (_this5._pendingItem) {
            _this5._$moving.appendChild(_this5._pendingItem.getContainer());

            var touching = _this5._rate <= 0 ? last(_this5._items) : first(_this5._items);

            if (_this5._rate <= 0) {
              _this5._items = [].concat(_toConsumableArray(_this5._items), [{
                item: _this5._pendingItem,
                appendRate: _this5._rate,
                offset: newItemWouldBeTouching ? touching ? touching.offset + touching.item.getSize() : _this5._windowOffset : _this5._windowOffset + containerSize
              }]);
            } else {
              _this5._items = [{
                item: _this5._pendingItem,
                appendRate: _this5._rate,
                offset: newItemWouldBeTouching ? touching ? touching.offset - _this5._pendingItem.getSize() : _this5._windowOffset + containerSize - _this5._pendingItem.getSize() : _this5._windowOffset - _this5._pendingItem.getSize()
              }].concat(_toConsumableArray(_this5._items));
            }

            _this5._pendingItem = null;
          } // add a buffer on the side to make sure that new elements are added before they would actually be on screen


          var buffer = renderInterval / 1000 * Math.abs(_this5._rate);
          var requireNewItem = false;

          if (!_this5._waitingForItem && _this5._items.length
          /* there should always be items at this point */
          ) {
            var firstItem = first(_this5._items);
            var lastItem = last(_this5._items);

            var _touching = _this5._rate <= 0 ? lastItem : firstItem;

            if (_this5._rate <= 0 && lastItem.offset + _touching.item.getSize() - _this5._windowOffset <= containerSize + buffer || _this5._rate > 0 && _touching.offset - _this5._windowOffset > -1 * buffer) {
              _this5._waitingForItem = requireNewItem = true; // if an item is appended immediately below, it would be considered touching
              // the previous if we haven't just changed direction.
              // This is useful when deciding whether to add a separator on the side that enters the
              // screen first or not

              nextItemTouching = justReversedRate ? null : {
                $el: _touching.item.getOriginalEl(),
                metadata: _touching.item.getMetadata()
              };
            }
          }

          if (nextItemTouching) {
            _this5._nextItemWouldBeTouching = true;
          }

          _this5._items = _toConsumableArray(_this5._items).filter(function (_ref9) {
            var item = _ref9.item,
                offset = _ref9.offset;
            var keep = _this5._rate < 0 ? offset + item.getSize() > _this5._windowOffset : offset < _this5._windowOffset + containerSize;
            if (!keep) _this5._removeItem(item);
            return keep;
          });

          if (!_this5._items.length) {
            _this5._onAllItemsRemoved.forEach(function (cb) {
              return callbacks.push(cb);
            });
          }

          _this5._items.reduce(function (newOffset, item) {
            if (newOffset !== null && item.offset < newOffset) {
              // the size of the item before has increased and would now be overlapping
              // this one, so shuffle this one along
              item.offset = newOffset;
            }

            item.item.setOffset(item.offset);
            return item.offset + item.item.getSize();
          }, null);

          _this5._updateWindowInverseSize();

          if (requireNewItem) {
            var nextItem;

            _this5._onItemRequired.some(function (cb) {
              return deferException(function () {
                nextItem = cb({
                  /** @deprecated */
                  immediatelyFollowsPrevious: !!nextItemTouching,
                  touching: nextItemTouching
                });
                return !!nextItem;
              });
            });

            if (nextItem) {
              // Note appendItem() will call _tick() synchronously again
              _this5.appendItem(nextItem);
            }

            _this5._nextItemWouldBeTouching = false;
          }
        });
      }
    }]);

    return Marquee;
  }();

  var indexMap = function(list) {
    var map = {};
    list.forEach(function(each, i) {
      map[each] = map[each] || [];
      map[each].push(i);
    });
    return map
  };

  var longestCommonSubstring = function(seq1, seq2) {
    var result = {startString1:0, startString2:0, length:0};
    var indexMapBefore = indexMap(seq1);
    var previousOverlap = [];
    seq2.forEach(function(eachAfter, indexAfter) {
      var overlapLength;
      var overlap = [];
      var indexesBefore = indexMapBefore[eachAfter] || [];
      indexesBefore.forEach(function(indexBefore) {
        overlapLength = ((indexBefore && previousOverlap[indexBefore-1]) || 0) + 1;
        if (overlapLength > result.length) {
          result.length = overlapLength;
          result.startString1 = indexBefore - overlapLength + 1;
          result.startString2 = indexAfter - overlapLength + 1;
        }
        overlap[indexBefore] = overlapLength;
      });
      previousOverlap = overlap;
    });
    return result
  };

  var longestCommonSubstring_1 = longestCommonSubstring;

  function loop(marquee) {
    var buildersIn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var seperatorBuilder = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var lastIndex = -1;
    var builders = buildersIn.slice();

    var getNextBuilder = function getNextBuilder() {
      var offset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
      var nextIndex = (lastIndex + offset) % builders.length;
      return {
        builder: builders[nextIndex],
        index: nextIndex
      };
    };

    var appendItem = function appendItem(touching) {
      var _touching$metadata;

      if (!builders.length || !marquee.isWaitingForItem()) {
        return;
      }

      if (seperatorBuilder && touching && ((_touching$metadata = touching.metadata) === null || _touching$metadata === void 0 ? void 0 : _touching$metadata.isSeperator) !== true) {
        var $el = toDomEl(seperatorBuilder());
        marquee.appendItem($el, {
          metadata: {
            isSeperator: true
          }
        });
        return;
      }

      var _getNextBuilder = getNextBuilder(),
          builder = _getNextBuilder.builder,
          index = _getNextBuilder.index;

      lastIndex = index;
      marquee.appendItem(toDomEl(builder()));
    };

    marquee.onItemRequired(function (_ref) {
      var touching = _ref.touching;
      return appendItem(touching);
    });
    appendItem();
    return {
      update: function update(newBuilders) {
        // try and start from somewhere that makes sense
        var calculateNewIndex = function calculateNewIndex() {
          // convert array of function references to array of ids
          var buildersStructure = builders.map(function (b, i) {
            var prevIndex = builders.indexOf(b); // if already seen builder, give it the same number

            return prevIndex < i ? prevIndex : i;
          });
          var newBuildersStructure = newBuilders.map(function (b, i) {
            // matching indexes where they exist, and -1 for all unknown
            return builders.indexOf(b);
          });

          var _longestSubstring = longestCommonSubstring_1(buildersStructure, newBuildersStructure),
              startString1 = _longestSubstring.startString1,
              startString2 = _longestSubstring.startString2,
              length = _longestSubstring.length;

          if (lastIndex >= startString1 && lastIndex < startString1 + length) {
            // we are in the overlapping region
            return lastIndex + (startString2 - startString1);
          }

          return -1;
        };

        lastIndex = calculateNewIndex();
        builders = newBuilders.slice();
        appendItem(false);
      }
    };
  }

  exports.Marquee = Marquee;
  exports.loop = loop;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
