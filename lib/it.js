//
// Intertechno V3 Protokoll
//
// Senderdefinition
// <26 Bit ID des Geräts> <1-Bit Gruppen Bit> <4-Bit Kanal ID>
//   - Kanal ID     = z.B. ID der Taste auf der Fenrbedienung
//   - Gruppen Bit  = ist 1 wenn auf Fernbedienung "Alle An/Aus" gedrückt würde
//


'use strict';

//
// convert hex number to bin string representation
// if padlen > 0 -> pad to given len with 0
//
function hex2bin(hex, padlen) {

    if(padlen === 0) {
        return (parseInt(hex, 16).toString(2));
    }
    else {
        return (parseInt(hex, 16).toString(2)).padStart(padlen, '0');
    }
}

function binToTriStateV3(bin) {
    switch(bin) {
        case "10" : return "1";
        case "01" : return "0";
        case "00" : return "D";
        case "11" : return "2";
        default: return bin;
    }
}

function binToTriStateV1(bin) {
    switch(bin) {
        case "00" : return "0";
        case "01" : return "F";
        case "10" : return "D";
        case "11" : return "1";
        default: return bin;
    }    
}
//
// decode IT V1 data
//
function decodeV1(bin) {

    let index = 0;
    let result = '';

    while(index < bin.length)
    {
        let val = bin.slice(index,index+2);

        if(val === "10") {
            return '';
        }

        let decoded = binToTriStateV1(val);
        
        result = result + decoded;
        index = index + 2;
    }
    return result;
}
//
// decode IT V3 data
//
function decodeV3(bin) {

    let index = 0;
    let result = '';

    while(index < bin.length)
    {
        let val = bin.slice(index,index+2);
        let decoded = binToTriStateV3(val);
        
        result = result + decoded;
        index = index + 2;
    }
    return result;
}

/**
 *
 * IT.parse
 * 
 * @param raw        = raw data to parse
 * 
 * @returns Data-structure message
 *
 * message.protocol  = 'IT';
 *
 * message.length    = length of raw data
 * message.raw       = the raw data
 *
 * message.version   = version of IT protocol
 * message.device    = name of device or devicetype
 * message.address   = identifier of device
 *                     V1 -> housecode + unitId + const 0F
 *                     V3 -> unitId + groupBit + channelId
 *
 * message.data             = protocol specific data
 *
 * message.data.unitId      = unit identifer
 *                            IT V1 = position 4-7 of decoded string
 *                            IT V3 = position 0-25 of decoded string
 *                            HomeEasy = position 0-45 of decoded string
 * message.data.command     = on / off command state
 * message.data.housecode   = only IT V1, position 0-3 of decoded string
 * message.data.groupBit    = IT V3 / HomeEasy, group bit, control all devices of group or one device
 * message.data.channelId   = IT V3 / HomeEasy, identifier of button/channel of rmeote control
 * message.data.dimLevel    = only IT V3, dim level
 *
 * message.data.transmitter = number of receiving transmitter (set after call of parse in cul.js)
 */
