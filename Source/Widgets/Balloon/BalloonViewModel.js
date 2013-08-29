/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Scene/SceneTransforms',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        defaultValue,
        defineProperties,
        DeveloperError,
        SceneTransforms,
        knockout) {
    "use strict";

    var pointMin = 0;
    var screenSpacePos = new Cartesian2();

    function shiftPosition(viewModel, position, point, screen){
        var pointX;
        var pointY;
        var posX;
        var posY;
        var container = viewModel._container;
        var containerWidth = container.clientWidth;
        var containerHeight = container.clientHeight;

        viewModel._maxWidth = containerWidth*0.50 + 'px';
        viewModel._maxHeight = containerHeight*0.50 + 'px';
        var pointMaxY = containerHeight - 15;
        var pointMaxX = containerWidth - 16;
        var pointXOffset = position.x - 15;

        var balloonElement = viewModel._balloonElement;
        var width = balloonElement.offsetWidth;
        var height = balloonElement.offsetHeight;

        var posMaxY = containerHeight - height;
        var posMaxX = containerWidth - width - 2;
        var posMin = 0;
        var posXOffset = position.x - width/2;

        var top = position.y > containerHeight;
        var bottom = position.y < -10;
        var left = position.x < 0;
        var right = position.x > containerWidth;

        if (viewModel.showPoint) {
            if (bottom) {
                posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
                posY = 15;
                pointX = Math.min(Math.max(pointXOffset, pointMin), pointMaxX - 15);
                pointY = pointMin;
                viewModel._down = true;
                viewModel._up = false;
                viewModel._left = false;
                viewModel._right = false;
            } else if (top) {
                posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
                posY = containerHeight - height - 14;
                pointX = Math.min(Math.max(pointXOffset, pointMin), pointMaxX - 15);
                pointY = pointMaxY;
                viewModel._down = false;
                viewModel._up = true;
                viewModel._left = false;
                viewModel._right = false;
            } else if (left) {
                posX = 15;
                posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
                pointX = pointMin;
                pointY = Math.min(Math.max((position.y - 16), pointMin), pointMaxY - 15);
                viewModel._down = false;
                viewModel._up = false;
                viewModel._left = true;
                viewModel._right = false;
            } else if (right) {
                posX = containerWidth - width - 15;
                posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
                pointX = pointMaxX;
                pointY = Math.min(Math.max((position.y - 16), pointMin), pointMaxY - 15);
                viewModel._down = false;
                viewModel._up = false;
                viewModel._left = false;
                viewModel._right = true;
            } else {
                posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
                posY = Math.min(Math.max((position.y + 25), posMin), posMaxY);
                pointX = pointXOffset;
                pointY = Math.min(position.y + 10, posMaxY - 15);
                viewModel._down = true;
                viewModel._up = false;
                viewModel._left = false;
                viewModel._right = false;
            }
        } else {
            if (bottom) {
                posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
                posY = 0;
            } else if (top) {
                posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
                posY = containerHeight - height;
            } else if (left) {
                posX = 0;
                posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
            } else if (right) {
                posX = containerWidth - width;
                posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
            } else {
                posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
                posY = Math.min(Math.max(position.y, posMin), posMaxY);
            }
        }


        viewModel._pointX = pointX + 'px';
        viewModel._pointY = pointY + 'px';

        viewModel._positionX = posX + 'px';
        viewModel._positionY = posY + 'px';
    }

    /**
     * The view model for {@link Balloon}.
     * @alias BalloonViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Element} balloonElement The element containing all elements that make up the balloon.
     * @param {Element} [container = document.body] The element containing the balloon.
     *
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} balloonElement is required.
     *
     */
    var BalloonViewModel = function(scene, balloonElement, container) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        if (typeof balloonElement === 'undefined') {
            throw new DeveloperError('balloonElement is required.');
        }

        this._scene = scene;
        this._container = defaultValue(container, document.body);
        this._balloonElement = balloonElement;
        this._content = '';
        this._position = undefined;
        this._updateContent = false;
        this._timerRunning = false;
        this._defaultPosition = {x: this._container.clientWidth, y: this._container.clientHeight/2};
        this._computeScreenSpacePosition = function(position, result) {
            return SceneTransforms.wgs84ToWindowCoordinates(scene, position, result);
        };
        /**
         * Stores the HTML content of the balloon as a string.
         * @memberof BalloonViewModel.prototype
         *
         * @type {String}
         */
        this._contentHTML = '';

        /**
         * The x screen position of the balloon.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Number}
         */
        this._positionX = '0';

        /**
         * The y screen position of the balloon.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Number}
         */
        this._positionY = '0';

        /**
         * The x screen position of the balloon point.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Number}
         */
        this._pointX = '0';

        /**
         * The y screen position of the balloon point
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this._pointY = '0';

        /**
         * Determines the visibility of the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showBalloon = false;

        /**
         * Determines the visibility of the balloon point
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showPoint = true;

        /**
         * True of the balloon point should be pointing down.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this._down = true;

        /**
         * True of the balloon point should be pointing up.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this._up = false;

        /**
         * True of the balloon point should be pointing left.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this._left = false;

        /**
         * True if the balloon point should be pointing right.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this._right = false;

        /**
         * The maximum width of the balloon element.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Number}
         */
        this._maxWidth = this._container.clientWidth*0.95 + 'px';

        /**
         * The maximum height of the balloon element.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Number}
         */
        this._maxHeight = this._container.clientHeight*0.50 + 'px';

        knockout.track(this, ['showPoint', 'showBalloon', '_positionX', '_positionY', '_pointX', '_pointY',
                              '_down', '_up', '_left', '_right', '_maxWidth', '_maxHeight', '_contentHTML']);
    };

    /**
     * Updates the view of the balloon to match the position and content properties of the view model
     * @memberof BalloonViewModel
     */
    BalloonViewModel.prototype.update = function() {
        if (!this._timerRunning) {
            if (this._updateContent) {
                this.showBalloon = false;
                this._timerRunning = true;
                var that = this;
                //timeout needed so that re-positioning occurs after showBalloon=false transition is complete
                setTimeout(function () {
                    that._contentHTML = that._content;
                    if (typeof that._position !== 'undefined') {
                        var pos = that._computeScreenSpacePosition(that._position, screenSpacePos);
                        pos = shiftPosition(that, pos);
                    }
                    that.showBalloon = true;
                    that._timerRunning = false;
                }, 100);
                this._updateContent = false;
            } else  if (this.showBalloon) {
                var pos;
                if (typeof this._position !== 'undefined'){
                    pos = this._computeScreenSpacePosition(this._position, screenSpacePos);
                    this.showPoint = true;
                }  else {
                    pos = this._defaultPosition;
                    this.showPoint = false;
                }

                pos = shiftPosition(this, pos);
            }
        }
    };

    defineProperties(BalloonViewModel.prototype, {
        /**
         * Gets or sets the HTML element containing the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            },
            set : function(value) {
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                this._container = value;
            }
        },
        /**
         * Gets or sets the HTML element that makes up the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Element}
         */
        balloonElement : {
            get : function() {
                return this._balloonElement;
            },
            set : function(value) {
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                this._balloonElement = value;
            }
        },
        /**
         * Gets or sets the content of the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Element}
         */
        content: {
            set : function(value) {
                if (typeof value === 'undefined') {
                    this._content = '';
                } else {
                    this._content = value;
                }
                this._updateContent = true;
            }
        },
        /**
         * Gets the scene to control.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },
        /**
         * Sets the default position of the balloon.
         * @memberof BalloonViewModel.prototype
         *
         * @type {Cartesain2}
         */
        defaultPosition : {
            set : function(value) {
                if (typeof value !== 'undefined') {
                    this._defaultPosition.x = value.x;
                    this._defaultPosition.y = value.y;
                }
            }
        },
        /**
         * Sets the function for converting the world position of the object to the screen space position.
         * Expects the {Cartesian3} parameter for the position and the optional {Cartesian2} parameter for the result.
         * Should return a {Cartesian2}.
         *
         * Defaults to SceneTransforms.wgs84ToWindowCoordinates
         *
         * @example
         * balloonViewModel.computeScreenSpacePosition = function(position, result) {
         *     return Cartesian2.clone(position, result);
         * };
         *
         * @memberof BalloonViewModel
         *
         * @type {Function}
         */
        computeScreenSpacePosition: {
            set: function(value) {
                this._computeScreenSpacePosition = value;
            }
        },
        /**
         * Sets the world position of the object for which to display the balloon.
         * @memberof BalloonViewModel
         *
         * @type {Cartesian3}
         */
        position: {
            set: function(value) {
                this._position = value;
            }
        }
    });

    return BalloonViewModel;
});
