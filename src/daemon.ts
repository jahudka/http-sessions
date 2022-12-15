import { resolve } from 'path';
import { SessionLockDaemon,SessionStorageDaemon } from './storages';


type DaemonOptions = {
  mode: 'storage' | 'lock';
  listenOn: number | string;
  storageDir?: string;
};

(async () => {
  const options = processArguments();
  const daemon = options.mode === 'storage'
    ? new SessionStorageDaemon(options.listenOn, options.storageDir)
    : new SessionLockDaemon(options.listenOn);

  if (process.send) {
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        daemon.terminate();
      }
    });
  }

  process.on('SIGTERM', () => daemon.terminate());
  process.on('SIGINT', () => daemon.terminate());

  await daemon.run();

  console.log(`Daemon is listening on ${typeof options.listenOn === 'string' ? 'socket' : 'port'} ${options.listenOn}.`);

  if (process.send) {
    process.send('online');
  }
})();

function printUsage(brief: boolean = false): void {
  console.log('Usage: ${process.argv0} [--lock] <listen on> [<storage dir>]\n');

  if (brief) {
    return;
  }

  console.log(
`Starts a HTTP Sessions daemon. If the "--lock" option is specified,
the daemon will provide lock management backend (and should be used
together with DaemonLockManager), otherwise the daemon will provide
session storage (and should be used together with DaemonStorage).

The mandatory "<listen on>" argument can either be a port number,
which will be bound on the loopback interface, or the path to a UNIX
socket.

The optional "<storage dir>" argument can be specified in storage mode;
session data will be persisted in files within the specified directory.
Note that sessions will always be cached in memory, this will just
enable session persistence across daemon restarts.

Relative paths will be resolved relative to the current
working directory.
`,
  );
}

function processArguments(): DaemonOptions {
  if (process.argv.length > 5) {
    printUsage();
    process.exit(1);
  }

  const options: DaemonOptions = {
    mode: 'storage',
    listenOn: 0,
  };

  for (let i = 2; i < process.argv.length; ++i) {
    if (process.argv[i] === '--lock') {
      options.mode = 'lock';
    } else if (/^-/.test(process.argv[i])) {
      printUsage();
      process.exit(1);
    } else if (options.listenOn === 0) {
      options.listenOn = /^\d+$/.test(process.argv[i])
        ? parseInt(process.argv[i], 10)
        : resolve(process.argv[i]);
    } else {
      options.storageDir = process.argv[i];
    }
  }

  if (!options.listenOn) {
    console.log('Missing required argument <listen on>.\n');
    printUsage(true);
    process.exit(1);
  }

  return options;
}
