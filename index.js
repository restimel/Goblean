let rslt = document.getElementById('result');
let img = '/image-001.png';
let live = true;
let dbg = 3;

let canvas = document.querySelector('canvas');
let button = document.querySelector('button');
let imgEl = document.querySelector('img');


/*
navigator.mediaDevices.getUserMedia()
*/

function displayResult(rsult) {
    if (!rsult) {
        rsult = 'Code not found';
    }
    rslt.textContent = rsult;
}

if (!live) {
    Quagga.decodeSingle({
        decoder: {
            readers: ["ean_reader"] // List of active readers
        },
        locate: true, // try to locate the barcode in the image
        src: img // or 'data:image/jpg;base64,' + data
    }, function(result){
        if(result.codeResult) {
            console.log("result", result.codeResult.code);
            displayResult(result.codeResult.code);
        } else {
            console.log("not detected");
            displayResult();
        }
    });

    document.querySelector('img').src = img;
} else if (dbg === 1) {

    var App = {
            init : function() {
                Quagga.init(this.state, function(err) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    App.attachListeners();
                    App.checkCapabilities();
                    Quagga.start();
                });
            },
            checkCapabilities: function() {
                var track = Quagga.CameraAccess.getActiveTrack();
                var capabilities = {};
                if (typeof track.getCapabilities === 'function') {
                    capabilities = track.getCapabilities();
                }
                console.log(capabilities);
                // this.applySettingsVisibility('zoom', capabilities.zoom);
                // this.applySettingsVisibility('torch', capabilities.torch);
            },
            updateOptionsForMediaRange: function(node, range) {
                console.log('updateOptionsForMediaRange', node, range);
                var NUM_STEPS = 6;
                var stepSize = (range.max - range.min) / NUM_STEPS;
                var option;
                var value;
                while (node.firstChild) {
                    node.removeChild(node.firstChild);
                }
                for (var i = 0; i <= NUM_STEPS; i++) {
                    value = range.min + (stepSize * i);
                    option = document.createElement('option');
                    option.value = value;
                    option.innerHTML = value;
                    node.appendChild(option);
                }
            },
            applySettingsVisibility: function(setting, capability) {
                // depending on type of capability
                // if (typeof capability === 'boolean') {
                //     var node = document.querySelector('input[name="settings_' + setting + '"]');
                //     if (node) {
                //         node.parentNode.style.display = capability ? 'block' : 'none';
                //     }
                //     return;
                // }
                // if (window.MediaSettingsRange && capability instanceof window.MediaSettingsRange) {
                //     var node = document.querySelector('select[name="settings_' + setting + '"]');
                //     if (node) {
                //         this.updateOptionsForMediaRange(node, capability);
                //         node.parentNode.style.display = 'block';
                //     }
                //     return;
                // }
            },
            initCameraSelection: function(){
                var streamLabel = Quagga.CameraAccess.getActiveStreamLabel();

                return Quagga.CameraAccess.enumerateVideoDevices()
                .then(function(devices) {
                    function pruneText(text) {
                        return text.length > 30 ? text.substr(0, 30) : text;
                    }
                    var $deviceSelection = document.getElementById("deviceSelection");
                    while ($deviceSelection.firstChild) {
                        $deviceSelection.removeChild($deviceSelection.firstChild);
                    }
                    devices.forEach(function(device) {
                        var $option = document.createElement("option");
                        $option.value = device.deviceId || device.id;
                        $option.appendChild(document.createTextNode(pruneText(device.label || device.deviceId || device.id)));
                        $option.selected = streamLabel === device.label;
                        $deviceSelection.appendChild($option);
                    });
                });
            },
            attachListeners: function() {
                // var self = this;

                // self.initCameraSelection();
                // $(".controls").on("click", "button.stop", function(e) {
                //     e.preventDefault();
                //     Quagga.stop();
                // });

                // $(".controls .reader-config-group").on("change", "input, select", function(e) {
                //     e.preventDefault();
                //     var $target = $(e.target),
                //         value = $target.attr("type") === "checkbox" ? $target.prop("checked") : $target.val(),
                //         name = $target.attr("name"),
                //         state = self._convertNameToState(name);

                //     console.log("Value of "+ state + " changed to " + value);
                //     self.setState(state, value);
                // });
            },
            // _accessByPath: function(obj, path, val) {
            //     var parts = path.split('.'),
            //         depth = parts.length,
            //         setter = (typeof val !== "undefined") ? true : false;

            //     return parts.reduce(function(o, key, i) {
            //         if (setter && (i + 1) === depth) {
            //             if (typeof o[key] === "object" && typeof val === "object") {
            //                 Object.assign(o[key], val);
            //             } else {
            //                 o[key] = val;
            //             }
            //         }
            //         return key in o ? o[key] : {};
            //     }, obj);
            // },
            // _convertNameToState: function(name) {
            //     return name.replace("_", ".").split("-").reduce(function(result, value) {
            //         return result + value.charAt(0).toUpperCase() + value.substring(1);
            //     });
            // },
            // detachListeners: function() {
            //     $(".controls").off("click", "button.stop");
            //     $(".controls .reader-config-group").off("change", "input, select");
            // },
            // applySetting: function(setting, value) {
            //     var track = Quagga.CameraAccess.getActiveTrack();
            //     if (track && typeof track.getCapabilities === 'function') {
            //         switch (setting) {
            //         case 'zoom':
            //             return track.applyConstraints({advanced: [{zoom: parseFloat(value)}]});
            //         case 'torch':
            //             return track.applyConstraints({advanced: [{torch: !!value}]});
            //         }
            //     }
            // },
            setState: function(path, value) {
                // var self = this;

                // if (typeof self._accessByPath(self.inputMapper, path) === "function") {
                //     value = self._accessByPath(self.inputMapper, path)(value);
                // }

                // if (path.startsWith('settings.')) {
                //     var setting = path.substring(9);
                //     return self.applySetting(setting, value);
                // }
                // self._accessByPath(self.state, path, value);

                // console.log(JSON.stringify(self.state));
                // App.detachListeners();
                // Quagga.stop();
                // App.init();
            },
            inputMapper: {
                inputStream: {
                    constraints: function(value){
                        if (/^(\d+)x(\d+)$/.test(value)) {
                            var values = value.split('x');
                            return {
                                width: {min: parseInt(values[0])},
                                height: {min: parseInt(values[1])}
                            };
                        }
                        return {
                            deviceId: value
                        };
                    }
                },
                numOfWorkers: function(value) {
                    return parseInt(value);
                },
                decoder: {
                    readers: function(value) {
                        if (value === 'ean_extended') {
                            return [{
                                format: "ean_reader",
                                config: {
                                    supplements: [
                                        'ean_5_reader', 'ean_2_reader'
                                    ]
                                }
                            }];
                        }
                        return [{
                            format: value + "_reader",
                            config: {}
                        }];
                    }
                }
            },
            state: {
                inputStream: {
                    type : "LiveStream",
                    constraints: {
                        width: {min: 640},
                        height: {min: 480},
                        aspectRatio: {min: 1, max: 100},
                        facingMode: "environment" // or user
                    }
                },
                locator: {
                    patchSize: "medium",
                    halfSample: true
                },
                numOfWorkers: 2,
                frequency: 10,
                decoder: {
                    readers : [{
                        format: "code_128_reader",
                        config: {}
                    }]
                },
                locate: true
            },
            lastResult : null
        };

        App.init();

        Quagga.onProcessed(function(result) {
            var drawingCtx = Quagga.canvas.ctx.overlay,
                drawingCanvas = Quagga.canvas.dom.overlay;

            if (result) {
                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                    result.boxes.filter(function (box) {
                        return box !== result.box;
                    }).forEach(function (box) {
                        Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
                    });
                }

                if (result.box) {
                    Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
                }

                if (result.codeResult && result.codeResult.code) {
                    Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
                }
            }
        });

        Quagga.onDetected(function(result) {
            var code = result.codeResult.code;

            if (App.lastResult !== code) {
                App.lastResult = code;
                var $node = null, canvas = Quagga.canvas.dom.image;

                $node = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');
                $node.find("img").attr("src", canvas.toDataURL());
                $node.find("h4.code").html(code);
                $("#result_strip ul.thumbnails").prepend($node);
            }
        });
} else if (dbg === 2) {
    let element = document.querySelector('canvas');
    console.log('canvas', element)
    Quagga.init({
        inputStream : {
            name : "Live",
            type : "LiveStream",
            target: element    // Or '#yourElement' (optional)
        },
        decoder : {
            readers : ["ean_reader"]
        }
    }, function(err) {
        if (err) {
            console.log('erreor', err);
            displayResult(err.name + ' ' + err.message);
            return
        }
        console.log("Initialization finished. Ready to start");
        Quagga.start();
    });

    Quagga.onProcessed(function(result) {
            var drawingCtx = Quagga.canvas.ctx.overlay;
            var drawingCanvas = Quagga.canvas.dom.overlay;

            if (result) {
                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                    result.boxes.filter(function (box) {
                        return box !== result.box;
                    }).forEach(function (box) {
                        Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
                    });
                }

                if (result.box) {
                    Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
                }

                if (result.codeResult && result.codeResult.code) {
                    Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
                }
            }
        });

        Quagga.onDetected(function(result) {
            var code = result.codeResult.code;

            if (lastResult !== code) {
                lastResult = code;
                var canvas = Quagga.canvas.dom.image;
                console.log('onDetected trouvé', code, result)
                displayResult(code);

                // $node = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');
                // $node.find("img").attr("src", canvas.toDataURL());
                // $node.find("h4.code").html(code);
                // $("#result_strip ul.thumbnails").prepend($node);
            } else {
                console.log('onDetected', result);
                displayResult('not found')
            }
        });
} else if (dbg === 3) {
    var video = document.getElementById('webcam');
    navigator.mediaDevices.getUserMedia({video: true}).then(stream => {
        var video = document.getElementById('webcam');
            video.autoplay = true;
            video.src = window.URL.createObjectURL(stream);
            setTimeout(() => stream.getVideoTracks().forEach(mediaStreamTrack=>mediaStreamTrack.stop()), 20000);
    });

    let takepicture = function() {
        // canvas.width = width;
        // canvas.height = height;
        var width = video.width;
        var height = video.height;
        var width = video.videoWidth;
        var height = video.videoHeight;
        console.log(width, height)
        canvas.getContext('2d').drawImage(video, 0, 0, width, height,0,0,800,800);
        var data = canvas.toDataURL('image/png');
        imgEl.setAttribute('src', data);
        test(data);
      };

      button.addEventListener('click', function(ev){
          takepicture();
        ev.preventDefault();
      }, false);

    let test = function(data) {
        Quagga.decodeSingle({
            decoder: {
                readers: ["ean_reader"] // List of active readers
            },
            locate: true, // try to locate the barcode in the image
            // src: img // or 'data:image/jpg;base64,' + data
            // src: 'data:image/jpg;base64,' + data
            src: data
        }, function(result){
            if(result && result.codeResult) {
                console.log("result", result.codeResult.code);
                displayResult(result.codeResult.code);
            } else {
                console.log("not detected");
                displayResult();
            }
        });
    };

}