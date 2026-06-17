(function () {
  "use strict";

  var VERSION = "force3-non-module";
  var artworks = window.RIJKSLENS_ARTWORKS || [];

  var state = {
    activeArtwork: null,
    activeCategory: "history",
    referenceFingerprints: {},
    referenceReady: false,
    stream: null,
    editMode: window.location.search.indexOf("edit") !== -1
  };

  var els = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEvents();
    init();
  });

  window.addEventListener("error", function (event) {
    log("JavaScript error: " + event.message);
    setStatusSafe("JavaScript error: " + event.message, "error");
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

  function bindEvents() {
    if (els.startCameraButton) {
      els.startCameraButton.addEventListener("click", startCamera);
    }

    if (els.scanButton) {
      els.scanButton.addEventListener("click", scanCurrentFrame);
    }

    if (els.uploadInput) {
      els.uploadInput.addEventListener("change", handleUpload);
    }

    if (els.diagnosticsButton) {
      els.diagnosticsButton.addEventListener("click", runDiagnostics);
    }

    if (els.demoButton) {
      els.demoButton.addEventListener("click", function () {
        if (artworks.length > 0) {
          openArtwork(artworks[0], "Opened manually with the demo button.");
        } else {
          setStatus("No artwork data loaded.", "error");
        }
      });
    }

    if (els.resetButton) {
      els.resetButton.addEventListener("click", resetToScanner);
    }

    for (var i = 0; i < els.categoryTabs.length; i += 1) {
      els.categoryTabs[i].addEventListener("click", function (event) {
        setCategory(event.currentTarget.getAttribute("data-category"));
      });
    }

    if (els.artworkImage && state.editMode) {
      els.artworkImage.addEventListener("click", showCoordinate);
    }
  }

  function init() {
    setStatus("RijksLens JavaScript loaded. Version: " + VERSION, "info");
    log("RijksLens JavaScript loaded. Version: " + VERSION);
    log("Secure context: " + String(window.isSecureContext));
    log("Artwork records loaded: " + artworks.length);

    if (!artworks.length) {
      setStatus("No artwork records found. Check artworks-v2.js.", "error");
      return;
    }

    loadReferenceImages();
  }

  function loadReferenceImages() {
    var remaining = artworks.length;
    var loaded = 0;

    setStatus("Loading reference images...", "info");

    for (var i = 0; i < artworks.length; i += 1) {
      (function (artwork) {
        var img = new Image();

        img.onload = function () {
          try {
            state.referenceFingerprints[artwork.id] = makeFingerprintFromImage(img);
            loaded += 1;
            log("Loaded reference image: " + artwork.title + " from " + artwork.image);
          } catch (err) {
            log("Could not fingerprint " + artwork.title + ": " + err.message);
          }

          remaining -= 1;
          finishIfDone();
        };

        img.onerror = function () {
          log("FAILED to load reference image for " + artwork.title + ": " + artwork.image);
          remaining -= 1;
          finishIfDone();
        };

        img.src = artwork.image + "?v=force3";
      })(artworks[i]);
    }

    function finishIfDone() {
      if (remaining === 0) {
        state.referenceReady = loaded > 0;

        if (state.referenceReady) {
          setStatus("Ready. Loaded " + loaded + " reference image(s).", "success");
        } else {
          setStatus("No reference images loaded. Check the assets folder.", "error");
        }
      }
    }
  }

  function startCamera() {
    log("Start camera tapped.");

    if (!window.isSecureContext) {
      setStatus("Camera requires HTTPS. Open the https:// version of the site.", "error");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("This browser does not expose camera access to this page.", "error");
      return;
    }

    setStatus("Requesting camera permission...", "info");

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        },
        audio: false
      })
      .then(function (stream) {
        state.stream = stream;
        els.camera.srcObject = stream;

        if (els.cameraPlaceholder) {
          els.cameraPlaceholder.classList.add("hidden");
        }

        if (els.scanButton) {
          els.scanButton.disabled = false;
        }

        setStatus("Camera started. Center the painting and tap Recognize painting.", "success");
        log("Camera started.");
      })
      .catch(function (err) {
        log("Camera error: " + err.name + " - " + err.message);
        setStatus("Camera error: " + err.message, "error");
      });
  }

  function scanCurrentFrame() {
    log("Recognize painting tapped.");

    if (!els.camera || !els.camera.videoWidth || !els.camera.videoHeight) {
      setStatus("Camera is not ready yet. Wait for the preview, then try again.", "error");
      return;
    }

    var canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    var ctx = canvas.getContext("2d");

    drawCover(els.camera, ctx, canvas.width, canvas.height);
    evaluateFingerprint(makeFingerprintFromCanvas(canvas), "camera");
  }

  function handleUpload(event) {
    log("Upload selected.");

    var file = event.target.files && event.target.files[0];

    if (!file) {
      setStatus("No image selected.", "error");
      return;
    }

    var reader = new FileReader();

    reader.onload = function (loadEvent) {
      var img = new Image();

      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 640;
        var ctx = canvas.getContext("2d");

        drawCover(img, ctx, canvas.width, canvas.height);
        evaluateFingerprint(makeFingerprintFromCanvas(canvas), "uploaded photo");
      };

      img.onerror = function () {
        setStatus("Could not read the uploaded image.", "error");
      };

      img.src = loadEvent.target.result;
    };

    reader.onerror = function () {
      setStatus("Could not open the selected file.", "error");
    };

    reader.readAsDataURL(file);
  }

  function evaluateFingerprint(fingerprint, sourceLabel) {
    if (!state.referenceReady) {
      setStatus("Recognition is not ready. Reference images are still missing or loading.", "error");
      log("Recognition stopped because referenceReady=false.");
      return;
    }

    var ranked = [];

    for (var i = 0; i < artworks.length; i += 1) {
      var artwork = artworks[i];
      var reference = state.referenceFingerprints[artwork.id];

      if (!reference) {
        log("Missing reference fingerprint for: " + artwork.title);
        continue;
      }

      ranked.push({
        artwork: artwork,
        score: compareFingerprints(fingerprint, reference)
      });
    }

    ranked.sort(function (a, b) {
      return b.score - a.score;
    });

    log("--- Recognition scores from " + sourceLabel + " ---");

    for (i = 0; i < ranked.length; i += 1) {
      log(ranked[i].artwork.title + ": " + Math.round(ranked[i].score * 100) + "%");
    }

    if (!ranked.length) {
      setStatus("No loaded reference images to compare against.", "error");
      return;
    }

    var best = ranked[0];
    var second = ranked.length > 1 ? ranked[1] : null;
    var threshold = typeof best.artwork.recognitionThreshold === "number" ? best.artwork.recognitionThreshold : 0.92;
    var marginRequired = 0.04;
    var margin = second ? best.score - second.score : 1;

    var percent = Math.round(best.score * 100);
    var thresholdPercent = Math.round(threshold * 100);
    var marginPercent = Math.round(margin * 100);

    if (best.score >= threshold && margin >= marginRequired) {
      setStatus("Recognized: " + best.artwork.title + " (" + percent + "%).", "success");

      window.setTimeout(function () {
        openArtwork(best.artwork, "Recognized from " + sourceLabel + ".");
      }, 250);
    } else {
      setStatus(
        "Not recognized confidently. Best match: " +
          best.artwork.title +
          " at " +
          percent +
          "%. Required: " +
          thresholdPercent +
          "% and clear lead. Margin: " +
          marginPercent +
          "%.",
        "error"
      );
    }
  }

  function makeFingerprintFromImage(img) {
    var canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    var ctx = canvas.getContext("2d");

    drawCover(img, ctx, canvas.width, canvas.height);
    return makeFingerprintFromCanvas(canvas);
  }

  function makeFingerprintFromCanvas(sourceCanvas) {
    var size = 48;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(sourceCanvas, 0, 0, size, size);

    var pixels = ctx.getImageData(0, 0, size, size).data;
    var lumas = [];
    var colorGrid = [];
    var i;

    for (i = 0; i < pixels.length; i += 4) {
      var r = pixels[i];
      var g = pixels[i + 1];
      var b = pixels[i + 2];
      var luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumas.push(luma);
    }

    var avg = 0;
    for (i = 0; i < lumas.length; i += 1) {
      avg += lumas[i];
    }
    avg = avg / lumas.length;

    var averageHash = [];
    for (i = 0; i < lumas.length; i += 1) {
      averageHash.push(lumas[i] >= avg ? 1 : 0);
    }

    var differenceHash = [];
    for (var y = 0; y < size; y += 1) {
      for (var x = 0; x < size - 1; x += 1) {
        differenceHash.push(lumas[y * size + x] > lumas[y * size + x + 1] ? 1 : 0);
      }
    }

    var gridSize = 8;
    var cellSize = size / gridSize;

    for (var gy = 0; gy < gridSize; gy += 1) {
      for (var gx = 0; gx < gridSize; gx += 1) {
        var sumR = 0;
        var sumG = 0;
        var sumB = 0;
        var count = 0;

        for (var py = Math.floor(gy * cellSize); py < Math.floor((gy + 1) * cellSize); py += 1) {
          for (var px = Math.floor(gx * cellSize); px < Math.floor((gx + 1) * cellSize); px += 1) {
            var index = (py * size + px) * 4;
            sumR += pixels[index] / 255;
            sumG += pixels[index + 1] / 255;
            sumB += pixels[index + 2] / 255;
            count += 1;
          }
        }

        colorGrid.push(sumR / count);
        colorGrid.push(sumG / count);
        colorGrid.push(sumB / count);
      }
    }

    return {
      averageHash: averageHash,
      differenceHash: differenceHash,
      colorGrid: colorGrid
    };
  }

  function compareFingerprints(a, b) {
    if (!a || !b) return 0;

    var i;
    var sameAverage = 0;

    for (i = 0; i < a.averageHash.length; i += 1) {
      if (a.averageHash[i] === b.averageHash[i]) {
        sameAverage += 1;
      }
    }

    var sameDifference = 0;

    for (i = 0; i < a.differenceHash.length; i += 1) {
      if (a.differenceHash[i] === b.differenceHash[i]) {
        sameDifference += 1;
      }
    }

    var colorDistance = 0;

    for (i = 0; i < a.colorGrid.length; i += 1) {
      colorDistance += Math.abs(a.colorGrid[i] - b.colorGrid[i]);
    }

    var averageSimilarity = sameAverage / a.averageHash.length;
    var differenceSimilarity = sameDifference / a.differenceHash.length;
    var colorSimilarity = Math.max(0, 1 - colorDistance / a.colorGrid.length);

    return 0.3 * averageSimilarity + 0.35 * differenceSimilarity + 0.35 * colorSimilarity;
  }

  function drawCover(source, ctx, targetWidth, targetHeight) {
    var sourceWidth = source.videoWidth || source.naturalWidth || source.width;
    var sourceHeight = source.videoHeight || source.naturalHeight || source.height;

    var sourceRatio = sourceWidth / sourceHeight;
    var targetRatio = targetWidth / targetHeight;

    var drawWidth;
    var drawHeight;
    var sx;
    var sy;

    if (sourceRatio > targetRatio) {
      drawHeight = sourceHeight;
      drawWidth = sourceHeight * targetRatio;
      sx = (sourceWidth - drawWidth) / 2;
      sy = 0;
    } else {
      drawWidth = sourceWidth;
      drawHeight = sourceWidth / targetRatio;
      sx = 0;
      sy = (sourceHeight - drawHeight) / 2;
    }

    ctx.drawImage(source, sx, sy, drawWidth, drawHeight, 0, 0, targetWidth, targetHeight);
  }

  function openArtwork(artwork, reason) {
    state.activeArtwork = artwork;
    state.activeCategory = "history";

    if (els.scannerScreen) els.scannerScreen.classList.add("hidden");
    if (els.artworkScreen) els.artworkScreen.classList.remove("hidden");
    if (els.resetButton) els.resetButton.classList.remove("hidden");

    els.artworkMeta.textContent = artwork.artist + " · " + artwork.date + " · " + artwork.objectNumber;
    els.artworkTitle.textContent = artwork.title;
    els.artworkSubtitle.textContent = artwork.museum + ". " + reason;
    els.artworkImage.src = artwork.image + "?v=force3";
    els.artworkImage.alt = artwork.title + " by " + artwork.artist;

    setCategory("history");
  }

  function setCategory(categoryName) {
    state.activeCategory = categoryName;

    for (var i = 0; i < els.categoryTabs.length; i += 1) {
      if (els.categoryTabs[i].getAttribute("data-category") === categoryName) {
        els.categoryTabs[i].classList.add("active");
      } else {
        els.categoryTabs[i].classList.remove("active");
      }
    }

    renderHotspots();

    var category = state.activeArtwork && state.activeArtwork.categories[categoryName];

    if (category) {
      els.categoryLabel.textContent = category.label;
      els.storyTitle.textContent = "Choose a bubble";
      els.storyText.textContent = category.intro;
      els.storyDetail.textContent = "";
      els.storySource.textContent = "";
    }
  }

  function renderHotspots() {
    if (!state.activeArtwork || !els.hotspotLayer) return;

    els.hotspotLayer.innerHTML = "";

    var category = state.activeArtwork.categories[state.activeCategory];

    if (!category || !category.bubbles) return;

    for (var i = 0; i < category.bubbles.length; i += 1) {
      (function (bubble) {
        var button = document.createElement("button");
        button.className = "hotspot";
        button.type = "button";
        button.style.left = bubble.x + "%";
        button.style.top = bubble.y + "%";
        button.setAttribute("aria-label", bubble.title);
        button.textContent = "i";

        button.addEventListener("click", function () {
          selectBubble(bubble);
        });

        els.hotspotLayer.appendChild(button);
      })(category.bubbles[i]);
    }
  }

  function selectBubble(bubble) {
    els.storyTitle.textContent = bubble.title;
    els.storyText.textContent = bubble.shortText || "";
    els.storyDetail.textContent = bubble.detailText || "";
    els.storySource.textContent = bubble.source ? "Source: " + bubble.source : "";
  }

  function resetToScanner() {
    if (els.artworkScreen) els.artworkScreen.classList.add("hidden");
    if (els.scannerScreen) els.scannerScreen.classList.remove("hidden");
    if (els.resetButton) els.resetButton.classList.add("hidden");
    setStatus("Ready to scan again.", "info");
  }

  function runDiagnostics() {
    log("--- Diagnostics ---");
    log("Version: " + VERSION);
    log("URL: " + window.location.href);
    log("Secure context: " + String(window.isSecureContext));
    log("Has getUserMedia: " + String(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)));
    log("Artwork records loaded: " + artworks.length);
    log("Reference ready: " + String(state.referenceReady));

    for (var i = 0; i < artworks.length; i += 1) {
      log("Artwork " + (i + 1) + ": " + artworks[i].title + " / " + artworks[i].image);
    }

    setStatus("Diagnostics printed below.", "info");
  }

  function showCoordinate(event) {
    var rect = els.artworkImage.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * 100;
    var y = ((event.clientY - rect.top) / rect.height) * 100;

    if (els.coordinateReadout) {
      els.coordinateReadout.classList.remove("hidden");
      els.coordinateReadout.textContent = "x: " + Math.round(x) + ", y: " + Math.round(y);
    }

    log("Coordinate: x=" + Math.round(x) + ", y=" + Math.round(y));
  }

  function setStatus(message, type) {
    if (!els.scanStatus) return;
    els.scanStatus.textContent = message;
    els.scanStatus.className = "scan-status " + (type || "info");
  }

  function setStatusSafe(message, type) {
    var el = document.getElementById("scanStatus");
    if (!el) return;
    el.textContent = message;
    el.className = "scan-status " + (type || "info");
  }

  function log(message) {
    if (!els.debugLog) {
      return;
    }

    var time = new Date().toLocaleTimeString();
    els.debugLog.textContent += "[" + time + "] " + message + "\n";
  }
})();
