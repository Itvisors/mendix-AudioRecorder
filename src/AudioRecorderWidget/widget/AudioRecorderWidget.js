/*jshint undef: true, browser:true, nomen: true */
/*jslint browser:true, nomen: true */
/*global mx, mxui, define, require, console, cordova, logger, resolveLocalFileSystemURL, CaptureError, Media, device */
/*


    Record audio using the device functions
    =======================================


*/
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/_base/lang"

], function (declare, _WidgetBase, dojoStyle, dojoAttr, dojoConstruct, dojoOn, lang) {
    "use strict";

    return declare("AudioRecorderWidget.widget.AudioRecorderWidget", [ _WidgetBase ], {

        // Parameters configured in the Modeler.
        maxDuration: 0,
        stopRecordingDelay: 0,

        // Internal variables.
        _contextObj: null,
        _playButton: null,
        _stopButton: null,
        _recordButton: null,
        _media: null,
        _filePath: null,
        _fileName: null,
        _timeoutHandle: null,
        _activeFunction: null,
        _hasRecording: false,
        _progressDialogId: null,

        // Fixed values
        _FUNCTION_RECORD: "record",
        _FUNCTION_PLAYBACK: "playback",
        _ATTR_DISABLED: "disabled",

        constructor: function () {
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            var directory,
                mediaSrc,
                thisObj = this;

            this._playButton = this._placeButtonWithIcon("play");
            this._stopButton = this._placeButtonWithIcon("stop");
            this._recordButton = this._placeButtonWithIcon("record");
            dojoOn(this._playButton, "click", lang.hitch(this, this._handlePlayButtonClick));
            dojoOn(this._stopButton, "click", lang.hitch(this, this._handleStopButtonClick));
            dojoOn(this._recordButton, "click", lang.hitch(this, this._handleRecordButtonClick));
            this._updateButtonStatus();

            if (typeof Media === "undefined") {
                mx.ui.error("Audio device not detected.");
                return;
            }

            if (!device.platform) {
                mx.ui.error("Device platform not detected.");
                return;
            }

            this._fileName = "audio_" + mx.parser.formatValue(+new Date(), "datetime", { datePattern: "yyyyMMdd_HHmmssSSS" });
            // Allowed audio format differs between ios and android.
            // Use storage directory depending on platform.
            // On iOS do NOT specify a directory for the media source.
            // The file ends up in cordova.file.tempDirectory

            if (device.platform.toLowerCase() === "android") {
                this._fileName += ".aac";
                directory = cordova.file.externalDataDirectory;
                mediaSrc = directory + this._fileName;
            } else {
                this._fileName += ".wav";
                directory = cordova.file.tempDirectory;
                mediaSrc = this._fileName;
            }
            this._filePath = directory + this._fileName;
            this._media = new Media(mediaSrc, function() {
                thisObj._mediaSuccess();
            }, function (err) {
                thisObj._mediaError(err);
            });
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
            if (this._media) {
                this._handleStopButtonClick();
                this._media.release();
                this._media = null;
                // Attempt to delete the media file.
                resolveLocalFileSystemURL(this._filePath, function (fileEntry) {
                    fileEntry.remove();
                }, function (error) {
                    // No problem if file was not found anymore.
                    if (error.code !== 1) {
                        console.log("resolveLocalFileSystemURL error");
                        console.dir(error);
                    }
                });
            }
            this._hideProgress();
        },

        _handlePlayButtonClick: function () {
            logger.debug(this.id + "._handlePlayButtonClick");
            this._activeFunction = this._FUNCTION_PLAYBACK;
            if (this._media) {
                console.log("Start media playback");
                this._media.play({ playAudioWhenScreenIsLocked : false });
                this._updateButtonStatus();
            }
        },

        _handleStopButtonClick: function () {
            logger.debug(this.id + "._handleStopButtonClick");
            if (this._timeoutHandle) {
                clearTimeout(this._timeoutHandle);
                this._timeoutHandle = null;
            }
            switch (this._activeFunction) {
                case this._FUNCTION_PLAYBACK:
                    this._stopPlayback();
                    break;

                case this._FUNCTION_RECORD:
                    this._stopRecord();
                    break;

                default:
                    break;
            }
        },

        _stopPlayback: function () {
            console.log(this.id + "._stopPlayback");
            if (this._media) {
                this._media.stop();
                this._updateButtonStatus();
            }
        },

        _stopRecord: function () {
            console.log(this.id + "._stopRecord");

            var thisObj = this,
                timeoutDuration;

            if (this._media) {
                this._showProgress();
                // The recording always seem to miss the last few seconds. So wait a little when the users taps the stop button.
                if (this.stopRecordingDelay && this.stopRecordingDelay > 500) {
                    timeoutDuration = this.stopRecordingDelay;
                } else {
                    timeoutDuration = 1000;
                }
                setTimeout(function() {
                    if (thisObj._media) {
                        thisObj._media.stopRecord();
                    }
                }, timeoutDuration);
            }

            // This function can also be called from setTimeout. Clear our handle.
            this._timeoutHandle = null;
        },

        _handleRecordButtonClick: function () {
            logger.debug(this.id + "._handleRecordButtonClick");
            if (this._activeFunction === this._FUNCTION_PLAYBACK) {
                this._stopPlayback();
            }
            this._startRecording();
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            this._executeCallback(callback, "_updateRendering");
        },

        _startRecording: function () {
            console.log("Start new recording");
            var timeoutDuration,
                thisObj = this;

            if (this._activeFunction === this._FUNCTION_RECORD) {
                console.log("Already recording so ignore this call");
                return;
            }

            if (!this._media) {
                console.log("No media object available");
                return;
            }

            this._activeFunction = this._FUNCTION_RECORD;
            this._updateButtonStatus();

            // Start audio recording, media object does not like dojo hitch.
            console.log("Start audio recording to file " + this._filePath);
            this._media.startRecord();

            // Make sure the recording stops even if the user does not stop it.
            if (this.maxDuration && this.maxDuration > 1000) {
                timeoutDuration = this.maxDuration;
            } else {
                timeoutDuration = 10000;
            }
            this._timeoutHandle = setTimeout(function() {
                thisObj._stopRecord();
            }, timeoutDuration);
        },

        _mediaSuccess: function () {
            var thisObj = this;
            console.log("Media success callback");
            console.log("Recording completed");

            // No further action for playback
            if (this._activeFunction === this._FUNCTION_PLAYBACK) {
                this._activeFunction = null;
                this._updateButtonStatus();
                return;
            }

            // Set the name and commit. Object must be committed before file content can be saved.
            console.log("Set file name and commit");
            this._contextObj.set("Name", this._fileName);
            mx.data.commit({
                mxobj: this._contextObj,
                callback: lang.hitch(this, this._saveDocument),
                error: function (e) {
                    console.error("Could not commit object:", e);
                    thisObj._saveDocumentFinalize();
                }
            });

        },

        _saveDocument: function () {
            var thisObj = this;
            console.log("Access recorded file");
            resolveLocalFileSystemURL(this._filePath, function (fileEntry) {
                fileEntry.file(function(blob) {
                    var fileReader = new FileReader();
                    fileReader.onload = function(event) {
                        console.log("Save recording in Mendix object");
                        window.mx.data.saveDocument(
                            thisObj._contextObj.getGuid(),
                            thisObj._fileName,
                            {},
                            new Blob([ event.target.result ]),
                            function () {
                                console.log("Document saved");
                                thisObj._hasRecording = true;
                                thisObj._saveDocumentFinalize();
                            },
                            function (error) {
                                console.log("Document save error");
                                console.dir(error);
                                thisObj._saveDocumentFinalize();
                                mx.ui.error("Error saving the audio recording as Mendix object.");
                            });
                    };

                    fileReader.onerror = function(event) {
                        thisObj._saveDocumentFinalize();
                        console.dir(event.target.error);
                        mx.ui.error("Error reading the audio recording.");
                    };

                    fileReader.readAsArrayBuffer(blob);
                });
            }, function (error) {
                console.log("resolveLocalFileSystemURL error");
                console.dir(error);
                thisObj._saveDocumentFinalize();
            });
        },

        _saveDocumentFinalize: function () {
            this._hideProgress();
            this._activeFunction = null;
            this._updateButtonStatus();
        },

        _mediaError: function (error) {
            if (error) {
                // Ignore error with code=0, can happen when stopping playback while it is already stopped.
                if (error.code !== 0) {
                    mx.ui.error("Media error, active function: " + this._activeFunction + ", error: " + error.code);
                }
            } else {
                mx.ui.error("Media error, active function: " + this._activeFunction + ", no more information.");
            }
        },

        /**
         * Show progress indicator
         */
        _showProgress: function () {
            if (this._progressDialogId === null) {
                this._progressDialogId = mx.ui.showProgress();
            }
        },

        /**
         * Hide progress indicator
         */
        _hideProgress: function () {
            if (this._progressDialogId) {
                mx.ui.hideProgress(this._progressDialogId);
                this._progressDialogId = null;
            }
        },

        _updateButtonStatus: function () {
            if (this._activeFunction) {
                dojoAttr.set(this._playButton, this._ATTR_DISABLED, this._ATTR_DISABLED);
                dojoAttr.remove(this._stopButton, this._ATTR_DISABLED);
                dojoAttr.set(this._recordButton, this._ATTR_DISABLED, this._ATTR_DISABLED);
            } else {
                if (this._hasRecording) {
                    dojoAttr.remove(this._playButton, this._ATTR_DISABLED);
                } else {
                    dojoAttr.set(this._playButton, this._ATTR_DISABLED, this._ATTR_DISABLED);
                }
                dojoAttr.set(this._stopButton, this._ATTR_DISABLED, this._ATTR_DISABLED);
                dojoAttr.remove(this._recordButton, this._ATTR_DISABLED);
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