module.exports.parse = function (raw) {
    const message = {};    

    message.protocol = 'IT';

    message.length = raw.length;
    message.raw = raw;

    if (raw.length < 7 ){
        console.log('IT: message ' + raw + '(' + raw.length + ') too short!', 'warn');
        return message;
    }
    
    let deviceId = '';
    let unitId = '';
    let decoded = ''; 
    let groupBit = '';   
    let command = '';
    let channelId = '';
    let housecode = '';
    let dimLevel = '';
    
    let hexData = raw.slice(1);     // remove leading i

    if(raw[1] === 'h')         // HomeEasy Geräte
    {
        if (raw.length === 9 || raw.length === 17) {
            hexData = hexData + '0';
        }

        if (raw.length === 10 || raw.length === 12) {   // HomeEasy HE800

            message.device = 'HomeEasy HE800';

            let bin1stPart = hex2bin(hexData.slice(1, 9), 32);

            console.debug('HomeEasy HE800 converted raw data = ' + bin1stPart + bin2ndPart + bin3rdPart);

            decoded = bin1stPart;

            //?? crypted / rolling code ??
        }
        else if (raw.length === 18 || raw.length === 20) {   // HomeEasy EU

            message.device = 'HomeEasy EU';

            let bin1stPart = hex2bin(hexData.slice(1, 9), 32);
            let bin2ndPart = hex2bin(hexData.slice(9, 16), 28);

            console.debug('HomeEasy EU converted raw data = ' + bin1stPart + bin2ndPart + bin3rdPart);

            decoded = (bin1stPart + bin2ndPart).slice(0, 57);

            unitId = decoded.slice(0,46);        // device ??
            command = decoded.slice(46,48);      // Kommando on/off
            groupBit = decoded.slice(48,50);     // Gruppenbit        
            channelId = decoded.slice(50,57);    // ChannelID ??

            deviceId = unitId + groupBit + channelId;
        }
        else {
            console.log('IT: HomeEasy ' + raw + '(' + raw.length + ') wrong length!', 'warn');
        }

    }
    else 
    {
        message.device = 'InterTechno';

        if (raw.length === 7) {    // IT V1 mit Drehschaltern

            message.version = 'V1';            

            let bin1stPart = hex2bin(hexData, 8);   // no padding here

            console.debug('IT V1 converted raw data = ' + bin1stPart);

            decoded = decodeV1(bin1stPart);
    
            if(decoded !== '') {
                housecode = decoded.slice(0,4);     // 0 - 3 = 4 Bit Housecode
                unitId = decoded.slice(4,8);        // 4 - 7 = 4 Bit Unit ID
                                                    // 8 - 9 = fix auf 0F
                command = decoded.slice(10,12);     // 10-11 = Kommando on/off

                deviceId = housecode + unitId + '0F';
            } else {

                // possible ELV1527 ??
                message.device = 'EV1527';
                message.version = '--';
            }
        }    
        else if (raw.length === 17) {   // IT V3
   
            message.version = 'V3';                        

            let bin1stPart = hex2bin(hexData.slice(0, 8), 32);
            let bin2ndPart = hex2bin(hexData.slice(8), 32);

            console.debug('IT V3 converted raw data = ' + bin1stPart + bin2ndPart);

            decoded = decodeV3(bin1stPart + bin2ndPart);

            unitId = decoded.slice(0,26);     // 0-25 = 26-Bit UnitID
            
            groupBit = decoded[26];           // Gruppenbit
            command = decoded[27];            // Kommando on/off
            channelId = decoded.slice(28);    // 28-31 = 4-Bit ChannelID

            deviceId = unitId + groupBit + channelId;
        }
        else if (raw.length === 19) {   // IT V3 dimm

            message.version = 'V3';
            
            let bin1stPart = hex2bin(hexData.slice(0, 2), 8);
            let bin2ndPart = hex2bin(hexData.slice(2,10), 32);
            let bin3rdPart = hex2bin(hexData.slice(10), 32);

            console.debug('IT V3 converted raw data = ' + bin1stPart + bin2ndPart + bin3rdPart);

            decoded = decodeV3(bin1stPart + bin2ndPart + bin3rdPart);

            unitId = decoded.slice(0,26);     // 0-25 = 26-Bit UnitID
            
            groupBit = decoded[26];             // Gruppenbit
            command = decoded[27];              // on/off Kommando
            channelId = decoded.slice(28, 32);  // 28-31 = 4-Bit ChannelID
            dimLevel = decoded.slice(32);       // 32-25 = Dimm-Level -> Kommando 'D'

            deviceId = unitId + groupBit + channelId;
        }
        else {
            message.version = '--'

            console.log('IT: InterTechno ' + raw + '(' + raw.length + ') wrong length!', 'warn');
        }
    }

    message.address = deviceId;

    message.data = {};

    message.data.unitId = unitId;
    message.data.command = command;

    // V1
    message.data.housecode = housecode;

    // V3, HomeEasy    
    message.data.groupBit = groupBit;
    message.data.channelId = channelId;
    message.data.dimLevel = dimLevel;
    
    return message;
}

/**
 *
 * IT.cmd
 * 
 * @param code          string, the 'house code' - not used here
 * @param address       string, device address
 *                      V1 -> housecode + unitId + const 0F
 *                      V3 -> unitId + groupBit + channelId
 * @param command       string, cmd used for on/off
 * @param dimLevel      string, dimLevel -> 4 digits hex string
 * @returns object      string (the raw message) or boolean false (on error)
 *
 */
module.exports.cmd = function (code, address, command, dimLevel) {

    if (typeof address !== 'string') {
        return false;
    }

    address = address.toUpperCase();

    let usedCommand = command;

    if(typeof dimLevel !== "undefined") {
        usedCommand = 'D';
    }

    let unitId = '';
    let channelId = '';
    let groupBit = '';

    if (address.length === 31) {    // IT V3 
        unitId = address.slice(0,26);
        groupBit = address[26];
        channelId = address.slice(27);

        if(usedCommand === 'D') {
            return 'is' + unitId + groupBit + usedCommand + channelId + dimLevel;
        } else {
            return 'is' + unitId + groupBit + usedCommand + channelId;
        }
    } else {
        if(usedCommand === '1') {   // On
            return 'is' + address + 'FF';
        }
        if(usedCommand === '0') {   // Off
            return 'is' + address + 'F0';
        } else {
            return 'is' + address + usedCommand;
        }
    }
};
