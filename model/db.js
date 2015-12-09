var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/fileviewerdb');

module.exports = mongoose;
