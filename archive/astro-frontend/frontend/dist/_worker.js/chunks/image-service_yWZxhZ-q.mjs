globalThis.process ??= {}; globalThis.process.env ??= {};
import { i as isRemotePath, j as joinPaths } from './path_lFLZ0pUM.mjs';
import { b as baseService, i as isESMImportedImage } from './generic_Bnr1Yc0R.mjs';
import { aK as commonjsGlobal } from './astro/server_BOeqx9Pa.mjs';
import require$$0 from 'node:crypto';

var dist = {};

var isPlainObject = {};

var hasRequiredIsPlainObject;

function requireIsPlainObject () {
	if (hasRequiredIsPlainObject) return isPlainObject;
	hasRequiredIsPlainObject = 1;
	Object.defineProperty(isPlainObject, "__esModule", { value: true });
	const objConstructorString = Function.prototype.toString.call(Object);
	function isPlainObject$1(value) {
	    //base object
	    if (typeof value !== 'object' ||
	        value === null ||
	        Object.prototype.toString.call(value) !== '[object Object]') {
	        return false;
	    }
	    //get the prototype
	    const proto = Object.getPrototypeOf(value);
	    //no prototype === all good
	    if (proto === null) {
	        return true;
	    }
	    //has own prop 'constructor'
	    if (!Object.prototype.hasOwnProperty.call(proto, 'constructor')) {
	        return false;
	    }
	    // validate that the constructor is `Object`
	    return (typeof proto.constructor === 'function' &&
	        proto.constructor instanceof proto.constructor &&
	        Function.prototype.toString.call(proto.constructor) === objConstructorString);
	}
	isPlainObject.default = isPlainObject$1;
	return isPlainObject;
}

var encoders = {};

var base64$1 = {exports: {}};

/*! https://mths.be/base64 v1.0.0 by @mathias | MIT license */
var base64 = base64$1.exports;

var hasRequiredBase64;

