
const vendorId = 0x27b8; // blink1 vid
const productId = 0x01ed;  // blink1 pid

document.querySelector('#start-button').addEventListener('click', handleClick);

async function handleClick() {
    let acolor = [ 255, 0, 255 ];  // purple
    const device = await openDevice();
    await fadeToColor(device, acolor );
}

async function openDevice() {
    const devices = await navigator.hid.getDevices();

    let device = devices.find(d => d.vendorId === vendorId && d.productId === productId);

    if (!device) {
        device = await navigator.hid.requestDevice({
            filters: [{ vendorId, productId }],
        });
    }

    if (!device.opened) {
        await device.open();
    }
    return device;
}

async function fadeToColor(device, [r, g, b] ) {

    const reportId = 1;
    const data = Uint8Array.from([0x63, r, g, b, 0x00, 0x10, 0x00, 0x00 ]);
    try {
        await device.sendFeatureReport(reportId, data);
    } catch (error) {
        console.error('fadeToColor: failed:', error);
    }
}

