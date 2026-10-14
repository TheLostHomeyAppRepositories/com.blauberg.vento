'use strict';

const net = require('net');
const { BlaubergVentoClient } = require('blaubergventojs');

/**
 * BlaubergVentoClient whose send() rejects input the library would crash on.
 *
 * The library's send() socket has no 'error' listener and no send callback,
 * and the packet is only serialised inside the socket's 'listening' callback.
 * So an address dgram cannot resolve (e.g. "192.168.1.100:4000", looked up as
 * a hostname) or a non-string device id / password (writeCredential reads
 * .length) surfaces as an uncaught exception that crashes the app. Checking
 * first turns these into ordinary, catchable errors.
 */
class SafeVentoClient extends BlaubergVentoClient {

  send(packet, ip) {
    // undefined keeps the library default (broadcast)
    if (ip !== undefined && !net.isIPv4(ip)) {
      return Promise.reject(new Error(`Invalid device IP address '${ip}'`));
    }
    if (typeof packet.deviceId !== 'string') {
      return Promise.reject(new Error(`Invalid device id '${packet.deviceId}'`));
    }
    if (typeof packet.password !== 'string') {
      return Promise.reject(new Error(`Device password is not set (${typeof packet.password}) for device ${packet.deviceId}`));
    }
    return super.send(packet, ip);
  }

}

module.exports = { SafeVentoClient };
