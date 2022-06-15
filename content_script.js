const deviceName = "Hardware_Password_Manager"
const bleService = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase()
const bleTxCharacteristic = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase()
const bleRxCharacteristic = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase()

const MAX_PACKET_SIZE = 61

const url = window.location.protocol + "//" + window.location.hostname;

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

// Generate password auxiliar functions
function togglePopUp(){
    let popup = document.getElementById('generatePasswordPopUp');
    popup.classList.toggle("show");
}

function generatePassword(){
    const uc_list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lc_list = 'abcdefghijklmnopqrstuvwxyz';
    const nu_list = '0123456789';
    const sy_list = '!@#$%&^*+-()';

    let use_up = document.getElementById('gen_pwd_uc').checked;
    let use_lc = document.getElementById('gen_pwd_lc').checked;
    let use_nu = document.getElementById('gen_pwd_nu').checked;
    let use_sy = document.getElementById('gen_pwd_sy').checked;
    let pwd_size = document.getElementById('gen_pwd_size').value;

    let tmp_pwd_size = pwd_size;

    let pwd = "";
    let charList = "";
    if(use_up){
        tmp_pwd_size--;
        charList = charList.concat(uc_list)
    }
    if(use_lc){
        tmp_pwd_size--;
        charList = charList.concat(lc_list)
    }
    if(use_nu){
        tmp_pwd_size--;
        charList = charList.concat(nu_list)
    }
    if(use_sy){
        tmp_pwd_size--;
        charList = charList.concat(sy_list)
    }
    console.log("tmp_pwd_size: " + tmp_pwd_size);
    console.log("pwd_size: " + pwd_size)
    console.log(charList)

    if(tmp_pwd_size < 0){
        console.log("Password length must be longer")
        return
    }else if(tmp_pwd_size == pwd_size){
        console.log("At least one option must be checked")
        return
    }

    for(let i = 0; i < tmp_pwd_size; i++){
        let rand = Math.floor(Math.random() * charList.length);
        pwd += charList[rand];
    }

    /* Guarantee that there will be at least one of each selected category */
    if(use_up){
        let pos = Math.floor(Math.random() * (pwd.length + 1))
        let rand = Math.floor(Math.random() * uc_list.length);
        pwd = pwd.substring(0, pos) + uc_list[rand] + pwd.substring(pos);
    }
    if(use_lc){
        let pos = Math.floor(Math.random() * (pwd.length + 1))
        let rand = Math.floor(Math.random() * lc_list.length);
        pwd = pwd.substring(0, pos) + lc_list[rand] + pwd.substring(pos);
    }
    if(use_nu){
        let pos = Math.floor(Math.random() * (pwd.length + 1))
        let rand = Math.floor(Math.random() * nu_list.length);
        pwd = pwd.substring(0, pos) + nu_list[rand] + pwd.substring(pos);
    }
    if(use_sy){
        let pos = Math.floor(Math.random() * (pwd.length + 1))
        let rand = Math.floor(Math.random() * sy_list.length);
        pwd = pwd.substring(0, pos) + sy_list[rand] + pwd.substring(pos);
    }

    /* Write password into input type password */
    console.log("Generated password: " + pwd);
    var inputs = document.querySelectorAll('input[type=password]')
    inputs.forEach(i =>{
        i.value=pwd;
    });
}

// Create elements and add them to web page
const username_form = document.createElement('form');
const username_label = document.createElement('label');
const username_input = document.createElement('input');
const login_button = document.createElement('button');
const register_button = document.createElement('button');
const popup_containter = document.createElement('div'); // Contains button and popupText
const generate_pwd_button = document.createElement('button');
const popupText = document.createElement('span');
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

// Generate password button configuration
generate_pwd_button.innerHTML = "Generate password";
generate_pwd_button.onclick = togglePopUp;
generate_pwd_button.style.margin = '0px 5px';

popupText.id = "generatePasswordPopUp";
popupText.classList.add('popupText');
popupText.innerHTML = `
    <p>Include:</p>
    <label>Upper case letters<input type='checkbox' id='gen_pwd_uc' checked='true'></label>
    <br><label>Lower case letters<input type='checkbox' id='gen_pwd_lc' checked='true'></label>
    <br><label>Numbers<input type='checkbox' id='gen_pwd_nu' checked='true'></label>
    <br><label>Symbols<input type='checkbox' id='gen_pwd_sy' checked='true'></label>
    <br><label>Password length: <input type='number' min='1' value='12' id='gen_pwd_size'></label>
`;
const confirm_generate_pwd_button = document.createElement('button');
confirm_generate_pwd_button.innerHTML = 'Generate password';
confirm_generate_pwd_button.onclick = generatePassword;
popupText.appendChild(confirm_generate_pwd_button);

popup_containter.classList.add('popupContainer');
popup_containter.appendChild(generate_pwd_button);
popup_containter.appendChild(popupText);

const popup_style = document.createElement('style');
popup_style.innerHTML = `
    /* Container */
    .popupContainer{
        position: relative;
        display: inline-block;
        cursor: pointer;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    /* Popup box */
    .popupText{
        visibility: hidden;
        width: 160px;
        background-color: #fff;
        border: 2px solid #555;
        text-align: left;
        border-radius: 6px;
        padding: 8px 3px 3px 3px;
        position: absolute;
        z-index: 10;
        top: 125%;
        left: 50%;
        margin-left: -80px;
    }
    .popupText input[type="number"]{
        display: inline;
        width: 40px;
    }
    .popupText button{
        display: inline-block;
        width: fit-content;
        margin: 2px 0 2px 0;
    }
    .show{
        visibility: visible;
        -webkit-animation: fadeIn 1s;
        animation: fadeIn 1s;
    }
    @-webkit-keyframes fadeIn{
        from {opacity: 0;}
        to {opacity: 1;}
    }
    /* Popup arrow */
    .popupContainer .popupText::after{
        content: "";
        position: absolute;
        bottom: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent #555 transparent;
    }
`;

// Bar configuration
bar.id = "password_manager_bar";
bar.style.textAlign = "center";
bar.style.width = "100%";
bar.style.backgroundColor = document.body.backgroundColor;
bar.style.padding = "3px";

// Append elements to webpage
bar.appendChild(username_form);
bar.appendChild(login_button);
bar.appendChild(register_button);
bar.appendChild(popup_containter);
document.body.insertBefore(bar, document.body.firstChild);

// Append CSS to webpage
document.head.appendChild(popup_style);