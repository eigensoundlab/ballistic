// SPDX-License-Identifier: Apache-2.0
/* Renders off the main thread on the site. The offline file builds the same worker from its inline engine.
   A message with asset: true hands over a recording or an impulse response and gets no answer. */
importScripts('engine.js');
self.onmessage = function (e) { var r = self.BFX.job(e.data); if (r) self.postMessage(r); };
