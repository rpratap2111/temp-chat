const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.post('/', roomController.createRoom);
router.get('/:roomCode', roomController.getRoom);

module.exports = router;
