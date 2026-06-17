(function () {
  "use strict";

  var VERSION = "backend-recognition-v1";

  // Replace this with your Render backend base URL.
  // Example: var BACKEND_URL = "https://rijkslens-recognition-backend.onrender.com";
  var BACKEND_URL = "https://rijkslens-recognition-backend.onrender.com/";

  var artworks = [];

  var state = {
    activeArtwork: null,
    activeCategory: "history",
    stream: null,
    editMode: window.location.search.indexOf("edit") !== -1
  };

  var els = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEvents();
    boot();
  });

  window.addEventListener("error", function (event) {
    log("JavaScript error: " + event.message);
    setStatusSafe("JavaScript error: " + event.message, "error");
  });

  function boot() {
    BACKEND_URL = String(BACKEND_URL || "").replace(/\/$/, "");

    setStatus("RijksLens loaded. Backend recognition enabled.", "info");
    log("Version: " + VERSION);
    log("Backend URL: " + BACKEND_URL);
    log("Secure context: " + String(window.isSecureContext));

    artworks = window.RIJKSLENS_ARTWORKS || [];

    if (artworks.length > 0) {
      log("Artwork records loaded: " + artworks.length);
      return;
    }

    log("No artwork data found. Trying to auto-load artworks-v2.js.");

    var script = document.createElement("script");
    script.src = "./artworks-v2.js?auto=" + Date.now();

    script.onload = function () {
      artworks = window.RIJKSLENS_ARTWORKS || [];
      log("Auto-loaded artwork data. Artwork records loaded: " + artworks.length);

      if (!artworks.length) {
        setStatus("No artwork data found in artworks-v2.js.", "error");
      }
    };

    script.onerror = function () {
      setStatus("Could not load artwork data. Check artworks-v2.js.", "error");
      log("FAILED to auto-load artworks-v2.js.");
    };

    document.head.appendChild(script);
  }

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
    canvas.width = 1000;
    canvas.height = 1000;

    var ctx = canvas.getContext("2d");
    drawContain(els.camera, ctx, canvas.width, canvas.height);

    canvasToBlob(canvas, function (blob) {
      if (!blob) {
        setStatus("Could not prepare camera image.", "error");
        return;
      }

      recognizeBlob(blob, "camera.jpg", "camera");
    });
  }

  function handleUpload(event) {
    log("Upload selected.");

    var file = event.target.files && event.target.files[0];

    if (!file) {
      setStatus("No image selected.", "error");
      return;
    }

    log("Uploaded file: " + file.name + " / " + file.type + " / " + file.size + " bytes");
    recognizeBlob(file, file.name || "upload.jpg", "uploaded photo");
  }

  function recognizeBlob(blob, filename, sourceLabel) {
    if (!BACKEND_URL || BACKEND_URL.indexOf("PASTE_") === 0) {
      setStatus("Backend URL is not set in app.js.", "error");
      log("Set BACKEND_URL at the top of app.js.");
      return;
    }

    if (!artworks.length) {
      setStatus("Artwork data is not loaded yet. Check artworks-v2.js.", "error");
      return;
    }

    setStatus("Sending image to recognition backend...", "info");
    log("POST " + BACKEND_URL + "/recognize");

    var formData = new FormData();
    formData.append("file", blob, filename);

    fetch(BACKEND_URL + "/recognize", {
      method: "POST",
      body: formData
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return {
            ok: response.ok,
            status: response.status,
            data: data
          };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var detail = result.data && result.data.detail ? result.data.detail : "Recognition request failed.";
          setStatus("Backend error: " + detail, "error");
          log("Backend error " + result.status + ": " + detail);
          return;
        }

        handleRecognitionResult(result.data, sourceLabel);
      })
      .catch(function (err) {
        setStatus("Could not reach backend: " + err.message, "error");
        log("Fetch error: " + err.message);
      });
  }

  function handleRecognitionResult(result, sourceLabel) {
    log("--- Backend recognition result from " + sourceLabel + " ---");
    log("Accepted: " + String(result.accepted));
    log("Message: " + (result.message || ""));

    if (result.bestCandidate) {
      log(
        "Best: " +
          result.bestCandidate.title +
          " / inliers: " +
          result.bestCandidate.inliers +
          " / good matches: " +
          result.bestCandidate.goodMatches +
          " / confidence: " +
          result.bestCandidate.confidence
      );
    }

    if (result.secondCandidate) {
      log(
        "Second: " +
          result.secondCandidate.title +
          " / inliers: " +
          result.secondCandidate.inliers +
          " / good matches: " +
          result.secondCandidate.goodMatches +
          " / confidence: " +
          result.secondCandidate.confidence
      );
    }

    if (result.candidates && result.candidates.length) {
      for (var i = 0; i < result.candidates.length; i += 1) {
        var candidate = result.candidates[i];
        log(
          "Candidate " +
            (i + 1) +
            ": " +
            candidate.title +
            " / inliers " +
            candidate.inliers +
            " / matches " +
            candidate.goodMatches +
            " / ratio " +
            candidate.inlierRatio
        );
      }
    }

    if (!result.accepted || !result.artworkId) {
      setStatus(result.message || "Painting not recognized confidently.", "error");
      return;
    }

    var artwork = findArtworkById(result.artworkId);

    if (!artwork) {
      setStatus(
        "Backend recognized '" +
          result.artworkId +
          "', but this artwork ID is missing from artworks-v2.js.",
        "error"
      );
      log("Missing frontend artwork id: " + result.artworkId);
      return;
    }

    setStatus("Recognized: " + artwork.title, "success");

    window.setTimeout(function () {
      openArtwork(artwork, result.message || "Recognized by backend.");
    }, 250);
  }

  function findArtworkById(id) {
    for (var i = 0; i < artworks.length; i += 1) {
      if (artworks[i].id === id) {
        return artworks[i];
      }
    }

    return null;
  }

  function runDiagnostics() {
    log("--- Diagnostics ---");
    log("Version: " + VERSION);
    log("URL: " + window.location.href);
    log("Backend URL: " + BACKEND_URL);
    log("Secure context: " + String(window.isSecureContext));
    log("Has getUserMedia: " + String(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)));
    log("Artwork records loaded: " + artworks.length);

    for (var i = 0; i < artworks.length; i += 1) {
      log("Artwork " + (i + 1) + ": " + artworks[i].id + " / " + artworks[i].title);
    }

    if (!BACKEND_URL || BACKEND_URL.indexOf("PASTE_") === 0) {
      setStatus("Backend URL is not set in app.js.", "error");
      return;
    }

    setStatus("Checking backend health...", "info");

    fetch(BACKEND_URL + "/health")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        log("Backend health: " + JSON.stringify(data));
        setStatus(
          "Backend health: " +
            data.referenceCount +
            " reference image(s), detector " +
            data.detector +
            ".",
          data.ok ? "success" : "error"
        );
      })
      .catch(function (err) {
        setStatus("Could not reach backend health endpoint: " + err.message, "error");
        log("Health check error: " + err.message);
      });
  }

  function drawContain(source, ctx, targetWidth, targetHeight) {
    var sourceWidth = source.videoWidth || source.naturalWidth || source.width;
    var sourceHeight = source.videoHeight || source.naturalHeight || source.height;

    if (!sourceWidth || !sourceHeight) {
      return;
    }

    ctx.fillStyle = "#777777";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    var scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    var drawWidth = sourceWidth * scale;
    var drawHeight = sourceHeight * scale;
    var dx = (targetWidth - drawWidth) / 2;
    var dy = (targetHeight - drawHeight) / 2;

    ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, dx, dy, drawWidth, drawHeight);
  }

  function canvasToBlob(canvas, callback) {
    if (canvas.toBlob) {
      canvas.toBlob(
        function (blob) {
          callback(blob);
        },
        "image/jpeg",
        0.9
      );
      return;
    }

    var dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    callback(dataUrlToBlob(dataUrl));
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(",");
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    var binary = atob(parts[1]);
    var length = binary.length;
    var array = new Uint8Array(length);

    for (var i = 0; i < length; i += 1) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: mime });
  }

  function openArtwork(artwork, reason) {
    state.activeArtwork = artwork;
    state.activeCategory = "history";

    if (els.scannerScreen) {
      els.scannerScreen.classList.add("hidden");
    }

    if (els.artworkScreen) {
      els.artworkScreen.classList.remove("hidden");
    }

    if (els.resetButton) {
      els.resetButton.classList.remove("hidden");
    }

    els.artworkMeta.textContent = artwork.artist + " · " + artwork.date + " · " + artwork.objectNumber;
    els.artworkTitle.textContent = artwork.title;
    els.artworkSubtitle.textContent = artwork.museum + ". " + reason;
    els.artworkImage.src = artwork.image;
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
    if (!state.activeArtwork || !els.hotspotLayer) {
      return;
    }

    els.hotspotLayer.innerHTML = "";

    var category = state.activeArtwork.categories[state.activeCategory];

    if (!category || !category.bubbles) {
      return;
    }

    for (var i = 0; i < category.bubbles.length; i += 1) {
      createHotspot(category.bubbles[i]);
    }
  }

  function createHotspot(bubble) {
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
  }

  function selectBubble(bubble) {
    els.storyTitle.textContent = bubble.title;
    els.storyText.textContent = bubble.shortText || "";
    els.storyDetail.textContent = bubble.detailText || "";
    els.storySource.textContent = bubble.source ? "Source: " + bubble.source : "";
  }

  function resetToScanner() {
    if (els.artworkScreen) {
      els.artworkScreen.classList.add("hidden");
    }

    if (els.scannerScreen) {
      els.scannerScreen.classList.remove("hidden");
    }

    if (els.resetButton) {
      els.resetButton.classList.add("hidden");
    }

    setStatus("Ready to scan again.", "info");
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
    if (!els.scanStatus) {
      return;
    }

    els.scanStatus.textContent = message;
    els.scanStatus.className = "scan-status " + (type || "info");
  }

  function setStatusSafe(message, type) {
    var el = document.getElementById("scanStatus");

    if (!el) {
      return;
    }

    el.textContent = message;
    el.className = "scan-status " + (type || "info");
  }

  function log(message) {
    var el = els.debugLog || document.getElementById("debugLog");

    if (!el) {
      return;
    }

    var time = new Date().toLocaleTimeString();
    el.textContent += "[" + time + "] " + message + "\n";
  }
})();
