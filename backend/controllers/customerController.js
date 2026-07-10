const path = require('path');
const customerModel = require('../models/userModel');
const { User } = require('../config/sequelize');

function home(req, res) {
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'home.html'));
}

async function getCurrentUser(req) {
    const user = await User.findByPk(req.session.user.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'address', 'role', 'status'],
    });

    return user ? user.get({ plain: true }) : null;
}

async function profile(req, res) {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'profile.html'));
}

async function editProfile(req, res) {
    return profile(req, res);
}

async function updateProfile(req, res) {

    try{

        const updatedUser = await customerModel.updateProfile(
            req.session.user.id,
            req.body
        );

        req.session.user = {
            ...req.session.user,
            ...updatedUser
        };

        res.redirect("/profile?updated=1");

    }

    catch(err){

        console.log(err);

        res.status(err.statusCode || 500).send(err.message || "Unable to update profile.");

    }

}

function changePasswordPage(req, res) {
    res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'change-password.html'));
}

async function updatePassword(req, res) {
    try {
        await customerModel.updatePassword(
            req.session.user.id,
            req.body.password,
            req.body.confirm_password
        );

        return res.status(200).send("Password changed successfully.");
    } catch (err) {
        console.log(err);

        return res.status(err.statusCode || 500).send(err.message || "Unable to change password.");
    }
}


module.exports = {
  changePasswordPage,
  editProfile,
  getCurrentUser,
  home,
  profile,
  updatePassword,
  updateProfile
};