function requireBase64 () {
	if (hasRequiredBase64) return base64$1.exports;
	hasRequiredBase64 = 1;
	(function (module, exports) {
(function(root) {

			// Detect free variables `exports`.
			var freeExports = exports;

			// Detect free variable `module`.
			var freeModule = module &&
				module.exports == freeExports && module;

			// Detect free variable `global`, from Node.js or Browserified code, and use
			// it as `root`.
			var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal;
			if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
				root = freeGlobal;
			}

			/*--------------------------------------------------------------------------*/

			var InvalidCharacterError = function(message) {
				this.message = message;
			};
			InvalidCharacterError.prototype = new Error;
			InvalidCharacterError.prototype.name = 'InvalidCharacterError';

			var error = function(message) {
				// Note: the error messages used throughout this file match those used by
				// the native `atob`/`btoa` implementation in Chromium.
				throw new InvalidCharacterError(message);
			};

			var TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
			// http://whatwg.org/html/common-microsyntaxes.html#space-character
			var REGEX_SPACE_CHARACTERS = /[\t\n\f\r ]/g;

			// `decode` is designed to be fully compatible with `atob` as described in the
			// HTML Standard. http://whatwg.org/html/webappapis.html#dom-windowbase64-atob
			// The optimized base64-decoding algorithm used is based on @atk’s excellent
			// implementation. https://gist.github.com/atk/1020396
			var decode = function(input) {
				input = String(input)
					.replace(REGEX_SPACE_CHARACTERS, '');
				var length = input.length;
				if (length % 4 == 0) {
					input = input.replace(/==?$/, '');
					length = input.length;
				}
				if (
					length % 4 == 1 ||
					// http://whatwg.org/C#alphanumeric-ascii-characters
					/[^+a-zA-Z0-9/]/.test(input)
				) {
					error(
						'Invalid character: the string to be decoded is not correctly encoded.'
					);
				}
				var bitCounter = 0;
				var bitStorage;
				var buffer;
				var output = '';
				var position = -1;
				while (++position < length) {
					buffer = TABLE.indexOf(input.charAt(position));
					bitStorage = bitCounter % 4 ? bitStorage * 64 + buffer : buffer;
					// Unless this is the first of a group of 4 characters…
					if (bitCounter++ % 4) {
						// …convert the first 8 bits to a single ASCII character.
						output += String.fromCharCode(
							0xFF & bitStorage >> (-2 * bitCounter & 6)
						);
					}
				}
				return output;
			};

			// `encode` is designed to be fully compatible with `btoa` as described in the
			// HTML Standard: http://whatwg.org/html/webappapis.html#dom-windowbase64-btoa
			var encode = function(input) {
				input = String(input);
				if (/[^\0-\xFF]/.test(input)) {
					// Note: no need to special-case astral symbols here, as surrogates are
					// matched, and the input is supposed to only contain ASCII anyway.
					error(
						'The string to be encoded contains characters outside of the ' +
						'Latin1 range.'
					);
				}
				var padding = input.length % 3;
				var output = '';
				var position = -1;
				var a;
				var b;
				var c;
				var buffer;
				// Make sure any padding is handled outside of the loop.
				var length = input.length - padding;

				while (++position < length) {
					// Read three bytes, i.e. 24 bits.
					a = input.charCodeAt(position) << 16;
					b = input.charCodeAt(++position) << 8;
					c = input.charCodeAt(++position);
					buffer = a + b + c;
					// Turn the 24 bits into four chunks of 6 bits each, and append the
					// matching character for each of them to the output.
					output += (
						TABLE.charAt(buffer >> 18 & 0x3F) +
						TABLE.charAt(buffer >> 12 & 0x3F) +
						TABLE.charAt(buffer >> 6 & 0x3F) +
						TABLE.charAt(buffer & 0x3F)
					);
				}

				if (padding == 2) {
					a = input.charCodeAt(position) << 8;
					b = input.charCodeAt(++position);
					buffer = a + b;
					output += (
						TABLE.charAt(buffer >> 10) +
						TABLE.charAt((buffer >> 4) & 0x3F) +
						TABLE.charAt((buffer << 2) & 0x3F) +
						'='
					);
				} else if (padding == 1) {
					buffer = input.charCodeAt(position);
					output += (
						TABLE.charAt(buffer >> 2) +
						TABLE.charAt((buffer << 4) & 0x3F) +
						'=='
					);
				}

				return output;
			};

			var base64 = {
				'encode': encode,
				'decode': decode,
				'version': '1.0.0'
			};

			// Some AMD build optimizers, like r.js, check for specific condition patterns
			// like the following:
			if (freeExports && !freeExports.nodeType) {
				if (freeModule) { // in Node.js or RingoJS v0.8.0+
					freeModule.exports = base64;
				} else { // in Narwhal or RingoJS v0.7.0-
					for (var key in base64) {
						base64.hasOwnProperty(key) && (freeExports[key] = base64[key]);
					}
				}
			} else { // in Rhino or a web browser
				root.base64 = base64;
			}

		}(base64)); 
	} (base64$1, base64$1.exports));
	return base64$1.exports;
}

var hasRequiredEncoders;

