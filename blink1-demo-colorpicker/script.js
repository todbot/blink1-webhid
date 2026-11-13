
// Part of https://todbot.github.io/blink1-webhid/

import { blink1_openDevice,
         blink1_fadeToColor,
         blink1_getVersion,
         blink1_getChipId,
       } from './blink1-webhid.js'

let canvas = document.getElementById('canvas_picker').getContext('2d');
let rgbinput = document.getElementById('rgb');
let hexinput = document.getElementById('hex');
let status = document.getElementById('status');
let canvas_picker = document.getElementById('canvas_picker');
canvas_picker.addEventListener('click', handleClick);
canvas_picker.addEventListener('mousemove', handleClick);
document.getElementById('connect-button').addEventListener('click', handleConnect);

// create an image object and set its source
let img = new Image();
img.src = 'HTML-Color-Code-300x255.gif';

var isConnected = false;
let blink1Device = null;

if( navigator.hid ) {
    navigator.hid.addEventListener('disconnect', (event) => {
        if( event.device !== blink1Device ) return;
        console.log("blink1 removed");
        isConnected = false;
        blink1Device = null;
        status.innerHTML = "not connected (blink(1) removed)";
    });
} else {
    status.innerHTML = "WebHID not supported in this browser, try Chrome";
    document.getElementById('connect-button').disabled = true;
}

let blink1Version = '';
let blink1ChipId = '';

// copy the image to the canvas
img.addEventListener('load', function() {
    canvas.drawImage(img,0,0);
});

async function handleConnect() {
    const device = await blink1_openDevice();
    if( !device ) {
        console.log("*** no device!");
        return;
    }
    let blink1Version;
    let blink1ChipId = "n/a";
    try {
        blink1Version = await blink1_getVersion(device);
    }
    catch {
        blink1Version = "unknown";
    }
    // chipId only on mk3 (fw 300+), older devices reject reportId 2
    if( blink1Version >= 300 ) {
        try {
            blink1ChipId = await blink1_getChipId(device);
        }
        catch {
            blink1ChipId = "unknown";
        }
    }
    await blink1_fadeToColor(device, [100,100,100], 100, 0 );
    blink1Device = device;
    isConnected = true;
    status.innerHTML = "connected.  firmware version: "+ blink1Version + " chipId:"+blink1ChipId;
}

// http://www.javascripter.net/faq/rgbtohex.htm
function rgbToHex(R,G,B) { return toHex(R)+toHex(G)+toHex(B); }
function toHex(n) {
    n = parseInt(n,10);
    if (isNaN(n)) return "00";
    n = Math.max(0,Math.min(n,255));
    return "0123456789ABCDEF".charAt((n-n%16)/16)  + "0123456789ABCDEF".charAt(n%16);
}

async function handleClick(event) {
    // get click coordinates in image space
    const x = event.offsetX;
    const y = event.offsetY;
    // get image data and RGB values
    const img_data = canvas.getImageData(x, y, 1, 1).data;
    const r = img_data[0];
    const g = img_data[1];
    const b = img_data[2];
    const rgbstr = r + ',' + g + ',' + b;
    const hexstr = rgbToHex(r,g,b);
    
    if( rgbinput.value == rgbstr ) return;
    rgbinput.value = rgbstr;
    hexinput.value = '#' + hexstr;
    console.log("hex:",hexstr);

    if( isConnected ) {
        await blink1_fadeToColor(blink1Device, [r,g,b], 100, 0 );
    }
}


