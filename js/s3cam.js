 var framerate = 1;
 var maximumDifference = 10;
 
 (function () {
	'use strict';

	var App = {

		init: function () {

			// The shim requires options to be supplied for it's configuration,
			// which can be found lower down in this file. Most of the below are
			// demo specific and should be used for reference within this context
			// only
			if ( !!this.options ) {

				this.pos = 0;
				this.cam = null;
				this.filter_on = false;
				this.filter_id = 0;
				this.canvas = document.getElementById("currentCapturedFrame");
				this.ctx = this.canvas.getContext("2d");
				this.img = new Image();
				this.ctx.clearRect(0, 0, this.options.width, this.options.height);
				this.image = this.ctx.getImageData(0, 0, this.options.width, this.options.height);
				
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
			"audio": false, //OTHERWISE FF nightly throws an NOT IMPLEMENTED error
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
			onCapture: function () {
				window.webcam.save();
			},
			onTick: function () {},
			onSave: function (data) {

				var col = data.split(";"),
					img = App.image,
					tmp = null,
					w = this.width,
					h = this.height;

				for (var i = 0; i < w; i++) { 
					tmp = parseInt(col[i], 10);
					img.data[App.pos + 0] = (tmp >> 16) & 0xff;
					img.data[App.pos + 1] = (tmp >> 8) & 0xff;
					img.data[App.pos + 2] = tmp & 0xff;
					img.data[App.pos + 3] = 0xff;
					App.pos += 4;
				}

				if (App.pos >= 4 * w * h) { 
					App.ctx.putImageData(img, 0, 0);
					App.pos = 0;
				}

			},
			onLoad: function () {}
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
			alert('No camera available.');
			console.error('An error occurred: [CODE ' + error.code + ']');
		},

		changeFilter: function () {
			if (this.filter_on) {
				this.filter_id = (this.filter_id + 1) & 7;
			}
		},

		getSnapshot: function () {
			// If the current context is WebRTC/getUserMedia (something
			// passed back from the shim to avoid doing further feature
			// detection), we handle getting video/images for our canvas 
			// from our HTML5 <video> element.
			if (App.options.context === 'webrtc') {
				var video = document.getElementsByTagName('video')[0]; 
				App.canvas.width = video.videoWidth;
				App.canvas.height = video.videoHeight;
				App.canvas.getContext('2d').drawImage(video, 0, 0);

			// Otherwise, if the context is Flash, we ask the shim to
			// directly call window.webcam, where our shim is located
			// and ask it to capture for us.
			} else if(App.options.context === 'flash'){

				window.webcam.capture();
				App.changeFilter();
			}
			else{
				alert('No context was supplied to getSnapshot()');
			}
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
        
        processStream : function() {
        
            
            console.log("starting processStream");
                        
            var currentCapturedFrame = document.createElement('canvas');
            var previousCapturedFrame = document.createElement('canvas');
            
            // Since the video tag is injected programmatically by shim,
            //  it needs to be queried by tag name since no id is applied.
            //  There should be only one video tag on this page anyway so,
            //  this is considered safe.
            var video = document.getElementsByTagName('video')[0];
            var videoHeight = video.videoHeight;
            var videoWidth = video.videoWidth;
            currentCapturedFrame.width = videoWidth;
            currentCapturedFrame.height = videoHeight;                
            previousCapturedFrame.width = videoWidth;
            previousCapturedFrame.height = videoHeight;
        
        
            //temp
            var fps = 1;
            
            var uploadedCount = 0;
            
            window.processInterval = setInterval(function () {
            
                var intervalStartTime = new Date();
                
                console.log("starting interval");
            
                //copy image in new image to old image place
                previousCapturedFrame.getContext('2d').drawImage(currentCapturedFrame, 0, 0);
                
                //copy webcam image to new image place         
                currentCapturedFrame.getContext('2d').drawImage(video, 0, 0);
                var diff;
                
                var currentFrameDataURL = currentCapturedFrame.toDataURL();
                var previousFrameDataURL = previousCapturedFrame.toDataURL();
                
                //compare new image and old image
                resemble( currentFrameDataURL ).compareTo( previousFrameDataURL ).onComplete(function(data) {
                    console.log("Mismatch percent: " + data.misMatchPercentage);
                    //console.log("isSameDimensions: " + data.isSameDimensions);
                    
                    //if different enough upload it
                    if(data.misMatchPercentage > maximumDifference) {
                        
                        //upload to S3
                        var normalKey = apiKeys.normal;
                        var secretKey = apiKeys.secret; 

                        var bucket = "s3camjs-test";
                        var path = "webcam1";
                        var filename = intervalStartTime.getTime() + ".jpg";
                        var key = (path != "") ? path + "/" + filename : filename;
                        
                        var timestamp = intervalStartTime.toISOString();
                        
                        var acl = "private";
                        
                        var base64Head = 'data:image/png;base64,';
                        var currentFrameFileSize = Math.round((currentFrameDataURL.length - base64Head.length)*3/4);
                        
                                            
                        var policy = { 
                            "expiration": "2014-12-01T12:00:00.000Z", // hard coded for testing
                            "conditions": [
                                  ["starts-with", "$key", ""], 
                                  {"bucket": bucket}, 
                                  {"acl": "private"}, 
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
                        
                        var currentFrameDataURLMinusHeader = currentFrameDataURL.replace(/^data:image\/\w+;base64,/, "");
                        var currentFrameDataDecoded = Base64.decode(currentFrameDataURLMinusHeader);
                        
                        var currentFrameDataFile = helpers.dataURItoBlob(currentFrameDataURL);
                        fd.append("file", currentFrameDataFile);
                        
                        // Post code
                        
                        //raw xhr
                        //fd.append('key', key);
                        //fd.append('acl', 'public-read'); 
                        //fd.append('Content-Type', file.type);      
                        //fd.append('AWSAccessKeyId', 'YOUR ACCESS KEY');
                        //fd.append('policy', 'YOUR POLICY')
                        //fd.append('signature','YOUR SIGNATURE');

                        //fd.append("file",file);

                        var xhr = new XMLHttpRequest();

                        //xhr.upload.addEventListener("progress", uploadProgress, false);
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

                        xhr.open('POST', 'https://'+bucket+'.s3.amazonaws.com', true); //MUST BE LAST LINE BEFORE YOU SEND 

                        xhr.send(fd);
                        
                        //zepto
                        /*$.ajax({
                        
                            type: "POST",
                            url: "https://"+bucket+".s3.amazonaws.com",
                            data: fd,
                            //file: currentFrameDataFile,
                            contentType: "multipart/form-data",
                            success: function(data, status, xhr) {
                                console.log("ajax success");
                            },
                            error: function(xhr, errorType, error) {
                                console.log("ajax error");                                
                                console.log("errorType: ");
                                console.log(errorType);
                                console.log("error: ");
                                console.log(error);
                                console.log("xhr: ");
                                console.log(xhr);
                            }
                            
                        });*/
                        
                        //PUT code
                        /*
                        
                        var stringToSign = "PUT\n" +
                                            "\n" +
                                            "image/jpeg\n" +
                                            timestamp + "\n" +
                                            "/" + bucket + key;
                        
                        var xhr = helpers.createCORSRequest('PUT' , "https://" + 
                                                            bucket + 
                                                            ".s3.amazonaws.com/" + 
                                                            path + 
                                                            "/" + 
                                                            filename);
                        if (!xhr){
                            throw new Error('CORS not supported');
                        }
                        
                        xhr.setRequestHeader("Content-Type" , "image/jpeg");
                        //xhr.setRequestHeader("Content-Length" , currentFrameFileSize);
                        //xhr.setRequestHeader("Host" , bucket + ".s3.amazonaws.com");                        
                        //xhr.setRequestHeader("Date" , timestamp);                                       
                        xhr.setRequestHeader("x-amz-date" , timestamp);                 
                        
                        xhr.setRequestHeader("Authorization" , "AWS " + normalKey + ":" + signature);

                        xhr.send(currentFrameDataURL);

                        xhr.onload = function(){
                            // process the response.
                            console.log("PUT success");
                            console.log(xhr.request);
                            console.log(xhr.response);
                        };

                        xhr.onerror = function(e){
                            console.log("PUT failed");
                            console.log(e);
                        };*/
                        
                        
                        
                        
                    }
                    
                });

            
            
            }, 1000/fps);
            
        },
        
        stopProcessing : function () {
            clearInterval(window.processInterval);
        }
        
        

	};

	App.init();
    
    $("#start-processing-btn").on("click", function() {
        App.processStream();
    });
    
    $("#stop-processing-btn").on("click", function() {
        App.stopProcessing();
    });
    
    

})();


