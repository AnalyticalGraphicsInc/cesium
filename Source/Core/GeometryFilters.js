/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartesian3',
        './Cartesian2',
        './EncodedCartesian3',
        './Matrix3',
        './Matrix4',
        './GeographicProjection',
        './ComponentDatatype',
        './PrimitiveType',
        './Tipsify',
        './BoundingSphere',
        './Geometry',
        './GeometryAttribute',
        './GeometryIndices'
    ], function(
        defaultValue,
        DeveloperError,
        Cartesian3,
        Cartesian2,
        EncodedCartesian3,
        Matrix3,
        Matrix4,
        GeographicProjection,
        ComponentDatatype,
        PrimitiveType,
        Tipsify,
        BoundingSphere,
        Geometry,
        GeometryAttribute,
        GeometryIndices) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports GeometryFilters
     *
     * @see Context#createVertexArrayFromMesh
     */
    var GeometryFilters = {};

    /**
     * Converts a mesh's triangle indices to line indices.  Each list of indices in the mesh's <code>indexList</code> with
     * a primitive type of <code>triangles</code>, <code>triangleStrip</code>, or <code>trangleFan</code> is converted to a
     * list of indices with a primitive type of <code>lines</code>.  Lists of indices with other primitive types remain unchanged.
     * <br /><br />
     * The <code>mesh</code> argument should use the standard layout like the mesh returned by {@link BoxGeometry}.
     * <br /><br />
     * This filter is commonly used to create a wireframe mesh for visual debugging.
     *
     * @param {Geometry} mesh The mesh to filter, which is modified in place.
     *
     * @returns The modified <code>mesh</code> argument, with its triangle indices converted to lines.
     *
     * @example
     * var mesh = new BoxGeometry();
     * mesh = GeometryFilters.toWireframe(mesh);
     */
    GeometryFilters.toWireframe = function(mesh) {
        function addTriangle(lines, i0, i1, i2) {
            lines.push(i0);
            lines.push(i1);

            lines.push(i1);
            lines.push(i2);

            lines.push(i2);
            lines.push(i0);
        }

        function trianglesToLines(triangles) {
            var lines = [];
            var count = triangles.length;
            for ( var i = 0; i < count; i += 3) {
                addTriangle(lines, triangles[i], triangles[i + 1], triangles[i + 2]);
            }

            return lines;
        }

        function triangleStripToLines(triangles) {
            var lines = [];
            var count = triangles.length;

            if (count >= 3) {
                addTriangle(lines, triangles[0], triangles[1], triangles[2]);

                for ( var i = 3; i < count; ++i) {
                    addTriangle(lines, triangles[i - 1], triangles[i], triangles[i - 2]);
                }
            }

            return lines;
        }

        function triangleFanToLines(triangles) {
            var lines = [];

            if (triangles.length > 0) {
                var base = triangles[0];
                var count = triangles.length - 1;
                for ( var i = 1; i < count; ++i) {
                    addTriangle(lines, base, triangles[i], triangles[i + 1]);
                }
            }

            return lines;
        }

        if (typeof mesh !== 'undefined') {
            var indexLists = mesh.indexLists;
            if (typeof indexLists !== 'undefined') {
                var count = indexLists.length;
                for ( var i = 0; i < count; ++i) {
                    var indices = indexLists[i];

                    switch (indices.primitiveType) {
                        case PrimitiveType.TRIANGLES:
                            indices.primitiveType = PrimitiveType.LINES;
                            indices.values = trianglesToLines(indices.values);
                            break;
                        case PrimitiveType.TRIANGLE_STRIP:
                            indices.primitiveType = PrimitiveType.LINES;
                            indices.values = triangleStripToLines(indices.values);
                            break;
                        case PrimitiveType.TRIANGLE_FAN:
                            indices.primitiveType = PrimitiveType.LINES;
                            indices.values = triangleFanToLines(indices.values);
                            break;
                    }
                }
            }
        }

        return mesh;
    };

    /**
     * DOC_TBA
     */
    GeometryFilters.createAttributeIndices = function(mesh) {
        var indices = {};

        if (typeof mesh !== 'undefined') {
            var attributes = mesh.attributes;
            var j = 0;

            for ( var name in attributes) {
                if (attributes.hasOwnProperty(name)) {
                    indices[name] = j++;
                }
            }
        }

        return indices;
    };

    /**
     * DOC_TBA
     */
    GeometryFilters.mapAttributeIndices = function(indices, map) {
        var mappedIndices = {};

        if (typeof indices !== 'undefined' && typeof map !== 'undefined') {
            for ( var name in map) {
                if (map.hasOwnProperty(name)) {
                    mappedIndices[map[name]] = indices[name];
                }
            }
        }

        return mappedIndices;
    };

    /**
     * Reorders a mesh's indices to achieve better performance from the GPU's pre-vertex-shader cache.
     * Each list of indices in the mesh's <code>indexList</code> is reordered to keep the same index-vertex correspondence.
     * <br /><br />
     * The <code>mesh</code> argument should use the standard layout like the mesh returned by {@link BoxGeometry}.
     * <br /><br />

     * @param {Geometry} mesh The mesh to filter, which is modified in place.
     *
     * @exception {DeveloperError} All mesh attribute lists must have the same number of attributes.
     *
     * @returns The modified <code>mesh</code> argument, with its vertices and indices reordered for the GPU's pre-vertex-shader cache.
     *
     * @see GeometryFilters.reorderForPostVertexCache
     *
     * @example
     * var mesh = new EllipsoidGeometry(...);
     * mesh = GeometryFilters.reorderForPreVertexCache(mesh);
     */
    GeometryFilters.reorderForPreVertexCache = function(mesh) {
        if (typeof mesh !== 'undefined') {
            var numVertices = Geometry.computeNumberOfVertices(mesh);

            var indexCrossReferenceOldToNew = [];
            for ( var i = 0; i < numVertices; i++) {
                indexCrossReferenceOldToNew[i] = -1;
            }

            //Construct cross reference and reorder indices
            var indexLists = mesh.indexLists;
            if (typeof indexLists !== 'undefined') {
                var count = indexLists.length;
                for ( var j = 0; j < count; ++j) {
                    var indicesIn = indexLists[j].values;
                    var numIndices = indicesIn.length;
                    var indicesOut = [];
                    var intoIndicesIn = 0;
                    var intoIndicesOut = 0;
                    var nextIndex = 0;
                    var tempIndex;
                    while (intoIndicesIn < numIndices) {
                        tempIndex = indexCrossReferenceOldToNew[indicesIn[intoIndicesIn]];
                        if (tempIndex !== -1) {
                            indicesOut[intoIndicesOut] = tempIndex;
                        } else {
                            tempIndex = indicesIn[intoIndicesIn];
                            if (tempIndex >= numVertices) {
                                throw new DeveloperError('Input indices contains a value greater than or equal to the number of vertices');
                            }
                            indexCrossReferenceOldToNew[tempIndex] = nextIndex;

                            indicesOut[intoIndicesOut] = nextIndex;
                            ++nextIndex;
                        }
                        ++intoIndicesIn;
                        ++intoIndicesOut;
                    }
                    indexLists[j].values = indicesOut;
                }
            }

            //Reorder Vertices
            var attributes = mesh.attributes;
            if (typeof attributes !== 'undefined') {
                for ( var property in attributes) {
                    if (attributes.hasOwnProperty(property) && attributes[property].values) {
                        var elementsIn = attributes[property].values;
                        var intoElementsIn = 0;
                        var numComponents = attributes[property].componentsPerAttribute;
                        var elementsOut = [];
                        while (intoElementsIn < numVertices) {
                            var temp = indexCrossReferenceOldToNew[intoElementsIn];
                            for (i = 0; i < numComponents; i++) {
                                elementsOut[numComponents * temp + i] = elementsIn[numComponents * intoElementsIn + i];
                            }
                            ++intoElementsIn;
                        }
                        attributes[property].values = elementsOut;
                    }
                }
            }
        }
        return mesh;
    };

    /**
     * Reorders a mesh's indices to achieve better performance from the GPU's post vertex-shader cache by using the Tipsify algorithm.
     * Each list of indices in the mesh's <code>indexList</code> is optimally reordered.
     * <br /><br />
     * The <code>mesh</code> argument should use the standard layout like the mesh returned by {@link BoxGeometry}.
     * <br /><br />

     * @param {Geometry} mesh The mesh to filter, which is modified in place.
     * @param {Number} [cacheCapacity=24] The number of vertices that can be held in the GPU's vertex cache.
     *
     * @exception {DeveloperError} Mesh's index list must be defined.
     * @exception {DeveloperError} Mesh's index lists' lengths must each be a multiple of three.
     * @exception {DeveloperError} Mesh's index list's maximum index value must be greater than zero.
     * @exception {DeveloperError} cacheCapacity must be greater than two.
     *
     * @returns The modified <code>mesh</code> argument, with its indices optimally reordered for the post-vertex-shader cache.
     *
     * @see GeometryFilters.reorderForPreVertexCache
     * @see Tipsify
     * @see <a href='http://gfx.cs.princeton.edu/pubs/Sander_2007_%3ETR/tipsy.pdf'>
     * Fast Triangle Reordering for Vertex Locality and Reduced Overdraw</a>
     * by Sander, Nehab, and Barczak
     *
     * @example
     * var mesh = new EllipsoidGeometry(...);
     * mesh = GeometryFilters.reorderForPostVertexCache(mesh);
     */
    GeometryFilters.reorderForPostVertexCache = function(mesh, cacheCapacity) {
        if (typeof mesh !== 'undefined') {
            var indexLists = mesh.indexLists;
            if (typeof indexLists !== 'undefined') {
                var count = indexLists.length;
                for ( var i = 0; i < count; i++) {
                    var indices = indexLists[i].values;
                    var numIndices = indices.length;
                    var maximumIndex = 0;
                    for ( var j = 0; j < numIndices; j++) {
                        if (indices[j] > maximumIndex) {
                            maximumIndex = indices[j];
                        }
                    }
                    indexLists[i].values = Tipsify.tipsify({
                        indices : indices,
                        maximumIndex : maximumIndex,
                        cacheSize : cacheCapacity
                    });
                }
            }
        }
        return mesh;
    };

    GeometryFilters._verifyTrianglesPrimitiveType = function(indexLists) {
        var length = indexLists.length;
        for ( var i = 0; i < length; ++i) {
            if (indexLists[i].primitiveType !== PrimitiveType.TRIANGLES) {
                throw new DeveloperError('indexLists must have PrimitiveType equal to PrimitiveType.TRIANGLES.');
            }
        }
    };

    GeometryFilters._copyAttributesDescriptions = function(attributes) {
        var newAttributes = {};

        for ( var attribute in attributes) {
            if (attributes.hasOwnProperty(attribute) && attributes[attribute].values) {
                var attr = attributes[attribute];
                newAttributes[attribute] = new GeometryAttribute({
                    componentDatatype : attr.componentDatatype,
                    componentsPerAttribute : attr.componentsPerAttribute,
                    normalize : attr.normalize,
                    values : []
                });
            }
        }

        return newAttributes;
    };

    function copyVertex(destinationAttributes, sourceAttributes, index) {
        for ( var attribute in sourceAttributes) {
            if (sourceAttributes.hasOwnProperty(attribute) && sourceAttributes[attribute].values) {
                var attr = sourceAttributes[attribute];

                for ( var k = 0; k < attr.componentsPerAttribute; ++k) {
                    destinationAttributes[attribute].values.push(attr.values[(index * attr.componentsPerAttribute) + k]);
                }
            }
        }
    }

    /**
     * DOC_TBA.  Old mesh is not guaranteed to be copied.
     *
     * @exception {DeveloperError} The mesh's index-lists must have PrimitiveType equal to PrimitiveType.TRIANGLES.
     * @exception {DeveloperError} All mesh attribute lists must have the same number of attributes.
     */
    GeometryFilters.fitToUnsignedShortIndices = function(mesh) {
        function createMesh(attributes, primitiveType, indices) {
            return new Geometry({
                attributes : attributes,
                indexLists : [new GeometryIndices({
                    primitiveType : primitiveType,
                    values : indices
                })],
                boundingSphere : (typeof mesh.boundingSphere !== 'undefined') ? BoundingSphere.clone(mesh.boundingSphere) : undefined,
                modelMatrix : (typeof mesh.modelMatrix !== 'undefined') ? Matrix4.clone(mesh.modelMatrix) : undefined,
                pickData : mesh.pickData
            });
        }

        var meshes = [];

        if (typeof mesh !== 'undefined') {
            GeometryFilters._verifyTrianglesPrimitiveType(mesh.indexLists);

            var numberOfVertices = Geometry.computeNumberOfVertices(mesh);

            // If there's an index list and more than 64K attributes, it is possible that
            // some indices are outside the range of unsigned short [0, 64K - 1]
            var sixtyFourK = 64 * 1024;
            var indexLists = mesh.indexLists;
            if (typeof indexLists !== 'undefined' && (numberOfVertices > sixtyFourK)) {
                // PERFORMANCE_IDEA:  If an input mesh has more than one index-list.  This creates
                // at least one vertex-array per index-list.  A more sophisticated implementation
                // may create less vertex-arrays.
                var length = indexLists.length;
                for ( var i = 0; i < length; ++i) {
                    var oldToNewIndex = [];
                    var newIndices = [];
                    var currentIndex = 0;
                    var newAttributes = GeometryFilters._copyAttributesDescriptions(mesh.attributes);

                    var originalIndices = indexLists[i].values;
                    var numberOfIndices = originalIndices.length;

                    for ( var j = 0; j < numberOfIndices; j += 3) {
                        // It would be easy to extend this inter-loop to support all primitive-types.

                        var x0 = originalIndices[j];
                        var x1 = originalIndices[j + 1];
                        var x2 = originalIndices[j + 2];

                        var i0 = oldToNewIndex[x0];
                        if (typeof i0 === 'undefined') {
                            i0 = currentIndex++;
                            oldToNewIndex[x0] = i0;

                            copyVertex(newAttributes, mesh.attributes, x0);
                        }

                        var i1 = oldToNewIndex[x1];
                        if (typeof i1 === 'undefined') {
                            i1 = currentIndex++;
                            oldToNewIndex[x1] = i1;

                            copyVertex(newAttributes, mesh.attributes, x1);
                        }

                        var i2 = oldToNewIndex[x2];
                        if (typeof i2 === 'undefined') {
                            i2 = currentIndex++;
                            oldToNewIndex[x2] = i2;

                            copyVertex(newAttributes, mesh.attributes, x2);
                        }

                        newIndices.push(i0);
                        newIndices.push(i1);
                        newIndices.push(i2);

                        if (currentIndex + 3 > sixtyFourK) {
                            meshes.push(createMesh(newAttributes, indexLists[i].primitiveType, newIndices));

                            // Reset for next vertex-array
                            oldToNewIndex = [];
                            newIndices = [];
                            currentIndex = 0;
                            newAttributes = GeometryFilters._copyAttributesDescriptions(mesh.attributes);
                        }
                    }

                    if (newIndices.length !== 0) {
                        meshes.push(createMesh(newAttributes, indexLists[i].primitiveType, newIndices));
                    }
                }
            } else {
                // No need to split into multiple meshes
                meshes.push(mesh);
            }
        }

        return meshes;
    };

    /**
     * DOC_TBA
     */
    GeometryFilters.projectTo2D = function(mesh, projection) {
        if (typeof mesh !== 'undefined' && typeof mesh.attributes !== 'undefined' && typeof mesh.attributes.position !== 'undefined') {
            projection = typeof projection !== 'undefined' ? projection : new GeographicProjection();
            var ellipsoid = projection.getEllipsoid();

            // Project original positions to 2D.
            var wgs84Positions = mesh.attributes.position.values;
            var projectedPositions = [];

            for ( var i = 0; i < wgs84Positions.length; i += 3) {
                var lonLat = ellipsoid.cartesianToCartographic(new Cartesian3(wgs84Positions[i], wgs84Positions[i + 1], wgs84Positions[i + 2]));
                var projectedLonLat = projection.project(lonLat);
                projectedPositions.push(projectedLonLat.x, projectedLonLat.y);
            }

            // Rename original positions to WGS84 Positions.
            mesh.attributes.position3D = mesh.attributes.position;

            // Replace original positions with 2D projected positions
            mesh.attributes.position2D = {
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : projectedPositions
            };
            delete mesh.attributes.position;
        }

        return mesh;
    };

    var encodedResult = {
        high : 0.0,
        low : 0.0
    };

    /**
     * Encodes floating-point mesh attribute values as two separate attributes to improve
     * rendering precision using the same encoding as {@link EncodedCartesian3}.
     * <p>
     * This is commonly used to create high-precision position vertex attributes.
     * </p>
     *
     * @param {Geometry} mesh The mesh to filter, which is modified in place.
     * @param {String} [attributeName='position'] The name of the attribute.
     * @param {String} [attributeHighName='positionHigh'] The name of the attribute for the encoded high bits.
     * @param {String} [attributeLowName='positionLow'] The name of the attribute for the encoded low bits.
     *
     * @returns The modified <code>mesh</code> argument, with its encoded attribute.
     *
     * @exception {DeveloperError} mesh is required.
     * @exception {DeveloperError} mesh must have an attributes property.
     * @exception {DeveloperError} mesh must have attribute matching the attributeName argument.
     * @exception {DeveloperError} The attribute componentDatatype must be ComponentDatatype.FLOAT.
     *
     * @example
     * mesh = GeometryFilters.encodeAttribute(mesh, 'position3D', 'position3DHigh', 'position3DLow');
     *
     * @see EncodedCartesian3
     */
    GeometryFilters.encodeAttribute = function(mesh, attributeName, attributeHighName, attributeLowName) {
        attributeName = defaultValue(attributeName, 'position');
        attributeHighName = defaultValue(attributeHighName, 'positionHigh');
        attributeLowName = defaultValue(attributeLowName, 'positionLow');

        if (typeof mesh === 'undefined') {
            throw new DeveloperError('mesh is required.');
        }

        if (typeof mesh.attributes === 'undefined') {
            throw new DeveloperError('mesh must have an attributes property.');
        }

        var attribute = mesh.attributes[attributeName];

        if (typeof attribute === 'undefined') {
            throw new DeveloperError('mesh must have attribute matching the attributeName argument: ' + attributeName + '.');
        }

        if (attribute.componentDatatype !== ComponentDatatype.FLOAT) {
            throw new DeveloperError('The attribute componentDatatype must be ComponentDatatype.FLOAT.');
        }

        var values = attribute.values;
        var length = values.length;
        var highValues = new Array(length);
        var lowValues = new Array(length);

        for (var i = 0; i < length; ++i) {
            EncodedCartesian3.encode(values[i], encodedResult);
            highValues[i] = encodedResult.high;
            lowValues[i] = encodedResult.low;
        }

        mesh.attributes[attributeHighName] = new GeometryAttribute({
            componentDatatype : attribute.componentDatatype,
            componentsPerAttribute : attribute.componentsPerAttribute,
            values : highValues
        });
        mesh.attributes[attributeLowName] = new GeometryAttribute({
            componentDatatype : attribute.componentDatatype,
            componentsPerAttribute : attribute.componentsPerAttribute,
            values : lowValues
        });
        delete mesh.attributes[attributeName];

        return mesh;
    };

    var scratch = new Cartesian3();

    function transformPoint(matrix, attribute) {
        if (typeof attribute !== 'undefined') {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(values, i, scratch);
                Matrix4.multiplyByPoint(matrix, scratch, scratch);
                values[i] = scratch.x;
                values[i + 1] = scratch.y;
                values[i + 2] = scratch.z;
            }
        }
    }

    function transformVector(matrix, attribute) {
        if (typeof attribute !== 'undefined') {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(values, i, scratch);
                Matrix3.multiplyByVector(matrix, scratch, scratch);
                values[i] = scratch.x;
                values[i + 1] = scratch.y;
                values[i + 2] = scratch.z;
            }
        }
    }

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} mesh is required.
     */
    GeometryFilters.transformToWorldCoordinates = function(mesh) {
        if (typeof mesh === 'undefined') {
            throw new DeveloperError('mesh is required.');
        }

        if (mesh.modelMatrix.equals(Matrix4.IDENTITY)) {
            // Already in world coordinates
            return;
        }

        var attributes = mesh.attributes;

        // Transform attributes in known vertex formats
        transformPoint(mesh.modelMatrix, attributes.position);

        if ((typeof attributes.normal !== 'undefined') ||
            (typeof attributes.binormal !== 'undefined') ||
            (typeof attributes.tangent !== 'undefined')) {

            var inverseTranspose = new Matrix4();
            var normalMatrix = new Matrix3();
            Matrix4.inverse(mesh.modelMatrix, inverseTranspose);
            Matrix4.transpose(inverseTranspose, inverseTranspose);
            Matrix4.getRotation(inverseTranspose, normalMatrix);

            transformVector(normalMatrix, attributes.normal);
            transformVector(normalMatrix, attributes.binormal);
            transformVector(normalMatrix, attributes.tangent);
        }

        if (typeof mesh.boundingSphere !== 'undefined') {
            Matrix4.multiplyByPoint(mesh.modelMatrix, mesh.boundingSphere.center, mesh.boundingSphere.center);
            mesh.boundingSphere.center = Cartesian3.fromCartesian4(mesh.boundingSphere.center);
        }

        mesh.modelMatrix = Matrix4.IDENTITY.clone();

        return mesh;
    };

    function findAttributesInAllMeshes(meshes) {
        var length = meshes.length;

        var attributesInAllMeshes = {};

        var attributes0 = meshes[0].attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name)) {
                var attribute = attributes0[name];
                var numberOfComponents = attribute.values.length;
                var inAllMeshes = true;

                // Does this same attribute exist in all meshes?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = meshes[i].attributes[name];

                    if ((typeof otherAttribute === 'undefined') ||
                        (attribute.componentDatatype !== otherAttribute.componentDatatype) ||
                        (attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute) ||
                        (attribute.normalize !== otherAttribute.normalize)) {

                        inAllMeshes = false;
                        break;
                    }

                    numberOfComponents += otherAttribute.values.length;
                }

                if (inAllMeshes) {
                    attributesInAllMeshes[name] = new GeometryAttribute({
                        componentDatatype : attribute.componentDatatype,
                        componentsPerAttribute : attribute.componentsPerAttribute,
                        normalize : attribute.normalize,
                        values : attribute.componentDatatype.createTypedArray(numberOfComponents)
                    });
                }
            }
        }

        return attributesInAllMeshes;
    }

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} meshes is required and must have length greater than zero.
     * @exception {DeveloperError} All meshes must have the same modelMatrix.
     */
    GeometryFilters.combine = function(meshes) {
        if ((typeof meshes === 'undefined') || (meshes.length < 1)) {
            throw new DeveloperError('meshes is required and must have length greater than zero.');
        }

        var length = meshes.length;

        if (length === 1) {
            return meshes[0];
        }

        var name;
        var i;
        var j;
        var k;

        var m = meshes[0].modelMatrix;
        for (i = 1; i < length; ++i) {
            if (!Matrix4.equals(meshes[i].modelMatrix, m)) {
                throw new DeveloperError('All meshes must have the same modelMatrix.');
            }
        }

        // Find subset of attributes in all meshes
        var attributes = findAttributesInAllMeshes(meshes);
        var values;
        var sourceValues;
        var sourceValuesLength;

        // PERFORMANCE_IDEA: Interleave here instead of createVertexArrayFromMesh to save a copy.
        // This will require adding offset and stride to the mesh.

        // Combine attributes from each mesh into a single typed array
        for (name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                values = attributes[name].values;

                k = 0;
                for (i = 0; i < length; ++i) {
                    sourceValues = meshes[i].attributes[name].values;
                    sourceValuesLength = sourceValues.length;

                    for (j = 0; j < sourceValuesLength; ++j) {
                        values[k++] = sourceValues[j];
                    }
                }
            }
        }

        // PERFORMANCE_IDEA: Could combine with fitToUnsignedShortIndices, but it would start to get ugly.

        // Combine index lists

        // First, determine the size of a typed array per primitive type
        var numberOfIndices = {};
        var indexLists;
        var indexListsLength;
        var indices;

        for (i = 0; i < length; ++i) {
            indexLists = meshes[i].indexLists;
            indexListsLength = indexLists.length;

            for (j = 0; j < indexListsLength; ++j) {
                indices = indexLists[j];

                numberOfIndices[indices.primitiveType] = (typeof numberOfIndices[indices.primitiveType] !== 'undefined') ?
                    (numberOfIndices[indices.primitiveType] += indices.values.length) : indices.values.length;
            }
        }

        // Next, allocate a typed array for indices per primitive type
        var combinedIndexLists = [];
        var indexListsByPrimitiveType = {};

        for (name in numberOfIndices) {
            if (numberOfIndices.hasOwnProperty(name)) {
                var num = numberOfIndices[name];

                if (num < 60 * 1024) {
                    values = new Uint16Array(num);
                } else {
                    values = new Uint32Array(num);
                }

                combinedIndexLists.push(new GeometryIndices({
                    primitiveType : PrimitiveType[name],
                    values : values
                }));

                indexListsByPrimitiveType[name] = {
                    values : values,
                    currentOffset : 0
                };
            }
        }

        // Finally, combine index lists with the same primitive type
        var offset = 0;

        for (i = 0; i < length; ++i) {
            indexLists = meshes[i].indexLists;
            indexListsLength = indexLists.length;

            for (j = 0; j < indexListsLength; ++j) {
                indices = indexLists[j];
                sourceValues = indices.values;
                sourceValuesLength = sourceValues.length;
                var destValues = indexListsByPrimitiveType[indices.primitiveType].values;
                var n = indexListsByPrimitiveType[indices.primitiveType].currentOffset;

                for (k = 0; k < sourceValuesLength; ++k) {
                    destValues[n++] = offset + sourceValues[k];
                }

                indexListsByPrimitiveType[indices.primitiveType].currentOffset = n;
            }

            var attrs = meshes[i].attributes;
            for (name in attrs) {
                if (attrs.hasOwnProperty(name)) {
                    offset += attrs[name].values.length / attrs[name].componentsPerAttribute;
                    break;
                }
            }
        }

        // Create bounding sphere that includes all meshes
        var boundingSphere;

        for (i = 0; i < length; ++i) {
            var bs = meshes[i].boundingSphere;
            if (typeof bs === 'undefined') {
                // If any meshes have an undefined bounding sphere, then so does the combined mesh
                boundingSphere = undefined;
                break;
            }

            if (typeof boundingSphere === 'undefined') {
                boundingSphere = bs.clone();
            } else {
                BoundingSphere.union(boundingSphere, bs, boundingSphere);
            }
        }

        return new Geometry({
            attributes : attributes,
            indexLists : combinedIndexLists,
            boundingSphere : boundingSphere
        });
    };

    /**
     * Computes the normals of all vertices in a mesh based on the normals of triangles that include the vertex.
     * This assumes a counter-clockwise vertex winding order.
     *
     * @param {Geometry} mesh The mesh to filter, which is modified in place.
     * @param {Object} mesh.attributes.position
     *
     * @returns The modified <code>mesh</code> argument.
     *
     * @exception {DeveloperError} mesh.attributes.position.values is required
     * @exception {DeveloperError} mesh.attributes.position.values.length must be a multiple of 3
     *
     * @example
     * mesh = GeometryFilters.computeNormal(mesh);
     *
     */
    var normal = new Cartesian3();
    var v0 = new Cartesian3();
    var v1 = new Cartesian3();
    var v2 = new Cartesian3();
    GeometryFilters.computeNormal = function(mesh) {
        if (typeof mesh === 'undefined') {
            throw new DeveloperError('mesh is required.');
        }
        var attributes = mesh.attributes;
        if (typeof attributes === 'undefined' || typeof attributes.position === 'undefined' ||
                typeof attributes.position.values === 'undefined') {
            throw new DeveloperError('mesh.attributes.position.values is required');
        }
        var vertices = mesh.attributes.position.values;
        if (mesh.attributes.position.componentsPerAttribute !== 3 || vertices.length % 3 !== 0) {
            throw new DeveloperError('mesh.attributes.position.values.length must be a multiple of 3');
        }
        var indexLists = mesh.indexLists;
        if (typeof indexLists === 'undefined') {
            return mesh;
        }

        var length = indexLists.length;
        for (var k = 0; k < length; k++) {
            var indices = indexLists[k].values;
            if (indexLists[k].primitiveType !== PrimitiveType.TRIANGLES || typeof indices === 'undefined' ||
                    indices.length < 2 || indices.length % 3 !== 0) {
                continue;
            }

            var numVertices = mesh.attributes.position.values.length/3;
            var numIndices = indices.length;
            var normalsPerVertex = new Array(numVertices);
            var normalsPerTriangle = new Array(numIndices/3);
            var normalIndices = new Array(numIndices);

            for (var i = 0; i < numVertices; i++) {
                normalsPerVertex[i] = {
                        indexOffset: 0,
                        count: 0,
                        currentCount: 0
                    };
            }

            var j = 0;
            for (i = 0; i < numIndices; i+=3) {
                var i0 = indices[i];
                var i1 = indices[i+1];
                var i2 = indices[i+2];
                var i03 = i0*3;
                var i13 = i1*3;
                var i23 = i2*3;

                v0.x = vertices[i03];
                v0.y = vertices[i03+1];
                v0.z = vertices[i03+2];
                v1.x = vertices[i13];
                v1.y = vertices[i13+1];
                v1.z = vertices[i13+2];
                v2.x = vertices[i23];
                v2.y = vertices[i23+1];
                v2.z = vertices[i23+2];

                normalsPerVertex[i0].count++;
                normalsPerVertex[i1].count++;
                normalsPerVertex[i2].count++;

                v1.subtract(v0, v1);
                v2.subtract(v0, v2);
                normalsPerTriangle[j] = v1.cross(v2);
                j++;
            }

            var indexOffset = 0;
            for (i = 0; i < numVertices; i++) {
                normalsPerVertex[i].indexOffset += indexOffset;
                indexOffset += normalsPerVertex[i].count;
            }

            j = 0;
            var vertexNormalData;
            for (i = 0; i < numIndices; i+=3) {
                vertexNormalData = normalsPerVertex[indices[i]];
                var index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
                normalIndices[index] = j;
                vertexNormalData.currentCount++;

                vertexNormalData = normalsPerVertex[indices[i+1]];
                index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
                normalIndices[index] = j;
                vertexNormalData.currentCount++;

                vertexNormalData = normalsPerVertex[indices[i+2]];
                index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
                normalIndices[index] = j;
                vertexNormalData.currentCount++;

                j++;
            }

            if (typeof mesh.attributes.normal === 'undefined') {
                mesh.attributes.normal = new GeometryAttribute({
                        componentDatatype: ComponentDatatype.FLOAT,
                        componentsPerAttribute: 3,
                        values: new Array(numVertices * 3)
                });
            }
            var normalValues = mesh.attributes.normal.values;
            for (i = 0; i < numVertices; i++) {
                var i3 = i * 3;
                vertexNormalData = normalsPerVertex[i];
                if (vertexNormalData.count > 0) {
                    Cartesian3.ZERO.clone(normal);
                    for (j = 0; j < vertexNormalData.count; j++) {
                        normal.add(normalsPerTriangle[normalIndices[vertexNormalData.indexOffset + j]], normal);
                    }
                    normal.normalize(normal);
                    normalValues[i3] = normal.x;
                    normalValues[i3+1] = normal.y;
                    normalValues[i3+2] = normal.z;
                } else {
                    normalValues[i3] = 0;
                    normalValues[i3+1] = 0;
                    normalValues[i3+2] = 1;
                }
            }
        }

        return mesh;
    };

    /**
     * Computes the tangent and binormal of all vertices in a geometry
     * This assumes a counter-clockwise vertex winding order.
     *
     * Based on: Lengyel, Eric. “Computing Tangent Space Basis Vectors for an Arbitrary Mesh”. Terathon Software 3D Graphics Library, 2001. http://www.terathon.com/code/tangent.html
     *
     * @param {Geometry} geometry The geometry for which to calculate tangents and binormals, which is modified in place.
     * @param {Object} geometry.attributes.position The vertices of the geometry
     * @param {Object} geometry.attributes.normal The normals of the vertices
     * @param {Object} geometry.attributes.st The texture coordinates
     *
     * @returns The modified <code>geometry</code> argument.
     *
     * @exception {DeveloperError} geometry.attributes.position.values is required
     * @exception {DeveloperError} geometry.attributes.position.values.length must be a multiple of 3
     * @exception {DeveloperError} geometry.attributes.normal.values is required
     * @exception {DeveloperError} geometry.attributes.normal.values.length must be a multiple of 3
     * @exception {DeveloperError} geometry.attributes.st.values is required
     * @exception {DeveloperError} geometry.attributes.st.values.length must be a multiple of 2
     *
     * @example
     * geometry = GeometryFilters.computeTangentAndBinormal(geometry);
     *
     */
    var normalScratch = new Cartesian3();
    var normalScale = new Cartesian3();
    var tScratch = new Cartesian3();
    GeometryFilters.computeTangentAndBinormal = function(geometry) {
        if (typeof geometry === 'undefined') {
            throw new DeveloperError('geometry is required.');
        }
        var attributes = geometry.attributes;
        if (typeof attributes === 'undefined' || typeof attributes.position === 'undefined' ||
                typeof attributes.position.values === 'undefined') {
            throw new DeveloperError('geometry.attributes.position.values is required');
        }
        var vertices = geometry.attributes.position.values;
        if (geometry.attributes.position.componentsPerAttribute !== 3 || vertices.length % 3 !== 0) {
            throw new DeveloperError('geometry.attributes.position.values.length must be a multiple of 3');
        }
        if (typeof attributes.normal === 'undefined' ||
                typeof attributes.normal.values === 'undefined') {
            throw new DeveloperError('geometry.attributes.normal.values is required');
        }
        var normals = geometry.attributes.normal.values;
        if (geometry.attributes.normal.componentsPerAttribute !== 3 || normals.length % 3 !== 0) {
            throw new DeveloperError('geometry.attributes.normals.values.length must be a multiple of 3');
        }
        if (typeof attributes.st === 'undefined' ||
                typeof attributes.st.values === 'undefined') {
            throw new DeveloperError('geometry.attributes.st.values is required');
        }
        var st = geometry.attributes.st.values;
        if (geometry.attributes.st.componentsPerAttribute !== 2 || st.length % 2 !== 0) {
            throw new DeveloperError('geometry.attributes.st.values.length must be a multiple of 2');
        }

        var indexLists = geometry.indexLists;
        if (typeof indexLists === 'undefined') {
            return geometry;
        }

        var length = indexLists.length;
        for (var k = 0; k < length; k++) {
            var indices = indexLists[k].values;
            if (indexLists[k].primitiveType !== PrimitiveType.TRIANGLES || typeof indices === 'undefined' ||
                    indices.length < 2 || indices.length % 3 !== 0) {
                continue;
            }

            var numVertices = geometry.attributes.position.values.length/3;
            var numIndices = indices.length;
            var tan1 = new Array(numVertices*3);

            for (var i = 0; i < tan1.length; i++) {
                tan1[i] = 0;
            }

            var i03;
            var i13;
            var i23;
            for (i = 0; i < numIndices; i+=3) {
                var i0 = indices[i];
                var i1 = indices[i+1];
                var i2 = indices[i+2];
                i03 = i0*3;
                i13 = i1*3;
                i23 = i2*3;
                var i02 = i0*2;
                var i12 = i1*2;
                var i22 = i2*2;

                var ux = vertices[i03];
                var uy = vertices[i03+1];
                var uz = vertices[i03+2];

                var wx = st[i02];
                var wy = st[i02+1];
                var t1 = st[i12+1] - wy;
                var t2 = st[i22+1] - wy;

                var r = 1.0/((st[i12] - wx) * t2 - (st[i22] - wx) * t1);
                var sdirx = (t2 * (vertices[i13] - ux) - t1 * (vertices[i23] - ux)) * r;
                var sdiry = (t2 * (vertices[i13+1] - uy) - t1 * (vertices[i23+1] - uy)) * r;
                var sdirz = (t2 * (vertices[i13+2] - uz) - t1 * (vertices[i23+2] - uz)) * r;

                tan1[i03] += sdirx;
                tan1[i03+1] += sdiry;
                tan1[i03+2] += sdirz;

                tan1[i13] += sdirx;
                tan1[i13+1] += sdiry;
                tan1[i13+2] += sdirz;

                tan1[i23] += sdirx;
                tan1[i23+1] += sdiry;
                tan1[i23+2] += sdirz;
            }
            var binormalValues = new Array(numVertices * 3);
            var tangentValues = new Array(numVertices * 3);
            for (i = 0; i < numVertices; i++) {
                i03 = i*3;
                i13 = i03+1;
                i23 = i03+2;

                var n = Cartesian3.fromArray(normals, i03, normalScratch);
                var t = Cartesian3.fromArray(tan1, i03, tScratch);
                var scalar = n.dot(t);
                n.multiplyByScalar(scalar, normalScale);
                t.subtract(normalScale, t).normalize(t);
                tangentValues[i03] = t.x;
                tangentValues[i13] = t.y;
                tangentValues[i23] = t.z;
                n.cross(t, t).normalize(t);
                binormalValues[i03] = t.x;
                binormalValues[i13] = t.y;
                binormalValues[i23] = t.z;
            }
            if (typeof geometry.attributes.tangent === 'undefined') {
                geometry.attributes.tangent = new GeometryAttribute({
                        componentDatatype: ComponentDatatype.FLOAT,
                        componentsPerAttribute: 3,
                        values: tangentValues
                });
            } else {
                geometry.attributes.tangent.values = tangentValues;
            }
            if (typeof geometry.attributes.binormal === 'undefined') {
                geometry.attributes.binormal = new GeometryAttribute({
                        componentDatatype: ComponentDatatype.FLOAT,
                        componentsPerAttribute: 3,
                        values: binormalValues
                });
            } else {
                geometry.attributes.binormal.values = binormalValues;
            }
        }
        return geometry;
    };

    return GeometryFilters;
});
