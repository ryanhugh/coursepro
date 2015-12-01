var page = require('webpage').create();

page.onConsoleMessage = function(msg, lineNum, sourceId) {
  console.log(msg);
};


// page.open('http://localhost/#tests/tree', function (status) {
page.open('http://phaser.io/#tests/tree', function (status) {
    if (status !== 'success') {
        console.log('Unable to access network');
    }
});