
// Part of https://todbot.github.io/blink1-webhid/

export async function blink1_openDevice() {
    const vendorId = 0x27b8; // blink1 vid
    const productId = 0x01ed;  // blink1 pid
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

export async function blink1_getVersion(device) {
    const reportId = 1;
    const data = Uint8Array.from([0x76, 0,0,0,  0,0,0,0]); // 'v'
    try {
        await device.sendFeatureReport(reportId, data);
    } catch (error) {
        console.error('getVersion: failed:', error);
    }
    let ver_resp = await device.receiveFeatureReport(reportId);
    //console.log("blink1 version response:", ver_resp,
    //            ver_resp.getUint8(4), ',', ver_resp.buffer, ver_resp.buffer[3] );
    let blink1Version = Number.parseInt(String.fromCharCode(ver_resp.getUint8(3)))*100 +
        Number.parseInt(String.fromCharCode(ver_resp.getUint8(4)))
    console.log('blink1Version:',blink1Version);
    return blink1Version
}

// uses slightly undocumented feature of blink1mk3 devices
export async function blink1_getChipId(device) {
    const reportId = 2;
    const data = new Uint8Array(60); // 60-byte report on reportId 2
    data[0] = 0x55; // 'U'
    try {
        await device.sendFeatureReport(reportId, data);
    } catch (error) {
        console.error('getChipId: failed:', error);
    }
    console.log("receiving...");
    let chipid_resp = await device.receiveFeatureReport(reportId);
    console.log("blink1 chipid response:", chipid_resp,
                chipid_resp.buffer,
               );
    let blink1ChipId = chipid_resp.getUint32(2); // from index 2..6
    return blink1ChipId;
}

export async function blink1_fadeToColor(device, [r, g, b], fadeMillis, ledn ) {
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
