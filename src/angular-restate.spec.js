describe('Restate', function () {
    var base, config, url, label, schema;

    beforeEach(function () {
        module('codinghitchhiker.restate');
        base = 'http://localhost'; // Set initial base url
        config = { extend: false };
        url = 'test';
        label = 'mahLabel';
        schema = {};
    });

    describe('Base Url', function () {

        it('Should be able to set the base url', inject(function (Restate) {
            expect(Restate.baseUrl(base)).toBeTruthy();
        }));

        it('Should be able to set the base and retrieve same value', inject(function (Restate) {
            Restate.baseUrl(base);
            expect(Restate.baseUrl()).toBe(base);
        }));

        it('Should be able to set the base as a number', inject(function (Restate) {
            base = 65487541;
            Restate.baseUrl(base);
            expect(Restate.baseUrl()).toBe(base + '');
        }));

        it('Should throw error on invalid base object', inject(function (Restate) {
            Restate.baseUrl(base);
            expect(function () {
                Restate.baseUrl({});
            }).toThrow();
            expect(function () {
                Restate.baseUrl([]);
            }).toThrow();
            expect(Restate.baseUrl()).toBe(base);
        }));

        it('Should be able to chain Restate calls', inject(function (Restate) {
            expect(Restate.baseUrl(base)).toBe(Restate);
            expect(Restate.baseUrl(base).baseUrl).toEqual(jasmine.any(Function));
        }));
    });

    describe('Config', function () {
        it('Should be able to set config', inject(function (Restate) {
            expect(Restate.config(config)).toBeTruthy();
        }));

        it('Should be able to set the config and retrieve same object', inject(function (Restate) {
            Restate.config(config);
            expect(Restate.config()).toEqual(config);
        }));

        it('Should be able to set any number of config keys', inject(function (Restate) {
            config = {
                something: 123098,
                another_key: 'blarg'
            };
            expect(function () {
                Restate.config(config);
            }).not.toThrow();
        }));

        it('Should be able to extend default without overwriting existing keys', inject(function (Restate) {
            var defaultConfig = Restate.config();
            Restate.config({test: 'Blah'});
            expect(Restate.config()).toEqual(jasmine.objectContaining(defaultConfig));
        }));

        it('Should throw an error when extend isn\'t a boolean', inject(function (Restate) {
            config = {extend: 2314};
            expect(function () {
                Restate.config(config);
            }).toThrow();
            config = {extend: 'asdf'};
            expect(function () {
                Restate.config(config);
            }).toThrow();
            config = {extend: {}};
            expect(function () {
                Restate.config(config);
            }).toThrow();
        }));

        it('Should be able to clear default using secondary argument', inject(function (Restate) {
            config = {akaka: 'ff', ddd: 123};
            Restate.config(config, true);

            expect(Restate.config()).toEqual(config);
            expect(Restate.config()).not.toBe(config);
        }));

        it('Should be able to chain Restate calls', inject(function (Restate) {
            expect(Restate.config(config)).toBe(Restate);
            expect(Restate.config(config).config).toEqual(jasmine.any(Function));
        }));
    });

    describe('Create', function () {
        it('Should be able to create stateful object', inject(function (Restate) {
            expect(Restate.create(label, url, schema)).toBeTruthy();
        }));

        it('Should be able to create stateful object with schema optional', inject(function (Restate) {
            expect(Restate.create(label, url)).toBeTruthy();
        }));

        it('Should throw error on missing label or url arguments', inject(function (Restate) {
            expect(function () {
                Restate.create(label);
            }).toThrow();

            expect(function () {
                Restate.create(undefined, url);
            }).toThrow();
        }));

        it('Should throw error on label collision', inject(function (Restate) {
            Restate.create(label, url);
            expect(function () {
                Restate.create(label, url);
            }).toThrow();

        }));

        it('Should store arguments within object', inject(function (Restate) {
            var object = Restate.create(label, url, schema).get(label);
            expect(object.$$url).toBe(url);
            expect(object.$$label).toBe(label);
            expect(object.$$schema).toEqual(schema);
        }));

        it('Should be able to set absolute or relative url', inject(function (Restate) {
            var object = Restate.create(label, url).get(label);
            expect(object.$$url).toBe(url);

            url = 'https://www.google.com';
            object = Restate.create(label, url).get(label);
            expect(object.$$url).toBe(url);

            // TODO: Add listeners to http backend, make sure url is correct.
        }));

        it('Should be able to set parent child relationship through label', inject(function (Restate) {
            var childlabel = label + '.child';
            var childurl = 'childurl';
            Restate
                .create(label, url, schema)
                .create(childlabel, childurl, schema);

            expect(Restate.get(childlabel)).toBeTruthy();
            // TODO: Add listeners to http backend, make sure url is correct.
        }));

        it('Should be able to build urls', inject(function (Restate) {
            var childlabel = label + '.child';
            var childurl = 'childurl';
            Restate
                .create(label, url, schema)
                .create(childlabel, childurl, schema);

            expect(Restate.get(childlabel)).toBeTruthy();

            // TODO: Add listeners to http backend, make sure url is correct.
        }));

        it('Should throw error when label isn\'t string', inject(function (Restate) {
            expect(function () {
                Restate.create(123, url);
            }).toThrow();

            expect(function () {
                Restate.create({}, url);
            }).toThrow();

            expect(function () {
                Restate.create(true, url);
            }).toThrow();
        }));

        it('Should throw error when url isn\'t string or number', inject(function (Restate) {
            expect(function () {
                Restate.create(label, []);
            }).toThrow();

            expect(function () {
                Restate.create(label, {});
            }).toThrow();

            expect(function () {
                Restate.create(label, true);
            }).toThrow();
        }));

        it('Should throw error when schema isn\'t array or object', inject(function (Restate) {
            expect(function () {
                Restate.create(label, url, 123);
            }).toThrow();

            expect(function () {
                Restate.create(label, url, 'weee');
            }).toThrow();

            expect(function () {
                Restate.create(label, url, true);
            }).toThrow();

            expect(function () {
                Restate.create(label, url, schema);
            }).not.toThrow();
        }));

        it('Should be able to chain Restate calls', inject(function (Restate) {
            var result = Restate.create(label, url, schema);
            expect(result).toBe(Restate);
            expect(result.create).toEqual(jasmine.any(Function));
        }));
    });

    describe('Get', function () {
        it('Should be able to set config', inject(function (Restate) {
            expect(Restate.config(config)).toBeTruthy();
        }));

        it('Should throw error when parent state missing', inject(function (Restate) {
            var childlabel = label + '.child';
            var childurl = 'childurl';

            expect(function () {
                Restate.create(childlabel, childurl, schema);
            }).toThrow();
        }));

    });
});