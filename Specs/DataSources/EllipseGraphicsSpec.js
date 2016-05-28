/*global defineSuite*/
defineSuite([
        'DataSources/EllipseGraphics',
        'Core/Color',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        EllipseGraphics,
        Color,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            material : Color.BLUE,
            show : true,
            semiMinorAxis : 1,
            semiMajorAxis : 2,
            height : 3,
            extrudedHeight : 4,
            granularity : 5,
            rotation : 6,
            stRotation : 7,
            numberOfVerticalLines : 8,
            fill : false,
            outline : false,
            outlineColor : Color.RED,
            outlineWidth : 9,
            castShadows : false,
            receiveShadows : false
        };

        var ellipse = new EllipseGraphics(options);
        expect(ellipse.material).toBeInstanceOf(ColorMaterialProperty);
        expect(ellipse.show).toBeInstanceOf(ConstantProperty);
        expect(ellipse.semiMinorAxis).toBeInstanceOf(ConstantProperty);
        expect(ellipse.semiMajorAxis).toBeInstanceOf(ConstantProperty);
        expect(ellipse.height).toBeInstanceOf(ConstantProperty);
        expect(ellipse.extrudedHeight).toBeInstanceOf(ConstantProperty);
        expect(ellipse.granularity).toBeInstanceOf(ConstantProperty);
        expect(ellipse.rotation).toBeInstanceOf(ConstantProperty);
        expect(ellipse.stRotation).toBeInstanceOf(ConstantProperty);
        expect(ellipse.numberOfVerticalLines).toBeInstanceOf(ConstantProperty);
        expect(ellipse.fill).toBeInstanceOf(ConstantProperty);
        expect(ellipse.outline).toBeInstanceOf(ConstantProperty);
        expect(ellipse.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(ellipse.outlineWidth).toBeInstanceOf(ConstantProperty);
        expect(ellipse.castShadows).toBeInstanceOf(ConstantProperty);
        expect(ellipse.receiveShadows).toBeInstanceOf(ConstantProperty);

        expect(ellipse.material.color.getValue()).toEqual(options.material);
        expect(ellipse.show.getValue()).toEqual(options.show);
        expect(ellipse.semiMinorAxis.getValue()).toEqual(options.semiMinorAxis);
        expect(ellipse.semiMajorAxis.getValue()).toEqual(options.semiMajorAxis);
        expect(ellipse.height.getValue()).toEqual(options.height);
        expect(ellipse.extrudedHeight.getValue()).toEqual(options.extrudedHeight);
        expect(ellipse.granularity.getValue()).toEqual(options.granularity);
        expect(ellipse.rotation.getValue()).toEqual(options.rotation);
        expect(ellipse.stRotation.getValue()).toEqual(options.stRotation);
        expect(ellipse.numberOfVerticalLines.getValue()).toEqual(options.numberOfVerticalLines);
        expect(ellipse.fill.getValue()).toEqual(options.fill);
        expect(ellipse.outline.getValue()).toEqual(options.outline);
        expect(ellipse.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(ellipse.outlineWidth.getValue()).toEqual(options.outlineWidth);
        expect(ellipse.castShadows.getValue()).toEqual(options.castShadows);
        expect(ellipse.receiveShadows.getValue()).toEqual(options.receiveShadows);
    });

    it('merge assigns unassigned properties', function() {
        var source = new EllipseGraphics();
        source.material = new ColorMaterialProperty();
        source.semiMinorAxis = new ConstantProperty();
        source.semiMajorAxis = new ConstantProperty();
        source.show = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.rotation = new ConstantProperty();
        source.stRotation = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.numberOfVerticalLines = new ConstantProperty();
        source.castShadows = new ConstantProperty(true);
        source.receiveShadows = new ConstantProperty(true);

        var target = new EllipseGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.semiMinorAxis).toBe(source.semiMinorAxis);
        expect(target.semiMajorAxis).toBe(source.semiMajorAxis);
        expect(target.show).toBe(source.show);
        expect(target.height).toBe(source.height);
        expect(target.extrudedHeight).toBe(source.extrudedHeight);
        expect(target.granularity).toBe(source.granularity);
        expect(target.rotation).toBe(source.rotation);
        expect(target.stRotation).toBe(source.stRotation);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.numberOfVerticalLines).toBe(source.numberOfVerticalLines);
        expect(target.castShadows).toBe(source.castShadows);
        expect(target.receiveShadows).toBe(source.receiveShadows);
    });

    it('merge does not assign assigned properties', function() {
        var source = new EllipseGraphics();

        var material = new ColorMaterialProperty();
        var semiMajorAxis = new ConstantProperty();
        var semiMinorAxis = new ConstantProperty();
        var show = new ConstantProperty();
        var height = new ConstantProperty();
        var extrudedHeight = new ConstantProperty();
        var granularity = new ConstantProperty();
        var rotation = new ConstantProperty();
        var stRotation = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var outlineWidth = new ConstantProperty();
        var numberOfVerticalLines = new ConstantProperty();
        var castShadows = new ConstantProperty();
        var receiveShadows = new ConstantProperty();

        var target = new EllipseGraphics();
        target.material = material;
        target.semiMinorAxis = semiMinorAxis;
        target.semiMajorAxis = semiMajorAxis;
        target.show = show;
        target.height = height;
        target.extrudedHeight = extrudedHeight;
        target.granularity = granularity;
        target.rotation = rotation;
        target.stRotation = stRotation;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.numberOfVerticalLines = numberOfVerticalLines;
        target.castShadows = castShadows;
        target.receiveShadows = receiveShadows;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.semiMinorAxis).toBe(semiMinorAxis);
        expect(target.semiMajorAxis).toBe(semiMajorAxis);
        expect(target.show).toBe(show);
        expect(target.height).toBe(height);
        expect(target.extrudedHeight).toBe(extrudedHeight);
        expect(target.granularity).toBe(granularity);
        expect(target.rotation).toBe(rotation);
        expect(target.stRotation).toBe(stRotation);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.numberOfVerticalLines).toBe(numberOfVerticalLines);
        expect(target.castShadows).toBe(castShadows);
        expect(target.receiveShadows).toBe(receiveShadows);
    });

    it('clone works', function() {
        var source = new EllipseGraphics();
        source.material = new ColorMaterialProperty();
        source.semiMinorAxis = new ConstantProperty();
        source.semiMajorAxis = new ConstantProperty();
        source.show = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.rotation = new ConstantProperty();
        source.stRotation = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.numberOfVerticalLines = new ConstantProperty();
        source.castShadows = new ConstantProperty();
        source.receiveShadows = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.semiMinorAxis).toBe(source.semiMinorAxis);
        expect(result.semiMajorAxis).toBe(source.semiMajorAxis);
        expect(result.show).toBe(source.show);
        expect(result.height).toBe(source.height);
        expect(result.extrudedHeight).toBe(source.extrudedHeight);
        expect(result.granularity).toBe(source.granularity);
        expect(result.rotation).toBe(source.rotation);
        expect(result.stRotation).toBe(source.stRotation);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.numberOfVerticalLines).toBe(source.numberOfVerticalLines);
        expect(result.castShadows).toBe(source.castShadows);
        expect(result.receiveShadows).toBe(source.receiveShadows);
    });

    it('merge throws if source undefined', function() {
        var target = new EllipseGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new EllipseGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'semiMinorAxis', 2, 3);
        testDefinitionChanged(property, 'semiMajorAxis', 3, 4);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'height', 3, 4);
        testDefinitionChanged(property, 'extrudedHeight', 4, 3);
        testDefinitionChanged(property, 'granularity', 1, 2);
        testDefinitionChanged(property, 'rotation', 5, 6);
        testDefinitionChanged(property, 'stRotation', 5, 6);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'outlineWidth', 2, 3);
        testDefinitionChanged(property, 'numberOfVerticalLines', 16, 32);
        testDefinitionChanged(property, 'castShadows', true, false);
        testDefinitionChanged(property, 'receiveShadows', true, false);
    });
});
