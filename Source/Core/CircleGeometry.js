/*global define*/
define([
        './clone',
        './defaultValue',
        './DeveloperError',
        './EllipseGeometry'
    ], function(
        clone,
        defaultValue,
        DeveloperError,
        EllipseGeometry) {
    "use strict";

    /**
     * Computes vertices and indices for a circle on the ellipsoid.
     *
     * @alias EllipseGeometry
     * @constructor
     *
     * @param {Cartesian3} options.center The circle's center point in the fixed frame.
     * @param {Number} options.radius The radius in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the circle will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the circle in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Matrix4} [options.modelMatrix] The model matrix for this ellipsoid.
     * @param {Color} [options.color] The color of the geometry when a per-geometry color appearance is used.
     * @param {DOC_TBA} [options.pickData] DOC_TBA
     *
     * @exception {DeveloperError} center is required.
     * @exception {DeveloperError} radius is required.
     * @exception {DeveloperError} radius must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @example
     * // Create a circle.
     * var ellipsoid = Ellipsoid.WGS84;
     * var circle = new CircleGeometry({
     *     ellipsoid : ellipsoid,
     *     center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883)),
     *     radius : 100000.0
     * });
     */
    var CircleGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var radius = options.radius;

        if (typeof radius === 'undefined') {
            throw new DeveloperError('radius is required.');
        }

        if (radius <= 0.0) {
            throw new DeveloperError('radius must be greater than zero.');
        }

        var ellipseGeometryOptions = clone(options);
        ellipseGeometryOptions.semiMajorAxis = radius;
        ellipseGeometryOptions.semiMinorAxis = radius;
        var ellipseGeometry = new EllipseGeometry(ellipseGeometryOptions);

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = ellipseGeometry.attributes;

        /**
         * An array of {@link GeometryIndices} defining primitives.
         *
         * @type Array
         */
        this.indexLists = ellipseGeometry.indexLists;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = ellipseGeometry.boundingSphere;

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         */
        this.modelMatrix = ellipseGeometry.modelMatrix;

        /**
         * The color of the geometry when a per-geometry color appearance is used.
         *
         * @type Color
         */
         this.color = options.color;

        /**
         * DOC_TBA
         */
        this.pickData = ellipseGeometry.pickData;
    };

    return CircleGeometry;
});