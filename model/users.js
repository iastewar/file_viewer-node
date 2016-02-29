var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  password: {type: String, required: true},
  connectedSockets: Number,
  totalNumberOfFiles: Number,
  totalDirectorySize: Number,
  directories: [new mongoose.Schema({name: {type: String, index: {unique: true}},
    numberOfFiles: Number, directorySize: Number, ready: Boolean, subDirectoriesInProgress: Number})]
});

// generate hash
userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

// check if password is valid
userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
}

mongoose.model('User', userSchema);
