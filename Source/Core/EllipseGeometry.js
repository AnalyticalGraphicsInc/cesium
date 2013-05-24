/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './GeometryAttribute',
        './GeometryIndices',
        './Math',
        './Matrix2',
        './Matrix4',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        GeometryAttribute,
        GeometryIndices,
        CesiumMath,
        Matrix2,
        Matrix4,
        PrimitiveType,
        VertexFormat) {
    "use strict";

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var scratchCartographic = new Cartographic();
    var scratchMatrix2 = new Matrix2();

    /**
     * Computes vertices and indices for an ellipse on the ellipsoid.
     *
     * @alias EllipseGeometry
     * @constructor
     *
     * @param {Cartesian3} options.center The ellipse's center point in the fixed frame.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the ellipse will be on.
     * @param {Number} [options.semiMajorAxis=1.0] The length of the ellipse's semi-major axis in meters.
     * @param {Number} [options.semiMinorAxis=1.0] The length of the ellipse's semi-minor axis in meters.
     * @param {Number} [options.bearing=0.0] The angle from north (clockwise) in radians. The default is zero.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the circle.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Matrix4} [options.modelMatrix] The model matrix for this ellipsoid.
     * @param {DOC_TBA} [options.pickData] DOC_TBA
     *
     * @exception {DeveloperError} center is required.
     * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @example
     * // Create an ellipse.
     * var ellipsoid = Ellipsoid.WGS84;
     * var ellipse = new EllipseGeometry({
     *     ellipsoid : ellipsoid,
     *     center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883)),
     *     semiMajorAxis : 500000.0,
     *     semiMinorAxis : 300000.0,
     *     bearing : CesiumMath.toRadians(60.0)
     * });
     */
    var EllipseGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var center = options.center;

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var semiMajorAxis = defaultValue(options.semiMajorAxis, 1.0);
        var semiMinorAxis = defaultValue(options.semiMinorAxis, 1.0);
        var bearing = defaultValue(options.bearing, 0.0);
        var granularity = defaultValue(options.granularity, 0.02);

        if (typeof center === 'undefined') {
            throw new DeveloperError('center is required.');
        }

        if (semiMajorAxis <= 0.0 || semiMinorAxis <= 0.0) {
            throw new DeveloperError('Semi-major and semi-minor axes must be greater than zero.');
        }

        if (granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }

        if (semiMajorAxis < semiMinorAxis) {
           var temp = semiMajorAxis;
           semiMajorAxis = semiMinorAxis;
           semiMinorAxis = temp;
        }

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        // The number of points in the first quadrant
        var numPts = Math.ceil(CesiumMath.PI_OVER_TWO / granularity) + 1;
        var deltaTheta = CesiumMath.PI_OVER_TWO / (numPts - 1);

        // If the number of points were three, the ellipse
        // would be tessellated like below:
        //
        //         *---*
        //       / | \ | \
        //     *---*---*---*
        //   / | \ | \ | \ | \
        // *---*---*---*---*---*
        //   \ | \ | \ | \ | /
        //     *---*---*---*
        //       \ | \ | /
        //         *---*
        // Notice each vertical column contains an odd number of positions.
        // The sum of the first n odd numbers is n^2. Double it for the number of points
        // for the whole ellipse
        var size = 2 * numPts * numPts;

        // If the ellipsoid contains points on the y axis, remove on of the
        // central columns of positions because they would be duplicated.
        var reachedPiOverTwo = false;
        if (deltaTheta * (numPts - 1) > CesiumMath.PI_OVER_TWO) {
            size -= 2 * numPts - 1;
            reachedPiOverTwo = true;
        }

        var i;
        var j;
        var numInterior;

        // Compute the points in the positive x half-space in 2D.
        var positions = new Array(size * 3);
        positions[0] = semiMajorAxis;
        positions[1] = 0.0;
        positions[2] = 0.0;
        var positionIndex = 3;

        var position = scratchCartesian1;
        var reflectedPosition = scratchCartesian2;

        for (i = 1; i < numPts; ++i) {
            var angle = Math.min(i * deltaTheta, CesiumMath.PI_OVER_TWO);

            // Compute the position on the ellipse in the first quadrant.
            position.x = Math.cos(angle) * semiMajorAxis;
            position.y = Math.sin(angle) * semiMinorAxis;

            // Reflect the position across the x axis for a point on the ellipse
            // in the fourth quadrant.
            reflectedPosition.x =  position.x;
            reflectedPosition.y = -position.y;

            positions[positionIndex++] = position.x;
            positions[positionIndex++] = position.y;
            positions[positionIndex++] = position.z;

            // Compute the points on the interior of the ellipse, on the line
            // through the points in the first and fourth quadrants
            numInterior = 2 * i + 1;
            for (j = 1; j < numInterior - 1; ++j) {
                var t = j / (numInterior - 1);
                var interiorPosition = Cartesian3.lerp(position, reflectedPosition, t, scratchCartesian3);
                positions[positionIndex++] = interiorPosition.x;
                positions[positionIndex++] = interiorPosition.y;
                positions[positionIndex++] = interiorPosition.z;
            }

            positions[positionIndex++] = reflectedPosition.x;
            positions[positionIndex++] = reflectedPosition.y;
            positions[positionIndex++] = reflectedPosition.z;
        }

        var reverseIndex;
        if (reachedPiOverTwo) {
            i = numPts - 1;
            reverseIndex = positionIndex - (numPts * 2 - 1) * 3;
        } else {
            i = numPts;
            reverseIndex = positionIndex;
        }

        // Reflect the points across the y axis to get the other half of the ellipsoid.
        for (; i > 0; --i) {
            numInterior = 2 * i - 1;
            reverseIndex -= numInterior * 3;
            for (j = 0; j < numInterior; ++j) {
                var index = reverseIndex  + j * 3;
                positions[positionIndex++] = -positions[index];
                positions[positionIndex++] =  positions[index + 1];
                positions[positionIndex++] =  positions[index + 2];
            }
        }

        var textureCoordinates = (vertexFormat.st) ? new Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Array(size * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Array(size * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Array(size * 3) : undefined;

        var textureCoordIndex = 0;

        // Rotate/translate the positions in the xy-plane and un-project to the ellipsoid in 3D.
        // Compute the texture coordinates, normals, tangents, and binormals at the same times.
        var projection = new GeographicProjection(ellipsoid);
        var centerCart = ellipsoid.cartesianToCartographic(center, scratchCartographic);
        var projectedCenter = projection.project(centerCart, scratchCartesian1);
        var rotation = Matrix2.fromRotation(bearing, scratchMatrix2);

        var normal;
        var tangent;
        var binormal;

        var length = positions.length;
        for (i = 0; i < length; i += 3) {
            position = Cartesian3.fromArray(positions, i, scratchCartesian2);

            if (vertexFormat.st) {
                textureCoordinates[textureCoordIndex++] = (position.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                textureCoordinates[textureCoordIndex++] = (position.y + semiMinorAxis) / (2.0 * semiMinorAxis);
            }

            Matrix2.multiplyByVector(rotation, position, position);
            Cartesian2.add(projectedCenter, position, position);

            var unprojected = projection.unproject(position, scratchCartographic);
            ellipsoid.cartographicToCartesian(unprojected, position);

            if (vertexFormat.position) {
                positions[i] = position.x;
                positions[i + 1] = position.y;
                positions[i + 2] = position.z;
            }

            if (vertexFormat.normal) {
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchCartesian3);

                normals[i] = normal.x;
                normals[i + 1] = normal.y;
                normals[i + 2] = normal.z;
            }

            if (vertexFormat.tangent) {
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchCartesian3);
                tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, scratchCartesian3);

                tangents[i] = tangent.x;
                tangents[i + 1] = tangent.y;
                tangents[i + 2] = tangent.z;
            }

            if (vertexFormat.binormal) {
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchCartesian3);
                tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, scratchCartesian4);
                binormal = Cartesian3.cross(normal, tangent, scratchCartesian3);

                binormals[i] = binormal.x;
                binormals[i + 1] = binormal.y;
                binormals[i + 2] = binormal.z;
            }
        }

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : positions
            });
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

        // The number of triangles in the ellipse on the positive x half-space is:
        //
        // numInteriorTriangles = 4 + 8 + 12 + ... = 4 + (4 + 4) + (4 + 4 + 4) + ... = 4 * (1 + 2 + 3 + ...)
        //                      = 4 * ((n * ( n + 1)) / 2)
        // numExteriorTriangles = 2 * n
        //
        // Substitute (numPts - 1.0) for n above and then:
        //
        // numTriangles = 2 * (numInteriorTriangles + numExteriorTriangles)
        // numIndices = 3 * numTriangles

        var indicesSize = 12.0 * numPts * numPts;
        if (reachedPiOverTwo) {
            indicesSize += 12.0 * (numPts - 1.0);
        }

        var indices = new Array(indicesSize);
        var indicesIndex = 0;
        var prevIndex;

        // Indices for positive x half-space
        for (i = 0; i < numPts - 1; ++i) {
            positionIndex = i + 1;
            positionIndex *= positionIndex;
            prevIndex = i * i;

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex;

            numInterior = 2 * i + 1;
            for (j = 0; j < numInterior - 1; ++j) {
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;
            }

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex;
        }

        // Indices for central column of triangles (if there is one)
        if (!reachedPiOverTwo) {
            numInterior = numPts * 2 - 1;
            ++positionIndex;
            ++prevIndex;
            for (i = 0; i < numInterior - 1; ++i) {
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;
            }
        }

        // Reverse the process creating indices for the ellipse on the positive x half-space
        // to create the part of the ellipse reflected on the y axis.
        ++prevIndex;
        ++positionIndex;
        for (i = numPts - 1; i > 0; --i) {
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex;

            numInterior = 2 * (i - 1) + 1;
            for (j = 0; j < numInterior - 1; ++j) {
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;
            }

            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex++;
        }

        indices.length = indicesIndex;

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = attributes;

        /**
         * An array of {@link GeometryIndices} defining primitives.
         *
         * @type Array
         */
        this.indexLists = [
            new GeometryIndices({
                primitiveType : PrimitiveType.TRIANGLES,
                values : indices
            })
        ];

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = new BoundingSphere(center, semiMajorAxis);

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
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    return EllipseGeometry;
});