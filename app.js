(function () {
  "use strict";

  var artworks = window.RIJKSLENS_ARTWORKS || [];

  var state = {
    activeArtwork: null,
    activeCategory: "history",
    activeBubbleId: null,
    referenceFingerprints: {},
    stream: null,
    editMode: window.location.search.indexOf("edit") !== -1
  };

  var els = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEventsImmediately();
    init();
  });

  function cacheElements() {
    els.scannerScreen = document.querySelector("#scannerScreen");
    els.artworkScreen = document.querySelector("#artworkScreen");
    els.camera = document.querySelector("#camera");
    els.scanCanvas = document.querySelector("#scanCanvas");
    els.cameraPlaceholder = document.querySelector("#cameraPlaceholder");
    els.startCameraButton = document.querySelector("#startCameraButton");
    els.scanButton = document.querySelector("#scanButton");
    els.uploadInput = document.querySelector("#uploadInput");
    els.scanStatus = document.querySelector("#scanStatus");
    els.demoButton = document.querySelector("#demoButton");
    els.resetButton = document.querySelector("#resetButton");
    els.artworkMeta = document.querySelector("#artworkMeta");
    els.artworkTitle = document.querySelector("#artworkTitle");
    els.artworkSubtitle = document.querySelector("#artworkSubtitle");
    els.artworkImage = document.querySelector("#artworkImage");
    els.hotspotLayer = document.querySelector("#hotspotLayer");
    els.categoryTabs = document.querySelectorAll(".category-tab");
    els.categoryLabel = document.querySelector("#categoryLabel");
    els.storyTitle = document.querySelector("#storyTitle");
    els.storyText = document.querySelector("#storyText");
    els.storyDetail = document.querySelector("#storyDetail");
    els.storySource = document.querySelector("#storySource");
    els.coordinateReadout = document.querySelector("#coordinateReadout");
  }

  function bindEventsImmediately() {
    if (els.startCameraButton) els.startCameraButton.addEventListener("click", startCamera);
    if (els.scanButton) els.scanButton.addEventListener("click", scanCurrentFrame);
    if (els.uploadInput) els.uploadInput.addEventListener("change", handleUpload);
    if (els.demoButton) els.demoButton.addEventListener("click", function () {
      if (artworks.length) openArtwork(artworks[0], "Opened the demo artwork.");
    });
    if (els.resetButton) els.resetButton.addEventListener("click", resetToScanner);

    for (var i = 0; i < els.categoryTabs.length; i += 1) {
      els.categoryTabs[i].addEventListener("click", function (event) {
        setCategory(event.currentTarget.getAttribute("data-category"));
      });
    }

    if (els.artworkImage) els.artworkImage.addEventListener("click", handleCoordinateClick);
  }

  function init() {
    if (!artworks.length) {
      setStatus("The artwork data did not load. Check that data/artworks.js exists and is committed on GitHub.", "error");
      return;
    }

    setStatus("Preparing artwork recognition...");
    preloadReferenceFingerprints()
      .then(function () {
        setStatus("Ready. This prototype can recognize " + artworks.length + " artwork: " + artworks[0].title + ".");
      })
      .catch(function (error) {
        console.error(error);
        setStatus("Recognition prep failed, usually because assets/milkmaid.jpg is missing or misnamed. The demo button should still work.", "error");
      });
  }

  function preloadReferenceFingerprints() {
    var chain = Promise.resolve();
    artworks.forEach(function (artwork) {
      chain = chain.then(function () {
        return loadImage(artwork.image).then(function (image) {
          var fingerprint = makeFingerprintFromImage(image, image.width / image.height);
          state.referenceFingerprints[artwork.id] = fingerprint;
        });
      });
    });
    return chain;
  }

  function startCamera() {
    setStatus("Camera button tapped. Asking iPhone for permission...");

    if (!window.isSecureContext) {
      setStatus("Camera access requires HTTPS. Open the GitHub Pages https:// address directly in Safari.", "error");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("This browser does not expose camera access. Open the site directly in Safari, not inside the GitHub app, Instagram, WhatsApp, or another in-app browser.", "error");
      return;
    }

    var constraints = {
      video: {
        facingMode: "environment"
      },
      audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        state.stream = stream;
        els.camera.srcObject = stream;
        els.camera.setAttribute("playsinline", "");
        els.camera.muted = true;
        return els.camera.play();
      })
      .then(function () {
        els.cameraPlaceholder.classList.add("hidden");
        els.scanButton.disabled = false;
        setStatus("Camera started. Center the painting inside the frame, then tap Recognize painting.", "success");
      })
      .catch(function (error) {
        console.error(error);
        var name = error && error.name ? error.name : "Camera error";
        var message = error && error.message ? error.message : "No extra error message.";
        setStatus(name + ": " + message + " Try Safari Settings > Camera > Allow, then reload the page.", "error");
      });
  }

  function scanCurrentFrame() {
    var video = els.camera;
    if (!video.videoWidth || !video.videoHeight) {
      setStatus("The camera is not ready yet. Wait a second and try again.", "error");
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
    evaluateFingerprint(fingerprint);
  }

  function handleUpload(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var objectUrl = URL.createObjectURL(file);
    loadImage(objectUrl)
      .then(function (image) {
        var fingerprint = makeFingerprintFromImage(image, getPrimaryAspectRatio());
        evaluateFingerprint(fingerprint);
      })
      .catch(function (error) {
        console.error(error);
        setStatus("Could not read that image. Try a different photo.", "error");
      })
      .then(function () {
        URL.revokeObjectURL(objectUrl);
        event.target.value = "";
      });
  }

  function evaluateFingerprint(fingerprint) {
    var ranked = artworks.map(function (artwork) {
      var reference = state.referenceFingerprints[artwork.id];
      return { artwork: artwork, score: compareFingerprints(fingerprint, reference) };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    var best = ranked[0];
    var threshold = typeof best.artwork.recognitionThreshold === "number" ? best.artwork.recognitionThreshold : 0.7;
    var percent = Math.round(best.score * 100);

    if (best.score >= threshold) {
      setStatus("Recognized: " + best.artwork.title + " (" + percent + "% match).", "success");
      window.setTimeout(function () {
        openArtwork(best.artwork, "Recognized with " + percent + "% confidence.");
      }, 450);
    } else {
      setStatus("Not confident yet. Best match was " + best.artwork.title + " at " + percent + "%. Move closer, center the painting, or upload a clearer photo.", "error");
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
    setStatus("Ready. This prototype can recognize " + artworks.length + " artwork: " + artworks[0].title + ".");
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

    bubbles.forEach(function (bubble, index) {
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
    });
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

  function setStatus(message, type) {
    if (!els.scanStatus) return;
    els.scanStatus.textContent = message;
    els.scanStatus.classList.remove("success", "error");
    if (type) els.scanStatus.classList.add(type);
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
      image.onerror = function () { reject(new Error("Could not load image: " + src)); };
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
    var histogram = new Array(24).fill(0);

    for (var i = 0; i < pixels.length; i += 4) {
      var r = pixels[i];
      var g = pixels[i + 1];
      var b = pixels[i + 2];
      var luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumas.push(luma);
      histogram[Math.min(7, Math.floor(r / 32))] += 1;
      histogram[8 + Math.min(7, Math.floor(g / 32))] += 1;
      histogram[16 + Math.min(7, Math.floor(b / 32))] += 1;
    }

    var avg = lumas.reduce(function (sum, value) { return sum + value; }, 0) / lumas.length;
    var hash = lumas.map(function (value) { return value >= avg ? 1 : 0; });
    var histTotal = histogram.reduce(function (sum, value) { return sum + value; }, 0);
    var normalizedHistogram = histogram.map(function (value) { return value / histTotal; });

    return { hash: hash, histogram: normalizedHistogram };
  }

  function compareFingerprints(a, b) {
    if (!a || !b) return 0;

    var sameBits = 0;
    for (var i = 0; i < a.hash.length; i += 1) {
      if (a.hash[i] === b.hash[i]) sameBits += 1;
    }
    var hashSimilarity = sameBits / a.hash.length;

    var histogramDistance = 0;
    for (var j = 0; j < a.histogram.length; j += 1) {
      histogramDistance += Math.abs(a.histogram[j] - b.histogram[j]);
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
