import { Decompress } from './decompress.js';
import https from 'node:https';
import http from 'node:http';

const request = (url, options) => {
    (new URL(url).protocol === 'https:' ? https : http).request(new URL(url), )
};