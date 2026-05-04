const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'users.json');

// Load the registered users once when the server starts.
const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

module.exports = users;
