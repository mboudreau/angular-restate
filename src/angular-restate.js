angular.module('codinghitchhiker.restate', [])

	.constant('HTTPStatus', {
		UNSPECIFIED: -1,
		OFFLINE: 0
	})

	.provider('Restate', function (HTTPStatus) {
		var http, query, logger, interval, rootScope;

		var base = '';
		var defaults = {extend: false};  // TODO: add json diff instead of serializing whole object
		var models = {};

		this.baseUrl = function (url) {
			// Return value of base is no arguments specified
			if (arguments.length === 0) {
				return base;
			}

			if (angular.isNumber(url)) {
				url += ''; // Change whatever it is to a string
			}
			if (!angular.isString(url)) {
				throw 'Url is not a Number or a String';
			}
			base = url;
			return instance;
		};

		this.config = function (obj, clear) {
			// Return value of defaults is no arguments specified
			if (arguments.length === 0) {
				return defaults;
			}

			if (!angular.isObject(obj)) {
				throw "Config must be an object with key-value pairs";
			}

			if (angular.isDefined(obj.extend) && typeof obj.extend !== 'boolean') {
				throw "Extend property in config must be a Boolean";
			}

			if (clear) {
				defaults = angular.copy(obj);
			} else {
				angular.extend(defaults, obj);
			}

			return instance;
		};

		this.create = function (label, url, obj, schema) {
			if (!angular.isString(label)) {
				throw 'Label must be a specified string';
			}
			if (angular.isDefined(obj) && !angular.isObject(obj)) {
				throw 'Object to be wrapped needs to be an Array or an Object';
			}
			if(angular.isDefined(url) && !(angular.isString(url) || angular.isNumber(url))) {
				throw 'URL needs to be a Number or a String';
			}
			var model = models[label] || {};
			url = url || model.$$url || ''; // Can be blank to specify base url
			obj = obj || model.$$obj || null;

			var empty = false;
			if (obj == null) {
				empty = true;
				obj = {};
			}

			addWrap.apply(obj, [label, url, schema, empty]);

			// Add signature to models
			models[label] = {$$url: url, $$obj: obj};

			return obj;
		};

		this.destroy = function (label) {
			if (!label || !angular.isString(label)) {
				throw 'Label must be a specified string';
			}

			var model = models[label];
			if (model) {
				model.$$destroy();
				return model;
			} else {
				console.warn("Model with label '" + label + "' doesn't exist");
				return null;
			}
		};

		var instance = {
			baseUrl: this.baseUrl,
			config: this.config,
			create: this.create,
			destroy: this.destroy
		};

		this.$get = function ($http, $q, $log, $rootScope) {
			http = $http;
			query = $q;
			logger = $log;
			rootScope = $rootScope;
			return instance;
		};

		function addWrap(label, url, schema) {
			// TODO: split this up in different functions for easier maintenance
			var that = this;

			var reset = function() {
				that.$$originalJson = toJson(that);
				that.$$original = JSON.parse(that.$$originalJson);
				that.$dirty = false;
			};

			this.$$label = label;
			this.$$url = url;
			this.$$errors = [];
			this.$$saving = false;
//			this.$$schema = null;
			this.$dirty = false;

			this.$schema = function (schema) {
				// TODO: validate schema
				this.$$schema = schema;
				runSchema(that, that.$$schema);
				return that;
			};

//			this.$schema(schema);

			this.$$destroy = function () {
				// TODO: add cleanup here in case of watchers
				scope.$destroy();
			};

			var scope = {"$destroy": angular.noop};

			this.$watch = function (callback, watchExp, equalsFn) {
				callback = callback || angular.noop;
				equalsFn = equalsFn || function(value){
					// TODO: Might not be the best way to do comparison, but does a quick and dirty job
					return value === that.$$originalJson;
				};
				watchExp = watchExp || function () {
					return toJson(that);
				};

				// Delete old scope
				scope.$destroy();

				// Create new scope with watcher
				scope = rootScope.$new(true);

				// Watch for changes
				scope.$watch(watchExp,
					function (newVal, oldVal) {
						if(!equalsFn(newVal, oldVal)) {
							that.$dirty = true;
						}
						callback(newVal, oldVal);
					},
					true);
			};

			this.$watch();

			this.$revert = function () {
				var key;
				// Remove all keys that doesn't start with $
				for (key in this) {
					if (key.charAt(0) != '$') {
						delete this[key];
					}
				}

				// Copy keys over from original object
				for (key in this.$$original) {
					if (key.charAt(0) != '$') {
						this[key] = this.$$original[key];
					}
				}
				that.$dirty = false;
				return this;
			};

			// Create http actions
			angular.forEach(['get', 'delete', 'post', 'put', 'head', 'jsonp', 'patch'], function (method) {
				// Preface with '$' to ignore serialization
				that['$' + method] = function (params, data, config) {
					return http(angular.extend(defaults, config, {method: method, url: buildUrl(that), params: params, data: toJson(data)})).then(
						function (response) {
							if (response.data) {
								if (response.config.extend && that.$$original != null) {
									if (angular.isArray(response.data) && angular.isArray(that)) {
										that.push.apply(that, response.data);
									} else {
										angular.extend(that, response.data);
									}
									runSchema(that, that.$$schema);
									return that;
								} else {
									return instance.create(that.$$label, that.$$url, response.data, that.$$schema);
								}
							}
						},
						handleError).finally(reset);
				};
			});

			this.$schema(schema);

			reset();
		}

		var runSchema = function (obj, schema) {
			/*if (!angular.isObject(schema)) {
				throw 'Schema is faulty, needs to be a function'
			}*/
			// TODO: create new instances from children in schema
			if (obj && schema) {

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
			var url = [], model, label, path = obj.$$label.split('.');
			for (var i = path.length; i > 0; i--) {
				label = path.join('.');
				if (model = models[label]) {
					url.unshift(model.$$url);
				}
				path.pop();
			}

			url.unshift(base);

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