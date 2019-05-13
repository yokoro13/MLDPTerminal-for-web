var term = new Terminal();

const UUID_MLDP_PRIVATE_SERVICE = "00035b03-58e6-07dd-021a-08123a000300";
const UUID_MLDP_DATA_PRIVATE_CHAR = "00035b03-58e6-07dd-021a-08123a000301";

term.open(document.getElementById('terminal'));

var myCharacteristic;

term.on('key', (key) => {
    console.log(key.codePointAt(0));
    let value;
    switch (key.codePointAt(0)) {
        case 0x7f:
            console.log("BS");
            value = 0x08;
            break;
        default:
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
    let a = '';
    let hex = '';
    for (let i = 0; i < value.byteLength; i++) {
        // 0x00-0x0fのときに0をつける
        hex = (value.getUint8(i).toString(16)).slice(-2);
        if (Number("0x" + hex) <= 15){
            hex = 0+hex;
        }
        a += hex;
    }

    let str = utf8_hex_string_to_string(a);
    switch (str) {
        case '\r':
            str = '\x1b[1G';
            break;
    }
    term.write(str);
}

// MLDP に書き込む
function writeMLDP(key) {
    if ((typeof key) != "number"){
        return;
    }
    if (myCharacteristic != null) {
        myCharacteristic.writeValue(new Uint8Array([key]));
    }
}

function utf8_hex_string_to_string (hex_str1)
{
    const bytes2 = hex_string_to_bytes(hex_str1);
    return utf8_bytes_to_string(bytes2);
}

// 16進文字列をバイト値に変換
function hex_to_byte (hex_str)
{
    return parseInt(hex_str, 16);
}

// バイト配列を16進文字列に変換
function hex_string_to_bytes (hex_str)
{
    const result = [];

    let str;
    for (let i = 0; i < hex_str.length; i+=2) {
        str = hex_str.substr(i, 2);
        result.push(hex_to_byte(str));
    }
    return result;
}

function utf8_bytes_to_string(arr) {
    let c;
    if (arr == null)
        return null;
    let result = "";
    let i;
    while (i = arr.shift()) {
        if (i <= 0x7f) {
            result += String.fromCharCode(i);
        } else if (i <= 0xdf) {
            c = ((i&0x1f)<<6);
            c += arr.shift()&0x3f;
            result += String.fromCharCode(c);
        } else if (i <= 0xe0) {
            c = ((arr.shift() & 0x1f) << 6) | 0x0800;
            c += arr.shift()&0x3f;
            result += String.fromCharCode(c);
        } else {
            c = ((i&0x0f)<<12);
            c += (arr.shift()&0x3f)<<6;
            c += arr.shift() & 0x3f;
            result += String.fromCharCode(c);
        }
    }
    return result;
}