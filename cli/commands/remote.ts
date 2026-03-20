/**
 * CLI command: kitchen remote [env] [-- <command...>]
 *
 * Run kitchen CLI commands inside a remote Docker container via SSH.
 *
 * Examples:
 *   kitchen remote live -- recipe "Lasagne" -i
 *   kitchen remote live -- acl user@example.com -i
 *   kitchen remote beta -- job --list
 *   kitchen remote live                          # opens interactive shell
 */

import { execSync, spawn } from 'child_process';

import type { Command } from 'commander';

type EnvConfig = { host: string; pattern: string };

const ENVS: Record<string, EnvConfig> = {
    live: { host: 'root@tecfriends.de', pattern: 'live-kitchen' },
    beta: { host: 'root@isntfunny.de', pattern: 'beta-kitchen' },
};

function resolveContainer(env: string): { host: string; container: string } {
    const cfg = ENVS[env];
    if (!cfg) {
        const valid = Object.keys(ENVS).join(', ');
        throw new Error(`Unknown environment "${env}". Valid: ${valid}`);
    }

    let result: string;
    try {
        result = execSync(
            `ssh ${cfg.host} "docker ps --format '{{.Names}}' | grep '${cfg.pattern}'"`,
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
        ).trim();
    } catch {
        throw new Error(`No running container matching "${cfg.pattern}" on ${cfg.host}`);
    }

    const containers = result.split('\n').filter(Boolean);

    if (containers.length === 0) {
        throw new Error(`No running container matching "${cfg.pattern}" on ${cfg.host}`);
    }
    if (containers.length > 1) {
        console.log(`Multiple containers found, using first: ${containers[0]}`);
    }

    return { host: cfg.host, container: containers[0] };
}

export function registerRemoteCommand(program: Command) {
    program
        .command('remote')
        .description('Run kitchen CLI commands on a remote container via SSH')
        .argument('<env>', `Environment: ${Object.keys(ENVS).join(', ')}`)
        .argument('[command...]', 'Command to run (after --)')
        .option('--sh', 'Open a shell in the container instead of running kitchen')
        .allowUnknownOption(true)
        .action((env: string, command: string[], options: { sh?: boolean }) => {
            let host: string;
            let container: string;
            try {
                ({ host, container } = resolveContainer(env));
            } catch (err) {
                console.error(`Error: ${(err as Error).message}`);
                process.exit(1);
            }

            console.log(`→ ${container} (${host})`);

            if (options.sh || command.length === 0) {
                const proc = spawn('ssh', ['-t', host, `docker exec -it ${container} sh`], {
                    stdio: 'inherit',
                });
                proc.on('exit', (code) => process.exit(code ?? 0));
                return;
            }

            const remoteCmd = command.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
            const proc = spawn(
                'ssh',
                ['-t', host, `docker exec ${container} kitchen ${remoteCmd}`],
                { stdio: 'inherit' },
            );
            proc.on('exit', (code) => process.exit(code ?? 0));
        });
}
