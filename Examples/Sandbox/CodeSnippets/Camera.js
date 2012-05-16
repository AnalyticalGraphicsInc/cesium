(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.CameraFlyToLosAngeles = function (scene, ellipsoid, primitives) {
        var flight = null;

        this.code = function() {
            flight = scene.getCamera().getControllers().addFlight({
                destination : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic3(-118.26, 34.19, 100000.0)),
                duration : 4.0
            });
        };

        this.camera = {};

        this.clear = function() {
            scene.getCamera().getControllers().remove(flight);

            // set a new camera position, in case this example is clicked consecutively.
            scene.getCamera().lookAt({
                eye : new Cesium.Cartesian3(2203128.2853925996, -7504680.128731707, 5615591.201449535),
                target: Cesium.Cartesian3.ZERO,
                up : new Cesium.Cartesian3(-0.1642824655609347, 0.5596076102188919, 0.8123118822806428)
            });
        };
    };

    Sandbox.CameraReferenceFrame = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var center = ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883));
            var transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);

            var spindle = scene.getCamera().getControllers().get(0);
            spindle.mouseConstrainedZAxis = true;
            spindle.setReferenceFrame(transform, Cesium.Ellipsoid.UNIT_SPHERE);

            // draw x axis in red
            var xAxis = new Cesium.Polyline(undefined);
            xAxis.modelMatrix = transform;
            xAxis.color = {red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 };
            xAxis.setPositions([
                Cesium.Cartesian3.ZERO,
                Cesium.Cartesian3.UNIT_X.multiplyWithScalar(100000.0)
            ]);
            primitives.add(xAxis);

            // draw y axis in green
            var yAxis = new Cesium.Polyline(undefined);
            yAxis.modelMatrix = transform;
            yAxis.color = {red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 };
            yAxis.setPositions([
                Cesium.Cartesian3.ZERO,
                Cesium.Cartesian3.UNIT_Y.multiplyWithScalar(100000.0)
            ]);
            primitives.add(yAxis);

            // draw z axis in blue
            var zAxis = new Cesium.Polyline(undefined);
            zAxis.modelMatrix = transform;
            zAxis.color = {red : 0.0, green : 0.0, blue : 1.0, alpha : 1.0 };
            zAxis.setPositions([
                Cesium.Cartesian3.ZERO,
                Cesium.Cartesian3.UNIT_Z.multiplyWithScalar(100000.0)
            ]);
            primitives.add(zAxis);
        };

        this.camera = {
            eye: new Cesium.Cartesian3(1.0, 1.0, 1.0).normalize().multiplyWithScalar(200000.0),
            target: Cesium.Cartesian3.ZERO,
            up: Cesium.Cartesian3.UNIT_Z
        };

        this.clear = function() {
            var spindle = scene.getCamera().getControllers().get(0);
            spindle.setReferenceFrame(Cesium.Matrix4.IDENTITY);
            spindle.mouseConstrainedZAxis = false;
        };
    };

    Sandbox.ViewExtent = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var west = Cesium.Math.toRadians(-77.0),
                south = Cesium.Math.toRadians(38.0),
                east = Cesium.Math.toRadians(-72.0),
                north = Cesium.Math.toRadians(42.0);

            scene.getCamera().viewExtent(ellipsoid, west, south, east, north);

            var polyline = new Cesium.Polyline(undefined);
            polyline.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-78, 38),
                new Cesium.Cartographic2(-78, 42),
                new Cesium.Cartographic2(-72, 42),
                new Cesium.Cartographic2(-72, 38),
                new Cesium.Cartographic2(-78, 38)
            ]));
            primitives.add(polyline);
        };

        this.clear = function() {
            scene.getCamera().lookAt({
                eye : new Cesium.Cartesian3(2203128.2853925996, -7504680.128731707, 5615591.201449535),
                target: Cesium.Cartesian3.ZERO,
                up : new Cesium.Cartesian3(-0.1642824655609347, 0.5596076102188919, 0.8123118822806428)
            });
        };
    };
}());
