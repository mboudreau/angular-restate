angular.module('codinghitchhiker.Restate', [])

	.provider('Restate', function () {

		var baseUrl = '';
		this.setBaseUrl = function (url) {
			baseUrl = url;
		};

		this.$get = function () {
			return {

			};
		};
	});