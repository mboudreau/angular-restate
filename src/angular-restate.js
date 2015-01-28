angular.module('codinghitchhiker.restate', [])

    .constant('HTTPStatus', {
        UNSPECIFIED: -1,
        OFFLINE: 0
    })

    .provider('Restate', function (HTTPStatus) {
        var http, query, logger;

        var baseUrl = '';
        var defaults = {extend:false};  // TODO: add json diff instead of serializing whole object
        var models = {};

        this.setBaseUrl = function (url) {
            if (angular.isDefined(url)) {
                url += ''; // Change whatever it is to a string
            }
            baseUrl = url || '';
            return instance;
        };

        this.config = function (obj) {
            if (!angular.isObject(obj)) {
                throw "Config must be an object with key-value pairs"
            }
            // TODO: defaults validation?
            angular.extend(defaults, obj);
            return instance;
        };

        this.create = function (label, url, obj, schema) {
            if(!label || !angular.isString(label)) {
                throw 'Label must be a specified string';
            }
            if(obj != null && !angular.isObject(obj)) {
                throw 'Object to be wrapped needs to be an Array or an Object';
            }
            var model = models[label] || {};
            url = url || model.$$url || ''; // Can blank to specify base url
            obj = obj || model.$$obj || null; // Can blank to specify base url

            var empty = false;
            if(obj == null) {
                empty = true;
                obj = {};
            }

            addWrap.apply(obj, [label, url, schema, empty]);

            // Add signature to models
            models[label] = {$$url:url, $$obj:obj};

            // TODO: add listener to object here
            return obj;
        };

        var instance = {
            setBaseUrl: this.setBaseUrl,
            config: this.config,
            create: this.create
        };

        this.$get = function ($http, $q, $log) {
            http = $http;
            query = $q;
            logger = $log;
            return instance;
        };

        function addWrap(label, url, schema, empty) {
            var that = this;
            this.$$original = empty?null:angular.copy(this);
            this.$$label = label;
            this.$$url = url;
            this.$$errors = [];
            this.$$autosave = false;
            this.$$schema = null;

            this.$schema = function (schema) {
                // TODO: validate schema
                this.$$schema = schema;
                runSchema(that, that.$$schema);
                return this;
            };

            this.$autosave = function (delay) {
                // TODO: validate schema
                this.$$autosave = delay;
                return this;
            };

            this.$revert = function () {
                return this;
            };

            // Create http actions
            angular.forEach(['get', 'delete', 'post', 'put', 'head', 'jsonp', 'patch'], function (method) {
                // Preface with '$' to ignore serialization
                that['$' + method] = function (params, data, config) {
                    return http(angular.extend(defaults, config, {method: method, url: buildUrl(that), params: params, data: toJson(data)})).then(
                        function (response) {
                            if(response.config.extend && that.$$original != null) {
                                if(angular.isArray(response.data) && angular.isArray(that)) {
                                    that.push.apply(that, response.data);
                                }else{
                                    angular.extend(that, response.data);
                                }
                                runSchema(that, that.$$schema);
                                return that;
                            }else{
                                return instance.create(that.$$label, that.$$url, response.data, that.$$schema);
                            }
                        },
                        handleError);
                };
            });

            this.$schema(schema);
        };

        var runSchema = function(obj, schema) {
            if(schema != null && !angular.isFunction(schema)) {
                throw 'Schema is faulty, needs to be a function'
            }
            // TODO: create new instances from children in schema
            if(obj && schema) {

            }
        };

        // Remove all 'private' variables starting with '$'
        var toJsonReplacer = function (key, value) {
            var val = value;

            if (typeof key === 'string' && key.charAt(0) === '$') {
                val = undefined;
            } else if (value && value.window === value) {
                val = '$WINDOW';
            } else if (value && document === value) {
                val = '$DOCUMENT';
            } else if (value && value.$evalAsync && value.$watch) {
                val = '$SCOPE';
            }

            return val;
        };

        var toJson = function (obj, pretty) {
            if (typeof obj === 'undefined') {
                return undefined;
            }
            return JSON.stringify(obj, toJsonReplacer, pretty ? '  ' : null);
        };

        var buildUrl = function (obj) {
            var url = [baseUrl], model;
            angular.forEach(obj.$$label.split('.'), function(label){
                if(model = models[label]){
                    url.push(model.$$url);
                }
            });

            // TODO: add logic to remove slashes or build a url properly
            return url.join('/');
        };

        var handleError = function (response) {
            // Default error message if not handled properly
            var error = {
                id: HTTPStatus.UNSPECIFIED,
                message: "Something went wrong, we're looking into it",
                status: response.status
            };

            // Check for offline status
            if (response.status === 0) {
                error.id = HTTPStatus.OFFLINE;
                error.message = 'Internet connection not available. Retry later.';
            }

            // Check if status is a client error
            if (response.data && response.status >= 400 && response.status < 500) {
                error.message = response.data.message;
                var id;
                for (var key in HTTPStatus) {
                    if (HTTPStatus[key] === response.data.id) {
                        id = HTTPStatus[key];
                        break;
                    }
                }
                if (!id) {
                    id = response.data.id;
                    logger.warn('Error id "' + id + '" is missing from HTTPStatus');
                }
                error.id = id;
            }

            // Dispatch error on rootscope
            //$rootScope.$emit('ERROR', error);

            // TODO: add logging of said error if possible

            return query.reject(error);
        };

    });