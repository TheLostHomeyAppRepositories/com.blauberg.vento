'use strict';

const net = require('net');

const PORT = 4000;

/**
 * Normalise a user-entered or stored device address to a bare IPv4 string.
 *
 * The device only listens on UDP port 4000, so users sometimes enter
 * "192.168.1.100:4000". Passed as-is to dgram, that string is treated as a
 * hostname and fails DNS lookup (getaddrinfo ENOTFOUND). The ":4000" suffix
 * is stripped; anything else that is not a plain IPv4 address is rejected.
 *
 * @param {*} value
 * @returns {string|null} the IPv4 address, or null when the value is not valid
 */
function normalizeIp(value) {
  if (typeof value !== 'string') return null;
  let ip = value.trim();
  if (ip.endsWith(`:${PORT}`)) ip = ip.slice(0, -`:${PORT}`.length);
  return net.isIPv4(ip) ? ip : null;
}

/**
 * Read the device's stored last known IP, repairing a value saved by an older
 * app version that did not validate the setting (e.g. "a.b.c.d:4000").
 *
 * @param {import('homey').Device} device
 * @returns {Promise<string|null>} a valid IPv4 address, or null
 */
async function getValidLastKnownIp(device) {
  const stored = device.getStoreValue('lastKnownIP');
  if (!stored) return null;
  const ip = normalizeIp(stored);
  if (ip === null) {
    device.log(`Ignoring stored IP address '${stored}': not a valid IPv4 address`);
    return null;
  }
  if (ip !== stored) {
    device.log(`Repairing stored IP address '${stored}' -> '${ip}'`);
    await device.setStoreValue('lastKnownIP', ip);
    await device.setSettings({ last_known_ip: ip });
  }
  return ip;
}

/**
 * Validate the 'last_known_ip' setting on save and store the bare IP.
 * Throws (which makes Homey reject the save and show the message) when the
 * value is not a valid address. An empty value clears the stored IP.
 *
 * @param {import('homey').Device} device
 * @param {string} value the new setting value
 */
async function applyLastKnownIpSetting(device, value) {
  const raw = (value || '').trim();
  const ip = raw === '' ? '' : normalizeIp(raw);
  if (ip === null) {
    throw new Error(`'${raw}' is not a valid IP address. Enter only the address, e.g. 192.168.1.100, without a port.`);
  }
  await device.setStoreValue('lastKnownIP', ip);
  if (ip !== value) {
    // Settings saved from onSettings are overwritten by the new values once it
    // returns, so show the normalised address in the setting afterwards.
    device.homey.setTimeout(() => {
      device.setSettings({ last_known_ip: ip })
        .catch((error) => device.log(`Could not update IP address setting: ${error.message}`));
    }, 0);
  }
}

module.exports = { normalizeIp, getValidLastKnownIp, applyLastKnownIpSetting };
