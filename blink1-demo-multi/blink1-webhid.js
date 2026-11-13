
// Part of https://todbot.github.io/blink1-webhid/

export async function blink1_openDevice() {
    const vendorId = 0x27b8; // blink1 vid
    const productId = 0x01ed;  // blink1 pid
    const devices = await navigator.hid.getDevices();

    let device = devices.find(d => d.vendorId === vendorId && d.productId === productId);

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
    return device;
}

export async function blink1_closeDevice(device) {
    if(!device) { return; }
    await device.close();
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
    // from index 2..6, but chipId is actually 64-bit
    let blink1ChipId = chipid_resp.getUint32(2);
    return blink1ChipId;
}

export async function blink1_fadeToColor(device, [r, g, b], fadeMillis, ledn ) {
    const reportId = 1;

    const dms = Math.round(fadeMillis/10);
    const dmsh = dms >> 8;
    const dmsl = dms & 0xff;

    // NOTE: do not put reportId in data array (at least on MacOS),
    //  and array must be exactly REPORT_COUNT big (8 bytes in this case)
    const data = Uint8Array.from([0x63, r, g, b, dmsh, dmsl, ledn, 0x00]);
    try {
        await device.sendFeatureReport(reportId, data);
    } catch (error) {
        console.error('fadeToColor: failed:', error);
    }
}

// pattern commands below are mk2+ only

export async function blink1_writePatternLine(device, [r, g, b], fadeMillis, pos) {
    const dms = Math.round(fadeMillis/10);
    const data = Uint8Array.from([0x50, r, g, b, dms >> 8, dms & 0xff, pos, 0x00]); // 'P'
    await device.sendFeatureReport(1, data);
}

export async function blink1_readPatternLine(device, pos) {
    const data = Uint8Array.from([0x52, 0,0,0, 0,0, pos, 0x00]); // 'R'
    await device.sendFeatureReport(1, data);
    const resp = await device.receiveFeatureReport(1);
    return {
        rgb: [resp.getUint8(2), resp.getUint8(3), resp.getUint8(4)],
        fadeMillis: ((resp.getUint8(5) << 8) + resp.getUint8(6)) * 10,
        ledn: resp.getUint8(7),
    };
}

// sets ledn for the next writePatternLine, needs fw 204+
export async function blink1_setLedN(device, ledn) {
    const data = Uint8Array.from([0x6c, ledn, 0,0, 0,0,0,0]); // 'l'
    await device.sendFeatureReport(1, data);
}

// endpos is exclusive, count 0 = loop forever
export async function blink1_playLoop(device, play, startpos, endpos, count) {
    const data = Uint8Array.from([0x70, play, startpos, endpos, count, 0,0,0]); // 'p'
    await device.sendFeatureReport(1, data);
}

export async function blink1_savePattern(device) {
    const data = Uint8Array.from([0x57, 0xBE, 0xEF, 0xCA, 0xFE, 0,0,0]); // 'W' + magic
    try {
        await device.sendFeatureReport(1, data);
    } catch (error) {
        // flash write stalls USB so this usually errors even on success
        console.log('savePattern: (expected) error:', error);
    }
}
