describe('Restate', function () {
	var base;
	beforeEach(function () {
		module('codinghitchhiker.Restate');
		base = 'http://localhost'; // Set initial base url
	});

	it('Dummy test', inject(function (Restate) {
		expect(Restate).toBeTruthy();
	}));

});