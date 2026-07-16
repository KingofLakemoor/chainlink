(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // node_modules/workbox-core/_version.js
  try {
    self["workbox:core:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-core/models/messages/messages.js
  var messages = {
    "invalid-value": ({ paramName, validValueDescription, value }) => {
      if (!paramName || !validValueDescription) {
        throw new Error(`Unexpected input to 'invalid-value' error.`);
      }
      return `The '${paramName}' parameter was given a value with an unexpected value. ${validValueDescription} Received a value of ${JSON.stringify(value)}.`;
    },
    "not-an-array": ({ moduleName, className, funcName, paramName }) => {
      if (!moduleName || !className || !funcName || !paramName) {
        throw new Error(`Unexpected input to 'not-an-array' error.`);
      }
      return `The parameter '${paramName}' passed into '${moduleName}.${className}.${funcName}()' must be an array.`;
    },
    "incorrect-type": ({ expectedType, paramName, moduleName, className, funcName }) => {
      if (!expectedType || !paramName || !moduleName || !funcName) {
        throw new Error(`Unexpected input to 'incorrect-type' error.`);
      }
      const classNameStr = className ? `${className}.` : "";
      return `The parameter '${paramName}' passed into '${moduleName}.${classNameStr}${funcName}()' must be of type ${expectedType}.`;
    },
    "incorrect-class": ({ expectedClassName, paramName, moduleName, className, funcName, isReturnValueProblem }) => {
      if (!expectedClassName || !moduleName || !funcName) {
        throw new Error(`Unexpected input to 'incorrect-class' error.`);
      }
      const classNameStr = className ? `${className}.` : "";
      if (isReturnValueProblem) {
        return `The return value from '${moduleName}.${classNameStr}${funcName}()' must be an instance of class ${expectedClassName}.`;
      }
      return `The parameter '${paramName}' passed into '${moduleName}.${classNameStr}${funcName}()' must be an instance of class ${expectedClassName}.`;
    },
    "missing-a-method": ({ expectedMethod, paramName, moduleName, className, funcName }) => {
      if (!expectedMethod || !paramName || !moduleName || !className || !funcName) {
        throw new Error(`Unexpected input to 'missing-a-method' error.`);
      }
      return `${moduleName}.${className}.${funcName}() expected the '${paramName}' parameter to expose a '${expectedMethod}' method.`;
    },
    "add-to-cache-list-unexpected-type": ({ entry }) => {
      return `An unexpected entry was passed to 'workbox-precaching.PrecacheController.addToCacheList()' The entry '${JSON.stringify(entry)}' isn't supported. You must supply an array of strings with one or more characters, objects with a url property or Request objects.`;
    },
    "add-to-cache-list-conflicting-entries": ({ firstEntry, secondEntry }) => {
      if (!firstEntry || !secondEntry) {
        throw new Error(`Unexpected input to 'add-to-cache-list-duplicate-entries' error.`);
      }
      return `Two of the entries passed to 'workbox-precaching.PrecacheController.addToCacheList()' had the URL ${firstEntry} but different revision details. Workbox is unable to cache and version the asset correctly. Please remove one of the entries.`;
    },
    "plugin-error-request-will-fetch": ({ thrownErrorMessage }) => {
      if (!thrownErrorMessage) {
        throw new Error(`Unexpected input to 'plugin-error-request-will-fetch', error.`);
      }
      return `An error was thrown by a plugins 'requestWillFetch()' method. The thrown error message was: '${thrownErrorMessage}'.`;
    },
    "invalid-cache-name": ({ cacheNameId, value }) => {
      if (!cacheNameId) {
        throw new Error(`Expected a 'cacheNameId' for error 'invalid-cache-name'`);
      }
      return `You must provide a name containing at least one character for setCacheDetails({${cacheNameId}: '...'}). Received a value of '${JSON.stringify(value)}'`;
    },
    "unregister-route-but-not-found-with-method": ({ method }) => {
      if (!method) {
        throw new Error(`Unexpected input to 'unregister-route-but-not-found-with-method' error.`);
      }
      return `The route you're trying to unregister was not  previously registered for the method type '${method}'.`;
    },
    "unregister-route-route-not-registered": () => {
      return `The route you're trying to unregister was not previously registered.`;
    },
    "queue-replay-failed": ({ name: name4 }) => {
      return `Replaying the background sync queue '${name4}' failed.`;
    },
    "duplicate-queue-name": ({ name: name4 }) => {
      return `The Queue name '${name4}' is already being used. All instances of backgroundSync.Queue must be given unique names.`;
    },
    "expired-test-without-max-age": ({ methodName, paramName }) => {
      return `The '${methodName}()' method can only be used when the '${paramName}' is used in the constructor.`;
    },
    "unsupported-route-type": ({ moduleName, className, funcName, paramName }) => {
      return `The supplied '${paramName}' parameter was an unsupported type. Please check the docs for ${moduleName}.${className}.${funcName} for valid input types.`;
    },
    "not-array-of-class": ({ value, expectedClass, moduleName, className, funcName, paramName }) => {
      return `The supplied '${paramName}' parameter must be an array of '${expectedClass}' objects. Received '${JSON.stringify(value)},'. Please check the call to ${moduleName}.${className}.${funcName}() to fix the issue.`;
    },
    "max-entries-or-age-required": ({ moduleName, className, funcName }) => {
      return `You must define either config.maxEntries or config.maxAgeSecondsin ${moduleName}.${className}.${funcName}`;
    },
    "statuses-or-headers-required": ({ moduleName, className, funcName }) => {
      return `You must define either config.statuses or config.headersin ${moduleName}.${className}.${funcName}`;
    },
    "invalid-string": ({ moduleName, funcName, paramName }) => {
      if (!paramName || !moduleName || !funcName) {
        throw new Error(`Unexpected input to 'invalid-string' error.`);
      }
      return `When using strings, the '${paramName}' parameter must start with 'http' (for cross-origin matches) or '/' (for same-origin matches). Please see the docs for ${moduleName}.${funcName}() for more info.`;
    },
    "channel-name-required": () => {
      return `You must provide a channelName to construct a BroadcastCacheUpdate instance.`;
    },
    "invalid-responses-are-same-args": () => {
      return `The arguments passed into responsesAreSame() appear to be invalid. Please ensure valid Responses are used.`;
    },
    "expire-custom-caches-only": () => {
      return `You must provide a 'cacheName' property when using the expiration plugin with a runtime caching strategy.`;
    },
    "unit-must-be-bytes": ({ normalizedRangeHeader }) => {
      if (!normalizedRangeHeader) {
        throw new Error(`Unexpected input to 'unit-must-be-bytes' error.`);
      }
      return `The 'unit' portion of the Range header must be set to 'bytes'. The Range header provided was "${normalizedRangeHeader}"`;
    },
    "single-range-only": ({ normalizedRangeHeader }) => {
      if (!normalizedRangeHeader) {
        throw new Error(`Unexpected input to 'single-range-only' error.`);
      }
      return `Multiple ranges are not supported. Please use a  single start value, and optional end value. The Range header provided was "${normalizedRangeHeader}"`;
    },
    "invalid-range-values": ({ normalizedRangeHeader }) => {
      if (!normalizedRangeHeader) {
        throw new Error(`Unexpected input to 'invalid-range-values' error.`);
      }
      return `The Range header is missing both start and end values. At least one of those values is needed. The Range header provided was "${normalizedRangeHeader}"`;
    },
    "no-range-header": () => {
      return `No Range header was found in the Request provided.`;
    },
    "range-not-satisfiable": ({ size, start, end }) => {
      return `The start (${start}) and end (${end}) values in the Range are not satisfiable by the cached response, which is ${size} bytes.`;
    },
    "attempt-to-cache-non-get-request": ({ url, method }) => {
      return `Unable to cache '${url}' because it is a '${method}' request and only 'GET' requests can be cached.`;
    },
    "cache-put-with-no-response": ({ url }) => {
      return `There was an attempt to cache '${url}' but the response was not defined.`;
    },
    "no-response": ({ url, error }) => {
      let message = `The strategy could not generate a response for '${url}'.`;
      if (error) {
        message += ` The underlying error is ${error}.`;
      }
      return message;
    },
    "bad-precaching-response": ({ url, status }) => {
      return `The precaching request for '${url}' failed` + (status ? ` with an HTTP status of ${status}.` : `.`);
    },
    "non-precached-url": ({ url }) => {
      return `createHandlerBoundToURL('${url}') was called, but that URL is not precached. Please pass in a URL that is precached instead.`;
    },
    "add-to-cache-list-conflicting-integrities": ({ url }) => {
      return `Two of the entries passed to 'workbox-precaching.PrecacheController.addToCacheList()' had the URL ${url} with different integrity values. Please remove one of them.`;
    },
    "missing-precache-entry": ({ cacheName, url }) => {
      return `Unable to find a precached response in ${cacheName} for ${url}.`;
    },
    "cross-origin-copy-response": ({ origin }) => {
      return `workbox-core.copyResponse() can only be used with same-origin responses. It was passed a response with origin ${origin}.`;
    },
    "opaque-streams-source": ({ type }) => {
      const message = `One of the workbox-streams sources resulted in an '${type}' response.`;
      if (type === "opaqueredirect") {
        return `${message} Please do not use a navigation request that results in a redirect as a source.`;
      }
      return `${message} Please ensure your sources are CORS-enabled.`;
    }
  };

  // node_modules/workbox-core/models/messages/messageGenerator.js
  var generatorFunction = (code, details = {}) => {
    const message = messages[code];
    if (!message) {
      throw new Error(`Unable to find message for code '${code}'.`);
    }
    return message(details);
  };
  var messageGenerator = false ? fallback : generatorFunction;

  // node_modules/workbox-core/_private/WorkboxError.js
  var WorkboxError = class extends Error {
    /**
     *
     * @param {string} errorCode The error code that
     * identifies this particular error.
     * @param {Object=} details Any relevant arguments
     * that will help developers identify issues should
     * be added as a key on the context object.
     */
    constructor(errorCode, details) {
      const message = messageGenerator(errorCode, details);
      super(message);
      this.name = errorCode;
      this.details = details;
    }
  };

  // node_modules/workbox-core/_private/assert.js
  var isArray = (value, details) => {
    if (!Array.isArray(value)) {
      throw new WorkboxError("not-an-array", details);
    }
  };
  var hasMethod = (object, expectedMethod, details) => {
    const type = typeof object[expectedMethod];
    if (type !== "function") {
      details["expectedMethod"] = expectedMethod;
      throw new WorkboxError("missing-a-method", details);
    }
  };
  var isType = (object, expectedType, details) => {
    if (typeof object !== expectedType) {
      details["expectedType"] = expectedType;
      throw new WorkboxError("incorrect-type", details);
    }
  };
  var isInstance = (object, expectedClass, details) => {
    if (!(object instanceof expectedClass)) {
      details["expectedClassName"] = expectedClass.name;
      throw new WorkboxError("incorrect-class", details);
    }
  };
  var isOneOf = (value, validValues, details) => {
    if (!validValues.includes(value)) {
      details["validValueDescription"] = `Valid values are ${JSON.stringify(validValues)}.`;
      throw new WorkboxError("invalid-value", details);
    }
  };
  var isArrayOfClass = (value, expectedClass, details) => {
    const error = new WorkboxError("not-array-of-class", details);
    if (!Array.isArray(value)) {
      throw error;
    }
    for (const item of value) {
      if (!(item instanceof expectedClass)) {
        throw error;
      }
    }
  };
  var finalAssertExports = false ? null : {
    hasMethod,
    isArray,
    isInstance,
    isOneOf,
    isType,
    isArrayOfClass
  };

  // node_modules/workbox-core/_private/cacheNames.js
  var _cacheNameDetails = {
    googleAnalytics: "googleAnalytics",
    precache: "precache-v2",
    prefix: "workbox",
    runtime: "runtime",
    suffix: typeof registration !== "undefined" ? registration.scope : ""
  };
  var _createCacheName = (cacheName) => {
    return [_cacheNameDetails.prefix, cacheName, _cacheNameDetails.suffix].filter((value) => value && value.length > 0).join("-");
  };
  var eachCacheNameDetail = (fn) => {
    for (const key of Object.keys(_cacheNameDetails)) {
      fn(key);
    }
  };
  var cacheNames = {
    updateDetails: (details) => {
      eachCacheNameDetail((key) => {
        if (typeof details[key] === "string") {
          _cacheNameDetails[key] = details[key];
        }
      });
    },
    getGoogleAnalyticsName: (userCacheName) => {
      return userCacheName || _createCacheName(_cacheNameDetails.googleAnalytics);
    },
    getPrecacheName: (userCacheName) => {
      return userCacheName || _createCacheName(_cacheNameDetails.precache);
    },
    getPrefix: () => {
      return _cacheNameDetails.prefix;
    },
    getRuntimeName: (userCacheName) => {
      return userCacheName || _createCacheName(_cacheNameDetails.runtime);
    },
    getSuffix: () => {
      return _cacheNameDetails.suffix;
    }
  };

  // node_modules/workbox-core/_private/logger.js
  var logger = false ? null : (() => {
    if (!("__WB_DISABLE_DEV_LOGS" in globalThis)) {
      self.__WB_DISABLE_DEV_LOGS = false;
    }
    let inGroup = false;
    const methodToColorMap = {
      debug: `#7f8c8d`,
      log: `#2ecc71`,
      warn: `#f39c12`,
      error: `#c0392b`,
      groupCollapsed: `#3498db`,
      groupEnd: null
      // No colored prefix on groupEnd
    };
    const print = function(method, args) {
      if (self.__WB_DISABLE_DEV_LOGS) {
        return;
      }
      if (method === "groupCollapsed") {
        if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          console[method](...args);
          return;
        }
      }
      const styles = [
        `background: ${methodToColorMap[method]}`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`
      ];
      const logPrefix = inGroup ? [] : ["%cworkbox", styles.join(";")];
      console[method](...logPrefix, ...args);
      if (method === "groupCollapsed") {
        inGroup = true;
      }
      if (method === "groupEnd") {
        inGroup = false;
      }
    };
    const api = {};
    const loggerMethods = Object.keys(methodToColorMap);
    for (const key of loggerMethods) {
      const method = key;
      api[method] = (...args) => {
        print(method, args);
      };
    }
    return api;
  })();

  // node_modules/workbox-core/_private/waitUntil.js
  function waitUntil(event, asyncFn) {
    const returnPromise = asyncFn();
    event.waitUntil(returnPromise);
    return returnPromise;
  }

  // node_modules/workbox-precaching/_version.js
  try {
    self["workbox:precaching:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-precaching/utils/createCacheKey.js
  var REVISION_SEARCH_PARAM = "__WB_REVISION__";
  function createCacheKey(entry) {
    if (!entry) {
      throw new WorkboxError("add-to-cache-list-unexpected-type", { entry });
    }
    if (typeof entry === "string") {
      const urlObject = new URL(entry, location.href);
      return {
        cacheKey: urlObject.href,
        url: urlObject.href
      };
    }
    const { revision, url } = entry;
    if (!url) {
      throw new WorkboxError("add-to-cache-list-unexpected-type", { entry });
    }
    if (!revision) {
      const urlObject = new URL(url, location.href);
      return {
        cacheKey: urlObject.href,
        url: urlObject.href
      };
    }
    const cacheKeyURL = new URL(url, location.href);
    const originalURL = new URL(url, location.href);
    cacheKeyURL.searchParams.set(REVISION_SEARCH_PARAM, revision);
    return {
      cacheKey: cacheKeyURL.href,
      url: originalURL.href
    };
  }

  // node_modules/workbox-precaching/utils/PrecacheInstallReportPlugin.js
  var PrecacheInstallReportPlugin = class {
    constructor() {
      this.updatedURLs = [];
      this.notUpdatedURLs = [];
      this.handlerWillStart = (_0) => __async(this, [_0], function* ({ request, state }) {
        if (state) {
          state.originalRequest = request;
        }
      });
      this.cachedResponseWillBeUsed = (_0) => __async(this, [_0], function* ({ event, state, cachedResponse }) {
        if (event.type === "install") {
          if (state && state.originalRequest && state.originalRequest instanceof Request) {
            const url = state.originalRequest.url;
            if (cachedResponse) {
              this.notUpdatedURLs.push(url);
            } else {
              this.updatedURLs.push(url);
            }
          }
        }
        return cachedResponse;
      });
    }
  };

  // node_modules/workbox-precaching/utils/PrecacheCacheKeyPlugin.js
  var PrecacheCacheKeyPlugin = class {
    constructor({ precacheController: precacheController2 }) {
      this.cacheKeyWillBeUsed = (_0) => __async(this, [_0], function* ({ request, params }) {
        const cacheKey = (params === null || params === void 0 ? void 0 : params.cacheKey) || this._precacheController.getCacheKeyForURL(request.url);
        return cacheKey ? new Request(cacheKey, { headers: request.headers }) : request;
      });
      this._precacheController = precacheController2;
    }
  };

  // node_modules/workbox-precaching/utils/printCleanupDetails.js
  var logGroup = (groupTitle, deletedURLs) => {
    logger.groupCollapsed(groupTitle);
    for (const url of deletedURLs) {
      logger.log(url);
    }
    logger.groupEnd();
  };
  function printCleanupDetails(deletedURLs) {
    const deletionCount = deletedURLs.length;
    if (deletionCount > 0) {
      logger.groupCollapsed(`During precaching cleanup, ${deletionCount} cached request${deletionCount === 1 ? " was" : "s were"} deleted.`);
      logGroup("Deleted Cache Requests", deletedURLs);
      logger.groupEnd();
    }
  }

  // node_modules/workbox-precaching/utils/printInstallDetails.js
  function _nestedGroup(groupTitle, urls) {
    if (urls.length === 0) {
      return;
    }
    logger.groupCollapsed(groupTitle);
    for (const url of urls) {
      logger.log(url);
    }
    logger.groupEnd();
  }
  function printInstallDetails(urlsToPrecache, urlsAlreadyPrecached) {
    const precachedCount = urlsToPrecache.length;
    const alreadyPrecachedCount = urlsAlreadyPrecached.length;
    if (precachedCount || alreadyPrecachedCount) {
      let message = `Precaching ${precachedCount} file${precachedCount === 1 ? "" : "s"}.`;
      if (alreadyPrecachedCount > 0) {
        message += ` ${alreadyPrecachedCount} file${alreadyPrecachedCount === 1 ? " is" : "s are"} already cached.`;
      }
      logger.groupCollapsed(message);
      _nestedGroup(`View newly precached URLs.`, urlsToPrecache);
      _nestedGroup(`View previously precached URLs.`, urlsAlreadyPrecached);
      logger.groupEnd();
    }
  }

  // node_modules/workbox-core/_private/canConstructResponseFromBodyStream.js
  var supportStatus;
  function canConstructResponseFromBodyStream() {
    if (supportStatus === void 0) {
      const testResponse = new Response("");
      if ("body" in testResponse) {
        try {
          new Response(testResponse.body);
          supportStatus = true;
        } catch (error) {
          supportStatus = false;
        }
      }
      supportStatus = false;
    }
    return supportStatus;
  }

  // node_modules/workbox-core/copyResponse.js
  function copyResponse(response, modifier) {
    return __async(this, null, function* () {
      let origin = null;
      if (response.url) {
        const responseURL = new URL(response.url);
        origin = responseURL.origin;
      }
      if (origin !== self.location.origin) {
        throw new WorkboxError("cross-origin-copy-response", { origin });
      }
      const clonedResponse = response.clone();
      const responseInit = {
        headers: new Headers(clonedResponse.headers),
        status: clonedResponse.status,
        statusText: clonedResponse.statusText
      };
      const modifiedResponseInit = modifier ? modifier(responseInit) : responseInit;
      const body = canConstructResponseFromBodyStream() ? clonedResponse.body : yield clonedResponse.blob();
      return new Response(body, modifiedResponseInit);
    });
  }

  // node_modules/workbox-core/_private/getFriendlyURL.js
  var getFriendlyURL = (url) => {
    const urlObj = new URL(String(url), location.href);
    return urlObj.href.replace(new RegExp(`^${location.origin}`), "");
  };

  // node_modules/workbox-core/_private/cacheMatchIgnoreParams.js
  function stripParams(fullURL, ignoreParams) {
    const strippedURL = new URL(fullURL);
    for (const param of ignoreParams) {
      strippedURL.searchParams.delete(param);
    }
    return strippedURL.href;
  }
  function cacheMatchIgnoreParams(cache, request, ignoreParams, matchOptions) {
    return __async(this, null, function* () {
      const strippedRequestURL = stripParams(request.url, ignoreParams);
      if (request.url === strippedRequestURL) {
        return cache.match(request, matchOptions);
      }
      const keysOptions = Object.assign(Object.assign({}, matchOptions), { ignoreSearch: true });
      const cacheKeys = yield cache.keys(request, keysOptions);
      for (const cacheKey of cacheKeys) {
        const strippedCacheKeyURL = stripParams(cacheKey.url, ignoreParams);
        if (strippedRequestURL === strippedCacheKeyURL) {
          return cache.match(cacheKey, matchOptions);
        }
      }
      return;
    });
  }

  // node_modules/workbox-core/_private/Deferred.js
  var Deferred = class {
    /**
     * Creates a promise and exposes its resolve and reject functions as methods.
     */
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  };

  // node_modules/workbox-core/models/quotaErrorCallbacks.js
  var quotaErrorCallbacks = /* @__PURE__ */ new Set();

  // node_modules/workbox-core/_private/executeQuotaErrorCallbacks.js
  function executeQuotaErrorCallbacks() {
    return __async(this, null, function* () {
      if (true) {
        logger.log(`About to run ${quotaErrorCallbacks.size} callbacks to clean up caches.`);
      }
      for (const callback of quotaErrorCallbacks) {
        yield callback();
        if (true) {
          logger.log(callback, "is complete.");
        }
      }
      if (true) {
        logger.log("Finished running callbacks.");
      }
    });
  }

  // node_modules/workbox-core/_private/timeout.js
  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // node_modules/workbox-strategies/_version.js
  try {
    self["workbox:strategies:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-strategies/StrategyHandler.js
  function toRequest(input) {
    return typeof input === "string" ? new Request(input) : input;
  }
  var StrategyHandler = class {
    /**
     * Creates a new instance associated with the passed strategy and event
     * that's handling the request.
     *
     * The constructor also initializes the state that will be passed to each of
     * the plugins handling this request.
     *
     * @param {workbox-strategies.Strategy} strategy
     * @param {Object} options
     * @param {Request|string} options.request A request to run this strategy for.
     * @param {ExtendableEvent} options.event The event associated with the
     *     request.
     * @param {URL} [options.url]
     * @param {*} [options.params] The return value from the
     *     {@link workbox-routing~matchCallback} (if applicable).
     */
    constructor(strategy, options) {
      this._cacheKeys = {};
      if (true) {
        finalAssertExports.isInstance(options.event, ExtendableEvent, {
          moduleName: "workbox-strategies",
          className: "StrategyHandler",
          funcName: "constructor",
          paramName: "options.event"
        });
      }
      Object.assign(this, options);
      this.event = options.event;
      this._strategy = strategy;
      this._handlerDeferred = new Deferred();
      this._extendLifetimePromises = [];
      this._plugins = [...strategy.plugins];
      this._pluginStateMap = /* @__PURE__ */ new Map();
      for (const plugin of this._plugins) {
        this._pluginStateMap.set(plugin, {});
      }
      this.event.waitUntil(this._handlerDeferred.promise);
    }
    /**
     * Fetches a given request (and invokes any applicable plugin callback
     * methods) using the `fetchOptions` (for non-navigation requests) and
     * `plugins` defined on the `Strategy` object.
     *
     * The following plugin lifecycle methods are invoked when using this method:
     * - `requestWillFetch()`
     * - `fetchDidSucceed()`
     * - `fetchDidFail()`
     *
     * @param {Request|string} input The URL or request to fetch.
     * @return {Promise<Response>}
     */
    fetch(input) {
      return __async(this, null, function* () {
        const { event } = this;
        let request = toRequest(input);
        if (request.mode === "navigate" && event instanceof FetchEvent && event.preloadResponse) {
          const possiblePreloadResponse = yield event.preloadResponse;
          if (possiblePreloadResponse) {
            if (true) {
              logger.log(`Using a preloaded navigation response for '${getFriendlyURL(request.url)}'`);
            }
            return possiblePreloadResponse;
          }
        }
        const originalRequest = this.hasCallback("fetchDidFail") ? request.clone() : null;
        try {
          for (const cb of this.iterateCallbacks("requestWillFetch")) {
            request = yield cb({ request: request.clone(), event });
          }
        } catch (err) {
          if (err instanceof Error) {
            throw new WorkboxError("plugin-error-request-will-fetch", {
              thrownErrorMessage: err.message
            });
          }
        }
        const pluginFilteredRequest = request.clone();
        try {
          let fetchResponse;
          fetchResponse = yield fetch(request, request.mode === "navigate" ? void 0 : this._strategy.fetchOptions);
          if (true) {
            logger.debug(`Network request for '${getFriendlyURL(request.url)}' returned a response with status '${fetchResponse.status}'.`);
          }
          for (const callback of this.iterateCallbacks("fetchDidSucceed")) {
            fetchResponse = yield callback({
              event,
              request: pluginFilteredRequest,
              response: fetchResponse
            });
          }
          return fetchResponse;
        } catch (error) {
          if (true) {
            logger.log(`Network request for '${getFriendlyURL(request.url)}' threw an error.`, error);
          }
          if (originalRequest) {
            yield this.runCallbacks("fetchDidFail", {
              error,
              event,
              originalRequest: originalRequest.clone(),
              request: pluginFilteredRequest.clone()
            });
          }
          throw error;
        }
      });
    }
    /**
     * Calls `this.fetch()` and (in the background) runs `this.cachePut()` on
     * the response generated by `this.fetch()`.
     *
     * The call to `this.cachePut()` automatically invokes `this.waitUntil()`,
     * so you do not have to manually call `waitUntil()` on the event.
     *
     * @param {Request|string} input The request or URL to fetch and cache.
     * @return {Promise<Response>}
     */
    fetchAndCachePut(input) {
      return __async(this, null, function* () {
        const response = yield this.fetch(input);
        const responseClone = response.clone();
        void this.waitUntil(this.cachePut(input, responseClone));
        return response;
      });
    }
    /**
     * Matches a request from the cache (and invokes any applicable plugin
     * callback methods) using the `cacheName`, `matchOptions`, and `plugins`
     * defined on the strategy object.
     *
     * The following plugin lifecycle methods are invoked when using this method:
     * - cacheKeyWillBeUsed()
     * - cachedResponseWillBeUsed()
     *
     * @param {Request|string} key The Request or URL to use as the cache key.
     * @return {Promise<Response|undefined>} A matching response, if found.
     */
    cacheMatch(key) {
      return __async(this, null, function* () {
        const request = toRequest(key);
        let cachedResponse;
        const { cacheName, matchOptions } = this._strategy;
        const effectiveRequest = yield this.getCacheKey(request, "read");
        const multiMatchOptions = Object.assign(Object.assign({}, matchOptions), { cacheName });
        cachedResponse = yield caches.match(effectiveRequest, multiMatchOptions);
        if (true) {
          if (cachedResponse) {
            logger.debug(`Found a cached response in '${cacheName}'.`);
          } else {
            logger.debug(`No cached response found in '${cacheName}'.`);
          }
        }
        for (const callback of this.iterateCallbacks("cachedResponseWillBeUsed")) {
          cachedResponse = (yield callback({
            cacheName,
            matchOptions,
            cachedResponse,
            request: effectiveRequest,
            event: this.event
          })) || void 0;
        }
        return cachedResponse;
      });
    }
    /**
     * Puts a request/response pair in the cache (and invokes any applicable
     * plugin callback methods) using the `cacheName` and `plugins` defined on
     * the strategy object.
     *
     * The following plugin lifecycle methods are invoked when using this method:
     * - cacheKeyWillBeUsed()
     * - cacheWillUpdate()
     * - cacheDidUpdate()
     *
     * @param {Request|string} key The request or URL to use as the cache key.
     * @param {Response} response The response to cache.
     * @return {Promise<boolean>} `false` if a cacheWillUpdate caused the response
     * not be cached, and `true` otherwise.
     */
    cachePut(key, response) {
      return __async(this, null, function* () {
        const request = toRequest(key);
        yield timeout(0);
        const effectiveRequest = yield this.getCacheKey(request, "write");
        if (true) {
          if (effectiveRequest.method && effectiveRequest.method !== "GET") {
            throw new WorkboxError("attempt-to-cache-non-get-request", {
              url: getFriendlyURL(effectiveRequest.url),
              method: effectiveRequest.method
            });
          }
          const vary = response.headers.get("Vary");
          if (vary) {
            logger.debug(`The response for ${getFriendlyURL(effectiveRequest.url)} has a 'Vary: ${vary}' header. Consider setting the {ignoreVary: true} option on your strategy to ensure cache matching and deletion works as expected.`);
          }
        }
        if (!response) {
          if (true) {
            logger.error(`Cannot cache non-existent response for '${getFriendlyURL(effectiveRequest.url)}'.`);
          }
          throw new WorkboxError("cache-put-with-no-response", {
            url: getFriendlyURL(effectiveRequest.url)
          });
        }
        const responseToCache = yield this._ensureResponseSafeToCache(response);
        if (!responseToCache) {
          if (true) {
            logger.debug(`Response '${getFriendlyURL(effectiveRequest.url)}' will not be cached.`, responseToCache);
          }
          return false;
        }
        const { cacheName, matchOptions } = this._strategy;
        const cache = yield self.caches.open(cacheName);
        const hasCacheUpdateCallback = this.hasCallback("cacheDidUpdate");
        const oldResponse = hasCacheUpdateCallback ? yield cacheMatchIgnoreParams(
          // TODO(philipwalton): the `__WB_REVISION__` param is a precaching
          // feature. Consider into ways to only add this behavior if using
          // precaching.
          cache,
          effectiveRequest.clone(),
          ["__WB_REVISION__"],
          matchOptions
        ) : null;
        if (true) {
          logger.debug(`Updating the '${cacheName}' cache with a new Response for ${getFriendlyURL(effectiveRequest.url)}.`);
        }
        try {
          yield cache.put(effectiveRequest, hasCacheUpdateCallback ? responseToCache.clone() : responseToCache);
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === "QuotaExceededError") {
              yield executeQuotaErrorCallbacks();
            }
            throw error;
          }
        }
        for (const callback of this.iterateCallbacks("cacheDidUpdate")) {
          yield callback({
            cacheName,
            oldResponse,
            newResponse: responseToCache.clone(),
            request: effectiveRequest,
            event: this.event
          });
        }
        return true;
      });
    }
    /**
     * Checks the list of plugins for the `cacheKeyWillBeUsed` callback, and
     * executes any of those callbacks found in sequence. The final `Request`
     * object returned by the last plugin is treated as the cache key for cache
     * reads and/or writes. If no `cacheKeyWillBeUsed` plugin callbacks have
     * been registered, the passed request is returned unmodified
     *
     * @param {Request} request
     * @param {string} mode
     * @return {Promise<Request>}
     */
    getCacheKey(request, mode) {
      return __async(this, null, function* () {
        const key = `${request.url} | ${mode}`;
        if (!this._cacheKeys[key]) {
          let effectiveRequest = request;
          for (const callback of this.iterateCallbacks("cacheKeyWillBeUsed")) {
            effectiveRequest = toRequest(yield callback({
              mode,
              request: effectiveRequest,
              event: this.event,
              // params has a type any can't change right now.
              params: this.params
              // eslint-disable-line
            }));
          }
          this._cacheKeys[key] = effectiveRequest;
        }
        return this._cacheKeys[key];
      });
    }
    /**
     * Returns true if the strategy has at least one plugin with the given
     * callback.
     *
     * @param {string} name The name of the callback to check for.
     * @return {boolean}
     */
    hasCallback(name4) {
      for (const plugin of this._strategy.plugins) {
        if (name4 in plugin) {
          return true;
        }
      }
      return false;
    }
    /**
     * Runs all plugin callbacks matching the given name, in order, passing the
     * given param object (merged ith the current plugin state) as the only
     * argument.
     *
     * Note: since this method runs all plugins, it's not suitable for cases
     * where the return value of a callback needs to be applied prior to calling
     * the next callback. See
     * {@link workbox-strategies.StrategyHandler#iterateCallbacks}
     * below for how to handle that case.
     *
     * @param {string} name The name of the callback to run within each plugin.
     * @param {Object} param The object to pass as the first (and only) param
     *     when executing each callback. This object will be merged with the
     *     current plugin state prior to callback execution.
     */
    runCallbacks(name4, param) {
      return __async(this, null, function* () {
        for (const callback of this.iterateCallbacks(name4)) {
          yield callback(param);
        }
      });
    }
    /**
     * Accepts a callback and returns an iterable of matching plugin callbacks,
     * where each callback is wrapped with the current handler state (i.e. when
     * you call each callback, whatever object parameter you pass it will
     * be merged with the plugin's current state).
     *
     * @param {string} name The name fo the callback to run
     * @return {Array<Function>}
     */
    *iterateCallbacks(name4) {
      for (const plugin of this._strategy.plugins) {
        if (typeof plugin[name4] === "function") {
          const state = this._pluginStateMap.get(plugin);
          const statefulCallback = (param) => {
            const statefulParam = Object.assign(Object.assign({}, param), { state });
            return plugin[name4](statefulParam);
          };
          yield statefulCallback;
        }
      }
    }
    /**
     * Adds a promise to the
     * [extend lifetime promises]{@link https://w3c.github.io/ServiceWorker/#extendableevent-extend-lifetime-promises}
     * of the event associated with the request being handled (usually a
     * `FetchEvent`).
     *
     * Note: you can await
     * {@link workbox-strategies.StrategyHandler~doneWaiting}
     * to know when all added promises have settled.
     *
     * @param {Promise} promise A promise to add to the extend lifetime promises
     *     of the event that triggered the request.
     */
    waitUntil(promise) {
      this._extendLifetimePromises.push(promise);
      return promise;
    }
    /**
     * Returns a promise that resolves once all promises passed to
     * {@link workbox-strategies.StrategyHandler~waitUntil}
     * have settled.
     *
     * Note: any work done after `doneWaiting()` settles should be manually
     * passed to an event's `waitUntil()` method (not this handler's
     * `waitUntil()` method), otherwise the service worker thread may be killed
     * prior to your work completing.
     */
    doneWaiting() {
      return __async(this, null, function* () {
        while (this._extendLifetimePromises.length) {
          const promises = this._extendLifetimePromises.splice(0);
          const result = yield Promise.allSettled(promises);
          const firstRejection = result.find((i) => i.status === "rejected");
          if (firstRejection) {
            throw firstRejection.reason;
          }
        }
      });
    }
    /**
     * Stops running the strategy and immediately resolves any pending
     * `waitUntil()` promises.
     */
    destroy() {
      this._handlerDeferred.resolve(null);
    }
    /**
     * This method will call cacheWillUpdate on the available plugins (or use
     * status === 200) to determine if the Response is safe and valid to cache.
     *
     * @param {Request} options.request
     * @param {Response} options.response
     * @return {Promise<Response|undefined>}
     *
     * @private
     */
    _ensureResponseSafeToCache(response) {
      return __async(this, null, function* () {
        let responseToCache = response;
        let pluginsUsed = false;
        for (const callback of this.iterateCallbacks("cacheWillUpdate")) {
          responseToCache = (yield callback({
            request: this.request,
            response: responseToCache,
            event: this.event
          })) || void 0;
          pluginsUsed = true;
          if (!responseToCache) {
            break;
          }
        }
        if (!pluginsUsed) {
          if (responseToCache && responseToCache.status !== 200) {
            responseToCache = void 0;
          }
          if (true) {
            if (responseToCache) {
              if (responseToCache.status !== 200) {
                if (responseToCache.status === 0) {
                  logger.warn(`The response for '${this.request.url}' is an opaque response. The caching strategy that you're using will not cache opaque responses by default.`);
                } else {
                  logger.debug(`The response for '${this.request.url}' returned a status code of '${response.status}' and won't be cached as a result.`);
                }
              }
            }
          }
        }
        return responseToCache;
      });
    }
  };

  // node_modules/workbox-strategies/Strategy.js
  var Strategy = class {
    /**
     * Creates a new instance of the strategy and sets all documented option
     * properties as public instance properties.
     *
     * Note: if a custom strategy class extends the base Strategy class and does
     * not need more than these properties, it does not need to define its own
     * constructor.
     *
     * @param {Object} [options]
     * @param {string} [options.cacheName] Cache name to store and retrieve
     * requests. Defaults to the cache names provided by
     * {@link workbox-core.cacheNames}.
     * @param {Array<Object>} [options.plugins] [Plugins]{@link https://developers.google.com/web/tools/workbox/guides/using-plugins}
     * to use in conjunction with this caching strategy.
     * @param {Object} [options.fetchOptions] Values passed along to the
     * [`init`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters)
     * of [non-navigation](https://github.com/GoogleChrome/workbox/issues/1796)
     * `fetch()` requests made by this strategy.
     * @param {Object} [options.matchOptions] The
     * [`CacheQueryOptions`]{@link https://w3c.github.io/ServiceWorker/#dictdef-cachequeryoptions}
     * for any `cache.match()` or `cache.put()` calls made by this strategy.
     */
    constructor(options = {}) {
      this.cacheName = cacheNames.getRuntimeName(options.cacheName);
      this.plugins = options.plugins || [];
      this.fetchOptions = options.fetchOptions;
      this.matchOptions = options.matchOptions;
    }
    /**
     * Perform a request strategy and returns a `Promise` that will resolve with
     * a `Response`, invoking all relevant plugin callbacks.
     *
     * When a strategy instance is registered with a Workbox
     * {@link workbox-routing.Route}, this method is automatically
     * called when the route matches.
     *
     * Alternatively, this method can be used in a standalone `FetchEvent`
     * listener by passing it to `event.respondWith()`.
     *
     * @param {FetchEvent|Object} options A `FetchEvent` or an object with the
     *     properties listed below.
     * @param {Request|string} options.request A request to run this strategy for.
     * @param {ExtendableEvent} options.event The event associated with the
     *     request.
     * @param {URL} [options.url]
     * @param {*} [options.params]
     */
    handle(options) {
      const [responseDone] = this.handleAll(options);
      return responseDone;
    }
    /**
     * Similar to {@link workbox-strategies.Strategy~handle}, but
     * instead of just returning a `Promise` that resolves to a `Response` it
     * it will return an tuple of `[response, done]` promises, where the former
     * (`response`) is equivalent to what `handle()` returns, and the latter is a
     * Promise that will resolve once any promises that were added to
     * `event.waitUntil()` as part of performing the strategy have completed.
     *
     * You can await the `done` promise to ensure any extra work performed by
     * the strategy (usually caching responses) completes successfully.
     *
     * @param {FetchEvent|Object} options A `FetchEvent` or an object with the
     *     properties listed below.
     * @param {Request|string} options.request A request to run this strategy for.
     * @param {ExtendableEvent} options.event The event associated with the
     *     request.
     * @param {URL} [options.url]
     * @param {*} [options.params]
     * @return {Array<Promise>} A tuple of [response, done]
     *     promises that can be used to determine when the response resolves as
     *     well as when the handler has completed all its work.
     */
    handleAll(options) {
      if (options instanceof FetchEvent) {
        options = {
          event: options,
          request: options.request
        };
      }
      const event = options.event;
      const request = typeof options.request === "string" ? new Request(options.request) : options.request;
      const params = "params" in options ? options.params : void 0;
      const handler = new StrategyHandler(this, { event, request, params });
      const responseDone = this._getResponse(handler, request, event);
      const handlerDone = this._awaitComplete(responseDone, handler, request, event);
      return [responseDone, handlerDone];
    }
    _getResponse(handler, request, event) {
      return __async(this, null, function* () {
        yield handler.runCallbacks("handlerWillStart", { event, request });
        let response = void 0;
        try {
          response = yield this._handle(request, handler);
          if (!response || response.type === "error") {
            throw new WorkboxError("no-response", { url: request.url });
          }
        } catch (error) {
          if (error instanceof Error) {
            for (const callback of handler.iterateCallbacks("handlerDidError")) {
              response = yield callback({ error, event, request });
              if (response) {
                break;
              }
            }
          }
          if (!response) {
            throw error;
          } else if (true) {
            logger.log(`While responding to '${getFriendlyURL(request.url)}', an ${error instanceof Error ? error.toString() : ""} error occurred. Using a fallback response provided by a handlerDidError plugin.`);
          }
        }
        for (const callback of handler.iterateCallbacks("handlerWillRespond")) {
          response = yield callback({ event, request, response });
        }
        return response;
      });
    }
    _awaitComplete(responseDone, handler, request, event) {
      return __async(this, null, function* () {
        let response;
        let error;
        try {
          response = yield responseDone;
        } catch (error2) {
        }
        try {
          yield handler.runCallbacks("handlerDidRespond", {
            event,
            request,
            response
          });
          yield handler.doneWaiting();
        } catch (waitUntilError) {
          if (waitUntilError instanceof Error) {
            error = waitUntilError;
          }
        }
        yield handler.runCallbacks("handlerDidComplete", {
          event,
          request,
          response,
          error
        });
        handler.destroy();
        if (error) {
          throw error;
        }
      });
    }
  };

  // node_modules/workbox-precaching/PrecacheStrategy.js
  var PrecacheStrategy = class _PrecacheStrategy extends Strategy {
    /**
     *
     * @param {Object} [options]
     * @param {string} [options.cacheName] Cache name to store and retrieve
     * requests. Defaults to the cache names provided by
     * {@link workbox-core.cacheNames}.
     * @param {Array<Object>} [options.plugins] {@link https://developers.google.com/web/tools/workbox/guides/using-plugins|Plugins}
     * to use in conjunction with this caching strategy.
     * @param {Object} [options.fetchOptions] Values passed along to the
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters|init}
     * of all fetch() requests made by this strategy.
     * @param {Object} [options.matchOptions] The
     * {@link https://w3c.github.io/ServiceWorker/#dictdef-cachequeryoptions|CacheQueryOptions}
     * for any `cache.match()` or `cache.put()` calls made by this strategy.
     * @param {boolean} [options.fallbackToNetwork=true] Whether to attempt to
     * get the response from the network if there's a precache miss.
     */
    constructor(options = {}) {
      options.cacheName = cacheNames.getPrecacheName(options.cacheName);
      super(options);
      this._fallbackToNetwork = options.fallbackToNetwork === false ? false : true;
      this.plugins.push(_PrecacheStrategy.copyRedirectedCacheableResponsesPlugin);
    }
    /**
     * @private
     * @param {Request|string} request A request to run this strategy for.
     * @param {workbox-strategies.StrategyHandler} handler The event that
     *     triggered the request.
     * @return {Promise<Response>}
     */
    _handle(request, handler) {
      return __async(this, null, function* () {
        const response = yield handler.cacheMatch(request);
        if (response) {
          return response;
        }
        if (handler.event && handler.event.type === "install") {
          return yield this._handleInstall(request, handler);
        }
        return yield this._handleFetch(request, handler);
      });
    }
    _handleFetch(request, handler) {
      return __async(this, null, function* () {
        let response;
        const params = handler.params || {};
        if (this._fallbackToNetwork) {
          if (true) {
            logger.warn(`The precached response for ${getFriendlyURL(request.url)} in ${this.cacheName} was not found. Falling back to the network.`);
          }
          const integrityInManifest = params.integrity;
          const integrityInRequest = request.integrity;
          const noIntegrityConflict = !integrityInRequest || integrityInRequest === integrityInManifest;
          response = yield handler.fetch(new Request(request, {
            integrity: request.mode !== "no-cors" ? integrityInRequest || integrityInManifest : void 0
          }));
          if (integrityInManifest && noIntegrityConflict && request.mode !== "no-cors") {
            this._useDefaultCacheabilityPluginIfNeeded();
            const wasCached = yield handler.cachePut(request, response.clone());
            if (true) {
              if (wasCached) {
                logger.log(`A response for ${getFriendlyURL(request.url)} was used to "repair" the precache.`);
              }
            }
          }
        } else {
          throw new WorkboxError("missing-precache-entry", {
            cacheName: this.cacheName,
            url: request.url
          });
        }
        if (true) {
          const cacheKey = params.cacheKey || (yield handler.getCacheKey(request, "read"));
          logger.groupCollapsed(`Precaching is responding to: ` + getFriendlyURL(request.url));
          logger.log(`Serving the precached url: ${getFriendlyURL(cacheKey instanceof Request ? cacheKey.url : cacheKey)}`);
          logger.groupCollapsed(`View request details here.`);
          logger.log(request);
          logger.groupEnd();
          logger.groupCollapsed(`View response details here.`);
          logger.log(response);
          logger.groupEnd();
          logger.groupEnd();
        }
        return response;
      });
    }
    _handleInstall(request, handler) {
      return __async(this, null, function* () {
        this._useDefaultCacheabilityPluginIfNeeded();
        const response = yield handler.fetch(request);
        const wasCached = yield handler.cachePut(request, response.clone());
        if (!wasCached) {
          throw new WorkboxError("bad-precaching-response", {
            url: request.url,
            status: response.status
          });
        }
        return response;
      });
    }
    /**
     * This method is complex, as there a number of things to account for:
     *
     * The `plugins` array can be set at construction, and/or it might be added to
     * to at any time before the strategy is used.
     *
     * At the time the strategy is used (i.e. during an `install` event), there
     * needs to be at least one plugin that implements `cacheWillUpdate` in the
     * array, other than `copyRedirectedCacheableResponsesPlugin`.
     *
     * - If this method is called and there are no suitable `cacheWillUpdate`
     * plugins, we need to add `defaultPrecacheCacheabilityPlugin`.
     *
     * - If this method is called and there is exactly one `cacheWillUpdate`, then
     * we don't have to do anything (this might be a previously added
     * `defaultPrecacheCacheabilityPlugin`, or it might be a custom plugin).
     *
     * - If this method is called and there is more than one `cacheWillUpdate`,
     * then we need to check if one is `defaultPrecacheCacheabilityPlugin`. If so,
     * we need to remove it. (This situation is unlikely, but it could happen if
     * the strategy is used multiple times, the first without a `cacheWillUpdate`,
     * and then later on after manually adding a custom `cacheWillUpdate`.)
     *
     * See https://github.com/GoogleChrome/workbox/issues/2737 for more context.
     *
     * @private
     */
    _useDefaultCacheabilityPluginIfNeeded() {
      let defaultPluginIndex = null;
      let cacheWillUpdatePluginCount = 0;
      for (const [index, plugin] of this.plugins.entries()) {
        if (plugin === _PrecacheStrategy.copyRedirectedCacheableResponsesPlugin) {
          continue;
        }
        if (plugin === _PrecacheStrategy.defaultPrecacheCacheabilityPlugin) {
          defaultPluginIndex = index;
        }
        if (plugin.cacheWillUpdate) {
          cacheWillUpdatePluginCount++;
        }
      }
      if (cacheWillUpdatePluginCount === 0) {
        this.plugins.push(_PrecacheStrategy.defaultPrecacheCacheabilityPlugin);
      } else if (cacheWillUpdatePluginCount > 1 && defaultPluginIndex !== null) {
        this.plugins.splice(defaultPluginIndex, 1);
      }
    }
  };
  PrecacheStrategy.defaultPrecacheCacheabilityPlugin = {
    cacheWillUpdate(_0) {
      return __async(this, arguments, function* ({ response }) {
        if (!response || response.status >= 400) {
          return null;
        }
        return response;
      });
    }
  };
  PrecacheStrategy.copyRedirectedCacheableResponsesPlugin = {
    cacheWillUpdate(_0) {
      return __async(this, arguments, function* ({ response }) {
        return response.redirected ? yield copyResponse(response) : response;
      });
    }
  };

  // node_modules/workbox-precaching/PrecacheController.js
  var PrecacheController = class {
    /**
     * Create a new PrecacheController.
     *
     * @param {Object} [options]
     * @param {string} [options.cacheName] The cache to use for precaching.
     * @param {string} [options.plugins] Plugins to use when precaching as well
     * as responding to fetch events for precached assets.
     * @param {boolean} [options.fallbackToNetwork=true] Whether to attempt to
     * get the response from the network if there's a precache miss.
     */
    constructor({ cacheName, plugins = [], fallbackToNetwork = true } = {}) {
      this._urlsToCacheKeys = /* @__PURE__ */ new Map();
      this._urlsToCacheModes = /* @__PURE__ */ new Map();
      this._cacheKeysToIntegrities = /* @__PURE__ */ new Map();
      this._strategy = new PrecacheStrategy({
        cacheName: cacheNames.getPrecacheName(cacheName),
        plugins: [
          ...plugins,
          new PrecacheCacheKeyPlugin({ precacheController: this })
        ],
        fallbackToNetwork
      });
      this.install = this.install.bind(this);
      this.activate = this.activate.bind(this);
    }
    /**
     * @type {workbox-precaching.PrecacheStrategy} The strategy created by this controller and
     * used to cache assets and respond to fetch events.
     */
    get strategy() {
      return this._strategy;
    }
    /**
     * Adds items to the precache list, removing any duplicates and
     * stores the files in the
     * {@link workbox-core.cacheNames|"precache cache"} when the service
     * worker installs.
     *
     * This method can be called multiple times.
     *
     * @param {Array<Object|string>} [entries=[]] Array of entries to precache.
     */
    precache(entries) {
      this.addToCacheList(entries);
      if (!this._installAndActiveListenersAdded) {
        self.addEventListener("install", this.install);
        self.addEventListener("activate", this.activate);
        this._installAndActiveListenersAdded = true;
      }
    }
    /**
     * This method will add items to the precache list, removing duplicates
     * and ensuring the information is valid.
     *
     * @param {Array<workbox-precaching.PrecacheController.PrecacheEntry|string>} entries
     *     Array of entries to precache.
     */
    addToCacheList(entries) {
      if (true) {
        finalAssertExports.isArray(entries, {
          moduleName: "workbox-precaching",
          className: "PrecacheController",
          funcName: "addToCacheList",
          paramName: "entries"
        });
      }
      const urlsToWarnAbout = [];
      for (const entry of entries) {
        if (typeof entry === "string") {
          urlsToWarnAbout.push(entry);
        } else if (entry && entry.revision === void 0) {
          urlsToWarnAbout.push(entry.url);
        }
        const { cacheKey, url } = createCacheKey(entry);
        const cacheMode = typeof entry !== "string" && entry.revision ? "reload" : "default";
        if (this._urlsToCacheKeys.has(url) && this._urlsToCacheKeys.get(url) !== cacheKey) {
          throw new WorkboxError("add-to-cache-list-conflicting-entries", {
            firstEntry: this._urlsToCacheKeys.get(url),
            secondEntry: cacheKey
          });
        }
        if (typeof entry !== "string" && entry.integrity) {
          if (this._cacheKeysToIntegrities.has(cacheKey) && this._cacheKeysToIntegrities.get(cacheKey) !== entry.integrity) {
            throw new WorkboxError("add-to-cache-list-conflicting-integrities", {
              url
            });
          }
          this._cacheKeysToIntegrities.set(cacheKey, entry.integrity);
        }
        this._urlsToCacheKeys.set(url, cacheKey);
        this._urlsToCacheModes.set(url, cacheMode);
        if (urlsToWarnAbout.length > 0) {
          const warningMessage = `Workbox is precaching URLs without revision info: ${urlsToWarnAbout.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`;
          if (false) {
            console.warn(warningMessage);
          } else {
            logger.warn(warningMessage);
          }
        }
      }
    }
    /**
     * Precaches new and updated assets. Call this method from the service worker
     * install event.
     *
     * Note: this method calls `event.waitUntil()` for you, so you do not need
     * to call it yourself in your event handlers.
     *
     * @param {ExtendableEvent} event
     * @return {Promise<workbox-precaching.InstallResult>}
     */
    install(event) {
      return waitUntil(event, () => __async(this, null, function* () {
        const installReportPlugin = new PrecacheInstallReportPlugin();
        this.strategy.plugins.push(installReportPlugin);
        for (const [url, cacheKey] of this._urlsToCacheKeys) {
          const integrity = this._cacheKeysToIntegrities.get(cacheKey);
          const cacheMode = this._urlsToCacheModes.get(url);
          const request = new Request(url, {
            integrity,
            cache: cacheMode,
            credentials: "same-origin"
          });
          yield Promise.all(this.strategy.handleAll({
            params: { cacheKey },
            request,
            event
          }));
        }
        const { updatedURLs, notUpdatedURLs } = installReportPlugin;
        if (true) {
          printInstallDetails(updatedURLs, notUpdatedURLs);
        }
        return { updatedURLs, notUpdatedURLs };
      }));
    }
    /**
     * Deletes assets that are no longer present in the current precache manifest.
     * Call this method from the service worker activate event.
     *
     * Note: this method calls `event.waitUntil()` for you, so you do not need
     * to call it yourself in your event handlers.
     *
     * @param {ExtendableEvent} event
     * @return {Promise<workbox-precaching.CleanupResult>}
     */
    activate(event) {
      return waitUntil(event, () => __async(this, null, function* () {
        const cache = yield self.caches.open(this.strategy.cacheName);
        const currentlyCachedRequests = yield cache.keys();
        const expectedCacheKeys = new Set(this._urlsToCacheKeys.values());
        const deletedURLs = [];
        for (const request of currentlyCachedRequests) {
          if (!expectedCacheKeys.has(request.url)) {
            yield cache.delete(request);
            deletedURLs.push(request.url);
          }
        }
        if (true) {
          printCleanupDetails(deletedURLs);
        }
        return { deletedURLs };
      }));
    }
    /**
     * Returns a mapping of a precached URL to the corresponding cache key, taking
     * into account the revision information for the URL.
     *
     * @return {Map<string, string>} A URL to cache key mapping.
     */
    getURLsToCacheKeys() {
      return this._urlsToCacheKeys;
    }
    /**
     * Returns a list of all the URLs that have been precached by the current
     * service worker.
     *
     * @return {Array<string>} The precached URLs.
     */
    getCachedURLs() {
      return [...this._urlsToCacheKeys.keys()];
    }
    /**
     * Returns the cache key used for storing a given URL. If that URL is
     * unversioned, like `/index.html', then the cache key will be the original
     * URL with a search parameter appended to it.
     *
     * @param {string} url A URL whose cache key you want to look up.
     * @return {string} The versioned URL that corresponds to a cache key
     * for the original URL, or undefined if that URL isn't precached.
     */
    getCacheKeyForURL(url) {
      const urlObject = new URL(url, location.href);
      return this._urlsToCacheKeys.get(urlObject.href);
    }
    /**
     * @param {string} url A cache key whose SRI you want to look up.
     * @return {string} The subresource integrity associated with the cache key,
     * or undefined if it's not set.
     */
    getIntegrityForCacheKey(cacheKey) {
      return this._cacheKeysToIntegrities.get(cacheKey);
    }
    /**
     * This acts as a drop-in replacement for
     * [`cache.match()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match)
     * with the following differences:
     *
     * - It knows what the name of the precache is, and only checks in that cache.
     * - It allows you to pass in an "original" URL without versioning parameters,
     * and it will automatically look up the correct cache key for the currently
     * active revision of that URL.
     *
     * E.g., `matchPrecache('index.html')` will find the correct precached
     * response for the currently active service worker, even if the actual cache
     * key is `'/index.html?__WB_REVISION__=1234abcd'`.
     *
     * @param {string|Request} request The key (without revisioning parameters)
     * to look up in the precache.
     * @return {Promise<Response|undefined>}
     */
    matchPrecache(request) {
      return __async(this, null, function* () {
        const url = request instanceof Request ? request.url : request;
        const cacheKey = this.getCacheKeyForURL(url);
        if (cacheKey) {
          const cache = yield self.caches.open(this.strategy.cacheName);
          return cache.match(cacheKey);
        }
        return void 0;
      });
    }
    /**
     * Returns a function that looks up `url` in the precache (taking into
     * account revision information), and returns the corresponding `Response`.
     *
     * @param {string} url The precached URL which will be used to lookup the
     * `Response`.
     * @return {workbox-routing~handlerCallback}
     */
    createHandlerBoundToURL(url) {
      const cacheKey = this.getCacheKeyForURL(url);
      if (!cacheKey) {
        throw new WorkboxError("non-precached-url", { url });
      }
      return (options) => {
        options.request = new Request(url);
        options.params = Object.assign({ cacheKey }, options.params);
        return this.strategy.handle(options);
      };
    }
  };

  // node_modules/workbox-precaching/utils/getOrCreatePrecacheController.js
  var precacheController;
  var getOrCreatePrecacheController = () => {
    if (!precacheController) {
      precacheController = new PrecacheController();
    }
    return precacheController;
  };

  // node_modules/workbox-routing/_version.js
  try {
    self["workbox:routing:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-routing/utils/constants.js
  var defaultMethod = "GET";
  var validMethods = [
    "DELETE",
    "GET",
    "HEAD",
    "PATCH",
    "POST",
    "PUT"
  ];

  // node_modules/workbox-routing/utils/normalizeHandler.js
  var normalizeHandler = (handler) => {
    if (handler && typeof handler === "object") {
      if (true) {
        finalAssertExports.hasMethod(handler, "handle", {
          moduleName: "workbox-routing",
          className: "Route",
          funcName: "constructor",
          paramName: "handler"
        });
      }
      return handler;
    } else {
      if (true) {
        finalAssertExports.isType(handler, "function", {
          moduleName: "workbox-routing",
          className: "Route",
          funcName: "constructor",
          paramName: "handler"
        });
      }
      return { handle: handler };
    }
  };

  // node_modules/workbox-routing/Route.js
  var Route = class {
    /**
     * Constructor for Route class.
     *
     * @param {workbox-routing~matchCallback} match
     * A callback function that determines whether the route matches a given
     * `fetch` event by returning a non-falsy value.
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resolving to a Response.
     * @param {string} [method='GET'] The HTTP method to match the Route
     * against.
     */
    constructor(match, handler, method = defaultMethod) {
      if (true) {
        finalAssertExports.isType(match, "function", {
          moduleName: "workbox-routing",
          className: "Route",
          funcName: "constructor",
          paramName: "match"
        });
        if (method) {
          finalAssertExports.isOneOf(method, validMethods, { paramName: "method" });
        }
      }
      this.handler = normalizeHandler(handler);
      this.match = match;
      this.method = method;
    }
    /**
     *
     * @param {workbox-routing-handlerCallback} handler A callback
     * function that returns a Promise resolving to a Response
     */
    setCatchHandler(handler) {
      this.catchHandler = normalizeHandler(handler);
    }
  };

  // node_modules/workbox-routing/RegExpRoute.js
  var RegExpRoute = class extends Route {
    /**
     * If the regular expression contains
     * [capture groups]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#grouping-back-references},
     * the captured values will be passed to the
     * {@link workbox-routing~handlerCallback} `params`
     * argument.
     *
     * @param {RegExp} regExp The regular expression to match against URLs.
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resulting in a Response.
     * @param {string} [method='GET'] The HTTP method to match the Route
     * against.
     */
    constructor(regExp, handler, method) {
      if (true) {
        finalAssertExports.isInstance(regExp, RegExp, {
          moduleName: "workbox-routing",
          className: "RegExpRoute",
          funcName: "constructor",
          paramName: "pattern"
        });
      }
      const match = ({ url }) => {
        const result = regExp.exec(url.href);
        if (!result) {
          return;
        }
        if (url.origin !== location.origin && result.index !== 0) {
          if (true) {
            logger.debug(`The regular expression '${regExp.toString()}' only partially matched against the cross-origin URL '${url.toString()}'. RegExpRoute's will only handle cross-origin requests if they match the entire URL.`);
          }
          return;
        }
        return result.slice(1);
      };
      super(match, handler, method);
    }
  };

  // node_modules/workbox-routing/Router.js
  var Router = class {
    /**
     * Initializes a new Router.
     */
    constructor() {
      this._routes = /* @__PURE__ */ new Map();
      this._defaultHandlerMap = /* @__PURE__ */ new Map();
    }
    /**
     * @return {Map<string, Array<workbox-routing.Route>>} routes A `Map` of HTTP
     * method name ('GET', etc.) to an array of all the corresponding `Route`
     * instances that are registered.
     */
    get routes() {
      return this._routes;
    }
    /**
     * Adds a fetch event listener to respond to events when a route matches
     * the event's request.
     */
    addFetchListener() {
      self.addEventListener("fetch", ((event) => {
        const { request } = event;
        const responsePromise = this.handleRequest({ request, event });
        if (responsePromise) {
          event.respondWith(responsePromise);
        }
      }));
    }
    /**
     * Adds a message event listener for URLs to cache from the window.
     * This is useful to cache resources loaded on the page prior to when the
     * service worker started controlling it.
     *
     * The format of the message data sent from the window should be as follows.
     * Where the `urlsToCache` array may consist of URL strings or an array of
     * URL string + `requestInit` object (the same as you'd pass to `fetch()`).
     *
     * ```
     * {
     *   type: 'CACHE_URLS',
     *   payload: {
     *     urlsToCache: [
     *       './script1.js',
     *       './script2.js',
     *       ['./script3.js', {mode: 'no-cors'}],
     *     ],
     *   },
     * }
     * ```
     */
    addCacheListener() {
      self.addEventListener("message", ((event) => {
        if (event.data && event.data.type === "CACHE_URLS") {
          const { payload } = event.data;
          if (true) {
            logger.debug(`Caching URLs from the window`, payload.urlsToCache);
          }
          const requestPromises = Promise.all(payload.urlsToCache.map((entry) => {
            if (typeof entry === "string") {
              entry = [entry];
            }
            const request = new Request(...entry);
            return this.handleRequest({ request, event });
          }));
          event.waitUntil(requestPromises);
          if (event.ports && event.ports[0]) {
            void requestPromises.then(() => event.ports[0].postMessage(true));
          }
        }
      }));
    }
    /**
     * Apply the routing rules to a FetchEvent object to get a Response from an
     * appropriate Route's handler.
     *
     * @param {Object} options
     * @param {Request} options.request The request to handle.
     * @param {ExtendableEvent} options.event The event that triggered the
     *     request.
     * @return {Promise<Response>|undefined} A promise is returned if a
     *     registered route can handle the request. If there is no matching
     *     route and there's no `defaultHandler`, `undefined` is returned.
     */
    handleRequest({ request, event }) {
      if (true) {
        finalAssertExports.isInstance(request, Request, {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "handleRequest",
          paramName: "options.request"
        });
      }
      const url = new URL(request.url, location.href);
      if (!url.protocol.startsWith("http")) {
        if (true) {
          logger.debug(`Workbox Router only supports URLs that start with 'http'.`);
        }
        return;
      }
      const sameOrigin = url.origin === location.origin;
      const { params, route } = this.findMatchingRoute({
        event,
        request,
        sameOrigin,
        url
      });
      let handler = route && route.handler;
      const debugMessages = [];
      if (true) {
        if (handler) {
          debugMessages.push([`Found a route to handle this request:`, route]);
          if (params) {
            debugMessages.push([
              `Passing the following params to the route's handler:`,
              params
            ]);
          }
        }
      }
      const method = request.method;
      if (!handler && this._defaultHandlerMap.has(method)) {
        if (true) {
          debugMessages.push(`Failed to find a matching route. Falling back to the default handler for ${method}.`);
        }
        handler = this._defaultHandlerMap.get(method);
      }
      if (!handler) {
        if (true) {
          logger.debug(`No route found for: ${getFriendlyURL(url)}`);
        }
        return;
      }
      if (true) {
        logger.groupCollapsed(`Router is responding to: ${getFriendlyURL(url)}`);
        debugMessages.forEach((msg) => {
          if (Array.isArray(msg)) {
            logger.log(...msg);
          } else {
            logger.log(msg);
          }
        });
        logger.groupEnd();
      }
      let responsePromise;
      try {
        responsePromise = handler.handle({ url, request, event, params });
      } catch (err) {
        responsePromise = Promise.reject(err);
      }
      const catchHandler = route && route.catchHandler;
      if (responsePromise instanceof Promise && (this._catchHandler || catchHandler)) {
        responsePromise = responsePromise.catch((err) => __async(this, null, function* () {
          if (catchHandler) {
            if (true) {
              logger.groupCollapsed(`Error thrown when responding to:  ${getFriendlyURL(url)}. Falling back to route's Catch Handler.`);
              logger.error(`Error thrown by:`, route);
              logger.error(err);
              logger.groupEnd();
            }
            try {
              return yield catchHandler.handle({ url, request, event, params });
            } catch (catchErr) {
              if (catchErr instanceof Error) {
                err = catchErr;
              }
            }
          }
          if (this._catchHandler) {
            if (true) {
              logger.groupCollapsed(`Error thrown when responding to:  ${getFriendlyURL(url)}. Falling back to global Catch Handler.`);
              logger.error(`Error thrown by:`, route);
              logger.error(err);
              logger.groupEnd();
            }
            return this._catchHandler.handle({ url, request, event });
          }
          throw err;
        }));
      }
      return responsePromise;
    }
    /**
     * Checks a request and URL (and optionally an event) against the list of
     * registered routes, and if there's a match, returns the corresponding
     * route along with any params generated by the match.
     *
     * @param {Object} options
     * @param {URL} options.url
     * @param {boolean} options.sameOrigin The result of comparing `url.origin`
     *     against the current origin.
     * @param {Request} options.request The request to match.
     * @param {Event} options.event The corresponding event.
     * @return {Object} An object with `route` and `params` properties.
     *     They are populated if a matching route was found or `undefined`
     *     otherwise.
     */
    findMatchingRoute({ url, sameOrigin, request, event }) {
      const routes = this._routes.get(request.method) || [];
      for (const route of routes) {
        let params;
        const matchResult = route.match({ url, sameOrigin, request, event });
        if (matchResult) {
          if (true) {
            if (matchResult instanceof Promise) {
              logger.warn(`While routing ${getFriendlyURL(url)}, an async matchCallback function was used. Please convert the following route to use a synchronous matchCallback function:`, route);
            }
          }
          params = matchResult;
          if (Array.isArray(params) && params.length === 0) {
            params = void 0;
          } else if (matchResult.constructor === Object && // eslint-disable-line
          Object.keys(matchResult).length === 0) {
            params = void 0;
          } else if (typeof matchResult === "boolean") {
            params = void 0;
          }
          return { route, params };
        }
      }
      return {};
    }
    /**
     * Define a default `handler` that's called when no routes explicitly
     * match the incoming request.
     *
     * Each HTTP method ('GET', 'POST', etc.) gets its own default handler.
     *
     * Without a default handler, unmatched requests will go against the
     * network as if there were no service worker present.
     *
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resulting in a Response.
     * @param {string} [method='GET'] The HTTP method to associate with this
     * default handler. Each method has its own default.
     */
    setDefaultHandler(handler, method = defaultMethod) {
      this._defaultHandlerMap.set(method, normalizeHandler(handler));
    }
    /**
     * If a Route throws an error while handling a request, this `handler`
     * will be called and given a chance to provide a response.
     *
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resulting in a Response.
     */
    setCatchHandler(handler) {
      this._catchHandler = normalizeHandler(handler);
    }
    /**
     * Registers a route with the router.
     *
     * @param {workbox-routing.Route} route The route to register.
     */
    registerRoute(route) {
      if (true) {
        finalAssertExports.isType(route, "object", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route"
        });
        finalAssertExports.hasMethod(route, "match", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route"
        });
        finalAssertExports.isType(route.handler, "object", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route"
        });
        finalAssertExports.hasMethod(route.handler, "handle", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route.handler"
        });
        finalAssertExports.isType(route.method, "string", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route.method"
        });
      }
      if (!this._routes.has(route.method)) {
        this._routes.set(route.method, []);
      }
      this._routes.get(route.method).push(route);
    }
    /**
     * Unregisters a route with the router.
     *
     * @param {workbox-routing.Route} route The route to unregister.
     */
    unregisterRoute(route) {
      if (!this._routes.has(route.method)) {
        throw new WorkboxError("unregister-route-but-not-found-with-method", {
          method: route.method
        });
      }
      const routeIndex = this._routes.get(route.method).indexOf(route);
      if (routeIndex > -1) {
        this._routes.get(route.method).splice(routeIndex, 1);
      } else {
        throw new WorkboxError("unregister-route-route-not-registered");
      }
    }
  };

  // node_modules/workbox-routing/utils/getOrCreateDefaultRouter.js
  var defaultRouter;
  var getOrCreateDefaultRouter = () => {
    if (!defaultRouter) {
      defaultRouter = new Router();
      defaultRouter.addFetchListener();
      defaultRouter.addCacheListener();
    }
    return defaultRouter;
  };

  // node_modules/workbox-routing/registerRoute.js
  function registerRoute(capture, handler, method) {
    let route;
    if (typeof capture === "string") {
      const captureUrl = new URL(capture, location.href);
      if (true) {
        if (!(capture.startsWith("/") || capture.startsWith("http"))) {
          throw new WorkboxError("invalid-string", {
            moduleName: "workbox-routing",
            funcName: "registerRoute",
            paramName: "capture"
          });
        }
        const valueToCheck = capture.startsWith("http") ? captureUrl.pathname : capture;
        const wildcards = "[*:?+]";
        if (new RegExp(`${wildcards}`).exec(valueToCheck)) {
          logger.debug(`The '$capture' parameter contains an Express-style wildcard character (${wildcards}). Strings are now always interpreted as exact matches; use a RegExp for partial or wildcard matches.`);
        }
      }
      const matchCallback = ({ url }) => {
        if (true) {
          if (url.pathname === captureUrl.pathname && url.origin !== captureUrl.origin) {
            logger.debug(`${capture} only partially matches the cross-origin URL ${url.toString()}. This route will only handle cross-origin requests if they match the entire URL.`);
          }
        }
        return url.href === captureUrl.href;
      };
      route = new Route(matchCallback, handler, method);
    } else if (capture instanceof RegExp) {
      route = new RegExpRoute(capture, handler, method);
    } else if (typeof capture === "function") {
      route = new Route(capture, handler, method);
    } else if (capture instanceof Route) {
      route = capture;
    } else {
      throw new WorkboxError("unsupported-route-type", {
        moduleName: "workbox-routing",
        funcName: "registerRoute",
        paramName: "capture"
      });
    }
    const defaultRouter2 = getOrCreateDefaultRouter();
    defaultRouter2.registerRoute(route);
    return route;
  }

  // node_modules/workbox-precaching/utils/removeIgnoredSearchParams.js
  function removeIgnoredSearchParams(urlObject, ignoreURLParametersMatching = []) {
    for (const paramName of [...urlObject.searchParams.keys()]) {
      if (ignoreURLParametersMatching.some((regExp) => regExp.test(paramName))) {
        urlObject.searchParams.delete(paramName);
      }
    }
    return urlObject;
  }

  // node_modules/workbox-precaching/utils/generateURLVariations.js
  function* generateURLVariations(url, { ignoreURLParametersMatching = [/^utm_/, /^fbclid$/], directoryIndex = "index.html", cleanURLs = true, urlManipulation } = {}) {
    const urlObject = new URL(url, location.href);
    urlObject.hash = "";
    yield urlObject.href;
    const urlWithoutIgnoredParams = removeIgnoredSearchParams(urlObject, ignoreURLParametersMatching);
    yield urlWithoutIgnoredParams.href;
    if (directoryIndex && urlWithoutIgnoredParams.pathname.endsWith("/")) {
      const directoryURL = new URL(urlWithoutIgnoredParams.href);
      directoryURL.pathname += directoryIndex;
      yield directoryURL.href;
    }
    if (cleanURLs) {
      const cleanURL = new URL(urlWithoutIgnoredParams.href);
      cleanURL.pathname += ".html";
      yield cleanURL.href;
    }
    if (urlManipulation) {
      const additionalURLs = urlManipulation({ url: urlObject });
      for (const urlToAttempt of additionalURLs) {
        yield urlToAttempt.href;
      }
    }
  }

  // node_modules/workbox-precaching/PrecacheRoute.js
  var PrecacheRoute = class extends Route {
    /**
     * @param {PrecacheController} precacheController A `PrecacheController`
     * instance used to both match requests and respond to fetch events.
     * @param {Object} [options] Options to control how requests are matched
     * against the list of precached URLs.
     * @param {string} [options.directoryIndex=index.html] The `directoryIndex` will
     * check cache entries for a URLs ending with '/' to see if there is a hit when
     * appending the `directoryIndex` value.
     * @param {Array<RegExp>} [options.ignoreURLParametersMatching=[/^utm_/, /^fbclid$/]] An
     * array of regex's to remove search params when looking for a cache match.
     * @param {boolean} [options.cleanURLs=true] The `cleanURLs` option will
     * check the cache for the URL with a `.html` added to the end of the end.
     * @param {workbox-precaching~urlManipulation} [options.urlManipulation]
     * This is a function that should take a URL and return an array of
     * alternative URLs that should be checked for precache matches.
     */
    constructor(precacheController2, options) {
      const match = ({ request }) => {
        const urlsToCacheKeys = precacheController2.getURLsToCacheKeys();
        for (const possibleURL of generateURLVariations(request.url, options)) {
          const cacheKey = urlsToCacheKeys.get(possibleURL);
          if (cacheKey) {
            const integrity = precacheController2.getIntegrityForCacheKey(cacheKey);
            return { cacheKey, integrity };
          }
        }
        if (true) {
          logger.debug(`Precaching did not find a match for ` + getFriendlyURL(request.url));
        }
        return;
      };
      super(match, precacheController2.strategy);
    }
  };

  // node_modules/workbox-precaching/addRoute.js
  function addRoute(options) {
    const precacheController2 = getOrCreatePrecacheController();
    const precacheRoute = new PrecacheRoute(precacheController2, options);
    registerRoute(precacheRoute);
  }

  // node_modules/workbox-precaching/precache.js
  function precache(entries) {
    const precacheController2 = getOrCreatePrecacheController();
    precacheController2.precache(entries);
  }

  // node_modules/workbox-precaching/precacheAndRoute.js
  function precacheAndRoute(entries, options) {
    precache(entries);
    addRoute(options);
  }

  // node_modules/@firebase/util/dist/postinstall.mjs
  var getDefaultsFromPostinstall = () => void 0;

  // node_modules/@firebase/util/dist/index.esm.js
  var stringToByteArray$1 = function(str) {
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128;
      } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
        c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
        out[p++] = c >> 18 | 240;
        out[p++] = c >> 12 & 63 | 128;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      } else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      }
    }
    return out;
  };
  var byteArrayToString = function(bytes) {
    const out = [];
    let pos = 0, c = 0;
    while (pos < bytes.length) {
      const c1 = bytes[pos++];
      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        const c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else if (c1 > 239 && c1 < 365) {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        const c4 = bytes[pos++];
        const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
        out[c++] = String.fromCharCode(55296 + (u >> 10));
        out[c++] = String.fromCharCode(56320 + (u & 1023));
      } else {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
    }
    return out.join("");
  };
  var base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
      return this.ENCODED_VALS_BASE + "+/=";
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
      return this.ENCODED_VALS_BASE + "-_.";
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === "function",
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray(input, webSafe) {
      if (!Array.isArray(input)) {
        throw Error("encodeByteArray takes an array as a parameter");
      }
      this.init_();
      const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
      const output = [];
      for (let i = 0; i < input.length; i += 3) {
        const byte1 = input[i];
        const haveByte2 = i + 1 < input.length;
        const byte2 = haveByte2 ? input[i + 1] : 0;
        const haveByte3 = i + 2 < input.length;
        const byte3 = haveByte3 ? input[i + 2] : 0;
        const outByte1 = byte1 >> 2;
        const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
        let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
        let outByte4 = byte3 & 63;
        if (!haveByte3) {
          outByte4 = 64;
          if (!haveByte2) {
            outByte3 = 64;
          }
        }
        output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
      }
      return output.join("");
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return btoa(input);
      }
      return this.encodeByteArray(stringToByteArray$1(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return atob(input);
      }
      return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray(input, webSafe) {
      this.init_();
      const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
      const output = [];
      for (let i = 0; i < input.length; ) {
        const byte1 = charToByteMap[input.charAt(i++)];
        const haveByte2 = i < input.length;
        const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
        ++i;
        const haveByte3 = i < input.length;
        const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        const haveByte4 = i < input.length;
        const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
          throw new DecodeBase64StringError();
        }
        const outByte1 = byte1 << 2 | byte2 >> 4;
        output.push(outByte1);
        if (byte3 !== 64) {
          const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
          output.push(outByte2);
          if (byte4 !== 64) {
            const outByte3 = byte3 << 6 & 192 | byte4;
            output.push(outByte3);
          }
        }
      }
      return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_() {
      if (!this.byteToCharMap_) {
        this.byteToCharMap_ = {};
        this.charToByteMap_ = {};
        this.byteToCharMapWebSafe_ = {};
        this.charToByteMapWebSafe_ = {};
        for (let i = 0; i < this.ENCODED_VALS.length; i++) {
          this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
          this.charToByteMap_[this.byteToCharMap_[i]] = i;
          this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
          this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
          if (i >= this.ENCODED_VALS_BASE.length) {
            this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
            this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
          }
        }
      }
    }
  };
  var DecodeBase64StringError = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "DecodeBase64StringError";
    }
  };
  var base64Encode = function(str) {
    const utf8Bytes = stringToByteArray$1(str);
    return base64.encodeByteArray(utf8Bytes, true);
  };
  var base64urlEncodeWithoutPadding = function(str) {
    return base64Encode(str).replace(/\./g, "");
  };
  var base64Decode = function(str) {
    try {
      return base64.decodeString(str, true);
    } catch (e) {
      console.error("base64Decode failed: ", e);
    }
    return null;
  };
  function getGlobal() {
    if (typeof self !== "undefined") {
      return self;
    }
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof global !== "undefined") {
      return global;
    }
    throw new Error("Unable to locate global object.");
  }
  var getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
  var getDefaultsFromEnvVariable = () => {
    if (typeof process === "undefined" || typeof process.env === "undefined") {
      return;
    }
    const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
    if (defaultsJsonString) {
      return JSON.parse(defaultsJsonString);
    }
  };
  var getDefaultsFromCookie = () => {
    if (typeof document === "undefined") {
      return;
    }
    let match;
    try {
      match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
    } catch (e) {
      return;
    }
    const decoded = match && base64Decode(match[1]);
    return decoded && JSON.parse(decoded);
  };
  var getDefaults = () => {
    try {
      return getDefaultsFromPostinstall() || getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
    } catch (e) {
      console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
      return;
    }
  };
  var getDefaultAppConfig = () => {
    var _a;
    return (_a = getDefaults()) == null ? void 0 : _a.config;
  };
  var Deferred2 = class {
    constructor() {
      this.reject = () => {
      };
      this.resolve = () => {
      };
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
    /**
     * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    wrapCallback(callback) {
      return (error, value) => {
        if (error) {
          this.reject(error);
        } else {
          this.resolve(value);
        }
        if (typeof callback === "function") {
          this.promise.catch(() => {
          });
          if (callback.length === 1) {
            callback(error);
          } else {
            callback(error, value);
          }
        }
      };
    }
  };
  function isIndexedDBAvailable() {
    try {
      return typeof indexedDB === "object";
    } catch (e) {
      return false;
    }
  }
  function validateIndexedDBOpenable() {
    return new Promise((resolve, reject) => {
      try {
        let preExist = true;
        const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
        const request = self.indexedDB.open(DB_CHECK_NAME);
        request.onsuccess = () => {
          request.result.close();
          if (!preExist) {
            self.indexedDB.deleteDatabase(DB_CHECK_NAME);
          }
          resolve(true);
        };
        request.onupgradeneeded = () => {
          preExist = false;
        };
        request.onerror = () => {
          var _a;
          reject(((_a = request.error) == null ? void 0 : _a.message) || "");
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  var ERROR_NAME = "FirebaseError";
  var FirebaseError = class _FirebaseError extends Error {
    constructor(code, message, customData) {
      super(message);
      this.code = code;
      this.customData = customData;
      this.name = ERROR_NAME;
      Object.setPrototypeOf(this, _FirebaseError.prototype);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ErrorFactory.prototype.create);
      }
    }
  };
  var ErrorFactory = class {
    constructor(service, serviceName, errors) {
      this.service = service;
      this.serviceName = serviceName;
      this.errors = errors;
    }
    create(code, ...data) {
      const customData = data[0] || {};
      const fullCode = `${this.service}/${code}`;
      const template = this.errors[code];
      const message = template ? replaceTemplate(template, customData) : "Error";
      const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
      const error = new FirebaseError(fullCode, fullMessage, customData);
      return error;
    }
  };
  function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_2, key) => {
      const value = data[key];
      return value != null ? String(value) : `<${key}?>`;
    });
  }
  var PATTERN = /\{\$([^}]+)}/g;
  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
      if (!bKeys.includes(k)) {
        return false;
      }
      const aProp = a[k];
      const bProp = b[k];
      if (isObject(aProp) && isObject(bProp)) {
        if (!deepEqual(aProp, bProp)) {
          return false;
        }
      } else if (aProp !== bProp) {
        return false;
      }
    }
    for (const k of bKeys) {
      if (!aKeys.includes(k)) {
        return false;
      }
    }
    return true;
  }
  function isObject(thing) {
    return thing !== null && typeof thing === "object";
  }
  var MAX_VALUE_MILLIS = 4 * 60 * 60 * 1e3;
  function getModularInstance(service) {
    if (service && service._delegate) {
      return service._delegate;
    } else {
      return service;
    }
  }

  // node_modules/@firebase/component/dist/esm/index.esm.js
  var Component = class {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    constructor(name4, instanceFactory, type) {
      this.name = name4;
      this.instanceFactory = instanceFactory;
      this.type = type;
      this.multipleInstances = false;
      this.serviceProps = {};
      this.instantiationMode = "LAZY";
      this.onInstanceCreated = null;
    }
    setInstantiationMode(mode) {
      this.instantiationMode = mode;
      return this;
    }
    setMultipleInstances(multipleInstances) {
      this.multipleInstances = multipleInstances;
      return this;
    }
    setServiceProps(props) {
      this.serviceProps = props;
      return this;
    }
    setInstanceCreatedCallback(callback) {
      this.onInstanceCreated = callback;
      return this;
    }
  };
  var DEFAULT_ENTRY_NAME = "[DEFAULT]";
  var Provider = class {
    constructor(name4, container) {
      this.name = name4;
      this.container = container;
      this.component = null;
      this.instances = /* @__PURE__ */ new Map();
      this.instancesDeferred = /* @__PURE__ */ new Map();
      this.instancesOptions = /* @__PURE__ */ new Map();
      this.onInitCallbacks = /* @__PURE__ */ new Map();
    }
    /**
     * @param identifier A provider can provide multiple instances of a service
     * if this.component.multipleInstances is true.
     */
    get(identifier) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      if (!this.instancesDeferred.has(normalizedIdentifier)) {
        const deferred = new Deferred2();
        this.instancesDeferred.set(normalizedIdentifier, deferred);
        if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
          try {
            const instance = this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
            if (instance) {
              deferred.resolve(instance);
            }
          } catch (e) {
          }
        }
      }
      return this.instancesDeferred.get(normalizedIdentifier).promise;
    }
    getImmediate(options) {
      var _a;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(options == null ? void 0 : options.identifier);
      const optional = (_a = options == null ? void 0 : options.optional) != null ? _a : false;
      if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
        try {
          return this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
        } catch (e) {
          if (optional) {
            return null;
          } else {
            throw e;
          }
        }
      } else {
        if (optional) {
          return null;
        } else {
          throw Error(`Service ${this.name} is not available`);
        }
      }
    }
    getComponent() {
      return this.component;
    }
    setComponent(component) {
      if (component.name !== this.name) {
        throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
      }
      if (this.component) {
        throw Error(`Component for ${this.name} has already been provided`);
      }
      this.component = component;
      if (!this.shouldAutoInitialize()) {
        return;
      }
      if (isComponentEager(component)) {
        try {
          this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME });
        } catch (e) {
        }
      }
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        try {
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          instanceDeferred.resolve(instance);
        } catch (e) {
        }
      }
    }
    clearInstance(identifier = DEFAULT_ENTRY_NAME) {
      this.instancesDeferred.delete(identifier);
      this.instancesOptions.delete(identifier);
      this.instances.delete(identifier);
    }
    // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?
    delete() {
      return __async(this, null, function* () {
        const services = Array.from(this.instances.values());
        yield Promise.all([
          ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
          ...services.filter((service) => "_delete" in service).map((service) => service._delete())
        ]);
      });
    }
    isComponentSet() {
      return this.component != null;
    }
    isInitialized(identifier = DEFAULT_ENTRY_NAME) {
      return this.instances.has(identifier);
    }
    getOptions(identifier = DEFAULT_ENTRY_NAME) {
      return this.instancesOptions.get(identifier) || {};
    }
    initialize(opts = {}) {
      const { options = {} } = opts;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
      if (this.isInitialized(normalizedIdentifier)) {
        throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
      }
      if (!this.isComponentSet()) {
        throw Error(`Component ${this.name} has not been registered yet`);
      }
      const instance = this.getOrInitializeService({
        instanceIdentifier: normalizedIdentifier,
        options
      });
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        if (normalizedIdentifier === normalizedDeferredIdentifier) {
          instanceDeferred.resolve(instance);
        }
      }
      return instance;
    }
    /**
     *
     * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
     * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
     *
     * @param identifier An optional instance identifier
     * @returns a function to unregister the callback
     */
    onInit(callback, identifier) {
      var _a;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      const existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) != null ? _a : /* @__PURE__ */ new Set();
      existingCallbacks.add(callback);
      this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
      const existingInstance = this.instances.get(normalizedIdentifier);
      if (existingInstance) {
        callback(existingInstance, normalizedIdentifier);
      }
      return () => {
        existingCallbacks.delete(callback);
      };
    }
    /**
     * Invoke onInit callbacks synchronously
     * @param instance the service instance`
     */
    invokeOnInitCallbacks(instance, identifier) {
      const callbacks = this.onInitCallbacks.get(identifier);
      if (!callbacks) {
        return;
      }
      for (const callback of callbacks) {
        try {
          callback(instance, identifier);
        } catch (e) {
        }
      }
    }
    getOrInitializeService({ instanceIdentifier, options = {} }) {
      let instance = this.instances.get(instanceIdentifier);
      if (!instance && this.component) {
        instance = this.component.instanceFactory(this.container, {
          instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
          options
        });
        this.instances.set(instanceIdentifier, instance);
        this.instancesOptions.set(instanceIdentifier, options);
        this.invokeOnInitCallbacks(instance, instanceIdentifier);
        if (this.component.onInstanceCreated) {
          try {
            this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
          } catch (e) {
          }
        }
      }
      return instance || null;
    }
    normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME) {
      if (this.component) {
        return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
      } else {
        return identifier;
      }
    }
    shouldAutoInitialize() {
      return !!this.component && this.component.instantiationMode !== "EXPLICIT";
    }
  };
  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME ? void 0 : identifier;
  }
  function isComponentEager(component) {
    return component.instantiationMode === "EAGER";
  }
  var ComponentContainer = class {
    constructor(name4) {
      this.name = name4;
      this.providers = /* @__PURE__ */ new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */
    addComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
      }
      provider.setComponent(component);
    }
    addOrOverwriteComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        this.providers.delete(component.name);
      }
      this.addComponent(component);
    }
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */
    getProvider(name4) {
      if (this.providers.has(name4)) {
        return this.providers.get(name4);
      }
      const provider = new Provider(name4, this);
      this.providers.set(name4, provider);
      return provider;
    }
    getProviders() {
      return Array.from(this.providers.values());
    }
  };

  // node_modules/@firebase/logger/dist/esm/index.esm.js
  var instances = [];
  var LogLevel;
  (function(LogLevel2) {
    LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
    LogLevel2[LogLevel2["VERBOSE"] = 1] = "VERBOSE";
    LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
    LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
    LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
    LogLevel2[LogLevel2["SILENT"] = 5] = "SILENT";
  })(LogLevel || (LogLevel = {}));
  var levelStringToEnum = {
    "debug": LogLevel.DEBUG,
    "verbose": LogLevel.VERBOSE,
    "info": LogLevel.INFO,
    "warn": LogLevel.WARN,
    "error": LogLevel.ERROR,
    "silent": LogLevel.SILENT
  };
  var defaultLogLevel = LogLevel.INFO;
  var ConsoleMethod = {
    [LogLevel.DEBUG]: "log",
    [LogLevel.VERBOSE]: "log",
    [LogLevel.INFO]: "info",
    [LogLevel.WARN]: "warn",
    [LogLevel.ERROR]: "error"
  };
  var defaultLogHandler = (instance, logType, ...args) => {
    if (logType < instance.logLevel) {
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const method = ConsoleMethod[logType];
    if (method) {
      console[method](`[${now}]  ${instance.name}:`, ...args);
    } else {
      throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
    }
  };
  var Logger = class {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    constructor(name4) {
      this.name = name4;
      this._logLevel = defaultLogLevel;
      this._logHandler = defaultLogHandler;
      this._userLogHandler = null;
      instances.push(this);
    }
    get logLevel() {
      return this._logLevel;
    }
    set logLevel(val) {
      if (!(val in LogLevel)) {
        throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
      }
      this._logLevel = val;
    }
    // Workaround for setter/getter having to be the same type.
    setLogLevel(val) {
      this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
    }
    get logHandler() {
      return this._logHandler;
    }
    set logHandler(val) {
      if (typeof val !== "function") {
        throw new TypeError("Value assigned to `logHandler` must be a function");
      }
      this._logHandler = val;
    }
    get userLogHandler() {
      return this._userLogHandler;
    }
    set userLogHandler(val) {
      this._userLogHandler = val;
    }
    /**
     * The functions below are all based on the `console` interface
     */
    debug(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
      this._logHandler(this, LogLevel.DEBUG, ...args);
    }
    log(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
      this._logHandler(this, LogLevel.VERBOSE, ...args);
    }
    info(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
      this._logHandler(this, LogLevel.INFO, ...args);
    }
    warn(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
      this._logHandler(this, LogLevel.WARN, ...args);
    }
    error(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
      this._logHandler(this, LogLevel.ERROR, ...args);
    }
  };

  // node_modules/idb/build/wrap-idb-value.js
  var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  var idbProxyableTypes;
  var cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  var cursorRequestMap = /* @__PURE__ */ new WeakMap();
  var transactionDoneMap = /* @__PURE__ */ new WeakMap();
  var transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
  var transformCache = /* @__PURE__ */ new WeakMap();
  var reverseTransformCache = /* @__PURE__ */ new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    promise.then((value) => {
      if (value instanceof IDBCursor) {
        cursorRequestMap.set(value, request);
      }
    }).catch(() => {
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  var idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "objectStoreNames") {
          return target.objectStoreNames || transactionStoreNamesMap.get(target);
        }
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
      return function(storeNames, ...args) {
        const tx = func.call(unwrap(this), storeNames, ...args);
        transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap(tx);
      };
    }
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(cursorRequestMap.get(this));
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  var unwrap = (value) => reverseTransformCache.get(value);

  // node_modules/idb/build/index.js
  function openDB(name4, version3, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name4, version3);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db) => {
      if (terminated)
        db.addEventListener("close", () => terminated());
      if (blocking) {
        db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  function deleteDB(name4, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name4);
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event
      ));
    }
    return wrap(request).then(() => void 0);
  }
  var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  var writeMethods = ["put", "add", "delete", "clear"];
  var cachedMethods = /* @__PURE__ */ new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = function(storeName, ...args) {
      return __async(this, null, function* () {
        const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
        let target2 = tx.store;
        if (useIndex)
          target2 = target2.index(args.shift());
        return (yield Promise.all([
          target2[targetFuncName](...args),
          isWrite && tx.done
        ]))[0];
      });
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps((oldTraps) => __spreadProps(__spreadValues({}, oldTraps), {
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));

  // node_modules/@firebase/app/dist/esm/index.esm.js
  var PlatformLoggerServiceImpl = class {
    constructor(container) {
      this.container = container;
    }
    // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.
    getPlatformInfoString() {
      const providers = this.container.getProviders();
      return providers.map((provider) => {
        if (isVersionServiceProvider(provider)) {
          const service = provider.getImmediate();
          return `${service.library}/${service.version}`;
        } else {
          return null;
        }
      }).filter((logString) => logString).join(" ");
    }
  };
  function isVersionServiceProvider(provider) {
    const component = provider.getComponent();
    return (component == null ? void 0 : component.type) === "VERSION";
  }
  var name$q = "@firebase/app";
  var version$1 = "0.14.11";
  var logger2 = new Logger("@firebase/app");
  var name$p = "@firebase/app-compat";
  var name$o = "@firebase/analytics-compat";
  var name$n = "@firebase/analytics";
  var name$m = "@firebase/app-check-compat";
  var name$l = "@firebase/app-check";
  var name$k = "@firebase/auth";
  var name$j = "@firebase/auth-compat";
  var name$i = "@firebase/database";
  var name$h = "@firebase/data-connect";
  var name$g = "@firebase/database-compat";
  var name$f = "@firebase/functions";
  var name$e = "@firebase/functions-compat";
  var name$d = "@firebase/installations";
  var name$c = "@firebase/installations-compat";
  var name$b = "@firebase/messaging";
  var name$a = "@firebase/messaging-compat";
  var name$9 = "@firebase/performance";
  var name$8 = "@firebase/performance-compat";
  var name$7 = "@firebase/remote-config";
  var name$6 = "@firebase/remote-config-compat";
  var name$5 = "@firebase/storage";
  var name$4 = "@firebase/storage-compat";
  var name$3 = "@firebase/firestore";
  var name$2 = "@firebase/ai";
  var name$1 = "@firebase/firestore-compat";
  var name = "firebase";
  var DEFAULT_ENTRY_NAME2 = "[DEFAULT]";
  var PLATFORM_LOG_STRING = {
    [name$q]: "fire-core",
    [name$p]: "fire-core-compat",
    [name$n]: "fire-analytics",
    [name$o]: "fire-analytics-compat",
    [name$l]: "fire-app-check",
    [name$m]: "fire-app-check-compat",
    [name$k]: "fire-auth",
    [name$j]: "fire-auth-compat",
    [name$i]: "fire-rtdb",
    [name$h]: "fire-data-connect",
    [name$g]: "fire-rtdb-compat",
    [name$f]: "fire-fn",
    [name$e]: "fire-fn-compat",
    [name$d]: "fire-iid",
    [name$c]: "fire-iid-compat",
    [name$b]: "fire-fcm",
    [name$a]: "fire-fcm-compat",
    [name$9]: "fire-perf",
    [name$8]: "fire-perf-compat",
    [name$7]: "fire-rc",
    [name$6]: "fire-rc-compat",
    [name$5]: "fire-gcs",
    [name$4]: "fire-gcs-compat",
    [name$3]: "fire-fst",
    [name$1]: "fire-fst-compat",
    [name$2]: "fire-vertex",
    "fire-js": "fire-js",
    // Platform identifier for JS SDK.
    [name]: "fire-js-all"
  };
  var _apps = /* @__PURE__ */ new Map();
  var _serverApps = /* @__PURE__ */ new Map();
  var _components = /* @__PURE__ */ new Map();
  function _addComponent(app, component) {
    try {
      app.container.addComponent(component);
    } catch (e) {
      logger2.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
    }
  }
  function _registerComponent(component) {
    const componentName = component.name;
    if (_components.has(componentName)) {
      logger2.debug(`There were multiple attempts to register component ${componentName}.`);
      return false;
    }
    _components.set(componentName, component);
    for (const app of _apps.values()) {
      _addComponent(app, component);
    }
    for (const serverApp of _serverApps.values()) {
      _addComponent(serverApp, component);
    }
    return true;
  }
  function _getProvider(app, name4) {
    const heartbeatController = app.container.getProvider("heartbeat").getImmediate({ optional: true });
    if (heartbeatController) {
      void heartbeatController.triggerHeartbeat();
    }
    return app.container.getProvider(name4);
  }
  var ERRORS = {
    [
      "no-app"
      /* AppError.NO_APP */
    ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
    [
      "bad-app-name"
      /* AppError.BAD_APP_NAME */
    ]: "Illegal App name: '{$appName}'",
    [
      "duplicate-app"
      /* AppError.DUPLICATE_APP */
    ]: "Firebase App named '{$appName}' already exists with different options or config",
    [
      "app-deleted"
      /* AppError.APP_DELETED */
    ]: "Firebase App named '{$appName}' already deleted",
    [
      "server-app-deleted"
      /* AppError.SERVER_APP_DELETED */
    ]: "Firebase Server App has been deleted",
    [
      "no-options"
      /* AppError.NO_OPTIONS */
    ]: "Need to provide options, when not being deployed to hosting via source.",
    [
      "invalid-app-argument"
      /* AppError.INVALID_APP_ARGUMENT */
    ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
    [
      "invalid-log-argument"
      /* AppError.INVALID_LOG_ARGUMENT */
    ]: "First argument to `onLog` must be null or a function.",
    [
      "idb-open"
      /* AppError.IDB_OPEN */
    ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-get"
      /* AppError.IDB_GET */
    ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-set"
      /* AppError.IDB_WRITE */
    ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-delete"
      /* AppError.IDB_DELETE */
    ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "finalization-registry-not-supported"
      /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
    ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
    [
      "invalid-server-app-environment"
      /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
    ]: "FirebaseServerApp is not for use in browser environments."
  };
  var ERROR_FACTORY = new ErrorFactory("app", "Firebase", ERRORS);
  var FirebaseAppImpl = class {
    constructor(options, config, container) {
      this._isDeleted = false;
      this._options = __spreadValues({}, options);
      this._config = __spreadValues({}, config);
      this._name = config.name;
      this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
      this._container = container;
      this.container.addComponent(new Component(
        "app",
        () => this,
        "PUBLIC"
        /* ComponentType.PUBLIC */
      ));
    }
    get automaticDataCollectionEnabled() {
      this.checkDestroyed();
      return this._automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(val) {
      this.checkDestroyed();
      this._automaticDataCollectionEnabled = val;
    }
    get name() {
      this.checkDestroyed();
      return this._name;
    }
    get options() {
      this.checkDestroyed();
      return this._options;
    }
    get config() {
      this.checkDestroyed();
      return this._config;
    }
    get container() {
      return this._container;
    }
    get isDeleted() {
      return this._isDeleted;
    }
    set isDeleted(val) {
      this._isDeleted = val;
    }
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    checkDestroyed() {
      if (this.isDeleted) {
        throw ERROR_FACTORY.create("app-deleted", { appName: this._name });
      }
    }
  };
  function initializeApp(_options, rawConfig = {}) {
    let options = _options;
    if (typeof rawConfig !== "object") {
      const name5 = rawConfig;
      rawConfig = { name: name5 };
    }
    const config = __spreadValues({
      name: DEFAULT_ENTRY_NAME2,
      automaticDataCollectionEnabled: true
    }, rawConfig);
    const name4 = config.name;
    if (typeof name4 !== "string" || !name4) {
      throw ERROR_FACTORY.create("bad-app-name", {
        appName: String(name4)
      });
    }
    options || (options = getDefaultAppConfig());
    if (!options) {
      throw ERROR_FACTORY.create(
        "no-options"
        /* AppError.NO_OPTIONS */
      );
    }
    const existingApp = _apps.get(name4);
    if (existingApp) {
      if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
        return existingApp;
      } else {
        throw ERROR_FACTORY.create("duplicate-app", { appName: name4 });
      }
    }
    const container = new ComponentContainer(name4);
    for (const component of _components.values()) {
      container.addComponent(component);
    }
    const newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name4, newApp);
    return newApp;
  }
  function getApp(name4 = DEFAULT_ENTRY_NAME2) {
    const app = _apps.get(name4);
    if (!app && name4 === DEFAULT_ENTRY_NAME2 && getDefaultAppConfig()) {
      return initializeApp();
    }
    if (!app) {
      throw ERROR_FACTORY.create("no-app", { appName: name4 });
    }
    return app;
  }
  function registerVersion(libraryKeyOrName, version3, variant) {
    var _a;
    let library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) != null ? _a : libraryKeyOrName;
    if (variant) {
      library += `-${variant}`;
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version3.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
      const warning = [
        `Unable to register library "${library}" with version "${version3}":`
      ];
      if (libraryMismatch) {
        warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
      }
      if (libraryMismatch && versionMismatch) {
        warning.push("and");
      }
      if (versionMismatch) {
        warning.push(`version name "${version3}" contains illegal characters (whitespace or "/")`);
      }
      logger2.warn(warning.join(" "));
      return;
    }
    _registerComponent(new Component(
      `${library}-version`,
      () => ({ library, version: version3 }),
      "VERSION"
      /* ComponentType.VERSION */
    ));
  }
  var DB_NAME = "firebase-heartbeat-database";
  var DB_VERSION = 1;
  var STORE_NAME = "firebase-heartbeat-store";
  var dbPromise = null;
  function getDbPromise() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade: (db, oldVersion) => {
          switch (oldVersion) {
            case 0:
              try {
                db.createObjectStore(STORE_NAME);
              } catch (e) {
                console.warn(e);
              }
          }
        }
      }).catch((e) => {
        throw ERROR_FACTORY.create("idb-open", {
          originalErrorMessage: e.message
        });
      });
    }
    return dbPromise;
  }
  function readHeartbeatsFromIndexedDB(app) {
    return __async(this, null, function* () {
      try {
        const db = yield getDbPromise();
        const tx = db.transaction(STORE_NAME);
        const result = yield tx.objectStore(STORE_NAME).get(computeKey(app));
        yield tx.done;
        return result;
      } catch (e) {
        if (e instanceof FirebaseError) {
          logger2.warn(e.message);
        } else {
          const idbGetError = ERROR_FACTORY.create("idb-get", {
            originalErrorMessage: e == null ? void 0 : e.message
          });
          logger2.warn(idbGetError.message);
        }
      }
    });
  }
  function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
    return __async(this, null, function* () {
      try {
        const db = yield getDbPromise();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const objectStore = tx.objectStore(STORE_NAME);
        yield objectStore.put(heartbeatObject, computeKey(app));
        yield tx.done;
      } catch (e) {
        if (e instanceof FirebaseError) {
          logger2.warn(e.message);
        } else {
          const idbGetError = ERROR_FACTORY.create("idb-set", {
            originalErrorMessage: e == null ? void 0 : e.message
          });
          logger2.warn(idbGetError.message);
        }
      }
    });
  }
  function computeKey(app) {
    return `${app.name}!${app.options.appId}`;
  }
  var MAX_HEADER_BYTES = 1024;
  var MAX_NUM_STORED_HEARTBEATS = 30;
  var HeartbeatServiceImpl = class {
    constructor(container) {
      this.container = container;
      this._heartbeatsCache = null;
      const app = this.container.getProvider("app").getImmediate();
      this._storage = new HeartbeatStorageImpl(app);
      this._heartbeatsCachePromise = this._storage.read().then((result) => {
        this._heartbeatsCache = result;
        return result;
      });
    }
    /**
     * Called to report a heartbeat. The function will generate
     * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
     * to IndexedDB.
     * Note that we only store one heartbeat per day. So if a heartbeat for today is
     * already logged, subsequent calls to this function in the same day will be ignored.
     */
    triggerHeartbeat() {
      return __async(this, null, function* () {
        var _a, _b;
        try {
          const platformLogger = this.container.getProvider("platform-logger").getImmediate();
          const agent = platformLogger.getPlatformInfoString();
          const date = getUTCDateString();
          if (((_a = this._heartbeatsCache) == null ? void 0 : _a.heartbeats) == null) {
            this._heartbeatsCache = yield this._heartbeatsCachePromise;
            if (((_b = this._heartbeatsCache) == null ? void 0 : _b.heartbeats) == null) {
              return;
            }
          }
          if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
            return;
          } else {
            this._heartbeatsCache.heartbeats.push({ date, agent });
            if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
              const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
              this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
            }
          }
          return this._storage.overwrite(this._heartbeatsCache);
        } catch (e) {
          logger2.warn(e);
        }
      });
    }
    /**
     * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
     * It also clears all heartbeats from memory as well as in IndexedDB.
     *
     * NOTE: Consuming product SDKs should not send the header if this method
     * returns an empty string.
     */
    getHeartbeatsHeader() {
      return __async(this, null, function* () {
        var _a;
        try {
          if (this._heartbeatsCache === null) {
            yield this._heartbeatsCachePromise;
          }
          if (((_a = this._heartbeatsCache) == null ? void 0 : _a.heartbeats) == null || this._heartbeatsCache.heartbeats.length === 0) {
            return "";
          }
          const date = getUTCDateString();
          const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
          const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
          this._heartbeatsCache.lastSentHeartbeatDate = date;
          if (unsentEntries.length > 0) {
            this._heartbeatsCache.heartbeats = unsentEntries;
            yield this._storage.overwrite(this._heartbeatsCache);
          } else {
            this._heartbeatsCache.heartbeats = [];
            void this._storage.overwrite(this._heartbeatsCache);
          }
          return headerString;
        } catch (e) {
          logger2.warn(e);
          return "";
        }
      });
    }
  };
  function getUTCDateString() {
    const today = /* @__PURE__ */ new Date();
    return today.toISOString().substring(0, 10);
  }
  function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
    const heartbeatsToSend = [];
    let unsentEntries = heartbeatsCache.slice();
    for (const singleDateHeartbeat of heartbeatsCache) {
      const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
      if (!heartbeatEntry) {
        heartbeatsToSend.push({
          agent: singleDateHeartbeat.agent,
          dates: [singleDateHeartbeat.date]
        });
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatsToSend.pop();
          break;
        }
      } else {
        heartbeatEntry.dates.push(singleDateHeartbeat.date);
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatEntry.dates.pop();
          break;
        }
      }
      unsentEntries = unsentEntries.slice(1);
    }
    return {
      heartbeatsToSend,
      unsentEntries
    };
  }
  var HeartbeatStorageImpl = class {
    constructor(app) {
      this.app = app;
      this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
    }
    runIndexedDBEnvironmentCheck() {
      return __async(this, null, function* () {
        if (!isIndexedDBAvailable()) {
          return false;
        } else {
          return validateIndexedDBOpenable().then(() => true).catch(() => false);
        }
      });
    }
    /**
     * Read all heartbeats.
     */
    read() {
      return __async(this, null, function* () {
        const canUseIndexedDB = yield this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
          return { heartbeats: [] };
        } else {
          const idbHeartbeatObject = yield readHeartbeatsFromIndexedDB(this.app);
          if (idbHeartbeatObject == null ? void 0 : idbHeartbeatObject.heartbeats) {
            return idbHeartbeatObject;
          } else {
            return { heartbeats: [] };
          }
        }
      });
    }
    // overwrite the storage with the provided heartbeats
    overwrite(heartbeatsObject) {
      return __async(this, null, function* () {
        var _a;
        const canUseIndexedDB = yield this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
          return;
        } else {
          const existingHeartbeatsObject = yield this.read();
          return writeHeartbeatsToIndexedDB(this.app, {
            lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) != null ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
            heartbeats: heartbeatsObject.heartbeats
          });
        }
      });
    }
    // add heartbeats
    add(heartbeatsObject) {
      return __async(this, null, function* () {
        var _a;
        const canUseIndexedDB = yield this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
          return;
        } else {
          const existingHeartbeatsObject = yield this.read();
          return writeHeartbeatsToIndexedDB(this.app, {
            lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) != null ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
            heartbeats: [
              ...existingHeartbeatsObject.heartbeats,
              ...heartbeatsObject.heartbeats
            ]
          });
        }
      });
    }
  };
  function countBytes(heartbeatsCache) {
    return base64urlEncodeWithoutPadding(
      // heartbeatsCache wrapper properties
      JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
    ).length;
  }
  function getEarliestHeartbeatIdx(heartbeats) {
    if (heartbeats.length === 0) {
      return -1;
    }
    let earliestHeartbeatIdx = 0;
    let earliestHeartbeatDate = heartbeats[0].date;
    for (let i = 1; i < heartbeats.length; i++) {
      if (heartbeats[i].date < earliestHeartbeatDate) {
        earliestHeartbeatDate = heartbeats[i].date;
        earliestHeartbeatIdx = i;
      }
    }
    return earliestHeartbeatIdx;
  }
  function registerCoreComponents(variant) {
    _registerComponent(new Component(
      "platform-logger",
      (container) => new PlatformLoggerServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    _registerComponent(new Component(
      "heartbeat",
      (container) => new HeartbeatServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    registerVersion(name$q, version$1, variant);
    registerVersion(name$q, version$1, "esm2020");
    registerVersion("fire-js", "");
  }
  registerCoreComponents("");

  // node_modules/firebase/app/dist/esm/index.esm.js
  var name2 = "firebase";
  var version = "12.12.1";
  registerVersion(name2, version, "app");

  // node_modules/@firebase/installations/dist/esm/index.esm.js
  var name3 = "@firebase/installations";
  var version2 = "0.6.21";
  var PENDING_TIMEOUT_MS = 1e4;
  var PACKAGE_VERSION = `w:${version2}`;
  var INTERNAL_AUTH_VERSION = "FIS_v2";
  var INSTALLATIONS_API_URL = "https://firebaseinstallations.googleapis.com/v1";
  var TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1e3;
  var SERVICE = "installations";
  var SERVICE_NAME = "Installations";
  var ERROR_DESCRIPTION_MAP = {
    [
      "missing-app-config-values"
      /* ErrorCode.MISSING_APP_CONFIG_VALUES */
    ]: 'Missing App configuration value: "{$valueName}"',
    [
      "not-registered"
      /* ErrorCode.NOT_REGISTERED */
    ]: "Firebase Installation is not registered.",
    [
      "installation-not-found"
      /* ErrorCode.INSTALLATION_NOT_FOUND */
    ]: "Firebase Installation not found.",
    [
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    ]: '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
    [
      "app-offline"
      /* ErrorCode.APP_OFFLINE */
    ]: "Could not process request. Application offline.",
    [
      "delete-pending-registration"
      /* ErrorCode.DELETE_PENDING_REGISTRATION */
    ]: "Can't delete installation while there is a pending registration request."
  };
  var ERROR_FACTORY2 = new ErrorFactory(SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP);
  function isServerError(error) {
    return error instanceof FirebaseError && error.code.includes(
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    );
  }
  function getInstallationsEndpoint({ projectId }) {
    return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
  }
  function extractAuthTokenInfoFromResponse(response) {
    return {
      token: response.token,
      requestStatus: 2,
      expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
      creationTime: Date.now()
    };
  }
  function getErrorFromResponse(requestName, response) {
    return __async(this, null, function* () {
      const responseJson = yield response.json();
      const errorData = responseJson.error;
      return ERROR_FACTORY2.create("request-failed", {
        requestName,
        serverCode: errorData.code,
        serverMessage: errorData.message,
        serverStatus: errorData.status
      });
    });
  }
  function getHeaders({ apiKey }) {
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": apiKey
    });
  }
  function getHeadersWithAuth(appConfig, { refreshToken }) {
    const headers = getHeaders(appConfig);
    headers.append("Authorization", getAuthorizationHeader(refreshToken));
    return headers;
  }
  function retryIfServerError(fn) {
    return __async(this, null, function* () {
      const result = yield fn();
      if (result.status >= 500 && result.status < 600) {
        return fn();
      }
      return result;
    });
  }
  function getExpiresInFromResponseExpiresIn(responseExpiresIn) {
    return Number(responseExpiresIn.replace("s", "000"));
  }
  function getAuthorizationHeader(refreshToken) {
    return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
  }
  function createInstallationRequest(_0, _1) {
    return __async(this, arguments, function* ({ appConfig, heartbeatServiceProvider }, { fid }) {
      const endpoint = getInstallationsEndpoint(appConfig);
      const headers = getHeaders(appConfig);
      const heartbeatService = heartbeatServiceProvider.getImmediate({
        optional: true
      });
      if (heartbeatService) {
        const heartbeatsHeader = yield heartbeatService.getHeartbeatsHeader();
        if (heartbeatsHeader) {
          headers.append("x-firebase-client", heartbeatsHeader);
        }
      }
      const body = {
        fid,
        authVersion: INTERNAL_AUTH_VERSION,
        appId: appConfig.appId,
        sdkVersion: PACKAGE_VERSION
      };
      const request = {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      };
      const response = yield retryIfServerError(() => fetch(endpoint, request));
      if (response.ok) {
        const responseValue = yield response.json();
        const registeredInstallationEntry = {
          fid: responseValue.fid || fid,
          registrationStatus: 2,
          refreshToken: responseValue.refreshToken,
          authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
        };
        return registeredInstallationEntry;
      } else {
        throw yield getErrorFromResponse("Create Installation", response);
      }
    });
  }
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  function bufferToBase64UrlSafe(array) {
    const b64 = btoa(String.fromCharCode(...array));
    return b64.replace(/\+/g, "-").replace(/\//g, "_");
  }
  var VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
  var INVALID_FID = "";
  function generateFid() {
    try {
      const fidByteArray = new Uint8Array(17);
      const crypto2 = self.crypto || self.msCrypto;
      crypto2.getRandomValues(fidByteArray);
      fidByteArray[0] = 112 + fidByteArray[0] % 16;
      const fid = encode(fidByteArray);
      return VALID_FID_PATTERN.test(fid) ? fid : INVALID_FID;
    } catch (e) {
      return INVALID_FID;
    }
  }
  function encode(fidByteArray) {
    const b64String = bufferToBase64UrlSafe(fidByteArray);
    return b64String.substr(0, 22);
  }
  function getKey(appConfig) {
    return `${appConfig.appName}!${appConfig.appId}`;
  }
  var fidChangeCallbacks = /* @__PURE__ */ new Map();
  function fidChanged(appConfig, fid) {
    const key = getKey(appConfig);
    callFidChangeCallbacks(key, fid);
    broadcastFidChange(key, fid);
  }
  function callFidChangeCallbacks(key, fid) {
    const callbacks = fidChangeCallbacks.get(key);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      callback(fid);
    }
  }
  function broadcastFidChange(key, fid) {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ key, fid });
    }
    closeBroadcastChannel();
  }
  var broadcastChannel = null;
  function getBroadcastChannel() {
    if (!broadcastChannel && "BroadcastChannel" in self) {
      broadcastChannel = new BroadcastChannel("[Firebase] FID Change");
      broadcastChannel.onmessage = (e) => {
        callFidChangeCallbacks(e.data.key, e.data.fid);
      };
    }
    return broadcastChannel;
  }
  function closeBroadcastChannel() {
    if (fidChangeCallbacks.size === 0 && broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }
  var DATABASE_NAME = "firebase-installations-database";
  var DATABASE_VERSION = 1;
  var OBJECT_STORE_NAME = "firebase-installations-store";
  var dbPromise2 = null;
  function getDbPromise2() {
    if (!dbPromise2) {
      dbPromise2 = openDB(DATABASE_NAME, DATABASE_VERSION, {
        upgrade: (db, oldVersion) => {
          switch (oldVersion) {
            case 0:
              db.createObjectStore(OBJECT_STORE_NAME);
          }
        }
      });
    }
    return dbPromise2;
  }
  function set(appConfig, value) {
    return __async(this, null, function* () {
      const key = getKey(appConfig);
      const db = yield getDbPromise2();
      const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
      const objectStore = tx.objectStore(OBJECT_STORE_NAME);
      const oldValue = yield objectStore.get(key);
      yield objectStore.put(value, key);
      yield tx.done;
      if (!oldValue || oldValue.fid !== value.fid) {
        fidChanged(appConfig, value.fid);
      }
      return value;
    });
  }
  function remove(appConfig) {
    return __async(this, null, function* () {
      const key = getKey(appConfig);
      const db = yield getDbPromise2();
      const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
      yield tx.objectStore(OBJECT_STORE_NAME).delete(key);
      yield tx.done;
    });
  }
  function update(appConfig, updateFn) {
    return __async(this, null, function* () {
      const key = getKey(appConfig);
      const db = yield getDbPromise2();
      const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
      const store = tx.objectStore(OBJECT_STORE_NAME);
      const oldValue = yield store.get(key);
      const newValue = updateFn(oldValue);
      if (newValue === void 0) {
        yield store.delete(key);
      } else {
        yield store.put(newValue, key);
      }
      yield tx.done;
      if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
        fidChanged(appConfig, newValue.fid);
      }
      return newValue;
    });
  }
  function getInstallationEntry(installations) {
    return __async(this, null, function* () {
      let registrationPromise;
      const installationEntry = yield update(installations.appConfig, (oldEntry) => {
        const installationEntry2 = updateOrCreateInstallationEntry(oldEntry);
        const entryWithPromise = triggerRegistrationIfNecessary(installations, installationEntry2);
        registrationPromise = entryWithPromise.registrationPromise;
        return entryWithPromise.installationEntry;
      });
      if (installationEntry.fid === INVALID_FID) {
        return { installationEntry: yield registrationPromise };
      }
      return {
        installationEntry,
        registrationPromise
      };
    });
  }
  function updateOrCreateInstallationEntry(oldEntry) {
    const entry = oldEntry || {
      fid: generateFid(),
      registrationStatus: 0
      /* RequestStatus.NOT_STARTED */
    };
    return clearTimedOutRequest(entry);
  }
  function triggerRegistrationIfNecessary(installations, installationEntry) {
    if (installationEntry.registrationStatus === 0) {
      if (!navigator.onLine) {
        const registrationPromiseWithError = Promise.reject(ERROR_FACTORY2.create(
          "app-offline"
          /* ErrorCode.APP_OFFLINE */
        ));
        return {
          installationEntry,
          registrationPromise: registrationPromiseWithError
        };
      }
      const inProgressEntry = {
        fid: installationEntry.fid,
        registrationStatus: 1,
        registrationTime: Date.now()
      };
      const registrationPromise = registerInstallation(installations, inProgressEntry);
      return { installationEntry: inProgressEntry, registrationPromise };
    } else if (installationEntry.registrationStatus === 1) {
      return {
        installationEntry,
        registrationPromise: waitUntilFidRegistration(installations)
      };
    } else {
      return { installationEntry };
    }
  }
  function registerInstallation(installations, installationEntry) {
    return __async(this, null, function* () {
      try {
        const registeredInstallationEntry = yield createInstallationRequest(installations, installationEntry);
        return set(installations.appConfig, registeredInstallationEntry);
      } catch (e) {
        if (isServerError(e) && e.customData.serverCode === 409) {
          yield remove(installations.appConfig);
        } else {
          yield set(installations.appConfig, {
            fid: installationEntry.fid,
            registrationStatus: 0
            /* RequestStatus.NOT_STARTED */
          });
        }
        throw e;
      }
    });
  }
  function waitUntilFidRegistration(installations) {
    return __async(this, null, function* () {
      let entry = yield updateInstallationRequest(installations.appConfig);
      while (entry.registrationStatus === 1) {
        yield sleep(100);
        entry = yield updateInstallationRequest(installations.appConfig);
      }
      if (entry.registrationStatus === 0) {
        const { installationEntry, registrationPromise } = yield getInstallationEntry(installations);
        if (registrationPromise) {
          return registrationPromise;
        } else {
          return installationEntry;
        }
      }
      return entry;
    });
  }
  function updateInstallationRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!oldEntry) {
        throw ERROR_FACTORY2.create(
          "installation-not-found"
          /* ErrorCode.INSTALLATION_NOT_FOUND */
        );
      }
      return clearTimedOutRequest(oldEntry);
    });
  }
  function clearTimedOutRequest(entry) {
    if (hasInstallationRequestTimedOut(entry)) {
      return {
        fid: entry.fid,
        registrationStatus: 0
        /* RequestStatus.NOT_STARTED */
      };
    }
    return entry;
  }
  function hasInstallationRequestTimedOut(installationEntry) {
    return installationEntry.registrationStatus === 1 && installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now();
  }
  function generateAuthTokenRequest(_0, _1) {
    return __async(this, arguments, function* ({ appConfig, heartbeatServiceProvider }, installationEntry) {
      const endpoint = getGenerateAuthTokenEndpoint(appConfig, installationEntry);
      const headers = getHeadersWithAuth(appConfig, installationEntry);
      const heartbeatService = heartbeatServiceProvider.getImmediate({
        optional: true
      });
      if (heartbeatService) {
        const heartbeatsHeader = yield heartbeatService.getHeartbeatsHeader();
        if (heartbeatsHeader) {
          headers.append("x-firebase-client", heartbeatsHeader);
        }
      }
      const body = {
        installation: {
          sdkVersion: PACKAGE_VERSION,
          appId: appConfig.appId
        }
      };
      const request = {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      };
      const response = yield retryIfServerError(() => fetch(endpoint, request));
      if (response.ok) {
        const responseValue = yield response.json();
        const completedAuthToken = extractAuthTokenInfoFromResponse(responseValue);
        return completedAuthToken;
      } else {
        throw yield getErrorFromResponse("Generate Auth Token", response);
      }
    });
  }
  function getGenerateAuthTokenEndpoint(appConfig, { fid }) {
    return `${getInstallationsEndpoint(appConfig)}/${fid}/authTokens:generate`;
  }
  function refreshAuthToken(installations, forceRefresh = false) {
    return __async(this, null, function* () {
      let tokenPromise;
      const entry = yield update(installations.appConfig, (oldEntry) => {
        if (!isEntryRegistered(oldEntry)) {
          throw ERROR_FACTORY2.create(
            "not-registered"
            /* ErrorCode.NOT_REGISTERED */
          );
        }
        const oldAuthToken = oldEntry.authToken;
        if (!forceRefresh && isAuthTokenValid(oldAuthToken)) {
          return oldEntry;
        } else if (oldAuthToken.requestStatus === 1) {
          tokenPromise = waitUntilAuthTokenRequest(installations, forceRefresh);
          return oldEntry;
        } else {
          if (!navigator.onLine) {
            throw ERROR_FACTORY2.create(
              "app-offline"
              /* ErrorCode.APP_OFFLINE */
            );
          }
          const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
          tokenPromise = fetchAuthTokenFromServer(installations, inProgressEntry);
          return inProgressEntry;
        }
      });
      const authToken = tokenPromise ? yield tokenPromise : entry.authToken;
      return authToken;
    });
  }
  function waitUntilAuthTokenRequest(installations, forceRefresh) {
    return __async(this, null, function* () {
      let entry = yield updateAuthTokenRequest(installations.appConfig);
      while (entry.authToken.requestStatus === 1) {
        yield sleep(100);
        entry = yield updateAuthTokenRequest(installations.appConfig);
      }
      const authToken = entry.authToken;
      if (authToken.requestStatus === 0) {
        return refreshAuthToken(installations, forceRefresh);
      } else {
        return authToken;
      }
    });
  }
  function updateAuthTokenRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY2.create(
          "not-registered"
          /* ErrorCode.NOT_REGISTERED */
        );
      }
      const oldAuthToken = oldEntry.authToken;
      if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
        return __spreadProps(__spreadValues({}, oldEntry), {
          authToken: {
            requestStatus: 0
            /* RequestStatus.NOT_STARTED */
          }
        });
      }
      return oldEntry;
    });
  }
  function fetchAuthTokenFromServer(installations, installationEntry) {
    return __async(this, null, function* () {
      try {
        const authToken = yield generateAuthTokenRequest(installations, installationEntry);
        const updatedInstallationEntry = __spreadProps(__spreadValues({}, installationEntry), {
          authToken
        });
        yield set(installations.appConfig, updatedInstallationEntry);
        return authToken;
      } catch (e) {
        if (isServerError(e) && (e.customData.serverCode === 401 || e.customData.serverCode === 404)) {
          yield remove(installations.appConfig);
        } else {
          const updatedInstallationEntry = __spreadProps(__spreadValues({}, installationEntry), {
            authToken: {
              requestStatus: 0
              /* RequestStatus.NOT_STARTED */
            }
          });
          yield set(installations.appConfig, updatedInstallationEntry);
        }
        throw e;
      }
    });
  }
  function isEntryRegistered(installationEntry) {
    return installationEntry !== void 0 && installationEntry.registrationStatus === 2;
  }
  function isAuthTokenValid(authToken) {
    return authToken.requestStatus === 2 && !isAuthTokenExpired(authToken);
  }
  function isAuthTokenExpired(authToken) {
    const now = Date.now();
    return now < authToken.creationTime || authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER;
  }
  function makeAuthTokenRequestInProgressEntry(oldEntry) {
    const inProgressAuthToken = {
      requestStatus: 1,
      requestTime: Date.now()
    };
    return __spreadProps(__spreadValues({}, oldEntry), {
      authToken: inProgressAuthToken
    });
  }
  function hasAuthTokenRequestTimedOut(authToken) {
    return authToken.requestStatus === 1 && authToken.requestTime + PENDING_TIMEOUT_MS < Date.now();
  }
  function getId(installations) {
    return __async(this, null, function* () {
      const installationsImpl = installations;
      const { installationEntry, registrationPromise } = yield getInstallationEntry(installationsImpl);
      if (registrationPromise) {
        registrationPromise.catch(console.error);
      } else {
        refreshAuthToken(installationsImpl).catch(console.error);
      }
      return installationEntry.fid;
    });
  }
  function getToken(installations, forceRefresh = false) {
    return __async(this, null, function* () {
      const installationsImpl = installations;
      yield completeInstallationRegistration(installationsImpl);
      const authToken = yield refreshAuthToken(installationsImpl, forceRefresh);
      return authToken.token;
    });
  }
  function completeInstallationRegistration(installations) {
    return __async(this, null, function* () {
      const { registrationPromise } = yield getInstallationEntry(installations);
      if (registrationPromise) {
        yield registrationPromise;
      }
    });
  }
  function extractAppConfig(app) {
    if (!app || !app.options) {
      throw getMissingValueError("App Configuration");
    }
    if (!app.name) {
      throw getMissingValueError("App Name");
    }
    const configKeys = [
      "projectId",
      "apiKey",
      "appId"
    ];
    for (const keyName of configKeys) {
      if (!app.options[keyName]) {
        throw getMissingValueError(keyName);
      }
    }
    return {
      appName: app.name,
      projectId: app.options.projectId,
      apiKey: app.options.apiKey,
      appId: app.options.appId
    };
  }
  function getMissingValueError(valueName) {
    return ERROR_FACTORY2.create("missing-app-config-values", {
      valueName
    });
  }
  var INSTALLATIONS_NAME = "installations";
  var INSTALLATIONS_NAME_INTERNAL = "installations-internal";
  var publicFactory = (container) => {
    const app = container.getProvider("app").getImmediate();
    const appConfig = extractAppConfig(app);
    const heartbeatServiceProvider = _getProvider(app, "heartbeat");
    const installationsImpl = {
      app,
      appConfig,
      heartbeatServiceProvider,
      _delete: () => Promise.resolve()
    };
    return installationsImpl;
  };
  var internalFactory = (container) => {
    const app = container.getProvider("app").getImmediate();
    const installations = _getProvider(app, INSTALLATIONS_NAME).getImmediate();
    const installationsInternal = {
      getId: () => getId(installations),
      getToken: (forceRefresh) => getToken(installations, forceRefresh)
    };
    return installationsInternal;
  };
  function registerInstallations() {
    _registerComponent(new Component(
      INSTALLATIONS_NAME,
      publicFactory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
    _registerComponent(new Component(
      INSTALLATIONS_NAME_INTERNAL,
      internalFactory,
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
  }
  registerInstallations();
  registerVersion(name3, version2);
  registerVersion(name3, version2, "esm2020");

  // node_modules/@firebase/messaging/dist/esm/index.sw.esm.js
  var DEFAULT_VAPID_KEY = "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";
  var ENDPOINT = "https://fcmregistrations.googleapis.com/v1";
  var FCM_MSG = "FCM_MSG";
  var CONSOLE_CAMPAIGN_ID = "google.c.a.c_id";
  var SDK_PLATFORM_WEB = 3;
  var EVENT_MESSAGE_DELIVERED = 1;
  var MessageType$1;
  (function(MessageType2) {
    MessageType2[MessageType2["DATA_MESSAGE"] = 1] = "DATA_MESSAGE";
    MessageType2[MessageType2["DISPLAY_NOTIFICATION"] = 3] = "DISPLAY_NOTIFICATION";
  })(MessageType$1 || (MessageType$1 = {}));
  var MessageType;
  (function(MessageType2) {
    MessageType2["PUSH_RECEIVED"] = "push-received";
    MessageType2["NOTIFICATION_CLICKED"] = "notification-clicked";
  })(MessageType || (MessageType = {}));
  function arrayToBase64(array) {
    const uint8Array = new Uint8Array(array);
    const base64String = btoa(String.fromCharCode(...uint8Array));
    return base64String.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function base64ToArray(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base642 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = atob(base642);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  var OLD_DB_NAME = "fcm_token_details_db";
  var OLD_DB_VERSION = 5;
  var OLD_OBJECT_STORE_NAME = "fcm_token_object_Store";
  function migrateOldDatabase(senderId) {
    return __async(this, null, function* () {
      if ("databases" in indexedDB) {
        const databases = yield indexedDB.databases();
        const dbNames = databases.map((db2) => db2.name);
        if (!dbNames.includes(OLD_DB_NAME)) {
          return null;
        }
      }
      let tokenDetails = null;
      const db = yield openDB(OLD_DB_NAME, OLD_DB_VERSION, {
        upgrade: (db2, oldVersion, newVersion, upgradeTransaction) => __async(null, null, function* () {
          var _a;
          if (oldVersion < 2) {
            return;
          }
          if (!db2.objectStoreNames.contains(OLD_OBJECT_STORE_NAME)) {
            return;
          }
          const objectStore = upgradeTransaction.objectStore(OLD_OBJECT_STORE_NAME);
          const value = yield objectStore.index("fcmSenderId").get(senderId);
          yield objectStore.clear();
          if (!value) {
            return;
          }
          if (oldVersion === 2) {
            const oldDetails = value;
            if (!oldDetails.auth || !oldDetails.p256dh || !oldDetails.endpoint) {
              return;
            }
            tokenDetails = {
              token: oldDetails.fcmToken,
              createTime: (_a = oldDetails.createTime) != null ? _a : Date.now(),
              subscriptionOptions: {
                auth: oldDetails.auth,
                p256dh: oldDetails.p256dh,
                endpoint: oldDetails.endpoint,
                swScope: oldDetails.swScope,
                vapidKey: typeof oldDetails.vapidKey === "string" ? oldDetails.vapidKey : arrayToBase64(oldDetails.vapidKey)
              }
            };
          } else if (oldVersion === 3) {
            const oldDetails = value;
            tokenDetails = {
              token: oldDetails.fcmToken,
              createTime: oldDetails.createTime,
              subscriptionOptions: {
                auth: arrayToBase64(oldDetails.auth),
                p256dh: arrayToBase64(oldDetails.p256dh),
                endpoint: oldDetails.endpoint,
                swScope: oldDetails.swScope,
                vapidKey: arrayToBase64(oldDetails.vapidKey)
              }
            };
          } else if (oldVersion === 4) {
            const oldDetails = value;
            tokenDetails = {
              token: oldDetails.fcmToken,
              createTime: oldDetails.createTime,
              subscriptionOptions: {
                auth: arrayToBase64(oldDetails.auth),
                p256dh: arrayToBase64(oldDetails.p256dh),
                endpoint: oldDetails.endpoint,
                swScope: oldDetails.swScope,
                vapidKey: arrayToBase64(oldDetails.vapidKey)
              }
            };
          }
        })
      });
      db.close();
      yield deleteDB(OLD_DB_NAME);
      yield deleteDB("fcm_vapid_details_db");
      yield deleteDB("undefined");
      return checkTokenDetails(tokenDetails) ? tokenDetails : null;
    });
  }
  function checkTokenDetails(tokenDetails) {
    if (!tokenDetails || !tokenDetails.subscriptionOptions) {
      return false;
    }
    const { subscriptionOptions } = tokenDetails;
    return typeof tokenDetails.createTime === "number" && tokenDetails.createTime > 0 && typeof tokenDetails.token === "string" && tokenDetails.token.length > 0 && typeof subscriptionOptions.auth === "string" && subscriptionOptions.auth.length > 0 && typeof subscriptionOptions.p256dh === "string" && subscriptionOptions.p256dh.length > 0 && typeof subscriptionOptions.endpoint === "string" && subscriptionOptions.endpoint.length > 0 && typeof subscriptionOptions.swScope === "string" && subscriptionOptions.swScope.length > 0 && typeof subscriptionOptions.vapidKey === "string" && subscriptionOptions.vapidKey.length > 0;
  }
  var DATABASE_NAME2 = "firebase-messaging-database";
  var DATABASE_VERSION2 = 1;
  var OBJECT_STORE_NAME2 = "firebase-messaging-store";
  var dbPromise3 = null;
  function getDbPromise3() {
    if (!dbPromise3) {
      dbPromise3 = openDB(DATABASE_NAME2, DATABASE_VERSION2, {
        upgrade: (upgradeDb, oldVersion) => {
          switch (oldVersion) {
            case 0:
              upgradeDb.createObjectStore(OBJECT_STORE_NAME2);
          }
        }
      });
    }
    return dbPromise3;
  }
  function dbGet(firebaseDependencies) {
    return __async(this, null, function* () {
      const key = getKey2(firebaseDependencies);
      const db = yield getDbPromise3();
      const tokenDetails = yield db.transaction(OBJECT_STORE_NAME2).objectStore(OBJECT_STORE_NAME2).get(key);
      if (tokenDetails) {
        return tokenDetails;
      } else {
        const oldTokenDetails = yield migrateOldDatabase(firebaseDependencies.appConfig.senderId);
        if (oldTokenDetails) {
          yield dbSet(firebaseDependencies, oldTokenDetails);
          return oldTokenDetails;
        }
      }
    });
  }
  function dbSet(firebaseDependencies, tokenDetails) {
    return __async(this, null, function* () {
      const key = getKey2(firebaseDependencies);
      const db = yield getDbPromise3();
      const tx = db.transaction(OBJECT_STORE_NAME2, "readwrite");
      yield tx.objectStore(OBJECT_STORE_NAME2).put(tokenDetails, key);
      yield tx.done;
      return tokenDetails;
    });
  }
  function dbRemove(firebaseDependencies) {
    return __async(this, null, function* () {
      const key = getKey2(firebaseDependencies);
      const db = yield getDbPromise3();
      const tx = db.transaction(OBJECT_STORE_NAME2, "readwrite");
      yield tx.objectStore(OBJECT_STORE_NAME2).delete(key);
      yield tx.done;
    });
  }
  function getKey2({ appConfig }) {
    return appConfig.appId;
  }
  var ERROR_MAP = {
    [
      "missing-app-config-values"
      /* ErrorCode.MISSING_APP_CONFIG_VALUES */
    ]: 'Missing App configuration value: "{$valueName}"',
    [
      "only-available-in-window"
      /* ErrorCode.AVAILABLE_IN_WINDOW */
    ]: "This method is available in a Window context.",
    [
      "only-available-in-sw"
      /* ErrorCode.AVAILABLE_IN_SW */
    ]: "This method is available in a service worker context.",
    [
      "permission-default"
      /* ErrorCode.PERMISSION_DEFAULT */
    ]: "The notification permission was not granted and dismissed instead.",
    [
      "permission-blocked"
      /* ErrorCode.PERMISSION_BLOCKED */
    ]: "The notification permission was not granted and blocked instead.",
    [
      "unsupported-browser"
      /* ErrorCode.UNSUPPORTED_BROWSER */
    ]: "This browser doesn't support the API's required to use the Firebase SDK.",
    [
      "indexed-db-unsupported"
      /* ErrorCode.INDEXED_DB_UNSUPPORTED */
    ]: "This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)",
    [
      "failed-service-worker-registration"
      /* ErrorCode.FAILED_DEFAULT_REGISTRATION */
    ]: "We are unable to register the default service worker. {$browserErrorMessage}",
    [
      "token-subscribe-failed"
      /* ErrorCode.TOKEN_SUBSCRIBE_FAILED */
    ]: "A problem occurred while subscribing the user to FCM: {$errorInfo}",
    [
      "token-subscribe-no-token"
      /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */
    ]: "FCM returned no token when subscribing the user to push.",
    [
      "token-unsubscribe-failed"
      /* ErrorCode.TOKEN_UNSUBSCRIBE_FAILED */
    ]: "A problem occurred while unsubscribing the user from FCM: {$errorInfo}",
    [
      "token-update-failed"
      /* ErrorCode.TOKEN_UPDATE_FAILED */
    ]: "A problem occurred while updating the user from FCM: {$errorInfo}",
    [
      "token-update-no-token"
      /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */
    ]: "FCM returned no token when updating the user to push.",
    [
      "use-sw-after-get-token"
      /* ErrorCode.USE_SW_AFTER_GET_TOKEN */
    ]: "The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.",
    [
      "invalid-sw-registration"
      /* ErrorCode.INVALID_SW_REGISTRATION */
    ]: "The input to useServiceWorker() must be a ServiceWorkerRegistration.",
    [
      "invalid-bg-handler"
      /* ErrorCode.INVALID_BG_HANDLER */
    ]: "The input to setBackgroundMessageHandler() must be a function.",
    [
      "invalid-vapid-key"
      /* ErrorCode.INVALID_VAPID_KEY */
    ]: "The public VAPID key must be a string.",
    [
      "use-vapid-key-after-get-token"
      /* ErrorCode.USE_VAPID_KEY_AFTER_GET_TOKEN */
    ]: "The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."
  };
  var ERROR_FACTORY3 = new ErrorFactory("messaging", "Messaging", ERROR_MAP);
  function requestGetToken(firebaseDependencies, subscriptionOptions) {
    return __async(this, null, function* () {
      const headers = yield getHeaders2(firebaseDependencies);
      const body = getBody(subscriptionOptions);
      const subscribeOptions = {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      };
      let responseData;
      try {
        const response = yield fetch(getEndpoint(firebaseDependencies.appConfig), subscribeOptions);
        responseData = yield response.json();
      } catch (err) {
        throw ERROR_FACTORY3.create("token-subscribe-failed", {
          errorInfo: err == null ? void 0 : err.toString()
        });
      }
      if (responseData.error) {
        const message = responseData.error.message;
        throw ERROR_FACTORY3.create("token-subscribe-failed", {
          errorInfo: message
        });
      }
      if (!responseData.token) {
        throw ERROR_FACTORY3.create(
          "token-subscribe-no-token"
          /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */
        );
      }
      return responseData.token;
    });
  }
  function requestUpdateToken(firebaseDependencies, tokenDetails) {
    return __async(this, null, function* () {
      const headers = yield getHeaders2(firebaseDependencies);
      const body = getBody(tokenDetails.subscriptionOptions);
      const updateOptions = {
        method: "PATCH",
        headers,
        body: JSON.stringify(body)
      };
      let responseData;
      try {
        const response = yield fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${tokenDetails.token}`, updateOptions);
        responseData = yield response.json();
      } catch (err) {
        throw ERROR_FACTORY3.create("token-update-failed", {
          errorInfo: err == null ? void 0 : err.toString()
        });
      }
      if (responseData.error) {
        const message = responseData.error.message;
        throw ERROR_FACTORY3.create("token-update-failed", {
          errorInfo: message
        });
      }
      if (!responseData.token) {
        throw ERROR_FACTORY3.create(
          "token-update-no-token"
          /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */
        );
      }
      return responseData.token;
    });
  }
  function requestDeleteToken(firebaseDependencies, token) {
    return __async(this, null, function* () {
      const headers = yield getHeaders2(firebaseDependencies);
      const unsubscribeOptions = {
        method: "DELETE",
        headers
      };
      try {
        const response = yield fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${token}`, unsubscribeOptions);
        const responseData = yield response.json();
        if (responseData.error) {
          const message = responseData.error.message;
          throw ERROR_FACTORY3.create("token-unsubscribe-failed", {
            errorInfo: message
          });
        }
      } catch (err) {
        throw ERROR_FACTORY3.create("token-unsubscribe-failed", {
          errorInfo: err == null ? void 0 : err.toString()
        });
      }
    });
  }
  function getEndpoint({ projectId }) {
    return `${ENDPOINT}/projects/${projectId}/registrations`;
  }
  function getHeaders2(_0) {
    return __async(this, arguments, function* ({ appConfig, installations }) {
      const authToken = yield installations.getToken();
      return new Headers({
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-goog-api-key": appConfig.apiKey,
        "x-goog-firebase-installations-auth": `FIS ${authToken}`
      });
    });
  }
  function getBody({ p256dh, auth, endpoint, vapidKey }) {
    const body = {
      web: {
        endpoint,
        auth,
        p256dh
      }
    };
    if (vapidKey !== DEFAULT_VAPID_KEY) {
      body.web.applicationPubKey = vapidKey;
    }
    return body;
  }
  var TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1e3;
  function getTokenInternal(messaging) {
    return __async(this, null, function* () {
      const pushSubscription = yield getPushSubscription(messaging.swRegistration, messaging.vapidKey);
      const subscriptionOptions = {
        vapidKey: messaging.vapidKey,
        swScope: messaging.swRegistration.scope,
        endpoint: pushSubscription.endpoint,
        auth: arrayToBase64(pushSubscription.getKey("auth")),
        p256dh: arrayToBase64(pushSubscription.getKey("p256dh"))
      };
      const tokenDetails = yield dbGet(messaging.firebaseDependencies);
      if (!tokenDetails) {
        return getNewToken(messaging.firebaseDependencies, subscriptionOptions);
      } else if (!isTokenValid(tokenDetails.subscriptionOptions, subscriptionOptions)) {
        try {
          yield requestDeleteToken(messaging.firebaseDependencies, tokenDetails.token);
        } catch (e) {
          console.warn(e);
        }
        return getNewToken(messaging.firebaseDependencies, subscriptionOptions);
      } else if (Date.now() >= tokenDetails.createTime + TOKEN_EXPIRATION_MS) {
        return updateToken(messaging, {
          token: tokenDetails.token,
          createTime: Date.now(),
          subscriptionOptions
        });
      } else {
        return tokenDetails.token;
      }
    });
  }
  function deleteTokenInternal(messaging) {
    return __async(this, null, function* () {
      const tokenDetails = yield dbGet(messaging.firebaseDependencies);
      if (tokenDetails) {
        yield requestDeleteToken(messaging.firebaseDependencies, tokenDetails.token);
        yield dbRemove(messaging.firebaseDependencies);
      }
      const pushSubscription = yield messaging.swRegistration.pushManager.getSubscription();
      if (pushSubscription) {
        return pushSubscription.unsubscribe();
      }
      return true;
    });
  }
  function updateToken(messaging, tokenDetails) {
    return __async(this, null, function* () {
      try {
        const updatedToken = yield requestUpdateToken(messaging.firebaseDependencies, tokenDetails);
        const updatedTokenDetails = __spreadProps(__spreadValues({}, tokenDetails), {
          token: updatedToken,
          createTime: Date.now()
        });
        yield dbSet(messaging.firebaseDependencies, updatedTokenDetails);
        return updatedToken;
      } catch (e) {
        throw e;
      }
    });
  }
  function getNewToken(firebaseDependencies, subscriptionOptions) {
    return __async(this, null, function* () {
      const token = yield requestGetToken(firebaseDependencies, subscriptionOptions);
      const tokenDetails = {
        token,
        createTime: Date.now(),
        subscriptionOptions
      };
      yield dbSet(firebaseDependencies, tokenDetails);
      return tokenDetails.token;
    });
  }
  function getPushSubscription(swRegistration, vapidKey) {
    return __async(this, null, function* () {
      const subscription = yield swRegistration.pushManager.getSubscription();
      if (subscription) {
        return subscription;
      }
      return swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        // Chrome <= 75 doesn't support base64-encoded VAPID key. For backward compatibility, VAPID key
        // submitted to pushManager#subscribe must be of type Uint8Array.
        applicationServerKey: base64ToArray(vapidKey)
      });
    });
  }
  function isTokenValid(dbOptions, currentOptions) {
    const isVapidKeyEqual = currentOptions.vapidKey === dbOptions.vapidKey;
    const isEndpointEqual = currentOptions.endpoint === dbOptions.endpoint;
    const isAuthEqual = currentOptions.auth === dbOptions.auth;
    const isP256dhEqual = currentOptions.p256dh === dbOptions.p256dh;
    return isVapidKeyEqual && isEndpointEqual && isAuthEqual && isP256dhEqual;
  }
  function externalizePayload(internalPayload) {
    const payload = {
      from: internalPayload.from,
      // eslint-disable-next-line camelcase
      collapseKey: internalPayload.collapse_key,
      // eslint-disable-next-line camelcase
      messageId: internalPayload.fcmMessageId
    };
    propagateNotificationPayload(payload, internalPayload);
    propagateDataPayload(payload, internalPayload);
    propagateFcmOptions(payload, internalPayload);
    return payload;
  }
  function propagateNotificationPayload(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.notification) {
      return;
    }
    payload.notification = {};
    const title = messagePayloadInternal.notification.title;
    if (!!title) {
      payload.notification.title = title;
    }
    const body = messagePayloadInternal.notification.body;
    if (!!body) {
      payload.notification.body = body;
    }
    const image = messagePayloadInternal.notification.image;
    if (!!image) {
      payload.notification.image = image;
    }
    const icon = messagePayloadInternal.notification.icon;
    if (!!icon) {
      payload.notification.icon = icon;
    }
  }
  function propagateDataPayload(payload, messagePayloadInternal) {
    if (!messagePayloadInternal.data) {
      return;
    }
    payload.data = messagePayloadInternal.data;
  }
  function propagateFcmOptions(payload, messagePayloadInternal) {
    var _a, _b, _c, _d, _e;
    if (!messagePayloadInternal.fcmOptions && !((_a = messagePayloadInternal.notification) == null ? void 0 : _a.click_action)) {
      return;
    }
    payload.fcmOptions = {};
    const link = (_d = (_b = messagePayloadInternal.fcmOptions) == null ? void 0 : _b.link) != null ? _d : (_c = messagePayloadInternal.notification) == null ? void 0 : _c.click_action;
    if (!!link) {
      payload.fcmOptions.link = link;
    }
    const analyticsLabel = (_e = messagePayloadInternal.fcmOptions) == null ? void 0 : _e.analytics_label;
    if (!!analyticsLabel) {
      payload.fcmOptions.analyticsLabel = analyticsLabel;
    }
  }
  function isConsoleMessage(data) {
    return typeof data === "object" && !!data && CONSOLE_CAMPAIGN_ID in data;
  }
  function sleep2(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  _mergeStrings("AzSCbw63g1R0nCw85jG8", "Iaya3yLKwmgvh7cF0q4");
  function stageLog(messaging, internalPayload) {
    return __async(this, null, function* () {
      const fcmEvent = createFcmEvent(internalPayload, yield messaging.firebaseDependencies.installations.getId());
      createAndEnqueueLogEvent(messaging, fcmEvent, internalPayload.productId);
    });
  }
  function createFcmEvent(internalPayload, fid) {
    var _a, _b;
    const fcmEvent = {};
    if (!!internalPayload.from) {
      fcmEvent.project_number = internalPayload.from;
    }
    if (!!internalPayload.fcmMessageId) {
      fcmEvent.message_id = internalPayload.fcmMessageId;
    }
    fcmEvent.instance_id = fid;
    if (!!internalPayload.notification) {
      fcmEvent.message_type = MessageType$1.DISPLAY_NOTIFICATION.toString();
    } else {
      fcmEvent.message_type = MessageType$1.DATA_MESSAGE.toString();
    }
    fcmEvent.sdk_platform = SDK_PLATFORM_WEB.toString();
    fcmEvent.package_name = self.origin.replace(/(^\w+:|^)\/\//, "");
    if (!!internalPayload.collapse_key) {
      fcmEvent.collapse_key = internalPayload.collapse_key;
    }
    fcmEvent.event = EVENT_MESSAGE_DELIVERED.toString();
    if (!!((_a = internalPayload.fcmOptions) == null ? void 0 : _a.analytics_label)) {
      fcmEvent.analytics_label = (_b = internalPayload.fcmOptions) == null ? void 0 : _b.analytics_label;
    }
    return fcmEvent;
  }
  function createAndEnqueueLogEvent(messaging, fcmEvent, productId) {
    const logEvent = {};
    logEvent.event_time_ms = Math.floor(Date.now()).toString();
    logEvent.source_extension_json_proto3 = JSON.stringify({
      messaging_client_event: fcmEvent
    });
    if (!!productId) {
      logEvent.compliance_data = buildComplianceData(productId);
    }
    messaging.logEvents.push(logEvent);
  }
  function buildComplianceData(productId) {
    const complianceData = {
      privacy_context: {
        prequest: {
          origin_associated_product_id: productId
        }
      }
    };
    return complianceData;
  }
  function _mergeStrings(s1, s2) {
    const resultArray = [];
    for (let i = 0; i < s1.length; i++) {
      resultArray.push(s1.charAt(i));
      if (i < s2.length) {
        resultArray.push(s2.charAt(i));
      }
    }
    return resultArray.join("");
  }
  function onSubChange(event, messaging) {
    return __async(this, null, function* () {
      var _a, _b;
      const { newSubscription } = event;
      if (!newSubscription) {
        yield deleteTokenInternal(messaging);
        return;
      }
      const tokenDetails = yield dbGet(messaging.firebaseDependencies);
      yield deleteTokenInternal(messaging);
      messaging.vapidKey = (_b = (_a = tokenDetails == null ? void 0 : tokenDetails.subscriptionOptions) == null ? void 0 : _a.vapidKey) != null ? _b : DEFAULT_VAPID_KEY;
      yield getTokenInternal(messaging);
    });
  }
  function onPush(event, messaging) {
    return __async(this, null, function* () {
      const internalPayload = getMessagePayloadInternal(event);
      if (!internalPayload) {
        return;
      }
      if (messaging.deliveryMetricsExportedToBigQueryEnabled) {
        yield stageLog(messaging, internalPayload);
      }
      const clientList = yield getClientList();
      if (hasVisibleClients(clientList)) {
        return sendMessagePayloadInternalToWindows(clientList, internalPayload);
      }
      if (!!internalPayload.notification) {
        yield showNotification(wrapInternalPayload(internalPayload));
      }
      if (!messaging) {
        return;
      }
      if (!!messaging.onBackgroundMessageHandler) {
        const payload = externalizePayload(internalPayload);
        if (typeof messaging.onBackgroundMessageHandler === "function") {
          yield messaging.onBackgroundMessageHandler(payload);
        } else {
          messaging.onBackgroundMessageHandler.next(payload);
        }
      }
    });
  }
  function onNotificationClick(event) {
    return __async(this, null, function* () {
      var _a, _b;
      const internalPayload = (_b = (_a = event.notification) == null ? void 0 : _a.data) == null ? void 0 : _b[FCM_MSG];
      if (!internalPayload) {
        return;
      } else if (event.action) {
        return;
      }
      event.stopImmediatePropagation();
      event.notification.close();
      const link = getLink(internalPayload);
      if (!link) {
        return;
      }
      const url = new URL(link, self.location.href);
      const originUrl = new URL(self.location.origin);
      if (url.host !== originUrl.host) {
        return;
      }
      let client = yield getWindowClient(url);
      if (!client) {
        client = yield self.clients.openWindow(link);
        yield sleep2(3e3);
      } else {
        client = yield client.focus();
      }
      if (!client) {
        return;
      }
      internalPayload.messageType = MessageType.NOTIFICATION_CLICKED;
      internalPayload.isFirebaseMessaging = true;
      return client.postMessage(internalPayload);
    });
  }
  function wrapInternalPayload(internalPayload) {
    const wrappedInternalPayload = __spreadValues({}, internalPayload.notification);
    wrappedInternalPayload.data = {
      [FCM_MSG]: internalPayload
    };
    return wrappedInternalPayload;
  }
  function getMessagePayloadInternal({ data }) {
    if (!data) {
      return null;
    }
    try {
      return data.json();
    } catch (err) {
      return null;
    }
  }
  function getWindowClient(url) {
    return __async(this, null, function* () {
      const clientList = yield getClientList();
      for (const client of clientList) {
        const clientUrl = new URL(client.url, self.location.href);
        if (url.host === clientUrl.host) {
          return client;
        }
      }
      return null;
    });
  }
  function hasVisibleClients(clientList) {
    return clientList.some((client) => client.visibilityState === "visible" && // Ignore chrome-extension clients as that matches the background pages of extensions, which
    // are always considered visible for some reason.
    !client.url.startsWith("chrome-extension://"));
  }
  function sendMessagePayloadInternalToWindows(clientList, internalPayload) {
    internalPayload.isFirebaseMessaging = true;
    internalPayload.messageType = MessageType.PUSH_RECEIVED;
    for (const client of clientList) {
      client.postMessage(internalPayload);
    }
  }
  function getClientList() {
    return self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
      // TS doesn't know that "type: 'window'" means it'll return WindowClient[]
    });
  }
  function showNotification(notificationPayloadInternal) {
    var _a;
    const { actions } = notificationPayloadInternal;
    const { maxActions } = Notification;
    if (actions && maxActions && actions.length > maxActions) {
      console.warn(`This browser only supports ${maxActions} actions. The remaining actions will not be displayed.`);
    }
    return self.registration.showNotification(
      /* title= */
      (_a = notificationPayloadInternal.title) != null ? _a : "",
      notificationPayloadInternal
    );
  }
  function getLink(payload) {
    var _a, _b, _c;
    const link = (_c = (_a = payload.fcmOptions) == null ? void 0 : _a.link) != null ? _c : (_b = payload.notification) == null ? void 0 : _b.click_action;
    if (link) {
      return link;
    }
    if (isConsoleMessage(payload.data)) {
      return self.location.origin;
    } else {
      return null;
    }
  }
  function extractAppConfig2(app) {
    if (!app || !app.options) {
      throw getMissingValueError2("App Configuration Object");
    }
    if (!app.name) {
      throw getMissingValueError2("App Name");
    }
    const configKeys = [
      "projectId",
      "apiKey",
      "appId",
      "messagingSenderId"
    ];
    const { options } = app;
    for (const keyName of configKeys) {
      if (!options[keyName]) {
        throw getMissingValueError2(keyName);
      }
    }
    return {
      appName: app.name,
      projectId: options.projectId,
      apiKey: options.apiKey,
      appId: options.appId,
      senderId: options.messagingSenderId
    };
  }
  function getMissingValueError2(valueName) {
    return ERROR_FACTORY3.create("missing-app-config-values", {
      valueName
    });
  }
  var MessagingService = class {
    constructor(app, installations, analyticsProvider) {
      this.deliveryMetricsExportedToBigQueryEnabled = false;
      this.onBackgroundMessageHandler = null;
      this.onMessageHandler = null;
      this.logEvents = [];
      this.isLogServiceStarted = false;
      const appConfig = extractAppConfig2(app);
      this.firebaseDependencies = {
        app,
        appConfig,
        installations,
        analyticsProvider
      };
    }
    _delete() {
      return Promise.resolve();
    }
  };
  var SwMessagingFactory = (container) => {
    const messaging = new MessagingService(container.getProvider("app").getImmediate(), container.getProvider("installations-internal").getImmediate(), container.getProvider("analytics-internal"));
    self.addEventListener("push", (e) => {
      e.waitUntil(onPush(e, messaging));
    });
    self.addEventListener("pushsubscriptionchange", (e) => {
      e.waitUntil(onSubChange(e, messaging));
    });
    self.addEventListener("notificationclick", (e) => {
      e.waitUntil(onNotificationClick(e));
    });
    return messaging;
  };
  function registerMessagingInSw() {
    _registerComponent(new Component(
      "messaging-sw",
      SwMessagingFactory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
  }
  function isSwSupported() {
    return __async(this, null, function* () {
      return isIndexedDBAvailable() && (yield validateIndexedDBOpenable()) && "PushManager" in self && "Notification" in self && ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification") && PushSubscription.prototype.hasOwnProperty("getKey");
    });
  }
  function onBackgroundMessage$1(messaging, nextOrObserver) {
    if (self.document !== void 0) {
      throw ERROR_FACTORY3.create(
        "only-available-in-sw"
        /* ErrorCode.AVAILABLE_IN_SW */
      );
    }
    messaging.onBackgroundMessageHandler = nextOrObserver;
    return () => {
      messaging.onBackgroundMessageHandler = null;
    };
  }
  function getMessagingInSw(app = getApp()) {
    isSwSupported().then((isSupported) => {
      if (!isSupported) {
        throw ERROR_FACTORY3.create(
          "unsupported-browser"
          /* ErrorCode.UNSUPPORTED_BROWSER */
        );
      }
    }, (_2) => {
      throw ERROR_FACTORY3.create(
        "indexed-db-unsupported"
        /* ErrorCode.INDEXED_DB_UNSUPPORTED */
      );
    });
    return _getProvider(getModularInstance(app), "messaging-sw").getImmediate();
  }
  function onBackgroundMessage(messaging, nextOrObserver) {
    messaging = getModularInstance(messaging);
    return onBackgroundMessage$1(messaging, nextOrObserver);
  }
  registerMessagingInSw();

  // src/sw.ts
  var manifest = self.__WB_MANIFEST || [];
  precacheAndRoute(manifest);
  self.addEventListener("install", () => {
    self.skipWaiting();
  });
  self.addEventListener("activate", () => {
    self.clients.claim();
  });
  var firebaseConfig = null;
  try {
    const urlParams = new URLSearchParams(self.location.search);
    const configParam = urlParams.get("config");
    if (configParam) {
      firebaseConfig = JSON.parse(decodeURIComponent(configParam));
    }
  } catch (e) {
    console.error("[sw.ts] Failed to parse dynamic config", e);
  }
  if (!firebaseConfig) {
    console.warn("[sw.ts] Missing dynamic config. Ensure the frontend passes app.options during registration. Using a dummy config.");
    firebaseConfig = {
      projectId: "chainlink-fallback",
      appId: "1:1234567890:web:1234567890",
      authDomain: "chainlink-fallback.firebaseapp.com",
      messagingSenderId: "1234567890",
      apiKey: "ignored-but-required-for-sw-compat"
    };
  }
  try {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessagingInSw(app);
    onBackgroundMessage(messaging, (payload) => {
      var _a, _b, _c;
      console.log("[sw.ts] Received background message ", payload);
      const notificationTitle = ((_a = payload.notification) == null ? void 0 : _a.title) || "ChainLink Update";
      const notificationOptions = {
        body: (_b = payload.notification) == null ? void 0 : _b.body,
        icon: "/icons/icon-192x192.png",
        data: {
          url: ((_c = payload.data) == null ? void 0 : _c.url) || "/"
        }
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Messaging in Service Worker", error);
  }
  self.addEventListener("notificationclick", function(event) {
    var _a;
    event.notification.close();
    const urlToOpen = ((_a = event.notification.data) == null ? void 0 : _a.url) || "/";
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
  });
})();
/*! Bundled license information:

@firebase/util/dist/postinstall.mjs:
@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/logger/dist/esm/index.esm.js:
@firebase/messaging/dist/esm/index.sw.esm.js:
@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
@firebase/component/dist/esm/index.esm.js:
@firebase/app/dist/esm/index.esm.js:
@firebase/app/dist/esm/index.esm.js:
@firebase/app/dist/esm/index.esm.js:
@firebase/installations/dist/esm/index.esm.js:
@firebase/installations/dist/esm/index.esm.js:
@firebase/installations/dist/esm/index.esm.js:
@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
firebase/app/dist/esm/index.esm.js:
@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/messaging/dist/esm/index.sw.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2018 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
   * in compliance with the License. You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under the License
   * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
   * or implied. See the License for the specific language governing permissions and limitations under
   * the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
