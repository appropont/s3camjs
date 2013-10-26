
 (function () {
	'use strict';

	var App = {

		init: function () {

			// The shim requires options to be supplied for it's configuration,
			// which can be found lower down in this file. Most of the below are
			// demo specific and should be used for reference within this context
			// only
			if ( !!this.options ) {

				// Initialize getUserMedia with options
				getUserMedia(this.options, this.success, this.deviceError);

				// Initialize webcam options for fallback
				window.webcam = this.options;

			} else {
				alert('No options were supplied to the shim!');
			}
		},

		addEvent: function (type, obj, fn) {
			if (obj.attachEvent) {
				obj['e' + type + fn] = fn;
				obj[type + fn] = function () {
					obj['e' + type + fn](window.event);
				}
				obj.attachEvent('on' + type, obj[type + fn]);
			} else {
				obj.addEventListener(type, fn, false);
			}
		},

		// options contains the configuration information for the shim
		// it allows us to specify the width and height of the video
		// output we're working with, the location of the fallback swf,
		// events that are triggered onCapture and onSave (for the fallback)
		// and so on.
		options: {
			"audio": false,
			"video": true,
			el: "webcam",

			extern: null,
			append: true,

			noFallback:true, //use if you don't require a fallback

			width: 320, 
			height: 240, 

			mode: "callback",
			// callback | save | stream
			swffile: "../dist/fallback/jscam_canvas_only.swf",
			quality: 85,
			context: "",

			debug: function () {},

		},

		success: function (stream) {

			if (App.options.context === 'webrtc') {

				var video = App.options.videoEl;
				
				if ((typeof MediaStream !== "undefined" && MediaStream !== null) && stream instanceof MediaStream) {
		
					if (video.mozSrcObject !== undefined) { //FF18a
						video.mozSrcObject = stream;
					} else { //FF16a, 17a
						video.src = stream;
					}

					return video.play();

				} else {
					var vendorURL = window.URL || window.webkitURL;
					video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
				}

				video.onerror = function () {
					stream.stop();
					streamError();
				};

			} else{
				// flash context
			}
			
		},

		deviceError: function (error) {
            smoke.alert("The webcam experienced a fatal error. You could try refreshing to start over, but it is likely caused by a browser insufficiency. Try Google Chrome.", function(e){}, {
                ok: "Ok",
                classname: "pure-button-error",
                clickableBG: false
            });
			//alert('No camera available.');
			console.error('An error occurred: [CODE ' + error.code + ']');
            console.log(error);
		},

		drawToCanvas: function (effect) {
			var source, glasses, canvas, ctx, pixels, i;

			source = document.querySelector('#canvas');
			glasses = new Image();
			glasses.src = "js/glasses/i/glasses.png";
			canvas = document.querySelector("#latestCapturedFrame");
			ctx = canvas.getContext("2d");

			ctx.drawImage(source, 0, 0, 520, 426);

			pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

			// Hipstergram!
			if (effect === 'hipster') {

				for (i = 0; i < pixels.data.length; i = i + 4) {
					pixels.data[i + 0] = pixels.data[i + 0] * 3;
					pixels.data[i + 1] = pixels.data[i + 1] * 2;
					pixels.data[i + 2] = pixels.data[i + 2] - 10;
				}

				ctx.putImageData(pixels, 0, 0);

			}

			// Green Screen
			else if (effect === 'greenscreen') {

				// Selectors 
				var rmin = $('#red input.min').val(),
					gmin = $('#green input.min').val(),
					bmin = $('#blue input.min').val(),
					rmax = $('#red input.max').val(),
					gmax = $('#green input.max').val(),
					bmax = $('#blue input.max').val(),
					green = 0, red = 0, blue = 0;


				for (i = 0; i < pixels.data.length; i = i + 4) {
					red = pixels.data[i + 0];
					green = pixels.data[i + 1];
					blue = pixels.data[i + 2];
					alpha = pixels.data[i + 3];

					if (red >= rmin && green >= gmin && blue >= bmin && red <= rmax && green <= gmax && blue <= bmax) {
						pixels.data[i + 3] = 0;
					}
				}

				ctx.putImageData(pixels, 0, 0);

			} else if (effect === 'glasses') {

				var comp = ccv.detect_objects({
					"canvas": (canvas),
					"cascade": cascade,
					"interval": 5,
					"min_neighbors": 1
				});

				// Draw glasses on everyone!
				for (i = 0; i < comp.length; i++) {
					ctx.drawImage(glasses, comp[i].x, comp[i].y, comp[i].width, comp[i].height);
				}
			}

		},
        
        
        
        

	};

	App.init();
    
    var AppViewModel = function() {
    
        var self = this;
        
        this.bucket = ko.observable();
        this.accessKey = ko.observable();
        this.secretKey = ko.observable();
        this.subdirectory = ko.observable("");
        
        this.minDiff = ko.observable(10);
        this.resolution = ko.observable();
        this.fps = ko.observable(4);
        this.jpegQuality = ko.observable(80);
        
        this.isProcessing = ko.observable(false);
        
        //browser constraints
        this.getUserMediaAble = ko.observable(true);
        this.xhr2CORSAble = ko.observable(true);
        this.canvasAble = ko.observable(true);
        this.isChromeUsed = ko.observable(false);
        
        this.hasErrors = ko.computed(function() {
            if( !self.getUserMediaAble() || 
                !self.xhr2CORSAble() ||
                !self.canvasAble() ||
                !self.isChromeUsed() ) {
                
                    return true;
                
            } 
            
            return false;
        });
        
        
        this.resolutions = ko.observableArray([
            {
                display: "320 x 240",
                width: 320,
                height: 240
            },
            {
                display: "640 x 480",
                width: 640,
                height: 480
            }
        ]);
        
        this.selectedResolution = ko.observable();
        
        this.processStream = function() {
        
            
            console.log("starting processStream");
            this.isProcessing(true);
                        
            var currentCapturedFrame = document.createElement('canvas');
            var previousCapturedFrame = document.createElement('canvas');
            
            // The video tag is injected by shim.
            //  It needs to be queried by tag name since no id is applied.
            //  There should be only one video tag on this page anyway so,
            //  this is considered safe.
            var selectedResolution = self.selectedResolution();
            
            var video = document.getElementsByTagName('video')[0];
            var videoHeight = selectedResolution.height;
            var videoWidth = selectedResolution.width;
            currentCapturedFrame.width = videoWidth;
            currentCapturedFrame.height = videoHeight;                
            previousCapturedFrame.width = videoWidth;
            previousCapturedFrame.height = videoHeight;
            
            
            console.log("video.videoHeight: " + video.videoHeight);
            console.log("video.videoWidth: " + video.videoWidth);
            console.log("selectedResolution.height: " + videoHeight);
            console.log("selectedResolution.width: " + videoWidth);
        
        
            //cache knockout vars
            var bucket = self.bucket();
            var normalKey = self.accessKey();
            var secretKey = self.secretKey();
            var path = self.subdirectory();
            
            var minDiff = self.minDiff();
            var fps = self.fps();
            var jpegQuality = self.jpegQuality();
            
            var uploadedCount = 0;
            
            //var to keep from diffing first frame of process starting
            var isFirstFrame = true;
            
            window.processInterval = setInterval(function () {
            
                var intervalStartTime = new Date();
            
                //copy image in new image to old image place
                previousCapturedFrame.getContext('2d').drawImage(currentCapturedFrame, 0, 0, videoWidth, videoHeight);
                
                //copy webcam image to new image place         
                currentCapturedFrame.getContext('2d').drawImage(video, 0, 0, videoWidth, videoHeight);
                
                var previousFrameDataURL = previousCapturedFrame.toDataURL("image/jpeg", jpegQuality);
                var currentFrameDataURL = currentCapturedFrame.toDataURL("image/jpeg", jpegQuality);
                
                //compare new image and old image
                resemble( currentFrameDataURL ).compareTo( previousFrameDataURL ).onComplete(function(data) {
                    console.log("Mismatch percent: " + data.misMatchPercentage);
                    
                    //if different enough upload it
                    if(data.misMatchPercentage > minDiff && !isFirstFrame) {                        
                        
                        //my api keys for testing 
                        var bucket = "s3camjs-test";
                        var normalKey = apiKeys.normal;
                        var secretKey = apiKeys.secret; 

                        //var path = "webcam1";
                        var filename = intervalStartTime.getTime() + ".jpg";
                        var key = (path != "") ? path + "/" + filename : filename;
                        
                        var timestamp = intervalStartTime.toISOString();
                        
                        var acl = "private";
                                            
                        var policy = { 
                            "expiration": "2014-12-01T12:00:00.000Z", // hard coded for testing
                            "conditions": [
                                  ["starts-with", "$key", ""], 
                                  {"bucket": bucket}, 
                                  {"acl": acl}, 
                                  ["starts-with", "$Content-Type", "image/jpeg"],
                            ]
                        };
                        
                        var policyJSON = JSON.stringify(policy);                      
                        var policyBase64 = Base64.encode(policyJSON);
                        var signature = b64_hmac_sha1(secretKey, policyBase64);
                        
                        //Form submit version
                        var fd = new FormData();
                        
                        fd.append("key", key);
                        fd.append("AWSAccessKeyId", normalKey);
                        fd.append("acl", acl);
                        fd.append("policy", policyBase64);
                        fd.append("signature", signature);                        
                        //fd.append("success_action_status", 201);
                        fd.append("Content-Type", "image/jpeg");
                        
                        //var currentFrameDataURLMinusHeader = currentFrameDataURL.replace(/^data:image\/\w+;base64,/, "");
                        //var currentFrameDataDecoded = Base64.decode(currentFrameDataURLMinusHeader);
                        
                        var currentFrameDataFile = helpers.dataURItoBlob(currentFrameDataURL);
                        fd.append("file", currentFrameDataFile);

                        // raw xhr is used because I was having issues with zepto.ajax
                        //  Amazon was complaining about a malformed POST body.
                        var xhr = new XMLHttpRequest();

                        xhr.addEventListener("load", function(event) {
                            console.log("xhr.loadListener");
                            console.log(event);
                            console.log(xhr)
                        }, false);
                        xhr.addEventListener("error", function(event) {
                            console.log("xhr.errorListener");
                            console.log(event);
                        }, false);
                        xhr.addEventListener("abort", function(event) {
                            console.log("xhr.abortListener");
                            console.log(event);
                        }, false);

                        xhr.open('POST', 'https://' + bucket + '.s3.amazonaws.com', true);  

                        xhr.send(fd);
                        
                    }
                    
                    isFirstFrame = false;
                    
                });

            
            
            }, 1000/fps);
            
        };
        
        this.stopProcessing = function () {
        
            this.isProcessing(false);
        
            clearInterval(window.processInterval);
        };
        
        this.checkConstraints = function() {
            
            //getUserMedia constraint
            var getUserMedia = navigator.getUserMedia 
                                || navigator.webkitGetUserMedia 
                                || navigator.mozGetUserMedia;

            if (! getUserMedia ) {
                self.getUserMediaAble(false);
                console.log("not getUserMediaAble");
            }
            
            //xhr2 CORS constraint
            if ('withCredentials' in new XMLHttpRequest()) {
                /* supports cross-domain requests */
            }
            else if(typeof XDomainRequest !== "undefined"){
              //IE-specific check for future profing in case it becomes viable
              //to run this app in IE for now is sets the constraint to false              
            }else{
                self.xhr2CORSAble(false);
                console.log("not xhr2CORSAble");
            }
            
            //Chrome browser constraint
            if(/chrom(e|ium)/.test(navigator.userAgent.toLowerCase())){
                self.isChromeUsed(true);                
                console.log("using chrome");
            }
            
            var elem = document.createElement('canvas');
            if( !(elem.getContext && elem.getContext('2d')) ) {
                self.canvasAble(false);                
                console.log("no canvas");
            };
            
        }();
        
        
        
        
        
    };
    
    $(document).ready(function() {
        var viewModel = new AppViewModel();
        ko.applyBindings( viewModel );
        //viewModel.checkConstraints();
    });

})();


