var term = new Terminal();

const UUID_MLDP_PRIVATE_SERVICE = "00035b03-58e6-07dd-021a-08123a000300";
const UUID_MLDP_DATA_PRIVATE_CHAR = "00035b03-58e6-07dd-021a-08123a000301";

term.open(document.getElementById('terminal'));

let myCharacteristic;
let isEsc = false;
let isANSI = false;
let isTeC = false;
let writeValue = "";

function startMLDPApp() {
    const message = "MLDP\r\nApp:on\r\n";
    if (!myCharacteristic) return ;
    const arrayBuffer = new TextEncoder().encode(message);
    myCharacteristic.writeValue(arrayBuffer);
}

term.onKey(e => {
    console.log("e.key: " + e.key.codePointAt(0).toString(16));
    writeMLDP(e.key);
});

// BLE に繋げる
function onStartButtonClick() {
    navigator.bluetooth.requestDevice({ filters: [{ services: [UUID_MLDP_PRIVATE_SERVICE]}] })
        .then(device => device.gatt.connect())
        .then(server => server.getPrimaryService(UUID_MLDP_PRIVATE_SERVICE))
        .then(service => service.getCharacteristic(UUID_MLDP_DATA_PRIVATE_CHAR))
        .then(characteristic => {
            myCharacteristic = characteristic;
            return myCharacteristic.startNotifications().then(_ => {
                console.log('> Notifications started');
                myCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);
                startMLDPApp();
            });
        })
        .catch(e => console.log(e));
}

// Characteristic が変更
function handleNotifications(event) {
    let value = event.target.value;

    for (let i = 0; i < value.byteLength; i++) {
        let hex  = (value.getUint8(i).valueOf() & 0x00ff);

        if (!isEsc){
            if (hex === 0x1b){
                console.log("escape");
                isEsc = true;
            }
        } else {
            if(String.fromCharCode(hex) === "["){
                isANSI = true;
            } else if(String.fromCharCode(hex) === "?"){
                isTeC = true;
            } else if (isANSI && String.fromCharCode(hex).match('[A-Z]')){
                console.log("ANSI escape sequence");
                isEsc = false;
                isANSI = false;
            } else if (isTeC && String.fromCharCode(hex).match('[s]')){
                isEsc = false;
                isTeC = false;
                TeCEscapeSequence(String.fromCharCode(hex));
                console.log("TeC escape sequence");
                writeValue = "";
                return;
            }
        }
        writeValue += String.fromCharCode(hex);
        console.log(writeValue + ": " + hex.toString(16));
    }

    if (!isEsc) {
        term.write(writeValue);
        writeValue = "";
    }
}

// MLDP に書き込む
function writeMLDP(key) {
    let encoder = new TextEncoder('utf-8');
    if (myCharacteristic != null) {
        myCharacteristic.writeValue(encoder.encode(key));
    }
}

function TeCEscapeSequence(mode) {
    if (mode === "s") {
        writeMLDP("\x1b?" + term.rows.toString() + "," + term.cols.toString() + "s");
    }
    console.log(writeValue + ": " + term.rows.toString() + "," + term.cols.toString() + "s");
}