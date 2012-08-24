/*global defineSuite*/
defineSuite([
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/Extent',
         'Core/Intersect',
         'Core/Math'
     ], function(
         BoundingSphere,
         Cartesian3,
         Cartesian4,
         Ellipsoid,
         EquidistantCylindricalProjection,
         Extent,
         Intersect,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function getPositions() {
        return [
                new Cartesian3(0, 0, 0),
                new Cartesian3(1, 0, 0),
                new Cartesian3(-1, 0, 0),
                new Cartesian3(0, 1, 0),
                new Cartesian3(0, -1, 0),
                new Cartesian3(0, 0, 1),
                new Cartesian3(0, 0, -1)
            ];
    }

    it('can be constructed using a point and a radius', function() {
        var sphere = new BoundingSphere(new Cartesian3(0, 0, 0), 1);
        expect(sphere.center.equals(Cartesian3.ZERO)).toEqual(true);
        expect(sphere.radius).toEqual(1);
    });

    it('clone without a result parameter', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 2.0);
        var result = sphere.clone();
        expect(sphere).toNotBe(result);
        expect(sphere).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 2.0);
        var result = new BoundingSphere(Cartesian3.ZERO, 5.0);
        var returnedResult = sphere.clone(result);
        expect(sphere).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(sphere).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 2.0);
        var returnedResult = sphere.clone(sphere);
        expect(sphere).toBe(returnedResult);
    });

    it('equals', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 2.0);
        expect(sphere.equals(new BoundingSphere(Cartesian3.ZERO, 2.0))).toEqual(true);
        expect(sphere.equals(new BoundingSphere(Cartesian3.UNIT_X, 2.0))).toEqual(false);
        expect(sphere.equals(new BoundingSphere(Cartesian3.ZERO, 3.0))).toEqual(false);
        expect(sphere.equals(undefined)).toEqual(false);
    });

    it('fromPoints without positions returns undefined', function() {
        expect(typeof BoundingSphere.fromPoints() === 'undefined').toEqual(true);
    });

    it('computes with one point', function() {
        var sphere = BoundingSphere.fromPoints([Cartesian3.ZERO]);
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('computes a center from points', function() {
        var sphere = BoundingSphere.fromPoints(getPositions());
        var center = sphere.center;
        expect(center.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)).toEqual(true);
    });

    it('computes a radius from points', function() {
        var sphere = BoundingSphere.fromPoints(getPositions());
        var radius = sphere.radius;
        expect(radius).toEqual(1);
    });

    it('contains all points (naive)', function() {
        var sphere = BoundingSphere.fromPoints(getPositions());
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = r.add(center);
        var min = center.subtract(r);

        var positions = getPositions();
        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i++) {
            var currentPos = positions[i];
            expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
            expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
            expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
        }
    });

    it('contains all points (ritter)', function() {
        var positions = getPositions();
        positions.push(new Cartesian3(1, 1, 1), new Cartesian3(2, 2, 2), new Cartesian3(3, 3, 3));
        var sphere = BoundingSphere.fromPoints(positions);
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = r.add(center);
        var min = center.subtract(r);

        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i++) {
            var currentPos = positions[i];
            expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
            expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
            expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
        }
    });

    it('from extent 2d throws without an extent', function() {
        expect(function() {
            return BoundingSphere.fromExtent2D();
        }).toThrow();
    });

    it('from extent 2d', function() {
        var extent = Extent.MAX_VALUE;
        var projection = new EquidistantCylindricalProjection(Ellipsoid.UNIT_SPHERE);
        var expected = new BoundingSphere(Cartesian3.ZERO, Math.sqrt(extent.east * extent.east + extent.north * extent.north));
        expect(BoundingSphere.fromExtent2D(extent, projection)).toEqual(expected);
    });

    it('from extent 3d throws without an extent', function() {
        expect(function() {
            return BoundingSphere.fromExtent3D();
        }).toThrow();
    });

    it('from extent 3d', function() {
        var extent = Extent.MAX_VALUE;
        var ellipsoid = Ellipsoid.WGS84;
        var expected = new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMaximumRadius());
        expect(BoundingSphere.fromExtent3D(extent, ellipsoid)).toEqual(expected);
    });

    it('static clone throws with no parameter', function() {
        expect(function() {
            BoundingSphere.clone();
        }).toThrow();
    });

    it('intersect throws without a sphere', function() {
        expect(function() {
            BoundingSphere.intersect();
        }).toThrow();
    });

    it('intersect throws without a plane', function() {
        expect(function() {
            BoundingSphere.intersect(new BoundingSphere(Cartesian3.ZERO, 1.0));
        }).toThrow();
    });

    it('sphere on the positive side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.UNIT_X.negate();
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(sphere.intersect(plane)).toEqual(Intersect.INSIDE);
    });

    it('sphere on the negative side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(sphere.intersect(plane)).toEqual(Intersect.OUTSIDE);
    });

    it('sphere intersecting a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.UNIT_X, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(sphere.intersect(plane)).toEqual(Intersect.INTERSECTING);
    });

    it('union throws without a sphere', function() {
        expect(function() {
            var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
            return bs.union();
        }).toThrow();
    });

    it('expands to contain another sphere', function() {
        var bs1 = new BoundingSphere(Cartesian3.UNIT_X.negate(), 1.0);
        var bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
        var expected = new BoundingSphere(Cartesian3.ZERO, 2.0);
        expect(bs1.union(bs2)).toEqual(expected);
    });

    it('expands to contain another point', function() {
        var bs = new BoundingSphere(Cartesian3.UNIT_X.negate(), 1.0);
        var point = Cartesian3.UNIT_X;
        var expected = new BoundingSphere(Cartesian3.UNIT_X.negate(), 2.0);
        expect(bs.expand(point)).toEqual(expected);
    });
});