function requireEncoders () {
	if (hasRequiredEncoders) return encoders;
	hasRequiredEncoders = 1;
	Object.defineProperty(encoders, "__esModule", { value: true });
	encoders.encoders = void 0;
	const base_64_1 = requireBase64();
	const binary = (input) => {
	    let binary = "";
	    const bytes = new Uint8Array(input);
	    const len = bytes.byteLength;
	    for (let i = 0; i < len; i++) {
	        const buffer = bytes[i];
	        if (buffer)
	            binary += String.fromCharCode(buffer);
	    }
	    return binary;
	};
	const hex = (input) => [...new Uint8Array(input)]
	    .map((b) => b.toString(16).padStart(2, "0"))
	    .join("");
	// @see https://stackoverflow.com/questions/35155089/node-sha-256-base64-digest
	// @see https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
	const base64 = (input) => (0, base_64_1.encode)(binary(input));
	const base64url = (input) => base64(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
	encoders.encoders = {
	    base64,
	    base64url,
	    hex,
	    binary,
	};
	return encoders;
}

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist;
	hasRequiredDist = 1;
	var __importDefault = (dist && dist.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(dist, "__esModule", { value: true });
	dist.deterministicString = void 0;
	const node_crypto_1 = require$$0;
	const isPlainObject_1 = __importDefault(requireIsPlainObject());
	const encoders_1 = requireEncoders();
	/** Creates a deterministic hash for all inputs. */
	async function deterministicHash(input, algorithm = "SHA-1", output = "hex") {
	    const encoder = new TextEncoder();
	    const data = encoder.encode(deterministicString(input));
	    const hash = await node_crypto_1.webcrypto.subtle.digest(algorithm, data);
	    return encoders_1.encoders[output](hash);
	}
	dist.default = deterministicHash;
	function deterministicString(input) {
	    if (typeof input === 'string') {
	        //wrap in quotes (and escape queotes) to differentiate from stringified primitives
	        return JSON.stringify(input);
	    }
	    else if (typeof input === 'symbol' || typeof input === 'function') {
	        //use `toString` for an accurate representation of these
	        return input.toString();
	    }
	    else if (typeof input === 'bigint') {
	        //bigint turns into a string int, so I need to differentiate it from a normal int
	        return `${input}n`;
	    }
	    else if (input === globalThis || input === undefined || input === null || typeof input === 'boolean' || typeof input === 'number' || typeof input !== 'object') {
	        //cast to string for any of these
	        return `${input}`;
	    }
	    else if (input instanceof Date) {
	        //using timestamp for dates
	        return `(${input.constructor.name}:${input.getTime()})`;
	    }
	    else if (input instanceof RegExp || input instanceof Error || input instanceof WeakMap || input instanceof WeakSet) {
	        //use simple `toString`. `WeakMap` and `WeakSet` are non-iterable, so this is the best I can do
	        return `(${input.constructor.name}:${input.toString()})`;
	    }
	    else if (input instanceof Set) {
	        //add the constructor as a key
	        let ret = `(${input.constructor.name}:[`;
	        //add all unique values
	        for (const val of input.values()) {
	            ret += `${deterministicString(val)},`;
	        }
	        ret += '])';
	        return ret;
	    }
	    else if (Array.isArray(input) ||
	        input instanceof Int8Array ||
	        input instanceof Uint8Array ||
	        input instanceof Uint8ClampedArray ||
	        input instanceof Int16Array ||
	        input instanceof Uint16Array ||
	        input instanceof Int32Array ||
	        input instanceof Uint32Array ||
	        input instanceof Float32Array ||
	        input instanceof Float64Array ||
	        input instanceof BigInt64Array ||
	        input instanceof BigUint64Array) {
	        //add the constructor as a key
	        let ret = `(${input.constructor.name}:[`;
	        //add all key/value pairs
	        for (const [k, v] of input.entries()) {
	            ret += `(${k}:${deterministicString(v)}),`;
	        }
	        ret += '])';
	        return ret;
	    }
	    else if (input instanceof ArrayBuffer || input instanceof SharedArrayBuffer) {
	        //each typed array must be in multiples of their byte size.
	        //see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#typedarray_objects
	        if (input.byteLength % 8 === 0) {
	            return deterministicString(new BigUint64Array(input));
	        }
	        else if (input.byteLength % 4 === 0) {
	            return deterministicString(new Uint32Array(input));
	        }
	        else if (input.byteLength % 2 === 0) {
	            return deterministicString(new Uint16Array(input));
	        }
	        else {
	            /** @todo - Change this to a system that breaks it down into parts. E.g. byteLength of 17 = BigUint64Array*2 and Uint8Array */
	            let ret = '(';
	            for (let i = 0; i < input.byteLength; i++) {
	                ret += `${deterministicString(new Uint8Array(input.slice(i, i + 1)))},`;
	            }
	            ret += ')';
	            return ret;
	        }
	    }
	    else if (input instanceof Map || (0, isPlainObject_1.default)(input)) {
	        //all key/values will be put here for sorting by key
	        const sortable = [];
	        //get key/value pairs
	        const entries = (input instanceof Map
	            ? input.entries()
	            : Object.entries(input));
	        //add all key value pairs
	        for (const [k, v] of entries) {
	            sortable.push([deterministicString(k), deterministicString(v)]);
	        }
	        //if not a map, get Symbol keys and add them
	        if (!(input instanceof Map)) {
	            const symbolKeys = Object.getOwnPropertySymbols(input);
	            //convert each symbol key to a key/value pair
	            for (let i = 0; i < symbolKeys.length; i++) {
	                sortable.push([
	                    deterministicString(symbolKeys[i]),
	                    deterministicString(
	                    //have to ignore because `noImplicitAny` is `true` but this is implicitly `any`
	                    //@ts-ignore
	                    input[symbolKeys[i]])
	                ]);
	            }
	        }
	        //sort alphabetically by keys
	        sortable.sort(([a], [b]) => a.localeCompare(b));
	        //add the constructor as a key
	        let ret = `(${input.constructor.name}:[`;
	        //add all of the key/value pairs
	        for (const [k, v] of sortable) {
	            ret += `(${k}:${v}),`;
	        }
	        ret += '])';
	        return ret;
	    }
	    //a class/non-plain object
	    const allEntries = [];
	    for (const k in input) {
	        allEntries.push([
	            deterministicString(k),
	            deterministicString(
	            //have to ignore because `noImplicitAny` is `true` but this is implicitly `any`
	            //@ts-ignore
	            input[k])
	        ]);
	    }
	    //get all own property symbols
	    const symbolKeys = Object.getOwnPropertySymbols(input);
	    //convert each symbol key to a key/value pair
	    for (let i = 0; i < symbolKeys.length; i++) {
	        allEntries.push([
	            deterministicString(symbolKeys[i]),
	            deterministicString(
	            //have to ignore because `noImplicitAny` is `true` but this is implicitly `any`
	            //@ts-ignore
	            input[symbolKeys[i]])
	        ]);
	    }
	    //sort alphabetically by keys
	    allEntries.sort(([a], [b]) => a.localeCompare(b));
	    //add the constructor as a key
	    let ret = `(${input.constructor.name}:[`;
	    //add all of the key/value pairs
	    for (const [k, v] of allEntries) {
	        ret += `(${k}:${v}),`;
	    }
	    ret += '])';
	    return ret;
	}
	dist.deterministicString = deterministicString;
	return dist;
}

requireDist();

function matchHostname(url, hostname, allowWildcard) {
  if (!hostname) {
    return true;
  }
  if (!allowWildcard || !hostname.startsWith("*")) {
    return hostname === url.hostname;
  }
  if (hostname.startsWith("**.")) {
    const slicedHostname = hostname.slice(2);
    return slicedHostname !== url.hostname && url.hostname.endsWith(slicedHostname);
  }
  if (hostname.startsWith("*.")) {
    const slicedHostname = hostname.slice(1);
    const additionalSubdomains = url.hostname.replace(slicedHostname, "").split(".").filter(Boolean);
    return additionalSubdomains.length === 1;
  }
  return false;
}
function matchPort(url, port) {
  return !port || port === url.port;
}
function matchProtocol(url, protocol) {
  return !protocol || protocol === url.protocol.slice(0, -1);
}
function matchPathname(url, pathname, allowWildcard) {
  if (!pathname) {
    return true;
  }
  if (!pathname.endsWith("*")) {
    return pathname === url.pathname;
  }
  if (pathname.endsWith("/**")) {
    const slicedPathname = pathname.slice(0, -2);
    return slicedPathname !== url.pathname && url.pathname.startsWith(slicedPathname);
  }
  if (pathname.endsWith("/*")) {
    const slicedPathname = pathname.slice(0, -1);
    const additionalPathChunks = url.pathname.replace(slicedPathname, "").split("/").filter(Boolean);
    return additionalPathChunks.length === 1;
  }
  return false;
}
function matchPattern(url, remotePattern) {
  return matchProtocol(url, remotePattern.protocol) && matchHostname(url, remotePattern.hostname, true) && matchPort(url, remotePattern.port) && matchPathname(url, remotePattern.pathname);
}
function isRemoteAllowed(src, {
  domains = [],
  remotePatterns = []
}) {
  if (!isRemotePath(src)) return false;
  const url = new URL(src);
  return domains.some((domain) => matchHostname(url, domain)) || remotePatterns.some((remotePattern) => matchPattern(url, remotePattern));
}

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": undefined, "SSR": true};
const service = {
  ...baseService,
  getURL: (options, imageConfig) => {
    const resizingParams = ["onerror=redirect"];
    if (options.width) resizingParams.push(`width=${options.width}`);
    if (options.height) resizingParams.push(`height=${options.height}`);
    if (options.quality) resizingParams.push(`quality=${options.quality}`);
    if (options.fit) resizingParams.push(`fit=${options.fit}`);
    if (options.format) resizingParams.push(`format=${options.format}`);
    let imageSource = "";
    if (isESMImportedImage(options.src)) {
      imageSource = options.src.src;
    } else if (isRemoteAllowed(options.src, imageConfig)) {
      imageSource = options.src;
    } else {
      return options.src;
    }
    const imageEndpoint = joinPaths(
      // @ts-expect-error Can't recognise import.meta.env
      Object.assign(__vite_import_meta_env__, { _: process.env._ }).BASE_URL,
      "/cdn-cgi/image",
      resizingParams.join(","),
      imageSource
    );
    return imageEndpoint;
  }
};
var image_service_default = service;

export { image_service_default as default };
