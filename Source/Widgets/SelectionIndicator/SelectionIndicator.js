define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../getElement',
        './SelectionIndicatorViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        knockout,
        getElement,
        SelectionIndicatorViewModel) {
    'use strict';

        /**
             * A widget for displaying an indicator on a selected object.
             *
             * @alias SelectionIndicator
             * @constructor
             *
             * @param {Element|String} container The DOM element or ID that will contain the widget.
             * @param {Scene} scene The Scene instance to use.
             *
             * @exception {DeveloperError} Element with id "container" does not exist in the document.
             */
        class SelectionIndicator {
            constructor(container, scene) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(container)) {
                    throw new DeveloperError('container is required.');
                }
                //>>includeEnd('debug')
                container = getElement(container);
                this._container = container;
                var el = document.createElement('div');
                el.className = 'cesium-selection-wrapper';
                el.setAttribute('data-bind', '\
style: { "top" : _screenPositionY, "left" : _screenPositionX },\
css: { "cesium-selection-wrapper-visible" : isVisible }');
                container.appendChild(el);
                this._element = el;
                var svgNS = 'http://www.w3.org/2000/svg';
                var path = 'M -34 -34 L -34 -11.25 L -30 -15.25 L -30 -30 L -15.25 -30 L -11.25 -34 L -34 -34 z M 11.25 -34 L 15.25 -30 L 30 -30 L 30 -15.25 L 34 -11.25 L 34 -34 L 11.25 -34 z M -34 11.25 L -34 34 L -11.25 34 L -15.25 30 L -30 30 L -30 15.25 L -34 11.25 z M 34 11.25 L 30 15.25 L 30 30 L 15.25 30 L 11.25 34 L 34 34 L 34 11.25 z';
                var svg = document.createElementNS(svgNS, 'svg:svg');
                svg.setAttribute('width', 160);
                svg.setAttribute('height', 160);
                svg.setAttribute('viewBox', '0 0 160 160');
                var group = document.createElementNS(svgNS, 'g');
                group.setAttribute('transform', 'translate(80,80)');
                svg.appendChild(group);
                var pathElement = document.createElementNS(svgNS, 'path');
                pathElement.setAttribute('data-bind', 'attr: { transform: _transform }');
                pathElement.setAttribute('d', path);
                group.appendChild(pathElement);
                el.appendChild(svg);
                var viewModel = new SelectionIndicatorViewModel(scene, this._element, this._container);
                this._viewModel = viewModel;
                knockout.applyBindings(this._viewModel, this._element);
            }
            /**
                 * @returns {Boolean} true if the object has been destroyed, false otherwise.
                 */
            isDestroyed() {
                return false;
            }
            /**
                 * Destroys the widget.  Should be called if permanently
                 * removing the widget from layout.
                 */
            destroy() {
                var container = this._container;
                knockout.cleanNode(this._element);
                container.removeChild(this._element);
                return destroyObject(this);
            }
        }

    defineProperties(SelectionIndicator.prototype, {
        /**
         * Gets the parent container.
         * @memberof SelectionIndicator.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the view model.
         * @memberof SelectionIndicator.prototype
         *
         * @type {SelectionIndicatorViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });



    return SelectionIndicator;
});
