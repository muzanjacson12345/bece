/* BECE Hub bug capture: floating in-app capture + touch/mouse annotation.
   Screenshots are rendered from the current BECE Hub document only. They do not
   capture browser chrome, other tabs, other apps, or the user's whole device. */
(() => {
  'use strict';

  const HTML2CANVAS_URL = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_IMAGE_CHARS = 320000;
  let session = null;
  let libraryPromise = null;

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function loadCaptureLibrary() {
    if (typeof window.html2canvas === 'function') return Promise.resolve(window.html2canvas);
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HTML2CANVAS_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => typeof window.html2canvas === 'function'
        ? resolve(window.html2canvas)
        : reject(new Error('SCREEN_CAPTURE_LIBRARY_UNAVAILABLE'));
      script.onerror = () => reject(new Error('SCREEN_CAPTURE_LIBRARY_UNAVAILABLE'));
      document.head.append(script);
    }).catch(error => {
      libraryPromise = null;
      throw error;
    });
    return libraryPromise;
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type || '')) {
        reject(new Error('Choose a JPG, PNG, WEBP, GIF, AVIF or compatible HEIC/HEIF image.'));
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        reject(new Error('That image is larger than 8 MB. Choose a smaller image.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('The image could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The image could not be opened.'));
      image.src = source;
    });
  }

  async function jpegData(source, maxChars = MAX_IMAGE_CHARS) {
    const image = await loadImage(source);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scales = longest > 1280
      ? [1280 / longest, 1120 / longest, 960 / longest, 800 / longest]
      : [1, 0.9, 0.8];
    let best = '';
    for (const scale of scales) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Image editing is unavailable in this browser.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.72, 0.64, 0.56, 0.48, 0.4]) {
        const value = canvas.toDataURL('image/jpeg', quality);
        best = value;
        if (value.length <= maxChars) {
          return { data: value, width: canvas.width, height: canvas.height };
        }
      }
    }
    if (best && best.length <= maxChars + 25000) {
      const smaller = await loadImage(best);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(smaller.naturalWidth * 0.8));
      canvas.height = Math.max(1, Math.round(smaller.naturalHeight * 0.8));
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(smaller, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.38);
      if (data.length <= maxChars) return { data, width: canvas.width, height: canvas.height };
    }
    throw new Error('This image is too detailed to attach safely. Use a smaller crop or a lower-resolution screenshot.');
  }

  function drawStroke(ctx, stroke) {
    if (!stroke || !stroke.points || !stroke.points.length) return;
    const points = stroke.points;
    const first = points[0];
    const last = points[points.length - 1];
    ctx.save();
    ctx.globalAlpha = stroke.tool === 'highlight' ? 0.28 : 1;
    ctx.lineWidth = stroke.width * (stroke.tool === 'highlight' ? 3.2 : 1);
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'rect' || stroke.tool === 'cover') {
      const x = Math.min(first.x, last.x), y = Math.min(first.y, last.y);
      const w = Math.abs(last.x - first.x), h = Math.abs(last.y - first.y);
      if (stroke.tool === 'cover') {
        ctx.globalAlpha = 1;
        ctx.fillRect(x, y, Math.max(2, w), Math.max(2, h));
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, stroke.width * 0.55);
        ctx.strokeRect(x, y, Math.max(2, w), Math.max(2, h));
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    } else if (stroke.tool === 'circle') {
      const cx = (first.x + last.x) / 2, cy = (first.y + last.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(last.x - first.x) / 2, Math.abs(last.y - first.y) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.tool === 'arrow') {
      const angle = Math.atan2(last.y - first.y, last.x - first.x);
      const head = Math.max(12, stroke.width * 5);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - head * Math.cos(angle - Math.PI / 6), last.y - head * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - head * Math.cos(angle + Math.PI / 6), last.y - head * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      if (points.length === 1) ctx.lineTo(first.x + 0.1, first.y + 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function openEditor(source, onDone, onCancel, sourceMeta = {}) {
    loadImage(source).then(image => {
      const overlay = el('section', 'bug-editor-overlay');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Mark the problem on your screenshot');
      overlay.setAttribute('data-bug-capture-ignore', '');

      const shell = el('div', 'bug-editor-shell');
      const header = el('header', 'bug-editor-header');
      const heading = el('div', 'bug-editor-heading');
      heading.append(el('strong', '', 'Mark the problem'), el('span', '', 'Draw around the part you want us to inspect.'));
      const close = el('button', 'bug-editor-close', 'Close');
      close.type = 'button';
      header.append(heading, close);

      const toolbar = el('div', 'bug-editor-toolbar');
      const tools = [
        ['pen', 'Pen'], ['highlight', 'Highlight'], ['arrow', 'Arrow'],
        ['rect', 'Rectangle'], ['circle', 'Circle'], ['cover', 'Cover']
      ];
      let currentTool = 'pen';
      const toolButtons = new Map();
      tools.forEach(([key, label]) => {
        const button = el('button', 'bug-tool-button', label);
        button.type = 'button';
        button.dataset.tool = key;
        button.setAttribute('aria-pressed', String(key === currentTool));
        button.addEventListener('click', () => {
          currentTool = key;
          toolButtons.forEach((node, name) => node.setAttribute('aria-pressed', String(name === key)));
        });
        toolButtons.set(key, button);
        toolbar.append(button);
      });

      const colourLabel = el('label', 'bug-editor-control', 'Colour');
      const colour = document.createElement('input');
      colour.type = 'color';
      colour.value = '#e53935';
      colour.setAttribute('aria-label', 'Drawing colour');
      colourLabel.append(colour);
      const widthLabel = el('label', 'bug-editor-control', 'Thickness');
      const width = document.createElement('input');
      width.type = 'range';
      width.min = '2';
      width.max = '14';
      width.value = '6';
      width.setAttribute('aria-label', 'Drawing thickness');
      widthLabel.append(width);
      const undo = el('button', 'bug-tool-button', 'Undo');
      const redo = el('button', 'bug-tool-button', 'Redo');
      const clear = el('button', 'bug-tool-button', 'Clear');
      [undo, redo, clear].forEach(button => { button.type = 'button'; toolbar.append(button); });
      toolbar.append(colourLabel, widthLabel);

      const zoomLabel = el('label', 'bug-editor-zoom', 'Zoom');
      const zoom = document.createElement('input');
      zoom.type = 'range';
      zoom.min = '60';
      zoom.max = '150';
      zoom.step = '10';
      zoom.value = '100';
      zoom.setAttribute('aria-label', 'Screenshot zoom');
      zoomLabel.append(zoom);

      const viewport = el('div', 'bug-editor-viewport');
      const stage = el('div', 'bug-editor-stage');
      const baseImage = el('img', 'bug-editor-image');
      baseImage.alt = 'Screenshot being annotated';
      baseImage.src = source;
      const canvas = document.createElement('canvas');
      canvas.className = 'bug-editor-drawing';
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.setAttribute('aria-label', 'Drawing surface');
      stage.append(baseImage, canvas);
      viewport.append(stage);

      const footer = el('footer', 'bug-editor-footer');
      const note = el('p', 'bug-editor-note', 'Your original image is kept separately. Cover private information before sending.');
      const cancel = el('button', 'btn btn-ghost', 'Cancel');
      const save = el('button', 'btn btn-primary', 'Use screenshot');
      cancel.type = save.type = 'button';
      const actions = el('div', 'bug-editor-actions');
      actions.append(cancel, save);
      footer.append(note, actions);
      shell.append(header, toolbar, zoomLabel, viewport, footer);
      overlay.append(shell);
      document.body.append(overlay);
      overlay.tabIndex = -1;
      overlay.focus();

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        overlay.remove();
        onCancel && onCancel();
        return;
      }
      let strokes = [];
      let redoStack = [];
      let activeStroke = null;
      const redraw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(stroke => drawStroke(ctx, stroke));
        if (activeStroke) drawStroke(ctx, activeStroke);
        undo.disabled = strokes.length === 0;
        redo.disabled = redoStack.length === 0;
      };
      const coords = event => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / Math.max(1, rect.width))),
          y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / Math.max(1, rect.height)))
        };
      };
      canvas.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / Math.max(1, rect.width);
        activeStroke = {
          tool: currentTool, color: colour.value,
          width: Math.max(1, Number(width.value) * scale),
          points: [coords(event)]
        };
        redraw();
      });
      canvas.addEventListener('pointermove', event => {
        if (!activeStroke) return;
        event.preventDefault();
        const point = coords(event);
        const previous = activeStroke.points[activeStroke.points.length - 1];
        if (Math.hypot(point.x - previous.x, point.y - previous.y) > 1.5) activeStroke.points.push(point);
        redraw();
      });
      const finishStroke = event => {
        if (!activeStroke) return;
        if (event && event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
          try { canvas.releasePointerCapture(event.pointerId); } catch {}
        }
        const stroke = activeStroke;
        activeStroke = null;
        if (stroke.points.length === 1) {
          const p = stroke.points[0];
          stroke.points.push({ x: p.x + 0.1, y: p.y + 0.1 });
        }
        strokes.push(stroke);
        if (strokes.length > 60) strokes.shift();
        redoStack = [];
        redraw();
      };
      canvas.addEventListener('pointerup', finishStroke);
      canvas.addEventListener('pointercancel', finishStroke);
      undo.addEventListener('click', () => {
        if (!strokes.length) return;
        redoStack.push(strokes.pop());
        redraw();
      });
      redo.addEventListener('click', () => {
        if (!redoStack.length) return;
        strokes.push(redoStack.pop());
        redraw();
      });
      clear.addEventListener('click', () => {
        if (!strokes.length) return;
        redoStack = strokes.slice();
        strokes = [];
        redraw();
      });
      const resizeStage = () => {
        const factor = Number(zoom.value) / 100;
        stage.style.width = Math.round(image.naturalWidth * factor) + 'px';
      };
      zoom.addEventListener('input', resizeStage);
      resizeStage();
      redraw();

      let closed = false;
      const cleanup = () => {
        if (closed) return false;
        closed = true;
        overlay.remove();
        return true;
      };
      const cancelEditor = () => {
        if (cleanup() && onCancel) onCancel();
      };
      close.addEventListener('click', cancelEditor);
      cancel.addEventListener('click', cancelEditor);
      overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancelEditor();
        }
      });
      save.addEventListener('click', async () => {
        save.disabled = true;
        save.textContent = 'Preparing…';
        try {
          const result = document.createElement('canvas');
          result.width = image.naturalWidth;
          result.height = image.naturalHeight;
          const out = result.getContext('2d', { alpha: false });
          out.fillStyle = '#ffffff';
          out.fillRect(0, 0, result.width, result.height);
          out.drawImage(image, 0, 0);
          out.drawImage(canvas, 0, 0);

          // Privacy covers are baked into both copies; other marks stay on the annotated copy.
          const privacyCovers = strokes.filter(stroke => stroke.tool === 'cover');
          const originalCanvas = document.createElement('canvas');
          originalCanvas.width = image.naturalWidth;
          originalCanvas.height = image.naturalHeight;
          const originalContext = originalCanvas.getContext('2d', { alpha: false });
          originalContext.fillStyle = '#ffffff';
          originalContext.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
          originalContext.drawImage(image, 0, 0);
          privacyCovers.forEach(stroke => drawStroke(originalContext, stroke));
          const original = await jpegData(originalCanvas.toDataURL('image/png'));
          const annotated = await jpegData(result.toDataURL('image/png'));
          if (cleanup() && onDone) {
            onDone({
              originalData: original.data,
              annotatedData: annotated.data,
              width: annotated.width,
              height: annotated.height,
              mimeType: 'image/jpeg',
              redactedOriginal: privacyCovers.length > 0,
              screen: String(sourceMeta.screen || '').slice(0, 30),
              route: String(sourceMeta.route || '').slice(0, 120)
            });
          }
        } catch (error) {
          save.disabled = false;
          save.textContent = 'Use screenshot';
          note.textContent = error && error.message ? error.message : 'Could not prepare this image.';
        }
      });
    }).catch(error => {
      window.alert(error && error.message ? error.message : 'Could not open that image.');
      onCancel && onCancel();
    });
  }

  function finishSession() {
    if (!session) return;
    const current = session;
    session = null;
    if (current.root) current.root.remove();
    if (current.onCancel) current.onCancel();
  }

  function start(options = {}) {
    if (session) return;
    const root = el('div', 'bug-capture-layer');
    root.setAttribute('data-bug-capture-ignore', '');
    const bubble = el('button', 'bug-capture-bubble');
    const bubbleIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bubbleIcon.setAttribute('viewBox', '0 0 24 24');
    bubbleIcon.setAttribute('width', '25');
    bubbleIcon.setAttribute('height', '25');
    bubbleIcon.setAttribute('aria-hidden', 'true');
    const bubbleBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bubbleBody.setAttribute('d', 'M4 7.5h3l1.5-2h7l1.5 2h3A1.5 1.5 0 0 1 21.5 9v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z');
    bubbleBody.setAttribute('fill', 'none');
    bubbleBody.setAttribute('stroke', 'currentColor');
    bubbleBody.setAttribute('stroke-width', '1.8');
    const bubbleLens = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bubbleLens.setAttribute('cx', '12');
    bubbleLens.setAttribute('cy', '13.5');
    bubbleLens.setAttribute('r', '3.3');
    bubbleLens.setAttribute('fill', 'none');
    bubbleLens.setAttribute('stroke', 'currentColor');
    bubbleLens.setAttribute('stroke-width', '1.8');
    bubbleIcon.append(bubbleBody, bubbleLens);
    bubble.append(bubbleIcon);
    bubble.type = 'button';
    bubble.setAttribute('aria-label', 'Open bug screenshot capture controls');
    bubble.title = 'Bug screenshot capture';
    const panel = el('div', 'bug-capture-panel');
    panel.hidden = true;
    const panelTitle = el('strong', '', 'Bug capture');
    const panelCopy = el('p', '', 'Move around BECE Hub, then capture the screen where the problem appears.');
    const capture = el('button', 'btn btn-primary', 'Capture this screen');
    const exit = el('button', 'btn btn-ghost', 'Exit capture mode');
    capture.type = exit.type = 'button';
    panel.append(panelTitle, panelCopy, capture, exit);
    root.append(panel, bubble);
    document.body.append(root);
    session = { root, bubble, panel, onDone: options.onDone, onCancel: options.onCancel };

    const showPanel = () => { panel.hidden = !panel.hidden; };
    bubble.addEventListener('click', showPanel);
    let drag = null;
    bubble.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      const rect = bubble.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
      bubble.setPointerCapture(event.pointerId);
    });
    bubble.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 7) drag.moved = true;
      if (!drag.moved) return;
      event.preventDefault();
      bubble.style.left = Math.max(4, Math.min(innerWidth - 58, drag.left + dx)) + 'px';
      bubble.style.top = Math.max(4, Math.min(innerHeight - 58, drag.top + dy)) + 'px';
      bubble.style.right = 'auto';
      bubble.style.bottom = 'auto';
    });
    const finishDrag = event => {
      if (!drag || drag.id !== event.pointerId) return;
      const moved = drag.moved;
      drag = null;
      if (moved) {
        bubble.dataset.moved = 'true';
        setTimeout(() => { delete bubble.dataset.moved; }, 80);
      }
    };
    bubble.addEventListener('pointerup', finishDrag);
    bubble.addEventListener('pointercancel', finishDrag);
    bubble.addEventListener('click', event => {
      if (bubble.dataset.moved === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    exit.addEventListener('click', () => {
      const current = session;
      if (!current) return;
      session = null;
      root.remove();
      current.onCancel && current.onCancel();
    });
    capture.addEventListener('click', async () => {
      if (!session) return;
      capture.disabled = true;
      capture.textContent = 'Capturing…';
      panel.hidden = true;
      bubble.hidden = true;
      try {
        const html2canvas = await loadCaptureLibrary();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const colour = getComputedStyle(document.documentElement).backgroundColor;
        const screenshot = await html2canvas(document.body, {
          backgroundColor: colour && colour !== 'rgba(0, 0, 0, 0)' ? colour : '#ffffff',
          scale,
          width: window.innerWidth,
          height: window.innerHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scrollX: 0,
          scrollY: -window.scrollY,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 10000,
          ignoreElements: element => element.hasAttribute('data-bug-capture-ignore')
            || !!element.closest('[data-bug-capture-ignore]')
        });
        const source = screenshot.toDataURL('image/jpeg', 0.82);
        const current = session;
        if (!current) return;
        root.remove();
        session = null;
        const sourceMeta = {
          screen: String(document.body && document.body.dataset && document.body.dataset.screen || ''),
          route: String(window.location.hash || '')
        };
        openEditor(source, payload => current.onDone && current.onDone(payload), () => current.onCancel && current.onCancel(), sourceMeta);
      } catch (error) {
        bubble.hidden = false;
        panel.hidden = false;
        capture.disabled = false;
        capture.textContent = 'Try capture again';
        panelCopy.textContent = error && error.message === 'SCREEN_CAPTURE_LIBRARY_UNAVAILABLE'
          ? 'Screen capture could not load. Use Add screenshot to choose an image instead.'
          : 'This screen could not be captured in this browser. Try an uploaded screenshot instead.';
      }
    });
  }

  function editFile(file, onDone, onCancel) {
    readFile(file).then(source => openEditor(source, onDone, onCancel)).catch(error => {
      window.alert(error && error.message ? error.message : 'Could not load the selected image.');
      onCancel && onCancel();
    });
  }

  function viewAttachment(attachment) {
    if (!attachment || !attachment.originalData || !attachment.annotatedData) return;
    const overlay = el('section', 'bug-image-viewer');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Bug report screenshots');
    overlay.setAttribute('data-bug-capture-ignore', '');
    const card = el('div', 'bug-image-viewer-card');
    const head = el('header', 'bug-image-viewer-head');
    head.append(el('strong', '', 'Bug report screenshots'));
    const close = el('button', 'btn btn-ghost', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => overlay.remove());
    head.append(close);
    const grid = el('div', 'bug-image-viewer-grid');
    [[attachment.redactedOriginal ? 'Original (private areas covered)' : 'Original', attachment.originalData], ['Marked-up', attachment.annotatedData]].forEach(([label, src]) => {
      const item = el('figure', 'bug-image-viewer-item');
      item.append(el('figcaption', '', label));
      const image = el('img');
      image.src = src;
      image.alt = label + ' screenshot';
      item.append(image);
      grid.append(item);
    });
    card.append(head, grid);
    overlay.append(card);
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    document.body.append(overlay);
  }

  window.BeceBugCapture = Object.freeze({
    start,
    editFile,
    viewAttachment
  });
})();