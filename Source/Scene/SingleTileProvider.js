/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        './Projections',
        './GeographicTilingScheme'
    ], function(
        DeveloperError,
        Extent,
        CesiumMath,
        Projections,
        GeographicTilingScheme) {
    "use strict";

    /**
     * Provides a single, top-level tile.
     *
     * @name SingleTileProvider
     * @constructor
     *
     * @param {String} url The url for the tile.
     * @param {Object} [proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} url is required.
     *
     * @see ArcGISMapServerTileProvider
     * @see BingMapsTileProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     */
    function SingleTileProvider(url, proxy) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        this._url = url;
        this._proxy = proxy;

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @constant
         * @type {Extent}
         */
        this.maxExtent = Extent.MAX_VALUE;

        /**
         * The maximum zoom level that can be requested.
         *
         * @constant
         * @type {Number}
         */
        this.zoomMax = 0;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.WGS84;

        /**
         * The tiling scheme used by this tile provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX: 1,
            numberOfLevelZeroTilesY: 1
        });

        /**
         * True if the tile provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = true;
    }

    /**
     * Loads the top-level tile.
     *
     * @memberof SingleTileProvider
     *
     * @param {Tile} tile The top-level tile.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than zero
     * or greater than <code>zoomMax</code>.
     */
    SingleTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
        if (tile.zoom < 0 || tile.zoom > this.zoomMax) {
            throw new DeveloperError('tile.zoom must be in the range [0, zoomMax].');
        }

        var image = new Image();
        image.onload = onload;
        image.onerror = onerror;
        image.crossOrigin = '';

        var url = this._url;
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }
        image.src = url;

        return image;
    };

    return SingleTileProvider;
});