// SPDX-License-Identifier: Apache-2.0
/* Renders off the main thread on the site. The offline file builds the same worker from its inline engine. */
importScripts('engine.js');
self.onmessage = function (e) { self.postMessage(self.BFX.job(e.data)); };
