/*jshint undef: true, browser:true, nomen: true */
/*jslint browser:true, nomen: true */
/*global mx, mxui, define, require, console, cordova, logger, resolveLocalFileSystemURL */
/*


    Record audio using the device functions
    =======================================


*/
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/dom-style",
    "dojo/_base/lang"

], function (declare, _WidgetBase, dojoStyle, lang) {
    "use strict";

    return declare("AudioRecorderWidget.widget.AudioRecorderWidget", [ _WidgetBase ], {

        // Parameters configured in the Modeler.

        // Internal variables.
        _contextObj: null,

        constructor: function () {
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._updateRendering(callback);
        },

        // resize: function (box) {
        //     logger.debug(this.id + ".resize");
        // },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
                this._startRecording();
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            this._executeCallback(callback, "_updateRendering");
        },

        _startRecording: function () {

            if (typeof navigator.device.capture.captureAudio === "undefined") {
                mx.ui.error("Audio device not detected.");
                return;
            }

            // Start audio capture, default is to capture one file
            navigator.device.capture.captureAudio(lang.hitch(this, this._captureSuccess), lang.hitch(this, this._captureError));
        },

        _captureSuccess: function (mediaFiles) {
            var path,
                thisObj = this;

            // Result is always an array, if recording succeeded, array has one element.
            if (mediaFiles.length) {
                path = mediaFiles[0].fullPath;
                // Resolve path into a file entry
                resolveLocalFileSystemURL(path, function (fileEntry) {
                    fileEntry.file(function(file) {
                        // Read contents of the file
                        var reader = new FileReader();
                        reader.onloadend = function(e) {
                            // Save contents of the file in the context object
                            window.mx.data.saveDocument(
                                thisObj._contextObj.getGuid(),
                                "audio",
                                {},
                                new Blob([ this.result ]),
                                lang.hitch(thisObj, thisObj._saveDocumentCallback),
                                lang.hitch(thisObj, thisObj._showError)
                            );
                        };
                        reader.readAsBinaryString(file);
                    });                    
                }, function (error) {
                    console.log("resolveLocalFileSystemURL error");
                    console.dir(error);
                });

            }
        },

        _saveDocumentCallback: function () {
            logger.debug(this.id + "._saveDocumentCallback");

        },

        _showError: function (e) {
            mx.ui.error("Saving generated PDF failed with error code " + e.code);
        },

        _captureError: function (error) {
            if (error) {
                mx.ui.error("Audio capture failed, error: " + error.code);
            } else {
                mx.ui.error("Audio capture failed.");
            }
        },

        // Shorthand for running a microflow
        _execMf: function (mf, guid, cb) {
            logger.debug(this.id + "._execMf");
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    callback: lang.hitch(this, function (objs) {
                        if (cb && typeof cb === "function") {
                            cb(objs);
                        }
                    }),
                    error: function (error) {
                        console.debug(error.description);
                    }
                }, this);
            }
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

require(["AudioRecorderWidget/widget/AudioRecorderWidget"]);
