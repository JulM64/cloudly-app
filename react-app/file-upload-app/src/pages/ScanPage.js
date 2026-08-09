// src/pages/ScanPage.js - Scan physical documents with the phone camera,
// straighten/enhance each page, combine into one PDF, upload to the user's
// department bucket via the existing secure apiService.uploadFile() flow.
// Visual layer rebuilt on the shared ui/ primitives + design tokens.
// Capture / corner-adjustment / warp / enhance logic is unchanged.
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import apiService from '../services/apiService';
import { warpQuadToRect } from '../utils/perspectiveTransform';
import { enhanceCanvas } from '../utils/imageEnhance';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { IconUploadCloud, IconCamera, IconFolder, IconClose, IconFile } from '../components/icons';

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clientToImagePoint(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

// ── Corner-adjustment view for a single freshly-captured photo ──────────────
function CornerAdjuster({ image, onConfirm, onDiscard }) {
  const insetX = image.naturalWidth * 0.08;
  const insetY = image.naturalHeight * 0.08;
  const [corners, setCorners] = useState([
    { x: insetX, y: insetY },
    { x: image.naturalWidth - insetX, y: insetY },
    { x: image.naturalWidth - insetX, y: image.naturalHeight - insetY },
    { x: insetX, y: image.naturalHeight - insetY },
  ]);
  const svgRef = useRef(null);
  const draggingIndex = useRef(null);

  const handlePointerDown = (index) => (e) => {
    e.preventDefault();
    draggingIndex.current = index;
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (draggingIndex.current === null || !svgRef.current) return;
    const p = clientToImagePoint(svgRef.current, e.clientX, e.clientY);
    const x = Math.max(0, Math.min(image.naturalWidth, p.x));
    const y = Math.max(0, Math.min(image.naturalHeight, p.y));
    setCorners((prev) => prev.map((c, i) => (i === draggingIndex.current ? { x, y } : c)));
  };

  const handlePointerUp = (e) => {
    if (draggingIndex.current !== null) {
      try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    draggingIndex.current = null;
  };

  const resetToFullImage = () => {
    setCorners([
      { x: 0, y: 0 },
      { x: image.naturalWidth, y: 0 },
      { x: image.naturalWidth, y: image.naturalHeight },
      { x: 0, y: image.naturalHeight },
    ]);
  };

  const polygonPoints = corners.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', marginBottom: '14px' }}>
        Drag the 4 corners so they match the edges of your document, then confirm.
      </p>
      <div style={{ position: 'relative', maxWidth: '460px', margin: '0 auto', touchAction: 'none' }}>
        <img src={image.src} alt="Captured page" style={{ width: '100%', display: 'block', borderRadius: 'var(--radius-md)' }} draggable={false} />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${image.naturalWidth} ${image.naturalHeight}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <polygon points={polygonPoints} fill="rgba(37,99,235,0.16)" stroke="#2563eb" strokeWidth={image.naturalWidth * 0.004} />
          {corners.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={image.naturalWidth * 0.018} fill="white" stroke="#2563eb" strokeWidth={image.naturalWidth * 0.006}
              onPointerDown={handlePointerDown(i)} style={{ cursor: 'grab' }} />
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={onDiscard}>Retake</Button>
        <Button variant="secondary" onClick={resetToFullImage}>Use full image</Button>
        <Button onClick={() => onConfirm(corners)}>Confirm page</Button>
      </div>
    </div>
  );
}

// ── Live camera viewfinder ────────────────────────────────────────────────
function CameraCaptureView({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }

    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Camera access was denied or is unavailable on this device.'); });

    return () => {
      cancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    };
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const src = canvas.toDataURL('image/jpeg', 0.92);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onCapture({ src, naturalWidth: canvas.width, naturalHeight: canvas.height });
  };

  const handleCancel = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  if (error) {
    return (
      <EmptyState
        icon={<IconClose size={26} />}
        title="Camera unavailable"
        description={`${error} Check your browser's camera permission for this site, or close this and use "Upload photo instead" below.`}
        action={<Button variant="secondary" onClick={handleCancel}>Close</Button>}
      />
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', maxWidth: '460px', margin: '0 auto', backgroundColor: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', minHeight: '240px' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--fs-sm)' }}>
            Starting camera…
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button variant="secondary" onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}>Switch camera</Button>
        <Button disabled={!ready} onClick={handleCapture}>Capture</Button>
      </div>
    </div>
  );
}

