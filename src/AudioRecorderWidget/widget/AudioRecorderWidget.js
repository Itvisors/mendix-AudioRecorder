/*jshint undef: true, browser:true, nomen: true */
/*jslint browser:true, nomen: true */
/*global mx, mxui, define, require, console, cordova, logger, resolveLocalFileSystemURL, CaptureError, Media */
/*


    Record audio using the device functions
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

    return declare("AudioRecorderWidget.widget.AudioRecorderWidget", [ _WidgetBase ], {

        // Parameters configured in the Modeler.

        // Internal variables.
        _contextObj: null,
        _playButton: null,
        _stopButton: null,
        _recordButton: null,
        _recordingPath: null,
        _media: null,

        constructor: function () {
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this._playButton = this._placeButtonWithIcon("play");
            this._stopButton = this._placeButtonWithIcon("stop");
            this._recordButton = this._placeButtonWithIcon("record");
            dojoOn(this._playButton, "click", lang.hitch(this, this._handlePlayButtonClick));
            dojoOn(this._stopButton, "click", lang.hitch(this, this._handleStopButtonClick));
            dojoOn(this._recordButton, "click", lang.hitch(this, this._handleRecordButtonClick));
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

        _handleRecordButtonClick: function () {
            logger.debug(this.id + "._handleRecordButtonClick");
            this._stopPlayback();
            this._startRecording();            
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
            console.log("Start new recording");
            if (typeof navigator.device.capture.captureAudio === "undefined") {
                mx.ui.error("Audio device not detected.");
                return;
            }

            // Start audio capture, default is to capture one file
            navigator.device.capture.captureAudio(lang.hitch(this, this._captureSuccess), lang.hitch(this, this._captureError));
        },

        _captureSuccess: function (mediaFiles) {
            var thisObj = this;

            // Result is always an array, if recording succeeded, array has one element.
            if (mediaFiles.length) {
                this._recordingPath = mediaFiles[0].localURL;
                // Resolve path into a file entry
                resolveLocalFileSystemURL(this._recordingPath, function (fileEntry) {
                    thisObj._contextObj.set("Name", fileEntry.name);
                    // A file retrieved using resolveLocalFileSystemURL can be stored directly in Mendix because File inherits from Blob.
                    fileEntry.file(function(file) {
                        window.mx.data.saveDocument(
                            thisObj._contextObj.getGuid(),
                            "audio",
                            {},
                            file,
                            lang.hitch(thisObj, thisObj._saveDocumentCallback),
                            lang.hitch(thisObj, thisObj._showError)
                        );
                });                    
                }, function (error) {
                    console.log("resolveLocalFileSystemURL error");
                    console.dir(error);
                });

            }
        },

        _saveDocumentCallback: function (path) {
            logger.debug(this.id + "._saveDocumentCallback");
            //console.log("Document saved from path " + path);
        },

        _showError: function (e) {
            mx.ui.error("Saving file failed with error code " + e.code);
        },

        _captureError: function (error) {
            if (error) {
                if (error.code === CaptureError.CAPTURE_NO_MEDIA_FILES) {
                    console.log("User cancelled the recording");
                } else {
                    mx.ui.error("Audio capture failed, error: " + error.code);
                }
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
