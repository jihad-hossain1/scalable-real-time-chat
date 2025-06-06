const express = require("express");
const { getOneToOneMessage } = require("../controllers/message.controller");
const router = express.Router();

router.get("/", getOneToOneMessage);

module.exports = router;
