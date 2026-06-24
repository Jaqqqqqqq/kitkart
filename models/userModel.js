const db = require('../config/database');


exports.getAllUsers = (callback)=>{

    const sql = `
    SELECT id, username, email, role, status
    FROM users
    `;

    db.query(sql, callback);

};



exports.updateUser = (id, role, status, callback)=>{

    const sql = `
    UPDATE users
    SET role=?, status=?
    WHERE id=?
    `;


    db.query(
        sql,
        [role,status,id],
        callback
    );

};



exports.checkLogin = (email, callback)=>{

    const sql = `
    SELECT *
    FROM users
    WHERE email=?
    `;


    db.query(
        sql,
        [email],
        callback
    );

};