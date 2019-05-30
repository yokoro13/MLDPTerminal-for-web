var term = new Terminal();

const UUID_MLDP_PRIVATE_SERVICE = "00035b03-58e6-07dd-021a-08123a000300";
const UUID_MLDP_DATA_PRIVATE_CHAR = "00035b03-58e6-07dd-021a-08123a000301";

term.open(document.getElementById('terminal'));

let myCharacteristic;
let state = 0;
let writeValue = "";

term.write('MLDP\r\nApp:on\r\n');

term.on('key', (key) => {
    let value;
    if (key.codePointAt(0) === 0x7f) {
        value = 0x08;
    } else {
        value = key.codePointAt(0);
    }
    writeMLDP(value);
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
            });
        })
        .catch(e => console.log(e));
}

// Characteristic が変更
function handleNotifications(event) {
    let value = event.target.value;
    for (let i = 0; i < value.byteLength; i++) {
        let hex  = (value.getUint8(i).valueOf() & 0x00ff);

        if (state === 0){
            if (hex === 0x1b){
                state = 1;
            }
        } else {
            if (String.fromCharCode(hex).match('[A-Z]')){
                state = 0;
            }
        }
        writeValue += String.fromCharCode(hex);
        console.log(writeValue + ": " + hex);
    }

    if (writeValue === '\r') {
        writeValue = '\x1b[1G';
    }
    if (state === 0) {
        term.write(writeValue);
        writeValue = "";
    }
}

// MLDP に書き込む
function writeMLDP(key: number) {
    if (myCharacteristic != null) {
        myCharacteristic.writeValue(new Uint8Array([key]));
    }
}
