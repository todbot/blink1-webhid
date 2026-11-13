
// Part of https://todbot.github.io/blink1-webhid/

import { blink1_fadeToColor,
         blink1_getVersion,
         blink1_getChipId,
       } from './blink1-webhid.js'

const vendorId = 0x27b8; // blink1 vid
const productId = 0x01ed;  // blink1 pid

const swatchColors = [
    '#000000', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
    '#00ffff', '#0000ff', '#8000ff', '#ff00ff', '#ffffff',
];

let status = document.getElementById('status');
let tbody = document.getElementById('blink1s');
let allSwatches = document.getElementById('all-swatches');

document.getElementById('add-button').addEventListener('click', handleAdd);
allSwatches.appendChild(makeSwatches(null, handleAllColor));
let blink1s = [];  // { device, version, chipId, color }

if( navigator.hid ) {
    // 'connect' only fires for devices already granted via 'Add blink(1)'
    navigator.hid.addEventListener('connect', refresh);
    navigator.hid.addEventListener('disconnect', refresh);
    refresh();
} else {
    status.innerHTML = "WebHID not supported in this browser, try Chrome";
    document.getElementById('add-button').disabled = true;
}

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [ (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff ];
}

function makeSwatches(selected, onPick) {
    const span = document.createElement('span');
    for( const hex of swatchColors ) {
        const button = document.createElement('button');
        button.title = hex;
        button.style.cssText = `background:${hex}; width:24px; height:24px;
            margin:1px; border:${hex === selected ? '3px solid #888' : '1px solid #ccc'};`;
        button.addEventListener('click', () => onPick(hex));
        span.appendChild(button);
    }
    return span;
}

async function handleAdd() {
    // chooser picks one device at a time
    await navigator.hid.requestDevice({ filters: [{ vendorId, productId }] });
    await refresh();
}

async function openBlink1(device) {
    if( !device.opened ) {
        await device.open();
    }
    let version;
    let chipId = "n/a";
    try {
        version = await blink1_getVersion(device);
    }
    catch {
        version = "unknown";
    }
    // chipId only on mk3 (fw 300+), older devices reject reportId 2
    if( version >= 300 ) {
        try {
            chipId = await blink1_getChipId(device);
        }
        catch {
            chipId = "unknown";
        }
    }
    return { device, version, chipId, color: '#000000' };
}

async function refresh() {
    const devices = (await navigator.hid.getDevices())
          .filter(d => d.vendorId === vendorId && d.productId === productId);
    const found = [];
    for( const device of devices ) {
        const known = blink1s.find(b => b.device === device);
        if( known && device.opened ) {
            found.push(known);
            continue;
        }
        try {
            found.push(await openBlink1(device));
        }
        catch(error) {
            console.error('open failed:', error);
        }
    }
    blink1s = found;
    render();
}

function render() {
    tbody.innerHTML = '';
    blink1s.forEach((b, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i}</td><td>${b.version}</td><td>${b.chipId}</td>
          <td></td>
          <td><button> Identify </button></td>`;
        tr.querySelector('button').addEventListener('click', () => identify(b));
        tr.children[3].appendChild(makeSwatches(b.color, async (hex) => {
            await setColor(b, hex);
            render();
        }));
        tbody.appendChild(tr);
    });
    status.innerHTML = blink1s.length + " blink(1)s";
}

async function setColor(b, hex) {
    b.color = hex;
    await blink1_fadeToColor(b.device, hexToRgb(hex), 100, 0);
}

async function handleAllColor(hex) {
    for( const b of blink1s ) {
        await setColor(b, hex);
    }
    render();
}

// flash white then go back to its color, to tell which one is which
async function identify(b) {
    await blink1_fadeToColor(b.device, [255,255,255], 0, 0);
    setTimeout(() => blink1_fadeToColor(b.device, hexToRgb(b.color), 300, 0), 500);
}
