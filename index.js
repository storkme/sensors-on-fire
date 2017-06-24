const fs = require('fs');
const admin = require('firebase-admin');
const btCallback = require('./bluetooth');
const serviceAccount = require('./serviceAccountKey.json');

const FLAG_CONNECTED = 2 ** 24;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://isithotinhereorisitjustm-91e09.firebaseio.com/'
});

let db = admin.database();
let ref = db.ref('temps');
let connected;

let connectedRef = db.ref('.info/connected');
connectedRef.on('value', function (snap) {
  if (snap.val() === true) {
    console.log('[firebase] connected');
    connected = true;
  } else {
    console.log('[firebase] disconnected');
    connected = false;
  }
});

setInterval(() => {
  const values = fs.readdirSync('/sys/bus/w1/devices/')
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

  const value = values.reduce((a, b) => b + a, 0) / values.length;

  ref.push().set({ t: Date.now(), v: value });

  const broadcastValue = Math.floor(value * 1000) | (connected ? FLAG_CONNECTED : 0);

  btCallback(valueToBuffer(broadcastValue));
}, 30000);

function valueToBuffer(val) {
  let buf = Buffer.alloc(4);
  buf.writeUInt32LE(val, 0);
  return buf;
}