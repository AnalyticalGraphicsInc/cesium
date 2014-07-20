/*global defineSuite*/
defineSuite([
        'DataSources/PyramidVisualizer',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Quaternion',
        'Core/Spherical',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/EntityCollection',
        'DataSources/PyramidGraphics',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        PyramidVisualizer,
        Cartesian3,
        Color,
        JulianDate,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        Spherical,
        ColorMaterialProperty,
        ConstantProperty,
        EntityCollection,
        PyramidGraphics,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var visualizer;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    afterEach(function() {
        visualizer = visualizer && visualizer.destroy();
    });

    it('constructor throws if no scene is passed.', function() {
        expect(function() {
            return new PyramidVisualizer();
        }).toThrowDeveloperError();
    });

    it('update throws if no time specified.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no pyramid does not create a primitive.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no position does not create a primitive.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new PyramidGraphics();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no orientation does not create a primitive.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var pyramid = testObject.pyramid = new PyramidGraphics();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('A PyramidGraphics causes a CustomSensor to be created and updated.', function() {
        var time = JulianDate.now();
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR)));

        var pyramid = testObject.pyramid = new PyramidGraphics();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        pyramid.intersectionColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        pyramid.intersectionWidth = new ConstantProperty(0.5);
        pyramid.showIntersection = new ConstantProperty(true);
        pyramid.radius = new ConstantProperty(123.5);
        pyramid.show = new ConstantProperty(true);
        pyramid.lateralSurfaceMaterial = ColorMaterialProperty.fromColor(Color.WHITE);
        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);
        var p = scene.primitives.get(0);
        expect(p.intersectionColor).toEqual(testObject.pyramid.intersectionColor.getValue(time));
        expect(p.intersectionWidth).toEqual(testObject.pyramid.intersectionWidth.getValue(time));
        expect(p.showIntersection).toEqual(testObject.pyramid.showIntersection.getValue(time));
        expect(p.radius).toEqual(testObject.pyramid.radius.getValue(time));
        expect(p.modelMatrix).toEqual(Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(testObject.orientation.getValue(time)), testObject.position.getValue(time)));
        expect(p.show).toEqual(testObject.pyramid.show.getValue(time));
        expect(p.lateralSurfaceMaterial.uniforms).toEqual(testObject.pyramid.lateralSurfaceMaterial.getValue(time));

        pyramid.show.value = false;
        visualizer.update(time);
        expect(p.show).toEqual(testObject.pyramid.show.getValue(time));
    });

    it('clear removes pyramids.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new PyramidGraphics();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);

        var time = JulianDate.now();
        expect(scene.primitives.length).toEqual(0);
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(1);
        expect(scene.primitives.get(0).show).toEqual(true);
        entityCollection.removeAll();
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(0);
    });

    it('Visualizer sets entity property.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PyramidVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new PyramidGraphics();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);

        var time = JulianDate.now();
        visualizer.update(time);
        expect(scene.primitives.get(0).id).toEqual(testObject);
    });
}, 'WebGL');
