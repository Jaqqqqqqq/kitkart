function home(req, res) {
  res.render('customer/home', {
    title: 'Home',
    currentUser: req.session.user,
  });
}

const customerModel = require('../models/userModel');

async function getCurrentUser(req) {
    return customerModel.getUserById(req.session.user.id);
}

async function profile(req, res) {
    const currentUser = await getCurrentUser(req);

    res.render("customer/profile", {
        title: "Profile",
        currentUser,
        error: null,
        success: req.query.updated ? "Profile updated." : null
    });
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

        res.status(err.statusCode || 500).render("customer/profile", {
            title: "Profile",
            currentUser: {
                ...req.session.user,
                ...req.body
            },
            error: err.message || "Unable to update profile.",
            success: null
        });

    }

}

function changePasswordPage(req, res) {
    res.render("customer/change-password", {
        title: "Change Password",
        error: null,
        success: null
    });
}

async function updatePassword(req, res) {
    try {
        await customerModel.updatePassword(
            req.session.user.id,
            req.body.password,
            req.body.confirm_password
        );

        return res.render("customer/change-password", {
            title: "Change Password",
            error: null,
            success: "Password changed successfully."
        });
    } catch (err) {
        console.log(err);

        return res.status(err.statusCode || 500).render("customer/change-password", {
            title: "Change Password",
            error: err.message || "Unable to change password.",
            success: null
        });
    }
}


module.exports = {
  changePasswordPage,
  editProfile,
  home,
  profile,
  updatePassword,
  updateProfile
};


