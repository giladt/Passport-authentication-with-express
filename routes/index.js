const express = require('express');
const router  = express.Router();
const { loginCheck } = require('./middlewares');


/* GET home page */
router.get('/', (req, res, next) => {
  res.render('index', {user: req.user });
});

router.get('/private', loginCheck(), (req,res)=> {
  res.render('private');
});

module.exports = router;
