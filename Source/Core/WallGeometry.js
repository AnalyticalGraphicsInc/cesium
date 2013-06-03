/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './GeometryAttribute',
        './GeometryIndices',
        './Matrix4',
        './PolylinePipeline',
        './PolygonPipeline',
        './PrimitiveType',
        './VertexFormat',
        './WindingOrder'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        GeometryAttribute,
        GeometryIndices,
        Matrix4,
        PolylinePipeline,
        PolygonPipeline,
        PrimitiveType,
        VertexFormat,
        WindingOrder) {
    "use strict";

    var scratchCartographic = new Cartographic();
    var scratchCartesian3Position1 = new Cartesian3();
    var scratchCartesian3Position2 = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchNormal = new Cartesian3();

    /**
     * Creates a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     * The points in the wall can be offset by supplied terrain elevation data.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {Array} positions An array of Cartesian objects, which are the points of the wall.
     * @param {Array} [terrain] Has to denote the same points as in positions, with the ground elevation reflecting the terrain elevation.
     * @param {Number} [top] The top of the wall. If specified, the top of the wall is treated as this
     *        height, and the information in the positions array is disregarded.
     * @param {Number} [bottom] The bottom of the wall. If specified, the bottom of the wall is treated as
     *        this height. Otherwise, its treated as 'ground' (the WGS84 ellipsoid height 0).
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Matrix4} [options.modelMatrix] The model matrix for this geometry.
     * @param {Color} [options.color] The color of the geometry when a per-geometry color appearance is used.
     * @param {DOC_TBA} [options.pickData] DOC_TBA
     *
     * @exception {DeveloperError} positions is required.
     * @exception {DeveloperError} positions and terrain points must have the same length.
     *
     * @example
     *
     *  var positions = [
     *      Cesium.Cartographic.fromDegrees(19.0, 47.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(19.0, 48.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(20.0, 48.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(20.0, 47.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(19.0, 47.0, 10000.0)
     *  ];
     *
     *  // create a wall that spans from ground level to 10000 meters
     *  var wall = new Cesium.WallGeometry({
     *      positions    : ellipsoid.cartographicArrayToCartesianArray(positions)
     *  });
     *
     */
    var WallGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var terrain = options.terrain;
        var top = options.top;
        var bottom = options.bottom;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        if (typeof wallPositions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        if (typeof terrain !== 'undefined' && terrain.length !== wallPositions.length) {
            throw new DeveloperError('positions and terrain points must have the same length.');
        }

        wallPositions = PolylinePipeline.cleanUp(wallPositions);
        if (wallPositions.length >= 3) {
            // Order positions counter-clockwise
            var tangentPlane = EllipsoidTangentPlane.fromPoints(wallPositions, ellipsoid);
            var positions2D = tangentPlane.projectPointsOntoPlane(wallPositions);

            if (PolygonPipeline.computeWindingOrder2D(positions2D) === WindingOrder.CLOCKWISE) {
                wallPositions.reverse();
            }
        }

        var i;
        var size = wallPositions.length * 2;

        var positions = vertexFormat.position ? new Array(size * 3) : undefined;
        var normals = vertexFormat.normal ? new Array(size * 3) : undefined;
        var tangents = vertexFormat.tangent ? new Array(size * 3) : undefined;
        var binormals = vertexFormat.binormal ? new Array(size * 3) : undefined;
        var textureCoordinates = vertexFormat.st ? new Array(size * 2) : undefined;

        var positionIndex = 0;
        var normalIndex = 0;
        var tangentIndex = 0;
        var binormalIndex = 0;
        var textureCoordIndex = 0;

        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        var length = wallPositions.length;
        for (i = 0; i < length; ++i) {
            var c = ellipsoid.cartesianToCartographic(wallPositions[i], scratchCartographic);
            var origHeight = c.height;
            c.height = 0.0;

            var terrainHeight = 0.0;
            if (terrain !== undefined) {
                var h = terrain[i].height;
                if (!isNaN(h)) {
                    terrainHeight = h;
                }
            }

            if (bottom !== undefined) {
                c.height = bottom;
            } else {
                c.height += terrainHeight;
            }

            var bottomPosition = ellipsoid.cartographicToCartesian(c, scratchCartesian3Position1);

            // get the original height back, or set the top value
            c.height = (top === undefined) ? origHeight : top;
            c.height += terrainHeight;
            var topPosition = ellipsoid.cartographicToCartesian(c, scratchCartesian3Position2);

            if (vertexFormat.position) {
                // insert the lower point
                positions[positionIndex++] = bottomPosition.x;
                positions[positionIndex++] = bottomPosition.y;
                positions[positionIndex++] = bottomPosition.z;

                // insert the upper point
                positions[positionIndex++] = topPosition.x;
                positions[positionIndex++] = topPosition.y;
                positions[positionIndex++] = topPosition.z;
            }

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                var fromPrevious = (i === 0) ? Cartesian3.ZERO : Cartesian3.subtract(wallPositions[i], wallPositions[i - 1], scratchCartesian3Position1);
                var toNext = (i === length - 1) ? Cartesian3.ZERO : Cartesian3.subtract(wallPositions[i + 1], wallPositions[i], scratchCartesian3Position2);

                var tangent = Cartesian3.add(fromPrevious, toNext, scratchTangent);
                var binormal = Cartesian3.subtract(topPosition, bottomPosition, scratchBinormal);

                if (vertexFormat.normal) {
                    var normal = Cartesian3.cross(tangent, binormal, scratchNormal);
                    Cartesian3.normalize(normal, normal);
                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }

                if (vertexFormat.tangent) {
                    Cartesian3.normalize(tangent, tangent);
                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    Cartesian3.normalize(binormal, binormal);
                    binormals[binormalIndex++] = binormal.x;
                    binormals[binormalIndex++] = binormal.y;
                    binormals[binormalIndex++] = binormal.z;
                }
            }

            if (vertexFormat.st) {
                var s = i / (length - 1);

                textureCoordinates[textureCoordIndex++] = s;
                textureCoordinates[textureCoordIndex++] = 0.0;

                textureCoordinates[textureCoordIndex++] = s;
                textureCoordinates[textureCoordIndex++] = 1.0;
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

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }


        // prepare the side walls, two triangles for each wall
        //
        //    A (i+1)  B (i+3) E
        //    +--------+-------+
        //    |      / |      /|    triangles:  A C B
        //    |     /  |     / |                B C D
        //    |    /   |    /  |
        //    |   /    |   /   |
        //    |  /     |  /    |
        //    | /      | /     |
        //    +--------+-------+
        //    C (i)    D (i+2) F
        //

        size -= 2;
        var indices = new Array(size * 3);

        var j = 0;
        for (i = 0; i < size; i += 2) {
            // first do A C B
            indices[j++] = i + 1;
            indices[j++] = i;
            indices[j++] = i + 3;

            // now do B C D
            indices[j++] = i + 3;
            indices[j++] = i;
            indices[j++] = i + 2;
        }

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
        this.boundingSphere = new BoundingSphere.fromVertices(positions);

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * The color of the geometry when a per-geometry color appearance is used.
         *
         * @type Color
         */
        this.color = options.color;

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    return WallGeometry;
});

