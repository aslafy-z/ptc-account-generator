require('babel-polyfill');
require('babel-register');


var createAccount = require('./src/ptc-account-generator').default
var STORE_FILE = './accounts.txt';

createAccount()
  .then(res => {
    lockup.lock(STORE_FILE, function (err) {
      if (err) return console.error(err);
      fs.appendFile(STORE_FILE, JSON.stringify(res), function (err) {
        lockup.unlock(STORE_FILE);
        if (err) return console.error(err);
      });
    });
  })
  .catch(err => console.error(err));
