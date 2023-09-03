import zlib from 'node:zlib';

const Decompress = (res, data) => {
    try {
        switch (res.headers['content-encoding']) {
            case 'gzip': {
                return zlib.gunzipSync(Buffer.concat(data));
            }
            case 'deflate': {
                return zlib.inflateSync(Buffer.concat(data));
            }
            case 'br': {
                return zlib.brotliDecompressSync(Buffer.concat(data));
            }
            default: {
                return Buffer.concat(data);
            }
        }
    } catch (e) {
        return Buffer.concat(data);
    }
}

export {
    Decompress
};