 const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

var userSchema = new Schema({
    "userName": {
        "type": String,
        "unique": true
    },
    "password": String,
    "email": String,
    "loginHistory": [{
        "dateTime": Date,
        "userAgent": String
    }]
})


let User; // to be defined on new connection (see initialize)


module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection("Your connection string");

        db.on('error', (err)=>{
            reject(err); 
        });
        db.once('open', ()=>{
           User = db.model("users", userSchema);
           resolve();
        });
    });
};



module.exports.registerUser=(userData) =>{
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.password2) {
            reject("Password did not match");
        } else {
            bcrypt
                .hash(userData.password, 10)
                .then((hash) => {
                    userData.password = hash;
                    let newUser = new User(userData);
                    newUser
                        .save()
                        .then(() => {
                            resolve();
                        })
                        .catch((err) => {
                            if (err.code === 11000) {
                                reject("Username already taken");
                            } else {
                                reject(`There was an error creating the user: ${err}`);
                            }
                        });
                })
                .catch((err) => {
                    console.log(err);
                    reject("There was an error in encrpting the passeword");
                });
        }
    });
}




module.exports.checkUser=(userData)=> {
    return new Promise((resolve, reject) => {
        User.find({ userName: userData.userName })
            .exec()
            .then((users) => {
                if (users.length === 0) {
                    reject(`Unable to find user: ${userData.userName}`);
                } else {
                    bcrypt
                        .compare(userData.password, users[0].password)
                        .then((result) => {
                            if (result === true) {
                                resolve(users[0]);
                            } else {
                                reject(`Incorrect Password : ${userData.userName}`);
                            }
                        });
                    users[0].loginHistory.push({
                        dateTime: new Date().toString(),
                        userAgent: userData.userAgent,
                    });
                    User.updateOne(
                        { userName: users[0].userName },
                        { $set: { loginHistory: users[0].loginHistory } },
                        { multi: false }
                    )
                        .exec()
                        .then(() => {
                            resolve(users[0]);
                        })
                        .catch((err) => {
                            reject(`There was an error verifying the user: ${err}`);
                        });
                }
            })
            .catch(() => {
                reject(`Unable to find user: ${userData.userName}`);
            });
    });
}
