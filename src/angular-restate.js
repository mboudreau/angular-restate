angular.module('codinghitchhiker.Restate', [])

    .constant('HTTPStatus', {
        UNSPECIFIED: -1,
        OFFLINE: 0
    })

    .provider('Restate', function ($http, $q, $log, HTTPStatus) {

        var instance = {
            setBaseUrl: this.setBaseUrl,
            create: this.create
        };

        this.$get = function () {
            return instance;
        };

        var baseUrl = '';
        this.setBaseUrl = function (url) {
            if (angular.isDefined(url)) {
                url += ''; // Change whatever it is to a string
            }
            baseUrl = url || '';
            return instance;
        };

        this.create = function (url, obj) {
            if(!url) {// TODO: make error this better
                throw 'URL must be specified';
            }
            obj = obj || {};
            angular.extend(obj, new Model(url, obj));
            // TODO: add listener to object here
            return obj;
        };

        var joinUrl = function () {
            // TODO: add logic to remove slashes or build a url properly
            return arguments.join('/')
        };

        var Model = function (url, obj, schema) {
            this.$$url = joinUrl(baseUrl, url);
            this.schema(schema);
            this.$$errors = [];
            this.$$original = obj || {};
        };

        Model.prototype.schema = function (schema) {
            // TODO: validate schema
            this.$$schema = schema;
        };

        Model.prototype.autosave = function (delay) {
            // TODO: validate schema
            this.$$autosave = delay;
        };

        Model.prototype.revert = function () {

        };

        // Create http actions
        angular.forEach(['get', 'delete', 'post', 'put', 'head', 'jsonp', 'patch'], function (method) {
            // Preface with '$' to ignore serialization
            Model.prototype['$' + method] = function (params, data, config) { // TODO: add extend flag for array append/object extend
                // Remove all 'private' variables starting with '$'
                return $http(angular.extend(config || {}, {method: method, url: this.$$url, params: params, data: toJson(data)})).then(
                    function (response) {
                        // TODO: update original model
                        if(this.$$schema) {
                            // TODO: check schema, create model from children if needed
                        }
                        return response.data; // Just return the data from the http response, the rest is useless for now
                    },
                    handleError);
            };
        });

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
                    $log.warn('Error id "' + id + '" is missing from HTTPStatus');
                }
                error.id = id;
            }

            // Dispatch error on rootscope
            $rootScope.$emit('ERROR', error);

            // TODO: add logging of said error if possible

            return $q.reject(error);
        };

    });