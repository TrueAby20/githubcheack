// Camera app logic
const startWebcamBtn = document.getElementById('startWebcamBtn');
const captureWebcamBtn = document.getElementById('captureWebcamBtn');
const captureCanvasBtn = document.getElementById('captureCanvasBtn');
const webcamVideo = document.getElementById('webcamVideo');
const photoCanvas = document.getElementById('photoCanvas');
const downloadPhotoBtn = document.getElementById('downloadPhotoBtn');
const savePhotoBtn = document.getElementById('savePhotoBtn');
const openGalleryBtn = document.getElementById('openGalleryBtn');
const gallery = document.getElementById('gallery');
const galleryList = document.getElementById('galleryList');
const closeGalleryBtn = document.getElementById('closeGalleryBtn');
let webcamStream = null;

function stopWebcam(){
    if (webcamStream) { webcamStream.getTracks().forEach(t=>t.stop()); webcamStream=null; webcamVideo.hidden=true; captureWebcamBtn.disabled=true; }
}

if (startWebcamBtn) startWebcamBtn.addEventListener('click', async ()=>{
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        webcamStream = s;
        webcamVideo.srcObject = s;
        webcamVideo.hidden = false;
        captureWebcamBtn.disabled = false;
    } catch (e) { alert('Could not access webcam: ' + (e && e.message)); }
});

if (captureWebcamBtn) captureWebcamBtn.addEventListener('click', ()=>{
    if (!webcamVideo || !photoCanvas) return;
    const pctx = photoCanvas.getContext('2d');
    photoCanvas.width = webcamVideo.videoWidth || 400;
    photoCanvas.height = webcamVideo.videoHeight || 300;
    pctx.drawImage(webcamVideo, 0, 0, photoCanvas.width, photoCanvas.height);
});

if (captureCanvasBtn) captureCanvasBtn.addEventListener('click', ()=>{
    if (!photoCanvas) return;
    const pctx = photoCanvas.getContext('2d');
    pctx.clearRect(0,0,photoCanvas.width, photoCanvas.height);
    pctx.fillStyle = '#222';
    pctx.fillRect(0,0,photoCanvas.width, photoCanvas.height);
    pctx.font = '24px sans-serif';
    pctx.fillStyle = 'white';
    pctx.fillText('Draw here!', 120, 150);
});

if (downloadPhotoBtn) downloadPhotoBtn.addEventListener('click', ()=>{
    if (!photoCanvas) return alert('Nothing to download. Capture first.');
    photoCanvas.toBlob(blob=>{
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'camera_capture.png';
        a.click();
        URL.revokeObjectURL(a.href);
    });
});

function loadGallery(){
    const raw = localStorage.getItem('camera_photos') || '[]';
    let arr = [];
    try { arr = JSON.parse(raw); } catch(e){ arr = []; }
    galleryList.innerHTML = '';
    arr.forEach((dataUrl, idx)=>{
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'gallery-item';
        img.addEventListener('click', ()=>{
            const w = window.open('');
            if (w) w.document.body.innerHTML = '<img src="'+dataUrl+'" style="max-width:100%">';
        });
        galleryList.appendChild(img);
    });
}

if (savePhotoBtn) savePhotoBtn.addEventListener('click', ()=>{
    if (!photoCanvas) return alert('Nothing to save. Capture first.');
    const dataUrl = photoCanvas.toDataURL('image/png');
    const raw = localStorage.getItem('camera_photos') || '[]';
    let arr = [];
    try { arr = JSON.parse(raw); } catch(e) { arr = []; }
    arr.unshift(dataUrl);
    arr = arr.slice(0,20);
    localStorage.setItem('camera_photos', JSON.stringify(arr));
    alert('Saved to gallery');
});

if (openGalleryBtn) openGalleryBtn.addEventListener('click', ()=>{
    if (!gallery) return;
    gallery.hidden = false;
    loadGallery();
});
if (closeGalleryBtn) closeGalleryBtn.addEventListener('click', ()=>{ if (gallery) gallery.hidden = true; });

window.addEventListener('beforeunload', stopWebcam);
