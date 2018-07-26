/*jshint undef: true, browser:true, nomen: true */
/*jslint browser:true, nomen: true */
/*global mx, mxui, define, require, console, cordova, logger, resolveLocalFileSystemURL, Media */
/*


    Playback audio using the device functions
    =======================================


*/
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/_base/lang"

], function (declare, _WidgetBase, dojoStyle, dojoConstruct, dojoOn, lang) {
    "use strict";

    return declare("AudioRecorderWidget.widget.AudioPlaybackWidget", [ _WidgetBase ], {

        // Parameters configured in the Modeler.

        // Internal variables.
        _contextObj: null,
        _playButton: null,
        _stopButton: null,
        _documentDirectory: null,
        _recordingPath: null,
        _media: null,

        constructor: function () {
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            // We only use the new WKWebView
            this._documentDirectory = cordova.wkwebview.storageDir;

            this._playButton = this._placeButtonWithIcon("play");
            this._stopButton = this._placeButtonWithIcon("stop");
            dojoOn(this._playButton, "click", lang.hitch(this, this._handlePlayButtonClick));
            dojoOn(this._stopButton, "click", lang.hitch(this, this._handleStopButtonClick));
        },

        _placeButtonWithIcon: function (glyphiconName) {
            var buttonHtml;

            buttonHtml =
                "<button type='button' class='btn mx-button btn-default'><span class='glyphicon glyphicon-" + 
                glyphiconName + 
                "'></span></button>";
            return dojoConstruct.place(buttonHtml, this.domNode);
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._updateRendering(callback);
        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
        },

        _handlePlayButtonClick: function () {
            logger.debug(this.id + "._handlePlayButtonClick");
            var thisObj = this;
            if (!this._media) {
                console.log("Start media playback");
                this._media = new Media(this._recordingPath, function(e) {
                    thisObj._media.release();
                    thisObj._media = null;
                    console.log("Media playback stopped, released media object");
                }, function (err) {
                    console.log("media playback error: ", err);
                }, function (statusCode) {
                    console.log("media playback status: " + statusCode);
                });
                this._media.play();
            }
        },

        _handleStopButtonClick: function () {
            logger.debug(this.id + "._handleStopButtonClick");
            this._stopPlayback();
        },

        _stopPlayback: function () {
            logger.debug(this.id + "._stopPlayback");
            console.log("Stop media playback");
            if (this._media) {
                this._media.stop();
                this._media.release();
                this._media = null;
            }
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");
            var guid;

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
                guid = this._contextObj.getGuid();
                this._recordingPath = this._documentDirectory + "files/documents/" + guid.replace("GUID:", "GUID_");
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            this._executeCallback(callback, "_updateRendering");
        },

        // Shorthand for executing a callback, adds logging to your inspector
        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["AudioRecorderWidget/widget/AudioPlaybackWidget"]);
