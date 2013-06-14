/*global define*/
define([
        './defaultValue',
        './DeveloperError'
    ], function(
        defaultValue,
        DeveloperError) {
    "use strict";

    /**
     * A geometry representation with attributes forming vertices and optional index data
     * defining primitives.  Geometries and an {@link Appearance}, which describes the shading,
     * can be assigned to a {@link Primitive} for visualization.  A <code>Primitive</code> can
     * be created from many heterogeneous - in many cases - geometries for performance.
     * <p>
     * In low-level rendering code, a vertex array can be created from a geometry using
     * {@link Context#createVertexArrayFromGeometry}.
     * </p>
     * <p>
     * Geometries can be transformed and optimized using functions in {@link GeometryPipeline}.
     * </p>
     *
     * @alias Geometry
     * @constructor
     *
     * @param {Object} [options=undefined] An object with properties corresponding to Geometry properties as shown in the code example.
     *
     * @example
     * // Create geometry with a position attribute and indexed lines.
     * var positions = [
     *   0.0, 0.0, 0.0,
     *   7500000.0, 0.0, 0.0,
     *   0.0, 7500000.0, 0.0
     * ];
     *
     * var geometry = new Geometry({
     *   attributes : {
     *     position : new GeometryAttribute({
     *       componentDatatype : ComponentDatatype.FLOAT,
     *       componentsPerAttribute : 3,
     *       values : positions
     *     })
     *   },
     *   indexList : [0, 1, 1, 2, 2, 0],
     *   primitiveType : PrimitiveType.LINES,
     *   boundingSphere : BoundingSphere.fromVertices(positions)
     * });
     *
     * @see Appearance
     * @see Context#createVertexArrayFromGeometry
     * @see GeometryInstance
     * @see GeometryPipeline
     * @see Primitive
     */
    var Geometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * Attributes, which make up the geometry's vertices.  Each property in this object corresponds to a
         * {@link GeometryAttribute} containing the attribute's data.
         * <p>
         * Attributes are always stored non-interleaved in a Geometry.  When geometry is prepared for rendering
         * with {@link Context#createVertexArrayFromGeometry}, attributes are generally written interleaved
         * into the vertex buffer for better rendering performance.
         * </p>
         * <p>
         * There are reserved attribute names with well-known semantics.  The following attributes
         * are created by a Geometry (depending on the provided {@link VertexFormat}.
         * <ul>
         *    <li><code>position</code> - 3D vertex position.  64-bit floating-point (for precision).  3 components per attribute.  See {@link VertexFormat.position}.</li>
         *    <li><code>normal</code> - Normal (normalized), commonly used for lighting.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat.normal}.</li>
         *    <li><code>st</code> - 2D texture coordinate.  32-bit floating-point.  2 components per attribute.  See {@link VertexFormat.st}.</li>
         *    <li><code>binormal</code> - Binormal (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat.binormal}.</li>
         *    <li><code>tangent</code> - Tangent (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat.tangent}.</li>
         * </ul>
         * </p>
         * <p>
         * The following attribute names are generally not created by a Geometry, but are added
         * to a Geometry by a {@link Primitive} or {@link GeometryPipeline} functions to prepare
         * the geometry for rendering.
         * <ul>
         *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position3DLow</code> - Low 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position2DLow</code> - Low 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>color</code> - RGBA color (normalized) usually from {@link GeometryInstance.color}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>pickColor</code> - RGBA color used for picking, created from {@link Context#createPickId}.  32-bit floating-point.  4 components per attribute.</li>
         * </ul>
         * </p>
         *
         * @type Object
         *
         * @default undefined
         *
         * @example
         * geometry.attributes = new GeometryAttribute({
         *   componentDatatype : ComponentDatatype.FLOAT,
         *   componentsPerAttribute : 3,
         *   values : new Float32Array()
         * });
         *
         * @see GeometryAttribute
         * @see VertexFormat
         */
        this.attributes = defaultValue(options.attributes, {});

        /**
         * Optional index data that - along with {@link Geometry#primitiveType} -
         * determines the primitives in the geometry.
         *
         * @type Array
         *
         * @default undefined
         *
         * @example
         * // Two triangles with shared vertices
         * geometry.primitiveType = PrimitiveType.TRIANGLES;
         * geometry.indexList = new Uint16Array([0, 1, 2, 0, 2, 3]);
         */
        this.indexList = options.indexList;

        /**
         * The type of primitives in the geometry.  This is most often {@link PrimitiveType.TRIANGLES},
         * but can varying based on the specific geometry.
         *
         * @type PrimitiveType
         *
         * @default undefined
         *
         * @example
         * // Two triangles with shared vertices
         * geometry.primitiveType = PrimitiveType.TRIANGLES;
         * geometry.indexList = new Uint16Array([0, 1, 2, 0, 2, 3]);
         */
        this.primitiveType = options.primitiveType;

        /**
         * An optional bounding sphere that fully enclosed the geometry.  This is
         * commonly used for culling.
         *
         * @type BoundingSphere
         *
         * @default undefined
         *
         * @example
         * geometry.boundingSphere = BoundingSphere.fromVertices(positions);
         */
        this.boundingSphere = options.boundingSphere;
    };

    /**
     * Duplicates a Geometry instance, including a deep copy of the attributes and indices.
     *
     * @memberof Geometry
     *
     * @param {Cartesian3} geometry The geometry to duplicate.  If this is undefined, undefined is returned.
     * @param {Cartesian3} [result] The object onto which to store the result.
     *
     * @return {Cartesian3} The modified result parameter or a new Geometry instance if one was not provided.
     *
     * @example
     * result.geometry = Geometry.clone(this.geometry);
     */
    Geometry.clone = function(geometry, result) {
        if (typeof geometry === 'undefined') {
            return undefined;
        }

        if (typeof result === 'undefined') {
            result = new Geometry();
        }

        var attributes = geometry.attributes;
        var newAttributes = {};
        for (var property in attributes) {
            if (attributes.hasOwnProperty(property)) {
                newAttributes[property] = attributes[property].clone();
            }
        }
        result.attributes = newAttributes;

        if (typeof geometry.indexList !== 'undefined') {
            var sourceValues = geometry.indexList;
            result.indexList = new sourceValues.constructor(sourceValues);
        } else {
            result.indexList = undefined;
        }
        result.primitiveType = geometry.primitiveType;

        if (typeof geometry.boundingSphere !== 'undefined') {
            geometry.boundingSphere.clone(result.boundingSphere);
        } else {
            result.boundingSphere = undefined;
        }

        return result;
    };

    /**
     * Computes the number of vertices in a geometry.  The runtime is linear with
     * respect to the number of attributes in a vertex, not the number of vertices.
     *
     * @memberof Geometry
     *
     * @param {Cartesian3} geometry The geometry.
     *
     * @return {Number} The number of vertices in the geometry.
     *
     * @exception {DeveloperError} geometries is required.
     *
     * @example
     * var numVertices = Geometry.computeNumberOfVertices(geometry);
     */
    Geometry.computeNumberOfVertices = function(geometry) {
        if (typeof geometry === 'undefined') {
            throw new DeveloperError('geometry is required.');
        }

        var numberOfVertices = -1;
        for ( var property in geometry.attributes) {
            if (geometry.attributes.hasOwnProperty(property) && geometry.attributes[property].values) {
                var attribute = geometry.attributes[property];
                var num = attribute.values.length / attribute.componentsPerAttribute;
                if ((numberOfVertices !== num) && (numberOfVertices !== -1)) {
                    throw new DeveloperError('All attribute lists must have the same number of attributes.');
                }
                numberOfVertices = num;
            }
        }

        return numberOfVertices;
    };

    return Geometry;
});
