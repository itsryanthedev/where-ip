'use strict';

const IPC_CHANNELS = Object.freeze({
  lookupPublicIp: 'whereip:lookupPublicIp',
  openExternalLink: 'whereip:openExternalLink',
  getAppVersion: 'whereip:getAppVersion',
});

module.exports = {
  IPC_CHANNELS,
};
