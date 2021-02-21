'use strict';
import crypto = require('crypto');

export const config = {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    algorithms: ['HS256']
}