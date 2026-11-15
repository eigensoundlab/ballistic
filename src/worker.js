// SPDX-License-Identifier: Apache-2.0
/* Renders off the main thread on the site. The offline file builds the same worker from its inline engine.
   A message with asset: true hands over a sound and gets no answer; a fit reports its progress as it goes. */
importScripts('engine.js');
self.onmessage = function (e) { var r = self.BFX.job(e.data, function (m) { self.postMessage(m); }); if (r) self.postMessage(r); };
