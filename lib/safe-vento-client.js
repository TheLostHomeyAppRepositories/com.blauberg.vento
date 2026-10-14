'use strict';

const net = require('net');
const { BlaubergVentoClient } = require('blaubergventojs');

/**
 * BlaubergVentoClient whose send() rejects an invalid target address.
 *
 * The library's send() socket has no 'error' listener and no send callback,
 * so an address dgram cannot resolve (e.g. "192.168.1.100:4000", looked up as
 * a hostname) surfaces as an uncaught exception that crashes the app. Checking
 * the address first turns that into an ordinary, catchable error.
 */
class SafeVentoClient extends BlaubergVentoClient {

  send(packet, ip) {
    // undefined keeps the library default (broadcast)
    if (ip !== undefined && !net.isIPv4(ip)) {
      return Promise.reject(new Error(`Invalid device IP address '${ip}'`));
    }
    return super.send(packet, ip);
  }

}

module.exports = { SafeVentoClient };
