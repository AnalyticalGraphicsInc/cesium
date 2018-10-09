define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../createCommand'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        knockout,
        createCommand) {
    'use strict';

        /**
             * The view model for {@link HomeButton}.
             * @alias HomeButtonViewModel
             * @constructor
             *
             * @param {Scene} scene The scene instance to use.
             * @param {Number} [duration] The duration of the camera flight in seconds.
             */
        class HomeButtonViewModel {
            constructor(scene, duration) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(scene)) {
                    throw new DeveloperError('scene is required.');
                }
                //>>includeEnd('debug');
                this._scene = scene;
                this._duration = duration;
                var that = this;
                this._command = createCommand(function() {
                    that._scene.camera.flyHome(that._duration);
                });
                /**
                 * Gets or sets the tooltip.  This property is observable.
                 *
                 * @type {String}
                 */
                this.tooltip = 'View Home';
                knockout.track(this, ['tooltip']);
            }
        }

    defineProperties(HomeButtonViewModel.prototype, {
        /**
         * Gets the scene to control.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the Command that is executed when the button is clicked.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Command}
         */
        command : {
            get : function() {
                return this._command;
            }
        },

        /**
         * Gets or sets the the duration of the camera flight in seconds.
         * A value of zero causes the camera to instantly switch to home view.
         * The duration will be computed based on the distance when undefined.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Number|undefined}
         */
        duration : {
            get : function() {
                return this._duration;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (defined(value) && value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                //>>includeEnd('debug');

                this._duration = value;
            }
        }
    });

    return HomeButtonViewModel;
});
