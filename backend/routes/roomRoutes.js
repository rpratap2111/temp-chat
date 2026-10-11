const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { createRateLimiter, rateLimit } = require('../utils/rateLimiter');
const { CREATE_RATE, LOOKUP_RATE } = require('../utils/constants');

const createLimiter = createRateLimiter(CREATE_RATE);
const lookupLimiter = createRateLimiter(LOOKUP_RATE);

router.post('/', rateLimit(createLimiter, 'Too many rooms created. Please wait a minute.'), roomController.createRoom);
router.get('/:roomCode', rateLimit(lookupLimiter), roomController.getRoom);

module.exports = router;
