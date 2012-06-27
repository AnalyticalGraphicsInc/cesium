/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        './Projections',
        './WebMercatorTilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        Extent,
        CesiumMath,
        Projections,
        WebMercatorTilingScheme) {
    "use strict";

    /**
     * Provides tile images hosted by OpenStreetMap.
     *
     * @name OpenStreetMapTileProvider
     * @constructor
     *
     * @param {String} description.url The OpenStreetMap url.
     * @param {String} [description.fileExtension='png'] The file extension for images on the server.
     * @param {Object} [description.proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {String} [description.credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A string crediting the data source, which is displayed on the canvas.
     *
     * @see SingleTileProvider
     * @see BingMapsTileProvider
     * @see ArcGISMapServerTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://wiki.openstreetmap.org/wiki/Main_Page'>OpenStreetMap Wiki</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * // OpenStreetMap tile provider
     * var osm = new OpenStreetMapTileProvider({
     *     url : 'http://tile.openstreetmap.org/'
     * });
     */
    function OpenStreetMapTileProvider(description) {
        description = defaultValue(description, {});

        this._url = defaultValue(description.url, 'http://tile.openstreetmap.org/');
        this._fileExtension = defaultValue(description.fileExtension, 'png');
        this._proxy = description.proxy;

        // TODO: should not hard-code, get from server?
        this._credit = defaultValue(description.credit, 'MapQuest, Open Street Map and contributors, CC-BY-SA');

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @type {Extent}
         */
        this.maxExtent = new Extent(-CesiumMath.PI,
                                    CesiumMath.toRadians(-85.05112878),
                                    CesiumMath.PI,
                                    CesiumMath.toRadians(85.05112878));

        /**
         * The width of every image loaded.
         *
         * @type {Number}
         */
        this.tileWidth = 256;

        /**
         * The height of every image loaded.
         *
         * @type {Number}
         */
        this.tileHeight = 256;

        /**
         * The maximum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMax = 18;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.MERCATOR;

        /**
         * The tiling scheme used by this tile provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = new WebMercatorTilingScheme();

        /**
         * True if the tile provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = true;

        this._logo = undefined;
    }

    /**
     * Loads the image for <code>tile</code>.
     *
     * @memberof OpenStreetMapTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than zero
     * or greater than <code>zoomMax</code>.
     */
    OpenStreetMapTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
        if (tile.zoom < 0 || tile.zoom > this.zoomMax) {
            throw new DeveloperError('tile.zoom must be in the range [0, zoomMax].');
        }

        var image = new Image();
        image.onload = onload;
        image.onerror = onerror;
        image.crossOrigin = '';

        var url = this._url + tile.zoom + '/' + tile.x + '/' + tile.y + '.' + this._fileExtension;
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        image.src = url;

        return image;
    };

    /**
     * DOC_TBA
     * @memberof OpenStreetMapTileProvider
     */
    OpenStreetMapTileProvider.prototype.getLogo = function() {
        if (!this._logo) {
            var canvas = document.createElement('canvas');
            canvas.width = 800.0;
            canvas.height = 20.0;

            var context = canvas.getContext('2d');
            context.fillStyle = '#fff';
            context.font = '12px sans-serif';
            context.textBaseline = 'top';
            context.fillText(this._credit, 0, 0);

            this._logo = canvas;
        }

        return this._logo;
    };

    return OpenStreetMapTileProvider;
});