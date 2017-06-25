const bleno = require('bleno');

let callback;

bleno.on('stateChange', function (state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('temps', ['ec00']);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', function (error) {
  console.log('[bt] on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  bleno.setServices([
    new (bleno.PrimaryService)({
      uuid: 'fffffffffffffffffffffffffffffff0',
      characteristics: [
        new (bleno.Characteristic)({
          uuid: 'fffffffffffffffffffffffffffffff1',
          properties: ['notify'],
          value: null,
          onSubscribe: function (maxValueSize, updateValueCallback) {
            console.log('[bt] onSubscribe', maxValueSize);

            callback = updateValueCallback;
          },

          onUnsubscribe: function () {
            console.log('[bt] onUnsubscribe');

            callback = null;
          }
        })
      ],

    })
  ]);
});

module.exports = (buf) => {
  if (!callback) {
    return false;
  }
  callback(buf);
};