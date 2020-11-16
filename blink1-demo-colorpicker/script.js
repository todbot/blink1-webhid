
// Part of https://todbot.github.io/blink1-webhid/

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

// copy the image to the canvas
img.addEventListener('load', function() {
    canvas.drawImage(img,0,0);
});

async function handleConnect() {
    const device = await openDevice();
    if( !device ) {
        console.log("*** no device!");
        return;
    }
    await fadeToColor(device, [100,100,100], 100, 0 );
    isConnected = true;
    status.innerHTML = "connected";
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
        const device = await openDevice();
        await fadeToColor(device, [r,g,b], 100, 0 );
    }    
}

async function openDevice() {
    const vendorId = 0x27b8; // blink1 vid
    const productId = 0x01ed;  // blink1 pid

    const device_list = await navigator.hid.getDevices();

    let device = device_list.find(d => d.vendorId === vendorId && d.productId === productId);

    if (!device) {
        // this returns an array now
        let devices = await navigator.hid.requestDevice({
            filters: [{ vendorId, productId }],
        });
        console.log("devices:",devices);
        device = devices[0];
        if( !device ) return null;
    }

    if (!device.opened) {
        await device.open();
    }
    console.log("device opened:",device);
    return device;
}

async function fadeToColor(device, [r, g, b], fadeMillis, ledn ) {
    const reportId = 1;

    const dmsh = (fadeMillis/10) >> 8;
    const dmsl = (fadeMillis/10) % 0xff;

    // NOTE: do not put reportId in data array (at least on MacOS),
    //  and array must be exactly REPORT_COUNT big (8 bytes in this case)
    const data = Uint8Array.from([0x63, r, g, b, dmsh, dmsl, ledn, 0x00]);
    try {
        await device.sendFeatureReport(reportId, data);
    } catch (error) {
        console.error('fadeToColor: failed:', error);
    }
}