const ScanPage = () => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pages, setPages] = useState([]);
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState(null);
  const [docName, setDocName] = useState('');
  const fileInputRef = useRef(null);

  const MAX_OUTPUT_DIMENSION = 1600;

  const handleOpenCameraClick = () => setCameraOpen(true);
  const handleUploadInsteadClick = () => fileInputRef.current?.click();

  const handleCameraCapture = (imageObj) => {
    setCapturedImage(imageObj);
    setCameraOpen(false);
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const img = await loadImageFromFile(file);
      setCapturedImage({ src: img.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not read that photo. Please try again.' });
    }
  };

  const handleConfirmPage = useCallback((corners) => {
    setProcessing(true);
    setTimeout(() => {
      try {
        const img = new Image();
        img.onload = () => {
          const srcCanvas = document.createElement('canvas');
          srcCanvas.width = img.naturalWidth;
          srcCanvas.height = img.naturalHeight;
          const srcCtx = srcCanvas.getContext('2d');
          srcCtx.drawImage(img, 0, 0);
          const sourceImageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

          const topW = distance(corners[0], corners[1]);
          const botW = distance(corners[3], corners[2]);
          const leftH = distance(corners[0], corners[3]);
          const rightH = distance(corners[1], corners[2]);
          let outW = Math.round((topW + botW) / 2);
          let outH = Math.round((leftH + rightH) / 2);
          const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(outW, outH));
          outW = Math.max(1, Math.round(outW * scale));
          outH = Math.max(1, Math.round(outH * scale));

          const quadPts = corners.map((c) => [c.x, c.y]);
          const warped = warpQuadToRect(sourceImageData, quadPts, outW, outH);

          const outCanvas = document.createElement('canvas');
          outCanvas.width = outW;
          outCanvas.height = outH;
          const outCtx = outCanvas.getContext('2d');
          outCtx.putImageData(new ImageData(warped.data, warped.width, warped.height), 0, 0);

          if (enhanceEnabled) enhanceCanvas(outCanvas);

          const thumbUrl = outCanvas.toDataURL('image/jpeg', 0.8);
          setPages((prev) => [...prev, { id: `page_${Date.now()}`, canvas: outCanvas, thumbUrl }]);
          setCapturedImage(null);
          setProcessing(false);
        };
        img.src = capturedImage.src;
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to process page: ' + err.message });
        setProcessing(false);
      }
    }, 30);
  }, [capturedImage, enhanceEnabled]);

  const handleRemovePage = (id) => setPages((prev) => prev.filter((p) => p.id !== id));

  const handleFinishAndUpload = async () => {
    if (pages.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setMessage(null);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWmm = 210, pageHmm = 297, marginMm = 8;
      const usableW = pageWmm - marginMm * 2;
      const usableH = pageHmm - marginMm * 2;

      pages.forEach((p, i) => {
        if (i > 0) doc.addPage();
        const imgW = p.canvas.width, imgH = p.canvas.height;
        const ratio = Math.min(usableW / imgW, usableH / imgH);
        const drawW = imgW * ratio, drawH = imgH * ratio;
        const x = (pageWmm - drawW) / 2, y = (pageHmm - drawH) / 2;
        doc.addImage(p.thumbUrl, 'JPEG', x, y, drawW, drawH);
      });

      const pdfBlob = doc.output('blob');
      const safeName = docName.trim().replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      const fileName = safeName ? `${safeName}.pdf` : `Scan_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      await apiService.uploadFile(pdfFile, (pct) => setUploadProgress(pct));
      window.dispatchEvent(new Event('cloudly-files-changed'));

      setMessage({ type: 'success', text: `"${fileName}" uploaded successfully (${pages.length} page${pages.length > 1 ? 's' : ''}).` });
      setPages([]);
      setDocName('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Upload failed: ' + err.message });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: '760px' }}>
      <PageHeader title="Document Scanning" subtitle="Capture pages with your camera, straighten and clean them up, then combine into one PDF." />

      {message && (
        <div className={`ui-banner ui-banner--${message.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
          {message.text}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelected} style={{ display: 'none' }} />

      <Card>
        {cameraOpen ? (
          <CameraCaptureView onCapture={handleCameraCapture} onCancel={() => setCameraOpen(false)} />
        ) : capturedImage ? (
          processing ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--c-text-muted)' }}>Processing page…</div>
          ) : (
            <CornerAdjuster image={capturedImage} onConfirm={handleConfirmPage} onDiscard={() => setCapturedImage(null)} />
          )
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={enhanceEnabled} onChange={(e) => setEnhanceEnabled(e.target.checked)} />
                Enhance (clean black &amp; white scan look)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={handleUploadInsteadClick}>Upload photo instead</Button>
                <Button icon={<IconCamera size={16} />} onClick={handleOpenCameraClick}>
                  {pages.length === 0 ? 'Open camera' : 'Scan another page'}
                </Button>
              </div>
            </div>

            {pages.length === 0 ? (
              <div className="cl-dropzone">
                <IconUploadCloud size={30} />
                <div className="cl-dropzone-title">No pages scanned yet</div>
                <div className="cl-dropzone-sub">Tap "Open camera" to start, or upload a photo instead.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                  {pages.map((p, i) => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <img src={p.thumbUrl} alt={`Page ${i + 1}`} style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--c-border)', display: 'block' }} />
                      <div style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'rgba(17,24,39,0.65)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                        {i + 1}
                      </div>
                      <button onClick={() => handleRemovePage(p.id)} title="Remove this page" className="cl-page-remove">
                        <IconClose size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="ui-field">
                  <label className="ui-label">Document name</label>
                  <input type="text" className="ui-input" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g., Invoice - March 2026" />
                </div>

                {uploading ? (
                  <div>
                    <div style={{ height: '8px', backgroundColor: 'var(--c-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: 'var(--c-brand)', transition: 'width 0.2s' }} />
                    </div>
                    <div style={{ textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>Uploading… {uploadProgress}%</div>
                  </div>
                ) : (
                  <Button onClick={handleFinishAndUpload} className="cl-full-width" icon={<IconFile size={16} />}>
                    Finish &amp; upload PDF ({pages.length} page{pages.length > 1 ? 's' : ''})
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </Card>

      <style>{`
        .cl-page-remove { position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.9); color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .cl-full-width { width: 100%; }
      `}</style>
    </div>
  );
};

export default ScanPage;
