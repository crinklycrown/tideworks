/* Web Worker: führt die Simulation aus und schickt Snapshots an den Hauptthread. */
import { SimHost } from './host.js';

const host = new SimHost((msg, transfer) => self.postMessage(msg, transfer || []));
self.onmessage = (e) => host.handle(e.data);
