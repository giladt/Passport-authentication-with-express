const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const bcrypt = require('bcrypt');
const passport = require('passport');

router.get('/signup', (req, res, next) => {
  res.render('auth/signup');
});

router.post('/signup', (req, res, next) => {
  // if password is empty or < 8 characters -> 
  // show the form again with error message
  const { username, password } = req.body;

  if (password.length < 8) {
    res.render('auth/signup', { message: 'Your password needs to be 8 chars min' });
    return;
  }

  if (username === '') {
    res.render('auth/signup', { message: 'Your username cannot be empty' });
    return;
  }

  // check if username exists in database -> show message
  User.findOne({ username: username })
    .then(found => {
      if (found !== null) {
        res.render('auth/signup', { message: 'This username is already taken' });
      } else {
        // hash the password, create the user and redirect to profile page
        const salt = bcrypt.genSaltSync();
        const hash = bcrypt.hashSync(password, salt);

        User.create({
          username: username,
          password: hash
        })
          .then(dbUser => {
            // log the user in
            // res.render('dashboard', { user: dbUser });
            res.redirect('/login');
          });
      }
    });
});

/* -------------------------------------------------*/

router.get('/login', (req, res, next) => {
  res.render('auth/login');
});

router.post(
  '/login', 
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    passReqToCallback: true
  })
);

router.get('/github', passport.authenticate('github'));

router.get(
  '/auth/github/callback',
  passport.authenticate('github', {
    successRedirect: '/',
    failureRedirect: '/auth/login'
  })
);

router.get('/google', passport.authenticate('google', { scope: ['profile']}));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

/* -------------------------------------------------*/

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
