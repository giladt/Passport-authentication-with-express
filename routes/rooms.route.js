const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

router.get('/add', (req, res) => {
  res.render('rooms/add');
});


module.exports = router;
