(function () {
  "use strict";

  var VERSION = "debug3-ios-camera";
  var artworks = window.RIJKSLENS_ARTWORKS || [];

  var state = {
    activeArtwork: null,
    activeCategory: "history",
    activeBubbleId: null,
    referenceFingerprints: {},
    referenceReady: false,
    stream: null,
    editMode: window.location.search.indexOf("edit") !== -1
  };

  var els = {};

  window.addEventListener("error", function (event) {
    log("JavaScript error: " + event.message + " at " + event.filename + ":" + event.lineno);
    setStatusSafe("JavaScript error: " + event.message, "error");
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason && event.reason.message ? event.reason.message : String(event.reason);
    log("Unhandled promise rejection: " + reason);
    setStatusSafe("JavaScript promise error: " + reason, "error");
  });

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEventsImmediately();
    init();
  });

  function cacheElements() {
    els.scannerScreen = document.getElementById("scannerScreen");
    els.artworkScreen = document.getElementById("artworkScreen");
    els.camera = document.getElementById("camera");
    els.scanCanvas = document.getElementById("scanCanvas");
    els.cameraPlaceholder = document.getElementById("cameraPlaceholder");
    els.startCameraButton = document.getElementById("startCameraButton");
    els.scanButton = document.getElementById("scanButton");
    els.uploadInput = document.getElementById("uploadInput");
    els.scanStatus = document.getElementById("scanStatus");
    els.debugLog = document.getElementById("debugLog");
    els.demoButton = document.getElementById("demoButton");
    els.diagnosticsButton = document.getElementById("diagnosticsButton");
    els.resetButton = document.getElementById("resetButton");
    els.artworkMeta = document.getElementById("artworkMeta");
    els.artworkTitle = document.getElementById("artworkTitle");
    els.artworkSubtitle = document.getElementById("artworkSubtitle");
    els.artworkImage = document.getElementById("artworkImage");
    els.hotspotLayer = document.getElementById("hotspotLayer");
    els.categoryTabs = document.querySelectorAll(".category-tab");
    els.categoryLabel = document.getElementById("categoryLabel");
    els.storyTitle = document.getElementById("storyTitle");
    els.storyText = document.getElementById("storyText");
    els.storyDetail = document.getElementById("storyDetail");
    els.storySource = document.getElementById("storySource");
    els.coordinateReadout = document.getElementById("coordinateReadout");
  }

  function bindEventsImmediately() {
    if (els.startCameraButton) els.startCameraButton.addEventListener("click", startCamera);
    if (els.scanButton) els.scanButton.addEventListener("click", scanCurrentFrame);
    if (els.uploadInput) els.uploadInput.addEventListener("change", handleUpload);
    if (els.demoButton) els.demoButton.addEventListener("click", function () {
      log("Demo button tapped.");
      if (artworks.length) openArtwork(artworks[0], "Opened the demo artwork.");
      else setStatus("No artwork data found. Check data/artworks.js.", "error");
    });
    if (els.diagnosticsButton) els.diagnosticsButton.addEventListener("click", runDiagnostics);
    if (els.resetButton) els.resetButton.addEventListener("click", resetToScanner);

    for (var i = 0; i < els.categoryTabs.length; i += 1) {
      els.categoryTabs[i].addEventListener("click", function (event) {
        setCategory(event.currentTarget.getAttribute("data-category"));
      });
    }

    if (els.artworkImage) els.artworkImage.addEventListener("click", handleCoordinateClick);
  }

  function init() {
    log("RijksLens JavaScript loaded. Version: " + VERSION);
    log("URL: " + window.location.href);
    log("Secure context: " + String(window.isSecureContext));
    log("Artwork records loaded: " + artworks.length);

    if (!artworks.length) {
      setStatus("The artwork data did not load. Check that data/artworks.js exists and is committed on GitHub.", "error");
      return;
    }

    setStatus("JavaScript loaded. Preparing artwork recognition...");
    preloadReferenceFingerprints()
      .then(function () {
        state.referenceReady = true;
        setStatus("Ready. This prototype can recognize " + artworks[0].title + ".", "success");
        log("Reference image loaded and fingerprinted.");
      })
      .catch(function (error) {
        state.referenceReady = false;
        log("Reference prep failed: " + getErrorText(error));
        setStatus("The page works, but recognition prep failed. Check that assets/milkmaid.jpg exists and is named exactly milkmaid.jpg. The demo button should still work.", "error");
      });
  }

  function preloadReferenceFingerprints() {
    var chain = Promise.resolve();
    for (var i = 0; i < artworks.length; i += 1) {
      (function (artwork) {
        chain = chain.then(function () {
          log("Loading reference image: " + artwork.image);
          return loadImage(artwork.image).then(function (image) {
            var fingerprint = makeFingerprintFromImage(image, image.width / image.height);
            state.referenceFingerprints[artwork.id] = fingerprint;
          });
        });
      }(artworks[i]));
    }
    return chain;
  }

  function startCamera() {
    log("Start camera button tapped.");
    setStatus("Camera button tapped. Checking browser support...");

    if (!window.isSecureContext) {
      setStatus("Camera access requires HTTPS. Your current page is not a secure browser context.", "error");
      log("Blocked: not a secure context.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Safari is not exposing camera access to this page. Open the page directly in Safari, not inside another app, and check Safari camera permissions.", "error");
      log("navigator.mediaDevices or getUserMedia is missing.");
      return;
    }

    setStatus("Asking iPhone for camera permission...");

    var attempts = [
      { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { audio: false, video: { facingMode: "environment" } },
      { audio: false, video: true }
    ];

    tryCameraAttempt(attempts, 0);
  }

  function tryCameraAttempt(attempts, index) {
    var constraints = attempts[index];
    log("Trying camera constraints " + (index + 1) + ": " + JSON.stringify(constraints));

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        state.stream = stream;
        els.camera.srcObject = stream;
        els.camera.setAttribute("playsinline", "");
        els.camera.setAttribute("webkit-playsinline", "");
        els.camera.muted = true;
        els.camera.autoplay = true;

        var playPromise = els.camera.play();
        if (playPromise && playPromise.then) return playPromise;
        return Promise.resolve();
      })
      .then(function () {
        els.cameraPlaceholder.classList.add("hidden");
        els.scanButton.disabled = false;
        setStatus("Camera started. Center the painting, then tap Recognize painting.", "success");
        log("Camera started. videoWidth=" + els.camera.videoWidth + ", videoHeight=" + els.camera.videoHeight);
      })
      .catch(function (error) {
        log("Camera attempt " + (index + 1) + " failed: " + getErrorText(error));
        if (index + 1 < attempts.length) {
          tryCameraAttempt(attempts, index + 1);
          return;
        }
        setStatus("Camera failed: " + getErrorText(error) + ". Check iPhone Settings > Safari > Camera > Allow, then reload.", "error");
      });
  }

  function scanCurrentFrame() {
    log("Recognize painting tapped.");
    var video = els.camera;
    if (!video.videoWidth || !video.videoHeight) {
      setStatus("The camera is not ready yet. Wait a second and try again.", "error");
      log("No video dimensions yet.");
      return;
    }

    var targetAspect = getPrimaryAspectRatio();
    var canvas = els.scanCanvas;
    var ctx = canvas.getContext("2d");
    var crop = centeredCrop(video.videoWidth, video.videoHeight, targetAspect);
    canvas.width = 640;
    canvas.height = Math.round(640 / targetAspect);
    ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);

    var fingerprint = makeFingerprintFromCanvas(canvas);
    evaluateFingerprint(fingerprint, "camera");
  }

  function handleUpload(event) {
    log("Upload input changed.");
    var file = event.target.files && event.target.files[0];
    if (!file) {
      log("No file selected.");
      return;
    }

    log("Selected file: " + (file.name || "unnamed") + ", type=" + (file.type || "unknown") + ", size=" + file.size);
    setStatus("Photo selected. Reading image...");

    var reader = new FileReader();
    reader.onload = function (loadEvent) {
      loadImage(loadEvent.target.result)
        .then(function (image) {
          log("Uploaded image loaded. width=" + image.width + ", height=" + image.height);
          var fingerprint = makeFingerprintFromImage(image, getPrimaryAspectRatio());
          evaluateFingerprint(fingerprint, "uploaded photo");
        })
        .catch(function (error) {
          log("Uploaded image load failed: " + getErrorText(error));
          setStatus("Could not read that image. Try taking a screenshot/JPEG of the Milkmaid and upload that.", "error");
        })
        .then(function () {
          event.target.value = "";
        });
    };
    reader.onerror = function () {
      log("FileReader failed.");
      setStatus("Could not read the selected photo.", "error");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function evaluateFingerprint(fingerprint, sourceLabel) {
    if (!state.referenceReady) {
      log("Reference not ready; opening demo after " + sourceLabel + " input.");
      if (artworks.length) openArtwork(artworks[0], "Opened after processing " + sourceLabel + ".");
      return;
    }

    var ranked = [];
    for (var i = 0; i < artworks.length; i += 1) {
      var artwork = artworks[i];
      var reference = state.referenceFingerprints[artwork.id];
      ranked.push({ artwork: artwork, score: compareFingerprints(fingerprint, reference) });
    }
    ranked.sort(function (a, b) { return b.score - a.score; });

    var best = ranked[0];
    var threshold = typeof best.artwork.recognitionThreshold === "number" ? best.artwork.recognitionThreshold : 0.6;
    var percent = Math.round(best.score * 100);
    log("Recognition score from " + sourceLabel + ": " + percent + "% for " + best.artwork.title + " threshold=" + Math.round(threshold * 100) + "%");

    if (best.score >= threshold) {
      setStatus("Recognized: " + best.artwork.title + " (" + percent + "% match).", "success");
      window.setTimeout(function () {
        openArtwork(best.artwork, "Recognized with " + percent + "% confidence.");
      }, 300);
    } else {
      setStatus("Photo processed, but match was only " + percent + "%. Because this is a one-artwork prototype, opening the demo anyway.", "error");
      window.setTimeout(function () {
        openArtwork(best.artwork, "Prototype fallback opened after a low-confidence " + percent + "% match.");
      }, 900);
    }
  }

  function openArtwork(artwork, message) {
    message = message || "";
    state.activeArtwork = artwork;
    state.activeCategory = "history";
    state.activeBubbleId = null;

    els.scannerScreen.classList.add("hidden");
    els.artworkScreen.classList.remove("hidden");
    els.resetButton.classList.remove("hidden");

    els.artworkImage.src = artwork.image;
    els.artworkImage.alt = artwork.title + " by " + artwork.artist;
    els.artworkMeta.textContent = artwork.artist + " • " + artwork.date + " • " + artwork.objectNumber;
    els.artworkTitle.textContent = artwork.title;
    els.artworkSubtitle.textContent = artwork.museum + ". " + message;

    setCategory("history");
    stopCamera();
  }

  function resetToScanner() {
    state.activeArtwork = null;
    state.activeBubbleId = null;
    els.artworkScreen.classList.add("hidden");
    els.scannerScreen.classList.remove("hidden");
    els.resetButton.classList.add("hidden");
    setStatus("Ready. This prototype can recognize " + artworks[0].title + ".", "success");
  }

  function setCategory(categoryKey) {
    if (!state.activeArtwork) return;

    state.activeCategory = categoryKey;
    state.activeBubbleId = null;

    for (var i = 0; i < els.categoryTabs.length; i += 1) {
      var active = els.categoryTabs[i].getAttribute("data-category") === categoryKey;
      els.categoryTabs[i].classList.toggle("active", active);
      els.categoryTabs[i].setAttribute("aria-selected", String(active));
    }

    var category = state.activeArtwork.categories[categoryKey];
    els.categoryLabel.textContent = category.label;
    els.storyTitle.textContent = category.label + " bubbles";
    els.storyText.textContent = category.intro || "Tap a bubble to read more.";
    els.storyDetail.textContent = "";
    els.storySource.textContent = "";

    renderHotspots(category.bubbles);
  }

  function renderHotspots(bubbles) {
    els.hotspotLayer.innerHTML = "";

    for (var i = 0; i < bubbles.length; i += 1) {
      (function (bubble, index) {
        var button = document.createElement("button");
        button.className = "hotspot";
        button.type = "button";
        button.setAttribute("data-title", bubble.title);
        button.style.left = bubble.x + "%";
        button.style.top = bubble.y + "%";
        button.textContent = String(index + 1);
        button.setAttribute("aria-label", bubble.title);
        button.addEventListener("click", function () {
          selectBubble(bubble);
        });
        els.hotspotLayer.appendChild(button);
      }(bubbles[i], i));
    }
  }

  function selectBubble(bubble) {
    state.activeBubbleId = bubble.id;
    els.storyTitle.textContent = bubble.title;
    els.storyText.textContent = bubble.shortText || "Add shortText for this bubble in data/artworks.js.";
    els.storyDetail.textContent = bubble.detailText || "Add detailText for this bubble in data/artworks.js.";
    els.storySource.textContent = bubble.source ? "Source: " + bubble.source : "";

    var buttons = document.querySelectorAll(".hotspot");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.toggle("active", buttons[i].getAttribute("data-title") === bubble.title);
    }
  }

  function runDiagnostics() {
    log("--- Diagnostics ---");
    log("Version: " + VERSION);
    log("User agent: " + navigator.userAgent);
    log("Protocol: " + window.location.protocol);
    log("Host: " + window.location.host);
    log("Secure context: " + String(window.isSecureContext));
    log("mediaDevices exists: " + String(!!navigator.mediaDevices));
    log("getUserMedia exists: " + String(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)));
    log("FileReader exists: " + String(!!window.FileReader));
    log("Canvas supported: " + String(!!document.createElement("canvas").getContext));
    log("Artwork records loaded: " + artworks.length);
    log("Reference ready: " + String(state.referenceReady));
    setStatus("Diagnostics printed below. If camera still does nothing, send me the diagnostic text.", "success");
  }

  function setStatus(message, type) {
    if (!els.scanStatus) return;
    els.scanStatus.textContent = message;
    els.scanStatus.classList.remove("success");
    els.scanStatus.classList.remove("error");
    if (type) els.scanStatus.classList.add(type);
  }

  function setStatusSafe(message, type) {
    var status = document.getElementById("scanStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.remove("success");
    status.classList.remove("error");
    if (type) status.classList.add(type);
  }

  function log(message) {
    var line = new Date().toLocaleTimeString() + " - " + message;
    if (window.console && console.log) console.log(line);
    var logEl = document.getElementById("debugLog");
    if (logEl) {
      logEl.textContent = (logEl.textContent ? logEl.textContent + "\n" : "") + line;
    }
  }

  function getErrorText(error) {
    if (!error) return "Unknown error";
    var name = error.name || "Error";
    var message = error.message || String(error);
    return name + ": " + message;
  }

  function stopCamera() {
    if (!state.stream) return;
    var tracks = state.stream.getTracks();
    for (var i = 0; i < tracks.length; i += 1) {
      tracks[i].stop();
    }
    state.stream = null;
    els.camera.srcObject = null;
    els.scanButton.disabled = true;
    els.cameraPlaceholder.classList.remove("hidden");
  }

  function handleCoordinateClick(event) {
    if (!state.editMode) return;

    var rect = els.artworkImage.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * 100;
    var y = ((event.clientY - rect.top) / rect.height) * 100;

    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    var roundedX = Math.round(x * 10) / 10;
    var roundedY = Math.round(y * 10) / 10;
    var text = "x: " + roundedX + ", y: " + roundedY;

    els.coordinateReadout.textContent = text;
    els.coordinateReadout.classList.remove("hidden");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
  }

  function getPrimaryAspectRatio() {
    return 960 / 1076;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error("Could not load image")); };
      image.src = src;
    });
  }

  function makeFingerprintFromImage(image, targetAspect) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var crop = centeredCrop(image.naturalWidth || image.width, image.naturalHeight || image.height, targetAspect);
    canvas.width = 64;
    canvas.height = Math.round(64 / targetAspect);
    ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    return makeFingerprintFromCanvas(canvas);
  }

  function makeFingerprintFromCanvas(sourceCanvas) {
    var size = 32;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(sourceCanvas, 0, 0, size, size);

    var pixels = ctx.getImageData(0, 0, size, size).data;
    var lumas = [];
    var histogram = [];
    var i;
    for (i = 0; i < 24; i += 1) histogram.push(0);

    for (i = 0; i < pixels.length; i += 4) {
      var r = pixels[i];
      var g = pixels[i + 1];
      var b = pixels[i + 2];
      var luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumas.push(luma);
      histogram[Math.min(7, Math.floor(r / 32))] += 1;
      histogram[8 + Math.min(7, Math.floor(g / 32))] += 1;
      histogram[16 + Math.min(7, Math.floor(b / 32))] += 1;
    }

    var totalLuma = 0;
    for (i = 0; i < lumas.length; i += 1) totalLuma += lumas[i];
    var avg = totalLuma / lumas.length;

    var hash = [];
    for (i = 0; i < lumas.length; i += 1) hash.push(lumas[i] >= avg ? 1 : 0);

    var histTotal = 0;
    for (i = 0; i < histogram.length; i += 1) histTotal += histogram[i];

    var normalizedHistogram = [];
    for (i = 0; i < histogram.length; i += 1) normalizedHistogram.push(histogram[i] / histTotal);

    return { hash: hash, histogram: normalizedHistogram };
  }

  function compareFingerprints(a, b) {
    if (!a || !b) return 0;

    var sameBits = 0;
    var i;
    for (i = 0; i < a.hash.length; i += 1) {
      if (a.hash[i] === b.hash[i]) sameBits += 1;
    }
    var hashSimilarity = sameBits / a.hash.length;

    var histogramDistance = 0;
    for (i = 0; i < a.histogram.length; i += 1) {
      histogramDistance += Math.abs(a.histogram[i] - b.histogram[i]);
    }
    var histogramSimilarity = Math.max(0, 1 - histogramDistance / 2);

    return 0.68 * hashSimilarity + 0.32 * histogramSimilarity;
  }

  function centeredCrop(width, height, targetAspect) {
    var sourceAspect = width / height;
    var cropW = width;
    var cropH = height;

    if (sourceAspect > targetAspect) {
      cropW = height * targetAspect;
    } else {
      cropH = width / targetAspect;
    }

    return {
      x: (width - cropW) / 2,
      y: (height - cropH) / 2,
      w: cropW,
      h: cropH
    };
  }
}());
