"use strict";
import crypto = require('crypto');

export const config = {
    secret: crypto.randomBytes(64).toString('hex'),
    algorithms: ['HS256']
}