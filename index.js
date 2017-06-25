const fs = require('fs');
const admin = require('firebase-admin');
const btCallback = require('./bluetooth');
const needle = require('needle');
const serviceAccount = require('./serviceAccountKey.json');

const FLAG_DISCONNECTED = 2 << 16;
const databaseURL = 'https://isithotinhereorisitjustm-91e09.firebaseio.com/';

admin.initializeApp({
  databaseURL,
  credential: admin.credential.cert(serviceAccount),
});

let db = admin.database();
let ref = db.ref('temps');
let connected;
// Provide custom logger which prefixes log statements with "[FIREBASE]"
// admin.database.enableLogging(function(message) {
// console.log("[FIREBASE]", message);
// });
db.ref('.info/connected').on('value', (snap) => {
  if (snap.val() === true) {
    console.log('(' + new Date().toISOString() + ') [firebase] connected');
    connected = true;
  } else {
    console.log('(' + new Date().toISOString() + ') [firebase] disconnected');
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

  // this is the ugliest shit ever - since firebase has no fucking clue whether or not its socket connection is open
  // as a workaround we make a head request to the database url, if we get a response we assume we still have
  // a connection.
  // fuck firebasse.
  needle.head(databaseURL, { open_timeout: 5000 }, (err, response) => {
    const connected = !err;
    const t = Math.floor(Date.now() / 1000) * 1000;
    console.log('t='+t+', value=' + value + ', connected=' + connected);
    if (connected) {
      const pushRef = ref.push();
      pushRef.onDisconnect().remove();
      pushRef.set({ t, v: value });
    }

    const broadcastValue = Math.floor(value * 1000) | (!connected ? FLAG_DISCONNECTED : 0);

    btCallback(valueToBuffer(broadcastValue, t));
  });
}, 20000);

function valueToBuffer(val, time) {
  let buf = Buffer.alloc(8);
  buf.writeUInt32LE(val, 0);
  // add timestamp to the nearest second
  buf.writeUInt32LE(Math.floor(time / 1000), 4);
  return buf;
}