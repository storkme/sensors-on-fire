const fs = require('fs');
const admin = require("firebase-admin");
let serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://isithotinhereorisitjustm-91e09.firebaseio.com/"
});

let db = admin.database();
let ref = db.ref("temps");

setInterval(() => {
    let crap = fs.readdirSync('/sys/bus/w1/devices/')
    // filter stuff starting with 28
        .filter(whatever => whatever.substring(0, 2) === '28')
        // read the w1_slave file in that dir
        .map(dir => fs.readFileSync('/sys/bus/w1/devices/' + dir + '/w1_slave', 'ascii'))
        // extract temp
        .map(contents => /t=(\d+)/.exec(contents))
        // filter out nulls
        .filter(e => e)
        // parse temp as int, divide by 1000 to get centigrade
        .map(t => parseInt(t[1]) / 1000);

    console.dir(crap);
}, 1000);