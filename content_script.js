const deviceName = "Hardware_Password_Manager"
const bleService = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase()
const bleTxCharacteristic = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase()
const bleRxCharacteristic = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase()

const MAX_PACKET_SIZE = 61

const url = window.location.protocol + "//" + window.location.hostname;
//var deviceDetected

// 


// Button functions
function wb_login (){
    let user = document.getElementById('hardware_password_storage_username').value
    
    console.log("user: " + user)
    if(user != null && user != "") wb_sendMessage(url, user, null)
    else alert('There is no username or e-mail set')    
}

function wb_register(){
    let pwdIsSet = false;
    let inputs = document.querySelectorAll('input[type=password]')

    let pwd;
    let user = document.getElementById('hardware_password_storage_username').value

    inputs.forEach(i =>{
        if(i.value.length > 0 && pwdIsSet == false){
            pwdIsSet = true;
            pwd = i.value;
            console.log("Password: " + pwd);            
        }
    });
    if (!pwdIsSet){
        console.log("There is no password to store")
    }

    if(user != null && user != "") wb_sendMessage(url, user, pwd)
    else alert('There is no username or e-mail set')
}

// Web-bluetooth functionality
function wb_sendMessage(url, user, pwd){
    let options = {
        //acceptAllDevices: true
        filters:[
            {name: deviceName,
            services: [bleService]}
        ]
    }

    if(!navigator.bluetooth){
        alert("Web bluetooth is not avaiable")
    }else{
        console.log("Requesting BLE device info...")
        navigator.bluetooth.requestDevice(options)
        .then(device => {
            deviceDetected = device
            console.log("Device name: " + deviceDetected.name)
            return deviceDetected.gatt.connect()
        })
        // Enable notifications
        .then(server =>{
            return server.getPrimaryService(bleService)
        })
        .then(service => {
            return service.getCharacteristic(bleTxCharacteristic)
        })
        .then(charasteristic => charasteristic.startNotifications())
        .then(charasteristic =>{
            charasteristic.addEventListener('characteristicvaluechanged', wb_receiveNotification);
            console.log("Notifications have been started");
        })
        .catch(error => {console.log("Receive password error: " + error)})
        // Send user info
        .then(_ => deviceDetected.gatt.connect())
        .then(server => server.getPrimaryService(bleService))
        .then(service => service.getCharacteristic(bleRxCharacteristic))
        .then(characteristic => {
            let msg = infoToJSON(url, user, pwd)
            let packets = splitString(msg, MAX_PACKET_SIZE)
            wb_sendPackets(characteristic, packets, 0)
            /*packets.forEach(packet =>{
                characteristic.writeValue(JSONToArray(packet))
                // There is a GATT problem when there is more than 1 packet
            })                    */    
        })
        .catch(error => {console.log("Send message error: " + error)})
    }    
}

function wb_sendPackets(characteristic, packets, packetNumber){
    characteristic.writeValue(JSONToArray(packets[packetNumber]))
    .then( _ =>{
        if(packetNumber < packets.length){
            wb_sendPackets(characteristic, packets, packetNumber + 1)
        }else{
            console.log("Message sent")
        }
    })
    .catch(error => {console.log("Send packet error: " + error)})
}

function wb_receiveNotification(event){
    if(!("TextDecoder" in window)){
        alert("This browser does not support TextDecoder");
    }
    var encoder = new TextDecoder("utf-8");
    const valueReceived = event.target.value;
    const value = encoder.decode(valueReceived);

    console.log("Received: " + value);
    const response = JSON.parse(value)
    if(response.hasOwnProperty('err')){
        console.log('Error: ' + response['err']);
    }if(response.hasOwnProperty('pwd')){
        console.log("Typing value in the password input field...")
        var inputs = document.querySelectorAll('input[type=password]')
        inputs.forEach(i =>{
            i.value=response["pwd"];
        });
    }else{
        console.log("Unknown message received")
    }

    deviceDetected.gatt.disconnect()    
}

// Auxiliar functions
function isWebBluetoothEnabled(){
    if(!navigator.bluetooth){
        console.log("Web Bluetooth is not avaiable in this browser");
        return false;
    }
    return true;
}

function infoToJSON(url, user, pwd){
    if(pwd == null){
        return JSON.stringify({url: url, user: user})
    }else{
        return JSON.stringify({url: url, user: user, pwd: pwd})
    }    
}

function JSONToArray(jsonText){
    if(!("TextDecoder" in window)){
        alert("This browser does not support TextDecoder");
    }
    
    var enc = new TextEncoder()
    var r = enc.encode(jsonText)
    console.log("long info codificada: " + r.length)
    console.log("info codificada:\n" + jsonText);
    return r
}

function splitString(s, size){
    let numPackets = s.length/size
    let substrings = new Array()
    let position = 0

    for(let i = 0; i < numPackets; i++){
        let newPacket = s.substr(position, MAX_PACKET_SIZE)
        substrings.push(newPacket)
        position += newPacket.length
    }

    return substrings
}

// Create elements and add them to web page
const username_form = document.createElement('form');
const username_label = document.createElement('label');
const username_input = document.createElement('input');
const login_button = document.createElement('button');
const register_button = document.createElement('button');
const bar = document.createElement('div');

// Username input configuration
username_label.textContent = 'Username or e-mail: ';
username_input.id = "hardware_password_storage_username";
username_form.appendChild(username_label);
username_form.appendChild(username_input);
username_form.style.display = 'inline';
username_form.style.margin = '0 5px';

// Login button configuration
login_button.innerHTML = "Autofill the password";
login_button.onclick = wb_login;
login_button.style.margin = '0 5px';

// Register button configuration
register_button.innerHTML = "Register the password";
register_button.onclick = wb_register;
register_button.style.margin = '0 5px';

bar.id = "password_manager_bar";
//bar.style.display = "none";
bar.style.textAlign = "center";
bar.style.width = "100%";
//bar.style.backgroundColor = "#287AA9";
bar.style.backgroundColor = document.body.backgroundColor;
bar.style.padding = "3px";

// Append elements to webpage
bar.appendChild(username_form);
bar.appendChild(login_button);
bar.appendChild(register_button);
document.body.insertBefore(bar, document.body.firstChild);