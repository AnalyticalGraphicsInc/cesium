/*global defineSuite*/
defineSuite([
         'Scene/Polygon',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Matrix4',
         'Core/Math',
         'Renderer/BufferUsage'
     ], function(
         Polygon,
         createContext,
         destroyContext,
         sceneState,
         pick,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Extent,
         Matrix4,
         CesiumMath,
         BufferUsage) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var polygon;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        polygon = new Polygon();

        var camera = {
            eye : new Cartesian3(1.02, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };

        us = context.getUniformState();
        us.setView(Matrix4.fromCamera(camera));
        us.setProjection(Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        polygon = polygon && polygon.destroy();
        us = undefined;
    });

    function createPolygon() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        var p = new Polygon();
        p.ellipsoid = ellipsoid;
        p.granularity = CesiumMath.toRadians(20.0);
        p.setPositions([
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, -50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, 50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0))
        ]);

        return p;
    }

    it('gets default show', function() {
        expect(polygon.show).toEqual(true);
    });

    it('sets positions', function() {
        var positions = [
                         new Cartesian3(1.0, 2.0, 3.0),
                         new Cartesian3(4.0, 5.0, 6.0),
                         new Cartesian3(7.0, 8.0, 9.0)
                        ];

        expect(polygon.getPositions()).not.toBeDefined();

        polygon.setPositions(positions);
        expect(polygon.getPositions()).toEqual(positions);
    });

    it('setPositions throws with less than three positions', function() {
        expect(function() {
            polygon.setPositions([new Cartesian3()]);
        }).toThrow();
    });

    it('configure polygon from hierarchy', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    new Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 35.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                    new Cartographic.fromDegrees(-124.0, 40.0, 0.0)
                ]),
                holes : [{
                        positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                            new Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                            new Cartographic.fromDegrees(-122.0, 39.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 36.0, 0.0)
                        ]),
                        holes : [{
                                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                    new Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                                    new Cartographic.fromDegrees(-114.0, 36.5, 0.0),
                                    new Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                                    new Cartographic.fromDegrees(-120.0, 38.5, 0.0)
                                ])
                        }]
                }]
        };

        polygon.configureFromPolygonHierarchy(hierarchy);
        expect(polygon._polygonHierarchy).toBeDefined();
        expect(function() {
            polygon._vertices.update(context, polygon._createMeshes(), polygon.bufferUsage);
        }).not.toThrow();
    });

    it('configure polygon from clockwise hierarchy', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    new Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                    new Cartographic.fromDegrees(-124.0, 40.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 35.0, 0.0)
                ]),
                holes : [{
                        positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                            new Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 36.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                            new Cartographic.fromDegrees(-122.0, 39.0, 0.0)
                        ]),
                        holes : [{
                                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                    new Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                                    new Cartographic.fromDegrees(-120.0, 38.5, 0.0),
                                    new Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                                    new Cartographic.fromDegrees(-114.0, 36.5, 0.0)
                                ])
                        }]
                }]
        };

        polygon.configureFromPolygonHierarchy(hierarchy);
        expect(polygon._polygonHierarchy).toBeDefined();
        expect(function() {
            polygon._vertices.update(context, polygon._createMeshes(), polygon.bufferUsage);
        }).not.toThrow();
    });

    it('configureFromPolygonHierarchy throws with less than three positions', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    new Cartographic()
                ])
        };
        expect(function() {
            polygon.configureFromPolygonHierarchy(hierarchy);
        }).toThrow();
    });

    it('configures extent', function() {
        var extent = new Extent(
            0.0,
            0.0,
            CesiumMath.toRadians(10.0),
            CesiumMath.toRadians(10.0)
        );

        polygon.configureExtent(extent);
        expect(polygon.getPositions()).not.toBeDefined();

    });

    it('gets the default color', function() {
        expect(polygon.material.uniforms.color).toEqual({
            red : 1.0,
            green : 1.0,
            blue : 0.0,
            alpha : 0.5
        });
    });

    it('gets default buffer usage', function() {
        expect(polygon.bufferUsage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('has a default ellipsoid', function() {
        expect(polygon.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('gets the default granularity', function() {
        expect(polygon.granularity).toEqual(CesiumMath.toRadians(1.0));
    });

    it('renders', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders without a material', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.material = undefined;

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders without lighting', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.affectedByLighting = false;

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders extent', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.configureExtent(new Extent(
            0.0,
            0.0,
            CesiumMath.toRadians(10.0),
            CesiumMath.toRadians(10.0)
        ));
        polygon.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not renders', function() {
        polygon = createPolygon();
        polygon.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };
        polygon.show = false;

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('is picked', function() {
        polygon = createPolygon();

        polygon.update(context, sceneState);

        var pickedObject = pick(context, polygon, 0, 0);
        expect(pickedObject).toEqual(polygon);
    });

    it('is not picked', function() {
        polygon = createPolygon();
        polygon.show = false;

        polygon.update(context, sceneState);

        var pickedObject = pick(context, polygon, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('isDestroyed', function() {
        var p = new Polygon();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });
});