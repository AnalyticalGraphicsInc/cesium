/*global define*/
define([
        './defaultValue',
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryPipeline',
        './Intersect',
        './Math',
        './Matrix3',
        './PolygonPipeline',
        './Quaternion',
        './Queue',
        './VertexFormat',
        './WindingOrder'
    ], function(
        defaultValue,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        ComponentDatatype,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        GeometryAttribute,
        GeometryInstance,
        GeometryPipeline,
        Intersect,
        CesiumMath,
        Matrix3,
        PolygonPipeline,
        Quaternion,
        Queue,
        VertexFormat,
        WindingOrder) {
    "use strict";

    var computeBoundingRectangleCartesian2 = new Cartesian2();
    var computeBoundingRectangleCartesian3 = new Cartesian3();
    var computeBoundingRectangleQuaternion = new Quaternion();
    var computeBoundingRectangleMatrix3 = new Matrix3();

    function computeBoundingRectangle(tangentPlane, positions, angle, result) {
        var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, angle, computeBoundingRectangleQuaternion);
        var textureMatrix = Matrix3.fromQuaternion(rotation, computeBoundingRectangleMatrix3);

        var minX = Number.POSITIVE_INFINITY;
        var maxX = Number.NEGATIVE_INFINITY;
        var minY = Number.POSITIVE_INFINITY;
        var maxY = Number.NEGATIVE_INFINITY;

        var length = positions.length;
        for ( var i = 0; i < length; ++i) {
            var p = Cartesian3.clone(positions[i], computeBoundingRectangleCartesian3);
            Matrix3.multiplyByVector(textureMatrix, p, p);
            var st = tangentPlane.projectPointOntoPlane(p, computeBoundingRectangleCartesian2);

            if (typeof st !== 'undefined') {
                minX = Math.min(minX, st.x);
                maxX = Math.max(maxX, st.x);

                minY = Math.min(minY, st.y);
                maxY = Math.max(maxY, st.y);
            }
        }

        if (typeof result === 'undefined') {
            result = new BoundingRectangle();
        }

        result.x = minX;
        result.y = minY;
        result.width = maxX - minX;
        result.height = maxY - minY;
        return result;
    }

    var createGeometryFromPositionsPositions = [];

    function createGeometryFromPositions(ellipsoid, positions, boundingSphere, granularity) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);
        if (cleanedPositions.length < 3) {
            // Duplicate positions result in not enough positions to form a polygon.
            return undefined;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }

        var indices = PolygonPipeline.earClip2D(positions2D);

        // Checking bounding sphere with plane for quick reject
        var minX = boundingSphere.center.x - boundingSphere.radius;
        if ((minX < 0) && (BoundingSphere.intersect(boundingSphere, Cartesian4.UNIT_Y) === Intersect.INTERSECTING)) {
            indices = PolygonPipeline.wrapLongitude(cleanedPositions, indices);
        }
        return new GeometryInstance({
            geometry : PolygonPipeline.computeSubdivision(cleanedPositions, indices, granularity)
        });
    }

    var scratchBoundingRectangle = new BoundingRectangle();
    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();

    var appendTextureCoordinatesOrigin = new Cartesian2();
    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();

    /**
     * Computes vertices and indices for a polygon on the ellipsoid. The polygon is either defined
     * by an array of Cartesian points, or a polygon hierarchy.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {Array} [options.positions] An array of positions that defined the corner points of the polygon.
     * @param {Object} [options.polygonHierarchy] A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordiantes, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.toRadians(1.0)] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     *
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} positions or polygonHierarchy must be supplied.
     *
     * @example
     * // create a polygon from points
     * var geometry = new PolygonGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0),
     *         Cartographic.fromDegrees(-75.0, 30.0),
     *         Cartographic.fromDegrees(-70.0, 30.0),
     *         Cartographic.fromDegrees(-68.0, 40.0)
     *     ])
     * });
     *
     * // create a nested polygon with holes
     * var geometryWithHole = new PolygonGeometry({
     *     polygonHierarchy : {
     *         positions : ellipsoid.cartographicArrayToCartesianArray([
     *             Cartographic.fromDegrees(-109.0, 30.0),
     *             Cartographic.fromDegrees(-95.0, 30.0),
     *             Cartographic.fromDegrees(-95.0, 40.0),
     *             Cartographic.fromDegrees(-109.0, 40.0)
     *         ]),
     *         holes : [{
     *             positions : ellipsoid.cartographicArrayToCartesianArray([
     *                 Cartographic.fromDegrees(-107.0, 31.0),
     *                 Cartographic.fromDegrees(-107.0, 39.0),
     *                 Cartographic.fromDegrees(-97.0, 39.0),
     *                 Cartographic.fromDegrees(-97.0, 31.0)
     *             ]),
     *             holes : [{
     *                 positions : ellipsoid.cartographicArrayToCartesianArray([
     *                     Cartographic.fromDegrees(-105.0, 33.0),
     *                     Cartographic.fromDegrees(-99.0, 33.0),
     *                     Cartographic.fromDegrees(-99.0, 37.0),
     *                     Cartographic.fromDegrees(-105.0, 37.0)
     *                     ]),
     *                 holes : [{
     *                     positions : ellipsoid.cartographicArrayToCartesianArray([
     *                         Cartographic.fromDegrees(-103.0, 34.0),
     *                         Cartographic.fromDegrees(-101.0, 34.0),
     *                         Cartographic.fromDegrees(-101.0, 36.0),
     *                         Cartographic.fromDegrees(-103.0, 36.0)
     *                     ])
     *                 }]
     *              }]
     *         }]
     *     }
     * });
     */
    var PolygonGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.toRadians(1.0));
        var stRotation = defaultValue(options.stRotation, 0.0);
        var height = defaultValue(options.height, 0.0);

        var positions = options.positions;
        var polygonHierarchy = options.polygonHierarchy;

        var geometries = [];
        var geometry;
        var boundingSphere;
        var i;

        var outerPositions;

        if (typeof positions !== 'undefined') {
            // create from positions
            outerPositions = positions;

            boundingSphere = BoundingSphere.fromPoints(positions);
            geometry = createGeometryFromPositions(ellipsoid, positions, boundingSphere, granularity);
            if (typeof geometry !== 'undefined') {
                geometries.push(geometry);
            }
        } else if (typeof polygonHierarchy !== 'undefined') {
            // create from a polygon hierarchy
            // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
            var polygons = [];
            var queue = new Queue();
            queue.enqueue(polygonHierarchy);

            while (queue.length !== 0) {
                var outerNode = queue.dequeue();
                var outerRing = outerNode.positions;

                if (outerRing.length < 3) {
                    throw new DeveloperError('At least three positions are required.');
                }

                var numChildren = outerNode.holes ? outerNode.holes.length : 0;
                if (numChildren === 0) {
                    // The outer polygon is a simple polygon with no nested inner polygon.
                    polygons.push(outerNode.positions);
                } else {
                    // The outer polygon contains inner polygons
                    var holes = [];
                    for (i = 0; i < numChildren; i++) {
                        var hole = outerNode.holes[i];
                        holes.push(hole.positions);

                        var numGrandchildren = 0;
                        if (typeof hole.holes !== 'undefined') {
                            numGrandchildren = hole.holes.length;
                        }

                        for (var j = 0; j < numGrandchildren; j++) {
                            queue.enqueue(hole.holes[j]);
                        }
                    }
                    var combinedPolygon = PolygonPipeline.eliminateHoles(outerRing, holes);
                    polygons.push(combinedPolygon);
                }
            }

            polygonHierarchy = polygons;

            outerPositions =  polygonHierarchy[0];
            // The bounding volume is just around the boundary points, so there could be cases for
            // contrived polygons on contrived ellipsoids - very oblate ones - where the bounding
            // volume doesn't cover the polygon.
            boundingSphere = BoundingSphere.fromPoints(outerPositions);

            for (i = 0; i < polygonHierarchy.length; i++) {
                geometry = createGeometryFromPositions(ellipsoid, polygonHierarchy[i], boundingSphere, granularity);
                if (typeof geometry !== 'undefined') {
                    geometries.push(geometry);
                }
            }
        } else {
            throw new DeveloperError('positions or hierarchy must be supplied.');
        }

        geometry = GeometryPipeline.combine(geometries);
        geometry = PolygonPipeline.scaleToGeodeticHeight(geometry, height, ellipsoid);

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array(geometry.attributes.position.values)
            });
        }

        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var cleanedPositions = PolygonPipeline.removeDuplicates(outerPositions);
            var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
            var boundingRectangle = computeBoundingRectangle(tangentPlane, outerPositions, stRotation, scratchBoundingRectangle);

            var origin = appendTextureCoordinatesOrigin;
            origin.x = boundingRectangle.x;
            origin.y = boundingRectangle.y;

            var flatPositions = geometry.attributes.position.values;
            var length = flatPositions.length;

            var textureCoordinates = vertexFormat.st ? new Float32Array(2 * (length / 3)) : undefined;
            var normals = vertexFormat.normal ? new Float32Array(length) : undefined;
            var tangents = vertexFormat.tangent ? new Float32Array(length) : undefined;
            var binormals = vertexFormat.binormal ? new Float32Array(length) : undefined;

            var textureCoordIndex = 0;
            var normalIndex = 0;
            var tangentIndex = 0;
            var binormalIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;

            var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
            var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

            for (i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    textureCoordinates[textureCoordIndex++] = st.x / boundingRectangle.width;
                    textureCoordinates[textureCoordIndex++] = st.y / boundingRectangle.height;
                }

                if (vertexFormat.normal) {
                    normal = ellipsoid.geodeticSurfaceNormal(position, normal);

                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }

                if (vertexFormat.tangent) {
                    if (!vertexFormat.normal) {
                        ellipsoid.geodeticSurfaceNormal(position, normal);
                    }

                    Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                    Cartesian3.normalize(tangent, tangent);

                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    if (!vertexFormat.normal) {
                        ellipsoid.geodeticSurfaceNormal(position, normal);
                    }

                    if (!vertexFormat.tangent) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                    }

                    var binormal = Cartesian3.cross(tangent, normal, scratchBinormal);
                    Cartesian3.normalize(binormal, binormal);

                    binormals[binormalIndex++] = binormal.x;
                    binormals[binormalIndex++] = binormal.y;
                    binormals[binormalIndex++] = binormal.z;
                }
            }

            if (vertexFormat.st) {
                attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : textureCoordinates
                });
            }

            if (vertexFormat.normal) {
                attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }

            if (vertexFormat.tangent) {
                attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }

            if (vertexFormat.binormal) {
                attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : binormals
                });
            }
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry.attributes
         */
        this.attributes = attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indexList = geometry.indexList;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = geometry.primitiveType;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;
    };

    return PolygonGeometry;
});

