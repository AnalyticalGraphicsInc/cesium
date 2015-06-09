/*global defineSuite*/
defineSuite([
    'Scene/UrlTemplateImageryProvider',
    'Core/DefaultProxy',
    'Core/GeographicTilingScheme',
    'Core/loadImage',
    'Core/Math',
    'Core/Rectangle',
    'Core/WebMercatorTilingScheme',
    'Scene/Imagery',
    'Scene/ImageryLayer',
    'Scene/ImageryProvider',
    'Scene/ImageryState',
    'Specs/pollToPromise',
    'ThirdParty/when'
], function(
    UrlTemplateImageryProvider,
    DefaultProxy,
    GeographicTilingScheme,
    loadImage,
    CesiumMath,
    Rectangle,
    WebMercatorTilingScheme,
    Imagery,
    ImageryLayer,
    ImageryProvider,
    ImageryState,
    pollToPromise,
    when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(UrlTemplateImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('requires the url to be specified', function() {
        function createWithoutUrl() {
            return new UrlTemplateImageryProvider({});
        }
        expect(createWithoutUrl).toThrowDeveloperError();
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server/'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('requestImage returns a promise for an image and loads it for cross-origin use', function() {
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server/{Z}/{X}/{reverseY}'
        });

        expect(provider.url).toEqual('made/up/tms/server/{Z}/{X}/{reverseY}');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(18);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('when no credit is supplied, the provider has no logo', function() {
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server'
        });
        expect(provider.credit).toBeUndefined();
    });

    it('turns the supplied credit into a logo', function() {
        var providerWithCredit = new UrlTemplateImageryProvider({
            url: 'made/up/gms/server',
            credit: 'Thanks to our awesome made up source of this imagery!'
        });
        expect(providerWithCredit.credit).toBeDefined();
    });

    it('routes tile requests through a proxy if one is specified', function() {
        var proxy = new DefaultProxy('/proxy/');
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server/{Z}/{X}/{reverseY}',
            proxy: proxy
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.proxy).toEqual(proxy);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url.indexOf(proxy.getURL('made/up/tms/server'))).toEqual(0);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('rectangle passed to constructor does not affect tile numbering', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server/{Z}/{X}/{reverseY}',
            rectangle: rectangle
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(18);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(rectangle);
            expect(provider.tileDiscardPolicy).toBeUndefined();

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toContain('/0/0/0');

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('uses maximumLevel passed to constructor', function() {
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server',
            maximumLevel: 5
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.maximumLevel).toEqual(5);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server'
        });

        var layer = new ImageryLayer(provider);

        var tries = 0;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.timesRetried).toEqual(tries);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
        });

        loadImage.createImage = function(url, crossOrigin, deferred) {
            if (tries === 2) {
                // Succeed after 2 tries
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            } else {
                // fail
                setTimeout(function() {
                    deferred.reject();
                }, 1);
            }
        };

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            var imagery = new Imagery(layer, 0, 0, 0);
            imagery.addReference();
            layer._requestImagery(imagery);

            return pollToPromise(function() {
                return imagery.state === ImageryState.RECEIVED;
            }).then(function() {
                expect(imagery.image).toBeInstanceOf(Image);
                expect(tries).toEqual(2);
                imagery.releaseReference();
            });
        });
    });

    it('evaluation of pattern X Y reverseX reverseY Z', function() {
        var provider = new UrlTemplateImageryProvider({
            url: 'made/up/tms/server/{Z}/{reverseY}/{Y}/{reverseX}/{X}.PNG',
            tilingScheme: new GeographicTilingScheme()
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toEqual('made/up/tms/server/2/2/1/4/3.PNG');

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(3, 1, 2).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('evaluation of pattern north', function() {
        var provider = new UrlTemplateImageryProvider({
            url: '{north}',
            tilingScheme: new GeographicTilingScheme()
        });

        pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toEqualEpsilon(45.088235294117645, CesiumMath.EPSILON11);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(3, 1, 2).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('evaluation of pattern south', function() {
        var provider = new UrlTemplateImageryProvider({
            url: '{south}',
            tilingScheme: new GeographicTilingScheme()
        });

        pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toEqualEpsilon(-0.08823529411764706, CesiumMath.EPSILON11);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(3, 1, 2).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('evaluation of pattern east', function() {
        var provider = new UrlTemplateImageryProvider({
            url: '{east}',
            tilingScheme: new GeographicTilingScheme()
        });

        pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toEqualEpsilon(0.08823529411764706, CesiumMath.EPSILON11);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(3, 1, 2).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('evaluation of pattern west', function() {
        var provider = new UrlTemplateImageryProvider({
            url: '{west}',
            tilingScheme: new GeographicTilingScheme()
        });

        pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toEqualEpsilon(-45.088235294117645, CesiumMath.EPSILON11);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(3, 1, 2).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });
});