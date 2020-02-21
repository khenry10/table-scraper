
const fs           = require('fs');

const writeToJson = ( filename, data ) => {
    fs.writeFile(filename, JSON.stringify( data, null, 2 ), function (err) {
        if (err) throw err;
        console.log( filename,'Saved!')
    });
}

module.exports = { writeToJson };